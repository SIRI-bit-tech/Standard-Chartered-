from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class BillPaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RecurrenceType(str, Enum):
    ONCE = "once"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class PayeeType(str, Enum):
    UTILITY = "utility"
    INSURANCE = "insurance"
    SUBSCRIPTION = "subscription"
    LOAN = "loan"
    CREDIT_CARD = "credit_card"
    OTHER = "other"


class CreatePayeeRequest(BaseModel):
    """Create payee request"""
    payee_name: str = Field(..., max_length=100)
    payee_type: PayeeType
    account_number: str = Field(..., max_length=30)
    bank_code: Optional[str] = Field(None, max_length=10)
    reference: Optional[str] = Field(None, max_length=100)
    nickname: Optional[str] = Field(None, max_length=50)


class PayeeResponse(BaseModel):
    """Payee response"""
    id: str
    user_id: str
    payee_name: str
    payee_type: PayeeType
    account_number: str
    bank_code: Optional[str] = None
    reference: Optional[str] = None
    nickname: Optional[str] = None
    is_favorite: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True


class BillPaymentRequest(BaseModel):
    """Bill payment request"""
    from_account_id: str
    payee_id: str
    amount: float = Field(..., gt=0)
    payment_date: datetime
    reference: Optional[str] = Field(None, max_length=100)
    recurrence: RecurrenceType = RecurrenceType.ONCE
    recurrence_end_date: Optional[datetime] = None


class BillPaymentResponse(BaseModel):
    """Bill payment response"""
    id: str
    user_id: str
    payee_id: str
    payee_name: str
    amount: float
    currency: str
    status: BillPaymentStatus
    payment_date: datetime
    completed_at: Optional[datetime] = None
    recurrence: RecurrenceType
    recurrence_end_date: Optional[datetime] = None
    next_payment_date: Optional[datetime] = None
    reference: Optional[str] = None
    
    class Config:
        from_attributes = True


class BillPaymentListResponse(BaseModel):
    """Bill payment list response"""
    payments: List[BillPaymentResponse]
    total_count: int
    page: int
    per_page: int


class UpdateBillPaymentRequest(BaseModel):
    """Update bill payment request"""
    amount: Optional[float] = Field(None, gt=0)
    payment_date: Optional[datetime] = None
    recurrence: Optional[RecurrenceType] = None
    recurrence_end_date: Optional[datetime] = None
