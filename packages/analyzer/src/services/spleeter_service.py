import os
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class SpleeterService:
    """Service für Audio-Stem-Separierung mit Spleeter (macOS-optimiert)"""
    
    def __init__(self, output_base_dir: str = None):
        # Use STORAGE_PATH environment variable or default to /app/storage
        if output_base_dir is None:
            storage_path = os.getenv('STORAGE_PATH', '/app/storage')
            output_base_dir = f"{storage_path}/audio_stems"
        self.output_base_dir = Path(output_base_dir)
        self.output_base_dir.mkdir(parents=True, exist_ok=True)
        
    def separate_audio_for_timerange(
        self, 
        video_path: str, 
        start_time: float, 
        end_time: float, 
        video_id: str,
        scene_id: Optional[str] = None,
        stem_types: List[str] = None
    ) -> Dict[str, str]:
        """
        Separiert Audio für einen spezifischen Zeitbereich mit Spleeter
        
        Args:
            video_path: Pfad zur Video-Datei
            start_time: Startzeit in Sekunden
            end_time: Endzeit in Sekunden
            video_id: Video-ID
            scene_id: Optional Scene-ID
            stem_types: Liste der zu generierenden Stem-Typen
            
        Returns:
            Dictionary mit Stem-Typ als Key und Dateipfad als Value
        """
        if stem_types is None:
            stem_types = ['vocals', 'music', 'original']
            
        # Erstelle Output-Verzeichnis
        if scene_id:
            output_dir = self.output_base_dir / video_id / scene_id
        else:
            output_dir = self.output_base_dir / video_id
            
        output_dir.mkdir(parents=True, exist_ok=True)
        
        results = {}
        
        try:
            # Extrahiere Audio-Segment zuerst
            audio_segment_path = self._extract_audio_segment(
                video_path, start_time, end_time, output_dir
            )
            
            # Generiere verschiedene Stems
            for stem_type in stem_types:
                if stem_type == 'original':
                    # Original-Audio Segment
                    results[stem_type] = audio_segment_path
                else:
                    # Separierte Stems mit Spleeter
                    stem_path = self._separate_stem_with_spleeter(
                        audio_segment_path, stem_type, output_dir, video_id, scene_id
                    )
                    results[stem_type] = stem_path
                    
            logger.info(f"✅ Spleeter audio separation completed. Generated {len(results)} stems")
            return results
            
        except Exception as e:
            logger.error(f"❌ Spleeter audio separation failed: {e}")
            raise
            
    def _extract_audio_segment(
        self, 
        video_path: str, 
        start_time: float, 
        end_time: float, 
        output_dir: Path
    ) -> str:
        """Extrahiert Audio-Segment mit FFmpeg"""
        
        duration = end_time - start_time
        audio_segment_path = output_dir / f"segment_{start_time:.3f}_{end_time:.3f}.wav"
        
        cmd = [
            "ffmpeg", "-i", video_path,
            "-ss", str(start_time),
            "-t", str(duration),
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "44100", "-ac", "2",
            str(audio_segment_path), "-y"
        ]
        
        logger.info(f"🎵 Extracting audio segment: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            logger.info("✅ Audio segment extraction successful")
            return str(audio_segment_path)
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ FFmpeg error: {e.stderr}")
            raise
            
    def _separate_stem_with_spleeter(
        self, 
        audio_path: str, 
        stem_type: str, 
        output_dir: Path,
        video_id: str,
        scene_id: Optional[str]
    ) -> str:
        """Separiert spezifischen Stem mit Demucs (moderne Alternative zu Spleeter)"""
        
        # Output-Pfad für diesen Stem
        if scene_id:
            stem_filename = f"{video_id}_{scene_id}_{stem_type}.wav"
        else:
            stem_filename = f"{video_id}_full_{stem_type}.wav"
            
        stem_path = output_dir / stem_filename
        
        # Verwende Demucs für hochwertige Audio-Separierung
        cmd = [
            "python3", "-m", "demucs.separate",
            "-n", "htdemucs",  # Hybrid Transformer Demucs Modell
            "--two-stems", "vocals",  # Nur Vocals und Instrumentals trennen
            "-o", str(output_dir),
            audio_path
        ]
        
        logger.info(f"🎵 Separating {stem_type} stem with Demucs: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            
            # Demucs erstellt ein Unterverzeichnis mit dem Modellnamen
            audio_filename = Path(audio_path).stem
            demucs_output_dir = output_dir / "htdemucs" / audio_filename
            
            if demucs_output_dir.exists():
                # Demucs erstellt vocals.wav und no_vocals.wav
                if stem_type == 'vocals':
                    source_file = demucs_output_dir / "vocals.wav"
                elif stem_type == 'music':
                    source_file = demucs_output_dir / "no_vocals.wav"
                else:
                    # Für andere Stems, verwende vocals als Fallback
                    source_file = demucs_output_dir / "vocals.wav"
                
                if source_file.exists():
                    # Kopiere die Datei an den gewünschten Ort
                    import shutil
                    shutil.copy2(source_file, stem_path)
                    logger.info(f"✅ {stem_type} stem created: {stem_path}")
                    return str(stem_path)
                else:
                    logger.error(f"❌ Demucs output file not found: {source_file}")
                    raise FileNotFoundError(f"Demucs output file not found: {source_file}")
            else:
                logger.error(f"❌ Demucs output directory not found: {demucs_output_dir}")
                raise FileNotFoundError(f"Demucs output directory not found: {demucs_output_dir}")
                
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Demucs error: {e.stderr}")
            raise
        except Exception as e:
            logger.error(f"❌ Error processing Demucs output: {e}")
            raise
            
    def test_spleeter_installation(self) -> bool:
        """Testet ob Demucs korrekt installiert ist"""
        try:
            result = subprocess.run(
                ["python3", "-c", "import demucs; print('Demucs version:', demucs.__version__)"], 
                check=True, 
                capture_output=True, 
                text=True
            )
            logger.info("✅ Demucs installation test successful")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            logger.error(f"❌ Demucs installation test failed: {e}")
            return False