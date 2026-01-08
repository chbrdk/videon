import cv2
import os
from typing import List, Tuple
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector
import logging

# Set up logger
logger = logging.getLogger(__name__)

class SceneDetector:
    def __init__(self, threshold: float = 30.0):
        """
        Initialize scene detector
        
        Args:
            threshold: Threshold for scene detection (lower = more sensitive)
        """
        self.threshold = threshold

    def detect_scenes(self, video_path: str) -> List[Tuple[float, float]]:
        """
        Detect scenes in video file
        
        Args:
            video_path: Path to video file
            
        Returns:
            List of tuples (start_time, end_time) for each scene
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        logger.info(f"Starting scene detection for {video_path}")
        
        try:
            # Create video manager and scene manager
            video_manager = VideoManager([video_path])
            scene_manager = SceneManager()
            
            # Add content detector
            scene_manager.add_detector(ContentDetector(threshold=self.threshold))
            
            # Start video manager
            video_manager.start()
            
            # Detect scenes
            scene_manager.detect_scenes(frame_source=video_manager)
            
            # Get scene list
            scene_list = scene_manager.get_scene_list()
            
            # Convert to list of tuples
            scenes = []
            for i, (start_time, end_time) in enumerate(scene_list):
                start_seconds = start_time.get_seconds()
                end_seconds = end_time.get_seconds()
                scenes.append((start_seconds, end_seconds))
                
                logger.info(f"Scene {i+1}: {start_seconds:.2f}s - {end_seconds:.2f}s")
            
            if not scenes:
                logger.warning("No scenes detected, falling back to single-scene coverage")
                duration = None
                try:
                    import ffmpeg  # type: ignore
                    probe = ffmpeg.probe(video_path)
                    duration = float(probe["format"]["duration"])
                except Exception as probe_error:  # pragma: no cover - fallback logic
                    logger.warning(f"ffmpeg probe failed to determine duration: {probe_error}")

                if duration is None or duration <= 0:
                    try:
                        capture = cv2.VideoCapture(video_path)
                        fps = capture.get(cv2.CAP_PROP_FPS) or 0
                        frame_count = capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0
                        capture.release()
                        if fps > 0 and frame_count > 0:
                            duration = frame_count / fps
                    except Exception as cv_error:
                        logger.warning(f"OpenCV fallback failed: {cv_error}")

                if duration is None or duration <= 0:
                    duration = 60.0  # Sensible default to avoid zero-length scenes
                    logger.warning("Could not determine video duration, using default 60s fallback")

                scenes.append((0.0, duration))
                logger.info(f"Fallback scene: 0.00s - {duration:.2f}s")

            logger.info(f"Detected {len(scenes)} scenes (including fallbacks if applied)")
            return scenes
            
        except Exception as e:
            logger.error(f"Error during scene detection: {e}")
            raise
        finally:
            video_manager.release()

    def get_scene_count(self, video_path: str) -> int:
        """Get number of scenes without full detection"""
        scenes = self.detect_scenes(video_path)
        return len(scenes)
