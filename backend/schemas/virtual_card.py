from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class VirtualCardType(str, Enum):
    SINGLE_USE = "single_use"
    TIME_LIMITED = "time_limited"
    SUBSCRIPTION = "subscription"
    RECURRING = "recurring"


class VirtualCardStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class CreateVirtualCardRequest(BaseModel):
    """Create virtual card request"""
    account_id: str
    card_type: VirtualCardType
    card_name: str = Field(..., max_length=50)
    spending_limit: Optional[float] = Field(None, gt=0)
    daily_limit: Optional[float] = Field(None, gt=0)
    monthly_limit: Optional[float] = Field(None, gt=0)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    requires_3d_secure: bool = Field(default=True)
    allowed_merchants: Optional[List[str]] = None
    blocked_merchants: Optional[List[str]] = None
    allowed_countries: Optional[List[str]] = None
    
    @validator('card_name')
    def validate_card_name(cls, v):
        if not v.strip():
            raise ValueError('Card name cannot be empty')
        return v


class VirtualCardResponse(BaseModel):
    """Virtual card response"""
    id: str
    account_id: str
    card_type: VirtualCardType
    status: VirtualCardStatus
    card_name: str
    card_number: str  # Last 4 digits only
    expiry_month: int
    expiry_year: int
    spending_limit: Optional[float]
    daily_limit: Optional[float]
    monthly_limit: Optional[float]
    spent_today: float
    spent_this_month: float
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    requires_3d_secure: bool
    total_transactions: int
    successful_transactions: int
    failed_transactions: int
    created_at: datetime
    last_used: Optional[datetime]
    updated_at: datetime
    
    class Config:
        from_attributes = True


class VirtualCardDetailResponse(BaseModel):
    """Virtual card detail response (with full card info)"""
    id: str
    account_id: str
    card_type: VirtualCardType
    status: VirtualCardStatus
    card_name: str
    card_number: str  # Full number (encrypted in DB)
    expiry_month: int
    expiry_year: int
    cvv: str
    spending_limit: Optional[float]
    daily_limit: Optional[float]
    monthly_limit: Optional[float]
    spent_today: float
    spent_this_month: float
    requires_cvv: bool
    requires_3d_secure: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class VirtualCardListResponse(BaseModel):
    """List virtual cards response"""
    cards: List[VirtualCardResponse]
    total_count: int
    active_count: int
    blocked_count: int


class UpdateVirtualCardRequest(BaseModel):
    """Update virtual card request"""
    card_name: Optional[str] = Field(None, max_length=50)
    spending_limit: Optional[float] = Field(None, gt=0)
    daily_limit: Optional[float] = Field(None, gt=0)
    monthly_limit: Optional[float] = Field(None, gt=0)
    requires_3d_secure: Optional[bool] = None
    allowed_merchants: Optional[List[str]] = None
    blocked_merchants: Optional[List[str]] = None
    allowed_countries: Optional[List[str]] = None


class VirtualCardStatusRequest(BaseModel):
    """Update virtual card status"""
    status: VirtualCardStatus


class VirtualCardBlockRequest(BaseModel):
    """Block virtual card"""
    reason: str = Field(..., max_length=200)


class VirtualCardLimitUsageResponse(BaseModel):
    """Card limit usage response"""
    spending_limit: Optional[float]
    spent_amount: float
    remaining_limit: Optional[float]
    percentage_used: float
    currency: str = "USD"


class VirtualCardTransactionResponse(BaseModel):
    """Virtual card transaction"""
    id: str
    card_id: str
    merchant_name: str
    amount: float
    currency: str
    status: str
    transaction_date: datetime
    description: Optional[str]
