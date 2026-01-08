import subprocess
import os
import logging
from pathlib import Path
import time

logger = logging.getLogger(__name__)

class AudioSeparationService:
    def __init__(self, model_name: str = "htdemucs_ft", device: str = "cpu"):
        self.model_name = model_name
        self.device = device
        
    def separate_audio(self, video_path: str, output_dir: str, video_id: str):
        """
        Separate audio into vocals and music using FFmpeg-based approach
        Returns: dict with file paths
        """
        try:
            logger.info(f"🎵 Starting FFmpeg-based audio separation for {video_id}")
            
            # Ensure output directory exists
            os.makedirs(output_dir, exist_ok=True)
            
            # Extract audio from video
            audio_path = Path(output_dir) / f"{video_id}_audio.wav"
            subprocess.run([
                "ffmpeg", "-y", "-i", video_path,
                "-ac", "2", "-ar", "44100", str(audio_path)
            ], check=True)
            
            # Create vocals track (center channel extraction)
            vocals_path = Path(output_dir) / f"{video_id}_vocals.wav"
            subprocess.run([
                "ffmpeg", "-y", "-i", str(audio_path),
                "-af", "pan=mono|c0=0.5*c0+0.5*c1",
                str(vocals_path)
            ], check=True)
            
            # Create music track (side channel extraction)
            music_path = Path(output_dir) / f"{video_id}_music.wav"
            subprocess.run([
                "ffmpeg", "-y", "-i", str(audio_path),
                "-af", "pan=mono|c0=0.5*c0-0.5*c1",
                str(music_path)
            ], check=True)
            
            # Clean up intermediate audio file
            os.remove(audio_path)
            
            output_paths = {
                "vocals": str(vocals_path),
                "music": str(music_path)
            }
            
            logger.info(f"✅ Created vocals stem: {vocals_path}")
            logger.info(f"✅ Created music stem: {music_path}")
            logger.info(f"🎵 FFmpeg-based audio separation completed for {video_id}")
            
            return output_paths
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ FFmpeg command failed: {e}")
            logger.error(f"Error output: {e.stderr}")
            raise Exception(f"Audio separation failed: {e.stderr}")
        except Exception as e:
            logger.error(f"❌ Audio separation error for {video_id}: {e}")
            raise