"""
Logger utility für Saliency Detection Service
Optimiert für strukturiertes Logging mit Loguru
"""
import os
import sys
from loguru import logger
from typing import Dict, Any, Optional

# Konfiguration für verschiedene Umgebungen
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")  # json oder text

def setup_logger():
    """Konfiguriert den Logger für den Service"""
    
    # Entferne Standard-Handler
    logger.remove()
    
    # Konsole Handler
    if LOG_FORMAT == "json":
        logger.add(
            sys.stdout,
            level=LOG_LEVEL,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
            serialize=True
        )
    else:
        logger.add(
            sys.stdout,
            level=LOG_LEVEL,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>"
        )
    
    # File Handler für Errors
    logger.add(
        "logs/saliency-service-error.log",
        level="ERROR",
        rotation="10 MB",
        retention="7 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
    )
    
    return logger

def log_analysis_step(video_id: str, step: str, metadata: Optional[Dict[str, Any]] = None):
    """Loggt einen Analyse-Schritt"""
    log_data = {
        "video_id": video_id,
        "step": step,
        "metadata": metadata or {}
    }
    logger.info(f"Analysis step: {step}", extra=log_data)

def log_error(video_id: str, error_message: str, error_details: Optional[Dict[str, Any]] = None):
    """Loggt einen Fehler"""
    log_data = {
        "video_id": video_id,
        "error_message": error_message,
        "error_details": error_details or {}
    }
    logger.error(f"Analysis error: {error_message}", extra=log_data)

def log_performance(video_id: str, operation: str, duration: float, metadata: Optional[Dict[str, Any]] = None):
    """Loggt Performance-Metriken"""
    log_data = {
        "video_id": video_id,
        "operation": operation,
        "duration_seconds": duration,
        "metadata": metadata or {}
    }
    logger.info(f"Performance: {operation} took {duration:.2f}s", extra=log_data)

# Logger initialisieren
setup_logger()
