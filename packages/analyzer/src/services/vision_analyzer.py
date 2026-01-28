# Real vision analysis with Local Python implementation
# Replaces external Swift Vision Service integration

import logging
import os
from typing import Optional, Dict, Any, List
# Import our new local backend
try:
    from .local_vision import LocalVisionBackend
    LOCAL_BACKEND_AVAILABLE = True
except ImportError:
    LOCAL_BACKEND_AVAILABLE = False

logger = logging.getLogger(__name__)

class VisionAnalyzer:
    """
    Vision Analyzer using Local Python Backend (YOLO/MediaPipe/EasyOCR)
    """
    
    def __init__(self, swift_vision_url: str = None):
        # We keep the init signature for compatibility but ignore the URL
        self.use_local_backend = True
        
        if LOCAL_BACKEND_AVAILABLE:
            try:
                self.backend = LocalVisionBackend()
                logger.info("VisionAnalyzer initialized with Local Python Backend")
            except Exception as e:
                logger.error(f"Failed to initialize Local Vision Backend: {e}")
                self.use_local_backend = False
        else:
            logger.warning("LocalVisionBackend module not found")
            self.use_local_backend = False
    
    def analyze_scene(self, keyframe_path: str, scene_id: str) -> Optional[Dict[str, Any]]:
        """
        Analyze scene keyframe locally
        
        Args:
            keyframe_path: Path to keyframe image (container path)
            scene_id: Scene identifier
            
        Returns:
            Vision analysis data or None
        """
        if not os.path.exists(keyframe_path):
            logger.error(f"Keyframe not found: {keyframe_path}")
            return None
        
        if not self.use_local_backend:
            logger.warning("Local backend unavailable, skipping analysis")
            return None
            
        try:
            logger.info(f"Analyzing scene {scene_id} with keyframe: {keyframe_path}")
            
            # Analyze using local backend
            vision_data = self.backend.analyze_image(keyframe_path)
            
            # Add scene metadata
            vision_data["sceneId"] = scene_id
            vision_data["keyframePath"] = keyframe_path
            
            logger.info(f"Vision analysis completed for scene {scene_id}: {len(vision_data.get('objects', []))} objects, {len(vision_data.get('faces', []))} faces")
            
            return vision_data
                
        except Exception as e:
            logger.error(f"Error analyzing scene {scene_id}: {e}")
            return None
    
    def batch_analyze_scenes(self, keyframes: List[str], scene_ids: List[str] = None) -> List[Dict[str, Any]]:
        """
        Analyze multiple scenes in batch (sequentially for now)
        """
        results = []
        scene_ids = scene_ids or [f"scene_{i}" for i in range(len(keyframes))]
        
        logger.info(f"Starting batch analysis of {len(keyframes)} scenes")
        
        for i, keyframe_path in enumerate(keyframes):
            scene_id = scene_ids[i] if i < len(scene_ids) else f"scene_{i}"
            
            if keyframe_path and os.path.exists(keyframe_path):
                result = self.analyze_scene(keyframe_path, scene_id)
                results.append(result)
            else:
                logger.warning(f"Skipping invalid keyframe: {keyframe_path}")
                results.append(None)
        
        successful_analyses = sum(1 for r in results if r is not None)
        logger.info(f"Batch analysis completed: {successful_analyses}/{len(keyframes)} scenes analyzed successfully")
        
        return results
    
    def test_connection(self) -> bool:
        """Test if backend is initialized"""
        return self.use_local_backend and LOCAL_BACKEND_AVAILABLE
