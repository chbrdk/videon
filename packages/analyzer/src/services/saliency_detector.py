"""
Saliency Detector Service für Video-Analyse
Frame-by-Frame Saliency Detection mit SAM 2.1
"""
import os
import cv2
import json
import time
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import numpy as np
from tqdm import tqdm
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import psutil

# Absolute imports für lokale Tests
try:
    from ..models.sam_wrapper import SAMSaliencyModel
    from ..utils.logger import logger, log_analysis_step, log_performance, log_error
except ImportError:
    # Fallback für lokale Tests
    from models.sam_wrapper import SAMSaliencyModel
    import logging
    logger = logging.getLogger(__name__)
    def log_analysis_step(*args, **kwargs):
        pass
    def log_performance(*args, **kwargs):
        pass
    def log_error(*args, **kwargs):
        pass

class SaliencyDetector:
    """Video Saliency Detection Service"""
    
    def __init__(self, model_type: str = "vit_b", use_coreml: bool = True):
        """
        Initialisiert Saliency Detector
        
        Args:
            model_type: SAM Modell-Typ
            use_coreml: Ob Core ML verwendet werden soll
        """
        self.model_type = model_type
        self.use_coreml = use_coreml
        self.sam_model = SAMSaliencyModel(model_type=model_type, use_coreml=use_coreml)
        
        # Storage-Verzeichnisse erstellen
        self.storage_dir = Path("/Volumes/DOCKER_EXTERN/prismvid/storage/saliency")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"SaliencyDetector initialized with {model_type}")
    
    def analyze_video(self, video_path: str, 
                     video_id: str,
                     sample_rate: int = 1,
                     aspect_ratio: Tuple[int, int] = (9, 16),
                     max_frames: Optional[int] = None) -> Dict[str, Any]:
        """
        Analysiert Video Frame-by-Frame für Saliency Detection
        
        Args:
            video_path: Pfad zum Video
            video_id: Eindeutige Video-ID
            sample_rate: Jedes N-te Frame analysieren (Performance-Optimierung)
            aspect_ratio: Ziel-Seitenverhältnis für ROI-Vorschläge
            max_frames: Maximale Anzahl Frames (für Testing)
            
        Returns:
            Dictionary mit Frame-Daten und Metadaten
        """
        start_time = time.time()
        
        try:
            log_analysis_step(video_id, "saliency_analysis_start", {
                "video_path": video_path,
                "sample_rate": sample_rate,
                "aspect_ratio": aspect_ratio
            })
            
            # Video-Informationen extrahieren
            video_info = self._get_video_info(video_path)
            if not video_info:
                raise ValueError(f"Could not read video: {video_path}")
            
            logger.info(f"Analyzing video: {video_info['frame_count']} frames, "
                       f"{video_info['fps']:.1f} FPS, {video_info['duration']:.1f}s")
            
            # Frames extrahieren und analysieren (sicherer Modus nach Crash)
            try:
                # Versuche zuerst den sicheren Batch-Modus
                frames_data = self._analyze_frames(
                    video_path, video_info, sample_rate, aspect_ratio, max_frames
                )
                logger.info("✅ Sichere Batch-Verarbeitung erfolgreich")
            except Exception as e:
                logger.warning(f"Batch-Verarbeitung fehlgeschlagen: {e}")
                logger.info("🔄 Fallback zu sequenzieller Verarbeitung...")
                # Fallback zu einfacher sequenzieller Verarbeitung
                frames_data = self._analyze_frames_simple(
                    video_path, video_info, sample_rate, aspect_ratio, max_frames
                )
            
            # Metadaten zusammenstellen
            processing_time = time.time() - start_time
            metadata = {
                "video_info": video_info,
                "analysis_params": {
                    "sample_rate": sample_rate,
                    "aspect_ratio": aspect_ratio,
                    "model_type": self.model_type,
                    "use_coreml": self.use_coreml
                },
                "processing_stats": {
                    "total_frames_analyzed": len(frames_data),
                    "processing_time": processing_time,
                    "fps_processed": len(frames_data) / processing_time if processing_time > 0 else 0
                }
            }
            
            result = {
                "video_id": video_id,
                "frames": frames_data,
                "metadata": metadata
            }
            
            # Ergebnisse speichern
            self._save_analysis_results(video_id, result)
            
            log_analysis_step(video_id, "saliency_analysis_complete", {
                "frames_analyzed": len(frames_data),
                "processing_time": processing_time,
                "fps_processed": len(frames_data) / processing_time if processing_time > 0 else 0
            })
            
            log_performance(video_id, "video_analysis", processing_time, {
                "frame_count": len(frames_data),
                "sample_rate": sample_rate
            })
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            log_error(video_id, f"Video analysis failed: {str(e)}", {
                "processing_time": processing_time,
                "video_path": video_path
            })
            raise
    
    def analyze_scene(self, video_path: str, 
                     video_id: str,
                     scene_id: str,
                     start_time: float, 
                     end_time: float,
                     aspect_ratio: Tuple[int, int] = (9, 16)) -> Dict[str, Any]:
        """
        Analysiert einzelne Scene für Saliency Detection
        
        Args:
            video_path: Pfad zum Video
            video_id: Video-ID
            scene_id: Scene-ID
            start_time: Start-Zeit der Scene (Sekunden)
            end_time: End-Zeit der Scene (Sekunden)
            aspect_ratio: Ziel-Seitenverhältnis
            
        Returns:
            Dictionary mit Scene-Saliency-Daten
        """
        start_analysis_time = time.time()
        
        try:
            log_analysis_step(video_id, "scene_saliency_analysis_start", {
                "scene_id": scene_id,
                "start_time": start_time,
                "end_time": end_time
            })
            
            # Video öffnen
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video: {video_path}")
            
            # Video-Informationen
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Frame-Bereiche berechnen
            start_frame = int(start_time * fps)
            end_frame = int(end_time * fps)
            
            # Zu Start-Frame springen
            cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
            
            frames_data = []
            frame_number = start_frame
            
            logger.info(f"Analyzing scene {scene_id}: frames {start_frame}-{end_frame}")
            
            # Frames der Scene analysieren
            with tqdm(total=end_frame-start_frame, desc=f"Scene {scene_id}") as pbar:
                while frame_number < end_frame:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # Frame analysieren
                    frame_data = self._analyze_single_frame(
                        frame, frame_number, fps, aspect_ratio
                    )
                    frames_data.append(frame_data)
                    
                    frame_number += 1
                    pbar.update(1)
            
            cap.release()
            
            # Metadaten
            processing_time = time.time() - start_analysis_time
            metadata = {
                "scene_info": {
                    "scene_id": scene_id,
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration": end_time - start_time,
                    "frame_range": (start_frame, end_frame),
                    "fps": fps,
                    "resolution": (frame_width, frame_height)
                },
                "analysis_params": {
                    "aspect_ratio": aspect_ratio,
                    "model_type": self.model_type,
                    "use_coreml": self.use_coreml
                },
                "processing_stats": {
                    "frames_analyzed": len(frames_data),
                    "processing_time": processing_time,
                    "fps_processed": len(frames_data) / processing_time if processing_time > 0 else 0
                }
            }
            
            result = {
                "video_id": video_id,
                "scene_id": scene_id,
                "frames": frames_data,
                "metadata": metadata
            }
            
            # Scene-spezifische Ergebnisse speichern
            self._save_scene_results(video_id, scene_id, result)
            
            log_analysis_step(video_id, "scene_saliency_analysis_complete", {
                "scene_id": scene_id,
                "frames_analyzed": len(frames_data),
                "processing_time": processing_time
            })
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_analysis_time
            log_error(video_id, f"Scene analysis failed: {str(e)}", {
                "scene_id": scene_id,
                "processing_time": processing_time
            })
            raise
    
    def _get_video_info(self, video_path: str) -> Optional[Dict[str, Any]]:
        """Extrahiert Video-Informationen"""
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return None
            
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            duration = frame_count / fps if fps > 0 else 0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            cap.release()
            
            return {
                "frame_count": frame_count,
                "fps": fps,
                "duration": duration,
                "width": width,
                "height": height,
                "resolution": f"{width}x{height}"
            }
            
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            return None
    
    def _analyze_frames(self, video_path: str, video_info: Dict[str, Any], 
                       sample_rate: int, aspect_ratio: Tuple[int, int],
                       max_frames: Optional[int]) -> List[Dict[str, Any]]:
        """Analysiert Frames des Videos mit Batch Processing für M4 Optimierung"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        frames_data = []
        frame_number = 0
        frames_analyzed = 0
        
        total_frames = video_info["frame_count"]
        frames_to_analyze = total_frames // sample_rate
        
        logger.info(f"🚀 Starting optimized frame analysis: {frames_to_analyze} frames, sample rate {sample_rate}")
        
        # Sammle alle zu analysierenden Frames
        frames_to_process = []
        frame_numbers_to_process = []
        
        with tqdm(total=total_frames, desc="Collecting frames") as pbar:
            while frame_number < total_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Nur jedes N-te Frame sammeln
                if frame_number % sample_rate == 0:
                    frames_to_process.append(frame)
                    frame_numbers_to_process.append(frame_number)
                    
                    if max_frames is not None and len(frames_to_process) >= max_frames:
                        break
                
                frame_number += 1
                pbar.update(1)
        
        cap.release()
        
        # Sicherere Batch Processing für M4
        logger.info(f"🛡️  Sichere Batch-Verarbeitung: {len(frames_to_process)} frames")
        
        batch_size = 2  # Sicherere Batch-Größe nach Crash
        for i in tqdm(range(0, len(frames_to_process), batch_size), desc="Analyzing batches"):
            batch_frames = frames_to_process[i:i + batch_size]
            batch_frame_numbers = frame_numbers_to_process[i:i + batch_size]
            
            # Batch verarbeiten
            for frame, frame_num in zip(batch_frames, batch_frame_numbers):
                frame_data = self._analyze_single_frame(
                    frame, frame_num, video_info["fps"], aspect_ratio
                )
                frames_data.append(frame_data)
                frames_analyzed += 1
        
        logger.info(f"🛡️  Sichere Batch-Analyse abgeschlossen: {frames_analyzed} frames analyzed")
        return frames_data
    
    def _analyze_frames_parallel(self, video_path: str, video_info: Dict[str, Any], 
                                sample_rate: int, aspect_ratio: Tuple[int, int],
                                max_frames: Optional[int]) -> List[Dict[str, Any]]:
        """Analysiert Frames mit Multiprocessing für maximale M4 Performance"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        frames_data = []
        frame_number = 0
        
        total_frames = video_info["frame_count"]
        frames_to_analyze = total_frames // sample_rate
        
        logger.info(f"🚀 Starting parallel frame analysis: {frames_to_analyze} frames, sample rate {sample_rate}")
        
        # Sammle alle zu analysierenden Frames
        frames_to_process = []
        frame_numbers_to_process = []
        
        with tqdm(total=total_frames, desc="Collecting frames") as pbar:
            while frame_number < total_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_number % sample_rate == 0:
                    frames_to_process.append(frame)
                    frame_numbers_to_process.append(frame_number)
                    
                    if max_frames is not None and len(frames_to_process) >= max_frames:
                        break
                
                frame_number += 1
                pbar.update(1)
        
        cap.release()
        
        # Sichereres Multiprocessing für M4
        num_cores = min(psutil.cpu_count(), 4)  # Max 4 Kerne für Stabilität
        logger.info(f"🛡️  Verwende {num_cores} CPU Kerne (sicherer Modus)")
        
        # Teile Frames in Chunks für parallele Verarbeitung
        chunk_size = max(1, len(frames_to_process) // num_cores)
        chunks = []
        
        for i in range(0, len(frames_to_process), chunk_size):
            chunk_frames = frames_to_process[i:i + chunk_size]
            chunk_numbers = frame_numbers_to_process[i:i + chunk_size]
            chunks.append((chunk_frames, chunk_numbers, video_info["fps"], aspect_ratio))
        
        # Parallele Verarbeitung
        with ProcessPoolExecutor(max_workers=num_cores) as executor:
            results = list(tqdm(
                executor.map(self._process_frame_chunk, chunks),
                total=len(chunks),
                desc="Processing chunks in parallel"
            ))
        
        # Ergebnisse zusammenführen
        for chunk_result in results:
            frames_data.extend(chunk_result)
        
        logger.info(f"🚀 Parallel frame analysis complete: {len(frames_data)} frames analyzed")
        return frames_data
    
    @staticmethod
    def _process_frame_chunk(chunk_data):
        """Verarbeitet einen Chunk von Frames (für Multiprocessing)"""
        chunk_frames, chunk_numbers, fps, aspect_ratio = chunk_data
        
        # Lokale SAM Model Instanz für diesen Prozess
        try:
            from models.sam_wrapper import SAMSaliencyModel
        except ImportError:
            from ..models.sam_wrapper import SAMSaliencyModel
        
        sam_model = SAMSaliencyModel(model_type="vit_l", use_coreml=True)
        
        chunk_results = []
        for frame, frame_num in zip(chunk_frames, chunk_numbers):
            try:
                # Temporäre Datei für Frame erstellen
                temp_path = f"/tmp/frame_{frame_num:05d}.jpg"
                cv2.imwrite(temp_path, frame)
                
                # Frame mit SAM analysieren
                analysis_result = sam_model.analyze_frame(temp_path, aspect_ratio)
                
                # Temporäre Datei löschen
                os.unlink(temp_path)
                
                # Frame-Daten zusammenstellen
                frame_data = {
                    "frame_number": frame_num,
                    "timestamp": frame_num / fps,
                    "saliency_data": analysis_result.get("saliency_map", []),
                    "saliency_stats": analysis_result.get("saliency_stats", {}),
                    "roi_suggestions": analysis_result.get("roi_suggestions", []),
                    "processing_time": analysis_result.get("processing_time", 0),
                    "model_version": analysis_result.get("model_version", "vit_l")
                }
                
                chunk_results.append(frame_data)
                
            except Exception as e:
                logger.error(f"Error analyzing frame {frame_num}: {e}")
                chunk_results.append({
                    "frame_number": frame_num,
                    "timestamp": frame_num / fps,
                    "error": str(e),
                    "saliency_data": [],
                    "roi_suggestions": []
                })
        
        return chunk_results
    
    def _analyze_frames_simple(self, video_path: str, video_info: Dict[str, Any], 
                              sample_rate: int, aspect_ratio: Tuple[int, int],
                              max_frames: Optional[int]) -> List[Dict[str, Any]]:
        """Einfache sequenzielle Frame-Analyse (Crash-sicher)"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        frames_data = []
        frame_number = 0
        frames_analyzed = 0
        
        total_frames = video_info["frame_count"]
        frames_to_analyze = total_frames // sample_rate
        
        logger.info(f"🛡️  Sichere sequenzielle Analyse: {frames_to_analyze} frames, sample rate {sample_rate}")
        
        with tqdm(total=total_frames, desc="Sequential analysis") as pbar:
            while frame_number < total_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Nur jedes N-te Frame analysieren
                if frame_number % sample_rate == 0:
                    frame_data = self._analyze_single_frame(
                        frame, frame_number, video_info["fps"], aspect_ratio
                    )
                    frames_data.append(frame_data)
                    frames_analyzed += 1
                    
                    # Memory-Cleanup nach jedem Frame
                    if frames_analyzed % 10 == 0:
                        import gc
                        gc.collect()
                        logger.debug(f"Memory cleanup nach {frames_analyzed} Frames")
                
                frame_number += 1
                pbar.update(1)
                
                # Optional: Early stopping für Testing
                if max_frames and frames_analyzed >= max_frames:
                    break
        
        cap.release()
        
        logger.info(f"🛡️  Sichere Analyse abgeschlossen: {frames_analyzed} frames analyzed")
        return frames_data
    
    def _analyze_single_frame(self, frame: np.ndarray, frame_number: int, 
                            fps: float, aspect_ratio: Tuple[int, int]) -> Dict[str, Any]:
        """Analysiert ein einzelnes Frame"""
        try:
            # Temporäre Datei für Frame erstellen
            temp_path = self._save_temp_frame(frame, frame_number)
            
            # Frame mit SAM analysieren
            analysis_result = self.sam_model.analyze_frame(temp_path, aspect_ratio)
            
            # Temporäre Datei löschen
            os.unlink(temp_path)
            
            # Frame-Daten zusammenstellen
            frame_data = {
                "frame_number": frame_number,
                "timestamp": frame_number / fps,
                "saliency_data": analysis_result.get("saliency_map", []),
                "saliency_stats": analysis_result.get("saliency_stats", {}),
                "roi_suggestions": analysis_result.get("roi_suggestions", []),
                "processing_time": analysis_result.get("processing_time", 0),
                "model_version": analysis_result.get("model_version", self.model_type)
            }
            
            return frame_data
            
        except Exception as e:
            logger.error(f"Error analyzing frame {frame_number}: {e}")
            return {
                "frame_number": frame_number,
                "timestamp": frame_number / fps,
                "error": str(e),
                "saliency_data": [],
                "roi_suggestions": []
            }
    
    def _save_temp_frame(self, frame: np.ndarray, frame_number: int) -> str:
        """Speichert Frame temporär für SAM-Analyse"""
        temp_dir = Path("/tmp/saliency_frames")
        temp_dir.mkdir(exist_ok=True)
        
        temp_path = temp_dir / f"frame_{frame_number:06d}.jpg"
        cv2.imwrite(str(temp_path), frame)
        
        return str(temp_path)
    
    def _save_analysis_results(self, video_id: str, results: Dict[str, Any]):
        """Speichert Analyse-Ergebnisse (optimiert für Größe)"""
        try:
            video_dir = self.storage_dir / video_id
            video_dir.mkdir(exist_ok=True)
            
            # Optimierte Datenstruktur ohne vollständige Saliency Maps
            optimized_data = {
                "video_id": results["video_id"],
                "metadata": results["metadata"],
                "frames": []
            }
            
            # Nur ROI-Daten und Statistiken speichern (ohne vollständige Maps)
            for frame in results["frames"]:
                optimized_frame = {
                    "frame_number": frame["frame_number"],
                    "timestamp": frame["timestamp"],
                    "saliency_stats": frame.get("saliency_stats", {}),
                    "roi_suggestions": frame.get("roi_suggestions", []),
                    "processing_time": frame.get("processing_time", 0),
                    "model_version": frame.get("model_version", "vit_b")
                }
                optimized_data["frames"].append(optimized_frame)
            
            # Kompakte JSON speichern (ohne Indentation)
            data_path = video_dir / "saliency_data.json"
            with open(data_path, 'w') as f:
                json.dump(optimized_data, f, separators=(',', ':'))
            
            # ROI-Vorschläge extrahieren und speichern
            roi_suggestions = []
            for frame in results["frames"]:
                if "roi_suggestions" in frame:
                    roi_suggestions.extend(frame["roi_suggestions"])
            
            roi_path = video_dir / "roi_suggestions.json"
            with open(roi_path, 'w') as f:
                json.dump(roi_suggestions, f, separators=(',', ':'))
            
            # Saliency Maps als separate komprimierte Dateien speichern
            self._save_saliency_maps_compressed(video_id, results["frames"])
            
            logger.info(f"Optimized analysis results saved for video {video_id}")
            
        except Exception as e:
            logger.error(f"Error saving analysis results: {e}")
    
    def _save_saliency_maps_compressed(self, video_id: str, frames_data: List[Dict[str, Any]]):
        """Speichert Saliency Maps als komprimierte Binärdateien"""
        try:
            import numpy as np
            import gzip
            import base64
            
            video_dir = self.storage_dir / video_id
            maps_dir = video_dir / "saliency_maps"
            maps_dir.mkdir(exist_ok=True)
            
            for frame in frames_data:
                if "saliency_data" in frame and len(frame["saliency_data"]) > 0:
                    frame_num = frame["frame_number"]
                    
                    # Saliency Map als numpy Array
                    saliency_map = np.array(frame["saliency_data"], dtype=np.uint8)
                    
                    # Komprimiert speichern
                    map_path = maps_dir / f"frame_{frame_num:05d}.npz"
                    np.savez_compressed(map_path, saliency_map=saliency_map)
            
            logger.info(f"Compressed saliency maps saved for video {video_id}")
            
        except Exception as e:
            logger.error(f"Error saving compressed saliency maps: {e}")
    
    def _save_scene_results(self, video_id: str, scene_id: str, results: Dict[str, Any]):
        """Speichert Scene-spezifische Ergebnisse"""
        try:
            video_dir = self.storage_dir / video_id
            video_dir.mkdir(exist_ok=True)
            
            scene_dir = video_dir / f"scene_{scene_id}"
            scene_dir.mkdir(exist_ok=True)
            
            # Scene-Daten speichern
            data_path = scene_dir / "saliency_data.json"
            with open(data_path, 'w') as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"Scene results saved for video {video_id}, scene {scene_id}")
            
        except Exception as e:
            logger.error(f"Error saving scene results: {e}")
    
    def get_analysis_results(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Lädt gespeicherte Analyse-Ergebnisse"""
        try:
            video_dir = self.storage_dir / video_id
            data_path = video_dir / "saliency_data.json"
            
            if data_path.exists():
                with open(data_path, 'r') as f:
                    return json.load(f)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error loading analysis results: {e}")
            return None
    
    def get_scene_results(self, video_id: str, scene_id: str) -> Optional[Dict[str, Any]]:
        """Lädt Scene-spezifische Ergebnisse"""
        try:
            video_dir = self.storage_dir / video_id
            scene_dir = video_dir / f"scene_{scene_id}"
            data_path = scene_dir / "saliency_data.json"
            
            if data_path.exists():
                with open(data_path, 'r') as f:
                    return json.load(f)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error loading scene results: {e}")
            return None
