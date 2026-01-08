"""
Spleeter Audio Separation Service
Verwendet Spleeter für Audio-Trennung (TensorFlow-basiert)
"""
import os
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
import librosa
import soundfile as sf
import numpy as np
from spleeter.separator import Separator
from spleeter.audio.adapter import AudioAdapter
from ..utils.logger import logger, log_separation_step, log_error

class SpleeterService:
    """Service für Spleeter-basierte Audio-Trennung"""
    
    def __init__(self):
        self.separator = None
        self.audio_adapter = AudioAdapter.default()
        self.model_loaded = False
        
    async def load_model(self, model_type: str = "spleeter:2stems-16kHz") -> bool:
        """Lädt das Spleeter Modell"""
        try:
            log_separation_step("Loading Spleeter model", "", model_type=model_type)
            
            # Spleeter Model laden
            self.separator = Separator(model_type)
            self.model_loaded = True
            
            logger.info("Spleeter model loaded successfully", model_type=model_type)
            return True
            
        except Exception as e:
            log_error(f"Failed to load Spleeter model: {str(e)}")
            return False
    
    async def separate_audio(self, video_path: str, output_dir: str, video_id: str) -> Dict[str, Any]:
        """Trennt Audio mit Spleeter"""
        try:
            if not self.model_loaded:
                await self.load_model()
            
            log_separation_step("Starting Spleeter separation", video_id, 
                              video_path=video_path, output_dir=output_dir)
            
            # Audio-Datei laden
            waveform, sample_rate = self.audio_adapter.load(video_path)
            
            # Audio trennen
            prediction = self.separator.separate(waveform)
            
            # Output-Verzeichnis erstellen
            os.makedirs(output_dir, exist_ok=True)
            
            # Stems speichern
            stems = {}
            for stem_name, stem_audio in prediction.items():
                output_path = os.path.join(output_dir, f"{stem_name}.wav")
                
                # Audio normalisieren und speichern
                stem_audio_normalized = np.clip(stem_audio, -1.0, 1.0)
                sf.write(output_path, stem_audio_normalized, sample_rate)
                
                stems[stem_name] = {
                    "path": output_path,
                    "size": os.path.getsize(output_path),
                    "duration": len(stem_audio) / sample_rate
                }
                
                log_separation_step(f"Saved {stem_name} stem", video_id, 
                                  output_path=output_path, size=stems[stem_name]["size"])
            
            logger.info("Spleeter separation completed", video_id=video_id, stems=list(stems.keys()))
            
            return {
                "success": True,
                "stems": stems,
                "model_type": "spleeter:2stems-16kHz",
                "sample_rate": sample_rate
            }
            
        except Exception as e:
            log_error(f"Spleeter separation failed: {str(e)}", video_id)
            return {
                "success": False,
                "error": str(e),
                "model_type": "spleeter:2stems-16kHz"
            }
    
    def get_available_models(self) -> List[str]:
        """Gibt verfügbare Spleeter Modelle zurück"""
        return [
            "spleeter:2stems-16kHz",
            "spleeter:4stems-16kHz", 
            "spleeter:5stems-16kHz"
        ]
