from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    INVESTMENT = "investment"
    CRYPTO = "crypto"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    CLOSED = "closed"
    PENDING = "pending"


class CreateAccountRequest(BaseModel):
    """Create new account request"""
    account_type: AccountType
    currency: str = Field(..., min_length=3, max_length=3)
    nickname: Optional[str] = Field(None, max_length=50)
    
    @validator('currency')
    def validate_currency(cls, v):
        return v.upper()


class AccountResponse(BaseModel):
    """Account response schema"""
    id: str
    user_id: str
    account_number: str
    account_type: AccountType
    currency: str
    balance: float = 0.0
    available_balance: float = 0.0
    nickname: Optional[str] = None
    status: AccountStatus = AccountStatus.ACTIVE
    is_primary: bool = False
    daily_limit: float = 5000.0
    monthly_limit: float = 50000.0
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_transaction_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AccountListResponse(BaseModel):
    """Account list response"""
    accounts: List[AccountResponse]
    total_balance_primary_currency: float
    total_accounts: int


class UpdateAccountRequest(BaseModel):
    """Update account request"""
    nickname: Optional[str] = Field(None, max_length=50)
    is_primary: Optional[bool] = None
    daily_limit: Optional[float] = Field(None, gt=0)
    monthly_limit: Optional[float] = Field(None, gt=0)


class AccountStatementRequest(BaseModel):
    """Account statement request"""
    start_date: datetime
    end_date: datetime
    format: str = Field(default="pdf", regex="^(pdf|csv|json)$")


class ExchangeRateResponse(BaseModel):
    """Exchange rate response"""
    from_currency: str
    to_currency: str
    rate: float
    timestamp: datetime
    
    class Config:
        from_attributes = True
