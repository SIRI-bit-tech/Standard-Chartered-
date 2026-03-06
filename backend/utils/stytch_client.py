import stytch
from config import settings
from utils.logger import logger

_stytch_client = None

def get_stytch_client():
    global _stytch_client
    if _stytch_client:
        return _stytch_client
    
    if not settings.STYTCH_PROJECT_ID or not settings.STYTCH_SECRET:
        logger.error("Missing Stytch credentials (STYTCH_PROJECT_ID or STYTCH_SECRET)")
        return None
        
    try:
        stytch_env = settings.STYTCH_ENVIRONMENT
        logger.info(f"Initializing Stytch client in '{stytch_env}' environment")
        _stytch_client = stytch.Client(
            project_id=settings.STYTCH_PROJECT_ID,
            secret=settings.STYTCH_SECRET,
            environment=stytch_env
        )
        return _stytch_client
    except Exception as e:
        logger.error(f"Failed to initialize Stytch client: {e}")
        return None

def parse_stytch_error(e):
    """
    Parses a Stytch exception and returns a user-friendly message and error code.
    """
    try:
        # Stytch exceptions usually have error_message and error_type
        message = getattr(e, "error_message", None)
        error_type = getattr(e, "error_type", None)
        
        if not message:
            message = str(e)
        if not error_type:
            error_type = "AUTHENTICATION_ERROR"
            
        # Clean up common stytch messages for end users
        if "password_too_weak" in str(error_type).lower():
            message = "Password is too weak. Please use a stronger password with mixed characters."
        elif "duplicate_email" in str(error_type).lower():
            message = "This email address is already registered."
        elif "invalid_email" in str(error_type).lower():
            message = "Please enter a valid email address."
            
        return message, error_type
    except Exception:
        return "An authentication error occurred. Please try again later.", "AUTH_PROVIDER_ERROR"

def delete_stytch_user(stytch_user_id: str) -> bool:
    """
    Deletes a user from Stytch by their Stytch User ID.
    Returns True if successful, False otherwise.
    """
    client = get_stytch_client()
    if not client:
        return False
        
    try:
        logger.info(f"Deleting user from Stytch: {stytch_user_id}")
        client.users.delete(user_id=stytch_user_id)
        return True
    except Exception as e:
        logger.error(f"Failed to delete Stytch user {stytch_user_id}: {e}")
        return False
