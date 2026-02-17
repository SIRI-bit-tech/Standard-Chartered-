from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import secrets
import logging

from database import get_db
from models.user import User
from schemas.verification import (
    EmailVerificationRequest,
    ResendVerificationRequest,
    SetTransferPinRequest,
    VerifyTransferPinRequest,
    StartPinResetRequest,
    ConfirmPinResetRequest,
    CompletePinResetRequest,
    AuthResponse,
)
from services.email import email_service
from services.account import AccountService
from utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user_id,
)
from utils.errors import NotFoundError, ValidationError, ConflictError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["verification"])

@router.post("/verify-email", response_model=AuthResponse)
async def verify_email(
    request: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify user email with verification code"""
    try:
        logger.info(f"Email verification attempt for: {request.email}")
        logger.info(f"Request data: {request}")
        logger.info(f"Verification code received: {request.verification_code}")
        logger.info(f"Request validation passed successfully")
        
        # Find user by email
        user = await db.execute(
            select(User).where(User.email == request.email)
        )
        user = user.scalar_one_or_none()
        
        if not user:
            logger.warning(f"Email verification failed - user not found: {request.email}")
            raise NotFoundError("User not found")
        
        # Check if already verified
        if user.email_verified:
            logger.info(f"Email already verified for: {request.email}")
            raise ConflictError("Email already verified")
        
        # Check verification code and expiry
        if not user.email_verification_token:
            logger.warning(f"Email verification failed - no token found: {request.email}")
            raise ValidationError("No verification code found. Please request a new one.")
        
        if user.email_verification_expires < datetime.utcnow().timestamp():
            logger.warning(f"Email verification failed - code expired: {request.email}")
            raise ValidationError("Verification code has expired. Please request a new one.")
        
        # Verify the code (stored token is the 6-digit code)
        if user.email_verification_token != request.verification_code:
            logger.warning(f"Email verification failed - invalid code: {request.email}")
            raise ValidationError("Invalid verification code")
        
        # Mark email as verified
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_expires = None
        user.is_active = True
        user.updated_at = datetime.utcnow()
        
        # Generate short-lived verification token for PIN setup (5 minutes)
        verification_token = secrets.token_urlsafe(32)
        user.email_verification_token = verification_token
        user.email_verification_expires = datetime.utcnow().timestamp() + 300  # 5 minutes
        
        await db.commit()
        
        logger.info(f"Email verification successful for: {request.email}")
        
        return AuthResponse(
            success=True,
            message="Email verified successfully! You can now set your transfer PIN.",
            data={
                "redirect_to": "/auth/set-transfer-pin",
                "verification_token": verification_token
            }
        )
        
    except (NotFoundError, ValidationError, ConflictError):
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification failed. Please try again."
        )


@router.post("/start-pin-reset", response_model=AuthResponse)
async def start_pin_reset(
    request: StartPinResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start transfer PIN reset: send 6-digit code to email (expires in 15 minutes)."""
    try:
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()
        if not user:
            # Do not reveal account existence
            return AuthResponse(success=True, message="If the email exists, a reset code was sent", data=None)
        if not user.email_verified:
            return AuthResponse(success=False, message="Email not verified", data=None)
        code = f"{secrets.randbelow(1_000_000):06d}"
        user.email_verification_token = code
        user.email_verification_expires = datetime.utcnow().timestamp() + 900  # 15m
        await db.commit()
        email_sent = email_service.send_pin_reset_email(user.email, code)
        if not email_sent:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send reset code")
        return AuthResponse(success=True, message="Reset code sent to your email", data={"expires_in": 900})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"start_pin_reset error: {e}")
        raise HTTPException(status_code=500, detail="Failed to start PIN reset")


@router.post("/confirm-pin-reset", response_model=AuthResponse)
async def confirm_pin_reset(
    request: ConfirmPinResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Confirm reset code and issue short-lived token (5 minutes)."""
    try:
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if not user.email_verification_token or not user.email_verification_expires:
            raise HTTPException(status_code=400, detail="No reset code found")
        if user.email_verification_expires < datetime.utcnow().timestamp():
            raise HTTPException(status_code=400, detail="Reset code expired")
        if user.email_verification_token != request.code:
            raise HTTPException(status_code=400, detail="Invalid code")
        # Issue short-lived token using password_reset_token fields
        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.utcnow().timestamp() + 300  # 5m
        await db.commit()
        return AuthResponse(success=True, message="Code verified", data={"token": reset_token, "expires_in": 300})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"confirm_pin_reset error: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm reset code")


@router.post("/complete-pin-reset", response_model=AuthResponse)
async def complete_pin_reset(
    request: CompletePinResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Complete reset using token and set new 4-digit PIN."""
    try:
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if not user.password_reset_token or not user.password_reset_expires:
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        if user.password_reset_token != request.token:
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        if user.password_reset_expires < datetime.utcnow().timestamp():
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        # Set new PIN
        user.transfer_pin = hash_password(request.new_pin)
        # Clear reset artifacts and unlock
        user.password_reset_token = None
        user.password_reset_expires = None
        user.email_verification_token = None
        user.email_verification_expires = None
        user.transfer_pin_failed_attempts = 0
        user.transfer_pin_locked_until = None
        user.updated_at = datetime.utcnow()
        await db.commit()
        return AuthResponse(success=True, message="Transfer PIN reset successfully", data=None)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"complete_pin_reset error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset transfer PIN")

