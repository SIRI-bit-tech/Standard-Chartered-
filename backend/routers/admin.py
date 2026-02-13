from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from datetime import datetime
import uuid
import json

from models.admin import AdminUser, AdminAuditLog, AdminRole
from models.user import User
from models.account import Account, AccountStatus
from models.transaction import Transaction
from models.notification import Notification, NotificationType
from models.transfer import Transfer, TransferStatus
from models.deposit import Deposit, DepositStatus
from models.virtual_card import VirtualCard, VirtualCardStatus
from models.loan import Loan, LoanStatus

# Explicit import to avoid any issues
CardStatus = VirtualCardStatus
from database import get_db
from schemas.admin import (
    AdminRegisterRequest, AdminLoginRequest, AdminResponse,
    ApproveTransferRequest, DeclineTransferRequest, TransferApprovalResponse,
    ApproveDepositRequest, DeclineDepositRequest, DepositApprovalResponse,
    ApproveVirtualCardRequest, DeclineVirtualCardRequest, VirtualCardApprovalResponse,
    AdminCreateUserRequest, AdminEditUserRequest, AdminAuditLogResponse,
    AdminAccountStatusRequest, AdminAdjustBalanceRequest, AdminUpdateCardStatusRequest, AdminCardActionRequest,
    AdminStatisticsResponse
)
from pydantic import ValidationError as PydanticValidationError
from utils.admin_auth import AdminAuthManager, AdminPermissionManager
from utils.errors import (
    ValidationError, AuthenticationError, NotFoundError, UnauthorizedError, InternalServerError
)
from utils.logger import logger
from utils.ably import AblyRealtimeManager, get_admin_ably_token_request
from config import settings
from services.email import email_service

router = APIRouter(prefix="/admin", tags=["admin"])


def _to_admin_user_id(user: User) -> str:
    """Create a stable, friendly user id like SC-882104."""
    # Keep it deterministic for a given UUID-ish id: take digits from hex.
    digits = ''.join([c for c in user.id if c.isdigit()])
    suffix = (digits[-6:] if len(digits) >= 6 else (digits + "000000")[:6])
    return f"SC-{suffix}"


def _user_status(user: User) -> str:
    if not user.is_active:
        return "inactive"
    if getattr(user, "is_locked", False):
        return "suspended"
    return "active"


def _verification_status(user: User) -> str:
    if getattr(user, "email_verified", False):
        return "verified"
    return "pending"


