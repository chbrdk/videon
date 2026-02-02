import os
import asyncio
import json
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import uvicorn
from pathlib import Path
import httpx

from ..services.scene_detector import SceneDetector
from ..services.keyframe_extractor import KeyframeExtractor
from ..services.vision_analyzer import VisionAnalyzer
from ..services.transcription_service import TranscriptionService
from ..services.audio_separation_service import AudioSeparationService
from ..services.audio_separator import AudioSeparatorService
from ..services.spleeter_service import SpleeterService
from ..services.saliency_detector import SaliencyDetector
from ..services.heatmap_generator import HeatmapGenerator
from ..services.reframing_service import ReframingService
from ..database.client import DatabaseClient
from ..utils.logger import logger, log_analysis_step, log_error

app = FastAPI(
    title="PrismVid AI Hub API",
    description="Unified Video Analysis Service (Scenes, Vision, Audio, Saliency, Reframing)",
    version="2.0.0"
)

# Vision Service Configuration
VISION_SERVICE_URL = os.getenv('VISION_SERVICE_URL', 'http://host.docker.internal:8080')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://backend:4001')

# Initialize services
scene_detector = SceneDetector(threshold=30.0)
keyframe_extractor = KeyframeExtractor()
vision_analyzer = VisionAnalyzer(swift_vision_url=VISION_SERVICE_URL)
transcription_service = TranscriptionService(model_size="base", device="cpu")
audio_separator = AudioSeparationService(model_name="htdemucs_ft", device="cpu")
audio_separator_service = AudioSeparatorService()
spleeter_service = SpleeterService()
saliency_detector = SaliencyDetector(model_type="vit_b", use_coreml=False)
heatmap_generator = HeatmapGenerator()
reframing_service = ReframingService()
db_client = DatabaseClient()

# Models
class AnalysisRequest(BaseModel):
    videoId: str
    videoPath: str

class AnalysisResponse(BaseModel):
    message: str
    videoId: str
    status: str

class TranscriptionRequest(BaseModel):
    language: str = None

class TranscriptionResponse(BaseModel):
    transcription_id: str
    language: str
    segment_count: int
    duration: float

class SceneAudioSeparationRequest(BaseModel):
    startTime: float
    endTime: float
    stemTypes: list = ["vocals", "music", "original"]

class SceneAudioSeparationResponse(BaseModel):
    message: str
    videoId: str
    sceneId: str
    stems: Dict[str, str]

class SaliencyRequest(BaseModel):
    videoId: str
    videoPath: str
    sampleRate: int = 1
    aspectRatio: List[int] = [9, 16]
    maxFrames: Optional[int] = None

class SaliencyResponse(BaseModel):
    message: str
    videoId: str
    status: str
    analysisId: Optional[str] = None

class SceneSaliencyRequest(BaseModel):
    videoId: str
    sceneId: str
    videoPath: str
    startTime: float
    endTime: float
    aspectRatio: List[int] = [9, 16]

class HeatmapRequest(BaseModel):
    videoId: str
    colormap: str = "jet"
    opacity: float = 0.5
    showRoi: bool = True
    showInfo: bool = True

class HeatmapResponse(BaseModel):
    message: str
    videoId: str
    heatmapPath: str
    comparisonPath: Optional[str] = None

class ReframingRequest(BaseModel):
    videoId: str
    videoPath: str
    saliencyDataPath: str
    aspectRatio: Dict[str, int]
    smoothingFactor: float = 0.3
    outputFormat: str = "mp4"
    reframedVideoId: Optional[str] = None

class ReframingResponse(BaseModel):
    message: str
    videoId: str
    jobId: str
    status: str

class StatusResponse(BaseModel):
    status: str
    progress: float
    message: Optional[str] = None
    completed: Optional[bool] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "prismvid-ai-hub"}

