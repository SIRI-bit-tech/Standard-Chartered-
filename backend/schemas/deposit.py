from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum


class DepositType(str, Enum):
    CHECK_DEPOSIT = "check_deposit"
    DIRECT_DEPOSIT = "direct_deposit"
    MOBILE_CHECK_DEPOSIT = "mobile_check_deposit"


class DepositStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    VERIFIED = "verified"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"


class CheckDepositRequest(BaseModel):
    """Mobile check deposit request"""
    account_id: str
    amount: float = Field(..., gt=0)
    check_number: str = Field(..., max_length=20)
    check_issuer_bank: str = Field(..., max_length=100)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    
    @validator('check_number')
    def validate_check_number(cls, v):
        if not v.isdigit() and not v.isalnum():
            raise ValueError('Check number must be alphanumeric')
        return v


class DirectDepositSetupRequest(BaseModel):
    """Setup direct deposit request"""
    account_id: str
    routing_number: str = Field(..., max_length=9)
    account_number: str = Field(..., max_length=20)
    employer_name: str = Field(..., max_length=100)
    employer_id: Optional[str] = Field(None, max_length=20)
    
    @validator('routing_number')
    def validate_routing_number(cls, v):
        if not v.isdigit() or len(v) != 9:
            raise ValueError('Routing number must be 9 digits')
        return v
    
    @validator('account_number')
    def validate_account_number(cls, v):
        if not v.isalnum():
            raise ValueError('Account number must be alphanumeric')
        return v


class CheckDepositUploadRequest(BaseModel):
    """Mobile check deposit with images"""
    account_id: str
    amount: float = Field(..., gt=0)
    check_number: str = Field(..., max_length=20)
    check_issuer_bank: str = Field(..., max_length=100)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    # Front and back image URLs from Cloudinary


class DepositResponse(BaseModel):
    """Deposit response"""
    id: str
    account_id: str
    type: DepositType
    status: DepositStatus
    amount: float
    currency: str
    reference_number: str
    check_number: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    is_verified: bool
    
    class Config:
        from_attributes = True


class DepositListResponse(BaseModel):
    """List deposits response"""
    deposits: list[DepositResponse]
    total_count: int
    pending_count: int
    completed_count: int


class DirectDepositConfigResponse(BaseModel):
    """Direct deposit configuration response"""
    routing_number: str
    account_number: str
    employer_name: str
    employer_id: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class DepositVerificationRequest(BaseModel):
    """Verify deposit request"""
    deposit_id: str
    verification_code: str = Field(..., min_length=6, max_length=6)
    
    @validator('verification_code')
    def validate_code(cls, v):
        if not v.isdigit():
            raise ValueError('Verification code must be numeric')
        return v


class DepositStatusUpdateResponse(BaseModel):
    """Deposit status update response"""
    success: bool
    deposit_id: str
    status: DepositStatus
    message: str
