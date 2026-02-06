from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class DepositType(str, enum.Enum):
    CHECK_DEPOSIT = "check_deposit"
    DIRECT_DEPOSIT = "direct_deposit"
    MOBILE_CHECK_DEPOSIT = "mobile_check_deposit"


class DepositStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    VERIFIED = "verified"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class Deposit(Base):
    """Deposits to accounts"""
    __tablename__ = "deposits"
    
    id = Column(String, primary_key=True, index=True)
    
    # Account info
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Deposit details
    type = Column(Enum(DepositType), nullable=False)
    status = Column(Enum(DepositStatus), default=DepositStatus.PENDING, nullable=False)
    
    # Amount
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    
    # Check deposit details
    check_number = Column(String, nullable=True)
    check_issuer_bank = Column(String, nullable=True)
    check_routing_number = Column(String, nullable=True)
    
    # Mobile check deposit
    front_image_url = Column(String, nullable=True)
    back_image_url = Column(String, nullable=True)
    
    # Direct deposit details
    direct_deposit_routing_number = Column(String, nullable=True)
    direct_deposit_account_number = Column(String, nullable=True)
    employer_name = Column(String, nullable=True)
    employer_id = Column(String, nullable=True)
    
    # Processing
    reference_number = Column(String, unique=True, index=True, nullable=False)
    processed_by = Column(String, nullable=True)  # Backend service identifier
    
    # Verification
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_code = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    rejection_reason = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Related transaction
    transaction_id = Column(String, nullable=True)
    
    # Relationships
    account = relationship("Account", foreign_keys=[account_id])
    user = relationship("User", foreign_keys=[user_id])
