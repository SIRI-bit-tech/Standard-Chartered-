"""
Timezone utilities for consistent US Eastern Time usage across the application.
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from config import settings

# US Eastern Time zone
US_TIMEZONE = ZoneInfo(settings.TIMEZONE)


def now_us() -> datetime:
    """
    Get current datetime in US Eastern Time.
    Returns timezone-aware datetime object.
    """
    return datetime.now(US_TIMEZONE)


def utc_to_us(dt: datetime) -> datetime:
    """
    Convert UTC datetime to US Eastern Time.
    
    Args:
        dt: UTC datetime (timezone-aware or naive)
    
    Returns:
        Timezone-aware datetime in US Eastern Time
    """
    if dt.tzinfo is None:
        # Assume naive datetime is UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(US_TIMEZONE)


def us_to_utc(dt: datetime) -> datetime:
    """
    Convert US Eastern Time datetime to UTC.
    
    Args:
        dt: US Eastern Time datetime (timezone-aware or naive)
    
    Returns:
        Timezone-aware datetime in UTC
    """
    if dt.tzinfo is None:
        # Assume naive datetime is US Eastern Time
        dt = dt.replace(tzinfo=US_TIMEZONE)
    return dt.astimezone(timezone.utc)


def format_us_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S %Z") -> str:
    """
    Format datetime in US Eastern Time.
    
    Args:
        dt: Datetime to format (any timezone)
        format_str: strftime format string
    
    Returns:
        Formatted datetime string in US Eastern Time
    """
    us_dt = utc_to_us(dt) if dt.tzinfo == timezone.utc else dt
    if us_dt.tzinfo is None:
        us_dt = us_dt.replace(tzinfo=US_TIMEZONE)
    return us_dt.strftime(format_str)
