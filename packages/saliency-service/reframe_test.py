#!/usr/bin/env python3
"""
Reframing Test Script - Automatisches 9:16 Zuschneiden basierend auf Saliency-Daten
"""

import os
import json
import cv2
import numpy as np
from pathlib import Path
import argparse
from typing import Dict, List, Tuple, Optional
import tempfile

class VideoReframer:
    """Automatisches Video-Reframing basierend auf Saliency-Daten"""
    
    def __init__(self, saliency_data_path: str):
        self.saliency_data_path = saliency_data_path
        self.saliency_data = self._load_saliency_data()
        
    def _load_saliency_data(self) -> Dict:
        """Lädt die Saliency-Daten aus der JSON-Datei"""
        with open(self.saliency_data_path, 'r') as f:
            return json.load(f)
    
    def _load_saliency_map(self, frame_number: int) -> Optional[np.ndarray]:
        """Lädt eine Saliency Map aus der komprimierten Datei"""
        try:
            maps_dir = Path(self.saliency_data_path).parent / "saliency_maps"
            map_file = maps_dir / f"frame_{frame_number:05d}.npz"
            
            if map_file.exists():
                with np.load(map_file) as data:
                    return data['saliency_map']
        except Exception as e:
            print(f"Warning: Could not load saliency map for frame {frame_number}: {e}")
        return None
    
    def _calculate_optimal_crop(self, saliency_map: np.ndarray, target_aspect_ratio: float = 9/16) -> Tuple[int, int, int, int]:
        """
        Berechnet den optimalen Crop-Bereich basierend auf Saliency-Daten
        
        Args:
            saliency_map: 2D Array mit Saliency-Werten (0-255)
            target_aspect_ratio: Ziel-Seitenverhältnis (9:16 = 0.5625)
            
        Returns:
            (x, y, width, height) des optimalen Crop-Bereichs
        """
        height, width = saliency_map.shape
        
        # Berechne mögliche Crop-Größen
        crop_width = int(height * target_aspect_ratio)
        crop_height = height
        
        if crop_width > width:
            # Wenn Crop zu breit ist, verwende volle Breite
            crop_width = width
            crop_height = int(width / target_aspect_ratio)
        
        # Finde den Bereich mit der höchsten Saliency
        best_score = -1
        best_crop = (0, 0, crop_width, crop_height)
        
        # Teste verschiedene Positionen
        for y in range(0, height - crop_height + 1, max(1, height // 20)):
            for x in range(0, width - crop_width + 1, max(1, width // 20)):
                # Berechne Saliency-Score für diesen Bereich
                crop_region = saliency_map[y:y+crop_height, x:x+crop_width]
                score = np.mean(crop_region)
                
                if score > best_score:
                    best_score = score
                    best_crop = (x, y, crop_width, crop_height)
        
        return best_crop
    
    def _smooth_crop_transitions(self, crops: List[Tuple[int, int, int, int]], smoothing_factor: float = 0.3) -> List[Tuple[int, int, int, int]]:
        """
        Glättet Crop-Übergänge zwischen Frames für flüssigere Bewegung
        
        Args:
            crops: Liste von (x, y, width, height) Tupeln
            smoothing_factor: Glättungsfaktor (0.0 = keine Glättung, 1.0 = maximale Glättung)
            
        Returns:
            Geglättete Liste von Crop-Bereichen
        """
        if len(crops) <= 1:
            return crops
        
        smoothed = [crops[0]]  # Erstes Frame unverändert
        
        for i in range(1, len(crops)):
            prev_crop = smoothed[-1]
            curr_crop = crops[i]
            
            # Glätte Position (x, y) aber behalte Größe bei
            smooth_x = int(prev_crop[0] * smoothing_factor + curr_crop[0] * (1 - smoothing_factor))
            smooth_y = int(prev_crop[1] * smoothing_factor + curr_crop[2] * (1 - smoothing_factor))
            
            smoothed_crop = (smooth_x, smooth_y, curr_crop[2], curr_crop[3])
            smoothed.append(smoothed_crop)
        
        return smoothed
    
    def reframe_video(self, input_video_path: str, output_video_path: str, 
                     target_aspect_ratio: float = 9/16, smoothing_factor: float = 0.3,
                     show_roi_overlay: bool = True) -> str:
        """
        Reframed ein Video basierend auf Saliency-Daten
        
        Args:
            input_video_path: Pfad zum Eingangsvideo
            output_video_path: Pfad zum Ausgangsvideo
            target_aspect_ratio: Ziel-Seitenverhältnis (9:16 = 0.5625)
            smoothing_factor: Glättungsfaktor für Crop-Übergänge
            show_roi_overlay: Zeige ROI-Overlay im Video
            
        Returns:
            Pfad zum generierten Video
        """
        print(f"🎬 Starting video reframing...")
        print(f"   Input: {input_video_path}")
        print(f"   Output: {output_video_path}")
        print(f"   Target aspect ratio: {target_aspect_ratio:.3f}")
        
        # Video öffnen
        cap = cv2.VideoCapture(input_video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {input_video_path}")
        
        # Video-Eigenschaften
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"   Original: {width}x{height} @ {fps:.1f} FPS, {total_frames} frames")
        
        # Berechne Crop-Bereiche für alle analysierten Frames
        crops = []
        frame_data_map = {frame["frame_number"]: frame for frame in self.saliency_data["frames"]}
        
        print(f"   Calculating optimal crops for {len(self.saliency_data['frames'])} analyzed frames...")
        
        for frame_info in self.saliency_data["frames"]:
            frame_number = frame_info["frame_number"]
            
            # Lade Saliency Map
            saliency_map = self._load_saliency_map(frame_number)
            
            if saliency_map is not None:
                crop = self._calculate_optimal_crop(saliency_map, target_aspect_ratio)
                crops.append(crop)
                print(f"     Frame {frame_number}: Crop {crop}")
            else:
                # Fallback: Zentrierter Crop
                crop_width = int(height * target_aspect_ratio)
                crop_height = height
                if crop_width > width:
                    crop_width = width
                    crop_height = int(width / target_aspect_ratio)
                
                x = (width - crop_width) // 2
                y = (height - crop_height) // 2
                crop = (x, y, crop_width, crop_height)
                crops.append(crop)
                print(f"     Frame {frame_number}: Fallback crop {crop}")
        
        # Glätte Crop-Übergänge
        if smoothing_factor > 0:
            print(f"   Smoothing crop transitions (factor: {smoothing_factor})...")
            crops = self._smooth_crop_transitions(crops, smoothing_factor)
        
        # Video Writer erstellen
        crop_width, crop_height = crops[0][2], crops[0][3]
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_video_path, fourcc, fps, (crop_width, crop_height))
        
        if not out.isOpened():
            print(f"❌ Error: Could not open video writer for {output_video_path}")
            cap.release()
            return None
        
        print(f"   Output: {crop_width}x{crop_height} @ {fps:.1f} FPS")
        
        # Verarbeite alle Frames
        frame_idx = 0
        
        print(f"   Processing {total_frames} frames...")
        
        with tqdm(total=total_frames, desc="Reframing video") as pbar:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Finde passenden Crop für dieses Frame
                # Verwende den Crop der am nächsten analysierten Frame liegt
                crop_to_use = crops[0]  # Default: erster Crop
                
                for i, frame_info in enumerate(self.saliency_data["frames"]):
                    if frame_info["frame_number"] <= frame_idx:
                        crop_to_use = crops[i]
                    else:
                        break
                
                x, y, w, h = crop_to_use
                
                # Sicherheitsprüfung für Crop-Bereich
                x = max(0, min(x, width - w))
                y = max(0, min(y, height - h))
                w = min(w, width - x)
                h = min(h, height - y)
                
                # Croppe das Frame
                cropped_frame = frame[y:y+h, x:x+w]
                
                # Stelle sicher, dass das Frame die richtige Größe hat
                if cropped_frame.shape[:2] != (h, w):
                    cropped_frame = cv2.resize(cropped_frame, (w, h))
                
                # Zeige ROI-Overlay falls gewünscht
                if show_roi_overlay and frame_idx in frame_data_map:
                    frame_info = frame_data_map[frame_idx]
                    roi_suggestions = frame_info.get("roi_suggestions", [])
                    
                    if roi_suggestions:
                        # Zeige beste ROI
                        best_roi = roi_suggestions[0]
                        roi_x = best_roi.get("x", 0) - x
                        roi_y = best_roi.get("y", 0) - y
                        roi_w = best_roi.get("width", 0)
                        roi_h = best_roi.get("height", 0)
                        score = best_roi.get("score", 0)
                        
                        # Zeichne ROI-Rahmen
                        if 0 <= roi_x < w and 0 <= roi_y < h:
                            cv2.rectangle(cropped_frame, (roi_x, roi_y), 
                                        (roi_x + roi_w, roi_y + roi_h), (0, 255, 0), 2)
                            
                            # Zeige Score
                            cv2.putText(cropped_frame, f"ROI: {score:.2f}", 
                                      (roi_x, roi_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 
                                      0.5, (0, 255, 0), 1)
                
                # Schreibe Frame
                out.write(cropped_frame)
                
                frame_idx += 1
                pbar.update(1)
        
        # Cleanup
        cap.release()
        out.release()
        
        # Prüfe Ausgabedatei
        if os.path.exists(output_video_path):
            file_size = os.path.getsize(output_video_path) / (1024 * 1024)  # MB
            print(f"✅ Reframed video generated: {output_video_path}")
            print(f"   File size: {file_size:.1f} MB")
            print(f"   Resolution: {crop_width}x{crop_height}")
            print(f"   Aspect ratio: {crop_width/crop_height:.3f}")
        else:
            print(f"❌ Failed to generate reframed video")
        
        return output_video_path

def main():
    parser = argparse.ArgumentParser(description="Reframe video based on saliency data")
    parser.add_argument("--input", "-i", required=True, help="Input video path")
    parser.add_argument("--output", "-o", required=True, help="Output video path")
    parser.add_argument("--saliency-data", "-s", required=True, help="Path to saliency_data.json")
    parser.add_argument("--aspect-ratio", "-a", type=float, default=9/16, help="Target aspect ratio (default: 9/16)")
    parser.add_argument("--smoothing", "-sm", type=float, default=0.3, help="Crop smoothing factor (0.0-1.0)")
    parser.add_argument("--no-roi-overlay", action="store_true", help="Disable ROI overlay")
    
    args = parser.parse_args()
    
    # Prüfe Eingabedateien
    if not os.path.exists(args.input):
        print(f"❌ Input video not found: {args.input}")
        return
    
    if not os.path.exists(args.saliency_data):
        print(f"❌ Saliency data not found: {args.saliency_data}")
        return
    
    # Erstelle Ausgabeordner
    output_dir = Path(args.output).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Erstelle Reframer
        reframer = VideoReframer(args.saliency_data)
        
        # Reframe Video
        output_path = reframer.reframe_video(
            input_video_path=args.input,
            output_video_path=args.output,
            target_aspect_ratio=args.aspect_ratio,
            smoothing_factor=args.smoothing,
            show_roi_overlay=not args.no_roi_overlay
        )
        
        print(f"\n🎉 Video reframing completed successfully!")
        print(f"📁 Output: {output_path}")
        
    except Exception as e:
        print(f"❌ Error during video reframing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Import tqdm für Progress Bar
    try:
        from tqdm import tqdm
    except ImportError:
        print("Installing tqdm...")
        import subprocess
        subprocess.check_call(["pip", "install", "tqdm"])
        from tqdm import tqdm
    
    main()