# Original Analyzer Endpoints
@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_video(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Analyze video for scenes and extract keyframes"""
    video_id = request.videoId
    video_path = request.videoPath
    logger.info(f"Starting scene analysis for video {video_id}")
    await db_client.update_video_status(video_id, "ANALYZING")
    await db_client.create_analysis_log(video_id, "INFO", "Scene analysis started")
    background_tasks.add_task(process_video_analysis, video_id, video_path)
    return AnalysisResponse(message="Video analysis started", videoId=video_id, status="ANALYZING")

async def process_video_analysis(video_id: str, video_path: str):
    try:
        log_analysis_step(video_id, "scene_detection_start")
        scenes = scene_detector.detect_scenes(video_path)
        if not scenes:
            log_error(video_id, "No scenes detected")
            await db_client.update_video_status(video_id, "ERROR")
            await db_client.create_analysis_log(video_id, "ERROR", "No scenes detected")
            return
        
        log_analysis_step(video_id, "scene_detection_complete", {"scene_count": len(scenes)})
        log_analysis_step(video_id, "keyframe_extraction_start")
        keyframe_paths = keyframe_extractor.extract_scene_keyframes(video_path, scenes, video_id)
        
        for i, (start_time, end_time) in enumerate(scenes):
            keyframe_path = keyframe_paths[i] if i < len(keyframe_paths) else None
            scene_id = await db_client.create_scene(video_id, start_time, end_time, keyframe_path)
            if keyframe_path:
                try:
                    await trigger_vision_analysis(scene_id, keyframe_path)
                except Exception as vision_error:
                    logger.error(f"Failed vision analysis for scene {scene_id}: {vision_error}")

        await db_client.update_video_status(video_id, "ANALYZED")
        await db_client.create_analysis_log(video_id, "INFO", "Scene detection completed")
        
        # Trigger Qwen VL and indexing
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(f"{BACKEND_URL}/api/videos/{video_id}/qwenVL/analyze", timeout=5.0)
                await client.post(f"{BACKEND_URL}/api/videos/{video_id}/index", timeout=5.0)
        except Exception: pass
    except Exception as e:
        log_error(video_id, f"Analysis failed: {str(e)}")
        await db_client.update_video_status(video_id, "ERROR")

async def trigger_vision_analysis(scene_id: str, keyframe_path: str):
    vision_result = vision_analyzer.analyze_scene(keyframe_path, scene_id)
    if vision_result:
        await db_client.save_vision_analysis(
            scene_id=scene_id,
            objects=json.dumps(vision_result.get("objects", [])),
            object_count=len(vision_result.get("objects", [])),
            faces=json.dumps(vision_result.get("faces", [])),
            face_count=len(vision_result.get("faces", [])),
            text_recognitions=json.dumps(vision_result.get("textRecognitions", [])),
            text_count=len(vision_result.get("textRecognitions", [])),
            human_rectangles=json.dumps(vision_result.get("humanRectangles", [])),
            human_count=len(vision_result.get("humanRectangles", [])),
            human_body_poses=json.dumps(vision_result.get("humanBodyPoses", [])),
            pose_count=len(vision_result.get("humanBodyPoses", [])),
            processing_time=vision_result.get("processingTime", 0.0),
            vision_version=vision_result.get("visionVersion", "unknown")
        )

# Transcription Endpoints
@app.post("/api/transcribe/{video_id}", response_model=TranscriptionResponse)
async def transcribe_video(video_id: str, request: TranscriptionRequest = None):
    try:
        video = db_client.get_video(video_id)
        if not video: raise HTTPException(status_code=404, detail="Video not found")
        result = transcription_service.transcribe_video(video["file_path"], language=request.language if request else None)
        transcription_id = db_client.create_transcription(video_id=video_id, language=result["language"], segments=result["segments"])
        db_client.update_video_status_sync(video_id, "TRANSCRIBED")
        return TranscriptionResponse(transcription_id=transcription_id, language=result["language"], segment_count=len(result["segments"]), duration=result["duration"])
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Audio Separation Endpoints
@app.post("/api/separate-audio-scene/{video_id}/{scene_id}", response_model=SceneAudioSeparationResponse)
async def separate_audio_for_scene(video_id: str, scene_id: str, request: SceneAudioSeparationRequest):
    try:
        video = db_client.get_video(video_id)
        if not video: raise HTTPException(status_code=404, detail="Video not found")
        stems = audio_separator_service.separate_audio_for_timerange(
            video_path=video["file_path"], start_time=request.startTime, end_time=request.endTime,
            video_id=video_id, scene_id=scene_id, stem_types=request.stemTypes
        )
        for stem_type, file_path in stems.items():
            db_client.create_audio_stem(video_id=video_id, scene_id=scene_id, stem_type=stem_type, file_path=file_path, file_size=os.path.getsize(file_path), startTime=request.startTime, endTime=request.endTime)
        return SceneAudioSeparationResponse(message="Separation complete", videoId=video_id, sceneId=scene_id, stems=stems)
    except Exception as e:
        logger.error(f"Audio separation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/separate-audio")
async def separate_audio(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Separate audio into vocals and music"""
    video_id = request.videoId
    video_path = request.videoPath
    logger.info(f"Starting audio separation for video {video_id}")
    db_client.update_video_status_sync(video_id, "ANALYZING")
    db_client.create_analysis_log_sync(video_id, "INFO", "Audio separation started")
    background_tasks.add_task(process_audio_separation, video_id, video_path)
    return AnalysisResponse(message="Audio separation started", videoId=video_id, status="ANALYZING")

async def process_audio_separation(video_id: str, video_path: str):
    try:
        log_analysis_step(video_id, "audio_separation_start")
        storage_path = os.getenv('STORAGE_PATH', '/app/storage')
        output_dir = f"{storage_path}/audio_stems/{video_id}"
        os.makedirs(output_dir, exist_ok=True)
        stem_paths = audio_separator.separate_audio(video_path, output_dir, video_id)
        for stem_type, file_path in stem_paths.items():
            db_client.create_audio_stem(video_id=video_id, scene_id=None, stem_type=stem_type, file_path=file_path, file_size=os.path.getsize(file_path))
        db_client.update_video_status_sync(video_id, "ANALYZED")
        db_client.create_analysis_log_sync(video_id, "INFO", "Audio separation completed")
    except Exception as e:
        log_error(video_id, f"Audio separation failed: {str(e)}")
        db_client.update_video_status_sync(video_id, "ERROR")

@app.post("/api/spleeter-separate/{video_id}")
async def spleeter_separate_audio(video_id: str, background_tasks: BackgroundTasks):
    """Separate audio using Spleeter (macOS-optimized)"""
    try:
        video = db_client.get_video(video_id)
        if not video: raise HTTPException(status_code=404, detail="Video not found")
        background_tasks.add_task(process_spleeter_separation, video_id, video["file_path"])
        return {"videoId": video_id, "status": "SEPARATING", "message": "Spleeter separation started"}
    except Exception as e:
        logger.error(f"Spleeter separation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_spleeter_separation(video_id: str, video_path: str):
    try:
        db_client.update_video_status_sync(video_id, "SEPARATING")
        scenes = db_client.get_scenes_by_video_id(video_id)
        for scene in scenes:
            stem_paths = spleeter_service.separate_audio_for_timerange(
                video_path=video_path, start_time=scene["start_time"], end_time=scene["end_time"],
                video_id=video_id, scene_id=scene["id"], stem_types=['vocals', 'accompaniment', 'original']
            )
            for stem_type, stem_path in stem_paths.items():
                db_client.create_audio_stem(video_id=video_id, scene_id=scene["id"], stem_type=stem_type, file_path=stem_path, file_size=os.path.getsize(stem_path), start_time=scene["start_time"], end_time=scene["end_time"])
        db_client.update_video_status_sync(video_id, "ANALYZED")
    except Exception as e:
        log_error(video_id, f"Spleeter failed: {str(e)}")
        db_client.update_video_status_sync(video_id, "ERROR")

# Saliency Endpoints
@app.post("/saliency/analyze", response_model=SaliencyResponse)
async def analyze_saliency(request: SaliencyRequest, background_tasks: BackgroundTasks):
    logger.info(f"Starting saliency analysis for video {request.videoId}")
    background_tasks.add_task(process_saliency_analysis, request.videoId, request.videoPath, request.sampleRate, tuple(request.aspectRatio), request.maxFrames)
    return SaliencyResponse(message="Saliency analysis started", videoId=request.videoId, status="ANALYZING")

async def process_saliency_analysis(video_id: str, video_path: str, sample_rate: int, aspect_ratio: tuple, max_frames: Optional[int]):
    try:
        result = saliency_detector.analyze_video(video_path=video_path, video_id=video_id, sample_rate=sample_rate, aspect_ratio=aspect_ratio, max_frames=max_frames)
        roi_suggestions = []
        for frame in result["frames"]:
            if "roi_suggestions" in frame: roi_suggestions.extend(frame["roi_suggestions"])
        await db_client.create_saliency_analysis(
            video_id=video_id, scene_id=None, data_path=f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/{video_id}/saliency_data.json",
            heatmap_path=None, roi_data=json.dumps(roi_suggestions), frame_count=len(result["frames"]),
            sample_rate=sample_rate, model_version=saliency_detector.model_type, processing_time=result["metadata"]["processing_stats"]["processing_time"]
        )
        logger.info(f"Saliency analysis complete for video {video_id}")
    except Exception as e:
        logger.error(f"Saliency analysis failed: {e}")

@app.post("/saliency/generate-heatmap", response_model=HeatmapResponse)
async def generate_heatmap(request: HeatmapRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_heatmap_generation, request.videoId, request.colormap, request.opacity, request.showRoi, request.showInfo)
    return HeatmapResponse(message="Heatmap generation started", videoId=request.videoId, heatmapPath="")

async def process_heatmap_generation(video_id: str, colormap: str, opacity: float, show_roi: bool, show_info: bool):
    try:
        saliency_data = saliency_detector.get_analysis_results(video_id)
        video_info = db_client.get_video(video_id)
        output_path = f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/{video_id}/heatmap_video.mp4"
        heatmap_generator.create_heatmap_video(video_path=video_info["file_path"], saliency_data=saliency_data, output_path=output_path, colormap=colormap, opacity=opacity, show_roi=show_roi, show_info=show_info)
    except Exception as e:
        logger.error(f"Heatmap generation failed: {e}")

@app.get("/saliency/status/{video_id}", response_model=StatusResponse)
async def get_saliency_status(video_id: str):
    data = await db_client.get_saliency_analysis(video_id)
    if not data:
        return StatusResponse(status="NOT_STARTED", progress=0.0)
    return StatusResponse(status="COMPLETED", progress=1.0)

# Reframing Endpoints
@app.post("/reframe/video", response_model=ReframingResponse)
async def reframe_video(request: ReframingRequest):
    job_id = await reframing_service.reframe_video(video_id=request.videoId, video_path=request.videoPath, saliency_data_path=request.saliencyDataPath, aspect_ratio=request.aspectRatio, smoothing_factor=request.smoothingFactor, output_format=request.outputFormat, reframed_video_id=request.reframedVideoId)
    return ReframingResponse(message="Reframing started", videoId=request.videoId, jobId=job_id, status="PROCESSING")

@app.get("/reframe/status/{job_id}", response_model=StatusResponse)
async def get_reframing_status(job_id: str):
    status = reframing_service.get_job_status(job_id)
    if not status: raise HTTPException(status_code=404, detail="Job not found")
    return StatusResponse(status=status["status"], progress=status["progress"], message=status.get("error"), completed=status["status"] in ["COMPLETED", "ERROR"])

@app.get("/reframe/download/{job_id}")
async def download_reframed(job_id: str):
    status = reframing_service.get_job_status(job_id)
    if not status or status["status"] != "COMPLETED": raise HTTPException(status_code=404, detail="File not ready")
    return FileResponse(path=status["output_path"], media_type="video/mp4", filename=f"reframed_{job_id[:8]}.mp4")

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True if os.getenv("NODE_ENV") == "development" else False)
