import logging
import sys
from typing import Any, Dict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)

logger = logging.getLogger('prismvid-analyzer')

def log_analysis_step(video_id: str, step: str, details: Dict[str, Any] = None):
    """Log analysis step with structured data"""
    log_data = {
        'video_id': video_id,
        'step': step,
        'details': details or {}
    }
    logger.info(f"Analysis step: {step}", extra=log_data)

def log_error(video_id: str, error: str, details: Dict[str, Any] = None):
    """Log error with structured data"""
    log_data = {
        'video_id': video_id,
        'error': error,
        'details': details or {}
    }
    logger.error(f"Analysis error: {error}", extra=log_data)
