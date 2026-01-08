#!/usr/bin/env python3
"""
Debug-Script für SAM Saliency Detection - Testet alle 10 Sekunden
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
import asyncio

def debug_sam_test():
    """Debug-Test für SAM mit detaillierter Analyse"""
    
    # Video-Pfad
    video_path = "/Volumes/DOCKER_EXTERN/prismvid/1760983826974_UDG_Elevator_Pitch_Bosch_v3.mp4"
    
    if not os.path.exists(video_path):
        print(f"❌ Video nicht gefunden: {video_path}")
        return False
    
    print(f"🎬 Debug Testing with Bosch video: {video_path}")
    
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
    print(f"   Frames: {frame_count}")
    
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
    
    # Debug-Analyse: Nur alle 10 Sekunden (bei 25 FPS = alle 250 Frames)
    print("\n🔍 Testing Video Analysis (every 10 seconds for debugging)...")
    try:
        # Nur alle 10 Sekunden analysieren für Debugging
        sample_rate = 250  # Alle 250 Frames = alle 10 Sekunden bei 25 FPS
        
        result = detector.analyze_video(
            video_path=video_path,
            video_id="test_bosch_video_debug",
            sample_rate=sample_rate,
            aspect_ratio=(9, 16),
            max_frames=10  # Nur 10 Frames für Debug
        )
        
        print("✅ Video analysis completed!")
        print(f"   Result keys: {list(result.keys())}")
        
        # Detaillierte Analyse der Ergebnisse
        frames = result.get('frames', [])
        print(f"   Frames analyzed: {len(frames)}")
        
        if frames:
            print(f"\n📊 Detailed Analysis:")
            
            # Analysiere jeden Frame
            for i, frame_data in enumerate(frames):
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
                        debug_path = f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/test_bosch_video_debug/frame_{frame_data.get('frame_number', 0)}_saliency_debug.png"
                        os.makedirs(os.path.dirname(debug_path), exist_ok=True)
                        cv2.imwrite(debug_path, saliency_map)
                        print(f"     Debug image saved: {debug_path}")
                else:
                    print(f"     ❌ No saliency data found!")
                
                # ROI Analyse
                rois = frame_data.get('roi_suggestions', [])
                print(f"     ROIs: {len(rois)}")
                for j, roi in enumerate(rois):
                    print(f"       ROI {j+1}: x={roi.get('x', 'N/A')}, y={roi.get('y', 'N/A')}, w={roi.get('width', 'N/A')}, h={roi.get('height', 'N/A')}, score={roi.get('score', 'N/A')}")
                
                # Saliency Stats
                saliency_stats = frame_data.get('saliency_stats', {})
                if saliency_stats:
                    print(f"     Saliency Stats: {saliency_stats}")
        else:
            print("❌ No frames found in result!")
        
        # Teste Heatmap-Generierung mit den echten Daten
        print("\n🎨 Testing Heatmap Generation with real data...")
        try:
            heatmap_path = generator.create_heatmap_video(
                video_path=video_path,
                saliency_data=result,
                output_path=f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/test_bosch_video_debug/debug_heatmap.mp4",
                colormap="jet",
                opacity=0.5
            )
            
            print(f"✅ Heatmap video generated: {heatmap_path}")
            
            # Prüfe ob Datei existiert
            if os.path.exists(heatmap_path):
                file_size = os.path.getsize(heatmap_path)
                print(f"   File size: {file_size / 1024 / 1024:.1f} MB")
            else:
                print("❌ Heatmap file not found")
                
        except Exception as e:
            print(f"❌ Heatmap generation failed: {e}")
            import traceback
            traceback.print_exc()
        
        return True
        
    except Exception as e:
        print(f"❌ Video analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Async main function"""
    print("🚀 Starting SAM Debug Test")
    print("=" * 50)
    
    success = debug_sam_test()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Debug test completed successfully!")
        print("✅ SAM is working correctly")
    else:
        print("❌ Debug test failed!")
        print("🔧 Check the error messages above")
    
    print("\n📁 Check the results in:")
    print("   /Volumes/DOCKER_EXTERN/prismvid/storage/saliency/test_bosch_video_debug/")

if __name__ == "__main__":
    asyncio.run(main())
