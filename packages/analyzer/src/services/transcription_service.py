import whisper
import torch
from pathlib import Path
import logging
import subprocess
import os

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self, model_size: str = "base", device: str = "cpu"):
        self.model_size = model_size
        self.device = device
        self.model = None
        
    def load_model(self):
        """Load Whisper model"""
        if self.model is None:
            try:
                self.model = whisper.load_model(self.model_size, device=self.device)
                logger.info(f"✅ Whisper model loaded: {self.model_size}")
            except Exception as e:
                logger.error(f"❌ Failed to load Whisper model: {e}")
                raise
        return self.model
    
    def transcribe_video(self, video_path: str, language: str = None):
        """
        Transcribe video audio with sentence-level timestamps
        
        Args:
            video_path: Path to video file
            language: Optional language code (None = auto-detect)
            
        Returns:
            dict with segments containing text and timestamps
        """
        logger.info(f"🎤 Starting transcription for {video_path}")
        
        try:
            # Extract audio from video using ffmpeg
            audio_path = self._extract_audio(video_path)
            logger.info(f"🎵 Audio extracted to: {audio_path}")
            
            # Load model
            model = self.load_model()
            
            # Transcribe with Whisper
            logger.info("🔄 Transcribing audio...")
            result = model.transcribe(
                audio_path,
                language=language,
                verbose=False,
                word_timestamps=True
            )
            
            logger.info(f"✅ Transcription completed: {len(result['segments'])} segments")
            logger.info(f"🌍 Detected language: {result.get('language', 'unknown')}")
            
            # Clean up temporary audio file and directory
            try:
                os.remove(audio_path)
                os.rmdir(os.path.dirname(audio_path))  # Remove temp directory
                logger.info("🗑️ Temporary audio file and directory cleaned up")
            except Exception as e:
                logger.warning(f"⚠️ Could not remove temporary audio file: {e}")
            
            logger.info(f"✅ Transcription completed: {len(result['segments'])} segments")
            
            return {
                "language": result.get("language", "unknown"),
                "segments": result["segments"],
                "duration": result.get("duration", 0)
            }
            
        except Exception as e:
            logger.error(f"❌ Transcription failed: {e}")
            raise
    
    def _extract_audio(self, video_path: str) -> str:
        """Extract audio from video using ffmpeg"""
        # Create audio file in a temporary directory to avoid conflicts
        import tempfile
        temp_dir = tempfile.mkdtemp()
        audio_filename = os.path.basename(video_path).replace(".mp4", "_audio.wav").replace(".mov", "_audio.wav")
        audio_path = os.path.join(temp_dir, audio_filename)
        
        cmd = [
            "ffmpeg", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1",
            audio_path, "-y"
        ]
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            logger.info("✅ Audio extraction successful")
            return audio_path
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ FFmpeg audio extraction failed: {e}")
            logger.error(f"FFmpeg stderr: {e.stderr}")
            raise Exception(f"Audio extraction failed: {e.stderr}")
