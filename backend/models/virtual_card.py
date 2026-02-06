from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class VirtualCardType(str, enum.Enum):
    SINGLE_USE = "single_use"
    TIME_LIMITED = "time_limited"
    SUBSCRIPTION = "subscription"
    RECURRING = "recurring"


class VirtualCardStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"


class VirtualCard(Base):
    """Virtual cards for online payments"""
    __tablename__ = "virtual_cards"
    
    id = Column(String, primary_key=True, index=True)
    
    # User and account
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False, index=True)
    
    # Card details
    card_number = Column(String, nullable=False, unique=True, index=True)  # Encrypted
    card_type = Column(Enum(VirtualCardType), nullable=False)
    status = Column(Enum(VirtualCardStatus), default=VirtualCardStatus.ACTIVE, nullable=False)
    
    # Expiry
    expiry_month = Column(Integer, nullable=False)
    expiry_year = Column(Integer, nullable=False)
    cvv = Column(String, nullable=False)  # Encrypted
    
    # Limits
    spending_limit = Column(Float, nullable=True)  # Total limit
    daily_limit = Column(Float, nullable=True)
    monthly_limit = Column(Float, nullable=True)
    spent_today = Column(Float, default=0.0, nullable=False)
    spent_this_month = Column(Float, default=0.0, nullable=False)
    
    # Time constraints
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    
    # Merchant restrictions
    allowed_merchants = Column(String, nullable=True)  # JSON list
    blocked_merchants = Column(String, nullable=True)  # JSON list
    allowed_countries = Column(String, nullable=True)  # JSON list
    
    # Card name for user reference
    card_name = Column(String, default="Virtual Card", nullable=False)
    
    # Security
    requires_cvv = Column(Boolean, default=True, nullable=False)
    requires_3d_secure = Column(Boolean, default=True, nullable=False)
    
    # Transaction tracking
    total_transactions = Column(Integer, default=0, nullable=False)
    successful_transactions = Column(Integer, default=0, nullable=False)
    failed_transactions = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    account = relationship("Account", foreign_keys=[account_id])
