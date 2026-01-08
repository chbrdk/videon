#!/usr/bin/env python3
"""
Test-Script für Saliency Detection Service mit Bosch-Video
"""
import sys
import os
sys.path.append('src')

from models.sam_wrapper import SAMSaliencyModel
from services.saliency_detector import SaliencyDetector
from services.heatmap_generator import HeatmapGenerator
import cv2
import json

def test_bosch_video():
    """Testet den Service mit dem Bosch-Video"""
    
    # Video-Pfad
    video_path = "/Volumes/DOCKER_EXTERN/prismvid/1760983826974_UDG_Elevator_Pitch_Bosch_v3.mp4"
    
    if not os.path.exists(video_path):
        print(f"❌ Video nicht gefunden: {video_path}")
        return False
    
    print(f"🎬 Testing with Bosch video: {video_path}")
    
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
    
    # Kleine Video-Analyse (nur erste 10 Sekunden, jedes 30. Frame)
    print("\n🔍 Testing Video Analysis (first 10 seconds, every 30th frame)...")
    try:
        video_id = "test_bosch_video"
        
        # Analysiere nur die ersten 10 Sekunden mit Sample Rate 30
        result = detector.analyze_video(
            video_path=video_path,
            video_id=video_id,
            sample_rate=30,  # Jedes 30. Frame
            aspect_ratio=(9, 16),
            max_frames=10   # Nur 10 Frames für Test
        )
        
        print(f"✅ Video analysis completed!")
        print(f"   Frames analyzed: {len(result['frames'])}")
        print(f"   Processing time: {result['metadata']['processing_stats']['processing_time']:.2f}s")
        
        # Prüfe Ergebnisse
        if result['frames']:
            first_frame = result['frames'][0]
            print(f"   First frame saliency stats: {first_frame.get('saliency_stats', {})}")
            print(f"   ROI suggestions: {len(first_frame.get('roi_suggestions', []))}")
        
        # Heatmap generieren
        print("\n🎨 Testing Heatmap Generation...")
        try:
            video_dir = f"/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/{video_id}"
            os.makedirs(video_dir, exist_ok=True)
            
            heatmap_path = f"{video_dir}/test_heatmap.mp4"
            
            heatmap_result = generator.create_heatmap_video(
                video_path=video_path,
                saliency_data=result,
                output_path=heatmap_path,
                colormap="jet",
                opacity=0.5
            )
            
            print(f"✅ Heatmap video generated: {heatmap_result}")
            
            # Prüfe ob Datei existiert
            if os.path.exists(heatmap_path):
                file_size = os.path.getsize(heatmap_path)
                print(f"   File size: {file_size / 1024 / 1024:.1f} MB")
            else:
                print("❌ Heatmap file not found")
                
        except Exception as e:
            print(f"❌ Heatmap generation failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Video analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Starting Saliency Detection Service Test")
    print("=" * 50)
    
    success = test_bosch_video()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Test completed successfully!")
        print("✅ Service is working correctly with Bosch video")
    else:
        print("❌ Test failed!")
        print("🔧 Check the error messages above")
    
    print("\n📁 Check the results in:")
    print("   /Volumes/DOCKER_EXTERN/prismvid/storage/saliency/test_bosch_video/")
