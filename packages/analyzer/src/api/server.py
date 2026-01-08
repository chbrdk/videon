import os
import asyncio
import json
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any
import uvicorn

from ..services.scene_detector import SceneDetector
from ..services.keyframe_extractor import KeyframeExtractor
from ..services.vision_analyzer import VisionAnalyzer
from ..services.transcription_service import TranscriptionService
from ..services.audio_separation_service import AudioSeparationService
from ..services.audio_separator import AudioSeparatorService
from ..services.spleeter_service import SpleeterService
from ..database.client import DatabaseClient
from ..utils.logger import logger, log_analysis_step, log_error
import httpx

app = FastAPI(
    title="PrismVid Analyzer API",
    description="Video scene detection and keyframe extraction service",
    version="1.0.0"
)

# Vision Service Configuration - MUST be defined BEFORE service initialization
# Use host.docker.internal for Docker containers to reach native macOS service
VISION_SERVICE_URL = os.getenv('VISION_SERVICE_URL', 'http://host.docker.internal:8080')
# Backend Service Configuration - use Docker service name in container
BACKEND_URL = os.getenv('BACKEND_URL', 'http://backend:4001')

# Initialize services
scene_detector = SceneDetector(threshold=30.0)
keyframe_extractor = KeyframeExtractor()
vision_analyzer = VisionAnalyzer(swift_vision_url=VISION_SERVICE_URL)
transcription_service = TranscriptionService(model_size="base", device="cpu")
audio_separator = AudioSeparationService(model_name="htdemucs_ft", device="cpu")
audio_separator_service = AudioSeparatorService()
spleeter_service = SpleeterService()  # macOS-optimierte Audio-Separierung
db_client = DatabaseClient()

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

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "prismvid-analyzer"}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_video(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Analyze video for scenes and extract keyframes
    
    Args:
        request: Analysis request with video ID and path
        background_tasks: FastAPI background tasks
        
    Returns:
        Analysis response
    """
    video_id = request.videoId
    video_path = request.videoPath
    
    logger.info(f"Starting analysis for video {video_id}")
    
    # Update status to analyzing
    await db_client.update_video_status(video_id, "ANALYZING")
    await db_client.create_analysis_log(video_id, "INFO", "Analysis started")
    
    # Start background analysis
    background_tasks.add_task(process_video_analysis, video_id, video_path)
    
    return AnalysisResponse(
        message="Video analysis started",
        videoId=video_id,
        status="ANALYZING"
    )

async def process_video_analysis(video_id: str, video_path: str):
    """
    Process video analysis in background
    
    Args:
        video_id: Video identifier
        video_path: Path to video file
    """
    try:
        log_analysis_step(video_id, "scene_detection_start")
        
        # Step 1: Detect scenes
        scenes = scene_detector.detect_scenes(video_path)
        
        if not scenes:
            log_error(video_id, "No scenes detected")
            await db_client.update_video_status(video_id, "ERROR")
            await db_client.create_analysis_log(video_id, "ERROR", "No scenes detected")
            return
        
        log_analysis_step(video_id, "scene_detection_complete", {"scene_count": len(scenes)})
        
        # Step 2: Extract keyframes
        log_analysis_step(video_id, "keyframe_extraction_start")
        keyframe_paths = keyframe_extractor.extract_scene_keyframes(video_path, scenes, video_id)
        
        log_analysis_step(video_id, "keyframe_extraction_complete", {
            "keyframes_extracted": len([p for p in keyframe_paths if p])
        })
        
        # Step 3: Save scenes to database
        log_analysis_step(video_id, "database_save_start")
        
        for i, (start_time, end_time) in enumerate(scenes):
            keyframe_path = keyframe_paths[i] if i < len(keyframe_paths) else None
            
            scene_id = await db_client.create_scene(video_id, start_time, end_time, keyframe_path)
            if not scene_id:
                log_error(video_id, f"Failed to save scene {i+1}")
                continue
            
            # Step 4: Vision analysis using Apple Vision Framework
            if keyframe_path:
                try:
                    logger.info(f"Triggering vision analysis for scene {scene_id} with keyframe {keyframe_path}")
                    await trigger_vision_analysis(scene_id, keyframe_path)
                except Exception as vision_error:
                    logger.error(f"Failed to trigger vision analysis for scene {scene_id}: {vision_error}", exc_info=True)
            else:
                logger.warning(f"No keyframe path available for scene {scene_id}, skipping vision analysis")
        
        log_analysis_step(video_id, "database_save_complete")
        
        # Step 5: Update video status
        await db_client.update_video_status(video_id, "ANALYZED")
        await db_client.create_analysis_log(video_id, "INFO", "Scene detection completed successfully", {
            "scenes_detected": len(scenes),
            "keyframes_extracted": len([p for p in keyframe_paths if p]),
            "vision_analysis": "enabled"
        })
        
        # Step 6: Automatically trigger Qwen VL analysis after all vision analyses complete
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(
                    f"{BACKEND_URL}/api/videos/{video_id}/qwenVL/analyze",
                    timeout=10.0  # Short timeout, it starts in background anyway
                )
                logger.info(f"✅ Qwen VL analysis triggered automatically for video {video_id}")
        except Exception as qwen_error:
            # Non-blocking: Log but don't fail analysis
            logger.warning(f"Failed to trigger Qwen VL (non-critical): {qwen_error}")
        
        # Step 7: Trigger search indexing
        try:
            async with httpx.AsyncClient() as client:
                await client.post(f"{BACKEND_URL}/api/videos/{video_id}/index")
            logger.info(f"Search indexing triggered for video {video_id}")
        except Exception as e:
            logger.error(f"Failed to trigger indexing: {e}")
        
        logger.info(f"Analysis completed successfully for video {video_id}")
        
    except Exception as e:
        log_error(video_id, f"Analysis failed: {str(e)}")
        await db_client.update_video_status(video_id, "ERROR")
        await db_client.create_analysis_log(video_id, "ERROR", f"Analysis failed: {str(e)}")

async def trigger_vision_analysis(scene_id: str, keyframe_path: str):
    """
    Trigger vision analysis for a scene using the Swift Vision Service
    
    Args:
        scene_id: Scene identifier
        keyframe_path: Path to keyframe image
    """
    try:
        # Use the VisionAnalyzer class for analysis
        vision_result = vision_analyzer.analyze_scene(keyframe_path, scene_id)
        
        if vision_result:
            # Extract all vision data
            objects = vision_result.get("objects", [])
            faces = vision_result.get("faces", [])
            text_recognitions = vision_result.get("textRecognitions") or []
            human_rectangles = vision_result.get("humanRectangles") or []
            human_body_poses = vision_result.get("humanBodyPoses") or []
            
            # Prepare JSON strings for database
            objects_json = json.dumps(objects) if objects else None
            faces_json = json.dumps(faces) if faces else None
            text_recognitions_json = json.dumps(text_recognitions) if text_recognitions else None
            human_rectangles_json = json.dumps(human_rectangles) if human_rectangles else None
            human_body_poses_json = json.dumps(human_body_poses) if human_body_poses else None
            
            # Save vision analysis to database
            await db_client.save_vision_analysis(
                scene_id=scene_id,
                objects=objects_json,
                object_count=len(objects),
                faces=faces_json,
                face_count=len(faces),
                text_recognitions=text_recognitions_json,
                text_count=len(text_recognitions),
                human_rectangles=human_rectangles_json,
                human_count=len(human_rectangles),
                human_body_poses=human_body_poses_json,
                pose_count=len(human_body_poses),
                processing_time=vision_result.get("processingTime", 0.0),
                vision_version=vision_result.get("visionVersion", "unknown")
            )
            
            logger.info(f"✅ Vision analysis saved for scene {scene_id}: {len(objects)} objects, {len(faces)} faces, {len(text_recognitions)} text regions, {len(human_rectangles)} humans, {len(human_body_poses)} poses")
        else:
            logger.warning(f"Vision analysis failed for scene {scene_id}: No results returned")
                
    except Exception as e:
        logger.warning(f"Vision analysis failed for scene {scene_id}: {str(e)}")

@app.get("/analysis/{video_id}/status")
async def get_analysis_status(video_id: str):
    """Get analysis status for a video"""
    try:
        video_info = await db_client.get_video_info(video_id)
        if not video_info:
            raise HTTPException(status_code=404, detail="Video not found")
        
        return {
            "videoId": video_id,
            "status": video_info.get("status", "UNKNOWN"),
            "message": "Status retrieved successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analysis status for {video_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/transcribe/{video_id}", response_model=TranscriptionResponse)
async def transcribe_video(video_id: str, request: TranscriptionRequest = None):
    """Transcribe video with WhisperX"""
    try:
        logger.info(f"🎤 Starting transcription for video: {video_id}")
        
        # Get video from database
        video = db_client.get_video(video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = video["file_path"]
        language = request.language if request else None
        
        logger.info(f"📹 Video path: {video_path}")
        logger.info(f"🌍 Language override: {language}")
        
        # Transcribe
        result = transcription_service.transcribe_video(
            video_path,
            language=language
        )
        
        logger.info(f"✅ Transcription completed: {len(result['segments'])} segments")
        
        # Save to database
        transcription_id = db_client.create_transcription(
            video_id=video_id,
            language=result["language"],
            segments=result["segments"]
        )
        
        logger.info(f"💾 Transcription saved with ID: {transcription_id}")
        
        # Update video status
        db_client.update_video_status_sync(
            video_id,
            "TRANSCRIBED"
        )
        
        return TranscriptionResponse(
            transcription_id=transcription_id,
            language=result["language"],
            segment_count=len(result["segments"]),
            duration=result["duration"]
        )
        
    except Exception as e:
        logger.error(f"❌ Transcription failed for video {video_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/separate-audio-scene/{video_id}/{scene_id}", response_model=SceneAudioSeparationResponse)
async def separate_audio_for_scene(video_id: str, scene_id: str, request: SceneAudioSeparationRequest):
    """Separate audio for a specific scene timerange"""
    try:
        logger.info(f"🎵 Starting audio separation for scene {scene_id} of video {video_id}")
        logger.info(f"⏱️ Timerange: {request.startTime}s - {request.endTime}s")
        
        # Get video from database
        video = db_client.get_video(video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = video["file_path"]
        
        # Separate audio for the specific timerange
        stems = audio_separator_service.separate_audio_for_timerange(
            video_path=video_path,
            start_time=request.startTime,
            end_time=request.endTime,
            video_id=video_id,
            scene_id=scene_id,
            stem_types=request.stemTypes
        )
        
        logger.info(f"✅ Audio separation completed for scene {scene_id}: {len(stems)} stems")
        
        # Save stems to database via backend API
        for stem_type, file_path in stems.items():
            file_size = os.path.getsize(file_path)
            
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{BACKEND_URL}/api/audio-stems",
                        json={
                            "videoId": video_id,
                            "sceneId": scene_id,
                            "stemType": stem_type,
                            "filePath": file_path,
                            "fileSize": file_size,
                            "startTime": request.startTime,
                            "endTime": request.endTime
                        }
                    )
                logger.info(f"Audio stem saved to database: {stem_type}")
            except Exception as e:
                logger.error(f"Failed to save audio stem to database: {e}")
        
        return SceneAudioSeparationResponse(
            message="Audio separation completed successfully",
            videoId=video_id,
            sceneId=scene_id,
            stems=stems
        )
        
    except Exception as e:
        logger.error(f"❌ Audio separation failed for scene {scene_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/separate-audio")
async def separate_audio(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Separate audio into vocals and music
    
    Args:
        request: Analysis request with video ID and path
        background_tasks: FastAPI background tasks
        
    Returns:
        Audio separation response
    """
    video_id = request.videoId
    video_path = request.videoPath
    
    logger.info(f"Starting audio separation for video {video_id}")
    
    # Update status to analyzing
    db_client.update_video_status_sync(video_id, "ANALYZING")
    db_client.create_analysis_log_sync(video_id, "INFO", "Audio separation started")
    
    # Start background audio separation
    background_tasks.add_task(process_audio_separation, video_id, video_path)
    
    return AnalysisResponse(
        message="Audio separation started",
        videoId=video_id,
        status="ANALYZING"
    )

async def process_audio_separation(video_id: str, video_path: str):
    """
    Process audio separation in background
    
    Args:
        video_id: Video identifier
        video_path: Path to video file
    """
    try:
        log_analysis_step(video_id, "audio_separation_start")
        
        # Create output directory for audio stems - use STORAGE_PATH environment variable or default to /app/storage
        storage_path = os.getenv('STORAGE_PATH', '/app/storage')
        output_dir = f"{storage_path}/audio_stems/{video_id}"
        os.makedirs(output_dir, exist_ok=True)
        
        # Separate audio
        stem_paths = audio_separator.separate_audio(video_path, output_dir, video_id)
        
        log_analysis_step(video_id, "audio_separation_complete", {
            "stems_created": len(stem_paths)
        })
        
        # Save stems to database via backend API
        for stem_type, file_path in stem_paths.items():
            file_size = os.path.getsize(file_path)
            
            # Call backend API to create audio stem record
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{BACKEND_URL}/api/audio-stems",
                        json={
                            "videoId": video_id,
                            "stemType": stem_type,
                            "filePath": file_path,
                            "fileSize": file_size,
                            "duration": None,
                            "startTime": None,
                            "endTime": None
                        }
                    )
                logger.info(f"Audio stem saved to database: {stem_type}")
            except Exception as e:
                logger.error(f"Failed to save audio stem to database: {e}")
        
        # Update video status
        db_client.update_video_status_sync(video_id, "ANALYZED")
        db_client.create_analysis_log_sync(video_id, "INFO", "Audio separation completed successfully", {
            "stems_created": len(stem_paths),
            "stem_types": list(stem_paths.keys())
        })
        
        # Trigger search indexing
        try:
            async with httpx.AsyncClient() as client:
                await client.post(f"{BACKEND_URL}/api/videos/{video_id}/index")
            logger.info(f"Search indexing triggered for video {video_id}")
        except Exception as e:
            logger.error(f"Failed to trigger indexing: {e}")
        
        logger.info(f"Audio separation completed successfully for video {video_id}")
        
    except Exception as e:
        log_error(video_id, f"Audio separation failed: {str(e)}")
        db_client.update_video_status_sync(video_id, "ERROR")
        db_client.create_analysis_log_sync(video_id, "ERROR", f"Audio separation failed: {str(e)}")

