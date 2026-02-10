from sqlalchemy import Column, String, Integer, DateTime, Boolean, Enum, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class UserTier(str, enum.Enum):
    STANDARD = "standard"
    PRIORITY = "priority"
    PREMIUM = "premium"


class User(Base):
    """User model for banking platform"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)  # UUID from auth provider
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    street_address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    country = Column(String, nullable=False)  # For currency assignment
    primary_currency = Column(String, nullable=False)  # USD, GBP, EUR, etc.
    
    # Authentication
    password_hash = Column(String, nullable=False)
    transfer_pin = Column(String, nullable=True)  # 4-digit PIN for transfers
    transfer_pin_failed_attempts = Column(Integer, default=0, nullable=False)
    transfer_pin_locked_until = Column(DateTime, nullable=True)
    email_verification_token = Column(String, nullable=True)
    email_verification_expires = Column(Float, nullable=True)
    password_reset_token = Column(String, nullable=True)
    password_reset_expires = Column(Float, nullable=True)
    
    # Account tier
    tier = Column(Enum(UserTier), default=UserTier.PREMIUM, nullable=False)
    
    # Verification
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    identity_verified = Column(Boolean, default=False, nullable=False)
    
    # Profile
    profile_picture_url = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    loans = relationship("Loan", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    login_history = relationship("LoginHistory", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    support_tickets = relationship("SupportTicket", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
