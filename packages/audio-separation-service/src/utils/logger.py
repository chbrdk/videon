"""
Logger für Audio Separation Service
"""
import structlog
import logging
import sys
from typing import Any, Dict

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Configure standard logging
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)

logger = structlog.get_logger("audio-separation-service")

def log_separation_step(step: str, video_id: str, **kwargs: Any) -> None:
    """Log a separation step with context"""
    logger.info(
        f"Audio separation step: {step}",
        video_id=video_id,
        service="audio-separation",
        **kwargs
    )

def log_error(error: str, video_id: str = None, **kwargs: Any) -> None:
    """Log an error with context"""
    logger.error(
        f"Audio separation error: {error}",
        video_id=video_id,
        service="audio-separation",
        **kwargs
    )
