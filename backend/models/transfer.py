from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class TransferType(str, enum.Enum):
    INTERNAL = "internal"
    DOMESTIC = "domestic"
    INTERNATIONAL = "international"
    ACH = "ach"
    WIRE = "wire"


class TransferStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class Transfer(Base):
    """Money transfers between accounts"""
    __tablename__ = "transfers"
    
    id = Column(String, primary_key=True, index=True)
    
    # Sender info
    from_account_id = Column(String, ForeignKey("accounts.id"), nullable=False, index=True)
    from_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Receiver info
    to_account_id = Column(String, nullable=True)  # Internal transfer
    to_account_number = Column(String, nullable=True)  # Domestic transfer
    to_beneficiary_id = Column(String, ForeignKey("beneficiary.id"), nullable=True)
    
    # Transfer details
    type = Column(Enum(TransferType), nullable=False)
    status = Column(Enum(TransferStatus), default=TransferStatus.PENDING, nullable=False)
    
    # Amount
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    exchange_rate = Column(Float, nullable=True)
    converted_amount = Column(Float, nullable=True)
    
    # Fees
    fee_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, nullable=False)
    
    # Description
    description = Column(String, nullable=True)
    reference_number = Column(String, unique=True, index=True, nullable=False)
    
    # Scheduled transfer
    scheduled_date = Column(DateTime, nullable=True)
    is_recurring = Column(String, nullable=True)  # daily, weekly, monthly, etc.
    
    # Status tracking
    approval_required = Column(String, nullable=True)
    approval_code = Column(String, nullable=True)
    requires_mfa = Column(String, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    scheduled_for = Column(DateTime, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Related transactions
    from_transaction_id = Column(String, nullable=True)
    to_transaction_id = Column(String, nullable=True)
    
    # Relationships
    from_account = relationship("Account", foreign_keys=[from_account_id])


class Beneficiary(Base):
    """Saved beneficiaries for transfers"""
    __tablename__ = "beneficiary"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Beneficiary info
    name = Column(String, nullable=False)
    account_number = Column(String, nullable=False)
    routing_number = Column(String, nullable=True)
    account_type = Column(String, nullable=True)
    
    # Transfer type
    transfer_type = Column(Enum(TransferType), nullable=False)
    
    # International transfer details
    country = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    swift_code = Column(String, nullable=True)
    iban = Column(String, nullable=True)
    
    # Status
    is_active = Column(String, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    verified_at = Column(DateTime, nullable=True)
