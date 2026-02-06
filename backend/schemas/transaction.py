from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"
    BILL_PAYMENT = "bill_payment"
    LOAN_PAYMENT = "loan_payment"
    FEE = "fee"
    INTEREST = "interest"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REVERSED = "reversed"


class TransactionResponse(BaseModel):
    """Transaction response schema"""
    id: str
    account_id: str
    type: TransactionType
    amount: float
    currency: str
    status: TransactionStatus
    description: Optional[str] = None
    reference_number: str
    counterparty: Optional[str] = None
    balance_after: float
    fees: float = 0.0
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    """Transaction list response"""
    transactions: List[TransactionResponse]
    total_count: int
    page: int
    per_page: int


class TransactionFilterRequest(BaseModel):
    """Transaction filter request"""
    transaction_type: Optional[TransactionType] = None
    status: Optional[TransactionStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_amount: Optional[float] = Field(None, ge=0)
    max_amount: Optional[float] = Field(None, ge=0)
    search: Optional[str] = Field(None, max_length=100)
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
