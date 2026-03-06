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
        _stytch_client = stytch.Client(
            project_id=settings.STYTCH_PROJECT_ID,
            secret=settings.STYTCH_SECRET,
            environment="live"
        )
        return _stytch_client
    except Exception as e:
        logger.error(f"Failed to initialize Stytch client: {e}")
        return None
