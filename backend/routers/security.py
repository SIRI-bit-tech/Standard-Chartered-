from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db
from utils.auth import get_current_user_id
from utils.totp import generate_secret_b32, otpauth_uri, verify_totp
from models.user import User
from models.security import TrustedDevice
from models.support import LoginHistory
from datetime import datetime, timezone
import uuid
import logging
from models.admin import AdminAuditLog
from schemas.auth import ChangePasswordRequest
from utils.auth import verify_password, hash_password
from utils.ip import get_client_ip, geolocate_ip
from schemas.security import WebAuthnRegisterStartResponse, WebAuthnRegisterRequest
from utils.stytch_client import get_stytch_client
from config import settings
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/security", tags=["Security"])


@router.post("/2fa/setup")
async def start_2fa_setup(
    request: Request,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalar_one_or_none()
    if not user:
        from utils.errors import NotFoundError
        raise NotFoundError(message="User not found")
    if user.two_factor_enabled and user.two_factor_secret:
        # Already enabled, return masked info
        return {"success": True, "enabled": True}
    secret = generate_secret_b32()
    user.two_factor_secret = secret
    db.add(user)
    await db.commit()
    uri = otpauth_uri(secret, account_name=user.email or user.username)
    return {"success": True, "secret": secret, "otpauth_uri": uri}


@router.post("/2fa/verify")
async def verify_2fa_code(
    payload: dict,
    request: Request,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    code = (payload.get("code") or "").strip()
    trust_device = bool(payload.get("trust_device"))
    device_id = (payload.get("device_id") or "").strip() or None
    device_name = (payload.get("device_name") or "").strip() or None
    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalar_one_or_none()
    if not user or not user.two_factor_secret:
        from utils.errors import ValidationError
        raise ValidationError(message="2FA setup not started", details={"field": "code"})
    if not verify_totp(code, user.two_factor_secret):
        from utils.errors import ValidationError
        raise ValidationError(message="Invalid authentication code", details={"field": "code"})
    user.two_factor_enabled = True
    db.add(user)
    # Optionally trust this device
    if trust_device and device_id:
        td = TrustedDevice(
            id=str(uuid.uuid4()),
            user_id=user.id,
            device_id=device_id,
            device_name=device_name or request.headers.get("X-Device-Name") or "",
            user_agent=request.headers.get("User-Agent"),
            ip_address=get_client_ip(request),
            active=True
        )
        db.add(td)
    # Audit log
    try:
        log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=user.id,
            admin_email=user.email,
            action="user_2fa_enable",
            resource_type="security",
            resource_id=user.id,
            details=None,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent")
        )
        db.add(log)
    except Exception:
        pass
    await db.commit()
    return {"success": True, "enabled": True}


@router.post("/2fa/disable")
async def disable_2fa(
    payload: dict,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    code = (payload.get("code") or "").strip()
    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalar_one_or_none()
    if not user:
        from utils.errors import NotFoundError
        raise NotFoundError(message="User not found")
    if not user.two_factor_enabled or not user.two_factor_secret:
        return {"success": True, "enabled": False}
    if not verify_totp(code, user.two_factor_secret):
        from utils.errors import ValidationError
        raise ValidationError(message="Invalid authentication code", details={"field": "code"})
    user.two_factor_enabled = False
    user.two_factor_secret = None
    db.add(user)
    # Audit log
    try:
        log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=user.id,
            admin_email=user.email,
            action="user_2fa_disable",
            resource_type="security",
            resource_id=user.id,
            details=None
        )
        db.add(log)
    except Exception:
        pass
    await db.commit()
    return {"success": True, "enabled": False}


@router.get("/devices")
async def list_trusted_devices(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TrustedDevice).where(TrustedDevice.user_id == current_user_id).order_by(TrustedDevice.last_seen.desc()))
    rows = result.scalars().all()
    return {"success": True, "data": [
        {
            "id": r.id,
            "device_id": r.device_id,
            "device_name": r.device_name,
            "ip_address": r.ip_address,
            "user_agent": r.user_agent,
            "last_seen": r.last_seen.isoformat() if r.last_seen else None,
            "active": r.active
        } for r in rows
    ]}


