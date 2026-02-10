from pydantic import BaseModel, Field, field_validator
from typing import Optional

from schemas.pin_policy import validate_transfer_pin_strength


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
    transfer_pin: str = Field(..., pattern=r"^\d{4}$", description="4-digit transfer PIN")
    verification_token: Optional[str] = Field(None, description="Short-lived verification token from email verification")

    @field_validator("transfer_pin")
    def check_pin_strength(cls, v: str) -> str:
        return validate_transfer_pin_strength(v)


class VerifyTransferPinRequest(BaseModel):
    """Request model for verifying transfer PIN before a transfer"""
    transfer_pin: str = Field(..., pattern=r"^\d{4}$", description="4-digit transfer PIN")

    @field_validator("transfer_pin")
    def check_pin_strength(cls, v: str) -> str:
        return validate_transfer_pin_strength(v)


class AuthResponse(BaseModel):
    """Standard response for auth operations"""
    success: bool
    message: str
    data: Optional[dict] = None
