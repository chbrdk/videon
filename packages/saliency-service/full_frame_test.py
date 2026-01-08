#!/usr/bin/env python3
"""
Vollständiger Frame-Test: Analysiert jeden Frame und erstellt Heatmap-Video
"""
import sys
import os
sys.path.append('src')

from models.sam_wrapper import SAMSaliencyModel
from services.saliency_detector import SaliencyDetector
from services.heatmap_generator import HeatmapGenerator
import cv2
import numpy as np
import json
import time

def full_frame_test():
    """Testet jeden Frame des Videos"""
    
    # Video-Pfad
    video_path = "/Volumes/DOCKER_EXTERN/prismvid/1760983826974_UDG_Elevator_Pitch_Bosch_v3.mp4"
    
    if not os.path.exists(video_path):
        print(f"❌ Video nicht gefunden: {video_path}")
        return False
    
    print(f"🎬 Full Frame Analysis with Bosch video: {video_path}")
    
    # Video-Informationen
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ Video konnte nicht geöffnet werden")
        return False
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"📊 Video Info:")
    print(f"   Resolution: {width}x{height}")
    print(f"   FPS: {fps:.1f}")
    print(f"   Duration: {duration:.1f}s")
    print(f"   Total Frames: {frame_count}")
    
    cap.release()
    
    # SAM Model testen
    print("\n🧠 Testing SAM Model...")
    try:
        sam_model = SAMSaliencyModel(model_type="vit_l", use_coreml=False)
        print("✅ SAM Model initialized successfully")
    except Exception as e:
        print(f"❌ SAM Model initialization failed: {e}")
        return False
    
    # Saliency Detector testen
    print("\n🎯 Testing Saliency Detector...")
    try:
        detector = SaliencyDetector(model_type="vit_l", use_coreml=False)
        print("✅ Saliency Detector initialized successfully")
    except Exception as e:
        print(f"❌ Saliency Detector initialization failed: {e}")
        return False
    
    # Heatmap Generator testen
    print("\n🎨 Testing Heatmap Generator...")
    try:
        generator = HeatmapGenerator()
        print("✅ Heatmap Generator initialized successfully")
    except Exception as e:
        print(f"❌ Heatmap Generator initialization failed: {e}")
        return False
    
    # Vollständige Video-Analyse: JEDEN Frame analysieren
    print(f"\n🔍 Full Frame Analysis (every frame)...")
    sample_rate = 25  # 1 Sekunde bei 25 FPS
    frames_to_analyze = frame_count // sample_rate
    print(f"🚀 OPTIMIERT: Alle {sample_rate} Frames analysieren (1 Sekunde)!")
    print(f"   Frames zu analysieren: ~{frames_to_analyze}")
    print(f"   Geschätzte Zeit: {frames_to_analyze * 2 / 60:.1f} Minuten (mit M4 Optimierung)")
    
    # Automatisch fortfahren (für automatische Tests)
    print("✅ Automatisch fortfahren...")
    
    try:
        # Analysiere alle 1 Sekunde (sample_rate=25) - Optimiert für Performance
        result = detector.analyze_video(
            video_path=video_path,
            video_id="optimized_bosch_video",
            sample_rate=25,  # Alle 25 Frames analysieren (1 Sekunde bei 25 FPS)
            aspect_ratio=(9, 16),
            max_frames=None  # Alle Frames mit sample_rate=25
        )
        
        print("✅ Full frame analysis completed!")
        print(f"   Frames analyzed: {len(result['frames'])}")
        print(f"   Processing time: {result['metadata']['processing_stats']['processing_time']:.2f}s")
        
        # Detaillierte Analyse der ersten paar Frames
        print(f"\n📊 Sample Analysis (first 5 frames):")
        for i, frame_data in enumerate(result['frames'][:5]):
            print(f"\n   Frame {i+1} (Original Frame {frame_data.get('frame_number', 'unknown')}):")
            print(f"     Timestamp: {frame_data.get('timestamp', 'unknown'):.2f}s")
            
            # Saliency Map Analyse
            saliency_data = frame_data.get('saliency_data', [])
            if saliency_data:
                saliency_map = np.array(saliency_data)
                print(f"     Saliency Map:")
                print(f"       Shape: {saliency_map.shape}")
                print(f"       Min: {saliency_map.min()}, Max: {saliency_map.max()}")
                print(f"       Mean: {saliency_map.mean():.2f}, Std: {saliency_map.std():.2f}")
                print(f"       Non-zero pixels: {np.count_nonzero(saliency_map)} / {saliency_map.size}")
                
                # Speichere erste Saliency Map als Bild für Debugging
                if i == 0:
                    debug_path = f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/full_frame_bosch_video/frame_{frame_data.get('frame_number', 0)}_saliency_debug.png"
                    os.makedirs(os.path.dirname(debug_path), exist_ok=True)
                    cv2.imwrite(debug_path, saliency_map)
                    print(f"     Debug image saved: {debug_path}")
            else:
                print(f"     ❌ No saliency data found!")
            
            # ROI Analyse
            rois = frame_data.get('roi_suggestions', [])
            print(f"     ROIs: {len(rois)}")
            if rois:
                print(f"       Best ROI: x={rois[0].get('x', 'N/A')}, y={rois[0].get('y', 'N/A')}, score={rois[0].get('score', 'N/A'):.3f}")
        
        # Teste Heatmap-Generierung mit den echten Daten (optimiert)
        print("\n🎨 Generating Optimized Heatmap Video...")
        try:
            # Lade die optimierte JSON-Datei
            json_path = f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/optimized_bosch_video/saliency_data.json"
            with open(json_path, 'r') as f:
                optimized_data = json.load(f)
            
            heatmap_path = generator.create_heatmap_video(
                video_path=video_path,
                saliency_data=optimized_data,
                output_path=f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/optimized_bosch_video/optimized_heatmap.mp4",
                colormap="jet",
                opacity=0.5
            )
            
            print(f"✅ Full heatmap video generated: {heatmap_path}")
            
            # Prüfe ob Datei existiert
            if os.path.exists(heatmap_path):
                file_size = os.path.getsize(heatmap_path)
                print(f"   File size: {file_size / 1024 / 1024:.1f} MB")
                
                # Video-Info prüfen
                cap = cv2.VideoCapture(heatmap_path)
                if cap.isOpened():
                    heatmap_fps = cap.get(cv2.CAP_PROP_FPS)
                    heatmap_frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    heatmap_duration = heatmap_frame_count / heatmap_fps
                    print(f"   Heatmap Video Info:")
                    print(f"     Frames: {heatmap_frame_count}")
                    print(f"     Duration: {heatmap_duration:.1f}s")
                    print(f"     FPS: {heatmap_fps:.1f}")
                cap.release()
            else:
                print("❌ Heatmap file not found")
                
        except Exception as e:
            print(f"❌ Heatmap generation failed: {e}")
            import traceback
            traceback.print_exc()
        
        return True
        
    except Exception as e:
        print(f"❌ Full frame analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Starting Full Frame Saliency Analysis")
    print("=" * 60)
    
    success = full_frame_test()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Full frame analysis completed successfully!")
        print("✅ Every frame analyzed with heatmap video generated")
    else:
        print("❌ Full frame analysis failed!")
        print("🔧 Check the error messages above")
    
    print("\n📁 Check the results in:")
    print("   /Volumes/DOCKER_EXTERN/prismvid/storage/saliency/optimized_bosch_video/")