@router.post("/resend-verification", response_model=AuthResponse)
async def resend_verification_code(
    request: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Resend email verification code"""
    try:
        logger.info(f"Resend verification request for: {request.email}")
        
        # Find user by email
        user = await db.execute(
            select(User).where(User.email == request.email)
        )
        user = user.scalar_one_or_none()
        
        if not user:
            logger.warning(f"Resend verification failed - user not found: {request.email}")
            raise NotFoundError("User not found")
        
        # Check if already verified
        if user.email_verified:
            logger.info(f"Resend verification - email already verified: {request.email}")
            raise ConflictError("Email already verified")
        
        # Generate new verification code (6-digit)
        verification_code = f"{secrets.randbelow(1000000):06d}"
        expiry_time = datetime.utcnow().timestamp() + 900  # 15 minutes
        
        # Update user with new code
        user.email_verification_token = verification_code
        user.email_verification_expires = expiry_time
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        
        # Send new verification email
        email_sent = email_service.send_verification_email(user.email, verification_code)
        
        if not email_sent:
            logger.error(f"Failed to send verification email to: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email. Please try again."
            )
        
        logger.info(f"Verification code resent to: {request.email}")
        
        return AuthResponse(
            success=True,
            message="New verification code sent to your email. Please check your inbox.",
            data={"expires_in": 900}  # 15 minutes in seconds
        )
        
    except (NotFoundError, ConflictError):
        raise
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification code. Please try again."
        )


@router.post("/set-transfer-pin", response_model=AuthResponse)
async def set_transfer_pin(
    request: SetTransferPinRequest,
    db: AsyncSession = Depends(get_db)
):
    """Set transfer PIN for user with proper authentication"""
    try:
        logger.info(f"Set transfer PIN request for: {request.email}")
        
        # Find user by email
        user = await db.execute(
            select(User).where(User.email == request.email)
        )
        user = user.scalar_one_or_none()
        
        if not user:
            logger.warning(f"Set transfer PIN failed - user not found: {request.email}")
            raise NotFoundError("User not found")
        
        # Check if email is verified
        if not user.email_verified:
            logger.warning(f"Set transfer PIN failed - email not verified: {request.email}")
            raise ValidationError("Please verify your email first")
        
        # Validate verification token if provided
        if request.verification_token:
            # Verify the short-lived token
            if not user.email_verification_token:
                logger.warning(f"Set transfer PIN failed - no verification token: {request.email}")
                raise ValidationError("Invalid verification token")
            
            if user.email_verification_token != request.verification_token:
                logger.warning(f"Set transfer PIN failed - invalid verification token: {request.email}")
                raise ValidationError("Invalid or expired verification token")
            
            if user.email_verification_expires < datetime.utcnow().timestamp():
                logger.warning(f"Set transfer PIN failed - expired verification token: {request.email}")
                raise ValidationError("Verification token has expired")
        
        # Check if user already has a PIN set
        if user.transfer_pin:
            logger.warning(f"Set transfer PIN failed - PIN already set: {request.email}")
            raise ValidationError("Transfer PIN already set. Please contact support to change.")
        
        # Validate PIN format (4 digits)
        if not request.transfer_pin.isdigit() or len(request.transfer_pin) != 4:
            logger.warning(f"Invalid PIN format for: {request.email}")
            raise ValidationError("Transfer PIN must be exactly 4 digits")
        
        # Hash and store the PIN
        user.transfer_pin = hash_password(request.transfer_pin)
        user.updated_at = datetime.utcnow()
        
        # Clear the verification token after use
        user.email_verification_token = None
        user.email_verification_expires = None
        
        await db.commit()
        
        logger.info(f"Transfer PIN set successfully for: {request.email}")
        
        # Generate authentication tokens only after successful verification
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token(user_id=user.id)
        
        return AuthResponse(
            success=True,
            message="Transfer PIN set successfully! You can now access your account.",
            data={
                "redirect_to": "/dashboard",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "tier": user.tier
                }
            }
        )
        
    except (NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error(f"Set transfer PIN error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set transfer PIN. Please try again."
        )


@router.post("/verify-transfer-pin", response_model=AuthResponse)
async def verify_transfer_pin(
    request: VerifyTransferPinRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Verify transfer PIN before initiating a transfer. Requires Bearer token."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.transfer_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer PIN not set. Please set your PIN first.",
        )
    if not verify_password(request.transfer_pin, user.transfer_pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid transfer PIN")
    return AuthResponse(success=True, message="PIN verified", data=None)
