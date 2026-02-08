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
    AuthResponse
)
from services.email import email_service
from services.account import AccountService
from utils.auth import hash_password, verify_password, create_access_token, create_refresh_token, verify_token
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
        
        await db.commit()
        
        # Send welcome email
        try:
            email_service.send_welcome_email(
                user.email, 
                f"{user.first_name} {user.last_name}"
            )
        except Exception as e:
            logger.warning(f"Failed to send welcome email: {e}")
        
        logger.info(f"Email verification successful for: {request.email}")
        
        return AuthResponse(
            success=True,
            message="Email verified successfully! You can now set your transfer PIN.",
            data={"redirect_to": "/auth/set-transfer-pin"}
        )
        
    except (NotFoundError, ValidationError, ConflictError):
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification failed. Please try again."
        )


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
    """Set transfer PIN for user"""
    try:
        logger.info(f"Set transfer PIN request for: {request.email}")
        
        # Validate PIN format (4 digits)
        if not request.transfer_pin.isdigit() or len(request.transfer_pin) != 4:
            logger.warning(f"Invalid PIN format for: {request.email}")
            raise ValidationError("Transfer PIN must be exactly 4 digits")
        
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
        
        # Hash and store the PIN
        user.transfer_pin = hash_password(request.transfer_pin)
        user.updated_at = datetime.utcnow()
        
        # Create default accounts for the user
        try:
            accounts = await AccountService.create_default_accounts(user.id, user.country, db)
            for account in accounts:
                db.add(account)
            
            await db.commit()
            logger.info(f"Created default accounts for user: {user.email}")
        except Exception as e:
            logger.error(f"Failed to create accounts: {e}")
            # Continue with PIN setup even if account creation fails
        
        await db.commit()
        
        logger.info(f"Transfer PIN set successfully for: {request.email}")
        
        # Generate authentication tokens for the user
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token()
        
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
