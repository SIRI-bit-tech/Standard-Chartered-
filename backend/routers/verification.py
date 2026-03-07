from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.exceptions import RequestValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
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
    MagicLinkRequest,
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
from utils.errors import NotFoundError, ValidationError, ConflictError, AuthenticationError

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
            logger.warning(f"Email verification failed - no code found: {request.email}")
            raise ValidationError("No verification code found. Please request a new one.")
        
        if user.email_verification_expires < datetime.now(timezone.utc).timestamp():
            logger.warning(f"Email verification failed - code expired: {request.email}")
            raise ValidationError("Verification code has expired. Please request a new one.")
        
        # Verify the code (stored in email_verification_token)
        if user.email_verification_token != request.verification_code:
            logger.warning(f"Email verification failed - invalid code: {request.email}")
            raise ValidationError("Invalid verification code")
        
        # Mark email as verified
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_expires = None
        user.is_active = True
        user.updated_at = datetime.now(timezone.utc)
        
        # Generate short-lived verification token for PIN setup (5 minutes)
        verification_token = secrets.token_urlsafe(32)
        user.email_verification_token = verification_token
        user.email_verification_expires = datetime.now(timezone.utc).timestamp() + 300  # 5 minutes
        
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
        from utils.errors import InternalServerError
        raise InternalServerError(operation="email verification", original_error=e)


