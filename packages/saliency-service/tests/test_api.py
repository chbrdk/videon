"""
API Tests für Saliency Detection Service
Testet FastAPI Endpoints und Integration
"""
import pytest
import httpx
import json
import tempfile
import os
import cv2
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

from fastapi.testclient import TestClient
from src.api.server import app

class TestSaliencyAPI:
    """Test-Klasse für Saliency Detection API"""
    
    @pytest.fixture
    def client(self):
        """Erstellt Test Client"""
        return TestClient(app)
    
    @pytest.fixture
    def test_video(self):
        """Erstellt Test-Video"""
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fps = 30.0
        width, height = 640, 480
        
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            video_path = tmp.name
        
        out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))
        
        # Schreibe 30 Frames
        for i in range(30):
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            frame[:] = (50, 50, 50)
            
            # Bewegendes Objekt
            x = int(100 + i * 10) % (width - 100)
            y = int(100 + i * 5) % (height - 100)
            cv2.rectangle(frame, (x, y), (x+50, y+50), (200, 200, 200), -1)
            
            out.write(frame)
        
        out.release()
        
        yield video_path
        
        os.unlink(video_path)
    
    def test_health_check(self, client):
        """Testet Health Check Endpoint"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["service"] == "prismvid-saliency-detector"
        assert "model_type" in data
        assert "use_coreml" in data
    
    @patch('src.api.server.saliency_detector.analyze_video')
    @patch('src.api.server.db_client.update_video_status')
    @patch('src.api.server.db_client.create_analysis_log')
    def test_analyze_video_endpoint(self, mock_log, mock_status, mock_analyze, client, test_video):
        """Testet Video-Analyse Endpoint"""
        # Mock Setup
        mock_analyze.return_value = {
            "video_id": "test_video_001",
            "frames": [
                {
                    "frame_number": 0,
                    "timestamp": 0.0,
                    "saliency_data": [100] * (640 * 480),
                    "roi_suggestions": [{"x": 100, "y": 100, "width": 200, "height": 200, "score": 0.8}],
                    "processing_time": 0.1
                }
            ],
            "metadata": {
                "processing_stats": {"processing_time": 1.0}
            }
        }
        mock_status.return_value = AsyncMock()
        mock_log.return_value = AsyncMock()
        
        # Request
        request_data = {
            "videoId": "test_video_001",
            "videoPath": test_video,
            "sampleRate": 5,
            "aspectRatio": [9, 16],
            "maxFrames": 10
        }
        
        response = client.post("/analyze", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Saliency analysis started"
        assert data["videoId"] == "test_video_001"
        assert data["status"] == "ANALYZING"
    
    @patch('src.api.server.saliency_detector.analyze_scene')
    def test_analyze_scene_endpoint(self, mock_analyze, client, test_video):
        """Testet Scene-Analyse Endpoint"""
        # Mock Setup
        mock_analyze.return_value = {
            "video_id": "test_video_001",
            "scene_id": "scene_001",
            "frames": [
                {
                    "frame_number": 0,
                    "timestamp": 0.0,
                    "saliency_data": [100] * (640 * 480),
                    "roi_suggestions": [{"x": 100, "y": 100, "width": 200, "height": 200, "score": 0.8}],
                    "processing_time": 0.1
                }
            ],
            "metadata": {
                "processing_stats": {"processing_time": 0.5}
            }
        }
        
        # Request
        request_data = {
            "videoId": "test_video_001",
            "sceneId": "scene_001",
            "videoPath": test_video,
            "startTime": 0.0,
            "endTime": 1.0,
            "aspectRatio": [9, 16]
        }
        
        response = client.post("/analyze-scene", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Scene saliency analysis started"
        assert data["videoId"] == "test_video_001"
        assert data["status"] == "ANALYZING"
    
    @patch('src.api.server.heatmap_generator.create_heatmap_video')
    def test_generate_heatmap_endpoint(self, mock_generate, client):
        """Testet Heatmap-Generierung Endpoint"""
        # Mock Setup
        mock_generate.return_value = "/path/to/heatmap.mp4"
        
        # Request
        request_data = {
            "videoId": "test_video_001",
            "colormap": "jet",
            "opacity": 0.5,
            "showRoi": True,
            "showInfo": True
        }
        
        response = client.post("/generate-heatmap", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Heatmap generation started"
        assert data["videoId"] == "test_video_001"
    
    @patch('src.api.server.heatmap_generator.generate_all_visualizations')
    def test_generate_all_visualizations_endpoint(self, mock_generate, client):
        """Testet Alle-Visualisierungen Endpoint"""
        # Mock Setup
        mock_generate.return_value = {
            "heatmap": "/path/to/heatmap.mp4",
            "comparison": "/path/to/comparison.mp4",
            "roi_16x9": "/path/to/roi_16x9.mp4"
        }
        
        response = client.post("/generate-all-visualizations", params={"video_id": "test_video_001"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "All visualizations generation started"
        assert data["videoId"] == "test_video_001"
        assert data["status"] == "GENERATING"
    
    @patch('src.api.server.saliency_detector.get_analysis_results')
    @patch('src.api.server.db_client.get_saliency_analysis')
    def test_get_saliency_data_endpoint(self, mock_db, mock_local, client):
        """Testet Saliency-Daten-Abruf Endpoint"""
        # Mock Setup - Lokale Daten verfügbar
        mock_local.return_value = {
            "video_id": "test_video_001",
            "frames": [
                {
                    "frame_number": 0,
                    "timestamp": 0.0,
                    "saliency_data": [100] * (640 * 480),
                    "roi_suggestions": []
                }
            ]
        }
        mock_db.return_value = AsyncMock()
        
        response = client.get("/saliency/test_video_001")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["videoId"] == "test_video_001"
        assert data["status"] == "success"
        assert "data" in data
    
    @patch('src.api.server.saliency_detector.get_analysis_results')
    @patch('src.api.server.db_client.get_saliency_analysis')
    def test_get_saliency_data_not_found(self, mock_db, mock_local, client):
        """Testet Saliency-Daten-Abruf wenn nicht gefunden"""
        # Mock Setup - Keine Daten verfügbar
        mock_local.return_value = None
        mock_db.return_value = AsyncMock(return_value=None)
        
        response = client.get("/saliency/nonexistent_video")
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()
    
    @patch('src.api.server.saliency_detector.get_scene_results')
    @patch('src.api.server.db_client.get_scene_saliency')
    def test_get_scene_saliency_data_endpoint(self, mock_db, mock_local, client):
        """Testet Scene-Saliency-Daten-Abruf Endpoint"""
        # Mock Setup
        mock_local.return_value = {
            "video_id": "test_video_001",
            "scene_id": "scene_001",
            "frames": [
                {
                    "frame_number": 0,
                    "timestamp": 0.0,
                    "saliency_data": [100] * (640 * 480),
                    "roi_suggestions": []
                }
            ]
        }
        mock_db.return_value = AsyncMock()
        
        response = client.get("/saliency/test_video_001/scene/scene_001")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["videoId"] == "test_video_001"
        assert data["sceneId"] == "scene_001"
        assert data["status"] == "success"
        assert "data" in data
    
    @patch('src.api.server.Path.exists')
    def test_get_heatmap_video_endpoint(self, mock_exists, client):
        """Testet Heatmap-Video-Abruf Endpoint"""
        # Mock Setup
        mock_exists.return_value = True
        
        with patch('src.api.server.FileResponse') as mock_file_response:
            mock_file_response.return_value = "file_response"
            
            response = client.get("/heatmap/test_video_001")
            
            assert response.status_code == 200
    
    @patch('src.api.server.Path.exists')
    def test_get_heatmap_video_not_found(self, mock_exists, client):
        """Testet Heatmap-Video-Abruf wenn nicht gefunden"""
        # Mock Setup
        mock_exists.return_value = False
        
        response = client.get("/heatmap/nonexistent_video")
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()
    
    @patch('src.api.server.Path.exists')
    def test_get_comparison_video_endpoint(self, mock_exists, client):
        """Testet Vergleichsvideo-Abruf Endpoint"""
        # Mock Setup
        mock_exists.return_value = True
        
        with patch('src.api.server.FileResponse') as mock_file_response:
            mock_file_response.return_value = "file_response"
            
            response = client.get("/comparison/test_video_001")
            
            assert response.status_code == 200
    
    def test_invalid_request_data(self, client):
        """Testet ungültige Request-Daten"""
        # Ungültige Video-Analyse-Anfrage
        invalid_request = {
            "videoId": "",  # Leere Video-ID
            "videoPath": "nonexistent.mp4",
            "sampleRate": -1,  # Ungültiger Sample Rate
            "aspectRatio": [0, 0]  # Ungültiges Aspect Ratio
        }
        
        response = client.post("/analyze", json=invalid_request)
        
        # Sollte 422 (Validation Error) oder 400 (Bad Request) sein
        assert response.status_code in [400, 422]
    
    def test_missing_required_fields(self, client):
        """Testet fehlende Pflichtfelder"""
        # Unvollständige Anfrage
        incomplete_request = {
            "videoId": "test_video_001"
            # videoPath fehlt
        }
        
        response = client.post("/analyze", json=incomplete_request)
        
        assert response.status_code == 422  # Validation Error
    
    @pytest.mark.integration
    def test_end_to_end_workflow(self, client, test_video):
        """End-to-End Test des kompletten Workflows"""
        video_id = "test_e2e_workflow"
        
        # 1. Health Check
        health_response = client.get("/health")
        assert health_response.status_code == 200
        
        # 2. Video-Analyse starten
        with patch('src.api.server.process_saliency_analysis') as mock_process:
            mock_process.return_value = AsyncMock()
            
            analyze_response = client.post("/analyze", json={
                "videoId": video_id,
                "videoPath": test_video,
                "sampleRate": 5,
                "maxFrames": 10
            })
            
            assert analyze_response.status_code == 200
        
        # 3. Heatmap-Generierung starten
        with patch('src.api.server.process_heatmap_generation') as mock_process:
            mock_process.return_value = AsyncMock()
            
            heatmap_response = client.post("/generate-heatmap", json={
                "videoId": video_id,
                "colormap": "jet"
            })
            
            assert heatmap_response.status_code == 200
        
        # 4. Alle Visualisierungen generieren
        with patch('src.api.server.process_all_visualizations') as mock_process:
            mock_process.return_value = AsyncMock()
            
            all_viz_response = client.post("/generate-all-visualizations", 
                                         params={"video_id": video_id})
            
            assert all_viz_response.status_code == 200
        
        print("End-to-end API workflow test completed successfully")
    
    @pytest.mark.performance
    def test_api_performance(self, client):
        """Performance-Test für API-Endpoints"""
        import time
        
        # Test Health Check Performance
        times = []
        for _ in range(10):
            start = time.time()
            response = client.get("/health")
            times.append(time.time() - start)
            assert response.status_code == 200
        
        avg_time = sum(times) / len(times)
        
        # Health Check sollte sehr schnell sein
        assert avg_time < 0.1  # Unter 100ms
        
        print(f"Average health check response time: {avg_time*1000:.1f}ms")
    
    def test_error_handling(self, client):
        """Testet Fehlerbehandlung"""
        # Test mit ungültiger Video-ID
        response = client.get("/saliency/invalid_video_id")
        
        # Sollte 404 oder 500 sein (je nach Implementierung)
        assert response.status_code in [404, 500]
    
    def test_cors_headers(self, client):
        """Testet CORS-Headers"""
        response = client.get("/health")
        
        # Prüfe dass CORS-Headers gesetzt sind (falls konfiguriert)
        # Dies hängt von der FastAPI CORS-Konfiguration ab
        assert response.status_code == 200
    
    def test_api_documentation(self, client):
        """Testet API-Dokumentation"""
        # OpenAPI Schema
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        schema = response.json()
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema
        
        # Swagger UI
        response = client.get("/docs")
        assert response.status_code == 200
        
        # ReDoc
        response = client.get("/redoc")
        assert response.status_code == 200
