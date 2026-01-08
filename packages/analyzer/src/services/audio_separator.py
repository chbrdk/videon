import os
import subprocess
import logging
from typing import List, Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class AudioSeparatorService:
    """Service für Audio-Separierung mit Scene-spezifischen Timeranges"""
    
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
        Separiert Audio für einen spezifischen Zeitbereich
        
        Args:
            video_path: Pfad zum Video
            start_time: Start-Zeit in Sekunden
            end_time: End-Zeit in Sekunden
            video_id: Video ID
            scene_id: Optional Scene ID
            stem_types: Liste der zu generierenden Stem-Typen
            
        Returns:
            Dict mit Stem-Typ als Key und Dateipfad als Value
        """
        if stem_types is None:
            stem_types = ['vocals', 'music', 'original']
            
        logger.info(f"Starting audio separation for timerange {start_time}-{end_time}s")
        logger.info(f"Video: {video_path}, VideoID: {video_id}, SceneID: {scene_id}")
        
        # Erstelle Output-Verzeichnis für diese Scene
        if scene_id:
            output_dir = self.output_base_dir / video_id / scene_id
        else:
            output_dir = self.output_base_dir / video_id / "full"
            
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
                    # Separierte Stems mit Demucs
                    stem_path = self._separate_stem(
                        audio_segment_path, stem_type, output_dir, video_id, scene_id
                    )
                    results[stem_type] = stem_path
                    
            logger.info(f"Audio separation completed. Generated {len(results)} stems")
            return results
            
        except Exception as e:
            logger.error(f"Audio separation failed: {e}")
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
        
        logger.info(f"Extracting audio segment: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            logger.info("Audio segment extraction successful")
            return str(audio_segment_path)
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error: {e.stderr}")
            raise
            
    def _separate_stem(
        self, 
        audio_path: str, 
        stem_type: str, 
        output_dir: Path,
        video_id: str,
        scene_id: Optional[str]
    ) -> str:
        """Separiert spezifischen Stem mit Demucs"""
        
        # Output-Pfad für diesen Stem
        if scene_id:
            stem_filename = f"{video_id}_{scene_id}_{stem_type}.wav"
        else:
            stem_filename = f"{video_id}_full_{stem_type}.wav"
            
        stem_path = output_dir / stem_filename
        
        # Demucs Command
        cmd = [
            "python", "-m", "demucs.separate",
            "--out", str(output_dir),
            "--two-stems", stem_type,
            audio_path
        ]
        
        logger.info(f"Separating {stem_type} stem: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            
            # Demucs erstellt Unterverzeichnisse, finde die generierte Datei
            demucs_output_dir = output_dir / "separated" / Path(audio_path).stem
            if demucs_output_dir.exists():
                # Suche nach der generierten Stem-Datei
                for file in demucs_output_dir.glob(f"*{stem_type}.wav"):
                    # Kopiere zur finalen Position
                    subprocess.run([
                        "cp", str(file), str(stem_path)
                    ], check=True)
                    break
                else:
                    raise FileNotFoundError(f"No {stem_type} stem found in {demucs_output_dir}")
            else:
                raise FileNotFoundError(f"Demucs output directory not found: {demucs_output_dir}")
                
            logger.info(f"Stem separation successful: {stem_path}")
            return str(stem_path)
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Demucs error: {e.stderr}")
            raise
        except FileNotFoundError as e:
            logger.error(f"Stem file not found: {e}")
            raise
            
    def get_available_stems(self, video_id: str, scene_id: Optional[str] = None) -> Dict[str, str]:
        """Gibt verfügbare Stems für eine Scene zurück"""
        
        if scene_id:
            stem_dir = self.output_base_dir / video_id / scene_id
        else:
            stem_dir = self.output_base_dir / video_id / "full"
            
        if not stem_dir.exists():
            return {}
            
        stems = {}
        for stem_file in stem_dir.glob("*.wav"):
            stem_name = stem_file.stem.split('_')[-1]  # Letzter Teil nach _
            stems[stem_name] = str(stem_file)
            
        return stems
        
    def cleanup_stems(self, video_id: str, scene_id: Optional[str] = None):
        """Löscht Stems für eine Scene"""
        
        if scene_id:
            stem_dir = self.output_base_dir / video_id / scene_id
        else:
            stem_dir = self.output_base_dir / video_id / "full"
            
        if stem_dir.exists():
            import shutil
            shutil.rmtree(stem_dir)
            logger.info(f"Cleaned up stems for video {video_id}, scene {scene_id}")
