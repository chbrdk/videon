"""
Visual Tests für Heatmap Generator
Testet Video-Generierung und Visualisierungsqualität
"""
import pytest
import cv2
import numpy as np
import tempfile
import os
import json
from pathlib import Path
from unittest.mock import Mock, patch

from src.services.heatmap_generator import HeatmapGenerator

class TestHeatmapGenerator:
    """Test-Klasse für Heatmap Generator"""
    
    @pytest.fixture
    def test_video(self):
        """Erstellt ein Test-Video"""
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fps = 30.0
        width, height = 640, 480
        
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            video_path = tmp.name
        
        out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))
        
        # Schreibe 30 Frames
        for i in range(30):
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
        
        os.unlink(video_path)
    
    @pytest.fixture
    def saliency_data(self):
        """Erstellt Test-Saliency-Daten"""
        frames = []
        
        for i in range(0, 30, 5):  # Jedes 5. Frame
            # Simuliere Saliency Map (480x640)
            saliency_map = np.zeros((480, 640), dtype=np.uint8)
            
            # Zentrale Region mit hoher Saliency
            cv2.rectangle(saliency_map, (200, 150), (440, 330), 200, -1)
            
            # Kleine Region mit sehr hoher Saliency
            center_x = int(320 + 50 * np.sin(i * 0.2))
            center_y = int(240 + 30 * np.cos(i * 0.2))
            cv2.circle(saliency_map, (center_x, center_y), 20, 255, -1)
            
            # ROI-Vorschläge
            roi_suggestions = [
                {
                    "x": center_x - 50,
                    "y": center_y - 50,
                    "width": 100,
                    "height": 178,  # 9:16 Aspect Ratio
                    "score": 0.9,
                    "method": "saliency_threshold"
                },
                {
                    "x": 200,
                    "y": 150,
                    "width": 240,
                    "height": 427,  # 9:16 Aspect Ratio
                    "score": 0.7,
                    "method": "sliding_window"
                }
            ]
            
            frame_data = {
                "frame_number": i,
                "timestamp": i / 30.0,
                "saliency_data": saliency_map.flatten().tolist(),
                "saliency_stats": {
                    "mean": float(np.mean(saliency_map)),
                    "std": float(np.std(saliency_map)),
                    "max": int(np.max(saliency_map)),
                    "min": int(np.min(saliency_map)),
                    "shape": [480, 640]
                },
                "roi_suggestions": roi_suggestions,
                "processing_time": 0.1,
                "model_version": "sam2.1_small"
            }
            
            frames.append(frame_data)
        
        return {
            "video_id": "test_video",
            "frames": frames,
            "metadata": {
                "video_info": {
                    "frame_count": 30,
                    "fps": 30.0,
                    "duration": 1.0,
                    "width": 640,
                    "height": 480
                }
            }
        }
    
    @pytest.fixture
    def heatmap_generator(self):
        """Erstellt Heatmap Generator Instance"""
        return HeatmapGenerator()
    
    def test_initialization(self, heatmap_generator):
        """Testet Initialisierung"""
        assert heatmap_generator.storage_dir.exists()
        assert len(heatmap_generator.colormaps) > 0
        assert "jet" in heatmap_generator.colormaps
        assert "hot" in heatmap_generator.colormaps
        assert "viridis" in heatmap_generator.colormaps
    
    def test_create_heatmap_video(self, heatmap_generator, test_video, saliency_data):
        """Testet Heatmap-Video-Erstellung"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            output_path = tmp.name
        
        try:
            result_path = heatmap_generator.create_heatmap_video(
                video_path=test_video,
                saliency_data=saliency_data,
                output_path=output_path,
                colormap="jet",
                opacity=0.5
            )
            
            assert result_path == output_path
            assert os.path.exists(output_path)
            
            # Prüfe dass Video gültig ist
            cap = cv2.VideoCapture(output_path)
            assert cap.isOpened()
            
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            assert frame_count == 30
            assert fps == 30.0
            assert width == 640
            assert height == 480
            
            cap.release()
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_create_comparison_video(self, heatmap_generator, test_video, saliency_data):
        """Testet Vergleichsvideo-Erstellung"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            output_path = tmp.name
        
        try:
            result_path = heatmap_generator.create_comparison_video(
                original_path=test_video,
                saliency_data=saliency_data,
                output_path=output_path,
                colormap="jet"
            )
            
            assert result_path == output_path
            assert os.path.exists(output_path)
            
            # Prüfe dass Video gültig ist
            cap = cv2.VideoCapture(output_path)
            assert cap.isOpened()
            
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            assert frame_count == 30
            assert fps == 30.0
            assert width == 1920  # 3 * 640
            assert height == 480
            
            cap.release()
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_create_roi_preview_video(self, heatmap_generator, test_video, saliency_data):
        """Testet ROI-Preview-Video-Erstellung"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            output_path = tmp.name
        
        try:
            result_path = heatmap_generator.create_roi_preview_video(
                video_path=test_video,
                saliency_data=saliency_data,
                output_path=output_path,
                roi_index=0,
                aspect_ratio=(9, 16)
            )
            
            assert result_path == output_path
            assert os.path.exists(output_path)
            
            # Prüfe dass Video gültig ist
            cap = cv2.VideoCapture(output_path)
            assert cap.isOpened()
            
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            assert frame_count == 30
            assert fps == 30.0
            
            # ROI sollte 9:16 Aspect Ratio haben
            expected_ratio = 9 / 16
            actual_ratio = width / height
            assert abs(actual_ratio - expected_ratio) < 0.1
            
            cap.release()
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_different_colormaps(self, heatmap_generator, test_video, saliency_data):
        """Testet verschiedene Colormaps"""
        colormaps = ["jet", "hot", "viridis", "plasma"]
        
        for colormap in colormaps:
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
                output_path = tmp.name
            
            try:
                result_path = heatmap_generator.create_heatmap_video(
                    video_path=test_video,
                    saliency_data=saliency_data,
                    output_path=output_path,
                    colormap=colormap
                )
                
                assert os.path.exists(output_path)
                
            finally:
                if os.path.exists(output_path):
                    os.unlink(output_path)
    
    def test_different_opacity_levels(self, heatmap_generator, test_video, saliency_data):
        """Testet verschiedene Opacity-Level"""
        opacity_levels = [0.2, 0.5, 0.8]
        
        for opacity in opacity_levels:
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
                output_path = tmp.name
            
            try:
                result_path = heatmap_generator.create_heatmap_video(
                    video_path=test_video,
                    saliency_data=saliency_data,
                    output_path=output_path,
                    opacity=opacity
                )
                
                assert os.path.exists(output_path)
                
            finally:
                if os.path.exists(output_path):
                    os.unlink(output_path)
    
    def test_different_aspect_ratios(self, heatmap_generator, test_video, saliency_data):
        """Testet verschiedene Aspect Ratios für ROI-Preview"""
        aspect_ratios = [(16, 9), (9, 16), (4, 3), (1, 1)]
        
        for aspect_ratio in aspect_ratios:
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
                output_path = tmp.name
            
            try:
                result_path = heatmap_generator.create_roi_preview_video(
                    video_path=test_video,
                    saliency_data=saliency_data,
                    output_path=output_path,
                    aspect_ratio=aspect_ratio
                )
                
                assert os.path.exists(output_path)
                
                # Prüfe Aspect Ratio
                cap = cv2.VideoCapture(output_path)
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                cap.release()
                
                expected_ratio = aspect_ratio[0] / aspect_ratio[1]
                actual_ratio = width / height
                assert abs(actual_ratio - expected_ratio) < 0.1
                
            finally:
                if os.path.exists(output_path):
                    os.unlink(output_path)
    
    def test_generate_all_visualizations(self, heatmap_generator, test_video, saliency_data):
        """Testet Generierung aller Visualisierungen"""
        video_id = "test_all_viz"
        
        try:
            results = heatmap_generator.generate_all_visualizations(
                video_path=test_video,
                video_id=video_id,
                saliency_data=saliency_data
            )
            
            assert isinstance(results, dict)
            assert "heatmap" in results
            assert "comparison" in results
            
            # Prüfe dass alle Videos erstellt wurden
            for key, path in results.items():
                assert os.path.exists(path)
                
                # Prüfe dass Video gültig ist
                cap = cv2.VideoCapture(path)
                assert cap.isOpened()
                cap.release()
            
            # Cleanup
            for path in results.values():
                if os.path.exists(path):
                    os.unlink(path)
            
            # Cleanup Verzeichnis
            video_dir = heatmap_generator.storage_dir / video_id
            if video_dir.exists():
                import shutil
                shutil.rmtree(video_dir)
                
        except Exception as e:
            # Cleanup bei Fehler
            video_dir = heatmap_generator.storage_dir / video_id
            if video_dir.exists():
                import shutil
                shutil.rmtree(video_dir)
            raise
    
    def test_error_handling_invalid_video(self, heatmap_generator, saliency_data):
        """Testet Fehlerbehandlung bei ungültigem Video"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            output_path = tmp.name
        
        try:
            with pytest.raises(ValueError):
                heatmap_generator.create_heatmap_video(
                    video_path="nonexistent_video.mp4",
                    saliency_data=saliency_data,
                    output_path=output_path
                )
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_error_handling_invalid_colormap(self, heatmap_generator, test_video, saliency_data):
        """Testet Fehlerbehandlung bei ungültiger Colormap"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            output_path = tmp.name
        
        try:
            # Sollte Fallback zu "jet" verwenden
            result_path = heatmap_generator.create_heatmap_video(
                video_path=test_video,
                saliency_data=saliency_data,
                output_path=output_path,
                colormap="invalid_colormap"
            )
            
            assert os.path.exists(output_path)
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    @pytest.mark.visual
    def test_visual_quality_heatmap(self, heatmap_generator, test_video, saliency_data):
        """Visueller Test für Heatmap-Qualität"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            output_path = tmp.name
        
        try:
            heatmap_generator.create_heatmap_video(
                video_path=test_video,
                saliency_data=saliency_data,
                output_path=output_path,
                colormap="jet",
                opacity=0.5,
                show_roi=True,
                show_info=True
            )
            
            # Lese ersten Frame und prüfe visuelle Qualität
            cap = cv2.VideoCapture(output_path)
            ret, frame = cap.read()
            cap.release()
            
            assert ret
            assert frame is not None
            
            # Frame sollte nicht komplett schwarz oder weiß sein
            assert frame.mean() > 10
            assert frame.mean() < 245
            
            # Sollte Variation haben
            assert frame.std() > 5
            
            print(f"Heatmap frame mean: {frame.mean():.1f}")
            print(f"Heatmap frame std: {frame.std():.1f}")
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    @pytest.mark.visual
    def test_visual_quality_comparison(self, heatmap_generator, test_video, saliency_data):
        """Visueller Test für Vergleichsvideo-Qualität"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            output_path = tmp.name
        
        try:
            heatmap_generator.create_comparison_video(
                original_path=test_video,
                saliency_data=saliency_data,
                output_path=output_path,
                colormap="jet"
            )
            
            # Lese ersten Frame und prüfe dass alle 3 Bereiche vorhanden sind
            cap = cv2.VideoCapture(output_path)
            ret, frame = cap.read()
            cap.release()
            
            assert ret
            assert frame is not None
            
            # Frame sollte 3x breiter sein
            assert frame.shape[1] == 1920  # 3 * 640
            
            # Alle 3 Bereiche sollten unterschiedlich aussehen
            left_section = frame[:, :640]
            middle_section = frame[:, 640:1280]
            right_section = frame[:, 1280:]
            
            # Sollten nicht identisch sein
            assert not np.array_equal(left_section, middle_section)
            assert not np.array_equal(middle_section, right_section)
            
            print("Comparison video visual test passed")
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    @pytest.mark.performance
    def test_performance_benchmark(self, heatmap_generator, test_video, saliency_data):
        """Performance-Test für Video-Generierung"""
        import time
        
        # Test Heatmap-Generierung
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            output_path = tmp.name
        
        try:
            start = time.time()
            heatmap_generator.create_heatmap_video(
                video_path=test_video,
                saliency_data=saliency_data,
                output_path=output_path
            )
            heatmap_time = time.time() - start
            
            # Sollte unter 30 Sekunden sein für 30 Frames
            assert heatmap_time < 30.0
            
            print(f"Heatmap generation time: {heatmap_time:.3f}s")
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_frame_info_drawing(self, heatmap_generator):
        """Testet Frame-Info-Zeichnung"""
        # Erstelle Test-Frame
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (100, 100, 100)
        
        frame_data = {
            "timestamp": 1.5,
            "saliency_stats": {"mean": 150.5},
            "roi_suggestions": [{"score": 0.8}, {"score": 0.6}]
        }
        
        # Zeichne Frame-Info
        result_frame = heatmap_generator._draw_frame_info(frame, 45, frame_data)
        
        # Frame sollte modifiziert worden sein
        assert not np.array_equal(frame, result_frame)
        
        # Sollte Text enthalten (Pixel-Werte sollten sich geändert haben)
        assert result_frame.std() > frame.std()
    
    def test_roi_boxes_drawing(self, heatmap_generator):
        """Testet ROI-Box-Zeichnung"""
        # Erstelle Test-Frame
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (100, 100, 100)
        
        roi_suggestions = [
            {"x": 100, "y": 100, "width": 200, "height": 200, "score": 0.9},
            {"x": 300, "y": 200, "width": 150, "height": 150, "score": 0.5}
        ]
        
        # Zeichne ROI-Boxen
        result_frame = heatmap_generator._draw_roi_boxes(frame, roi_suggestions)
        
        # Frame sollte modifiziert worden sein
        assert not np.array_equal(frame, result_frame)
        
        # Sollte Boxen enthalten (Pixel-Werte sollten sich geändert haben)
        assert result_frame.std() > frame.std()
