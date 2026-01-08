"""
Database Client für Audio Separation Service
Kommuniziert mit dem Backend für Datenbankoperationen
"""
import os
import sys
import httpx
from typing import Dict, Any, Optional
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.logger import logger

class DatabaseClient:
    """Client für Backend-Datenbank-Kommunikation"""
    
    def __init__(self, backend_url: str = None):
        # Standard URL für Backend Service
        self.backend_url = backend_url or 'http://localhost:4001'
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def create_audio_stem(self, audio_stem_data: Dict[str, Any]) -> Optional[str]:
        """Erstellt einen Audio Stem Eintrag in der Datenbank"""
        try:
            response = await self.client.post(
                f"{self.backend_url}/api/audio-stems/audio-stems",
                json=audio_stem_data
            )
            
            if response.status_code == 201:
                result = response.json()
                logger.info("Audio stem created in database", stem_id=result.get('id'))
                return result.get('id')
            else:
                logger.error("Failed to create audio stem", status_code=response.status_code)
                return None
                
        except Exception as e:
            logger.error("Database client error", error=str(e))
            return None
    
    async def update_video_status(self, video_id: str, status: str) -> bool:
        """Aktualisiert den Status eines Videos"""
        try:
            response = await self.client.patch(
                f"{self.backend_url}/api/videos/{video_id}/status",
                json={"status": status}
            )
            
            if response.status_code == 200:
                logger.info("Video status updated", video_id=video_id, status=status)
                return True
            else:
                logger.error("Failed to update video status", status_code=response.status_code)
                return False
                
        except Exception as e:
            logger.error("Failed to update video status", error=str(e))
            return False
    
    async def create_analysis_log(self, video_id: str, level: str, message: str, metadata: Dict[str, Any] = None) -> bool:
        """Erstellt einen Analysis Log Eintrag"""
        try:
            log_data = {
                "videoId": video_id,
                "level": level,
                "message": message,
                "metadata": metadata or {}
            }
            
            response = await self.client.post(
                f"{self.backend_url}/api/videos/{video_id}/logs",
                json=log_data
            )
            
            if response.status_code == 201:
                logger.info("Analysis log created", video_id=video_id, level=level)
                return True
            else:
                logger.error("Failed to create analysis log", status_code=response.status_code)
                return False
                
        except Exception as e:
            logger.error("Failed to create analysis log", error=str(e))
            return False
    
    async def close(self):
        """Schließt den HTTP Client"""
        await self.client.aclose()
