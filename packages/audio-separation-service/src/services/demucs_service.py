"""
Demucs Audio Separation Service
Verwendet Demucs für Audio-Trennung (PyTorch-basiert)
"""
import os
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
import torch
import torchaudio
from demucs.api import separate_track
from demucs.pretrained import get_model
from ..utils.logger import logger, log_separation_step, log_error

class DemucsService:
    """Service für Demucs-basierte Audio-Trennung"""
    
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    async def load_model(self, model_name: str = "htdemucs") -> bool:
        """Lädt das Demucs Modell"""
        try:
            log_separation_step("Loading Demucs model", "", model_name=model_name, device=self.device)
            
            # Demucs Model laden
            self.model = get_model(model_name)
            self.model.to(self.device)
            self.model_loaded = True
            
            logger.info("Demucs model loaded successfully", model_name=model_name, device=self.device)
            return True
            
        except Exception as e:
            log_error(f"Failed to load Demucs model: {str(e)}")
            return False
    
    async def separate_audio(self, video_path: str, output_dir: str, video_id: str) -> Dict[str, Any]:
        """Trennt Audio mit Demucs"""
        try:
            if not self.model_loaded:
                await self.load_model()
            
            log_separation_step("Starting Demucs separation", video_id,
                              video_path=video_path, output_dir=output_dir)
            
            # Output-Verzeichnis erstellen
            os.makedirs(output_dir, exist_ok=True)
            
            # Audio trennen
            stems = separate_track(
                video_path,
                self.model,
                device=self.device,
                shifts=1,
                overlap=0.25,
                split=True
            )
            
            # Stems speichern
            saved_stems = {}
            for stem_name, stem_audio in stems.items():
                output_path = os.path.join(output_dir, f"{stem_name}.wav")
                
                # Audio als WAV speichern
                torchaudio.save(output_path, stem_audio, 44100)
                
                saved_stems[stem_name] = {
                    "path": output_path,
                    "size": os.path.getsize(output_path),
                    "duration": stem_audio.shape[1] / 44100
                }
                
                log_separation_step(f"Saved {stem_name} stem", video_id,
                                  output_path=output_path, size=saved_stems[stem_name]["size"])
            
            logger.info("Demucs separation completed", video_id=video_id, stems=list(saved_stems.keys()))
            
            return {
                "success": True,
                "stems": saved_stems,
                "model_type": "htdemucs",
                "device": self.device
            }
            
        except Exception as e:
            log_error(f"Demucs separation failed: {str(e)}", video_id)
            return {
                "success": False,
                "error": str(e),
                "model_type": "htdemucs"
            }
    
    def get_available_models(self) -> List[str]:
        """Gibt verfügbare Demucs Modelle zurück"""
        return [
            "htdemucs",
            "htdemucs_ft",
            "mdx_extra",
            "mdx_q"
        ]
