from sqlalchemy import Column, String, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class NotificationType(str, enum.Enum):
    TRANSACTION = "transaction"
    SECURITY = "security"
    SYSTEM = "system"
    LOAN = "loan"
    ALERT = "alert"
    OFFER = "offer"


class NotificationStatus(str, enum.Enum):
    UNREAD = "unread"
    READ = "read"
    ARCHIVED = "archived"


class Notification(Base):
    """User notifications"""
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Notification info
    type = Column(Enum(NotificationType), nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.UNREAD, nullable=False)
    
    # Content
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    
    # Related resources
    transaction_id = Column(String, nullable=True)
    transfer_id = Column(String, nullable=True)
    loan_id = Column(String, nullable=True)
    
    # Action
    action_url = Column(String, nullable=True)
    action_type = Column(String, nullable=True)  # view, confirm, etc.
    
    # Delivery
    sent_via_email = Column(Boolean, default=False, nullable=False)
    sent_via_sms = Column(Boolean, default=False, nullable=False)
    sent_via_push = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")


class NotificationPreference(Base):
    """User notification preferences"""
    __tablename__ = "notification_preferences"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Email preferences
    email_transactions = Column(Boolean, default=True, nullable=False)
    email_security = Column(Boolean, default=True, nullable=False)
    email_offers = Column(Boolean, default=True, nullable=False)
    email_statements = Column(Boolean, default=True, nullable=False)
    
    # SMS preferences
    sms_transactions = Column(Boolean, default=False, nullable=False)
    sms_security = Column(Boolean, default=True, nullable=False)
    sms_alerts = Column(Boolean, default=True, nullable=False)
    
    # Push notification preferences
    push_transactions = Column(Boolean, default=True, nullable=False)
    push_security = Column(Boolean, default=True, nullable=False)
    push_alerts = Column(Boolean, default=True, nullable=False)
    
    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False, nullable=False)
    quiet_hours_start = Column(String, nullable=True)  # HH:MM format
    quiet_hours_end = Column(String, nullable=True)    # HH:MM format
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
