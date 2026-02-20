from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Text, Integer, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class LoanType(str, enum.Enum):
    PERSONAL = "personal"
    HOME = "home"
    AUTO = "auto"
    BALANCE_TRANSFER = "balance_transfer"
    EDUCATION = "education"
    BUSINESS = "business"


class LoanStatus(str, enum.Enum):
    PENDING = "pending"
    APPLICATION = "application"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISBURSED = "disbursed"
    ACTIVE = "active"
    COMPLETED = "completed"
    DEFAULTED = "defaulted"


class LoanApplicationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    APPROVED_PENDING_DISBURSEMENT = "approved_pending_disbursement"


class LoanProduct(Base):
    """Available loan products"""
    __tablename__ = "loan_products"
    
    id = Column(String, primary_key=True, index=True)
    
    # Product info
    name = Column(String, nullable=False)
    type = Column(Enum(LoanType), nullable=False)
    description = Column(String, nullable=True)
    
    # Terms
    min_amount = Column(Float, nullable=False)
    max_amount = Column(Float, nullable=False)
    base_interest_rate = Column(Float, nullable=False)
    min_term_months = Column(Integer, nullable=False)
    max_term_months = Column(Integer, nullable=False)
    
    # Requirements
    min_credit_score = Column(Integer, nullable=True)
    min_annual_income = Column(Float, nullable=True)
    employment_required = Column(Boolean, default=True, nullable=False)
    
    # Availability by tier
    available_to_standard = Column(Boolean, default=True, nullable=False)
    available_to_priority = Column(Boolean, default=True, nullable=False)
    available_to_premium = Column(Boolean, default=True, nullable=False)
    
    # UI hints
    image_url = Column(String, nullable=True)
    tag = Column(String, nullable=True) # e.g. "Low Interest", "Popular"
    features = Column(String, nullable=True) # JSON string of features
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LoanApplication(Base):
    """Loan applications"""
    __tablename__ = "loan_applications"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("loan_products.id"), nullable=False)
    
    # Application details
    status = Column(Enum(LoanApplicationStatus), default=LoanApplicationStatus.DRAFT, nullable=False)
    
    # Requested amount
    requested_amount = Column(Float, nullable=False)
    requested_term_months = Column(Integer, nullable=False)
    
    # Calculation
    approved_amount = Column(Float, nullable=True)
    approved_interest_rate = Column(Float, nullable=True)
    approved_term_months = Column(Integer, nullable=True)
    monthly_payment = Column(Float, nullable=True)
    
    # Purpose
    purpose = Column(String, nullable=True)
    
    # Income info (provided during application)
    annual_income = Column(Float, nullable=True)
    employment_status = Column(String, nullable=True)
    employer_name = Column(String, nullable=True)
    
    # Credit info
    credit_score = Column(Integer, nullable=True)
    
    # Documents
    supporting_documents = Column(String, nullable=True)  # JSON array of document URLs
    
    # Selected account for disbursement
    account_id = Column(String, ForeignKey("accounts.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Loan(Base):
    """Active loan accounts"""
    __tablename__ = "loans"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    application_id = Column(String, ForeignKey("loan_applications.id"), nullable=True)
    
    # Loan details
    type = Column(Enum(LoanType), nullable=False)
    status = Column(Enum(LoanStatus), default=LoanStatus.ACTIVE, nullable=False)
    
    # Amounts
    principal_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)
    term_months = Column(Integer, nullable=False)
    
    # Payment info
    monthly_payment = Column(Float, nullable=False)
    next_payment_date = Column(DateTime, nullable=False)
    last_payment_date = Column(DateTime, nullable=True)
    
    # Balance
    remaining_balance = Column(Float, nullable=False)
    total_interest_paid = Column(Float, default=0.0, nullable=False)
    total_payments_made = Column(Integer, default=0, nullable=False)
    
    # Status
    is_in_arrears = Column(Boolean, default=False, nullable=False)
    days_in_arrears = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    originated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    maturity_date = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="loans")


class LoanPayment(Base):
    """Loan payment records"""
    __tablename__ = "loan_payments"
    
    id = Column(String, primary_key=True, index=True)
    loan_id = Column(String, ForeignKey("loans.id"), nullable=False, index=True)
    
    # Payment info
    payment_amount = Column(Float, nullable=False)
    principal_amount = Column(Float, nullable=False)
    interest_amount = Column(Float, nullable=False)
    
    # Status
    status = Column(Enum(LoanStatus), default=LoanStatus.PENDING, nullable=False)
    
    # Timestamps
    due_date = Column(DateTime, nullable=False)
    paid_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LoanSchedule(Base):
    """Loan payment schedule"""
    __tablename__ = "loan_schedule"
    
    id = Column(String, primary_key=True, index=True)
    loan_id = Column(String, ForeignKey("loans.id"), nullable=False, index=True)
    
    # Payment details
    payment_number = Column(Integer, nullable=False)
    due_date = Column(DateTime, nullable=False)
    payment_amount = Column(Float, nullable=False)
    principal_amount = Column(Float, nullable=False)
    interest_amount = Column(Float, nullable=False)
    remaining_balance = Column(Float, nullable=False)
    
    # Payment status
    status = Column(Enum(LoanStatus), default=LoanStatus.PENDING, nullable=False)
    paid_date = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
