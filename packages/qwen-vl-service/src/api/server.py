"""
Qwen VL Service API - FastAPI Server
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

from ..services.qwen_service import QwenVLService
from loguru import logger

app = FastAPI(
    title="Qwen VL Service",
    description="Semantic video and image analysis using Qwen 3VL with MLX",
    version="1.0.0"
)

# Initialize Service
qwen_service = QwenVLService()

# Request/Response Models
class ImageAnalysisRequest(BaseModel):
    image_path: str
    prompt: Optional[str] = "Beschreibe diese Szene detailliert. Was passiert in diesem Bild?"
    max_tokens: Optional[int] = 500

class VideoFramesAnalysisRequest(BaseModel):
    frame_paths: List[str]
    prompt: Optional[str] = "Beschreibe was in diesen Video-Frames passiert. Was ist die Story oder der Kontext?"
    max_tokens: Optional[int] = 1000

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str

@app.get("/health")
async def health() -> HealthResponse:
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=qwen_service.is_loaded(),
        model_name=qwen_service.model_name
    )

@app.get("/model/info")
async def model_info():
    """Gibt Model-Informationen zurück"""
    return qwen_service.get_model_info()

@app.post("/analyze/image")
async def analyze_image(request: ImageAnalysisRequest):
    """
    Analysiert ein einzelnes Bild mit Qwen VL
    
    Args:
        request: ImageAnalysisRequest mit image_path und optionalem prompt
    
    Returns:
        Dictionary mit description und metadata
    """
    try:
        result = qwen_service.analyze_image(
            image_path=request.image_path,
            prompt=request.prompt,
            max_tokens=request.max_tokens
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in analyze_image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/video-frames")
async def analyze_video_frames(request: VideoFramesAnalysisRequest):
    """
    Analysiert mehrere Video-Frames für Video Summarization
    
    Args:
        request: VideoFramesAnalysisRequest mit frame_paths und optionalem prompt
    
    Returns:
        Dictionary mit video_description und metadata
    """
    try:
        result = qwen_service.analyze_video_frames(
            frame_paths=request.frame_paths,
            prompt=request.prompt,
            max_tokens=request.max_tokens
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in analyze_video_frames: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
    logger.info(f"Starting Qwen VL Service on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

