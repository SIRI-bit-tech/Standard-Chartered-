from fastapi import APIRouter, Depends, status, HTTPException, Request, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from models.user import User, UserTier
from models.admin import AdminAuditLog
from models.security import TrustedDevice
from models.notification import Notification, NotificationType
from models.support import LoginHistory
from database import get_db
from schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, AuthResponse,
    RefreshTokenRequest, ChangePasswordRequest, PasswordResetRequest,
    PasswordResetConfirm, TwoFactorSetupRequest, TwoFactorVerifyRequest
)
from schemas.security import (
    WebAuthnRegisterStartResponse, WebAuthnRegisterRequest,
    WebAuthnAuthenticateStartResponse, WebAuthnAuthenticateRequest
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
    response: Response,
    background_tasks: BackgroundTasks,
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

        # Strict password validation
        password = request.password
        if len(password) < 10:
            raise ValidationError(message="Password must be at least 10 characters long", details={"field": "password"})
        if not any(char.isdigit() for char in password):
            raise ValidationError(message="Password must contain at least one number", details={"field": "password"})
        if not any(not char.isalnum() for char in password):
            raise ValidationError(message="Password must contain at least one symbol", details={"field": "password"})
        
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
                    from utils.stytch_client import parse_stytch_error
                    msg, code = parse_stytch_error(e)
                    logger.error(f"Failed to create Stytch user: {msg} ({code})")
                    
                    # Determine which field the error likely refers to
                    details = {}
                    if "password" in str(code).lower() or "password" in msg.lower():
                        details = {"field": "password"}
                    elif "email" in str(code).lower() or "email" in msg.lower():
                        details = {"field": "email"}
                        
                    raise ValidationError(
                        message=msg,
                        error_code=code,
                        details=details,
                        original_error=e
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
            logger.info(f"User registered successfully: {new_user.email}")
            
            # Queue email AFTER successful commit to ensure user exists
            from utils.email import send_verification_email
            logger.info(f"Queuing verification code task for {new_user.email}")
            background_tasks.add_task(
                send_verification_email,
                email=new_user.email,
                verification_token=new_user.email_verification_token,
                first_name=new_user.first_name
            )
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to register user {new_user.email}: {e}")
            
            # --- STYTCH CLEANUP ---
            # If Stytch user was created but registration failed, delete it from Stytch
            # so the user can retry with the same email.
            if stytch_user_id:
                try:
                    from utils.stytch_client import delete_stytch_user
                    delete_stytch_user(stytch_user_id)
                    logger.info(f"Cleaned up Stytch user {stytch_user_id} after registration failure")
                except Exception as cleanup_err:
                    logger.error(f"Failed to cleanup Stytch user {stytch_user_id}: {cleanup_err}")
            
            # If it's a Stytch error, parse and re-raise appropriately
            from utils.stytch_client import parse_stytch_error
            try:
                msg, code = parse_stytch_error(e)
                if msg:
                   from utils.errors import ValidationError
                   raise ValidationError(message=msg, operation="stytch registration")
            except Exception:
                pass
            
            # Re-raise the original error if we didn't raise a validation error
            raise e


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
        
        def set_auth_cookies(resp: Response, access: str, refresh: str):
            resp.set_cookie(
                key="access_token",
                value=access,
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
            resp.set_cookie(
                key="refresh_token",
                value=refresh,
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
            )

        set_auth_cookies(response, access_token, refresh_token)

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
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    # Authentication & Fraud Protection via Stytch if configured
    stytch_session_token = None
    force_2fa = False
    user = None
    
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
                        from utils.errors import UnauthorizedError
                        raise UnauthorizedError(message="Access denied due to security policy")
                    elif action == "CHALLENGE":
                        logger.info(f"Forcing 2FA challenge for {request.username} due to fraud verdict")
                        force_2fa = True
                except HTTPException:
                    raise
                except Exception as e:
                    logger.warning(f"Stytch fraud lookup failed: {e}")

            # 2. Authenticate
            # Note: We only try Stytch if the identifier looks like an email
            if "@" in request.username:
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
                        # Non-200 from Stytch: log and fall through to local auth
                        logger.warning(f"Stytch authenticate returned {resp.status_code} for {request.username}, trying local auth")
                        user = None
                except Exception as e:
                    # Stytch unavailable or error: log and fall through to local auth
                    # We use warning here because we fall back to local DB auth anyway
                    logger.warning(f"Stytch authentication skipped/failed for {request.username}: {e}")
                    user = None
            else:
                logger.info(f"Skipping Stytch auth for non-email username: {request.username}")
                user = None
    
    # Fallback to local auth if not using Stytch or Stytch user not found
    if not user:
        result = await db.execute(
            select(User).where((User.email == request.username) | (User.username == request.username))
        )
        user = result.scalar()
        
        if not user or not verify_password(request.password, user.password_hash):
            from utils.errors import AuthenticationError
            raise AuthenticationError(message="Invalid credentials")
    
    if not user.is_active:
        from utils.errors import UnauthorizedError
        raise UnauthorizedError(message="Account is inactive. Please verify your email.")
    
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
                TrustedDevice.device_id == (device_id or "").strip(),
                TrustedDevice.active == True
            ).limit(1)
        )
        existing_td = td_res.scalar_one_or_none()
        if existing_td:
            is_new_device = False
            logger.info(f"Trusted device recognized for user {user.id}: {device_id}")
            # Update last_seen
            existing_td.last_seen = datetime.utcnow()
            existing_td.ip_address = ip_address
            db.add(existing_td)
        else:
            logger.info(f"New device detected for user {user.id}: {device_id}")

    # Update last login and issue tokens
    user.last_login = datetime.utcnow()
    db.add(user)
    
    # Alert user about new device login (email + in-app notification)
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
        # Create persistent in-app notification
        try:
            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=user.id,
                type=NotificationType.SECURITY,
                title="New device login detected",
                message=f"We detected a login from {device_name or 'a new device'} at {geo.get('city', 'Unknown')}, {geo.get('country', 'Unknown')}.",
                action_url=f"{settings.FRONTEND_URL}/dashboard/profile",
            )
            db.add(notif)
        except Exception:
            pass

    await db.commit()

    access_token = create_access_token({"sub": user.id, "email": user.username})
    refresh_token = create_refresh_token(user.id)
    
    # Publish real-time notification for login (includes ID when new device)
    try:
        if settings.ABLY_API_KEY and settings.ABLY_API_KEY != "your-ably-api-key":
            extra_data = {}
            if is_new_device:
                extra_data = {
                    "device_name": device_name or "Unknown Device",
                    "ip_address": ip_address,
                    "city": geo.get("city"),
                    "country": geo.get("country"),
                }
            AblyRealtimeManager.publish_notification(
                user.id,
                "login",
                "New Login",
                f"You logged in on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                extra_data or None,
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
    
    def set_auth_cookies(resp: Response, access: str, refresh: str):
        resp.set_cookie(
            key="access_token",
            value=access,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        resp.set_cookie(
            key="refresh_token",
            value=refresh,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        )
    
    set_auth_cookies(response, stytch_session_token or access_token, refresh_token)

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
            "biometric_enabled": getattr(user, "biometric_enabled", False),
            "is_restricted": getattr(user, "is_restricted", False) and (user.restricted_until is None or (user.restricted_until.replace(tzinfo=timezone.utc) if user.restricted_until.tzinfo is None else user.restricted_until) > datetime.now(timezone.utc)),
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
    http_request: Request,
    request: RefreshTokenRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    refresh_token = request.refresh_token or http_request.cookies.get("refresh_token")
    
    if not refresh_token:
        from utils.errors import AuthenticationError
        raise AuthenticationError(message="Refresh token missing")

    payload = verify_token(refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        from utils.errors import AuthenticationError
        raise AuthenticationError(message="Invalid refresh token")
    
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    
    if not user:
        from utils.errors import NotFoundError
        raise NotFoundError(resource="User")
    
    # Generate new access token
    access_token = create_access_token({"sub": user.id, "email": user.email})
    
    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/2fa/complete", response_model=AuthResponse)
async def complete_two_factor(
    payload: dict,
    http_request: Request,
    response: Response,
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
        from utils.errors import AuthenticationError
        raise AuthenticationError(message="Invalid or expired session")
    user_id = payload_decoded.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    if not user or not getattr(user, "two_factor_enabled", False) or not getattr(user, "two_factor_secret", None):
        from utils.errors import ValidationError
        raise ValidationError(message="Two-factor authentication not enabled")
    if not verify_totp(code, user.two_factor_secret):
        from utils.errors import ValidationError
        raise ValidationError(message="Invalid authentication code", details={"field": "code"})
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
    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

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

@router.post("/biometrics/authenticate/start", response_model=WebAuthnAuthenticateStartResponse)
async def start_biometric_authentication(request: Request):
    """Start WebAuthn/Biometric authentication (Get options from Stytch)"""
    from utils.stytch_client import get_stytch_client
    stytch_client = get_stytch_client()
    if not stytch_client:
        from utils.errors import InternalServerError
        raise InternalServerError(operation="biometric authentication", message="Stytch client not configured")

    try:
        # Extract domain dynamically from the origin or host
        origin = request.headers.get("origin") or settings.FRONTEND_URL
        domain = origin.split("//")[-1].split(":")[0]
        
        logger.info(f"Starting WebAuthn authentication on domain {domain}")
        
        # Stytch Python SDK uses webauthn.authenticate_start() — flat method
        resp = stytch_client.webauthn.authenticate_start(
            domain=domain
        )
        
        return WebAuthnAuthenticateStartResponse(
            success=True,
            user_id=resp.user_id or "anonymous", # User ID may be unknown for Discoverable Credentials
            public_key_credential_request_options=resp.public_key_credential_request_options
        )
    except Exception as e:
        logger.error(f"Failed to start biometric authentication: {e}")
        from utils.errors import InternalServerError
        raise InternalServerError(operation="biometric authentication", original_error=e)

@router.post("/biometrics/authenticate", response_model=AuthResponse)
async def biometric_authentication(
    request: WebAuthnAuthenticateRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Log in using WebAuthn/Biometrics (Discoverable Credentials)"""
    from utils.stytch_client import get_stytch_client
    stytch_client = get_stytch_client()
    if not stytch_client:
        from utils.errors import InternalServerError
        raise InternalServerError(operation="biometric authentication", message="Stytch client not configured")

    try:
        # 1. Authenticate the passkey with Stytch
        # This will identify the user and create a Stytch session
        auth_resp = stytch_client.webauthn.authenticate(
            public_key_credential=request.public_key_credential,
            session_duration_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        
        if auth_resp.status_code not in [200, 201]:
            from utils.errors import UnauthorizedError
            raise UnauthorizedError(message="Biometric authentication failed")

        stytch_user_id = auth_resp.user_id
        
        # 2. Get user from our DB
        result = await db.execute(select(User).where(User.id == stytch_user_id))
        user = result.scalar()
        
        if not user:
            from utils.errors import NotFoundError
            raise NotFoundError(message="User account not found")

        # 3. Create our own tokens
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token(user.id)
        
        # 4. Set cookies
        def set_auth_cookies(resp: Response, access: str, refresh: str):
            resp.set_cookie(
                key="access_token",
                value=access,
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
            resp.set_cookie(
                key="refresh_token",
                value=refresh,
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
            )

        set_auth_cookies(response, access_token, refresh_token)
        
        # 5. Update user
        user.last_login = datetime.now(timezone.utc)
        db.add(user)
        
        # Audit Log
        log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=user.id,
            admin_email=user.email,
            action="biometric_login",
            resource_type="auth",
            resource_id=user.id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(log)
        await db.commit()

        return AuthResponse(
            success=True,
            message="Biometric login successful",
            data={
                "user": UserResponse.model_validate(user),
                "redirect_to": "/dashboard"
            },
            token=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        )
    except Exception as e:
        # Log the full details of the exception for debugging
        logger.error(f"Biometric authentication error: {type(e).__name__}: {str(e)}")
        if hasattr(e, "error_type"):
            logger.error(f"Stytch error type: {e.error_type}")
        if hasattr(e, "error_message"):
            logger.error(f"Stytch error message: {e.error_message}")
            
        from utils.errors import AuthenticationError
        raise AuthenticationError(message="Biometric authentication failed", original_error=e)