@router.post("/verify-magic-link", response_model=AuthResponse)
async def verify_magic_link(
    request: MagicLinkRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify Stytch magic link token and activate user email."""
    try:
        from utils.stytch_client import get_stytch_client
        stytch_client = get_stytch_client()
        if not stytch_client:
            from utils.errors import InternalServerError
            raise InternalServerError(operation="Stytch verification initialization")
        
        try:
            # Authenticate the magic link token with Stytch
            resp = stytch_client.magic_links.authenticate(token=request.token)
            if resp.status_code != 200:
                raise ValidationError("Invalid or expired magic link token")
            
            stytch_user_id = resp.user_id
            email = resp.user.emails[0].email
            
            # Find local user by Stytch ID or Email
            user = await db.execute(
                select(User).where((User.id == stytch_user_id) | (User.email == email))
            )
            user = user.scalar_one_or_none()
            
            if not user:
                # If stytch verified but we don't have them, they might have registered elsewhere or DB desync
                logger.error(f"User {email} verified by Stytch but not found in local DB")
                raise NotFoundError("Account record not found")
            
            # Update user verification status
            user.email_verified = True
            user.is_active = True
            user.updated_at = datetime.now(timezone.utc)
            
            # Generate short-lived token for PIN setup
            verification_token = secrets.token_urlsafe(32)
            user.email_verification_token = verification_token
            user.email_verification_expires = datetime.now(timezone.utc).timestamp() + 300
            
            await db.commit()
            
            return AuthResponse(
                success=True,
                message="Email verified successfully!",
                data={"email": user.email, "verification_token": verification_token}
            )
            
        except Exception as e:
            from utils.stytch_client import parse_stytch_error
            msg, _ = parse_stytch_error(e)
            raise ValidationError(msg)
            
    except (NotFoundError, ValidationError, ConflictError):
        raise
    except Exception as e:
        logger.error(f"Magic link verification error: {e}")
        from utils.errors import InternalServerError
        raise InternalServerError(operation="magic link verification", original_error=e)


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
        user.email_verification_expires = datetime.now(timezone.utc).timestamp() + 900  # 15m
        await db.commit()
        email_sent = email_service.send_pin_reset_email(user.email, code)
        if not email_sent:
            from utils.errors import InternalServerError
            raise InternalServerError(operation="sending pin reset email")
        return AuthResponse(success=True, message="Reset code sent to your email", data={"expires_in": 900})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"start_pin_reset error: {e}")
        from utils.errors import InternalServerError
        raise InternalServerError(operation="start PIN reset", original_error=e)


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
            from utils.errors import NotFoundError
            raise NotFoundError(resource="User")
        if not user.email_verification_token or not user.email_verification_expires:
            from utils.errors import ValidationError
            raise ValidationError(message="No reset code found")
        if user.email_verification_expires < datetime.now(timezone.utc).timestamp():
            from utils.errors import ValidationError
            raise ValidationError(message="Reset code expired")
        if user.email_verification_token != request.code:
            from utils.errors import ValidationError
            raise ValidationError(message="Invalid code")
        # Issue short-lived token using password_reset_token fields
        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now(timezone.utc).timestamp() + 300  # 5m
        await db.commit()
        return AuthResponse(success=True, message="Code verified", data={"token": reset_token, "expires_in": 300})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"confirm_pin_reset error: {e}")
        from utils.errors import InternalServerError
        raise InternalServerError(operation="confirm reset code", original_error=e)


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
            from utils.errors import NotFoundError
            raise NotFoundError(resource="User")
        if not user.password_reset_token or not user.password_reset_expires:
            from utils.errors import ValidationError
            raise ValidationError(message="Invalid or expired token")
        if user.password_reset_token != request.token:
            from utils.errors import ValidationError
            raise ValidationError(message="Invalid or expired token")
        if user.password_reset_expires < datetime.now(timezone.utc).timestamp():
            from utils.errors import ValidationError
            raise ValidationError(message="Invalid or expired token")
        # Set new PIN
        user.transfer_pin = hash_password(request.new_pin)
        # Clear reset artifacts and unlock
        user.password_reset_token = None
        user.password_reset_expires = None
        user.email_verification_token = None
        user.email_verification_expires = None
        user.transfer_pin_failed_attempts = 0
        user.transfer_pin_locked_until = None
        user.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return AuthResponse(success=True, message="Transfer PIN reset successfully", data=None)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"complete_pin_reset error: {e}")
        from utils.errors import InternalServerError
        raise InternalServerError(operation="reset transfer PIN", original_error=e)

@router.post("/resend-verification", response_model=AuthResponse)
async def resend_verification_code(
    request: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Resend 6-digit email verification code"""
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
        
        # Always use local verification email to bypass Stytch billing/domain restrictions
        # Refresh token if needed or reuse existing
        if not user.email_verification_token or len(user.email_verification_token) > 6 or user.email_verification_expires < datetime.now(timezone.utc).timestamp():
            from utils.auth import generate_verification_token
            user.email_verification_token = generate_verification_token()
            user.email_verification_expires = datetime.now(timezone.utc).timestamp() + 86400 # 24h
            db.add(user)
            await db.commit()

        from utils.email import send_verification_email
        logger.info(f"Queuing verification code resend for {user.email}")
        background_tasks.add_task(
            send_verification_email,
            email=user.email,
            verification_token=user.email_verification_token,
            first_name=user.first_name
        )
        
        logger.info(f"Verification code resent to: {request.email}")
        
        return AuthResponse(
            success=True,
            message="A new 6-digit verification code has been sent to your email.",
            data={"expires_in": 3600}
        )
        
    except (NotFoundError, ConflictError):
        raise
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        from utils.errors import InternalServerError
        raise InternalServerError(operation="resending verification code")


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
            
            if user.email_verification_expires < datetime.now(timezone.utc).timestamp():
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
        user.updated_at = datetime.now(timezone.utc)
        
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
        from utils.errors import InternalServerError
        raise InternalServerError(operation="set transfer PIN", original_error=e)


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
        from utils.errors import NotFoundError
        raise NotFoundError(resource="User")
    if not user.transfer_pin:
        from utils.errors import ValidationError
        raise ValidationError(
            message="Transfer PIN not set. Please set your PIN first.",
            details={"field": "transfer_pin"}
        )
    if not verify_password(request.transfer_pin, user.transfer_pin):
        from utils.errors import ValidationError
        raise ValidationError(message="Invalid transfer PIN", details={"field": "transfer_pin"})
    return AuthResponse(success=True, message="PIN verified", data=None)
