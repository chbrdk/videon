import pytest
from unittest.mock import Mock, patch

@pytest.mark.unit
def test_database_client_initialization():
    """Test database client initialization"""
    from src.database.client import DatabaseClient
    
    with patch.dict('os.environ', {'DATABASE_URL': 'postgresql://test:test@localhost:5432/test'}):
        client = DatabaseClient()
        assert client.connection_string == 'postgresql://test:test@localhost:5432/test'

@pytest.mark.unit
def test_database_client_missing_url():
    """Test database client with missing URL"""
    from src.database.client import DatabaseClient
    
    with patch.dict('os.environ', {}, clear=True):
        with pytest.raises(ValueError, match="DATABASE_URL environment variable is required"):
            DatabaseClient()

@pytest.mark.unit
@patch('src.database.client.psycopg2.connect')
async def test_update_video_status(mock_connect):
    """Test updating video status"""
    from src.database.client import DatabaseClient
    
    # Mock database connection and cursor
    mock_cursor = Mock()
    mock_conn = Mock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_connect.return_value.__enter__.return_value = mock_conn
    
    client = DatabaseClient()
    result = await client.update_video_status("test-video-id", "ANALYZED")
    
    assert result is True
    mock_cursor.execute.assert_called_once()

@pytest.mark.unit
@patch('src.database.client.psycopg2.connect')
async def test_create_scene(mock_connect):
    """Test creating a scene"""
    from src.database.client import DatabaseClient
    
    # Mock database connection and cursor
    mock_cursor = Mock()
    mock_cursor.fetchone.return_value = {'id': 'test-scene-id'}
    mock_conn = Mock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_connect.return_value.__enter__.return_value = mock_conn
    
    client = DatabaseClient()
    scene_id = await client.create_scene("test-video-id", 0.0, 10.0, "/tmp/keyframe.jpg")
    
    assert scene_id == "test-scene-id"
    mock_cursor.execute.assert_called_once()

@pytest.mark.unit
@patch('src.database.client.psycopg2.connect')
async def test_create_analysis_log(mock_connect):
    """Test creating analysis log"""
    from src.database.client import DatabaseClient
    
    # Mock database connection and cursor
    mock_cursor = Mock()
    mock_conn = Mock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_connect.return_value.__enter__.return_value = mock_conn
    
    client = DatabaseClient()
    result = await client.create_analysis_log("test-video-id", "INFO", "Test message", {"key": "value"})
    
    assert result is True
    mock_cursor.execute.assert_called_once()

@pytest.mark.unit
@patch('src.database.client.psycopg2.connect')
async def test_get_video_info(mock_connect):
    """Test getting video information"""
    from src.database.client import DatabaseClient
    
    # Mock database connection and cursor
    mock_cursor = Mock()
    mock_cursor.fetchone.return_value = {
        'id': 'test-video-id',
        'filename': 'test.mp4',
        'original_name': 'test.mp4',
        'file_size': 1024
    }
    mock_conn = Mock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_connect.return_value.__enter__.return_value = mock_conn
    
    client = DatabaseClient()
    info = await client.get_video_info("test-video-id")
    
    assert info is not None
    assert info['id'] == 'test-video-id'
    assert info['filename'] == 'test.mp4'
