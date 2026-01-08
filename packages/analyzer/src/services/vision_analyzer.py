# Real vision analysis with Swift Vision Service integration

import logging
import requests
import json
import os
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

class VisionAnalyzer:
    """Real vision analysis using Swift Vision Service"""
    
    def __init__(self, swift_vision_url: str = None):
        # Priority: 1) explicit parameter (if provided), 2) environment variable, 3) auto-detect Docker default
        is_docker = os.path.exists('/.dockerenv') or os.path.exists('/proc/1/cgroup')
        env_url = os.getenv('VISION_SERVICE_URL')
        
        # Check if explicit parameter was provided (not None)
        if swift_vision_url is not None:
            self.swift_vision_url = swift_vision_url
        elif env_url:
            self.swift_vision_url = env_url
        else:
            # Auto-detect: Docker containers need host.docker.internal
            self.swift_vision_url = 'http://host.docker.internal:8080' if is_docker else 'http://localhost:8080'
        
        logger.info(f"VisionAnalyzer initialized with Swift Vision Service at {self.swift_vision_url} (docker={is_docker}, env_set={'VISION_SERVICE_URL' in os.environ})")
    
    def analyze_scene(self, keyframe_path: str, scene_id: str) -> Optional[Dict[str, Any]]:
        """
        Analyze scene keyframe with Swift Vision Service
        
        Args:
            keyframe_path: Path to keyframe image (container path)
            scene_id: Scene identifier
            
        Returns:
            Vision analysis data or None
        """
        if not os.path.exists(keyframe_path):
            logger.error(f"Keyframe not found: {keyframe_path}")
            return None
        
        try:
            logger.info(f"Analyzing scene {scene_id} with keyframe: {keyframe_path}")
            
            # Convert container path to host path for Vision Service (runs on host, not in container)
            # Container: /app/storage/keyframes/... -> Host: storage/keyframes/... (relative to project root)
            host_keyframe_path = keyframe_path.replace('/app/storage', 'storage')
            # Make it absolute path for Vision Service
            if not os.path.exists('/.dockerenv'):
                # We're not in Docker, use path as-is
                host_keyframe_path = keyframe_path
            else:
                # We're in Docker, need to convert to host path
                # The storage is mounted at ./storage on host, so relative paths work
                # But Vision Service might need absolute path - use current working directory + relative path
                import os as os_module
                project_root = os_module.getenv('PROJECT_ROOT', '/Users/m4-dev/Development/prismvid')
                if host_keyframe_path.startswith('storage'):
                    host_keyframe_path = os_module.path.join(project_root, host_keyframe_path)
            
            logger.info(f"Using host path for Vision Service: {host_keyframe_path}")
            
            # Call Swift Vision Service for vision analysis (using /analyze/vision endpoint)
            response = requests.post(
                f"{self.swift_vision_url}/analyze/vision",
                json={
                    "sceneId": scene_id,
                    "keyframePath": host_keyframe_path
                },
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                vision_data = response.json()
                logger.info(f"Vision analysis completed for scene {scene_id}: {len(vision_data.get('objects', []))} objects, {len(vision_data.get('faces', []))} faces, {len(vision_data.get('textRecognitions', []))} text regions, {len(vision_data.get('humanRectangles', []))} humans, {len(vision_data.get('humanBodyPoses', []))} poses")
                
                return {
                    "objects": vision_data.get("objects", []),
                    "faces": vision_data.get("faces", []),
                    "textRecognitions": vision_data.get("textRecognitions", []),
                    "humanRectangles": vision_data.get("humanRectangles", []),
                    "humanBodyPoses": vision_data.get("humanBodyPoses", []),
                    "processingTime": vision_data.get("processingTime", 0.0),
                    "visionVersion": vision_data.get("visionVersion", "unknown"),
                    "timestamp": vision_data.get("timestamp", ""),
                    "sceneId": scene_id,
                    "keyframePath": keyframe_path
                }
            else:
                logger.error(f"Swift Vision Service error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error analyzing scene {scene_id}: {e}")
            return None
    
    def batch_analyze_scenes(self, keyframes: List[str], scene_ids: List[str] = None) -> List[Dict[str, Any]]:
        """
        Analyze multiple scenes in batch
        
        Args:
            keyframes: List of keyframe paths
            scene_ids: Optional list of scene IDs
            
        Returns:
            List of vision analysis results
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
        """Test connection to Swift Vision Service"""
        try:
            response = requests.get(f"{self.swift_vision_url}/health", timeout=5)
            if response.status_code == 200:
                health_data = response.json()
                logger.info(f"Swift Vision Service is healthy: {health_data}")
                return True
            else:
                logger.error(f"Swift Vision Service health check failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Cannot connect to Swift Vision Service: {e}")
            return False
