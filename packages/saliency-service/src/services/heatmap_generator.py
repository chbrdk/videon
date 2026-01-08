"""
Heatmap Generator für Debug-Visualisierung
Erstellt Heatmap-Videos und Vergleichsvideos für Saliency Detection
"""
import os
import cv2
import numpy as np
import json
import time
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import tempfile
from tqdm import tqdm

# Absolute imports für lokale Tests
try:
    from ..utils.logger import logger, log_performance
except ImportError:
    # Fallback für lokale Tests
    import logging
    logger = logging.getLogger(__name__)
    def log_performance(*args, **kwargs):
        pass

class HeatmapGenerator:
    """Generiert Heatmap-Videos für Debugging und Visualisierung"""
    
    def __init__(self):
        """Initialisiert Heatmap Generator"""
        self.storage_dir = Path("/Volumes/DOCKER_EXTERN/prismvid/storage/saliency")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # Verfügbare Colormaps
        self.colormaps = {
            "jet": cv2.COLORMAP_JET,
            "hot": cv2.COLORMAP_HOT,
            "cool": cv2.COLORMAP_COOL,
            "viridis": cv2.COLORMAP_VIRIDIS,
            "plasma": cv2.COLORMAP_PLASMA,
            "inferno": cv2.COLORMAP_INFERNO,
            "magma": cv2.COLORMAP_MAGMA,
            "turbo": cv2.COLORMAP_TURBO
        }
        
        logger.info("HeatmapGenerator initialized")
    
    def create_heatmap_video(self, 
                            video_path: str,
                            saliency_data: Dict[str, Any],
                            output_path: str,
                            colormap: str = "jet",
                            opacity: float = 0.5,
                            show_roi: bool = True,
                            show_info: bool = True) -> str:
        """
        Erstellt Heatmap-Overlay Video
        
        Args:
            video_path: Pfad zum Original-Video
            saliency_data: Saliency-Analyse-Daten
            output_path: Ausgabe-Pfad für Heatmap-Video
            colormap: Colormap für Heatmap ("jet", "hot", "viridis", etc.)
            opacity: Transparenz der Heatmap (0.0-1.0)
            show_roi: Ob ROI-Boxen angezeigt werden sollen
            show_info: Ob Frame-Info angezeigt werden soll
            
        Returns:
            Pfad zum erstellten Heatmap-Video
        """
        start_time = time.time()
        
        try:
            logger.info(f"Creating heatmap video: {output_path}")
            
            # Video öffnen
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video: {video_path}")
            
            # Video-Eigenschaften
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Video Writer erstellen
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            # Colormap
            cmap = self.colormaps.get(colormap, cv2.COLORMAP_JET)
            
            # Frame-Daten indexieren für schnellen Zugriff
            frames_data = {frame["frame_number"]: frame for frame in saliency_data["frames"]}
            
            logger.info(f"Processing {total_frames} frames for heatmap video")
            
            frame_number = 0
            with tqdm(total=total_frames, desc="Creating heatmap video") as pbar:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # Heatmap für dieses Frame erstellen
                    heatmap_frame = self._create_heatmap_frame(
                        frame, frame_number, frames_data, cmap, opacity, show_roi, show_info
                    )
                    
                    out.write(heatmap_frame)
                    frame_number += 1
                    pbar.update(1)
            
            cap.release()
            out.release()
            
            processing_time = time.time() - start_time
            
            logger.info(f"Heatmap video created: {output_path}")
            log_performance("heatmap_generation", "create_heatmap_video", processing_time, {
                "total_frames": total_frames,
                "colormap": colormap,
                "opacity": opacity
            })
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating heatmap video: {e}")
            raise
    
    def create_comparison_video(self, 
                               original_path: str,
                               saliency_data: Dict[str, Any],
                               output_path: str,
                               colormap: str = "jet") -> str:
        """
        Erstellt Side-by-Side Vergleichsvideo: Original | Heatmap | Reframed
        
        Args:
            original_path: Pfad zum Original-Video
            saliency_data: Saliency-Analyse-Daten
            output_path: Ausgabe-Pfad für Vergleichsvideo
            colormap: Colormap für Heatmap
            
        Returns:
            Pfad zum erstellten Vergleichsvideo
        """
        start_time = time.time()
        
        try:
            logger.info(f"Creating comparison video: {output_path}")
            
            # Video öffnen
            cap = cv2.VideoCapture(original_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video: {original_path}")
            
            # Video-Eigenschaften
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Neue Dimensionen für Side-by-Side (3 Spalten)
            new_width = width * 3
            new_height = height
            
            # Video Writer erstellen
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (new_width, new_height))
            
            # Colormap
            cmap = self.colormaps.get(colormap, cv2.COLORMAP_JET)
            
            # Frame-Daten indexieren
            frames_data = {frame["frame_number"]: frame for frame in saliency_data["frames"]}
            
            logger.info(f"Processing {total_frames} frames for comparison video")
            
            frame_number = 0
            with tqdm(total=total_frames, desc="Creating comparison video") as pbar:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # Vergleichs-Frame erstellen
                    comparison_frame = self._create_comparison_frame(
                        frame, frame_number, frames_data, cmap, width, height
                    )
                    
                    out.write(comparison_frame)
                    frame_number += 1
                    pbar.update(1)
            
            cap.release()
            out.release()
            
            processing_time = time.time() - start_time
            
            logger.info(f"Comparison video created: {output_path}")
            log_performance("comparison_generation", "create_comparison_video", processing_time, {
                "total_frames": total_frames,
                "colormap": colormap
            })
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating comparison video: {e}")
            raise
    
    def create_roi_preview_video(self,
                                video_path: str,
                                saliency_data: Dict[str, Any],
                                output_path: str,
                                roi_index: int = 0,
                                aspect_ratio: Tuple[int, int] = (9, 16)) -> str:
        """
        Erstellt Video mit ROI-Crop-Vorschau
        
        Args:
            video_path: Pfad zum Original-Video
            saliency_data: Saliency-Analyse-Daten
            output_path: Ausgabe-Pfad für ROI-Preview-Video
            roi_index: Index des ROI-Vorschlags (0 = bester)
            aspect_ratio: Ziel-Seitenverhältnis
            
        Returns:
            Pfad zum erstellten ROI-Preview-Video
        """
        start_time = time.time()
        
        try:
            logger.info(f"Creating ROI preview video: {output_path}")
            
            # Video öffnen
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video: {video_path}")
            
            # Video-Eigenschaften
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # ROI-Dimensionen berechnen
            roi_width = min(width, int(width * 0.8))
            roi_height = int(roi_width * aspect_ratio[1] / aspect_ratio[0])
            
            if roi_height > height:
                roi_height = min(height, int(height * 0.8))
                roi_width = int(roi_height * aspect_ratio[0] / aspect_ratio[1])
            
            # Video Writer erstellen
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (roi_width, roi_height))
            
            # Frame-Daten indexieren
            frames_data = {frame["frame_number"]: frame for frame in saliency_data["frames"]}
            
            logger.info(f"Processing {total_frames} frames for ROI preview video")
            
            frame_number = 0
            current_roi = None
            
            with tqdm(total=total_frames, desc="Creating ROI preview video") as pbar:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # ROI für dieses Frame bestimmen
                    if frame_number in frames_data:
                        frame_data = frames_data[frame_number]
                        if frame_data.get("roi_suggestions") and len(frame_data["roi_suggestions"]) > roi_index:
                            current_roi = frame_data["roi_suggestions"][roi_index]
                    
                    # ROI-Crop erstellen
                    if current_roi:
                        roi_frame = self._create_roi_crop(frame, current_roi, roi_width, roi_height)
                    else:
                        # Fallback: Zentrale Crop
                        roi_frame = self._create_center_crop(frame, roi_width, roi_height)
                    
                    out.write(roi_frame)
                    frame_number += 1
                    pbar.update(1)
            
            cap.release()
            out.release()
            
            processing_time = time.time() - start_time
            
            logger.info(f"ROI preview video created: {output_path}")
            log_performance("roi_preview_generation", "create_roi_preview_video", processing_time, {
                "total_frames": total_frames,
                "roi_index": roi_index,
                "aspect_ratio": aspect_ratio
            })
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating ROI preview video: {e}")
            raise
    
    def _create_heatmap_frame(self, frame: np.ndarray, frame_number: int, 
                            frames_data: Dict[int, Dict], cmap: int, opacity: float,
                            show_roi: bool, show_info: bool) -> np.ndarray:
        """Erstellt Heatmap-Frame mit Overlay"""
        height, width = frame.shape[:2]
        
        # Original-Frame kopieren
        heatmap_frame = frame.copy()
        
        # Saliency-Daten für dieses Frame
        if frame_number in frames_data:
            frame_data = frames_data[frame_number]
            
            # Saliency Map erstellen
            saliency_map = np.array(frame_data.get("saliency_data", []))
            if saliency_map.size > 0:
                # Reshape zu 2D
                if len(saliency_map.shape) == 1:
                    saliency_map = saliency_map.reshape((height, width))
                
                # Sicherstellen dass es CV_8UC1 ist
                if saliency_map.dtype != np.uint8:
                    saliency_map = saliency_map.astype(np.uint8)
                
                # Heatmap generieren
                heatmap = cv2.applyColorMap(saliency_map, cmap)
                
                # Overlay mit Original-Frame
                heatmap_frame = cv2.addWeighted(heatmap_frame, 1-opacity, heatmap, opacity, 0)
            
            # ROI-Boxen zeichnen
            if show_roi and frame_data.get("roi_suggestions"):
                heatmap_frame = self._draw_roi_boxes(heatmap_frame, frame_data["roi_suggestions"])
        
        # Frame-Info hinzufügen
        if show_info:
            heatmap_frame = self._draw_frame_info(heatmap_frame, frame_number, frames_data.get(frame_number, {}))
        
        return heatmap_frame
    
    def _create_comparison_frame(self, frame: np.ndarray, frame_number: int,
                               frames_data: Dict[int, Dict], cmap: int,
                               width: int, height: int) -> np.ndarray:
        """Erstellt Side-by-Side Vergleichs-Frame"""
        # Original-Frame (links)
        original = frame.copy()
        
        # Heatmap-Frame (mitte)
        heatmap_frame = self._create_heatmap_frame(frame, frame_number, frames_data, cmap, 0.5, True, False)
        
        # ROI-Crop-Frame (rechts)
        roi_frame = self._create_roi_crop_for_comparison(frame, frame_number, frames_data, width, height)
        
        # Side-by-Side zusammenfügen
        comparison = np.hstack([original, heatmap_frame, roi_frame])
        
        return comparison
    
    def _create_roi_crop(self, frame: np.ndarray, roi: Dict[str, Any], 
                        target_width: int, target_height: int) -> np.ndarray:
        """Erstellt ROI-Crop basierend auf Vorschlag"""
        x = roi["x"]
        y = roi["y"]
        w = roi["width"]
        h = roi["height"]
        
        # ROI aus Frame extrahieren
        roi_frame = frame[y:y+h, x:x+w]
        
        # Auf Ziel-Größe skalieren
        roi_resized = cv2.resize(roi_frame, (target_width, target_height))
        
        return roi_resized
    
    def _create_roi_crop_for_comparison(self, frame: np.ndarray, frame_number: int,
                                      frames_data: Dict[int, Dict], width: int, height: int) -> np.ndarray:
        """Erstellt ROI-Crop für Vergleichsvideo"""
        if frame_number in frames_data:
            frame_data = frames_data[frame_number]
            if frame_data.get("roi_suggestions"):
                roi = frame_data["roi_suggestions"][0]  # Beste ROI
                return self._create_roi_crop(frame, roi, width, height)
        
        # Fallback: Zentrale Crop
        return self._create_center_crop(frame, width, height)
    
    def _create_center_crop(self, frame: np.ndarray, target_width: int, target_height: int) -> np.ndarray:
        """Erstellt zentrale Crop"""
        height, width = frame.shape[:2]
        
        # Zentrale Koordinaten
        center_x = width // 2
        center_y = height // 2
        
        # Crop-Bereich berechnen
        x = max(0, center_x - target_width // 2)
        y = max(0, center_y - target_height // 2)
        x = min(x, width - target_width)
        y = min(y, height - target_height)
        
        # Crop extrahieren
        crop = frame[y:y+target_height, x:x+target_width]
        
        return crop
    
    def _draw_roi_boxes(self, frame: np.ndarray, roi_suggestions: List[Dict[str, Any]]) -> np.ndarray:
        """Zeichnet ROI-Boxen auf Frame"""
        for i, roi in enumerate(roi_suggestions):
            x = roi["x"]
            y = roi["y"]
            w = roi["width"]
            h = roi["height"]
            score = roi["score"]
            
            # Farbe basierend auf Score
            color = (0, 255, 0) if score > 0.7 else (0, 255, 255) if score > 0.4 else (0, 0, 255)
            
            # Box zeichnen
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            
            # Score-Label
            label = f"ROI{i+1}: {score:.2f}"
            cv2.putText(frame, label, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        return frame
    
    def _draw_frame_info(self, frame: np.ndarray, frame_number: int, frame_data: Dict[str, Any]) -> np.ndarray:
        """Zeichnet Frame-Informationen"""
        height, width = frame.shape[:2]
        
        # Frame-Nummer
        cv2.putText(frame, f"Frame: {frame_number}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Timestamp
        if "timestamp" in frame_data:
            timestamp = frame_data["timestamp"]
            cv2.putText(frame, f"Time: {timestamp:.2f}s", (10, 60), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Saliency-Statistiken
        if "saliency_stats" in frame_data:
            stats = frame_data["saliency_stats"]
            mean_saliency = stats.get("mean", 0)
            cv2.putText(frame, f"Saliency: {mean_saliency:.1f}", (10, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # ROI-Anzahl
        roi_count = len(frame_data.get("roi_suggestions", []))
        cv2.putText(frame, f"ROIs: {roi_count}", (10, 120), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        return frame
    
    def generate_all_visualizations(self, video_path: str, video_id: str, 
                                  saliency_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Generiert alle Visualisierungen für ein Video
        
        Args:
            video_path: Pfad zum Original-Video
            video_id: Video-ID
            saliency_data: Saliency-Analyse-Daten
            
        Returns:
            Dictionary mit Pfaden zu generierten Videos
        """
        try:
            video_dir = self.storage_dir / video_id
            video_dir.mkdir(exist_ok=True)
            
            results = {}
            
            # Heatmap-Video
            heatmap_path = video_dir / "heatmap_video.mp4"
            results["heatmap"] = self.create_heatmap_video(
                video_path, saliency_data, str(heatmap_path)
            )
            
            # Vergleichsvideo
            comparison_path = video_dir / "comparison_video.mp4"
            results["comparison"] = self.create_comparison_video(
                video_path, saliency_data, str(comparison_path)
            )
            
            # ROI-Preview-Videos für verschiedene Aspect Ratios
            aspect_ratios = [(16, 9), (9, 16), (4, 3), (1, 1)]
            for aspect_ratio in aspect_ratios:
                ratio_name = f"{aspect_ratio[0]}x{aspect_ratio[1]}"
                roi_path = video_dir / f"roi_preview_{ratio_name}.mp4"
                results[f"roi_{ratio_name}"] = self.create_roi_preview_video(
                    video_path, saliency_data, str(roi_path), aspect_ratio=aspect_ratio
                )
            
            logger.info(f"All visualizations generated for video {video_id}")
            return results
            
        except Exception as e:
            logger.error(f"Error generating all visualizations: {e}")
            raise
