"""
Generic error handling for FastAPI backend
Prevents sensitive error details from leaking to frontend
"""

from fastapi import HTTPException, status
from typing import Optional, Dict, Any
from utils.logger import logger


class APIError(HTTPException):
    """Base API error with generic response"""
    
    def __init__(
        self,
        status_code: int,
        message: str,
        error_code: str,
        details: Optional[Dict[str, Any]] = None,
        original_error: Optional[Exception] = None,
    ):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.original_error = original_error
        
        # Log the actual error internally
        if original_error:
            logger.error(
                f"API Error [{error_code}]: {message}",
                error=original_error,
                error_code=error_code
            )
        
        # Return generic message to client
        super().__init__(
            status_code=status_code,
            detail={
                "success": False,
                "message": message,
                "error_code": error_code,
            }
        )


class ValidationError(APIError):
    """Validation error with generic response"""
    
    def __init__(
        self,
        message: str = "Invalid request data",
        error_code: str = "VALIDATION_ERROR",
        original_error: Optional[Exception] = None,
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            error_code=error_code,
            original_error=original_error,
        )


class AuthenticationError(APIError):
    """Authentication error with generic response"""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        error_code: str = "AUTH_ERROR",
        original_error: Optional[Exception] = None,
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            error_code=error_code,
            original_error=original_error,
        )


class NotFoundError(APIError):
    """Not found error with generic response"""
    
    def __init__(
        self,
        resource: str = "Resource",
        error_code: str = "NOT_FOUND",
        original_error: Optional[Exception] = None,
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"{resource} not found",
            error_code=error_code,
            original_error=original_error,
        )


class ConflictError(APIError):
    """Conflict error with generic response"""
    
    def __init__(
        self,
        message: str = "Resource already exists",
        error_code: str = "CONFLICT",
        original_error: Optional[Exception] = None,
    ):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            message=message,
            error_code=error_code,
            original_error=original_error,
        )


class InternalServerError(APIError):
    """Internal server error with generic response"""
    
    def __init__(
        self,
        operation: str = "Operation",
        error_code: str = "INTERNAL_ERROR",
        original_error: Optional[Exception] = None,
    ):
        logger.error(
            f"Internal Server Error during {operation}",
            error=original_error,
        )
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="An unexpected error occurred. Please try again later.",
            error_code=error_code,
            original_error=original_error,
        )


class UnauthorizedError(APIError):
    """Unauthorized error with generic response"""
    
    def __init__(
        self,
        message: str = "You do not have permission to access this resource",
        error_code: str = "UNAUTHORIZED",
        original_error: Optional[Exception] = None,
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            error_code=error_code,
            original_error=original_error,
        )


# Error response formatter
def error_response(
    success: bool = False,
    message: str = "An error occurred",
    error_code: str = "UNKNOWN_ERROR",
) -> Dict[str, Any]:
    """Format error response"""
    return {
        "success": success,
        "message": message,
        "error_code": error_code,
    }