@router.get("/dashboard/overview")
async def admin_dashboard_overview(
    admin_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Admin dashboard data based entirely on live database values."""
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    # KPIs
    users_result = await db.execute(select(User))
    users = users_result.scalars().all()
    accounts_result = await db.execute(select(Account))
    accounts = accounts_result.scalars().all()

    # Monthly transactions: last 30 days
    cutoff = datetime.utcnow().timestamp() - (30 * 24 * 60 * 60)
    tx_result = await db.execute(select(Transaction))
    transactions = tx_result.scalars().all()
    monthly_transactions = len([t for t in transactions if t.created_at.timestamp() >= cutoff])

    pending_verifications = len([u for u in users if not u.identity_verified])

    kpis = {
        "total_users": len(users),
        "total_accounts": len(accounts),
        "monthly_transactions": monthly_transactions,
        "pending_verifications": pending_verifications,
    }

    # Simple chart data (last 6 months) - computed from existing rows.
    now = datetime.utcnow()
    months = []
    for i in range(5, -1, -1):
        m = (now.month - i - 1) % 12 + 1
        y = now.year + ((now.month - i - 1) // 12)
        months.append((y, m))

    def month_label(y: int, m: int) -> str:
        return datetime(y, m, 1).strftime("%b").upper()

    tx_series = []
    for y, m in months:
        count = len([t for t in transactions if t.created_at.year == y and t.created_at.month == m])
        tx_series.append({"label": month_label(y, m), "value": count})

    user_series = []
    for y, m in months:
        count = len([u for u in users if u.created_at.year == y and u.created_at.month == m])
        user_series.append({"label": month_label(y, m), "value": count})

    # Activity feed - last 6 notification-driven events (real data).
    notif_result = await db.execute(
        select(Notification).order_by(Notification.created_at.desc()).limit(6)
    )
    notifs = notif_result.scalars().all()

    activity_feed = []
    for n in notifs:
        # Map notification type to a simple status for the activity pill.
        if n.type in (NotificationType.SECURITY, NotificationType.ALERT):
            status = "flagged"
        elif n.type == NotificationType.TRANSACTION:
            status = "complete"
        else:
            status = "notice"

        time_str = n.created_at.strftime("%b %d, %H:%M")
        activity_feed.append(
            {
                "id": n.id,
                "event": n.title,
                "actor": (n.type.value.title() + " Event"),
                "time": time_str,
                "status": status,
            }
        )

    # System alerts - reuse security/alert notifications only (no mock text).
    alerts_result = await db.execute(
        select(Notification)
        .where(Notification.type.in_([NotificationType.SECURITY, NotificationType.ALERT, NotificationType.SYSTEM]))
        .order_by(Notification.created_at.desc())
        .limit(5)
    )
    alert_notifs = alerts_result.scalars().all()
    system_alerts = []
    for n in alert_notifs:
        if n.type == NotificationType.ALERT or n.type == NotificationType.SECURITY:
            severity = "critical"
        elif n.type == NotificationType.SYSTEM:
            severity = "notice"
        else:
            severity = "warning"

        system_alerts.append(
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "severity": severity,
                "cta": None,
            }
        )

    return {"success": True, "data": {
        "kpis": kpis,
        "transaction_volume": tx_series,
        "user_growth": user_series,
        "activity_feed": activity_feed,
        "system_alerts": system_alerts,
    }}

@router.put("/cards/status")
async def admin_update_card_status(
    admin_id: str,
    request: AdminUpdateCardStatusRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "cards:approve"):
            raise UnauthorizedError(message="You don't have permission to update cards", error_code="PERMISSION_DENIED")
        card_result = await db.execute(select(VirtualCard).where(VirtualCard.id == request.card_id))
        card = card_result.scalar_one_or_none()
        if not card:
            raise NotFoundError(resource="Virtual Card", error_code="CARD_NOT_FOUND")
        if request.status == "pending":
            card.status = CardStatus.PENDING
        elif request.status == "active":
            card.status = CardStatus.ACTIVE
        else:
            raise ValidationError(message="Invalid status", error_code="INVALID_STATUS")
        db.add(card)
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="update_card_status",
            resource_type="virtual_card",
            resource_id=card.id,
            details=json.dumps({"status": request.status})
        )
        db.add(audit_log)
        # Notify user when card becomes active
        if request.status == "active":
            user_result = await db.execute(select(User).where(User.id == card.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    type=NotificationType.SYSTEM,
                    title="Virtual Card Generated",
                    message=f"Your card \"{card.card_name}\" is now active.",
                    action_url=f"{settings.FRONTEND_URL}/dashboard/virtual-cards",
                )
                db.add(notif)
                await db.commit()
                AblyRealtimeManager.publish_notification(
                    user.id,
                    "system",
                    "Virtual Card Generated",
                    f"Your card \"{card.card_name}\" is now active.",
                    {"id": notif.id, "created_at": datetime.utcnow().isoformat()}
                )
                try:
                    if getattr(settings, "SMTP_SERVER", None):
                        email_service.send_card_ready_email(
                            user.email,
                            card.card_name,
                            card.card_type.value if hasattr(card.card_type, "value") else str(card.card_type),
                            card.expiry_month,
                            card.expiry_year,
                        )
                except Exception:
                    pass
        else:
            await db.commit()
        AblyRealtimeManager.publish_admin_event("cards", {"type": "status", "card_id": card.id, "status": request.status})
        AblyRealtimeManager.publish_card_status_update(card.user_id, card.id, request.status, "status_change")
        return {"success": True, "message": "Card status updated"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Card status update failed", error=e)
        raise InternalServerError(operation="card status", error_code="CARD_STATUS_FAILED", original_error=e)

@router.post("/cards/freeze")
async def admin_freeze_card(admin_id: str, request: AdminCardActionRequest, db: AsyncSession = Depends(get_db)):
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "cards:update"):
            raise UnauthorizedError(message="You don't have permission to freeze cards", error_code="PERMISSION_DENIED")
        card_result = await db.execute(select(VirtualCard).where(VirtualCard.id == request.card_id))
        card = card_result.scalar_one_or_none()
        if not card:
            raise NotFoundError(resource="Virtual Card", error_code="CARD_NOT_FOUND")
        if card.status != CardStatus.ACTIVE:
            raise ValidationError(message="Only active cards can be frozen", error_code="INVALID_STATE")
        card.status = CardStatus.SUSPENDED
        db.add(card)
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="freeze_card",
            resource_type="virtual_card",
            resource_id=card.id,
        )
        db.add(audit_log)
        await db.commit()
        AblyRealtimeManager.publish_admin_event("cards", {"type": "frozen", "card_id": card.id})
        AblyRealtimeManager.publish_card_status_update(card.user_id, card.id, CardStatus.SUSPENDED.value if hasattr(CardStatus.SUSPENDED, "value") else "suspended", "freeze")
        return {"success": True, "message": "Card frozen"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Freeze card failed", error=e)
        raise InternalServerError(operation="freeze card", error_code="FREEZE_FAILED", original_error=e)

@router.post("/cards/unfreeze")
async def admin_unfreeze_card(admin_id: str, request: AdminCardActionRequest, db: AsyncSession = Depends(get_db)):
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "cards:update"):
            raise UnauthorizedError(message="You don't have permission to unfreeze cards", error_code="PERMISSION_DENIED")
        card_result = await db.execute(select(VirtualCard).where(VirtualCard.id == request.card_id))
        card = card_result.scalar_one_or_none()
        if not card:
            raise NotFoundError(resource="Virtual Card", error_code="CARD_NOT_FOUND")
        if card.status != CardStatus.SUSPENDED:
            raise ValidationError(message="Only suspended cards can be unfreezed", error_code="INVALID_STATE")
        card.status = CardStatus.ACTIVE
        db.add(card)
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="unfreeze_card",
            resource_type="virtual_card",
            resource_id=card.id,
        )
        db.add(audit_log)
        await db.commit()
        AblyRealtimeManager.publish_admin_event("cards", {"type": "unfrozen", "card_id": card.id})
        AblyRealtimeManager.publish_card_status_update(card.user_id, card.id, CardStatus.ACTIVE.value if hasattr(CardStatus.ACTIVE, "value") else "active", "unfreeze")
        return {"success": True, "message": "Card unfrozen"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Unfreeze card failed", error=e)
        raise InternalServerError(operation="unfreeze card", error_code="UNFREEZE_FAILED", original_error=e)

@router.post("/cards/block")
async def admin_block_card(admin_id: str, request: AdminCardActionRequest, db: AsyncSession = Depends(get_db)):
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "cards:update"):
            raise UnauthorizedError(message="You don't have permission to block cards", error_code="PERMISSION_DENIED")
        card_result = await db.execute(select(VirtualCard).where(VirtualCard.id == request.card_id))
        card = card_result.scalar_one_or_none()
        if not card:
            raise NotFoundError(resource="Virtual Card", error_code="CARD_NOT_FOUND")
        card.status = CardStatus.BLOCKED
        db.add(card)
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="block_card",
            resource_type="virtual_card",
            resource_id=card.id,
        )
        db.add(audit_log)
        await db.commit()
        AblyRealtimeManager.publish_admin_event("cards", {"type": "blocked", "card_id": card.id})
        AblyRealtimeManager.publish_card_status_update(card.user_id, card.id, CardStatus.BLOCKED.value if hasattr(CardStatus.BLOCKED, "value") else "blocked", "block")
        return {"success": True, "message": "Card blocked"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Block card failed", error=e)
        raise InternalServerError(operation="block card", error_code="BLOCK_FAILED", original_error=e)

@router.get("/cards/list")
async def admin_list_cards(admin_id: str, db: AsyncSession = Depends(get_db)):
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "cards:approve"):
            raise UnauthorizedError(message="You don't have permission to view cards", error_code="PERMISSION_DENIED")
        cards_result = await db.execute(select(VirtualCard))
        cards = cards_result.scalars().all()
        items = [
            {
                "id": c.id,
                "user_id": c.user_id,
                "account_id": c.account_id,
                "card_type": c.card_type.value if hasattr(c.card_type, "value") else str(c.card_type),
                "status": c.status.value if hasattr(c.status, "value") else str(c.status),
                "card_name": c.card_name,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in cards
        ]
        return {"items": items, "total": len(items)}
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("List cards failed", error=e)
        raise InternalServerError(operation="list cards", error_code="LIST_CARDS_FAILED", original_error=e)


@router.get("/users/list")
async def admin_list_users(
    admin_id: str,
    q: str = Query("", max_length=120),
    status_filter: str = Query("all"),
    verification_filter: str = Query("all"),
    country: str = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=5, le=50),
    db: AsyncSession = Depends(get_db),
):
    """User directory list for admin UI (filterable + paginated)."""
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    result = await db.execute(select(User))
    users = result.scalars().all()

    # Filters (kept simple + in-memory for readability; can be optimized later)
    q_lower = q.strip().lower()
    if q_lower:
        users = [
            u
            for u in users
            if q_lower in (u.email or "").lower()
            or q_lower in (u.username or "").lower()
            or q_lower in f"{u.first_name} {u.last_name}".lower()
            or q_lower in _to_admin_user_id(u).lower()
        ]

    if country != "all":
        users = [u for u in users if (u.country or "").upper() == country.upper()]

    if status_filter != "all":
        users = [u for u in users if _user_status(u) == status_filter]

    if verification_filter != "all":
        users = [u for u in users if _verification_status(u) == verification_filter]

    total = len(users)
    start = (page - 1) * page_size
    end = start + page_size
    items = users[start:end]

    payload = []
    for u in items:
        payload.append(
            {
                "id": u.id,
                "user_id": _to_admin_user_id(u),
                "name": f"{u.first_name} {u.last_name}",
                "country": (u.country or "").upper(),
                "email": u.email,
                "status": _user_status(u),
                "verification": _verification_status(u),
            }
        )

    return {"success": True, "data": {"items": payload, "total": total, "page": page, "page_size": page_size}}


@router.get("/accounts/list")
async def admin_list_accounts(
    admin_id: str,
    q: str = Query("", max_length=120),
    status: str = Query("all"),
    type_filter: str = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=5, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Accounts list for admin UI."""
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    acc_result = await db.execute(select(Account))
    accounts = acc_result.scalars().all()

    users_result = await db.execute(select(User))
    users = {u.id: u for u in users_result.scalars().all()}

    q_lower = q.strip().lower()
    if q_lower:
        accounts = [
            a for a in accounts
            if q_lower in (a.account_number or "").lower()
            or (
                users.get(a.user_id)
                and q_lower in f"{users.get(a.user_id).first_name} {users.get(a.user_id).last_name}".lower()
            )
        ]
    if status != "all":
        accounts = [a for a in accounts if getattr(a, "status", None) and a.status == status]
    if type_filter != "all":
        accounts = [a for a in accounts if getattr(a, "account_type", None) and a.account_type.value == type_filter]

    total = len(accounts)
    start = (page - 1) * page_size
    end = start + page_size
    items = accounts[start:end]

    payload = []
    for a in items:
        user = users.get(a.user_id)
        payload.append(
            {
                "id": a.id,
                "account_number": a.account_number,
                "type": getattr(a.account_type, "value", "account"),
                "currency": a.currency,
                "balance": a.balance,
                "status": a.status,
                "user": {
                    "id": user.id if user else "",
                    "name": f"{user.first_name} {user.last_name}".strip() if user else "",
                    "display_id": _to_admin_user_id(user) if user else "",
                },
                "created_at": a.created_at.isoformat() if getattr(a, "created_at", None) else None,
            }
        )

    return {"success": True, "data": {"items": payload, "total": total, "page": page, "page_size": page_size}}

@router.get("/system/settings")
async def admin_system_settings(admin_id: str, db: AsyncSession = Depends(get_db)):
    """System settings overview for admin UI."""
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    ably_configured = bool(getattr(settings, "ABLY_API_KEY", None)) and settings.ABLY_API_KEY != "your-ably-api-key"
    email_configured = bool(getattr(settings, "SMTP_SERVER", None))
    cloudinary_configured = bool(getattr(settings, "CLOUDINARY_CLOUD_NAME", None))

    return {
        "success": True,
        "data": {
            "frontend_url": settings.FRONTEND_URL,
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG,
            "real_time_enabled": ably_configured,
            "email_configured": email_configured,
            "cloudinary_configured": cloudinary_configured,
        },
        "message": "System settings loaded",
    }

@router.get("/transactions/list")
async def admin_list_transactions(
    admin_id: str,
    q: str = Query("", max_length=120),
    status: str = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=5, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Transactions list for admin UI."""
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    tx_result = await db.execute(select(Transaction))
    transactions = tx_result.scalars().all()

    accounts_result = await db.execute(select(Account))
    accounts = {a.id: a for a in accounts_result.scalars().all()}

    users_result = await db.execute(select(User))
    users = {u.id: u for u in users_result.scalars().all()}

    q_lower = q.strip().lower()
    if q_lower:
        transactions = [
            t for t in transactions
            if q_lower in (t.description or "").lower()
            or (
                accounts.get(t.account_id)
                and q_lower in (accounts.get(t.account_id).account_number or "").lower()
            )
        ]
    if status != "all":
        transactions = [t for t in transactions if getattr(t, "status", None) and t.status == status]

    total = len(transactions)
    start = (page - 1) * page_size
    end = start + page_size
    items = transactions[start:end]

    payload = []
    for t in items:
        acc = accounts.get(t.account_id)
        user = users.get(acc.user_id) if acc else None
        payload.append(
            {
                "id": t.id,
                "description": t.description or "",
                "amount": t.amount,
                "currency": t.currency,
                "status": t.status,
                "created_at": t.created_at.isoformat() if getattr(t, "created_at", None) else None,
                "account_number": acc.account_number if acc else "",
                "user": {
                    "id": user.id if user else "",
                    "name": f"{user.first_name} {user.last_name}".strip() if user else "",
                    "display_id": _to_admin_user_id(user) if user else "",
                },
            }
        )

    return {"success": True, "data": {"items": payload, "total": total, "page": page, "page_size": page_size}}


@router.post("/auth/register")
async def admin_register(
    request: AdminRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin registration with admin code"""
    try:
        logger.info(f"Admin registration attempt: {request.email}")
        
        # Validate admin code
        if not AdminAuthManager.validate_admin_code(request.admin_code):
            logger.warning(f"Invalid admin code attempted for email: {request.email}")
            raise ValidationError(
                message="Invalid admin code",
                error_code="INVALID_ADMIN_CODE"
            )
        
        # Check if admin exists
        existing = await db.execute(
            select(AdminUser).where(
                (AdminUser.email == request.email) | (AdminUser.username == request.username)
            )
        )
        if existing.scalar():
            raise ValidationError(
                message="Admin with this email or username already exists",
                error_code="ADMIN_EXISTS"
            )
        
        # Create admin user
        new_admin = AdminUser(
            id=str(uuid.uuid4()),
            email=request.email,
            username=request.username,
            password_hash=AdminAuthManager.hash_password(request.password),
            first_name=request.first_name,
            last_name=request.last_name,
            department=request.department,
            role=AdminRole.MODERATOR,  # Default role
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(new_admin)
        await db.commit()
        await db.refresh(new_admin)
        
        logger.info(f"Admin registered: {new_admin.email}")
        
        return {
            "success": True,
            "message": "Admin registration successful",
            "data": AdminResponse.from_orm(new_admin)
        }
    except ValidationError as e:
        logger.error(f"ValidationError in admin registration: {e.message}")
        raise
    except PydanticValidationError as e:
        logger.error(f"Validation error in admin registration: {e.errors()}")
        raise ValidationError(
            message=f"Validation error: {e.errors()[0]['msg']}",
            error_code="VALIDATION_ERROR"
        )
    except Exception as e:
        logger.error("Admin registration failed", error=e)
        raise InternalServerError(
            operation="admin registration",
            error_code="REGISTRATION_FAILED",
            original_error=e
        )


@router.post("/auth/login")
async def admin_login(
    request: AdminLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin login"""
    try:
        result = await db.execute(
            select(AdminUser).where(AdminUser.email == request.email)
        )
        admin = result.scalar()
        
        if not admin or not AdminAuthManager.verify_password(request.password, admin.password_hash):
            logger.warning(f"Failed login attempt for admin: {request.email}")
            raise AuthenticationError(
                message="Invalid email or password",
                error_code="INVALID_CREDENTIALS"
            )
        
        if not admin.is_active:
            raise AuthenticationError(
                message="Admin account is inactive",
                error_code="ACCOUNT_INACTIVE"
            )
        
        # Validate additional admin code if provided
        if request.admin_code and not AdminAuthManager.validate_admin_login_code(request.admin_code):
            raise AuthenticationError(
                message="Invalid admin code",
                error_code="INVALID_ADMIN_CODE"
            )
        
        # Update last login
        admin.last_login = datetime.utcnow()
        db.add(admin)
        await db.commit()
        
        # Generate tokens
        access_token = AdminAuthManager.create_access_token(admin.id, admin.email, admin.role)
        refresh_token = AdminAuthManager.create_refresh_token(admin.id)
        
        logger.info(f"Admin logged in: {admin.email}")
        
        return {
            "success": True,
            "message": "Login successful",
            "data": {
                "admin_id": admin.id,
                "email": admin.email,
                "first_name": admin.first_name,
                "last_name": admin.last_name,
                "role": admin.role,
            },
            "token": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": 3600,
            },
        }
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error("Admin login failed", error=e)
        raise InternalServerError(
            operation="admin login",
            error_code="LOGIN_FAILED",
            original_error=e
        )


@router.post("/transfers/approve", response_model=TransferApprovalResponse)
async def approve_transfer(
    admin_id: str,
    request: ApproveTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve pending transfer"""
    try:
        # Verify admin exists and has permission
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "transfers:approve"):
            logger.warning(f"Unauthorized transfer approval attempt by {admin.email}")
            raise UnauthorizedError(
                message="You don't have permission to approve transfers",
                error_code="PERMISSION_DENIED"
            )
        
        # Get transfer
        transfer_result = await db.execute(
            select(Transfer).where(Transfer.id == request.transfer_id)
        )
        transfer = transfer_result.scalar()
        
        if not transfer:
            raise NotFoundError(
                resource="Transfer",
                error_code="TRANSFER_NOT_FOUND"
            )
        
        # Approve transfer
        transfer.status = TransferStatus.APPROVED
        db.add(transfer)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="approve_transfer",
            resource_type="transfer",
            resource_id=transfer.id,
            details=json.dumps({"notes": request.notes})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            transfer.from_user_id,
            "transfer_approved",
            "Transfer Approved",
            f"Your transfer of {transfer.currency} {transfer.amount} has been approved."
        )
        AblyRealtimeManager.publish_admin_event("transactions", {"type": "transfer_approved", "transfer_id": transfer.id})
        
        logger.info(f"Transfer approved by {admin.email}: {transfer.id}")
        
        return {
            "success": True,
            "transfer_id": transfer.id,
            "status": TransferStatus.APPROVED,
            "message": "Transfer approved successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Transfer approval failed", error=e)
        raise InternalServerError(
            operation="transfer approval",
            error_code="APPROVAL_FAILED",
            original_error=e
        )


@router.post("/transfers/decline", response_model=TransferApprovalResponse)
async def decline_transfer(
    admin_id: str,
    request: DeclineTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """Decline pending transfer"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "transfers:decline"):
            logger.warning(f"Unauthorized transfer decline attempt by {admin.email}")
            raise UnauthorizedError(
                message="You don't have permission to decline transfers",
                error_code="PERMISSION_DENIED"
            )
        
        transfer_result = await db.execute(
            select(Transfer).where(Transfer.id == request.transfer_id)
        )
        transfer = transfer_result.scalar()
        
        if not transfer:
            raise NotFoundError(
                resource="Transfer",
                error_code="TRANSFER_NOT_FOUND"
            )
        
        # Decline transfer
        transfer.status = TransferStatus.DECLINED
        db.add(transfer)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="decline_transfer",
            resource_type="transfer",
            resource_id=transfer.id,
            details=json.dumps({"reason": request.reason})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            transfer.from_user_id,
            "transfer_declined",
            "Transfer Declined",
            f"Your transfer has been declined. Reason: {request.reason}"
        )
        AblyRealtimeManager.publish_admin_event("transactions", {"type": "transfer_declined", "transfer_id": transfer.id})
        
        logger.info(f"Transfer declined by {admin.email}: {transfer.id}")
        
        return {
            "success": True,
            "transfer_id": transfer.id,
            "status": TransferStatus.DECLINED,
            "message": "Transfer declined successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Transfer decline failed", error=e)
        raise InternalServerError(
            operation="transfer decline",
            error_code="DECLINE_FAILED",
            original_error=e
        )


@router.post("/deposits/approve", response_model=DepositApprovalResponse)
async def approve_deposit(
    admin_id: str,
    request: ApproveDepositRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve check or direct deposit"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "deposits:approve"):
            raise UnauthorizedError(
                message="You don't have permission to approve deposits",
                error_code="PERMISSION_DENIED"
            )
        
        deposit_result = await db.execute(
            select(Deposit).where(Deposit.id == request.deposit_id)
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise NotFoundError(
                resource="Deposit",
                error_code="DEPOSIT_NOT_FOUND"
            )
        
        # Approve deposit
        deposit.status = DepositStatus.APPROVED
        if request.confirmation_code:
            deposit.confirmation_code = request.confirmation_code
        
        db.add(deposit)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="approve_deposit",
            resource_type="deposit",
            resource_id=deposit.id,
            details=json.dumps({"notes": request.notes, "confirmation": request.confirmation_code})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            deposit.user_id,
            "deposit_approved",
            "Deposit Approved",
            f"Your {deposit.deposit_type} deposit of {deposit.currency} {deposit.amount} has been approved."
        )
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "deposit_approved", "deposit_id": deposit.id})
        
        logger.info(f"Deposit approved by {admin.email}: {deposit.id}")
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.APPROVED,
            "message": "Deposit approved successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Deposit approval failed", error=e)
        raise InternalServerError(
            operation="deposit approval",
            error_code="APPROVAL_FAILED",
            original_error=e
        )


@router.post("/deposits/decline", response_model=DepositApprovalResponse)
async def decline_deposit(
    admin_id: str,
    request: DeclineDepositRequest,
    db: AsyncSession = Depends(get_db)
):
    """Decline check or direct deposit"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "deposits:decline"):
            raise UnauthorizedError(
                message="You don't have permission to decline deposits",
                error_code="PERMISSION_DENIED"
            )
        
        deposit_result = await db.execute(
            select(Deposit).where(Deposit.id == request.deposit_id)
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise NotFoundError(
                resource="Deposit",
                error_code="DEPOSIT_NOT_FOUND"
            )
        
        deposit.status = DepositStatus.DECLINED
        db.add(deposit)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="decline_deposit",
            resource_type="deposit",
            resource_id=deposit.id,
            details=json.dumps({"reason": request.reason})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            deposit.user_id,
            "deposit_declined",
            "Deposit Declined",
            f"Your {deposit.deposit_type} deposit has been declined. Reason: {request.reason}"
        )
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "deposit_declined", "deposit_id": deposit.id})
        
        logger.info(f"Deposit declined by {admin.email}: {deposit.id}")
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.DECLINED,
            "message": "Deposit declined successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Deposit decline failed", error=e)
        raise InternalServerError(
            operation="deposit decline",
            error_code="DECLINE_FAILED",
            original_error=e
        )


