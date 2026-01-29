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
    image_path: Optional[str] = None
    image_base64: Optional[str] = None
    prompt: Optional[str] = "Beschreibe diese Szene detailliert. Was passiert in diesem Bild?"
    max_tokens: Optional[int] = 500

class VideoFramesAnalysisRequest(BaseModel):
    frame_paths: Optional[List[str]] = None
    frame_base64_images: Optional[List[str]] = None
    prompt: Optional[str] = "Beschreibe was in diesen Video-Frames passiert. Was ist die Story oder der Kontext?"
    max_tokens: Optional[int] = 1000

# ... (HealthResponse etc)

@app.post("/analyze/video-frames")
async def analyze_video_frames(request: VideoFramesAnalysisRequest):
    """
    Analysiert mehrere Video-Frames für Video Summarization
    
    Args:
        request: VideoFramesAnalysisRequest mit frame_paths/frame_base64_images und optionalem prompt
    
    Returns:
        Dictionary mit video_description und metadata
    """
    try:
        if not request.frame_paths and not request.frame_base64_images:
            raise HTTPException(status_code=400, detail="Either frame_paths or frame_base64_images must be provided")

        result = qwen_service.analyze_video_frames(
            frame_paths=request.frame_paths,
            frame_base64_images=request.frame_base64_images,
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

