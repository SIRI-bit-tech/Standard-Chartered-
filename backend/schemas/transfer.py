from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
from datetime import datetime
from enum import Enum


class TransferType(str, Enum):
    INTERNAL = "internal"
    DOMESTIC = "domestic"
    INTERNATIONAL = "international"
    PEER_TO_PEER = "peer_to_peer"


class TransferStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BeneficiaryType(str, Enum):
    OWN_ACCOUNT = "own_account"
    REGISTERED = "registered"
    NEW = "new"


class InternalTransferRequest(BaseModel):
    """Internal transfer request"""
    transfer_pin: str = Field(..., min_length=4, max_length=4, description="4-digit transfer PIN")
    from_account_id: str
    to_account_id: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = Field(None, max_length=200)


class DomesticTransferRequest(BaseModel):
    """Domestic transfer request"""
    transfer_pin: str = Field(..., min_length=4, max_length=4, description="4-digit transfer PIN")
    from_account_id: str
    to_account_number: str = Field(..., max_length=40)
    amount: float = Field(..., gt=0)
    description: Optional[str] = Field(None, max_length=200)


class InternationalTransferRequest(BaseModel):
    """International transfer request"""
    transfer_pin: str = Field(..., min_length=4, max_length=4, description="4-digit transfer PIN")
    from_account_id: str
    beneficiary_bank_name: str = Field(..., max_length=100)
    beneficiary_account_number: str = Field(..., max_length=30)
    beneficiary_name: str = Field(..., max_length=100)
    beneficiary_country: str = Field(..., min_length=2, max_length=2)
    amount: float = Field(..., gt=0)
    target_currency: str = Field(..., min_length=3, max_length=3)
    swift_code: Optional[str] = Field(None, max_length=11)
    iban: Optional[str] = Field(None, max_length=34)
    purpose: Optional[str] = Field(None, max_length=200)

    @validator('target_currency')
    def validate_currency(cls, v):
        return v.upper()


class P2PTransferRequest(BaseModel):
    """Peer-to-peer transfer request"""
    from_account_id: str
    recipient_email: EmailStr
    amount: float = Field(..., gt=0)
    description: Optional[str] = Field(None, max_length=200)


class TransferResponse(BaseModel):
    """Transfer response schema"""
    id: str
    transaction_id: str
    type: TransferType
    status: TransferStatus
    from_account_id: str
    amount: float
    fee: float
    total_amount: float
    exchange_rate: Optional[float] = None
    estimated_arrival: datetime
    created_at: datetime
    completed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    reference_number: str
    
    class Config:
        from_attributes = True


class TransferFeeResponse(BaseModel):
    """Transfer fee calculation response"""
    transfer_type: TransferType
    amount: float
    currency: str
    fee_percentage: float
    fixed_fee: float
    total_fee: float
    total_amount: float
    estimated_arrival_hours: int
    exchange_rate: Optional[float] = None


class ACHTransferRequest(BaseModel):
    """ACH transfer request"""
    transfer_pin: str = Field(..., min_length=4, max_length=4, description="4-digit transfer PIN")
    from_account_id: str
    routing_number: str = Field(..., max_length=9)
    account_number: str = Field(..., max_length=20)
    account_holder: str = Field(..., max_length=100)
    amount: float = Field(..., gt=0)
    description: Optional[str] = Field(None, max_length=200)
    reference: Optional[str] = Field(None, max_length=50)

    @validator('routing_number')
    def validate_routing(cls, v):
        if not v.isdigit() or len(v) != 9:
            raise ValueError('Routing number must be 9 digits')
        return v


class WireTransferRequest(BaseModel):
    """Wire transfer request"""
    transfer_pin: str = Field(..., min_length=4, max_length=4, description="4-digit transfer PIN")
    from_account_id: str
    bank_name: str = Field(..., max_length=100)
    bank_code: str = Field(..., max_length=10)
    account_number: str = Field(..., max_length=30)
    account_holder: str = Field(..., max_length=100)
    amount: float = Field(..., gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    country: str = Field(..., min_length=2, max_length=2)
    purpose: Optional[str] = Field(None, max_length=200)
    swift_code: Optional[str] = Field(None, max_length=11)
    iban: Optional[str] = Field(None, max_length=34)


class TransferResponse(BaseModel):
    """Transfer response"""
    id: str
    type: str
    status: str
    amount: float
    currency: str
    fee_amount: float
    total_amount: float
    reference_number: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class TransferStatusUpdateResponse(BaseModel):
    """Transfer status update response"""
    success: bool
    transfer_id: str
    status: str
    message: str


class RegisterBeneficiaryRequest(BaseModel):
    """Register beneficiary request"""
    account_number: str = Field(..., max_length=30)
    account_holder_name: str = Field(..., max_length=100)
    bank_name: Optional[str] = Field(None, max_length=100)
    bank_code: Optional[str] = Field(None, max_length=10)
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    nickname: Optional[str] = Field(None, max_length=50)
