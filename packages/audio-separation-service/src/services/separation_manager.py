"""
Audio Separation Manager
Koordiniert zwischen Spleeter und Demucs Services
"""
import os
import asyncio
import sys
from pathlib import Path
from typing import Dict, Any, Optional
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from services.analyzer_integration_service import AnalyzerIntegrationService
from database.client import DatabaseClient
from utils.logger import logger, log_separation_step, log_error

class AudioSeparationManager:
    """Manager für Audio-Trennung Services"""
    
    def __init__(self):
        self.analyzer_service = AnalyzerIntegrationService()
        self.db_client = DatabaseClient()
        
    async def separate_audio(self, video_id: str, video_path: str, method: str = "spleeter") -> Dict[str, Any]:
        """Trennt Audio mit der gewählten Methode"""
        try:
            log_separation_step("Starting audio separation", video_id, method=method)
            
            # Video Status aktualisieren
            await self.db_client.update_video_status(video_id, "SEPARATING")
            await self.db_client.create_analysis_log(
                video_id, "INFO", f"Starting {method} audio separation"
            )
            
            # Output-Verzeichnis erstellen
            output_dir = f"/Volumes/DOCKER_EXTERN/prismvid/storage/audio_stems/{video_id}"
            os.makedirs(output_dir, exist_ok=True)
            
            # Audio trennen
            if method.lower() in ["spleeter", "analyzer", "analyzer-service"]:
                result = await self.analyzer_service.separate_audio(video_path, output_dir, video_id)
            elif method.lower() == "demucs":
                raise ValueError("Demucs is not available - only Analyzer service is supported")
            else:
                raise ValueError(f"Unknown separation method: {method}")
            
            if result["success"]:
                # Audio Stems in Datenbank speichern
                await self._save_stems_to_database(video_id, result["stems"], method)
                
                # Video Status aktualisieren
                await self.db_client.update_video_status(video_id, "COMPLETED")
                await self.db_client.create_analysis_log(
                    video_id, "INFO", f"{method} audio separation completed successfully"
                )
                
                logger.info("Audio separation completed", video_id=video_id, method=method)
                
            else:
                # Fehler behandeln
                await self.db_client.update_video_status(video_id, "FAILED")
                await self.db_client.create_analysis_log(
                    video_id, "ERROR", f"{method} audio separation failed: {result.get('error', 'Unknown error')}"
                )
                
                log_error(f"Audio separation failed: {result.get('error')}", video_id)
            
            return result
            
        except Exception as e:
            # Fehler behandeln
            await self.db_client.update_video_status(video_id, "FAILED")
            await self.db_client.create_analysis_log(
                video_id, "ERROR", f"Audio separation error: {str(e)}"
            )
            
            log_error(f"Audio separation manager error: {str(e)}", video_id)
            return {
                "success": False,
                "error": str(e),
                "method": method
            }
    
    async def _save_stems_to_database(self, video_id: str, stems: Dict[str, Any], method: str) -> None:
        """Speichert Audio Stems in der Datenbank"""
        try:
            for stem_name, stem_info in stems.items():
                audio_stem_data = {
                    "videoId": video_id,
                    "stemType": stem_name,
                    "filePath": stem_info["path"],
                    "fileSize": stem_info["size"],
                    "duration": stem_info["duration"],
                    "method": method
                }
                
                stem_id = await self.db_client.create_audio_stem(audio_stem_data)
                if stem_id:
                    log_separation_step(f"Saved {stem_name} stem to database", video_id, stem_id=stem_id)
                
        except Exception as e:
            log_error(f"Failed to save stems to database: {str(e)}", video_id)
    
    async def get_available_methods(self) -> Dict[str, Any]:
        """Gibt verfügbare Trennung-Methoden zurück"""
        return {
            "analyzer-service": {
                "name": "Analyzer Service",
                "description": "Uses existing Analyzer service for audio separation",
                "methods": self.analyzer_service.get_available_methods()
            }
        }
    
    async def close(self):
        """Schließt alle Services"""
        await self.analyzer_service.close()
        await self.db_client.close()
