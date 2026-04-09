from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Literal
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
    admin_code: str = Field(..., description="Secret admin code")
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
    admin_code: Optional[str] = Field(None, description="Admin code for additional security")


class AdminResponse(BaseModel):
    """Admin response"""
    id: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }


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

class AdminUpdateCardStatusRequest(BaseModel):
    """Update virtual card status by admin"""
    card_id: str
    status: Literal['pending', 'active']

class AdminCardActionRequest(BaseModel):
    """Admin action on card (freeze/unfreeze/block)"""
    card_id: str


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
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    date_joined: Optional[datetime] = Field(None, description="Override user join date")
    is_active: Optional[bool] = None
    is_restricted: Optional[bool] = None
    restricted_until: Optional[datetime] = None

class AdminAccountStatusRequest(BaseModel):
    account_id: str
    status: Literal['active', 'frozen', 'closed']

class AdminAdjustBalanceRequest(BaseModel):
    account_id: str
    amount: float
    operation: Literal['credit', 'debit']


class AdminAuditLogResponse(BaseModel):
    """Audit log response"""
    id: str
    admin_email: str
    action: str
    resource_type: str
    resource_id: str
    details: Optional[str]
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class ApproveLoanRequest(BaseModel):
    """Approve loan request"""
    application_id: str
    approved_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    term_months: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=500)


class DeclineLoanRequest(BaseModel):
    """Decline loan request"""
    application_id: str
    reason: str = Field(..., max_length=500)


class LoanApprovalResponse(BaseModel):
    """Loan approval response"""
    success: bool
    application_id: str
    status: str
    message: str


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


class AdminCreateLoanProductRequest(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=3, max_length=100)
    type: str
    description: str = Field(..., max_length=1000)
    min_amount: float
    max_amount: float
    base_interest_rate: float
    min_term_months: int
    max_term_months: int
    tag: str = Field(..., max_length=50)
    image_url: Optional[str] = None
    features: List[str] = []
    employment_required: bool = True
    available_to_standard: bool = True
    available_to_priority: bool = True
    available_to_premium: bool = True


# Transaction Generation Schemas
class GenerateTransactionsRequest(BaseModel):
    """Request to generate transaction history"""
    account_id: str = Field(..., description="Account ID to generate transactions for")
    start_date: datetime = Field(..., description="Start date for transaction history")
    end_date: datetime = Field(..., description="End date for transaction history")
    starting_balance: float = Field(..., ge=0, description="Starting account balance")
    closing_balance: float = Field(..., ge=0, description="Closing account balance")
    transaction_count: int = Field(..., ge=1, le=1000, description="Number of transactions to generate")
    currency: str = Field(default="USD", description="Currency code")


class GenerateTransactionsPreviewRequest(BaseModel):
    """Request to preview generated transactions"""
    start_date: datetime = Field(..., description="Start date for transaction history")
    end_date: datetime = Field(..., description="End date for transaction history")
    starting_balance: float = Field(..., ge=0, description="Starting account balance")
    closing_balance: float = Field(..., ge=0, description="Closing account balance")
    transaction_count: int = Field(..., ge=1, le=1000, description="Number of transactions to generate")
    preview_count: int = Field(default=10, ge=1, le=50, description="Number of sample transactions to show")


class TransactionPreviewItem(BaseModel):
    """Preview of a single transaction"""
    type: str
    amount: float
    description: str
    created_at: str
    running_balance: Optional[float] = None


class TransactionGenerationSummary(BaseModel):
    """Summary statistics for generated transactions"""
    total_transactions: int
    debit_count: int
    credit_count: int
    total_debits: float
    total_credits: float
    starting_balance: float
    closing_balance: float
    net_change: float


class GenerateTransactionsPreviewResponse(BaseModel):
    """Response with transaction preview"""
    sample_transactions: List[TransactionPreviewItem]
    summary: TransactionGenerationSummary


class GenerateTransactionsResponse(BaseModel):
    """Response after generating transactions"""
    success: bool
    message: str
    transactions_created: int
    account_id: str
    new_balance: float
