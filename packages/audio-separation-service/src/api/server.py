"""
FastAPI Server für Audio Separation Service
Endpoints für Audio-Trennung mit Spleeter und Demucs
"""
import os
import sys
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn

# Füge src-Verzeichnis zum Path hinzu
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.separation_manager import AudioSeparationManager
from utils.logger import logger

# FastAPI App erstellen
app = FastAPI(
    title="PrismVid Audio Separation Service",
    description="Audio separation service using Spleeter and Demucs",
    version="1.0.0"
)

# Services initialisieren
separation_manager = AudioSeparationManager()

# Pydantic Models
class SeparationRequest(BaseModel):
    video_id: str
    video_path: str
    method: str = "spleeter"  # "spleeter" oder "demucs"

class SeparationResponse(BaseModel):
    success: bool
    message: str
    video_id: str
    method: str
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    available_methods: Dict[str, Any]

# Health Check Endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health Check für den Audio Separation Service"""
    try:
        available_methods = await separation_manager.get_available_methods()
        
        return HealthResponse(
            status="healthy",
            service="prismvid-audio-separation",
            available_methods=available_methods
        )
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unhealthy")

# Audio Separation Endpoint
@app.post("/separate", response_model=SeparationResponse)
async def separate_audio(request: SeparationRequest, background_tasks: BackgroundTasks):
    """Startet Audio-Trennung im Hintergrund"""
    try:
        logger.info("Audio separation requested", 
                   video_id=request.video_id, 
                   method=request.method)
        
        # Prüfen ob Video-Datei existiert
        if not os.path.exists(request.video_path):
            raise HTTPException(status_code=404, detail="Video file not found")
        
        # Audio-Trennung im Hintergrund starten
        background_tasks.add_task(
            separation_manager.separate_audio,
            request.video_id,
            request.video_path,
            request.method
        )
        
        return SeparationResponse(
            success=True,
            message=f"Audio separation started with {request.method}",
            video_id=request.video_id,
            method=request.method
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to start audio separation", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start separation: {str(e)}")

# Available Methods Endpoint
@app.get("/methods")
async def get_available_methods():
    """Gibt verfügbare Trennung-Methoden zurück"""
    try:
        methods = await separation_manager.get_available_methods()
        return methods
    except Exception as e:
        logger.error("Failed to get available methods", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get methods: {str(e)}")

# Root Endpoint
@app.get("/")
async def root():
    """Root Endpoint"""
    return {
        "service": "PrismVid Audio Separation Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "separate": "/separate",
            "methods": "/methods"
        }
    }

# Startup Event
@app.on_event("startup")
async def startup_event():
    """Startup Event"""
    logger.info("Audio Separation Service starting up")
    
    # Services initialisieren
    try:
        # Analyzer Service Integration testen
        logger.info("Testing Analyzer service connection...")
        # Test wird beim ersten Request gemacht
        
        logger.info("Audio Separation Service ready")
        
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))

# Shutdown Event
@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown Event"""
    logger.info("Audio Separation Service shutting down")
    await separation_manager.close()

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    )
