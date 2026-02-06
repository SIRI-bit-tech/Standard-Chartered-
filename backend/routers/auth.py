from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from models.user import User
from database import get_db
from schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, AuthResponse,
    RefreshTokenRequest, ChangePasswordRequest, PasswordResetRequest,
    PasswordResetConfirm, EmailVerificationRequest
)
from schemas.user import UserResponse
from utils.auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    verify_token, generate_verification_token, generate_reset_token
)
from utils.ably import AblyRealtimeManager
from utils.errors import (
    ValidationError, AuthenticationError, NotFoundError, ConflictError, InternalServerError
)
from utils.logger import logger
from config import settings
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

# Currency mapping by country
CURRENCY_MAP = {
    "US": "USD", "UK": "GBP", "EU": "EUR", "KW": "KWD",
    "AE": "AED", "SG": "SGD", "HK": "HKD", "IN": "INR",
    "NG": "NGN", "ZA": "ZAR", "KE": "KES"
}


@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register new user with email verification"""
    try:
        # Check if user exists
        existing = await db.execute(
            select(User).where((User.email == request.email) | (User.username == request.username))
        )
        if existing.scalar():
            raise ConflictError(
                message="This email or username is already registered",
                error_code="USER_EXISTS"
            )
    
    primary_currency = CURRENCY_MAP.get(request.country.upper(), "USD")
    
    # Create new user
    new_user = User(
        id=str(uuid.uuid4()),
        email=request.email,
        username=request.username,
        first_name=request.first_name,
        last_name=request.last_name,
        country=request.country.upper(),
        phone=request.phone,
        password_hash=hash_password(request.password),
        primary_currency=primary_currency,
        is_active=False,
        is_email_verified=False,
        email_verification_token=generate_verification_token(),
        email_verification_expires=datetime.utcnow().timestamp() + 86400,
        created_at=datetime.utcnow()
    )
    
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        # Generate tokens
        access_token = create_access_token({"sub": new_user.id, "email": new_user.email})
        refresh_token = create_refresh_token(new_user.id)
        
        # Publish notification
        try:
            AblyRealtimeManager.publish_notification(
                new_user.id,
                "account_creation",
                "Welcome to Standard Chartered",
                "Your account has been created. Please verify your email."
            )
        except Exception as e:
            logger.warning("Failed to publish notification", error=e)
        
        logger.info(f"User registered successfully: {new_user.email}")
        
        return AuthResponse(
            success=True,
            message="Registration successful. Please verify your email.",
            data={
                "user_id": new_user.id,
                "email": new_user.email,
                "verification_required": True
            },
            token=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        )
    except ConflictError:
        raise
    except Exception as e:
        logger.error("Registration failed", error=e)
        raise InternalServerError(
            operation="user registration",
            error_code="REGISTRATION_FAILED",
            original_error=e
        )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login user with email and password"""
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please verify your email."
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.add(user)
    await db.commit()
    
    # Generate tokens
    access_token = create_access_token({"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token(user.id)
    
    # Publish notification
    AblyRealtimeManager.publish_notification(
        user.id,
        "login",
        "New Login",
        f"You logged in on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
    )
    
    return AuthResponse(
        success=True,
        message="Login successful",
        data={"user_id": user.id},
        token=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    payload = verify_token(request.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate new access token
    access_token = create_access_token({"sub": user.id, "email": user.email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=request.refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/verify-email", response_model=AuthResponse)
async def verify_email(
    request: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify email with token"""
    result = await db.execute(
        select(User).where(User.email_verification_token == request.token)
    )
    user = result.scalar()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    if user.email_verification_expires < datetime.utcnow().timestamp():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token expired"
        )
    
    # Activate user
    user.is_email_verified = True
    user.is_active = True
    user.email_verification_token = None
    db.add(user)
    await db.commit()
    
    # Publish notification
    AblyRealtimeManager.publish_notification(
        user.id,
        "email_verified",
        "Email Verified",
        "Your email has been successfully verified."
    )
    
    return AuthResponse(
        success=True,
        message="Email verified successfully"
    )


@router.post("/change-password", response_model=AuthResponse)
async def change_password(
    user_id: str,
    request: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Update password
    user.password_hash = hash_password(request.new_password)
    db.add(user)
    await db.commit()
    
    # Publish notification
    AblyRealtimeManager.publish_notification(
        user.id,
        "password_changed",
        "Password Changed",
        "Your password has been successfully changed."
    )
    
    return AuthResponse(
        success=True,
        message="Password changed successfully"
    )


@router.post("/request-password-reset", response_model=AuthResponse)
async def request_password_reset(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset"""
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar()
    
    if user:
        reset_token = generate_reset_token()
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.utcnow().timestamp() + 3600
        db.add(user)
        await db.commit()
    
    # Always return success to prevent email enumeration
    return AuthResponse(
        success=True,
        message="If email exists, password reset link has been sent"
    )


@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Reset password with token"""
    result = await db.execute(
        select(User).where(User.password_reset_token == request.token)
    )
    user = result.scalar()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    if user.password_reset_expires < datetime.utcnow().timestamp():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token expired"
        )
    
    # Update password
    user.password_hash = hash_password(request.password)
    user.password_reset_token = None
    db.add(user)
    await db.commit()
    
    # Publish notification
    AblyRealtimeManager.publish_notification(
        user.id,
        "password_reset",
        "Password Reset",
        "Your password has been successfully reset."
    )
    
    return AuthResponse(
        success=True,
        message="Password has been reset successfully"
    )
