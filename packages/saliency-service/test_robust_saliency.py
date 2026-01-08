#!/usr/bin/env python3
"""
Teste die neue robuste Saliency Detection mit dem Bosch-Video
"""

import sys
import os
sys.path.append('src')

from models.robust_saliency import RobustSaliencyDetector
import cv2
import numpy as np
import json
import time
from pathlib import Path
from tqdm import tqdm

def analyze_video_with_robust_saliency(video_path: str, output_dir: str, sample_rate: int = 25):
    """
    Analysiert Video mit robuster Saliency Detection
    """
    print(f"🎬 Analysiere Video mit robuster Saliency Detection...")
    print(f"   Video: {video_path}")
    print(f"   Sample Rate: {sample_rate} (alle {sample_rate} Frames)")
    print(f"   Output: {output_dir}")
    
    # Erstelle Output-Verzeichnis
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Initialisiere Detector
    detector = RobustSaliencyDetector()
    
    # Video öffnen
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")
    
    # Video-Eigenschaften
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"   Original: {width}x{height} @ {fps:.1f} FPS, {total_frames} frames")
    
    # Berechne Anzahl der zu analysierenden Frames
    frames_to_analyze = total_frames // sample_rate
    print(f"   Analysiere: {frames_to_analyze} frames")
    
    # Analysiere Frames
    frames_data = []
    frame_number = 0
    frames_analyzed = 0
    
    start_time = time.time()
    
    with tqdm(total=total_frames, desc="Analyzing frames") as pbar:
        while frame_number < total_frames:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Nur jedes N-te Frame analysieren
            if frame_number % sample_rate == 0:
                frame_start = time.time()
                
                # Generiere Saliency Map
                saliency_map = detector.generate_saliency_map(frame)
                
                # Generiere ROI-Suggestions
                roi_suggestions = detector.get_roi_suggestions(
                    saliency_map, aspect_ratio=(9, 16), num_suggestions=3
                )
                
                # Berechne Saliency-Statistiken
                saliency_stats = {
                    "min": float(saliency_map.min()),
                    "max": float(saliency_map.max()),
                    "mean": float(saliency_map.mean()),
                    "std": float(saliency_map.std()),
                    "non_zero_pixels": int(np.count_nonzero(saliency_map)),
                    "total_pixels": int(saliency_map.size)
                }
                
                frame_data = {
                    "frame_number": frame_number,
                    "timestamp": frame_number / fps,
                    "saliency_stats": saliency_stats,
                    "roi_suggestions": roi_suggestions,
                    "processing_time": time.time() - frame_start,
                    "model_version": "robust_saliency_v1"
                }
                
                frames_data.append(frame_data)
                frames_analyzed += 1
                
                # Speichere Saliency Map
                maps_dir = output_path / "saliency_maps"
                maps_dir.mkdir(exist_ok=True)
                map_path = maps_dir / f"frame_{frame_number:05d}.npz"
                np.savez_compressed(map_path, saliency_map=saliency_map)
            
            frame_number += 1
            pbar.update(1)
    
    cap.release()
    
    processing_time = time.time() - start_time
    
    # Speichere Ergebnisse
    result_data = {
        "video_id": "robust_bosch_video",
        "metadata": {
            "original_resolution": f"{width}x{height}",
            "fps": fps,
            "total_frames": total_frames,
            "sample_rate": sample_rate,
            "frames_analyzed": frames_analyzed,
            "processing_time": processing_time,
            "model_version": "robust_saliency_v1"
        },
        "frames": frames_data
    }
    
    # Speichere JSON
    json_path = output_path / "saliency_data.json"
    with open(json_path, 'w') as f:
        json.dump(result_data, f, separators=(',', ':'))
    
    # Speichere ROI-Suggestions separat
    roi_suggestions = []
    for frame in frames_data:
        roi_suggestions.extend(frame["roi_suggestions"])
    
    roi_path = output_path / "roi_suggestions.json"
    with open(roi_path, 'w') as f:
        json.dump(roi_suggestions, f, separators=(',', ':'))
    
    print(f"\\n✅ Analyse abgeschlossen!")
    print(f"   Frames analysiert: {frames_analyzed}")
    print(f"   Verarbeitungszeit: {processing_time:.1f}s")
    print(f"   Durchschnitt: {processing_time/frames_analyzed:.2f}s pro Frame")
    print(f"   JSON-Datei: {json_path}")
    print(f"   ROI-Datei: {roi_path}")
    print(f"   Saliency Maps: {maps_dir}")
    
    return str(json_path)

