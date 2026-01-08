"""
FastAPI Server für Saliency Detection Service
Endpoints für Video-Analyse und Heatmap-Generierung
"""
import os
import asyncio
import json
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import uvicorn
from pathlib import Path

from ..services.saliency_detector import SaliencyDetector
from ..services.heatmap_generator import HeatmapGenerator
from ..services.reframing_service import ReframingService
from ..database.client import DatabaseClient
from ..utils.logger import logger, log_analysis_step, log_error

# FastAPI App initialisieren
app = FastAPI(
    title="PrismVid Saliency Detection API",
    description="Saliency Detection Service mit SAM 2.1 für Video-Reframing",
    version="1.0.0"
)

# Services initialisieren
saliency_detector = SaliencyDetector(model_type="vit_b", use_coreml=False)  # SAM 1 vit_b (SAM 2.1 ready)
heatmap_generator = HeatmapGenerator()
reframing_service = ReframingService()
db_client = DatabaseClient()

# Pydantic Models
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
    aspectRatio: Dict[str, int]  # {"width": 9, "height": 16}
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

# Health Check
@app.get("/health")
async def health_check():
    """Health Check Endpoint"""
    return {
        "status": "healthy", 
        "service": "prismvid-saliency-detector",
        "model_type": saliency_detector.model_type,
        "use_coreml": saliency_detector.use_coreml
    }

# Video-Analyse Endpoints
@app.post("/analyze", response_model=SaliencyResponse)
async def analyze_video(request: SaliencyRequest, background_tasks: BackgroundTasks):
    """
    Analysiert Video für Saliency Detection
    
    Args:
        request: Saliency-Analyse-Anfrage
        background_tasks: FastAPI Background Tasks
        
    Returns:
        Saliency Response mit Status
    """
    video_id = request.videoId
    video_path = request.videoPath
    
    logger.info(f"Starting saliency analysis for video {video_id}")
    
    # Video-Status aktualisieren
    await db_client.update_video_status(video_id, "ANALYZING")
    await db_client.create_analysis_log(video_id, "INFO", "Saliency analysis started")
    
    # Background-Analyse starten
    background_tasks.add_task(
        process_saliency_analysis, 
        video_id, 
        video_path, 
        request.sampleRate,
        tuple(request.aspectRatio),
        request.maxFrames
    )
    
    return SaliencyResponse(
        message="Saliency analysis started",
        videoId=video_id,
        status="ANALYZING"
    )

@app.post("/analyze-scene", response_model=SaliencyResponse)
async def analyze_scene(request: SceneSaliencyRequest, background_tasks: BackgroundTasks):
    """
    Analysiert einzelne Scene für Saliency Detection
    
    Args:
        request: Scene-Saliency-Anfrage
        background_tasks: FastAPI Background Tasks
        
    Returns:
        Saliency Response mit Status
    """
    video_id = request.videoId
    scene_id = request.sceneId
    video_path = request.videoPath
    
    logger.info(f"Starting scene saliency analysis for video {video_id}, scene {scene_id}")
    
    # Background-Analyse starten
    background_tasks.add_task(
        process_scene_saliency_analysis,
        video_id,
        scene_id,
        video_path,
        request.startTime,
        request.endTime,
        tuple(request.aspectRatio)
    )
    
    return SaliencyResponse(
        message="Scene saliency analysis started",
        videoId=video_id,
        status="ANALYZING"
    )

# Heatmap-Generierung Endpoints
@app.post("/generate-heatmap", response_model=HeatmapResponse)
async def generate_heatmap(request: HeatmapRequest, background_tasks: BackgroundTasks):
    """
    Generiert Heatmap-Video für Debugging
    
    Args:
        request: Heatmap-Generierungs-Anfrage
        background_tasks: FastAPI Background Tasks
        
    Returns:
        Heatmap Response mit Pfaden
    """
    video_id = request.videoId
    
    logger.info(f"Starting heatmap generation for video {video_id}")
    
    # Background-Generierung starten
    background_tasks.add_task(
        process_heatmap_generation,
        video_id,
        request.colormap,
        request.opacity,
        request.showRoi,
        request.showInfo
    )
    
    return HeatmapResponse(
        message="Heatmap generation started",
        videoId=video_id,
        heatmapPath="",  # Wird nach Generierung gefüllt
    )

