import pytest
from unittest.mock import Mock, patch
import os
import tempfile

@pytest.mark.unit
def test_scene_detector_initialization():
    """Test scene detector initialization"""
    from src.services.scene_detector import SceneDetector
    
    detector = SceneDetector(threshold=25.0)
    assert detector.threshold == 25.0

@pytest.mark.unit
@patch('src.services.scene_detector.VideoManager')
@patch('src.services.scene_detector.SceneManager')
def test_detect_scenes(mock_scene_manager_class, mock_video_manager_class, sample_video_path):
    """Test scene detection functionality"""
    from src.services.scene_detector import SceneDetector
    
    # Mock the scene detection results
    mock_scene_manager = Mock()
    mock_scene_manager.get_scene_list.return_value = [
        (Mock(get_seconds=lambda: 0.0), Mock(get_seconds=lambda: 5.0)),
        (Mock(get_seconds=lambda: 5.0), Mock(get_seconds=lambda: 10.0)),
    ]
    mock_scene_manager_class.return_value = mock_scene_manager
    
    mock_video_manager = Mock()
    mock_video_manager_class.return_value = mock_video_manager
    
    detector = SceneDetector()
    scenes = detector.detect_scenes(sample_video_path)
    
    assert len(scenes) == 2
    assert scenes[0] == (0.0, 5.0)
    assert scenes[1] == (5.0, 10.0)

@pytest.mark.unit
def test_detect_scenes_file_not_found():
    """Test scene detection with non-existent file"""
    from src.services.scene_detector import SceneDetector
    
    detector = SceneDetector()
    
    with pytest.raises(FileNotFoundError):
        detector.detect_scenes("/non/existent/path.mp4")

@pytest.mark.unit
def test_get_scene_count(sample_video_path):
    """Test getting scene count"""
    from src.services.scene_detector import SceneDetector
    
    detector = SceneDetector()
    
    # Mock the detect_scenes method
    with patch.object(detector, 'detect_scenes') as mock_detect:
        mock_detect.return_value = [(0.0, 5.0), (5.0, 10.0)]
        
        count = detector.get_scene_count(sample_video_path)
        assert count == 2