def reframe_video_with_robust_data(video_path: str, saliency_data_path: str, output_path: str):
    """
    Reframed Video mit den robusten Saliency-Daten
    """
    print(f"\\n🎨 Reframe Video mit robusten Daten...")
    
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
    
    # Berechne Crop-Größe für 9:16
    roi_width = int(height * 9 / 16)
    roi_height = height
    
    if roi_width > width:
        roi_width = width
        roi_height = int(width * 16 / 9)
    
    print(f"   Original: {width}x{height}")
    print(f"   Crop: {roi_width}x{roi_height}")
    print(f"   Aspect Ratio: {roi_width/roi_height:.3f}")
    
    # Erstelle Video Writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (roi_width, roi_height))
    
    if not out.isOpened():
        raise ValueError(f"Could not create video writer: {output_path}")
    
    # Indexiere Frames
    frame_data_map = {frame["frame_number"]: frame for frame in data["frames"]}
    
    # Verarbeite alle Frames
    frame_idx = 0
    crops_used = []
    
    with tqdm(total=total_frames, desc="Reframing video") as pbar:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Finde passenden Crop für dieses Frame
            crop_to_use = None
            
            # Suche den nächsten analysierten Frame
            for frame_num in sorted(frame_data_map.keys()):
                if frame_num <= frame_idx:
                    frame_info = frame_data_map[frame_num]
                    roi_suggestions = frame_info.get("roi_suggestions", [])
                    if roi_suggestions:
                        best_roi = roi_suggestions[0]  # Beste ROI
                        crop_to_use = (best_roi["x"], best_roi["y"], best_roi["width"], best_roi["height"])
                        break
            
            # Fallback: Zentrierter Crop
            if crop_to_use is None:
                center_x = width // 2
                center_y = height // 2
                crop_to_use = (
                    max(0, center_x - roi_width // 2),
                    max(0, center_y - roi_height // 2),
                    roi_width,
                    roi_height
                )
            
            crops_used.append(crop_to_use)
            
            # Croppe das Frame
            x, y, w, h = crop_to_use
            cropped_frame = frame[y:y+h, x:x+w]
            
            # Stelle sicher, dass das Frame die richtige Größe hat
            if cropped_frame.shape[:2] != (h, w):
                cropped_frame = cv2.resize(cropped_frame, (w, h))
            
            # Schreibe Frame
            out.write(cropped_frame)
            
            frame_idx += 1
            pbar.update(1)
    
    cap.release()
    out.release()
    
    # Analysiere Crop-Verteilung
    unique_crops = list(set(crops_used))
    print(f"\\n📊 Crop-Analyse:")
    print(f"   Einzigartige Crops: {len(unique_crops)}")
    print(f"   Häufigste Crops:")
    
    crop_counts = {}
    for crop in crops_used:
        crop_counts[crop] = crop_counts.get(crop, 0) + 1
    
    # Zeige Top 5 Crops
    sorted_crops = sorted(crop_counts.items(), key=lambda x: x[1], reverse=True)
    for i, (crop, count) in enumerate(sorted_crops[:5]):
        percentage = count / len(crops_used) * 100
        print(f"     {i+1}. Crop {crop}: {count} Frames ({percentage:.1f}%)")
    
    # Prüfe Ausgabedatei
    if os.path.exists(output_path):
        file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
        print(f"\\n✅ Reframed Video generiert: {output_path}")
        print(f"   Dateigröße: {file_size:.1f} MB")
        print(f"   Auflösung: {roi_width}x{roi_height}")
        print(f"   Aspect Ratio: {roi_width/roi_height:.3f}")
    else:
        print(f"\\n❌ Fehler beim Generieren des Videos")
    
    return output_path

def main():
    """Hauptfunktion"""
    video_path = "/Volumes/DOCKER_EXTERN/prismvid/1760983826974_UDG_Elevator_Pitch_Bosch_v3.mp4"
    output_dir = "/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/robust_bosch_video"
    
    print("🚀 Robuste Saliency Detection Test")
    print("=" * 50)
    
    try:
        # 1. Analysiere Video
        saliency_data_path = analyze_video_with_robust_saliency(
            video_path=video_path,
            output_dir=output_dir,
            sample_rate=25  # Alle 25 Frames (1 Sekunde bei 25 FPS)
        )
        
        # 2. Reframe Video
        reframed_video_path = f"{output_dir}/reframed_9_16_robust.mp4"
        reframe_video_with_robust_data(
            video_path=video_path,
            saliency_data_path=saliency_data_path,
            output_path=reframed_video_path
        )
        
        print("\\n🎉 Test erfolgreich abgeschlossen!")
        print(f"📁 Ergebnisse in: {output_dir}")
        
    except Exception as e:
        print(f"\\n❌ Fehler: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
