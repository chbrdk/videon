"""
Unit Tests für SAM Wrapper
Testet Core ML Integration und Fallback-Funktionalität
"""
import pytest
import numpy as np
import cv2
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch

from src.models.sam_wrapper import SAMSaliencyModel

class TestSAMSaliencyModel:
    """Test-Klasse für SAM Saliency Model"""
    
    @pytest.fixture
    def test_image(self):
        """Erstellt ein Test-Bild"""
        # Erstelle ein Test-Bild mit verschiedenen Bereichen
        image = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Hintergrund
        image[:] = (50, 50, 50)
        
        # Zentrale Region mit hoher Saliency (heller)
        cv2.rectangle(image, (200, 150), (440, 330), (200, 200, 200), -1)
        
        # Kleine Region mit sehr hoher Saliency
        cv2.circle(image, (320, 240), 30, (255, 255, 255), -1)
        
        return image
    
    @pytest.fixture
    def temp_image_file(self, test_image):
        """Erstellt temporäre Bilddatei"""
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            cv2.imwrite(tmp.name, test_image)
            yield tmp.name
        os.unlink(tmp.name)
    
    @pytest.fixture
    def sam_model(self):
        """Erstellt SAM Model Instance"""
        return SAMSaliencyModel(model_type="sam2.1_small", use_coreml=False)
    
    def test_model_initialization(self):
        """Testet Modell-Initialisierung"""
        model = SAMSaliencyModel(model_type="sam2.1_small", use_coreml=False)
        assert model.model_type == "sam2.1_small"
        assert model.use_coreml == False
        assert model.device in ["mps", "cuda", "cpu"]
    
    def test_device_detection(self):
        """Testet Device-Erkennung"""
        model = SAMSaliencyModel()
        assert model.device in ["mps", "cuda", "cpu"]
    
    def test_generate_saliency_map(self, sam_model, temp_image_file):
        """Testet Saliency Map Generierung"""
        saliency_map = sam_model.generate_saliency_map(temp_image_file)
        
        assert isinstance(saliency_map, np.ndarray)
        assert saliency_map.dtype == np.uint8
        assert saliency_map.shape == (480, 640)  # Höhe, Breite
        assert saliency_map.min() >= 0
        assert saliency_map.max() <= 255
    
    def test_saliency_map_content(self, sam_model, temp_image_file):
        """Testet dass Saliency Map sinnvolle Werte enthält"""
        saliency_map = sam_model.generate_saliency_map(temp_image_file)
        
        # Sollte nicht komplett schwarz oder weiß sein
        assert saliency_map.mean() > 10
        assert saliency_map.mean() < 245
        
        # Sollte Variation haben
        assert saliency_map.std() > 5
    
    def test_roi_suggestions(self, sam_model, temp_image_file):
        """Testet ROI-Vorschläge Generierung"""
        saliency_map = sam_model.generate_saliency_map(temp_image_file)
        rois = sam_model.get_roi_suggestions(saliency_map, aspect_ratio=(9, 16), num_suggestions=3)
        
        assert isinstance(rois, list)
        assert len(rois) <= 3
        assert len(rois) > 0
        
        for roi in rois:
            assert "x" in roi
            assert "y" in roi
            assert "width" in roi
            assert "height" in roi
            assert "score" in roi
            assert "method" in roi
            
            # ROI sollte innerhalb des Bildes liegen
            assert 0 <= roi["x"] < 640
            assert 0 <= roi["y"] < 480
            assert roi["x"] + roi["width"] <= 640
            assert roi["y"] + roi["height"] <= 480
            
            # Score sollte zwischen 0 und 1 liegen
            assert 0 <= roi["score"] <= 1
    
    def test_roi_aspect_ratio(self, sam_model, temp_image_file):
        """Testet dass ROI-Vorschläge das richtige Seitenverhältnis haben"""
        saliency_map = sam_model.generate_saliency_map(temp_image_file)
        
        # Test verschiedene Aspect Ratios
        aspect_ratios = [(16, 9), (9, 16), (4, 3), (1, 1)]
        
        for aspect_ratio in aspect_ratios:
            rois = sam_model.get_roi_suggestions(saliency_map, aspect_ratio=aspect_ratio)
            
            for roi in rois:
                actual_ratio = roi["width"] / roi["height"]
                expected_ratio = aspect_ratio[0] / aspect_ratio[1]
                
                # Toleranz von 10% für Rundungsfehler
                assert abs(actual_ratio - expected_ratio) / expected_ratio < 0.1
    
    def test_analyze_frame(self, sam_model, temp_image_file):
        """Testet vollständige Frame-Analyse"""
        result = sam_model.analyze_frame(temp_image_file, aspect_ratio=(9, 16))
        
        assert isinstance(result, dict)
        assert "saliency_map" in result
        assert "saliency_stats" in result
        assert "roi_suggestions" in result
        assert "processing_time" in result
        assert "model_version" in result
        assert "device" in result
        
        # Saliency Map sollte Liste sein (für JSON-Serialisierung)
        assert isinstance(result["saliency_map"], list)
        
        # Statistiken sollten sinnvolle Werte haben
        stats = result["saliency_stats"]
        assert "mean" in stats
        assert "std" in stats
        assert "max" in stats
        assert "min" in stats
        assert "shape" in stats
        
        assert 0 <= stats["mean"] <= 255
        assert 0 <= stats["max"] <= 255
        assert 0 <= stats["min"] <= 255
        assert stats["shape"] == [480, 640]
        
        # Processing Time sollte positiv sein
        assert result["processing_time"] > 0
    
    def test_error_handling_invalid_image(self, sam_model):
        """Testet Fehlerbehandlung bei ungültigem Bild"""
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            # Schreibe ungültige Daten
            tmp.write(b"invalid image data")
            tmp.flush()
            
            saliency_map = sam_model.generate_saliency_map(tmp.name)
            
            # Sollte Fallback-Werte zurückgeben
            assert isinstance(saliency_map, np.ndarray)
            assert saliency_map.shape[0] > 0
            assert saliency_map.shape[1] > 0
        
        os.unlink(tmp.name)
    
    def test_error_handling_nonexistent_file(self, sam_model):
        """Testet Fehlerbehandlung bei nicht existierender Datei"""
        saliency_map = sam_model.generate_saliency_map("nonexistent_file.jpg")
        
        # Sollte Fallback-Werte zurückgeben
        assert isinstance(saliency_map, np.ndarray)
    
    @patch('src.models.sam_wrapper.ct.models.MLModel')
    def test_coreml_fallback(self, mock_coreml, temp_image_file):
        """Testet Fallback von Core ML zu OpenCV"""
        # Mock Core ML Fehler
        mock_coreml.side_effect = Exception("Core ML not available")
        
        model = SAMSaliencyModel(model_type="sam2.1_small", use_coreml=True)
        saliency_map = model.generate_saliency_map(temp_image_file)
        
        assert isinstance(saliency_map, np.ndarray)
        assert saliency_map.shape == (480, 640)
    
    def test_performance_metrics(self, sam_model, temp_image_file):
        """Testet dass Performance-Metriken korrekt geloggt werden"""
        with patch('src.models.sam_wrapper.log_performance') as mock_log:
            result = sam_model.analyze_frame(temp_image_file)
            
            # Sollte Performance-Log aufrufen
            mock_log.assert_called_once()
            call_args = mock_log.call_args
            
            assert call_args[0][0] == "frame_analysis"
            assert call_args[0][1] == "analyze_frame"
            assert isinstance(call_args[0][2], float)
            assert call_args[0][2] > 0  # Processing time
    
    def test_model_version_tracking(self, sam_model, temp_image_file):
        """Testet dass Modell-Version korrekt getrackt wird"""
        result = sam_model.analyze_frame(temp_image_file)
        
        assert result["model_version"] == "sam2.1_small"
        assert result["device"] in ["mps", "cuda", "cpu"]
    
    @pytest.mark.performance
    def test_performance_benchmark(self, sam_model, temp_image_file):
        """Performance-Test für Saliency Map Generierung"""
        import time
        
        # Warmup
        sam_model.generate_saliency_map(temp_image_file)
        
        # Benchmark
        times = []
        for _ in range(5):
            start = time.time()
            sam_model.generate_saliency_map(temp_image_file)
            times.append(time.time() - start)
        
        avg_time = sum(times) / len(times)
        
        # Sollte unter 1 Sekunde sein (für OpenCV Fallback)
        assert avg_time < 1.0
        
        print(f"Average processing time: {avg_time:.3f}s")
    
    @pytest.mark.visual
    def test_visual_validation(self, sam_model, temp_image_file):
        """Visueller Test für Saliency Map Qualität"""
        saliency_map = sam_model.generate_saliency_map(temp_image_file)
        
        # Zentrale Region sollte höhere Saliency haben
        center_region = saliency_map[200:280, 250:390]  # Zentrale Region
        edge_region = saliency_map[50:130, 50:190]      # Ecke
        
        center_mean = np.mean(center_region)
        edge_mean = np.mean(edge_region)
        
        # Zentrale Region sollte höhere Saliency haben
        assert center_mean > edge_mean
        
        print(f"Center region saliency: {center_mean:.1f}")
        print(f"Edge region saliency: {edge_mean:.1f}")
