from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserTier(str, Enum):
    STANDARD = "standard"
    PRIORITY = "priority"
    PREMIUM = "premium"


class UserStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class UserResponse(BaseModel):
    """User response schema"""
    id: str
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    country: str
    phone: Optional[str] = None
    tier: UserTier = UserTier.STANDARD
    status: UserStatusEnum = UserStatusEnum.ACTIVE
    primary_currency: str
    is_email_verified: bool = False
    is_two_fa_enabled: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    """Update user profile request"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    primary_currency: Optional[str] = Field(None, min_length=3, max_length=3)
    
    @validator('primary_currency')
    def validate_currency(cls, v):
        if v:
            return v.upper()
        return v


class LoginHistoryResponse(BaseModel):
    """Login history response"""
    id: str
    user_id: str
    device_name: str
    ip_address: str
    location: Optional[str] = None
    login_at: datetime
    logout_at: Optional[datetime] = None
    is_current_session: bool = False
    
    class Config:
        from_attributes = True


class PreferenceResponse(BaseModel):
    """User preferences response"""
    user_id: str
    dark_mode: bool = False
    notification_email: bool = True
    notification_sms: bool = False
    two_fa_method: Optional[str] = None
    language: str = "en"
    
    class Config:
        from_attributes = True


class UpdatePreferenceRequest(BaseModel):
    """Update user preferences"""
    dark_mode: Optional[bool] = None
    notification_email: Optional[bool] = None
    notification_sms: Optional[bool] = None
    language: Optional[str] = None
