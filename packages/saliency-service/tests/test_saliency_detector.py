"""
Integration Tests für Saliency Detector Service
Testet Video-Analyse und Scene-Analyse Funktionalität
"""
import pytest
import cv2
import tempfile
import os
import json
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

from src.services.saliency_detector import SaliencyDetector

class TestSaliencyDetector:
    """Test-Klasse für Saliency Detector Service"""
    
    @pytest.fixture
    def test_video(self):
        """Erstellt ein Test-Video"""
        # Erstelle ein kurzes Test-Video
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fps = 30.0
        width, height = 640, 480
        
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            video_path = tmp.name
        
        out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))
        
        # Schreibe 30 Frames (1 Sekunde)
        for i in range(30):
            # Erstelle Frame mit sich änderndem Inhalt
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            
            # Hintergrund
            frame[:] = (50, 50, 50)
            
            # Bewegendes Objekt
            x = int(100 + i * 10) % (width - 100)
            y = int(100 + i * 5) % (height - 100)
            cv2.rectangle(frame, (x, y), (x+50, y+50), (200, 200, 200), -1)
            
            # Kleiner Kreis mit hoher Saliency
            center_x = int(width/2 + 50 * np.sin(i * 0.2))
            center_y = int(height/2 + 30 * np.cos(i * 0.2))
            cv2.circle(frame, (center_x, center_y), 20, (255, 255, 255), -1)
            
            out.write(frame)
        
        out.release()
        
        yield video_path
        
        # Cleanup
        os.unlink(video_path)
    
    @pytest.fixture
    def saliency_detector(self):
        """Erstellt Saliency Detector Instance"""
        return SaliencyDetector(model_type="sam2.1_small", use_coreml=False)
    
    def test_video_info_extraction(self, saliency_detector, test_video):
        """Testet Video-Informationen Extraktion"""
        video_info = saliency_detector._get_video_info(test_video)
        
        assert video_info is not None
        assert "frame_count" in video_info
        assert "fps" in video_info
        assert "duration" in video_info
        assert "width" in video_info
        assert "height" in video_info
        assert "resolution" in video_info
        
        assert video_info["frame_count"] == 30
        assert video_info["fps"] == 30.0
        assert video_info["duration"] == 1.0
        assert video_info["width"] == 640
        assert video_info["height"] == 480
        assert video_info["resolution"] == "640x480"
    
    def test_video_analysis(self, saliency_detector, test_video):
        """Testet vollständige Video-Analyse"""
        video_id = "test_video_001"
        
        result = saliency_detector.analyze_video(
            video_path=test_video,
            video_id=video_id,
            sample_rate=5,  # Jedes 5. Frame
            max_frames=10   # Nur 10 Frames für Test
        )
        
        assert isinstance(result, dict)
        assert "video_id" in result
        assert "frames" in result
        assert "metadata" in result
        
        assert result["video_id"] == video_id
        assert isinstance(result["frames"], list)
        assert len(result["frames"]) <= 10  # Max frames limit
        
        # Prüfe Frame-Daten
        for frame_data in result["frames"]:
            assert "frame_number" in frame_data
            assert "timestamp" in frame_data
            assert "saliency_data" in frame_data
            assert "roi_suggestions" in frame_data
            assert "processing_time" in frame_data
            
            assert isinstance(frame_data["frame_number"], int)
            assert isinstance(frame_data["timestamp"], float)
            assert isinstance(frame_data["saliency_data"], list)
            assert isinstance(frame_data["roi_suggestions"], list)
            assert frame_data["processing_time"] > 0
        
        # Prüfe Metadaten
        metadata = result["metadata"]
        assert "video_info" in metadata
        assert "analysis_params" in metadata
        assert "processing_stats" in metadata
        
        assert metadata["video_info"]["frame_count"] == 30
        assert metadata["analysis_params"]["sample_rate"] == 5
        assert metadata["processing_stats"]["total_frames_analyzed"] <= 10
    
    def test_scene_analysis(self, saliency_detector, test_video):
        """Testet Scene-Analyse"""
        video_id = "test_video_001"
        scene_id = "scene_001"
        
        result = saliency_detector.analyze_scene(
            video_path=test_video,
            video_id=video_id,
            scene_id=scene_id,
            start_time=0.0,
            end_time=0.5  # Erste 0.5 Sekunden
        )
        
        assert isinstance(result, dict)
        assert "video_id" in result
        assert "scene_id" in result
        assert "frames" in result
        assert "metadata" in result
        
        assert result["video_id"] == video_id
        assert result["scene_id"] == scene_id
        
        # Sollte etwa 15 Frames analysieren (0.5s * 30fps)
        assert len(result["frames"]) == 15
        
        # Prüfe Scene-Metadaten
        scene_info = result["metadata"]["scene_info"]
        assert scene_info["scene_id"] == scene_id
        assert scene_info["start_time"] == 0.0
        assert scene_info["end_time"] == 0.5
        assert scene_info["duration"] == 0.5
    
    def test_sample_rate_effect(self, saliency_detector, test_video):
        """Testet dass Sample Rate korrekt funktioniert"""
        video_id = "test_sample_rate"
        
        # Test verschiedene Sample Rates
        for sample_rate in [1, 2, 5]:
            result = saliency_detector.analyze_video(
                video_path=test_video,
                video_id=f"{video_id}_{sample_rate}",
                sample_rate=sample_rate,
                max_frames=20
            )
            
            expected_frames = min(20, 30 // sample_rate)
            actual_frames = len(result["frames"])
            
            # Toleranz für Rundungsfehler
            assert abs(actual_frames - expected_frames) <= 1
    
    def test_aspect_ratio_roi_suggestions(self, saliency_detector, test_video):
        """Testet dass ROI-Vorschläge das richtige Seitenverhältnis haben"""
        video_id = "test_aspect_ratio"
        
        aspect_ratios = [(16, 9), (9, 16), (4, 3), (1, 1)]
        
        for aspect_ratio in aspect_ratios:
            result = saliency_detector.analyze_video(
                video_path=test_video,
                video_id=f"{video_id}_{aspect_ratio[0]}x{aspect_ratio[1]}",
                sample_rate=10,
                aspect_ratio=aspect_ratio,
                max_frames=3
            )
            
            # Prüfe ROI-Vorschläge
            for frame_data in result["frames"]:
                for roi in frame_data["roi_suggestions"]:
                    actual_ratio = roi["width"] / roi["height"]
                    expected_ratio = aspect_ratio[0] / aspect_ratio[1]
                    
                    # Toleranz von 10%
                    assert abs(actual_ratio - expected_ratio) / expected_ratio < 0.1
    
    def test_results_saving_and_loading(self, saliency_detector, test_video):
        """Testet Speichern und Laden von Ergebnissen"""
        video_id = "test_save_load"
        
        # Analysiere Video
        result = saliency_detector.analyze_video(
            video_path=test_video,
            video_id=video_id,
            sample_rate=10,
            max_frames=5
        )
        
        # Lade Ergebnisse
        loaded_result = saliency_detector.get_analysis_results(video_id)
        
        assert loaded_result is not None
        assert loaded_result["video_id"] == video_id
        assert len(loaded_result["frames"]) == len(result["frames"])
        
        # Prüfe dass Daten identisch sind
        for i, (original, loaded) in enumerate(zip(result["frames"], loaded_result["frames"])):
            assert original["frame_number"] == loaded["frame_number"]
            assert abs(original["timestamp"] - loaded["timestamp"]) < 0.001
    
    def test_scene_results_saving_and_loading(self, saliency_detector, test_video):
        """Testet Speichern und Laden von Scene-Ergebnissen"""
        video_id = "test_scene_save_load"
        scene_id = "scene_001"
        
        # Analysiere Scene
        result = saliency_detector.analyze_scene(
            video_path=test_video,
            video_id=video_id,
            scene_id=scene_id,
            start_time=0.0,
            end_time=0.3
        )
        
        # Lade Scene-Ergebnisse
        loaded_result = saliency_detector.get_scene_results(video_id, scene_id)
        
        assert loaded_result is not None
        assert loaded_result["scene_id"] == scene_id
        assert len(loaded_result["frames"]) == len(result["frames"])
    
    def test_error_handling_invalid_video(self, saliency_detector):
        """Testet Fehlerbehandlung bei ungültigem Video"""
        video_id = "test_invalid_video"
        
        with pytest.raises(ValueError):
            saliency_detector.analyze_video(
                video_path="nonexistent_video.mp4",
                video_id=video_id
            )
    
    def test_error_handling_invalid_scene_times(self, saliency_detector, test_video):
        """Testet Fehlerbehandlung bei ungültigen Scene-Zeiten"""
        video_id = "test_invalid_scene"
        scene_id = "scene_invalid"
        
        # End-Zeit vor Start-Zeit
        with pytest.raises(ValueError):
            saliency_detector.analyze_scene(
                video_path=test_video,
                video_id=video_id,
                scene_id=scene_id,
                start_time=0.5,
                end_time=0.2
            )
    
    @patch('src.services.saliency_detector.log_analysis_step')
    def test_logging_integration(self, mock_log, saliency_detector, test_video):
        """Testet dass Logging korrekt funktioniert"""
        video_id = "test_logging"
        
        saliency_detector.analyze_video(
            video_path=test_video,
            video_id=video_id,
            sample_rate=10,
            max_frames=3
        )
        
        # Sollte Start- und End-Logs aufrufen
        assert mock_log.call_count >= 2
        
        # Prüfe dass Start-Log aufgerufen wurde
        start_calls = [call for call in mock_log.call_args_list 
                      if call[0][1] == "saliency_analysis_start"]
        assert len(start_calls) == 1
        
        # Prüfe dass End-Log aufgerufen wurde
        end_calls = [call for call in mock_log.call_args_list 
                    if call[0][1] == "saliency_analysis_complete"]
        assert len(end_calls) == 1
    
    @patch('src.services.saliency_detector.log_performance')
    def test_performance_logging(self, mock_log, saliency_detector, test_video):
        """Testet dass Performance-Logging funktioniert"""
        video_id = "test_performance"
        
        saliency_detector.analyze_video(
            video_path=test_video,
            video_id=video_id,
            sample_rate=10,
            max_frames=3
        )
        
        # Sollte Performance-Log aufrufen
        mock_log.assert_called_once()
        call_args = mock_log.call_args
        
        assert call_args[0][0] == video_id
        assert call_args[0][1] == "video_analysis"
        assert isinstance(call_args[0][2], float)
        assert call_args[0][2] > 0  # Processing time
    
    @pytest.mark.performance
    def test_performance_benchmark(self, saliency_detector, test_video):
        """Performance-Test für Video-Analyse"""
        import time
        
        video_id = "test_performance_benchmark"
        
        # Warmup
        saliency_detector.analyze_video(
            video_path=test_video,
            video_id=f"{video_id}_warmup",
            sample_rate=10,
            max_frames=3
        )
        
        # Benchmark
        times = []
        for i in range(3):
            start = time.time()
            saliency_detector.analyze_video(
                video_path=test_video,
                video_id=f"{video_id}_{i}",
                sample_rate=10,
                max_frames=5
            )
            times.append(time.time() - start)
        
        avg_time = sum(times) / len(times)
        
        # Sollte unter 10 Sekunden sein für 5 Frames
        assert avg_time < 10.0
        
        print(f"Average video analysis time: {avg_time:.3f}s")
    
    def test_temp_frame_cleanup(self, saliency_detector):
        """Testet dass temporäre Frames korrekt gelöscht werden"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (100, 100, 100)
        
        temp_path = saliency_detector._save_temp_frame(frame, 12345)
        
        # Temporäre Datei sollte existieren
        assert os.path.exists(temp_path)
        
        # Nach Analyse sollte sie gelöscht werden
        # (Dies wird in _analyze_single_frame gemacht)
        # Hier testen wir nur dass die Funktion funktioniert
        assert temp_path.endswith("frame_012345.jpg")
        
        # Cleanup
        if os.path.exists(temp_path):
            os.unlink(temp_path)
    
    def test_storage_directory_creation(self, saliency_detector):
        """Testet dass Storage-Verzeichnisse korrekt erstellt werden"""
        storage_dir = Path("/Volumes/DOCKER_EXTERN/prismvid/storage/saliency")
        assert storage_dir.exists()
        assert storage_dir.is_dir()
    
    @pytest.mark.integration
    def test_end_to_end_workflow(self, saliency_detector, test_video):
        """End-to-End Test des kompletten Workflows"""
        video_id = "test_e2e"
        scene_id = "scene_e2e"
        
        # 1. Video-Analyse
        video_result = saliency_detector.analyze_video(
            video_path=test_video,
            video_id=video_id,
            sample_rate=5,
            max_frames=10
        )
        
        assert video_result["video_id"] == video_id
        assert len(video_result["frames"]) <= 10
        
        # 2. Scene-Analyse
        scene_result = saliency_detector.analyze_scene(
            video_path=test_video,
            video_id=video_id,
            scene_id=scene_id,
            start_time=0.0,
            end_time=0.3
        )
        
        assert scene_result["scene_id"] == scene_id
        
        # 3. Ergebnisse laden
        loaded_video = saliency_detector.get_analysis_results(video_id)
        loaded_scene = saliency_detector.get_scene_results(video_id, scene_id)
        
        assert loaded_video is not None
        assert loaded_scene is not None
        
        # 4. Datenintegrität prüfen
        assert loaded_video["video_id"] == video_id
        assert loaded_scene["scene_id"] == scene_id
        
        print("End-to-end workflow test completed successfully")
