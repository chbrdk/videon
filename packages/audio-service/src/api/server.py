"""
PrismVid Audio Service - Demucs-based Audio Separation
Provides high-quality audio stem separation using Demucs models
"""

import os
import asyncio
import logging
import subprocess
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prismvid-audio-service")

app = FastAPI(
    title="PrismVid Audio Service",
    description="High-quality audio stem separation using Demucs",
    version="1.0.0"
)

# Configuration
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))
from config.environment import get_service_url, get_storage_path

AUDIO_STORAGE_BASE = get_storage_path('audioStems')
BACKEND_URL = get_service_url('backend')

class AudioSeparationRequest(BaseModel):
    video_id: str
    scene_id: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    stem_types: List[str] = ["vocals", "music", "original"]

class AudioSeparationResponse(BaseModel):
    video_id: str
    scene_id: Optional[str]
    status: str
    message: str
    stems: Optional[Dict[str, str]] = None

class DemucsAudioSeparator:
    """High-quality audio separation using Demucs"""
    
    def __init__(self, storage_base: str = AUDIO_STORAGE_BASE):
        self.storage_base = Path(storage_base)
        self.storage_base.mkdir(parents=True, exist_ok=True)
        
    def test_demucs_installation(self) -> bool:
        """Test if Demucs is properly installed"""
        try:
            result = subprocess.run(
                ["python3", "-c", "import demucs; print('Demucs version:', demucs.__version__)"],
                check=True,
                capture_output=True,
                text=True
            )
            logger.info("✅ Demucs installation test successful")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            logger.error(f"❌ Demucs installation test failed: {e}")
            return False
    
    def extract_audio_segment(
        self,
        video_path: str,
        start_time: float,
        end_time: float,
        output_dir: Path,
        video_id: str,
        scene_id: Optional[str]
    ) -> str:
        """Extract audio segment from video using FFmpeg"""
        
        duration = end_time - start_time
        if scene_id:
            audio_filename = f"{video_id}_{scene_id}_segment.wav"
        else:
            audio_filename = f"{video_id}_full_segment.wav"
            
        audio_path = output_dir / audio_filename
        
        cmd = [
            "ffmpeg", "-i", video_path,
            "-ss", str(start_time),
            "-t", str(duration),
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "44100", "-ac", "2",
            str(audio_path), "-y"
        ]
        
        logger.info(f"🎵 Extracting audio segment: {' '.join(cmd)}")
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            logger.info(f"✅ Audio segment extracted: {audio_path}")
            return str(audio_path)
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ FFmpeg error during audio extraction: {e.stderr}")
            raise
    
    def separate_audio_with_demucs(
        self,
        audio_path: str,
        output_dir: Path,
        stem_types: List[str]
    ) -> Dict[str, str]:
        """Separate audio using Demucs"""
        
        # Use Demucs for high-quality separation
        cmd = [
            "python3", "-m", "demucs.separate",
            "-n", "htdemucs",  # Hybrid Transformer Demucs model
            "--two-stems", "vocals",  # Separate into vocals and instrumentals
            "-o", str(output_dir),
            audio_path
        ]
        
        logger.info(f"🎵 Separating audio with Demucs: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            
            # Demucs creates a subdirectory with the model name
            audio_filename = Path(audio_path).stem
            demucs_output_dir = output_dir / "htdemucs" / audio_filename
            
            if not demucs_output_dir.exists():
                raise FileNotFoundError(f"Demucs output directory not found: {demucs_output_dir}")
            
            # Map Demucs outputs to requested stem types
            stem_mapping = {
                'vocals': 'vocals.wav',
                'music': 'no_vocals.wav',
                'instrumentals': 'no_vocals.wav',
                'accompaniment': 'no_vocals.wav'
            }
            
            results = {}
            
            for stem_type in stem_types:
                if stem_type == 'original':
                    # Copy the original audio segment
                    original_path = output_dir / f"{audio_filename}_original.wav"
                    shutil.copy2(audio_path, original_path)
                    results[stem_type] = str(original_path)
                else:
                    # Use Demucs output
                    demucs_file = stem_mapping.get(stem_type, 'vocals.wav')
                    source_file = demucs_output_dir / demucs_file
                    
                    if source_file.exists():
                        # Copy to final location
                        final_path = output_dir / f"{audio_filename}_{stem_type}.wav"
                        shutil.copy2(source_file, final_path)
                        results[stem_type] = str(final_path)
                        logger.info(f"✅ {stem_type} stem created: {final_path}")
                    else:
                        logger.warning(f"⚠️ Demucs output file not found: {source_file}")
            
            return results
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Demucs error: {e.stderr}")
            raise
        except Exception as e:
            logger.error(f"❌ Error processing Demucs output: {e}")
            raise
    
    async def separate_audio_for_scene(
        self,
        video_id: str,
        scene_id: str,
        start_time: float,
        end_time: float,
        video_path: str,
        stem_types: List[str]
    ) -> Dict[str, str]:
        """Separate audio for a specific scene"""
        
        logger.info(f"🎵 Separating audio for scene {scene_id} ({start_time}-{end_time}s)")
        
        # Create output directory
        output_dir = self.storage_base / video_id / scene_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Extract audio segment
            audio_segment_path = self.extract_audio_segment(
                video_path, start_time, end_time, output_dir, video_id, scene_id
            )
            
            # Separate with Demucs
            stem_paths = self.separate_audio_with_demucs(
                audio_segment_path, output_dir, stem_types
            )
            
            logger.info(f"✅ Audio separation completed for scene {scene_id}: {list(stem_paths.keys())}")
            return stem_paths
            
        except Exception as e:
            logger.error(f"❌ Failed to separate audio for scene {scene_id}: {e}")
            raise
    
    async def separate_audio_for_complete_video(
        self,
        video_id: str,
        video_path: str,
        video_duration: float,
        stem_types: List[str]
    ) -> Dict[str, str]:
        """Separate audio for the complete video"""
        
        logger.info(f"🎵 Separating audio for complete video ({video_duration}s)")
        
        # Create output directory for complete video
        output_dir = self.storage_base / video_id / "full"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Extract audio for complete video
            audio_segment_path = self.extract_audio_segment(
                video_path, 0, video_duration, output_dir, video_id, None
            )
            
            # Separate with Demucs
            stem_paths = self.separate_audio_with_demucs(
                audio_segment_path, output_dir, stem_types
            )
            
            logger.info(f"✅ Audio separation completed for complete video: {list(stem_paths.keys())}")
            return stem_paths
            
        except Exception as e:
            logger.error(f"❌ Audio separation failed for complete video: {e}")
            raise

# Initialize the separator
audio_separator = DemucsAudioSeparator()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    demucs_ok = audio_separator.test_demucs_installation()
    return {
        "status": "healthy" if demucs_ok else "unhealthy",
        "service": "prismvid-audio-service",
        "demucs_available": demucs_ok,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/separate-audio", response_model=AudioSeparationResponse)
async def separate_audio(request: AudioSeparationRequest, background_tasks: BackgroundTasks):
    """Start audio separation for a video or scene"""
    
    try:
        logger.info(f"🎵 Starting audio separation for video: {request.video_id}")
        
        # Test Demucs installation
        if not audio_separator.test_demucs_installation():
            raise HTTPException(status_code=500, detail="Demucs not properly installed")
        
        # Start background separation
        background_tasks.add_task(process_audio_separation, request)
        
        return AudioSeparationResponse(
            video_id=request.video_id,
            scene_id=request.scene_id,
            status="SEPARATING",
            message="Audio separation started"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting audio separation for {request.video_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/process-existing-files")
async def process_existing_files(request: AudioSeparationRequest):
    """Process existing Demucs files and save them to backend"""
    
    try:
        logger.info(f"🎵 Processing existing Demucs files for video: {request.video_id}")
        
        if request.scene_id:
            # Process single scene
            await process_existing_demucs_files(request.video_id, request.scene_id)
        else:
            # Process all scenes for the video
            async with httpx.AsyncClient() as client:
                scenes_response = await client.get(f"{BACKEND_URL}/api/videos/{request.video_id}/scenes")
                if scenes_response.status_code == 200:
                    scenes = scenes_response.json()
                    for scene in scenes:
                        scene_id = scene["id"]
                        await process_existing_demucs_files(request.video_id, scene_id)
        
        return AudioSeparationResponse(
            video_id=request.video_id,
            scene_id=request.scene_id,
            status="COMPLETED",
            message="Existing Demucs files processed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error processing existing files for {request.video_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def process_audio_separation(request: AudioSeparationRequest):
    """Process audio separation in background"""
    
    try:
        logger.info(f"🎵 Processing audio separation for video {request.video_id}")
        
        # Get video information from backend
        async with httpx.AsyncClient() as client:
            video_response = await client.get(f"{BACKEND_URL}/api/videos/{request.video_id}")
            if video_response.status_code != 200:
                raise Exception(f"Video {request.video_id} not found")
            
            video_data = video_response.json()
            video_path = video_data.get("file_path")
            
            if not video_path or not os.path.exists(video_path):
                raise Exception(f"Video file not found: {video_path}")
        
        if request.scene_id and request.start_time is not None and request.end_time is not None:
            # Single scene separation
            stem_paths = await audio_separator.separate_audio_for_scene(
                request.video_id,
                request.scene_id,
                request.start_time,
                request.end_time,
                video_path,
                request.stem_types
            )
            
            # Save stems to backend database
            await save_stems_to_backend(request.video_id, request.scene_id, stem_paths)
            
        else:
            # Full video separation - separate the complete video once
            logger.info(f"🎵 Separating audio for complete video")
            
            # Get video duration
            video_duration = video_data.get("duration", 0)
            if video_duration <= 0:
                raise Exception(f"Invalid video duration: {video_duration}")
            
            # Separate audio for the complete video (not per scene)
            stem_paths = await audio_separator.separate_audio_for_complete_video(
                request.video_id,
                video_path,
                video_duration,
                request.stem_types
            )
            
            # Save stems to backend database (no sceneId - these are full-video stems)
            await save_stems_to_backend(request.video_id, None, stem_paths)
        
        logger.info(f"✅ Audio separation completed successfully for video {request.video_id}")
        
    except Exception as e:
        logger.error(f"❌ Audio separation failed for video {request.video_id}: {e}")

async def save_stems_to_backend(video_id: str, scene_id: Optional[str], stem_paths: Dict[str, str]):
    """Save audio stems to backend database"""
    
    try:
        async with httpx.AsyncClient() as client:
            for stem_type, stem_path in stem_paths.items():
                if os.path.exists(stem_path):
                    file_size = os.path.getsize(stem_path)
                    
                    # Create audio stem in backend
                    stem_data = {
                        "videoId": video_id,
                        "sceneId": scene_id,
                        "stemType": stem_type,
                        "filePath": stem_path,
                        "fileSize": file_size
                    }
                    
                    response = await client.post(
                        f"{BACKEND_URL}/api/audio-stems",
                        json=stem_data
                    )
                    
                    if response.status_code == 201:
                        logger.info(f"✅ Audio stem saved to database: {stem_type}")
                    else:
                        logger.error(f"❌ Failed to save audio stem: {response.text}")
                        
    except Exception as e:
        logger.error(f"❌ Error saving stems to backend: {e}")

async def process_existing_demucs_files(video_id: str, scene_id: str):
    """Process existing Demucs files and save them to backend"""
    
    try:
        scene_dir = Path(AUDIO_STORAGE_BASE) / video_id / scene_id
        demucs_dir = scene_dir / "htdemucs"
        
        if demucs_dir.exists():
            # Find all Demucs output directories
            for demucs_output_dir in demucs_dir.iterdir():
                if demucs_output_dir.is_dir():
                    # Process vocals and no_vocals files
                    stem_mapping = {
                        'vocals': 'vocals.wav',
                        'music': 'no_vocals.wav',
                        'instrumentals': 'no_vocals.wav',
                        'accompaniment': 'no_vocals.wav'
                    }
                    
                    stem_paths = {}
                    
                    for stem_type, filename in stem_mapping.items():
                        source_file = demucs_output_dir / filename
                        if source_file.exists():
                            # Copy to final location
                            final_path = scene_dir / f"{demucs_output_dir.name}_{stem_type}.wav"
                            shutil.copy2(source_file, final_path)
                            stem_paths[stem_type] = str(final_path)
                            logger.info(f"✅ {stem_type} stem processed: {final_path}")
                    
                    # Save to backend
                    if stem_paths:
                        await save_stems_to_backend(video_id, scene_id, stem_paths)
                        
    except Exception as e:
        logger.error(f"❌ Error processing existing Demucs files: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5679)
