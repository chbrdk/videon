import cv2
import os
import ffmpeg
from typing import Optional
from PIL import Image
from ..utils.logger import logger

class KeyframeExtractor:
    def __init__(self, storage_path: str = "/app/storage"):
        """
        Initialize keyframe extractor
        
        Args:
            storage_path: Base storage path for keyframes
        """
        self.storage_path = storage_path
        self.keyframes_dir = os.path.join(storage_path, "keyframes")
        
        # Create keyframes directory if it doesn't exist
        try:
            os.makedirs(self.keyframes_dir, exist_ok=True)
        except (OSError, PermissionError):
            # In test environment, use temp directory
            import tempfile
            self.keyframes_dir = tempfile.mkdtemp()

    def extract_keyframe(self, video_path: str, scene_id: str, timestamp: float) -> Optional[str]:
        """
        Extract keyframe at specific timestamp
        
        Args:
            video_path: Path to video file
            scene_id: Unique scene identifier
            timestamp: Timestamp in seconds
            
        Returns:
            Path to extracted keyframe or None if failed
        """
        try:
            keyframe_filename = f"{scene_id}.jpg"
            keyframe_path = os.path.join(self.keyframes_dir, keyframe_filename)
            
            logger.info(f"Extracting keyframe for scene {scene_id} at {timestamp:.2f}s")
            
            # Use ffmpeg to extract frame
            (
                ffmpeg
                .input(video_path, ss=timestamp)
                .output(keyframe_path, vframes=1, format='image2', vcodec='mjpeg')
                .overwrite_output()
                .run(quiet=True)
            )
            
            # Verify the keyframe was created
            if os.path.exists(keyframe_path) and os.path.getsize(keyframe_path) > 0:
                logger.info(f"Keyframe extracted successfully: {keyframe_path}")
                return keyframe_path
            else:
                logger.error(f"Keyframe extraction failed for scene {scene_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error extracting keyframe for scene {scene_id}: {e}")
            return None

    def extract_scene_keyframes(self, video_path: str, scenes: list, video_id: str) -> list:
        """
        Extract keyframes for all scenes
        
        Args:
            video_path: Path to video file
            scenes: List of scene tuples (start_time, end_time)
            video_id: Video identifier
            
        Returns:
            List of keyframe paths
        """
        keyframe_paths = []
        
        for i, (start_time, end_time) in enumerate(scenes):
            # Calculate middle timestamp for keyframe
            middle_time = (start_time + end_time) / 2
            scene_id = f"{video_id}_scene_{i+1}"
            
            keyframe_path = self.extract_keyframe(video_path, scene_id, middle_time)
            if keyframe_path:
                keyframe_paths.append(keyframe_path)
            else:
                keyframe_paths.append(None)
                
        return keyframe_paths

    def get_video_duration(self, video_path: str) -> Optional[float]:
        """Get video duration in seconds"""
        try:
            probe = ffmpeg.probe(video_path)
            duration = float(probe['streams'][0]['duration'])
            return duration
        except Exception as e:
            logger.error(f"Error getting video duration: {e}")
            return None

    def get_video_info(self, video_path: str) -> Optional[dict]:
        """Get basic video information"""
        try:
            probe = ffmpeg.probe(video_path)
            video_stream = next(stream for stream in probe['streams'] if stream['codec_type'] == 'video')
            
            return {
                'duration': float(video_stream.get('duration', 0)),
                'width': int(video_stream.get('width', 0)),
                'height': int(video_stream.get('height', 0)),
                'fps': eval(video_stream.get('r_frame_rate', '0/1')),
                'codec': video_stream.get('codec_name', 'unknown')
            }
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            return None
