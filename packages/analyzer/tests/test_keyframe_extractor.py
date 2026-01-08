import pytest
from unittest.mock import Mock, patch
import os
import tempfile

@pytest.mark.unit
def test_keyframe_extractor_initialization():
    """Test keyframe extractor initialization"""
    from src.services.keyframe_extractor import KeyframeExtractor
    
    extractor = KeyframeExtractor("/tmp/test-storage")
    assert extractor.storage_path == "/tmp/test-storage"
    assert extractor.keyframes_dir == "/tmp/test-storage/keyframes"

@pytest.mark.unit
@patch('src.services.keyframe_extractor.ffmpeg')
@patch('os.path.exists')
@patch('os.path.getsize')
def test_extract_keyframe(mock_getsize, mock_exists, mock_ffmpeg, sample_video_path):
    """Test keyframe extraction"""
    from src.services.keyframe_extractor import KeyframeExtractor
    
    # Mock file system operations
    mock_exists.return_value = True
    mock_getsize.return_value = 1024  # File size > 0
    
    # Mock ffmpeg
    mock_ffmpeg.input.return_value.output.return_value.run.return_value = None
    
    extractor = KeyframeExtractor()
    keyframe_path = extractor.extract_keyframe(sample_video_path, "test-scene-1", 2.5)
    
    assert keyframe_path is not None
    assert keyframe_path.endswith(".jpg")
    assert "test-scene-1" in keyframe_path

@pytest.mark.unit
@patch('src.services.keyframe_extractor.ffmpeg')
def test_get_video_duration(mock_ffmpeg, sample_video_path):
    """Test getting video duration"""
    from src.services.keyframe_extractor import KeyframeExtractor
    
    # Mock ffmpeg probe
    mock_ffmpeg.probe.return_value = {
        'streams': [{'duration': '30.5'}]
    }
    
    extractor = KeyframeExtractor()
    duration = extractor.get_video_duration(sample_video_path)
    
    assert duration == 30.5

@pytest.mark.unit
@patch('src.services.keyframe_extractor.ffmpeg')
def test_get_video_info(mock_ffmpeg, sample_video_path):
    """Test getting video information"""
    from src.services.keyframe_extractor import KeyframeExtractor
    
    # Mock ffmpeg probe
    mock_ffmpeg.probe.return_value = {
        'streams': [
            {
                'codec_type': 'video',
                'duration': '30.5',
                'width': 1920,
                'height': 1080,
                'r_frame_rate': '30/1',
                'codec_name': 'h264'
            }
        ]
    }
    
    extractor = KeyframeExtractor()
    info = extractor.get_video_info(sample_video_path)
    
    assert info is not None
    assert info['duration'] == 30.5
    assert info['width'] == 1920
    assert info['height'] == 1080
    assert info['codec'] == 'h264'

@pytest.mark.unit
def test_extract_scene_keyframes():
    """Test extracting keyframes for multiple scenes"""
    from src.services.keyframe_extractor import KeyframeExtractor
    
    extractor = KeyframeExtractor()
    scenes = [(0.0, 5.0), (5.0, 10.0), (10.0, 15.0)]
    
    with patch.object(extractor, 'extract_keyframe') as mock_extract:
        mock_extract.return_value = "/tmp/keyframe.jpg"
        
        keyframes = extractor.extract_scene_keyframes("/tmp/video.mp4", scenes, "test-video")
        
        assert len(keyframes) == 3
        assert all(kf is not None for kf in keyframes)