@app.post("/generate-all-visualizations")
async def generate_all_visualizations(video_id: str, background_tasks: BackgroundTasks):
    """
    Generiert alle Visualisierungen (Heatmap, Comparison, ROI-Previews)
    
    Args:
        video_id: Video-ID
        background_tasks: FastAPI Background Tasks
        
    Returns:
        Status-Response
    """
    logger.info(f"Starting all visualizations generation for video {video_id}")
    
    background_tasks.add_task(process_all_visualizations, video_id)
    
    return {
        "message": "All visualizations generation started",
        "videoId": video_id,
        "status": "GENERATING"
    }

# Daten-Abruf Endpoints
@app.get("/saliency/{video_id}")
async def get_saliency_data(video_id: str):
    """
    Holt Saliency-Daten für ein Video
    
    Args:
        video_id: Video-ID
        
    Returns:
        Saliency-Daten oder 404
    """
    try:
        # Aus lokaler Speicherung laden
        saliency_data = saliency_detector.get_analysis_results(video_id)
        
        if saliency_data:
            return {
                "videoId": video_id,
                "data": saliency_data,
                "status": "success"
            }
        else:
            # Aus Datenbank laden
            db_data = await db_client.get_saliency_analysis(video_id)
            if db_data:
                return {
                    "videoId": video_id,
                    "data": db_data,
                    "status": "success"
                }
            else:
                raise HTTPException(status_code=404, detail="Saliency analysis not found")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching saliency data for {video_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/saliency/{video_id}/scene/{scene_id}")
async def get_scene_saliency_data(video_id: str, scene_id: str):
    """
    Holt Saliency-Daten für eine Scene
    
    Args:
        video_id: Video-ID
        scene_id: Scene-ID
        
    Returns:
        Scene-Saliency-Daten oder 404
    """
    try:
        # Aus lokaler Speicherung laden
        scene_data = saliency_detector.get_scene_results(video_id, scene_id)
        
        if scene_data:
            return {
                "videoId": video_id,
                "sceneId": scene_id,
                "data": scene_data,
                "status": "success"
            }
        else:
            # Aus Datenbank laden
            db_data = await db_client.get_scene_saliency(scene_id)
            if db_data:
                return {
                    "videoId": video_id,
                    "sceneId": scene_id,
                    "data": db_data,
                    "status": "success"
                }
            else:
                raise HTTPException(status_code=404, detail="Scene saliency analysis not found")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching scene saliency data for {video_id}/{scene_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/heatmap/{video_id}")
async def get_heatmap_video(video_id: str):
    """
    Holt Heatmap-Video-Datei
    
    Args:
        video_id: Video-ID
        
    Returns:
        Heatmap-Video-Datei oder 404
    """
    try:
        video_dir = Path(f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/{video_id}")
        heatmap_path = video_dir / "heatmap_video.mp4"
        
        if heatmap_path.exists():
            return FileResponse(
                path=str(heatmap_path),
                media_type="video/mp4",
                filename=f"heatmap_{video_id}.mp4"
            )
        else:
            raise HTTPException(status_code=404, detail="Heatmap video not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching heatmap video for {video_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/comparison/{video_id}")
async def get_comparison_video(video_id: str):
    """
    Holt Vergleichsvideo-Datei
    
    Args:
        video_id: Video-ID
        
    Returns:
        Vergleichsvideo-Datei oder 404
    """
    try:
        video_dir = Path(f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/{video_id}")
        comparison_path = video_dir / "comparison_video.mp4"
        
        if comparison_path.exists():
            return FileResponse(
                path=str(comparison_path),
                media_type="video/mp4",
                filename=f"comparison_{video_id}.mp4"
            )
        else:
            raise HTTPException(status_code=404, detail="Comparison video not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching comparison video for {video_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Background Task Functions
async def process_saliency_analysis(video_id: str, video_path: str, 
                                   sample_rate: int, aspect_ratio: tuple, 
                                   max_frames: Optional[int]):
    """Verarbeitet Saliency-Analyse im Hintergrund"""
    try:
        log_analysis_step(video_id, "saliency_analysis_start")
        
        # Video analysieren
        result = saliency_detector.analyze_video(
            video_path=video_path,
            video_id=video_id,
            sample_rate=sample_rate,
            aspect_ratio=aspect_ratio,
            max_frames=max_frames
        )
        
        # ROI-Daten extrahieren
        roi_suggestions = []
        for frame in result["frames"]:
            if "roi_suggestions" in frame:
                roi_suggestions.extend(frame["roi_suggestions"])
        
        # In Datenbank speichern
        analysis_id = await db_client.create_saliency_analysis(
            video_id=video_id,
            scene_id=None,
            data_path=f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/{video_id}/saliency_data.json",
            heatmap_path=None,  # Wird später generiert
            roi_data=json.dumps(roi_suggestions),
            frame_count=len(result["frames"]),
            sample_rate=sample_rate,
            model_version=saliency_detector.model_type,
            processing_time=result["metadata"]["processing_stats"]["processing_time"]
        )
        
        log_analysis_step(video_id, "saliency_analysis_complete", {
            "analysis_id": analysis_id,
            "frames_analyzed": len(result["frames"])
        })
        
        # Video-Status aktualisieren
        await db_client.update_video_status(video_id, "ANALYZED")
        await db_client.create_analysis_log(
            video_id, 
            "INFO", 
            "Saliency analysis completed successfully",
            {
                "analysis_id": analysis_id,
                "frames_analyzed": len(result["frames"]),
                "model_version": saliency_detector.model_type
            }
        )
        
        logger.info(f"Saliency analysis completed for video {video_id}")
        
    except Exception as e:
        log_error(video_id, f"Saliency analysis failed: {str(e)}")
        await db_client.update_video_status(video_id, "ERROR")
        await db_client.create_analysis_log(video_id, "ERROR", f"Saliency analysis failed: {str(e)}")

async def process_scene_saliency_analysis(video_id: str, scene_id: str, video_path: str,
                                        start_time: float, end_time: float, aspect_ratio: tuple):
    """Verarbeitet Scene-Saliency-Analyse im Hintergrund"""
    try:
        log_analysis_step(video_id, "scene_saliency_analysis_start", {"scene_id": scene_id})
        
        # Scene analysieren
        result = saliency_detector.analyze_scene(
            video_path=video_path,
            video_id=video_id,
            scene_id=scene_id,
            start_time=start_time,
            end_time=end_time,
            aspect_ratio=aspect_ratio
        )
        
        # ROI-Daten extrahieren
        roi_suggestions = []
        for frame in result["frames"]:
            if "roi_suggestions" in frame:
                roi_suggestions.extend(frame["roi_suggestions"])
        
        # In Datenbank speichern
        analysis_id = await db_client.create_saliency_analysis(
            video_id=video_id,
            scene_id=scene_id,
            data_path=f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/{video_id}/scene_{scene_id}/saliency_data.json",
            heatmap_path=None,
            roi_data=json.dumps(roi_suggestions),
            frame_count=len(result["frames"]),
            sample_rate=1,
            model_version=saliency_detector.model_type,
            processing_time=result["metadata"]["processing_stats"]["processing_time"]
        )
        
        log_analysis_step(video_id, "scene_saliency_analysis_complete", {
            "scene_id": scene_id,
            "analysis_id": analysis_id,
            "frames_analyzed": len(result["frames"])
        })
        
        logger.info(f"Scene saliency analysis completed for video {video_id}, scene {scene_id}")
        
    except Exception as e:
        log_error(video_id, f"Scene saliency analysis failed: {str(e)}", {"scene_id": scene_id})

async def process_heatmap_generation(video_id: str, colormap: str, opacity: float,
                                    show_roi: bool, show_info: bool):
    """Verarbeitet Heatmap-Generierung im Hintergrund"""
    try:
        log_analysis_step(video_id, "heatmap_generation_start")
        
        # Saliency-Daten laden
        saliency_data = saliency_detector.get_analysis_results(video_id)
        if not saliency_data:
            raise ValueError(f"No saliency data found for video {video_id}")
        
        # Video-Pfad aus Datenbank holen
        video_info = await db_client.get_video(video_id)
        if not video_info:
            raise ValueError(f"Video {video_id} not found")
        
        video_path = video_info["file_path"]
        
        # Heatmap-Video generieren
        video_dir = Path(f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/{video_id}")
        video_dir.mkdir(exist_ok=True)
        
        heatmap_path = video_dir / "heatmap_video.mp4"
        
        result_path = heatmap_generator.create_heatmap_video(
            video_path=video_path,
            saliency_data=saliency_data,
            output_path=str(heatmap_path),
            colormap=colormap,
            opacity=opacity,
            show_roi=show_roi,
            show_info=show_info
        )
        
        log_analysis_step(video_id, "heatmap_generation_complete", {
            "heatmap_path": result_path,
            "colormap": colormap
        })
        
        logger.info(f"Heatmap generation completed for video {video_id}")
        
    except Exception as e:
        log_error(video_id, f"Heatmap generation failed: {str(e)}")

async def process_all_visualizations(video_id: str):
    """Verarbeitet alle Visualisierungen im Hintergrund"""
    try:
        log_analysis_step(video_id, "all_visualizations_start")
        
        # Saliency-Daten laden
        saliency_data = saliency_detector.get_analysis_results(video_id)
        if not saliency_data:
            raise ValueError(f"No saliency data found for video {video_id}")
        
        # Video-Pfad aus Datenbank holen
        video_info = await db_client.get_video(video_id)
        if not video_info:
            raise ValueError(f"Video {video_id} not found")
        
        video_path = video_info["file_path"]
        
        # Alle Visualisierungen generieren
        results = heatmap_generator.generate_all_visualizations(
            video_path=video_path,
            video_id=video_id,
            saliency_data=saliency_data
        )
        
        log_analysis_step(video_id, "all_visualizations_complete", {
            "generated_videos": list(results.keys())
        })
        
        logger.info(f"All visualizations completed for video {video_id}")
        
    except Exception as e:
        log_error(video_id, f"All visualizations generation failed: {str(e)}")

# Reframing Endpoints
@app.post("/reframe-video", response_model=ReframingResponse)
async def reframe_video(request: ReframingRequest):
    """
    Reframes a video based on saliency data
    
    Args:
        request: Reframing request with video and saliency data paths
        
    Returns:
        Reframing response with job ID
    """
    try:
        logger.info(f"Starting reframing for video {request.videoId}")
        
        # Start reframing job
        job_id = await reframing_service.reframe_video(
            video_id=request.videoId,
            video_path=request.videoPath,
            saliency_data_path=request.saliencyDataPath,
            aspect_ratio=request.aspectRatio,
            smoothing_factor=request.smoothingFactor,
            output_format=request.outputFormat,
            reframed_video_id=request.reframedVideoId
        )
        
        return ReframingResponse(
            message="Reframing started",
            videoId=request.videoId,
            jobId=job_id,
            status="PROCESSING"
        )
        
    except Exception as e:
        logger.error(f"Failed to start reframing for video {request.videoId}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/saliency-status/{video_id}", response_model=StatusResponse)
async def get_saliency_status(video_id: str):
    """
    Gets saliency analysis status for a video
    
    Args:
        video_id: Video identifier
        
    Returns:
        Status response
    """
    try:
        status = reframing_service.get_video_saliency_status(video_id)
        return StatusResponse(**status)
    except Exception as e:
        logger.error(f"Failed to get saliency status for video {video_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reframe-status/{job_id}", response_model=StatusResponse)
async def get_reframing_status(job_id: str):
    """
    Gets reframing job status
    
    Args:
        job_id: Job identifier
        
    Returns:
        Status response
    """
    try:
        status = reframing_service.get_job_status(job_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return StatusResponse(
            status=status["status"],
            progress=status["progress"],
            message=status.get("error"),
            completed=status["status"] in ["COMPLETED", "ERROR"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get reframing status for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reframe-download/{job_id}")
async def download_reframed_video(job_id: str):
    """
    Downloads a completed reframed video
    
    Args:
        job_id: Job identifier
        
    Returns:
        Video file response
    """
    try:
        status = reframing_service.get_job_status(job_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if status["status"] != "COMPLETED":
            raise HTTPException(status_code=400, detail="Job not completed")
        
        output_path = status.get("output_path")
        if not output_path or not Path(output_path).exists():
            raise HTTPException(status_code=404, detail="Output file not found")
        
        return FileResponse(
            path=output_path,
            media_type="video/mp4",
            filename=f"reframed_{job_id[:8]}.mp4"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download reframed video for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Startup und Shutdown Events
@app.on_event("startup")
async def startup_event():
    """Startup Event"""
    logger.info("Saliency Detection Service starting up")
    
    # Storage-Verzeichnisse erstellen
    storage_dir = Path("/Volumes/DOCKER_EXTERN/prismvid/storage/saliency")
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info("Saliency Detection Service started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown Event"""
    logger.info("Saliency Detection Service shutting down")
    await db_client.close()
    logger.info("Saliency Detection Service shutdown complete")

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8002,
        reload=True if os.getenv("NODE_ENV") == "development" else False
    )
