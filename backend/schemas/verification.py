from pydantic import BaseModel, Field
from typing import Optional


class EmailVerificationRequest(BaseModel):
    """Request model for email verification"""
    email: str = Field(..., description="User's email address")
    verification_code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class ResendVerificationRequest(BaseModel):
    """Request model for resending verification code"""
    email: str = Field(..., description="User's email address")


class SetTransferPinRequest(BaseModel):
    """Request model for setting transfer PIN"""
    email: str = Field(..., description="User's email address")
    transfer_pin: str = Field(..., min_length=4, max_length=4, description="4-digit transfer PIN")
    verification_token: Optional[str] = Field(None, description="Short-lived verification token from email verification")


class AuthResponse(BaseModel):
    """Standard response for auth operations"""
    success: bool
    message: str
    data: Optional[dict] = None
