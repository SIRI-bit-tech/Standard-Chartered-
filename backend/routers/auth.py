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
from utils.errors import ConflictError, InternalServerError, ValidationError, NotFoundError
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

        # Create Stytch user if provider is stytch
        stytch_user_id = None
        if settings.AUTH_PROVIDER == "stytch":
            from utils.stytch_client import get_stytch_client
            stytch_client = get_stytch_client()
            if stytch_client:
                try:
                    # Stytch creates the user and the password in one go
                    stytch_resp = stytch_client.passwords.create(
                        email=request.email,
                        password=request.password,
                        session_duration_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
                    )
                    if stytch_resp.status_code in [200, 201]:
                        stytch_user_id = stytch_resp.user_id
                        logger.info(f"Stytch user created: {stytch_user_id}")
                except Exception as e:
                    logger.error(f"Failed to create Stytch user: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Authentication provider failure. Please try again later."
                    )

        # Create new user
        new_user = User(
            id=stytch_user_id or str(uuid.uuid4()),
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
    # Authentication & Fraud Protection via Stytch if configured
    stytch_session_token = None
    force_2fa = False
    
    if settings.AUTH_PROVIDER == "stytch":
        from utils.stytch_client import get_stytch_client
        stytch_client = get_stytch_client()
        if stytch_client:
            # 1. Fraud Check
            if request.telemetry_id:
                try:
                    fraud_resp = stytch_client.fraud.fingerprint.lookup(telemetry_id=request.telemetry_id)
                    action = fraud_resp.verdict.action
                    logger.info(f"Stytch fraud verdict for {request.username}: {action}")
                    
                    if action == "BLOCK":
                        logger.warning(f"Blocking login attempt due to fraud verdict: {request.username}")
                        raise HTTPException(status_code=403, detail="Access denied due to security policy")
                    elif action == "CHALLENGE":
                        logger.info(f"Forcing 2FA challenge for {request.username} due to fraud verdict")
                        force_2fa = True
                except HTTPException:
                    raise
                except Exception as e:
                    logger.warning(f"Stytch fraud lookup failed: {e}")

            # 2. Authenticate
            try:
                resp = stytch_client.passwords.authenticate(
                    email=request.username,
                    password=request.password,
                    session_duration_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
                )
                if resp.status_code == 200:
                    stytch_session_token = resp.session_token
                    # Find user by stytch user_id
                    result = await db.execute(select(User).where(User.id == resp.user_id))
                    user = result.scalar()
                else:
                    raise HTTPException(status_code=401, detail="Invalid credentials")
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Stytch authentication error: {e}")
                raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Fallback to local auth if not using Stytch or Stytch user not found
    if not user:
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

    # If 2FA is enabled or forced by fraud verdict, require completion
    if getattr(user, "two_factor_enabled", False) or force_2fa:
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
    
    
    # Check if this is a trusted device
    is_new_device = True
    if device_id:
        td_res = await db.execute(
            select(TrustedDevice).where(
                TrustedDevice.user_id == user.id,
                TrustedDevice.device_id == device_id,
                TrustedDevice.active == True
            )
        )
        existing_td = td_res.scalar_one_or_none()
        if existing_td:
            is_new_device = False
            # Update last_seen
            existing_td.last_seen = datetime.utcnow()
            existing_td.ip_address = ip_address
            db.add(existing_td)

    # Update last login and issue tokens
    user.last_login = datetime.utcnow()
    db.add(user)
    
    # Alert user about new device login
    if is_new_device:
        try:
             from utils.email import send_login_alert
             await send_login_alert(
                 email=user.email,
                 first_name=user.first_name,
                 device_name=device_name or "Unknown Device",
                 ip_address=ip_address,
                 location=f"{geo.get('city', 'Unknown')}, {geo.get('country', 'Unknown')}"
             )
        except Exception as e:
            logger.error(f"Failed to send login alert: {e}")

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
            "is_restricted": getattr(user, "is_restricted", False) and (user.restricted_until is None or user.restricted_until > datetime.utcnow()),
            "restricted_until": user.restricted_until.isoformat() if getattr(user, "restricted_until", None) else None,
            "token": stytch_session_token or access_token,
            "is_new_device": is_new_device,
            "device_id": device_id,
            "device_name": device_name,
        },
        token=TokenResponse(
            access_token=stytch_session_token or access_token,
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
