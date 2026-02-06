from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Text, Boolean
from datetime import datetime
import enum
from database import Base


class BillPaymentStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BillPayee(Base):
    """Bill payees"""
    __tablename__ = "bill_payees"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Payee info
    name = Column(String, nullable=False)
    payee_code = Column(String, nullable=True)  # Unique identifier for payee
    account_number = Column(String, nullable=False)
    
    # Category
    category = Column(String, nullable=True)  # Utilities, Insurance, etc.
    
    # Contact
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BillPayment(Base):
    """Bill payments"""
    __tablename__ = "bill_payments"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False, index=True)
    payee_id = Column(String, ForeignKey("bill_payees.id"), nullable=False)
    
    # Payment info
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    status = Column(Enum(BillPaymentStatus), default=BillPaymentStatus.PENDING, nullable=False)
    
    # Reference
    payment_reference = Column(String, unique=True, index=True, nullable=False)
    bill_reference = Column(String, nullable=True)  # Payee's reference number
    
    # Dates
    payment_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Related transaction
    transaction_id = Column(String, nullable=True)


class ScheduledPayment(Base):
    """Scheduled/recurring bill payments"""
    __tablename__ = "scheduled_payments"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False, index=True)
    payee_id = Column(String, ForeignKey("bill_payees.id"), nullable=False)
    
    # Payment template
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    
    # Recurrence
    frequency = Column(String, nullable=False)  # weekly, bi-weekly, monthly, quarterly
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)  # NULL for indefinite
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Next scheduled
    next_payment_date = Column(DateTime, nullable=True)
    last_payment_date = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