@app.post("/api/spleeter-separate/{video_id}")
async def spleeter_separate_audio(video_id: str, background_tasks: BackgroundTasks):
    """Separate audio using Spleeter (macOS-optimized)"""
    try:
        logger.info(f"🎵 Starting Spleeter audio separation for video: {video_id}")
        
        # Get video from database
        video = db_client.get_video(video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = video["file_path"]
        logger.info(f"📹 Video path: {video_path}")
        
        # Test Spleeter installation
        if not spleeter_service.test_spleeter_installation():
            raise HTTPException(status_code=500, detail="Spleeter not properly installed")
        
        # Start background separation
        background_tasks.add_task(process_spleeter_separation, video_id, video_path)
        
        return {
            "videoId": video_id,
            "status": "SEPARATING",
            "message": "Spleeter audio separation started"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting Spleeter separation for {video_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def process_spleeter_separation(video_id: str, video_path: str):
    """Process Spleeter audio separation in background"""
    try:
        logger.info(f"🎵 Processing Spleeter separation for video {video_id}")
        
        # Update video status
        db_client.update_video_status_sync(video_id, "SEPARATING")
        
        # Get scenes for this video
        scenes = db_client.get_scenes_by_video_id(video_id)
        if not scenes:
            logger.warning(f"No scenes found for video {video_id}")
            return
        
        logger.info(f"Found {len(scenes)} scenes for separation")
        
        # Process each scene
        for scene in scenes:
            scene_id = scene["id"]
            start_time = scene["start_time"]
            end_time = scene["end_time"]
            
            logger.info(f"🎵 Separating audio for scene {scene_id} ({start_time}-{end_time}s)")
            
            try:
                # Use Spleeter for separation
                stem_paths = spleeter_service.separate_audio_for_timerange(
                    video_path=video_path,
                    start_time=start_time,
                    end_time=end_time,
                    video_id=video_id,
                    scene_id=scene_id,
                    stem_types=['vocals', 'accompaniment', 'original']
                )
                
                logger.info(f"✅ Spleeter separation completed for scene {scene_id}: {list(stem_paths.keys())}")
                
                # Save stems to database
                for stem_type, stem_path in stem_paths.items():
                    try:
                        file_size = os.path.getsize(stem_path)
                        duration = end_time - start_time
                        
                        db_client.create_audio_stem(
                            video_id=video_id,
                            scene_id=scene_id,
                            stem_type=stem_type,
                            file_path=stem_path,
                            file_size=file_size,
                            duration=duration,
                            start_time=start_time,
                            end_time=end_time
                        )
                        logger.info(f"Audio stem saved to database: {stem_type}")
                    except Exception as e:
                        logger.error(f"Failed to save audio stem to database: {e}")
                        
            except Exception as e:
                logger.error(f"Failed to separate audio for scene {scene_id}: {e}")
                continue
        
        # Update video status
        db_client.update_video_status_sync(video_id, "ANALYZED")
        db_client.create_analysis_log_sync(video_id, "INFO", "Spleeter audio separation completed successfully")
        
        logger.info(f"✅ Spleeter audio separation completed successfully for video {video_id}")
        
    except Exception as e:
        log_error(video_id, f"Spleeter audio separation failed: {str(e)}")
        db_client.update_video_status_sync(video_id, "ERROR")
        db_client.create_analysis_log_sync(video_id, "ERROR", f"Spleeter audio separation failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=5000,
        reload=True if os.getenv("NODE_ENV") == "development" else False
    )
