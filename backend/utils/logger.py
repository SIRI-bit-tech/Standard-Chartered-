"""
Structured logging utility for backend
Provides structured logging without exposing sensitive information
"""

import logging
import json
from datetime import datetime
from typing import Any, Optional
from config import settings

class StructuredLogger:
    """Structured logging for FastAPI backend"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self._setup_logger()
    
    def _setup_logger(self) -> None:
        """Configure logger based on environment"""
        log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
        self.logger.setLevel(log_level)
        
        # Only add handlers if not already configured
        if not self.logger.handlers:
            formatter = logging.Formatter(
                fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            
            handler = logging.StreamHandler()
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message"""
        if settings.ENVIRONMENT == 'development':
            self.logger.debug(message, extra=kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        """Log info message"""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message"""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, error: Optional[Exception] = None, **kwargs) -> None:
        """Log error message without exposing sensitive details"""
        error_msg = str(message)
        if error and settings.ENVIRONMENT == 'development':
            error_msg += f" - {str(error)}"
        self.logger.error(error_msg, extra=kwargs)
    
    def critical(self, message: str, error: Optional[Exception] = None, **kwargs) -> None:
        """Log critical message"""
        error_msg = str(message)
        if error and settings.ENVIRONMENT == 'development':
            error_msg += f" - {str(error)}"
        self.logger.critical(error_msg, extra=kwargs)


# Initialize global logger
logger = StructuredLogger(__name__)
