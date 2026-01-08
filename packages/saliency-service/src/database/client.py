"""
Database Client für Saliency Detection Service
Kommuniziert mit Backend über HTTP API
"""
import httpx
import json
from typing import Dict, Any, Optional, List
from ..utils.logger import logger

class DatabaseClient:
    """Client für Backend-Datenbank-Kommunikation"""
    
    def __init__(self, backend_url: str = "http://localhost:4001"):
        self.backend_url = backend_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Schließt den HTTP Client"""
        await self.client.aclose()
    
    async def get_video(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Holt Video-Informationen"""
        try:
            response = await self.client.get(f"{self.backend_url}/api/videos/{video_id}")
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Video {video_id} not found: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error fetching video {video_id}: {e}")
            return None
    
    async def get_scenes_by_video_id(self, video_id: str) -> List[Dict[str, Any]]:
        """Holt alle Szenen für ein Video"""
        try:
            response = await self.client.get(f"{self.backend_url}/api/videos/{video_id}/scenes")
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"No scenes found for video {video_id}: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error fetching scenes for video {video_id}: {e}")
            return []
    
    async def create_saliency_analysis(self, 
                                     video_id: str,
                                     scene_id: Optional[str],
                                     data_path: str,
                                     heatmap_path: Optional[str],
                                     roi_data: str,
                                     frame_count: int,
                                     sample_rate: int,
                                     model_version: str,
                                     processing_time: float) -> Optional[str]:
        """Erstellt Saliency-Analyse-Eintrag"""
        try:
            payload = {
                "videoId": video_id,
                "sceneId": scene_id,
                "dataPath": data_path,
                "heatmapPath": heatmap_path,
                "roiData": roi_data,
                "frameCount": frame_count,
                "sampleRate": sample_rate,
                "modelVersion": model_version,
                "processingTime": processing_time
            }
            
            response = await self.client.post(
                f"{self.backend_url}/api/saliency-analyses",
                json=payload
            )
            
            if response.status_code == 201:
                result = response.json()
                logger.info(f"Saliency analysis created: {result.get('id')}")
                return result.get("id")
            else:
                logger.error(f"Failed to create saliency analysis: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating saliency analysis: {e}")
            return None
    
    async def update_video_status(self, video_id: str, status: str):
        """Aktualisiert Video-Status"""
        try:
            response = await self.client.patch(
                f"{self.backend_url}/api/videos/{video_id}/status",
                json={"status": status}
            )
            if response.status_code == 200:
                logger.info(f"Video {video_id} status updated to {status}")
            else:
                logger.warning(f"Failed to update video status: {response.status_code}")
        except Exception as e:
            logger.error(f"Error updating video status: {e}")
    
    async def create_analysis_log(self, video_id: str, level: str, message: str, metadata: Optional[Dict[str, Any]] = None):
        """Erstellt Analyse-Log-Eintrag"""
        try:
            payload = {
                "level": level,
                "message": message,
                "metadata": json.dumps(metadata) if metadata else None
            }
            
            response = await self.client.post(
                f"{self.backend_url}/api/videos/{video_id}/logs",
                json=payload
            )
            
            if response.status_code == 201:
                logger.info(f"Analysis log created for video {video_id}")
            else:
                logger.warning(f"Failed to create analysis log: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error creating analysis log: {e}")
    
    async def get_saliency_analysis(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Holt Saliency-Analyse für ein Video"""
        try:
            response = await self.client.get(f"{self.backend_url}/api/videos/{video_id}/saliency")
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"No saliency analysis found for video {video_id}: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error fetching saliency analysis for video {video_id}: {e}")
            return None
    
    async def get_scene_saliency(self, scene_id: str) -> Optional[Dict[str, Any]]:
        """Holt Saliency-Analyse für eine Szene"""
        try:
            response = await self.client.get(f"{self.backend_url}/api/scenes/{scene_id}/saliency")
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"No saliency analysis found for scene {scene_id}: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error fetching saliency analysis for scene {scene_id}: {e}")
            return None
