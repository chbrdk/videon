#!/usr/bin/env python3
"""
Smooth Reframing: Sanfte Übergänge zwischen ROI-Positionen
Verwendet Interpolation und Smoothing für natürliche Bewegungen
"""

import sys
sys.path.append('src')
import cv2
import json
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Any
import math

class SmoothReframer:
    """
    Reframer mit sanften Übergängen zwischen ROI-Positionen
    """
    
    def __init__(self, smoothing_factor: float = 0.3, max_movement_per_frame: float = 20.0):
        """
        Initialisiert den Smooth Reframer
        
        Args:
            smoothing_factor: Wie stark das Smoothing ist (0.0 = kein Smoothing, 1.0 = sehr stark)
            max_movement_per_frame: Maximale Pixel-Bewegung pro Frame für Stabilität
        """
        self.smoothing_factor = smoothing_factor
        self.max_movement_per_frame = max_movement_per_frame
        self.last_crop = None
        self.crop_history = []
        
    def interpolate_crops(self, crops: List[Tuple[int, int, int, int]], 
                         frame_indices: List[int], 
                         total_frames: int) -> List[Tuple[int, int, int, int]]:
        """
        Interpoliert zwischen ROI-Crops für sanfte Übergänge
        
        Args:
            crops: Liste von (x, y, w, h) Crops
            frame_indices: Frame-Nummern für jeden Crop
            total_frames: Gesamtanzahl der Frames
            
        Returns:
            Liste von interpolierten Crops für alle Frames
        """
        if len(crops) == 0:
            # Fallback: Zentrierter Crop
            return [(0, 0, 1920, 1080)] * total_frames
        
        if len(crops) == 1:
            # Nur ein Crop verfügbar
            return [crops[0]] * total_frames
        
        interpolated_crops = []
        
        for frame_idx in range(total_frames):
            # Finde die beiden nächsten Crops
            prev_crop = None
            next_crop = None
            prev_frame = None
            next_frame = None
            
            # Suche vorherigen Crop
            for i, frame_num in enumerate(frame_indices):
                if frame_num <= frame_idx:
                    prev_crop = crops[i]
                    prev_frame = frame_num
                else:
                    break
            
            # Suche nächsten Crop
            for i, frame_num in enumerate(frame_indices):
                if frame_num > frame_idx:
                    next_crop = crops[i]
                    next_frame = frame_num
                    break
            
            # Bestimme den Crop für diesen Frame
            if prev_crop is None and next_crop is None:
                # Fallback
                crop = crops[0]
            elif prev_crop is None:
                # Nur nächster Crop verfügbar
                crop = next_crop
            elif next_crop is None:
                # Nur vorheriger Crop verfügbar
                crop = prev_crop
            else:
                # Interpoliere zwischen beiden Crops
                crop = self._interpolate_two_crops(
                    prev_crop, next_crop, 
                    prev_frame, next_frame, frame_idx
                )
            
            # Wende Smoothing an
            smoothed_crop = self._apply_smoothing(crop, frame_idx)
            interpolated_crops.append(smoothed_crop)
        
        return interpolated_crops
    
    def _interpolate_two_crops(self, crop1: Tuple[int, int, int, int], 
                              crop2: Tuple[int, int, int, int],
                              frame1: int, frame2: int, 
                              current_frame: int) -> Tuple[int, int, int, int]:
        """
        Interpoliert zwischen zwei Crops basierend auf Frame-Position
        """
        if frame1 == frame2:
            return crop1
        
        # Berechne Interpolationsfaktor (0.0 = crop1, 1.0 = crop2)
        t = (current_frame - frame1) / (frame2 - frame1)
        t = max(0.0, min(1.0, t))  # Clamp zwischen 0 und 1
        
        # Verwende easing function für natürlichere Bewegung
        t = self._ease_in_out_cubic(t)
        
        # Interpoliere jede Komponente
        x = int(crop1[0] + (crop2[0] - crop1[0]) * t)
        y = int(crop1[1] + (crop2[1] - crop1[1]) * t)
        w = int(crop1[2] + (crop2[2] - crop1[2]) * t)
        h = int(crop1[3] + (crop2[3] - crop1[3]) * t)
        
        return (x, y, w, h)
    
    def _ease_in_out_cubic(self, t: float) -> float:
        """
        Cubic easing function für natürliche Bewegung
        """
        if t < 0.5:
            return 4 * t * t * t
        else:
            p = 2 * t - 2
            return 1 + p * p * p / 2
    
    def _apply_smoothing(self, crop: Tuple[int, int, int, int], 
                        frame_idx: int) -> Tuple[int, int, int, int]:
        """
        Wendet Smoothing auf den Crop an basierend auf vorherigen Crops
        """
        if self.last_crop is None:
            self.last_crop = crop
            self.crop_history.append(crop)
            return crop
        
        # Berechne Bewegung vom letzten Crop
        dx = crop[0] - self.last_crop[0]
        dy = crop[1] - self.last_crop[1]
        
        # Begrenze Bewegung pro Frame für Stabilität
        max_move = self.max_movement_per_frame
        if abs(dx) > max_move:
            dx = max_move if dx > 0 else -max_move
        if abs(dy) > max_move:
            dy = max_move if dy > 0 else -max_move
        
        # Wende Smoothing an
        smoothed_x = int(self.last_crop[0] + dx * self.smoothing_factor)
        smoothed_y = int(self.last_crop[1] + dy * self.smoothing_factor)
        
        # Verwende ursprüngliche Größe
        smoothed_crop = (smoothed_x, smoothed_y, crop[2], crop[3])
        
        # Aktualisiere History
        self.last_crop = smoothed_crop
        self.crop_history.append(smoothed_crop)
        
        # Behalte nur die letzten 10 Crops für Performance
        if len(self.crop_history) > 10:
            self.crop_history.pop(0)
        
        return smoothed_crop
    
    def reframe_video_smooth(self, video_path: str, saliency_data_path: str, 
                           output_path: str, target_aspect_ratio: Tuple[int, int] = (9, 16)):
        """
        Reframed Video mit sanften Übergängen
        """
        print(f"🎬 Smooth Reframing...")
        print(f"   Smoothing Factor: {self.smoothing_factor}")
        print(f"   Max Movement per Frame: {self.max_movement_per_frame}px")
        
        # Lade Saliency-Daten
        with open(saliency_data_path, 'r') as f:
            data = json.load(f)
        
        # Video öffnen
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Berechne Crop-Größe für Ziel-Aspect Ratio
        roi_width = int(height * target_aspect_ratio[0] / target_aspect_ratio[1])
        roi_height = height
        
        if roi_width > width:
            roi_width = width
            roi_height = int(width * target_aspect_ratio[1] / target_aspect_ratio[0])
        
        print(f"   Original: {width}x{height}")
        print(f"   Ziel-Crop: {roi_width}x{roi_height}")
        print(f"   Aspect Ratio: {roi_width/roi_height:.3f}")
        
        # Erstelle Video Writer
        # Try H.264 first, fallback to mp4v
        fourcc = cv2.VideoWriter_fourcc(*'H264')  # H.264 codec for browser compatibility
        out = cv2.VideoWriter(output_path, fourcc, fps, (roi_width, roi_height))
        
        if not out.isOpened():
            print(f"⚠️  Could not open H.264 codec, trying mp4v...")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (roi_width, roi_height))
        
        if not out.isOpened():
            raise ValueError(f"Could not create video writer: {output_path}")
        
        # Sammle alle ROIs
        crops = []
        frame_indices = []
        
        for frame in data['frames']:
            frame_num = frame['frame_number']
            roi_suggestions = frame.get('roi_suggestions', [])
            
            if roi_suggestions:
                best_roi = max(roi_suggestions, key=lambda r: r['score'])
                crops.append((best_roi['x'], best_roi['y'], best_roi['width'], best_roi['height']))
                frame_indices.append(frame_num)
        
        print(f"   Verfügbare ROIs: {len(crops)}")
        
        # Interpoliere Crops für alle Frames
        print("   Interpoliere Crops...")
        interpolated_crops = self.interpolate_crops(crops, frame_indices, total_frames)
        
        # Verarbeite alle Frames
        frame_idx = 0
        
        import tqdm
        with tqdm.tqdm(total=total_frames, desc='Smooth reframing') as pbar:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Verwende interpolierten Crop
                crop = interpolated_crops[frame_idx]
                x, y, w, h = crop
                
                # Sicherheitsprüfung
                x = max(0, min(x, width - w))
                y = max(0, min(y, height - h))
                w = min(w, width - x)
                h = min(h, height - y)
                
                cropped_frame = frame[y:y+h, x:x+w]
                
                # Stelle sicher, dass das Frame die richtige Größe hat
                if cropped_frame.shape[:2] != (roi_height, roi_width):
                    cropped_frame = cv2.resize(cropped_frame, (roi_width, roi_height))
                
                # Schreibe Frame
                out.write(cropped_frame)
                
                frame_idx += 1
                pbar.update(1)
        
        cap.release()
        out.release()
        
        # Analysiere Crop-Bewegung
        self._analyze_crop_movement(interpolated_crops)
        
        # Prüfe Ausgabedatei
        if Path(output_path).exists():
            file_size = Path(output_path).stat().st_size / (1024 * 1024)  # MB
            print(f"\\n✅ Smooth Reframed Video generiert: {output_path}")
            print(f"   Dateigröße: {file_size:.1f} MB")
            print(f"   Auflösung: {roi_width}x{roi_height}")
            print(f"   Aspect Ratio: {roi_width/roi_height:.3f}")
            
            if file_size > 1.0:
                print("🎉 Smooth Video erfolgreich erstellt!")
            else:
                print("⚠️  Video ist sehr klein - möglicherweise noch ein Problem")
        else:
            print(f"\\n❌ Fehler beim Generieren des Videos")
        
        return output_path
    
    def _analyze_crop_movement(self, crops: List[Tuple[int, int, int, int]]):
        """
        Analysiert die Bewegung der Crops für Debugging
        """
        if len(crops) < 2:
            return
        
        movements = []
        for i in range(1, len(crops)):
            prev_crop = crops[i-1]
            curr_crop = crops[i]
            
            dx = curr_crop[0] - prev_crop[0]
            dy = curr_crop[1] - prev_crop[1]
            movement = math.sqrt(dx*dx + dy*dy)
            movements.append(movement)
        
        if movements:
            avg_movement = sum(movements) / len(movements)
            max_movement = max(movements)
            min_movement = min(movements)
            
            print(f"\\n📊 Crop-Bewegungsanalyse:")
            print(f"   Durchschnittliche Bewegung: {avg_movement:.1f}px pro Frame")
            print(f"   Maximale Bewegung: {max_movement:.1f}px")
            print(f"   Minimale Bewegung: {min_movement:.1f}px")
            print(f"   Frames mit Bewegung > 10px: {sum(1 for m in movements if m > 10)}")

def main():
    """Teste Smooth Reframing"""
    video_path = "/Volumes/DOCKER_EXTERN/prismvid/1760983826974_UDG_Elevator_Pitch_Bosch_v3.mp4"
    saliency_data_path = "/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/robust_bosch_video/saliency_data.json"
    output_path = "/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/robust_bosch_video/reframed_9_16_smooth.mp4"
    
    print("🚀 Smooth Reframing Test")
    print("=" * 50)
    
    # Teste verschiedene Smoothing-Faktoren
    smoothing_factors = [0.1, 0.3, 0.5]
    
    for factor in smoothing_factors:
        print(f"\\n🎨 Teste Smoothing Factor: {factor}")
        
        reframer = SmoothReframer(
            smoothing_factor=factor,
            max_movement_per_frame=15.0
        )
        
        test_output = output_path.replace('.mp4', f'_smooth_{factor}.mp4')
        
        try:
            reframer.reframe_video_smooth(
                video_path=video_path,
                saliency_data_path=saliency_data_path,
                output_path=test_output,
                target_aspect_ratio=(9, 16)
            )
        except Exception as e:
            print(f"❌ Fehler mit Smoothing Factor {factor}: {e}")

if __name__ == "__main__":
    main()
