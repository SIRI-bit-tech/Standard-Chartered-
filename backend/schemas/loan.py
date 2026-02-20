from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class LoanType(str, Enum):
    PERSONAL = "personal"
    HOME = "home"
    AUTO = "auto"
    EDUCATION = "education"
    BUSINESS = "business"


class LoanStatus(str, Enum):
    ACTIVE = "active"
    PAID_OFF = "paid_off"
    DEFAULTED = "defaulted"
    CANCELLED = "cancelled"
    PENDING_APPROVAL = "pending_approval"


class LoanApplicationStatus(str, Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class LoanApplicationRequest(BaseModel):
    """Loan application request"""
    product_id: str
    amount: float = Field(..., gt=0, le=1000000)
    duration_months: int = Field(..., ge=1, le=360)
    purpose: str = Field(..., max_length=500)
    account_id: str
    employment_status: Optional[str] = Field(None, pattern="^(employed|self_employed|unemployed|retired|full_time|part_time|contract|student)$")
    annual_income: Optional[float] = Field(None, gt=0)
    employer_name: Optional[str] = Field(None, max_length=100)

    @field_validator("employment_status", mode="before")
    def normalize_employment_status(cls, v):
        if v is None:
            return v
        s = str(v).lower()
        mapping = {
            "full_time": "employed",
            "part_time": "employed",
            "contract": "employed",
            "student": "unemployed",
        }
        return mapping.get(s, s)


class LoanApplicationResponse(BaseModel):
    """Loan application response"""
    id: str
    user_id: str
    product_id: str
    account_id: Optional[str]
    amount: float
    duration_months: int
    status: LoanApplicationStatus
    purpose: Optional[str]
    applied_at: datetime
    decision_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    class Config:
        from_attributes = True


class LoanResponse(BaseModel):
    """Loan response schema"""
    id: str
    user_id: str
    application_id: str
    loan_type: LoanType
    amount: float
    currency: str
    interest_rate: float
    duration_months: int
    monthly_payment: float
    remaining_balance: float
    total_paid: float
    next_payment_date: datetime
    status: LoanStatus
    disbursed_at: datetime
    end_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LoanPaymentRequest(BaseModel):
    """Loan payment request"""
    loan_id: str
    amount: float = Field(..., gt=0)
    from_account_id: str
    reference: Optional[str] = Field(None, max_length=100)


class LoanPaymentResponse(BaseModel):
    """Loan payment response"""
    id: str
    loan_id: str
    amount: float
    principal_paid: float
    interest_paid: float
    payment_date: datetime
    new_balance: float
    next_payment_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LoanPaymentScheduleResponse(BaseModel):
    """Loan payment schedule"""
    loan_id: str
    total_payments: int
    payments_made: int
    payments_remaining: int
    schedule: List[dict]
    
    class Config:
        from_attributes = True


class LoanQuoteRequest(BaseModel):
    """Get loan quote request"""
    loan_type: LoanType
    amount: float = Field(..., gt=0, le=1000000)
    currency: str = Field(..., min_length=3, max_length=3)
    duration_months: int = Field(..., ge=1, le=360)
