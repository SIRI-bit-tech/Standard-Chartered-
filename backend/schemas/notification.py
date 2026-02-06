from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    TRANSACTION = "transaction"
    LOAN = "loan"
    ACCOUNT = "account"
    SECURITY = "security"
    SYSTEM = "system"
    PROMOTIONAL = "promotional"


class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    PUSH = "push"


class NotificationResponse(BaseModel):
    """Notification response"""
    id: str
    user_id: str
    type: NotificationType
    title: str
    message: str
    data: Optional[dict] = None
    is_read: bool = False
    channels: List[NotificationChannel] = ["in_app"]
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Notification list response"""
    notifications: List[NotificationResponse]
    unread_count: int
    total_count: int
    page: int
    per_page: int


class MarkNotificationRequest(BaseModel):
    """Mark notification as read"""
    notification_ids: List[str] = Field(..., min_items=1)
    is_read: bool = True


class PreferenceSettingRequest(BaseModel):
    """Update notification preferences"""
    notification_type: NotificationType
    channels: List[NotificationChannel]
    enabled: bool = True