@router.post("/cards/approve", response_model=VirtualCardApprovalResponse)
async def approve_virtual_card(
    admin_id: str,
    request: ApproveVirtualCardRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve virtual card creation"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "cards:approve"):
            raise UnauthorizedError(
                message="You don't have permission to approve cards",
                error_code="PERMISSION_DENIED"
            )
        
        card_result = await db.execute(
            select(VirtualCard).where(VirtualCard.id == request.card_id)
        )
        card = card_result.scalar()
        
        if not card:
            raise NotFoundError(
                resource="Virtual Card",
                error_code="CARD_NOT_FOUND"
            )
        
        card.status = CardStatus.ACTIVE
        db.add(card)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="approve_card",
            resource_type="virtual_card",
            resource_id=card.id,
            details=json.dumps({"notes": request.notes})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            card.user_id,
            "card_approved",
            "Virtual Card Approved",
            f"Your virtual card has been approved and is ready to use."
        )
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "card_approved", "card_id": card.id})
        
        logger.info(f"Virtual card approved by {admin.email}: {card.id}")
        
        return {
            "success": True,
            "card_id": card.id,
            "status": CardStatus.ACTIVE,
            "message": "Virtual card approved successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Virtual card approval failed", error=e)
        raise InternalServerError(
            operation="virtual card approval",
            error_code="APPROVAL_FAILED",
            original_error=e
        )


