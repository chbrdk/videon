import pytest
import os
import sys
import tempfile
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

# Set test environment
os.environ['NODE_ENV'] = 'test'
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/prismvid_test'
os.environ['STORAGE_PATH'] = tempfile.mkdtemp()

@pytest.fixture
def mock_db_client():
    """Mock database client for tests"""
    mock_client = Mock()
    mock_client.update_video_status.return_value = True
    mock_client.create_scene.return_value = "test-scene-id"
    mock_client.create_analysis_log.return_value = True
    mock_client.get_video_info.return_value = {
        'id': 'test-video-id',
        'filename': 'test-video.mp4',
        'original_name': 'test-video.mp4',
        'file_size': 1024 * 1024
    }
    return mock_client

@pytest.fixture
def mock_scene_detector():
    """Mock scene detector for tests"""
    mock_detector = Mock()
    mock_detector.detect_scenes.return_value = [
        (0.0, 5.0),
        (5.0, 10.0),
        (10.0, 15.0)
    ]
    return mock_detector

@pytest.fixture
def mock_keyframe_extractor():
    """Mock keyframe extractor for tests"""
    mock_extractor = Mock()
    mock_extractor.extract_keyframe.return_value = "/tmp/test-keyframe.jpg"
    mock_extractor.extract_scene_keyframes.return_value = [
        "/tmp/keyframe1.jpg",
        "/tmp/keyframe2.jpg",
        "/tmp/keyframe3.jpg"
    ]
    return mock_extractor

@pytest.fixture
def sample_video_path():
    """Create a temporary sample video file for testing"""
    # Create a temporary file that acts as a video
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
        f.write(b'fake video content for testing')
        return f.name

@pytest.fixture
def client(mock_db_client, mock_scene_detector, mock_keyframe_extractor):
    """Test client with mocked dependencies"""
    with patch('src.database.client.DatabaseClient') as mock_db_class, \
         patch('src.services.scene_detector.SceneDetector') as mock_scene_class, \
         patch('src.services.keyframe_extractor.KeyframeExtractor') as mock_keyframe_class:
        
        mock_db_class.return_value = mock_db_client
        mock_scene_class.return_value = mock_scene_detector
        mock_keyframe_class.return_value = mock_keyframe_extractor
        
        # Mock the database client import
        with patch.dict('sys.modules', {'psycopg2': Mock()}):
            from src.api.server import app
            return TestClient(app)