@router.post("/devices/trust")
async def trust_device(
    payload: dict,
    request: Request,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    device_id = (payload.get("device_id") or "").strip()
    device_name = payload.get("device_name") or request.headers.get("X-Device-Name") or ""
    if not device_id:
        from utils.errors import ValidationError
        raise ValidationError(message="device_id is required")
        
    # Check if existing
    td_res = await db.execute(
        select(TrustedDevice).where(
            TrustedDevice.user_id == current_user_id,
            TrustedDevice.device_id == device_id
        )
    )
    td = td_res.scalar_one_or_none()
    
    if td:
        td.active = True
        td.last_seen = datetime.utcnow()
        td.device_name = device_name
        td.ip_address = get_client_ip(request)
        td.user_agent = request.headers.get("User-Agent")
    else:
        td = TrustedDevice(
            id=str(uuid.uuid4()),
            user_id=current_user_id,
            device_id=device_id,
            device_name=device_name,
            user_agent=request.headers.get("User-Agent"),
            ip_address=get_client_ip(request),
            active=True
        )
    
    db.add(td)
    # Audit
    try:
        log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=current_user_id,
            admin_email="user",
            action="user_trust_device",
            resource_type="security",
            resource_id=device_id
        )
        db.add(log)
    except Exception:
        pass
    await db.commit()
    return {"success": True}


@router.delete("/devices/revoke")
async def revoke_device(
    device_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(delete(TrustedDevice).where(TrustedDevice.user_id == current_user_id, TrustedDevice.device_id == device_id))
    # Audit
    try:
        log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=current_user_id,
            admin_email="user",
            action="user_revoke_device",
            resource_type="security",
            resource_id=device_id
        )
        db.add(log)
    except Exception:
        pass
    await db.commit()
    return {"success": True}


@router.get("/login-history")
async def get_login_history(
    limit: int = 10,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(LoginHistory).where(LoginHistory.user_id == current_user_id).order_by(LoginHistory.created_at.desc()).limit(limit))
    rows = result.scalars().all()
    # Seed a fallback entry from user's last_login if history is empty
    if not rows:
        ures = await db.execute(select(User).where(User.id == current_user_id))
        user = ures.scalar_one_or_none()
        if user and user.last_login:
            try:
                seed = LoginHistory(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    ip_address=None,
                    user_agent=None,
                    device_name="Previous login",
                    device_type=None,
                    country=None,
                    city=None,
                    login_successful=True,
                    failure_reason=None,
                    created_at=user.last_login
                )
                db.add(seed)
                await db.commit()
                result2 = await db.execute(select(LoginHistory).where(LoginHistory.user_id == current_user_id).order_by(LoginHistory.created_at.desc()).limit(limit))
                rows = result2.scalars().all()
            except Exception:
                pass
    return {"success": True, "data": [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat(),
            "ip_address": r.ip_address,
            "city": r.city,
            "country": r.country,
            "device_name": r.device_name,
            "user_agent": r.user_agent,
            "status": "successful" if r.login_successful else "failed",
            "failure_reason": r.failure_reason,
            "city": r.city,
            "country": r.country
        } for r in rows
    ]}


@router.post("/password/change")
async def change_password(
    payload: ChangePasswordRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalar_one_or_none()
    if not user:
        from utils.errors import NotFoundError
        raise NotFoundError(message="User not found")
    if not verify_password(payload.current_password, user.password_hash):
        from utils.errors import ValidationError
        raise ValidationError(
            message="Current password is incorrect", 
            error_code="INVALID_PASSWORD",
            details={"field": "current_password"}
        )
    user.password_hash = hash_password(payload.new_password)
    user.updated_at = datetime.utcnow()
    db.add(user)
    # Audit
    try:
        log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=user.id,
            admin_email=user.email,
            action="user_password_change",
            resource_type="security",
            resource_id=user.id
        )
        db.add(log)
    except Exception:
        pass
    await db.commit()
    return {"success": True, "message": "Password changed successfully"}


