from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DocumentType(str, Enum):
    ID = "id"
    PROOF_OF_ADDRESS = "proof_of_address"
    INCOME_STATEMENT = "income_statement"
    TAX_RETURN = "tax_return"
    BANK_STATEMENT = "bank_statement"
    EMPLOYMENT_LETTER = "employment_letter"
    OTHER = "other"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"


class DocumentUploadRequest(BaseModel):
    """Document upload request"""
    document_type: DocumentType
    file_name: str = Field(..., max_length=255)
    file_size: int = Field(..., gt=0, le=10485760)  # 10MB limit
    mime_type: str = Field(..., regex="^(image|application)/(jpeg|png|pdf|x-pdf)$")
    expiration_date: Optional[datetime] = None


class DocumentUploadResponse(BaseModel):
    """Document upload response"""
    id: str
    upload_url: str
    expires_in: int  # seconds
    
    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    """Document response"""
    id: str
    user_id: str
    document_type: DocumentType
    file_name: str
    file_url: str
    status: DocumentStatus
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    expiration_date: Optional[datetime] = None
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Document list response"""
    documents: List[DocumentResponse]
    total_count: int


class DocumentVerificationRequest(BaseModel):
    """Document verification request (admin only)"""
    document_id: str
    is_verified: bool
    rejection_reason: Optional[str] = Field(None, max_length=500)