@router.post("/cards/decline", response_model=VirtualCardApprovalResponse)
async def decline_virtual_card(
    admin_id: str,
    request: DeclineVirtualCardRequest,
    db: AsyncSession = Depends(get_db)
):
    """Decline virtual card creation"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "cards:decline"):
            raise UnauthorizedError(
                message="You don't have permission to decline cards",
                error_code="PERMISSION_DENIED"
            )
        
        card_result = await db.execute(
            select(VirtualCard).where(VirtualCard.id == request.card_id)
        )
        card = card_result.scalar()
        
        if not card:
            raise NotFoundError(
                resource="Virtual Card",
                error_code="CARD_NOT_FOUND"
            )
        
        card.status = CardStatus.DECLINED
        db.add(card)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="decline_card",
            resource_type="virtual_card",
            resource_id=card.id,
            details=json.dumps({"reason": request.reason})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            card.user_id,
            "card_declined",
            "Virtual Card Request Declined",
            f"Your virtual card request has been declined. Reason: {request.reason}"
        )
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "card_declined", "card_id": card.id})
        
        logger.info(f"Virtual card declined by {admin.email}: {card.id}")
        
        return {
            "success": True,
            "card_id": card.id,
            "status": CardStatus.DECLINED,
            "message": "Virtual card declined successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Virtual card decline failed", error=e)
        raise InternalServerError(
            operation="virtual card decline",
            error_code="DECLINE_FAILED",
            original_error=e
        )


@router.post("/users/create")
async def admin_create_user(
    admin_id: str,
    request: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin create user"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:create"):
            raise UnauthorizedError(
                message="You don't have permission to create users",
                error_code="PERMISSION_DENIED"
            )
        
        # Create user
        new_user = User(
            id=str(uuid.uuid4()),
            email=request.email,
            username=request.username,
            first_name=request.first_name,
            last_name=request.last_name,
            phone=request.phone,
            country=request.country.upper(),
            is_active=True,
            is_email_verified=True,
            created_at=datetime.utcnow()
        )
        
        db.add(new_user)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="create_user",
            resource_type="user",
            resource_id=new_user.id,
            details=json.dumps({"email": request.email, "username": request.username})
        )
        db.add(audit_log)
        
        await db.commit()
        await db.refresh(new_user)
        
        AblyRealtimeManager.publish_admin_event("users", {"type": "created", "user_id": new_user.id})
        logger.info(f"User created by admin {admin.email}: {new_user.email}")
        
        return {
            "success": True,
            "user_id": new_user.id,
            "message": "User created successfully"
        }
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("User creation failed", error=e)
        raise InternalServerError(
            operation="user creation",
            error_code="CREATION_FAILED",
            original_error=e
        )


@router.put("/users/edit")
async def admin_edit_user(
    admin_id: str,
    request: AdminEditUserRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin edit user details"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:update"):
            raise UnauthorizedError(
                message="You don't have permission to edit users",
                error_code="PERMISSION_DENIED"
            )
        
        user_result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = user_result.scalar()
        
        if not user:
            raise NotFoundError(
                resource="User",
                error_code="USER_NOT_FOUND"
            )
        
        # Update fields
        if request.first_name:
            user.first_name = request.first_name
        if request.last_name:
            user.last_name = request.last_name
        if request.phone:
            user.phone = request.phone
        if request.country:
            user.country = request.country.upper()
        if request.date_joined:
            user.created_at = request.date_joined
        if request.is_active is not None:
            user.is_active = request.is_active
            user.is_locked = not request.is_active
        
        db.add(user)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="edit_user",
            resource_type="user",
            resource_id=user.id,
            details=json.dumps({
                "first_name": request.first_name,
                "last_name": request.last_name,
                "date_joined": request.date_joined.isoformat() if request.date_joined else None
            })
        )
        db.add(audit_log)
        
        await db.commit()
        
        AblyRealtimeManager.publish_admin_event("users", {"type": "edited", "user_id": user.id})
        logger.info(f"User edited by admin {admin.email}: {user.email}")
        
        return {
            "success": True,
            "user_id": user.id,
            "message": "User updated successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("User edit failed", error=e)
        raise InternalServerError(
            operation="user edit",
            error_code="EDIT_FAILED",
            original_error=e
        )

@router.put("/accounts/status")
async def admin_update_account_status(
    admin_id: str,
    request: AdminAccountStatusRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin:
            raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")
        acc_result = await db.execute(select(Account).where(Account.id == request.account_id))
        account = acc_result.scalar_one_or_none()
        if not account:
            raise NotFoundError(resource="Account", error_code="ACCOUNT_NOT_FOUND")
        if request.status == "active":
            account.status = AccountStatus.ACTIVE
            account.closed_at = None
        elif request.status == "frozen":
            account.status = AccountStatus.FROZEN
        elif request.status == "closed":
            account.status = AccountStatus.CLOSED
            account.closed_at = datetime.utcnow()
        else:
            raise ValidationError(message="Invalid status", error_code="INVALID_STATUS")
        db.add(account)
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="update_account_status",
            resource_type="account",
            resource_id=account.id,
            details=json.dumps({"status": request.status})
        )
        db.add(audit_log)
        await db.commit()
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "status", "account_id": account.id, "status": request.status})
        return {"success": True, "message": "Account status updated"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Account status update failed", error=e)
        raise InternalServerError(operation="account status", error_code="ACCOUNT_STATUS_FAILED", original_error=e)

@router.put("/accounts/adjust-balance")
async def admin_adjust_account_balance(
    admin_id: str,
    request: AdminAdjustBalanceRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin:
            raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")
        acc_result = await db.execute(select(Account).where(Account.id == request.account_id))
        account = acc_result.scalar_one_or_none()
        if not account:
            raise NotFoundError(resource="Account", error_code="ACCOUNT_NOT_FOUND")
        if account.status in (AccountStatus.FROZEN, AccountStatus.CLOSED):
            raise ValidationError(message="Cannot adjust balance on frozen or closed account", error_code="ACCOUNT_INACTIVE")
        delta = request.amount if request.operation == "credit" else -request.amount
        account.balance = (account.balance or 0.0) + delta
        account.available_balance = (account.available_balance or 0.0) + delta
        account.updated_at = datetime.utcnow()
        db.add(account)
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="adjust_account_balance",
            resource_type="account",
            resource_id=account.id,
            details=json.dumps({"operation": request.operation, "amount": request.amount})
        )
        db.add(audit_log)
        await db.commit()
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "balance_adjusted", "account_id": account.id})
        AblyRealtimeManager.publish_balance_update(account.user_id, account.id, account.balance, account.currency)
        return {"success": True, "message": "Balance adjusted"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Balance adjust failed", error=e)
        raise InternalServerError(operation="adjust balance", error_code="BALANCE_ADJUST_FAILED", original_error=e)
@router.delete("/users/delete")
async def admin_delete_user(
    admin_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Admin delete user account (cascade deletes)"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:delete"):
            raise UnauthorizedError(message="You don't have permission to delete users", error_code="PERMISSION_DENIED")
        
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundError(resource="User", error_code="USER_NOT_FOUND")
        
        await db.delete(user)
        
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="delete_user",
            resource_type="user",
            resource_id=user_id,
            details=json.dumps({"user_id": user_id})
        )
        db.add(audit_log)
        
        await db.commit()
        
        AblyRealtimeManager.publish_admin_event("users", {"type": "deleted", "user_id": user_id})
        logger.info(f"User deleted by admin {admin.email}: {user_id}")
        
        return {"success": True, "message": "User deleted"}
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("User deletion failed", error=e)
        raise InternalServerError(operation="user deletion", error_code="DELETION_FAILED", original_error=e)
@router.get("/audit-logs", response_model=list[AdminAuditLogResponse])
async def get_audit_logs(
    admin_id: str,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get audit logs"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin or not AdminPermissionManager.has_permission(admin.role, "audit_logs:view"):
            raise UnauthorizedError(
                message="You don't have permission to view audit logs",
                error_code="PERMISSION_DENIED"
            )
        
        result = await db.execute(
            select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit)
        )
        logs = result.scalars().all()
        
        return [AdminAuditLogResponse.from_orm(log) for log in logs]
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("Failed to fetch audit logs", error=e)
        raise InternalServerError(
            operation="fetch audit logs",
            error_code="FETCH_FAILED",
            original_error=e
        )

@router.get("/realtime/token")
async def admin_realtime_token(
    admin_id: str,
    db: AsyncSession = Depends(get_db)
):
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")
    token_request = get_admin_ably_token_request(admin_id)
    if token_request is None:
        raise InternalServerError(operation="get admin ably token", error_code="ABLY_TOKEN_FAILED", original_error=Exception("No Ably client"))
    return token_request

@router.get("/statistics")
async def get_admin_statistics(
    admin_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard statistics"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        # Get statistics
        users_result = await db.execute(select(User))
        total_users = len(users_result.scalars().all())
        
        active_users_result = await db.execute(
            select(User).where(User.is_active == True)
        )
        active_users = len(active_users_result.scalars().all())
        
        transfers_result = await db.execute(select(Transfer))
        total_transfers = len(transfers_result.scalars().all())
        
        pending_transfers_result = await db.execute(
            select(Transfer).where(Transfer.status == TransferStatus.PENDING)
        )
        pending_transfers = len(pending_transfers_result.scalars().all())
        
        deposits_result = await db.execute(select(Deposit))
        total_deposits = len(deposits_result.scalars().all())
        
        pending_deposits_result = await db.execute(
            select(Deposit).where(Deposit.status == DepositStatus.PENDING)
        )
        pending_deposits = len(pending_deposits_result.scalars().all())
        
        loans_result = await db.execute(select(Loan))
        total_loans = len(loans_result.scalars().all())
        
        pending_loans_result = await db.execute(
            select(Loan).where(Loan.status == LoanStatus.PENDING)
        )
        pending_loans = len(pending_loans_result.scalars().all())
        
        cards_result = await db.execute(select(VirtualCard))
        total_cards = len(cards_result.scalars().all())
        
        # Temporarily skip pending cards due to enum issues
        pending_cards = 0
        
        return {
            "success": True,
            "data": {
                "total_users": total_users,
                "active_users": active_users,
                "total_transfers": total_transfers,
                "pending_transfers": pending_transfers,
                "total_deposits": total_deposits,
                "pending_deposits": pending_deposits,
                "total_loans": total_loans,
                "pending_loans": pending_loans,
                "total_virtual_cards": total_cards,
                "pending_cards": pending_cards
            }
        }
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("Failed to fetch statistics", error=e)
        raise InternalServerError(
            operation="fetch statistics",
            error_code="FETCH_FAILED",
            original_error=e
        )
