from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone
import enum
import uuid


class RestrictionType(str, enum.Enum):
    """User restriction types"""
    POST_NO_DEBIT = "post_no_debit"
    ONLINE_BANKING = "online_banking"


class UserRestriction(Base):
    """User restrictions with custom messages"""
    __tablename__ = "user_restrictions"

    id = Column(String(255), primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False, index=True)
    restriction_type = Column(SQLEnum(RestrictionType), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    message = Column(Text, nullable=True)  # Custom message set by admin
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_by = Column(String(255), ForeignKey("admin_users.id"), nullable=True)  # Admin who created restriction
    
    # Relationships
    user = relationship("User", back_populates="restrictions")
    admin = relationship("AdminUser", back_populates="created_restrictions")
    
    def __repr__(self):
        return f"<UserRestriction {self.restriction_type}>"
