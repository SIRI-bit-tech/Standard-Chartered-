from fastapi import APIRouter, Depends, status, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from models.user import User, UserTier
from models.admin import AdminAuditLog
from models.security import TrustedDevice
from models.support import LoginHistory
from database import get_db
from schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, AuthResponse,
    RefreshTokenRequest, ChangePasswordRequest, PasswordResetRequest,
    PasswordResetConfirm
)
from schemas.user import UserResponse
from utils.auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    verify_token, generate_verification_token, generate_reset_token
)
from utils.ably import AblyRealtimeManager
from utils.logger import logger
from config import settings
from services.account import AccountService
from utils.email import send_verification_email
from utils.ip import get_client_ip, geolocate_ip
import uuid
from utils.totp import verify_totp

router = APIRouter()



@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register new user with email verification"""
    try:
        logger.info(f"Registration attempt for email: {request.email}")
        
        # Check if user exists
        existing = await db.execute(
            select(User).where((User.email == request.email) | (User.username == request.username))
        )
        
        if existing.scalar():
            logger.warning(f"User already exists: {request.email}")
            raise ConflictError(
                message="This email or username is already registered"
            )
        
        primary_currency = AccountService.CURRENCY_MAP.get(request.country, "USD")

        # Create new user
        new_user = User(
            id=str(uuid.uuid4()),
            email=request.email,
            username=request.username,
            first_name=request.first_name,
            last_name=request.last_name,
            country=request.country,
            phone=request.phone,
            street_address=request.street_address,
            city=request.city,
            state=request.state,
            postal_code=request.postal_code,
            password_hash=hash_password(request.password),
            primary_currency=primary_currency,
            tier=UserTier.PREMIUM,  # All users get Premium tier
            is_active=False,
            email_verified=False,
            email_verification_token=generate_verification_token(),
            email_verification_expires=datetime.utcnow().timestamp() + 86400,
            created_at=datetime.utcnow()
        )

        # Create user and accounts in a single transaction
        try:
            db.add(new_user)
            
            # Create default accounts for new user (checking, savings, crypto)
            default_accounts = await AccountService.create_default_accounts(
                user_id=new_user.id,
                user_country=request.country,
                db=db
            )
            
            for account in default_accounts:
                db.add(account)
            
            await db.commit()
            logger.info(f"User registered successfully with {len(default_accounts)} accounts: {new_user.email}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to register user {new_user.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration failed. Please try again."
            ) from e

        # Send verification email
        try:
            from utils.email import send_verification_email
            await send_verification_email(
                email=new_user.email,
                verification_token=new_user.email_verification_token,
                first_name=new_user.first_name
            )
            logger.info(f"Verification email sent to {new_user.email}")
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            # Don't fail registration if email fails
            pass

        # Generate tokens

        access_token = create_access_token({"sub": new_user.id, "email": new_user.email})
        refresh_token = create_refresh_token(new_user.id)
        
        # Publish notification
        try:
            # Skip Ably notification if API key is not configured
            if settings.ABLY_API_KEY and settings.ABLY_API_KEY != "your-ably-api-key":
                AblyRealtimeManager.publish_notification(
                    new_user.id,
                    "account_creation",
                    "Welcome to Standard Chartered",
                    "Your account has been created. Please verify your email."
                )
        except Exception as e:
            logger.warning(f"Failed to publish notification: {e}")
        
        logger.info(f"User registered successfully: {new_user.email}")
        
        return AuthResponse(
            success=True,
            message="Registration successful! Please check your email for verification code.",
            data={
                "user_id": new_user.id,
                "redirect_to": "/auth/verify-email",
                "email": new_user.email
            },
            token=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        )
    except ConflictError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration failed", error=e)
        import traceback
        traceback.print_exc()
        raise InternalServerError(
            operation="user registration",
            error_code="REGISTRATION_FAILED",
            original_error=e
        )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Login user with username and password, with optional 2FA requirement"""
    result = await db.execute(
        select(User).where((User.email == request.username) | (User.username == request.username))
    )
    user = result.scalar()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please verify your email."
        )
    
    device_id = request.device_id
    device_name = request.device_name
    user_agent = http_request.headers.get("User-Agent")
    ip_address = get_client_ip(http_request)
    geo = geolocate_ip(ip_address) or {}

    # If 2FA is enabled, ALWAYS require completion (ignore trusted devices)
    if getattr(user, "two_factor_enabled", False):
        # Record pending login attempt
        try:
            lh = LoginHistory(
                id=str(uuid.uuid4()),
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                device_name=device_name,
                device_type=None,
                country=geo.get("country"),
                city=geo.get("city"),
                timezone=geo.get("timezone"),
                login_successful=False,
                failure_reason="2FA_REQUIRED"
            )
            db.add(lh)
            await db.commit()
        except Exception:
            pass
        session_token = create_access_token({"sub": user.id, "purpose": "2fa"}, expires_delta=timedelta(minutes=5))
        # Admin audit: 2FA required on login
        try:
            log = AdminAuditLog(
                id=str(uuid.uuid4()),
                admin_id=user.id,
                admin_email=user.email,
                action="login_2fa_required",
                resource_type="auth",
                resource_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.add(log)
            await db.commit()
        except Exception:
            pass
        return AuthResponse(
            success=True,
            message="Two-factor authentication required",
            data={
                "two_factor_required": True,
                "session_token": session_token
            }
        )
    
    # Update last login and issue tokens
    user.last_login = datetime.utcnow()
    db.add(user)
    await db.commit()
    
    access_token = create_access_token({"sub": user.id, "email": user.username})
    refresh_token = create_refresh_token(user.id)
    
    # Publish notification
    try:
        if settings.ABLY_API_KEY and settings.ABLY_API_KEY != "your-ably-api-key":
            AblyRealtimeManager.publish_notification(
                user.id,
                "login",
                "New Login",
                f"You logged in on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
            )
    except Exception as e:
        logger.warning(f"Failed to publish notification: {e}")
    
    try:
        lh_ok = LoginHistory(
            id=str(uuid.uuid4()),
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_name=device_name,
            device_type=None,
            country=geo.get("country"),
            city=geo.get("city"),
            timezone=geo.get("timezone"),
            login_successful=True
        )
        db.add(lh_ok)
        await db.commit()
    except Exception:
        pass
    
    return AuthResponse(
        success=True,
        message="Login successful",
        data={
            "user_id": user.id,
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "country": user.country,
            "primary_currency": user.primary_currency,
            "tier": user.tier,
            "token": access_token
        },
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

@router.post("/2fa/complete", response_model=AuthResponse)
async def complete_two_factor(
    payload: dict,
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    session_token = payload.get("session_token")
    code = (payload.get("code") or "").strip()
    trust_device = bool(payload.get("trust_device"))
    device_id = (payload.get("device_id") or "").strip() or None
    device_name = (payload.get("device_name") or "").strip() or None
    # Ensure these are always defined
    user_agent = http_request.headers.get("User-Agent")
    ip_address = get_client_ip(http_request)
    payload_decoded = verify_token(session_token)
    if not payload_decoded or payload_decoded.get("purpose") != "2fa":
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user_id = payload_decoded.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    if not user or not getattr(user, "two_factor_enabled", False) or not getattr(user, "two_factor_secret", None):
        raise HTTPException(status_code=400, detail="Two-factor authentication not enabled")
    if not verify_totp(code, user.two_factor_secret):
        raise HTTPException(status_code=400, detail="Invalid authentication code")
    # Success -> issue tokens
    access_token = create_access_token({"sub": user.id, "email": user.username})
    refresh_token = create_refresh_token(user.id)
    # Trust device if requested
    if trust_device and device_id:
        try:
            td = TrustedDevice(
                id=str(uuid.uuid4()),
                user_id=user.id,
                device_id=device_id,
                device_name=device_name or http_request.headers.get("X-Device-Name") or "",
                user_agent=user_agent,
                ip_address=ip_address,
                active=True
            )
            db.add(td)
            await db.commit()
        except Exception:
            pass
    # Record successful login
    try:
        geo = geolocate_ip(ip_address) or {}
        lh_ok = LoginHistory(
            id=str(uuid.uuid4()),
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_name=device_name,
            device_type=None,
            country=geo.get("country"),
            city=geo.get("city"),
            timezone=geo.get("timezone"),
            login_successful=True
        )
        db.add(lh_ok)
        await db.commit()
    except Exception:
        pass
    # Admin audit: 2FA verified on login
    try:
        log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=user.id,
            admin_email=user.email,
            action="login_2fa_verified",
            resource_type="auth",
            resource_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log)
        await db.commit()
    except Exception:
        pass
    # Admin audit: login without 2FA path
    try:
        log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=user.id,
            admin_email=user.email,
            action="login_success",
            resource_type="auth",
            resource_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log)
        await db.commit()
    except Exception:
        pass
    return AuthResponse(
        success=True,
        message="Login successful",
        data={
            "user_id": user.id,
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "token": access_token
        },
        token=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
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
