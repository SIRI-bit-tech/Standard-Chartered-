from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class AdminRoleEnum(str, Enum):
    """Admin roles"""
    SUPER_ADMIN = "super_admin"
    MANAGER = "manager"
    MODERATOR = "moderator"
    SUPPORT = "support"


class AdminRegisterRequest(BaseModel):
    """Admin registration request with admin code"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    password: str = Field(..., min_length=8, max_length=255)
    admin_code: str = Field(..., description="Secret admin registration code")
    department: Optional[str] = Field(None, max_length=100)

    @validator('password')
    def validate_password(cls, v):
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain uppercase letters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain numbers')
        return v


class AdminLoginRequest(BaseModel):
    """Admin login request"""
    email: EmailStr
    password: str
    admin_code: Optional[str] = Field(None, description="Admin code for 2FA")


class AdminResponse(BaseModel):
    """Admin response"""
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    role: str
    department: Optional[str]
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ApproveTransferRequest(BaseModel):
    """Approve transfer request"""
    transfer_id: str
    notes: Optional[str] = Field(None, max_length=500)


class DeclineTransferRequest(BaseModel):
    """Decline transfer request"""
    transfer_id: str
    reason: str = Field(..., max_length=500)


class TransferApprovalResponse(BaseModel):
    """Transfer approval response"""
    success: bool
    transfer_id: str
    status: str
    message: str


class ApproveDepositRequest(BaseModel):
    """Approve check/direct deposit"""
    deposit_id: str
    confirmation_code: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)


class DeclineDepositRequest(BaseModel):
    """Decline deposit"""
    deposit_id: str
    reason: str = Field(..., max_length=500)


class DepositApprovalResponse(BaseModel):
    """Deposit approval response"""
    success: bool
    deposit_id: str
    status: str
    message: str


class ApproveVirtualCardRequest(BaseModel):
    """Approve virtual card creation"""
    card_id: str
    notes: Optional[str] = Field(None, max_length=500)


class DeclineVirtualCardRequest(BaseModel):
    """Decline virtual card"""
    card_id: str
    reason: str = Field(..., max_length=500)


class VirtualCardApprovalResponse(BaseModel):
    """Virtual card approval response"""
    success: bool
    card_id: str
    status: str
    message: str


class AdminCreateUserRequest(BaseModel):
    """Admin create user request"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    first_name: str
    last_name: str
    phone: Optional[str] = None
    country: str


class AdminEditUserRequest(BaseModel):
    """Admin edit user details"""
    user_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    date_joined: Optional[datetime] = Field(None, description="Override user join date")
    is_active: Optional[bool] = None


class AdminAuditLogResponse(BaseModel):
    """Audit log response"""
    id: str
    admin_email: str
    action: str
    resource_type: str
    resource_id: str
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AdminStatisticsResponse(BaseModel):
    """Admin dashboard statistics"""
    total_users: int
    active_users: int
    total_transfers: int
    pending_transfers: int
    total_deposits: int
    pending_deposits: int
    total_loans: int
    pending_loans: int
    total_virtual_cards: int
    pending_cards: int