@router.post("/biometrics/register/start", response_model=WebAuthnRegisterStartResponse)
async def start_biometric_registration(
    request: Request,
    current_user_id: str = Depends(get_current_user_id)
):
    """Start WebAuthn/Biometric registration ceremony"""
    from utils.stytch_client import get_stytch_client
    stytch_client = get_stytch_client()
    if not stytch_client:
        from utils.errors import InternalServerError
        raise InternalServerError(operation="biometric registration", message="Stytch client not configured")

    try:
        # Extract domain dynamically from the origin or host
        origin = request.headers.get("origin") or settings.FRONTEND_URL
        domain = origin.split("//")[-1].split(":")[0]
        
        logger.info(f"Starting WebAuthn registration for user {current_user_id} on domain {domain}")
        
        # Stytch Python SDK uses webauthn.register_start() — flat method, not nested
        resp = stytch_client.webauthn.register_start(
            user_id=current_user_id,
            domain=domain,
        )
        
        # The SDK returns a response object where public_key_credential_creation_options is already a JSON string
        options_json = resp.public_key_credential_creation_options
        
        return WebAuthnRegisterStartResponse(
            success=True,
            user_id=current_user_id,
            public_key_credential_creation_options=options_json
        )
    except Exception as e:
        logger.error(f"Failed to start biometric registration: {e}")
        from utils.errors import InternalServerError
        raise InternalServerError(operation="biometric registration", original_error=e)


@router.post("/biometrics/register")
async def finish_biometric_registration(
    request: WebAuthnRegisterRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Complete WebAuthn/Biometric registration ceremony"""
    stytch_client = get_stytch_client()
    if not stytch_client:
        from utils.errors import InternalServerError
        raise InternalServerError(operation="biometric registration", message="Stytch client not configured")

    try:
        # Finish the WebAuthn registration process
        # Stytch Python SDK uses webauthn.register() — flat method
        stytch_client.webauthn.register(
            user_id=current_user_id,
            public_key_credential=request.public_key_credential
        )
        
        # Update user in DB
        res = await db.execute(select(User).where(User.id == current_user_id))
        user = res.scalar_one_or_none()
        if user:
            user.biometric_enabled = True
            db.add(user)
            await db.commit()
            
            # Audit log
            log = AdminAuditLog(
                id=str(uuid.uuid4()),
                admin_id=user.id,
                admin_email=user.email,
                action="biometric_enabled",
                resource_type="security",
                resource_id=user.id
            )
            db.add(log)
            await db.commit()

        return {"success": True, "message": "Biometrics enabled successfully"}
    except Exception as e:
        logger.error(f"Failed to complete biometric registration: {e}")
        from utils.errors import InternalServerError
        raise InternalServerError(operation="biometric registration", original_error=e)
@router.post("/biometrics/disable")
async def disable_biometrics(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Disable biometric authentication for the user"""
    try:
        # Update user in DB
        res = await db.execute(select(User).where(User.id == current_user_id))
        user = res.scalar_one_or_none()
        if not user:
            from utils.errors import NotFoundError
            raise NotFoundError(message="User not found")
            
        user.biometric_enabled = False
        db.add(user)
        
        # Audit log
        log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=user.id,
            admin_email=user.email,
            action="biometric_disabled",
            resource_type="security",
            resource_id=user.id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(log)
        
        await db.commit()
        return {"success": True, "message": "Biometrics disabled successfully"}
    except Exception as e:
        logger.error(f"Failed to disable biometrics: {e}")
        from utils.errors import InternalServerError
        raise InternalServerError(operation="disable biometrics", original_error=e)
