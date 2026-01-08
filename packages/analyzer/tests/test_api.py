import pytest
from fastapi.testclient import TestClient

@pytest.mark.unit
def test_health_endpoint(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "prismvid-analyzer"

@pytest.mark.unit
def test_analyze_endpoint(client, sample_video_path):
    """Test video analysis endpoint"""
    analysis_request = {
        "videoId": "test-video-id",
        "videoPath": sample_video_path
    }
    
    response = client.post("/analyze", json=analysis_request)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Video analysis started"
    assert data["videoId"] == "test-video-id"
    assert data["status"] == "ANALYZING"

@pytest.mark.unit
def test_analysis_status_endpoint(client):
    """Test analysis status endpoint"""
    response = client.get("/analysis/test-video-id/status")
    assert response.status_code == 200
    
    data = response.json()
    assert data["videoId"] == "test-video-id"
    assert data["status"] == "UPLOADED"
    assert data["message"] == "Status retrieved successfully"

@pytest.mark.unit
def test_analysis_status_not_found(client):
    """Test analysis status for non-existent video"""
    # Mock get_video_info to return None
    client.app.dependency_overrides = {}
    
    with pytest.raises(Exception):
        response = client.get("/analysis/non-existent-id/status")
        assert response.status_code == 404

@pytest.mark.unit
def test_analyze_invalid_request(client):
    """Test analysis with invalid request"""
    invalid_request = {
        "videoId": "test-video-id"
        # Missing videoPath
    }
    
    response = client.post("/analyze", json=invalid_request)
    assert response.status_code == 422  # Validation error
