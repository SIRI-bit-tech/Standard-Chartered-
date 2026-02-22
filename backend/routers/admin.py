from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from datetime import datetime, timezone, timedelta
import uuid
import json

from models.admin import AdminUser, AdminAuditLog, AdminRole
from models.support import SupportTicket, TicketMessage
from models.user import User
from models.account import Account, AccountStatus
from models.transaction import Transaction, TransactionType, TransactionStatus
from models.notification import Notification, NotificationType
from models.transfer import Transfer, TransferStatus
from models.deposit import Deposit, DepositStatus
from models.virtual_card import VirtualCard, VirtualCardStatus
from models.loan import Loan, LoanStatus, LoanApplication, LoanApplicationStatus, LoanProduct, LoanType
from database import get_db
from schemas.admin import (
    AdminRegisterRequest, AdminLoginRequest, AdminResponse,
    ApproveTransferRequest, DeclineTransferRequest, TransferApprovalResponse,
    ApproveDepositRequest, DeclineDepositRequest, DepositApprovalResponse,
    ApproveVirtualCardRequest, DeclineVirtualCardRequest, VirtualCardApprovalResponse,
    ApproveLoanRequest, DeclineLoanRequest, LoanApprovalResponse,
    AdminCreateUserRequest, AdminEditUserRequest, AdminAuditLogResponse,
    AdminAccountStatusRequest, AdminAdjustBalanceRequest, AdminUpdateCardStatusRequest, AdminCardActionRequest,
    AdminStatisticsResponse, AdminCreateLoanProductRequest
)
from pydantic import ValidationError as PydanticValidationError
from utils.admin_auth import AdminAuthManager, AdminPermissionManager, get_current_admin
from utils.errors import (
    ValidationError, AuthenticationError, NotFoundError, UnauthorizedError, InternalServerError, ConflictError
)
from utils.logger import logger
from utils.ably import AblyRealtimeManager, get_admin_ably_token_request
from config import settings
from services.email import email_service
from models.notification import Notification, NotificationType

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

        cta = None
        if "loan" in n.title.lower():
            cta = {"label": "Review Application", "url": "/admin/approvals?tab=loans"}
        elif "verification" in n.title.lower() or "kyc" in n.title.lower():
            cta = {"label": "Verify User", "url": "/admin/users"}
        elif "transfer" in n.title.lower():
            cta = {"label": "Review Transfer", "url": "/admin/approvals?tab=transfers"}

        system_alerts.append(
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "severity": severity,
                "cta": cta,
            }
        )

    return {"success": True, "data": {
        "kpis": kpis,
        "transaction_volume": tx_series,
        "user_growth": user_series,
        "activity_feed": activity_feed,
        "system_alerts": system_alerts,
    }}

# -------------------------------
# Support Tickets (Admin)
# -------------------------------
from pydantic import BaseModel

class AssignTicketRequest(BaseModel):
    agent_id: str | None = None

class UpdateTicketStatusRequest(BaseModel):
    status: str

class TicketReplyRequest(BaseModel):
    message: str

def _serialize_admin_ticket(t: SupportTicket, user: User | None, agent: AdminUser | None) -> dict:
    return {
        "id": t.id,
        "ticket_number": t.ticket_number,
        "subject": t.subject,
        "status": t.status.value if hasattr(t.status, "value") else t.status,
        "priority": t.priority.value if hasattr(t.priority, "value") else t.priority,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if getattr(t, "updated_at", None) else None,
        "user_id": t.user_id,
        "user_name": f"{getattr(user,'first_name','') } {getattr(user,'last_name','')}".strip() if user else None,
        "user_email": getattr(user, "email", None) if user else None,
        "category": getattr(t, "category", None),
        "description": getattr(t, "description", None),
        "assigned_to_id": getattr(t, "assigned_to", None),
        "assigned_to_name": f"{getattr(agent,'first_name','') } {getattr(agent,'last_name','')}".strip() if agent else None,
    }

@router.get("/support/tickets")
async def admin_list_tickets(
    limit: int = Query(50),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    # Load tickets (keep existing query and limit)
    result = await db.execute(
        select(SupportTicket)
        .order_by(SupportTicket.created_at.desc())
        .limit(limit)
    )
    tickets = result.scalars().all()
    if not tickets:
        return {"success": True, "data": []}

    # Batch-load related users and assigned agents to avoid N+1 queries
    user_ids = {t.user_id for t in tickets if getattr(t, "user_id", None)}
    agent_ids = {t.assigned_to for t in tickets if getattr(t, "assigned_to", None)}

    users_map: dict[str, User] = {}
    agents_map: dict[str, AdminUser] = {}

    if user_ids:
        u_res = await db.execute(select(User).where(User.id.in_(list(user_ids))))
        for u in u_res.scalars().all():
            users_map[u.id] = u
    if agent_ids:
        a_res = await db.execute(select(AdminUser).where(AdminUser.id.in_(list(agent_ids))))
        for a in a_res.scalars().all():
            agents_map[a.id] = a

    items = [
        _serialize_admin_ticket(
            t,
            users_map.get(t.user_id),
            agents_map.get(getattr(t, "assigned_to", None))
        )
        for t in tickets
    ]
    return {"success": True, "data": items}

@router.get("/support/agents")
async def admin_list_support_agents(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    result = await db.execute(select(AdminUser).where(AdminUser.role.in_([AdminRole.SUPPORT, AdminRole.MANAGER, AdminRole.SUPER_ADMIN])))
    agents = result.scalars().all()
    data = [{"id": a.id, "name": f"{a.first_name} {a.last_name}".strip(), "email": a.email} for a in agents]
    return {"success": True, "data": data}

@router.put("/support/tickets/{ticket_id}/assign")
async def admin_assign_ticket(
    ticket_id: str,
    request: AssignTicketRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    t = t_res.scalar_one_or_none()
    if not t:
        raise NotFoundError(resource="SupportTicket", error_code="TICKET_NOT_FOUND")
    t.assigned_to = request.agent_id if request.agent_id else None
    t.assigned_at = datetime.utcnow()
    db.add(t)
    log = AdminAuditLog(
        id=str(uuid.uuid4()),
        admin_id=admin.id,
        admin_email=admin.email,
        action="ticket_assigned",
        resource_type="ticket",
        resource_id=t.id,
        details=json.dumps({"assigned_to": request.agent_id}),
    )
    db.add(log)
    await db.commit()
    AblyRealtimeManager.publish_admin_event("support", {"type": "ticket_assigned", "ticket_id": t.id, "agent_id": request.agent_id})
    return {"success": True, "message": "Ticket assigned"}

@router.put("/support/tickets/{ticket_id}/status")
async def admin_update_ticket_status(
    ticket_id: str,
    request: UpdateTicketStatusRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    t = t_res.scalar_one_or_none()
    if not t:
        raise NotFoundError(resource="SupportTicket", error_code="TICKET_NOT_FOUND")
    prev = t.status.value if hasattr(t.status, "value") else t.status
    # Assign new status by raw string; SQLAlchemy Enum accepts string name
    t.status = request.status
    if request.status in ("resolved", "closed"):
        t.resolved_at = datetime.utcnow() if request.status == "resolved" else getattr(t, "resolved_at", None)
        t.closed_at = datetime.utcnow() if request.status == "closed" else getattr(t, "closed_at", None)
    db.add(t)
    log = AdminAuditLog(
        id=str(uuid.uuid4()),
        admin_id=admin.id,
        admin_email=admin.email,
        action="ticket_status_changed",
        resource_type="ticket",
        resource_id=t.id,
        details=json.dumps({"from": prev, "to": request.status}),
    )
    db.add(log)
    await db.commit()
    AblyRealtimeManager.publish_admin_event("support", {"type": "ticket_status_changed", "ticket_id": t.id, "status": request.status})
    return {"success": True, "message": "Status updated"}

@router.get("/support/tickets/{ticket_id}/replies")
async def admin_get_ticket_replies(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    t = t_res.scalar_one_or_none()
    if not t:
        raise NotFoundError(resource="SupportTicket", error_code="TICKET_NOT_FOUND")
    msgs_res = await db.execute(select(TicketMessage).where(TicketMessage.ticket_id == t.id).order_by(TicketMessage.created_at.asc()))
    msgs = msgs_res.scalars().all()
    # Collect author names for admin/user
    authors: dict[str, str] = {}
    # user
    u_res = await db.execute(select(User).where(User.id == t.user_id))
    u = u_res.scalar_one_or_none()
    if u:
        authors[u.id] = f"{u.first_name} {u.last_name}".strip() or u.email
    # possible admins
    admin_ids = list({m.sender_id for m in msgs if m.is_from_staff})
    if admin_ids:
        a_res = await db.execute(select(AdminUser).where(AdminUser.id.in_(admin_ids)))
        for a in a_res.scalars().all():
            authors[a.id] = f"{a.first_name} {a.last_name}".strip() or a.email
    data = [
        {
            "id": m.id,
            "ticket_id": t.id,
            "author_id": m.sender_id,
            "author_name": authors.get(m.sender_id),
            "message": m.message,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in msgs
    ]
    return {"success": True, "data": data}

@router.post("/support/tickets/{ticket_id}/replies")
async def admin_post_ticket_reply(
    ticket_id: str,
    request: TicketReplyRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    t = t_res.scalar_one_or_none()
    if not t:
        raise NotFoundError(resource="SupportTicket", error_code="TICKET_NOT_FOUND")
    msg = TicketMessage(
        id=str(uuid.uuid4()),
        ticket_id=t.id,
        sender_id=admin.id,
        is_from_staff=True,
        message=request.message,
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    # audit
    log = AdminAuditLog(
        id=str(uuid.uuid4()),
        admin_id=admin.id,
        admin_email=admin.email,
        action="ticket_replied",
        resource_type="ticket",
        resource_id=t.id,
        details=json.dumps({"reply_id": msg.id}),
    )
    db.add(log)
    # user notification row
    # Load user for email + notification
    u_res = await db.execute(select(User).where(User.id == t.user_id))
    u = u_res.scalar_one_or_none()
    snippet = (request.message or "").strip()
    if len(snippet) > 160:
        snippet = snippet[:157] + "…"
    try:
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=t.user_id,
            type=NotificationType.SYSTEM,
            title=f"Support reply on Ticket #{t.ticket_number}",
            message=snippet or "You have a new reply from Support.",
            action_url=f"{settings.FRONTEND_URL}/dashboard/support",
        )
        db.add(notif)
    except Exception:
        pass
    await db.commit()
    # realtime: notify admin dashboards + user channels
    AblyRealtimeManager.publish_admin_event("support", {"type": "ticket_replied", "ticket_id": t.id, "reply_id": msg.id})
    try:
        AblyRealtimeManager.publish_support_message(t.id, t.user_id, admin.email, request.message, True)
        AblyRealtimeManager.publish_notification(t.user_id, "support", f"Support replied to Ticket #{t.ticket_number}", snippet, {"ticket_id": t.id})
    except Exception:
        pass
    # email: optional
    try:
        if u and getattr(settings, "SMTP_SERVER", None):
            email_service.send_support_ticket_reply(u.email, t.ticket_number, t.subject, request.message)
    except Exception:
        pass
    return {"success": True, "data": {"id": msg.id}}

@router.put("/cards/status")
async def admin_update_card_status(
    admin_id: str,
    request: AdminUpdateCardStatusRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin:
            raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")
        required_perm = "cards:approve" if request.status == "active" else "cards:update"
        if not AdminPermissionManager.has_permission(admin.role, required_perm):
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
        if not admin or not AdminPermissionManager.has_permission(admin.role, "cards:view"):
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
                "profile_picture_url": u.profile_picture_url,
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
                "wallet_id": getattr(a, "wallet_id", None),
                "user": {
                    "id": user.id if user else "",
                    "name": f"{user.first_name} {user.last_name}".strip() if user else "",
                    "display_id": _to_admin_user_id(user) if user else "",
                },
                "created_at": a.created_at.isoformat() if getattr(a, "created_at", None) else None,
            }
        )

    return {"success": True, "data": {"items": payload, "total": total, "page": page, "page_size": page_size}}

@router.put("/transfers/edit")
async def admin_edit_transfer(
    payload: dict,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        admin = current_admin
        if not AdminPermissionManager.has_permission(admin.role, "transfers:edit"):
            raise UnauthorizedError(message="You don't have permission to edit transfers", error_code="PERMISSION_DENIED")
        transfer_id = payload.get("transfer_id")
        if not transfer_id:
            raise ValidationError(message="transfer_id is required", error_code="TRANSFER_ID_REQUIRED")
        tr_res = await db.execute(select(Transfer).where(Transfer.id == transfer_id))
        transfer = tr_res.scalar_one_or_none()
        if not transfer:
            raise NotFoundError(resource="Transfer", error_code="TRANSFER_NOT_FOUND")
        amount = payload.get("amount")
        description = payload.get("description")
        created_at = payload.get("created_at")
        processed_at = payload.get("processed_at")
        destination_account_number = payload.get("destination_account_number")  # allow editing destination
        recipient_name = payload.get("recipient_name")  # display-only, stored as description
        delta = 0.0
        editing_destination_completed = bool(destination_account_number) and transfer.status == TransferStatus.COMPLETED
        # Track old/new amounts explicitly to avoid misapplication when destination also changes
        old_amount = float(transfer.amount or 0.0)
        new_amount = old_amount
        if amount is not None:
            try:
                amount = float(amount)
            except Exception:
                raise ValidationError(message="amount must be a number", error_code="AMOUNT_INVALID")
            new_amount = amount
            delta = new_amount - old_amount
        # Apply delta to from/to accounts only when not simultaneously changing destination on a completed transfer
        from_acc_res = await db.execute(select(Account).where(Account.id == transfer.from_account_id).with_for_update())
        from_acc = from_acc_res.scalar_one_or_none()
        if not from_acc:
            raise NotFoundError(resource="Account", error_code="ACCOUNT_NOT_FOUND")
        if delta != 0.0 and not editing_destination_completed:
            from_before = from_acc.balance
            from_acc.balance = (from_acc.balance or 0.0) - delta
            from_acc.available_balance = (from_acc.available_balance or 0.0) - delta
            from_acc.updated_at = datetime.utcnow()
        if getattr(transfer, "to_account_id", None) and delta != 0.0 and transfer.status == TransferStatus.COMPLETED and not editing_destination_completed:
            to_acc_res = await db.execute(select(Account).where(Account.id == transfer.to_account_id).with_for_update())
            to_acc = to_acc_res.scalar_one_or_none()
            if to_acc:
                to_acc.balance = (to_acc.balance or 0.0) + delta
                to_acc.available_balance = (to_acc.available_balance or 0.0) + delta
                to_acc.updated_at = datetime.utcnow()
        # Change destination account if provided
        if destination_account_number:
            to_acc_res = await db.execute(select(Account).where(Account.account_number == destination_account_number).limit(1))
            new_to_acc = to_acc_res.scalar_one_or_none()
            # If completed and there was a previous internal recipient, move funds
            if transfer.status == TransferStatus.COMPLETED:
                # When changing destination on a completed transfer, first set the new amount (if provided)
                if amount is not None:
                    transfer.amount = new_amount
                if getattr(transfer, "to_account_id", None):
                    prev_to_res = await db.execute(select(Account).where(Account.id == transfer.to_account_id).with_for_update())
                    prev_to = prev_to_res.scalar_one_or_none()
                    if prev_to:
                        prev_before = prev_to.balance
                        # Debit previous recipient by the full ORIGINAL amount
                        prev_to.balance = (prev_to.balance or 0.0) - old_amount
                        prev_to.available_balance = (prev_to.available_balance or 0.0) - old_amount
                        prev_to.updated_at = datetime.utcnow()
                        # Record a debit on previous recipient
                        rev_tx = Transaction(
                            id=str(uuid.uuid4()),
                            account_id=prev_to.id,
                            user_id=prev_to.user_id,
                            type=TransactionType.WITHDRAWAL,
                            status=TransactionStatus.COMPLETED,
                            amount=old_amount,
                            currency=transfer.currency,
                            balance_before=prev_before,
                            balance_after=prev_to.balance,
                            description="Transfer destination change (previous recipient debit)",
                            reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
                            transfer_id=transfer.id,
                            created_at=datetime.utcnow(),
                        )
                        db.add(rev_tx)
                if new_to_acc:
                    # Credit new recipient
                    new_before = new_to_acc.balance
                    # Credit full NEW amount
                    credit_amount = transfer.amount if amount is not None else (transfer.amount or 0.0)
                    new_to_acc.balance = (new_to_acc.balance or 0.0) + credit_amount
                    new_to_acc.available_balance = (new_to_acc.available_balance or 0.0) + credit_amount
                    new_to_acc.updated_at = datetime.utcnow()
                    dep_tx = Transaction(
                        id=str(uuid.uuid4()),
                        account_id=new_to_acc.id,
                        user_id=new_to_acc.user_id,
                        type=TransactionType.DEPOSIT,
                        status=TransactionStatus.COMPLETED,
                        amount=credit_amount,
                        currency=transfer.currency,
                        balance_before=new_before,
                        balance_after=new_to_acc.balance,
                        description="Transfer destination change (new recipient credit)",
                        reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
                        transfer_id=transfer.id,
                        created_at=datetime.utcnow(),
                    )
                    db.add(dep_tx)
            # Update transfer destination
            if new_to_acc:
                transfer.to_account_id = new_to_acc.id
                transfer.to_account_number = None
            else:
                transfer.to_account_id = None
                transfer.to_account_number = destination_account_number
        tx_res = await db.execute(select(Transaction).where(Transaction.transfer_id == transfer.id))
        txs = tx_res.scalars().all()
        for t in txs:
            # Skip delta-based modification when changing destination on completed transfers
            if not editing_destination_completed and t.type in (TransactionType.WITHDRAWAL, TransactionType.DEBIT, TransactionType.PAYMENT, TransactionType.FEE) and delta != 0.0:
                t.amount = (t.amount or 0.0) + delta
                t.updated_at = datetime.utcnow()
            if description is not None:
                t.description = description
            if recipient_name is not None and not description:
                # If recipient_name provided and no new description, reflect recipient_name in tx description
                t.description = f"Transfer to {recipient_name}"
            if created_at:
                try:
                    t.created_at = datetime.fromisoformat(created_at)
                except Exception:
                    pass
            db.add(t)
        if amount is not None:
            # Ensure amount set (already applied earlier if editing destination)
            transfer.amount = new_amount
            fee = float(transfer.fee_amount or 0.0)
            transfer.total_amount = new_amount + fee
        if description is not None:
            transfer.description = description
        if recipient_name is not None and not description:
            transfer.description = recipient_name
        if created_at:
            try:
                transfer.created_at = datetime.fromisoformat(created_at)
            except Exception:
                pass
        if processed_at:
            try:
                transfer.processed_at = datetime.fromisoformat(processed_at)
            except Exception:
                pass
        db.add(transfer)
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="edit_transfer",
            resource_type="transfer",
            resource_id=transfer.id,
            details=json.dumps({"fields": list(payload.keys())})
        )
        db.add(audit_log)
        await db.commit()
        AblyRealtimeManager.publish_admin_event("transactions", {"type": "transfer_edited", "transfer_id": transfer.id})
        return {"success": True, "message": "Transfer updated"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Edit transfer failed", error=e)
        raise InternalServerError(operation="edit transfer", error_code="TRANSFER_EDIT_FAILED", original_error=e)

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
                "transfer_id": getattr(t, "transfer_id", None),
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

@router.put("/transactions/edit")
async def admin_edit_transaction(
    payload: dict,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Edit basic transaction attributes like description or created_at."""
    try:
        admin = current_admin
        if not AdminPermissionManager.has_permission(admin.role, "transactions:edit"):
            raise UnauthorizedError(message="You don't have permission to edit transactions", error_code="PERMISSION_DENIED")
        tx_id = payload.get("transaction_id")
        if not tx_id:
            raise ValidationError(message="transaction_id is required", error_code="TX_ID_REQUIRED")
        result = await db.execute(select(Transaction).where(Transaction.id == tx_id))
        tx = result.scalar_one_or_none()
        if not tx:
            raise NotFoundError(resource="Transaction", error_code="TX_NOT_FOUND")
        if "description" in payload and isinstance(payload["description"], str):
            tx.description = payload["description"]
        if "created_at" in payload and payload["created_at"]:
            try:
                tx.created_at = datetime.fromisoformat(payload["created_at"])
            except Exception:
                pass
        db.add(tx)
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="edit_transaction",
            resource_type="transaction",
            resource_id=tx.id,
            details=json.dumps({"fields": list(payload.keys())})
        )
        db.add(audit_log)
        await db.commit()
        return {"success": True, "message": "Transaction updated"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Edit transaction failed", error=e)
        raise InternalServerError(operation="edit transaction", error_code="TX_EDIT_FAILED", original_error=e)

@router.post("/transfers/reverse")
async def admin_reverse_transfer(
    payload: dict,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reverse a transfer: credit sender back, and if internal/domestic to internal account, debit recipient."""
    try:
        admin = current_admin
        if not AdminPermissionManager.has_permission(admin.role, "transfers:reverse"):
            raise UnauthorizedError(message="You don't have permission to reverse transfers", error_code="PERMISSION_DENIED")
        transfer_id = payload.get("transfer_id")
        if not transfer_id:
            raise ValidationError(message="transfer_id is required", error_code="TRANSFER_ID_REQUIRED")
        result = await db.execute(select(Transfer).where(Transfer.id == transfer_id))
        transfer = result.scalar_one_or_none()
        if not transfer:
            raise NotFoundError(resource="Transfer", error_code="TRANSFER_NOT_FOUND")
        # Prevent double-reversal or reversing terminal transfers
        if transfer.status in (TransferStatus.CANCELLED, TransferStatus.REJECTED, TransferStatus.FAILED):
            raise ValidationError(message="Transfer already reversed or not reversible", error_code="TRANSFER_NOT_REVERSIBLE")
        # Credit sender back
        from_acc_res = await db.execute(select(Account).where(Account.id == transfer.from_account_id).with_for_update())
        from_acc = from_acc_res.scalar_one_or_none()
        if not from_acc:
            raise NotFoundError(resource="Account", error_code="ACCOUNT_NOT_FOUND")
        fb = from_acc.balance
        from_acc.balance = (from_acc.balance or 0.0) + transfer.total_amount
        from_acc.available_balance = (from_acc.available_balance or 0.0) + transfer.total_amount
        from_acc.updated_at = datetime.utcnow()
        credit_tx = Transaction(
            id=str(uuid.uuid4()),
            account_id=from_acc.id,
            user_id=from_acc.user_id,
            type=TransactionType.CREDIT,
            status=TransactionStatus.COMPLETED,
            amount=transfer.total_amount,
            currency=transfer.currency,
            balance_before=fb,
            balance_after=from_acc.balance,
            description="Transfer reversal credit",
            reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
            transfer_id=transfer.id,
            created_at=datetime.utcnow(),
        )
        db.add(credit_tx)
        # If recipient was internal, debit them
        if getattr(transfer, "to_account_id", None):
            to_acc_res = await db.execute(select(Account).where(Account.id == transfer.to_account_id).with_for_update())
            to_acc = to_acc_res.scalar_one_or_none()
            if to_acc:
                tb = to_acc.balance
                to_acc.balance = (to_acc.balance or 0.0) - transfer.amount
                to_acc.available_balance = (to_acc.available_balance or 0.0) - transfer.amount
                to_acc.updated_at = datetime.utcnow()
                debit_tx = Transaction(
                    id=str(uuid.uuid4()),
                    account_id=to_acc.id,
                    user_id=to_acc.user_id,
                    type=TransactionType.WITHDRAWAL,
                    status=TransactionStatus.COMPLETED,
                    amount=transfer.amount,
                    currency=transfer.currency,
                    balance_before=tb,
                    balance_after=to_acc.balance,
                    description="Transfer reversal debit",
                    reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
                    transfer_id=transfer.id,
                    created_at=datetime.utcnow(),
                )
                db.add(debit_tx)
        transfer.status = TransferStatus.CANCELLED
        transfer.processed_at = datetime.utcnow()
        db.add(transfer)
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="reverse_transfer",
            resource_type="transfer",
            resource_id=transfer.id,
            details=json.dumps({"reason": payload.get("reason")})
        )
        db.add(audit_log)
        await db.commit()
        # In-app notification to sender
        try:
            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=from_acc.user_id,
                type=NotificationType.TRANSACTION,
                title="Transfer Reversed",
                message=f"{transfer.currency} {transfer.total_amount:,.2f} credited back. Ref: {transfer.reference_number}",
                transfer_id=transfer.id,
                action_url=f"{settings.FRONTEND_URL}/dashboard/transfers/receipt/{transfer.id}",
                action_type="view"
            )
            db.add(notif)
            await db.commit()
            AblyRealtimeManager.publish_notification(
                from_acc.user_id,
                "transfer_reversed",
                "Transfer Reversed",
                f"{transfer.currency} {transfer.total_amount:,.2f} credited back. Ref: {transfer.reference_number}",
                {"id": notif.id, "transfer_id": transfer.id}
            )
        except Exception:
            pass
        # Email notification to sender (if SMTP configured)
        try:
            if getattr(settings, "SMTP_SERVER", None):
                user_res = await db.execute(select(User).where(User.id == from_acc.user_id))
                sender = user_res.scalar_one_or_none()
                if sender and getattr(sender, "email", None):
                    admin_reason = (payload.get("reason") or "").strip()
                    email_service.send_transfer_reversed_email(
                        sender.email,
                        float(transfer.total_amount or 0.0),
                        transfer.currency,
                        transfer.reference_number,
                        reason=admin_reason if admin_reason else None
                    )
        except Exception:
            pass
        AblyRealtimeManager.publish_admin_event("transactions", {"type": "transfer_reversed", "transfer_id": transfer.id})
        AblyRealtimeManager.publish_balance_update(from_acc.user_id, from_acc.id, from_acc.balance, from_acc.currency)
        return {"success": True, "message": "Transfer reversed"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Reverse transfer failed", error=e)
        raise InternalServerError(operation="reverse transfer", error_code="TRANSFER_REVERSE_FAILED", original_error=e)

@router.get("/deposits/list")
async def list_deposits(
    admin_id: str,
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db)
):
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin:
            raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")
        if not AdminPermissionManager.has_permission(admin.role, "deposits:approve"):
            raise UnauthorizedError(message="You don't have permission to view deposits", error_code="PERMISSION_DENIED")
        query = select(Deposit)
        if status:
            try:
                ds = DepositStatus(status)
                query = query.where(Deposit.status == ds)
            except Exception:
                pass
        result = await db.execute(query.order_by(Deposit.created_at.desc()))
        items = result.scalars().all()
        users_map = {}
        users_res = await db.execute(select(User.id, User.email))
        for uid, email in users_res.all():
            users_map[uid] = email
        data = []
        for d in items:
            # Fetch account number to show masked account
            acc_num = "—"
            try:
                ares = await db.execute(select(Account.account_number).where(Account.id == d.account_id))
                anum = ares.scalar()
                if anum:
                    acc_num = f"...{anum[-4:]}"
            except Exception:
                pass

            data.append({
                "id": d.id,
                "type": getattr(d.type, "value", str(d.type)),
                "user_id": d.user_id,
                "user_email": users_map.get(d.user_id),
                "account_id": d.account_id,
                "amount": d.amount,
                "currency": d.currency,
                "status": getattr(d.status, "value", str(d.status)),
                "created_at": d.created_at,
                "check_number": d.check_number,
                "name_on_check": d.name_on_check,
                "front_image_url": d.front_image_url,
                # 'details' is used by the frontend purely for display
                "details": f"Check #{d.check_number or '—'} • Acc: {acc_num}"
            })
        return {"success": True, "data": data}
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("List deposits failed", error=e)
        raise InternalServerError(operation="list deposits", error_code="LIST_DEPOSITS_FAILED", original_error=e)

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
        allowed_statuses = {DepositStatus.PENDING, DepositStatus.PROCESSING, DepositStatus.VERIFIED}
        if deposit.status not in allowed_statuses:
            if deposit.status == DepositStatus.COMPLETED:
                raise ConflictError(message="Deposit already completed", error_code="DEPOSIT_ALREADY_COMPLETED")
            raise ValidationError(message="Deposit not in approvable state", error_code="DEPOSIT_NOT_APPROVABLE")
        acc_result = await db.execute(select(Account).where(Account.id == deposit.account_id))
        account = acc_result.scalar()
        if not account:
            raise NotFoundError(resource="Account", error_code="ACCOUNT_NOT_FOUND")
        balance_before = account.balance
        account.balance = (account.balance or 0) + float(deposit.amount)
        account.available_balance = (account.available_balance or 0) + float(deposit.amount)
        reference = f"DEP-{uuid.uuid4().hex[:10].upper()}"
        tx = Transaction(
            id=str(uuid.uuid4()),
            account_id=account.id,
            user_id=deposit.user_id,
            type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED,
            amount=float(deposit.amount),
            currency=deposit.currency,
            balance_before=balance_before,
            balance_after=account.balance,
            description="Mobile check deposit",
            reference_number=reference
        )
        deposit.status = DepositStatus.COMPLETED
        deposit.completed_at = datetime.utcnow()
        deposit.transaction_id = tx.id
        if getattr(request, "confirmation_code", None):
            setattr(deposit, "confirmation_code", request.confirmation_code)
        db.add(account)
        db.add(tx)
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
            f"Your {getattr(deposit.type, 'value', str(deposit.type))} deposit of {deposit.currency} {deposit.amount} has been approved."
        )
        AblyRealtimeManager.publish_balance_update(account.user_id, account.id, account.balance, account.currency)
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "deposit_completed", "deposit_id": deposit.id})
        
        logger.info(f"Deposit approved by {admin.email}: {deposit.id}")
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.COMPLETED,
            "message": "Deposit completed and account credited"
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
        
        deposit.status = DepositStatus.REJECTED
        deposit.rejection_reason = request.reason
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
            f"Your {getattr(deposit.type, 'value', str(deposit.type))} deposit has been declined. Reason: {request.reason}"
        )
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "deposit_declined", "deposit_id": deposit.id})
        
        logger.info(f"Deposit declined by {admin.email}: {deposit.id}")
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.REJECTED,
            "message": "Deposit rejected successfully"
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


@router.post("/loans/approve", response_model=LoanApprovalResponse)
async def approve_loan(
    admin_id: str,
    request: ApproveLoanRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve loan application and disburse funds"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin:
            raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")
        
        if not AdminPermissionManager.has_permission(admin.role, "loans:approve"):
            raise UnauthorizedError(message="You don't have permission to approve loans", error_code="PERMISSION_DENIED")
        
        # Get application
        app_result = await db.execute(select(LoanApplication).where(LoanApplication.id == request.application_id))
        app = app_result.scalar()
        if not app:
            raise NotFoundError(resource="LoanApplication", error_code="APPLICATION_NOT_FOUND")
        
        if app.status != LoanApplicationStatus.SUBMITTED:
             raise ValidationError(message="Only submitted applications can be approved", error_code="INVALID_STATE")

        # Get product
        prod_result = await db.execute(select(LoanProduct).where(LoanProduct.id == app.product_id))
        product = prod_result.scalar()

        if not product:
            raise NotFoundError(resource="LoanProduct", error_code="LOAN_PRODUCT_NOT_FOUND")
        app.status = LoanApplicationStatus.APPROVED
        app.approved_amount = request.approved_amount or app.requested_amount
        app.approved_interest_rate = request.interest_rate if request.interest_rate is not None else (product.base_interest_rate or 0.0)
        n = request.term_months if request.term_months is not None else app.requested_term_months
        try:
            n = int(n) if n is not None else 1
        except Exception:
            n = 1
        if n <= 0:
            n = 1
        app.approved_term_months = n
        app.approved_at = datetime.utcnow()
        app.reviewed_at = datetime.utcnow()
        
        # Calculate monthly payment (simple amortization)
        rate = (app.approved_interest_rate or 0.0) / 12 / 100
        n = app.approved_term_months
        if rate == 0:
            app.monthly_payment = app.approved_amount / max(1, n)
        else:
            app.monthly_payment = (app.approved_amount * rate) / (1 - (1 + rate)**-n)

        # Create Active Loan
        new_loan = Loan(
            id=str(uuid.uuid4()),
            user_id=app.user_id,
            account_id=app.account_id,
            application_id=app.id,
            type=product.type,
            status=LoanStatus.ACTIVE,
            principal_amount=app.approved_amount,
            interest_rate=app.approved_interest_rate,
            term_months=app.approved_term_months,
            monthly_payment=app.monthly_payment,
            remaining_balance=app.approved_amount,
            next_payment_date=datetime.utcnow() + timedelta(days=30),
            originated_at=datetime.utcnow(),
            maturity_date=datetime.utcnow() + timedelta(days=30 * n)
        )
        db.add(new_loan)

        # Disburse funds to selected account
        if app.account_id:
            acc_result = await db.execute(select(Account).where(Account.id == app.account_id).with_for_update())
            account = acc_result.scalar()
            if account:
                before = account.balance
                account.balance += app.approved_amount
                account.available_balance += app.approved_amount
                
                # Update the pending transaction to COMPLETED
                tx_result = await db.execute(
                    select(Transaction)
                    .where(Transaction.account_id == app.account_id, Transaction.description.like(f"%Loan Application%"))
                    .order_by(Transaction.created_at.desc())
                    .limit(1)
                )
                tx = tx_result.scalar()
                if tx:
                    tx.status = TransactionStatus.COMPLETED
                    tx.type = TransactionType.LOAN # Update to LOAN
                    tx.balance_before = before
                    tx.balance_after = account.balance
                    tx.amount = app.approved_amount
                    tx.description = f"Loan Disbursement: {product.name}"
                    db.add(tx)
                else:
                    # Create new transaction if not found
                    disbursement_tx = Transaction(
                        id=str(uuid.uuid4()),
                        account_id=app.account_id,
                        user_id=app.user_id,
                        type=TransactionType.LOAN,
                        status=TransactionStatus.COMPLETED,
                        amount=app.approved_amount,
                        currency=account.currency,
                        balance_before=before,
                        balance_after=account.balance,
                        description=f"Loan Disbursement: {product.name}",
                        reference_number=f"LD-{uuid.uuid4().hex[:8].upper()}",
                        created_at=datetime.utcnow()
                    )
                    db.add(disbursement_tx)

        # Audit log
        audit = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="approve_loan",
            resource_type="loan_application",
            resource_id=app.id,
            details=json.dumps({"amount": app.approved_amount, "notes": request.notes})
        )
        db.add(audit)
        
        await db.commit()

        # Notifications
        user_result = await db.execute(select(User).where(User.id == app.user_id))
        user = user_result.scalar()
        if user:
            AblyRealtimeManager.publish_notification(
                user.id,
                "loan_approved",
                "Loan Approved",
                f"Your loan application for {format(app.approved_amount, ',.2f')} has been approved and funds disbursed."
            )
            # In-app notification record
            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=user.id,
                type=NotificationType.SYSTEM,
                title="Loan Approved",
                message=f"Congratulations! Your loan of {format(app.approved_amount, ',.2f')} has been approved.",
                action_url=f"{settings.FRONTEND_URL}/dashboard/loans"
            )
            db.add(notif)
            await db.commit()

            # Email
            try:
                if getattr(settings, "SMTP_SERVER", None):
                    email_service.send_loan_status_email(user.email, "Approved", app.approved_amount, "")
            except Exception:
                pass

        return {
            "success": True,
            "application_id": app.id,
            "status": "approved",
            "message": "Loan application approved and funds disbursed"
        }
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Loan approval failed", error=e)
        raise InternalServerError(operation="loan approval", error_code="APPROVAL_FAILED", original_error=e)


@router.post("/loans/decline", response_model=LoanApprovalResponse)
async def decline_loan(
    admin_id: str,
    request: DeclineLoanRequest,
    db: AsyncSession = Depends(get_db)
):
    """Decline loan application"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin:
            raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")
        
        if not AdminPermissionManager.has_permission(admin.role, "loans:decline"):
            raise UnauthorizedError(message="You don't have permission to decline loans", error_code="PERMISSION_DENIED")
        
        # Get application
        app_result = await db.execute(select(LoanApplication).where(LoanApplication.id == request.application_id))
        app = app_result.scalar()
        if not app:
            raise NotFoundError(resource="LoanApplication", error_code="APPLICATION_NOT_FOUND")
        
        app.status = LoanApplicationStatus.REJECTED
        app.rejected_at = datetime.utcnow()
        app.rejection_reason = request.reason
        app.reviewed_at = datetime.utcnow()

        # Update pending transaction to FAILED
        tx_result = await db.execute(
            select(Transaction)
            .where(Transaction.account_id == app.account_id, Transaction.description.like(f"%Loan Application%"))
            .order_by(Transaction.created_at.desc())
            .limit(1)
        )
        tx = tx_result.scalar()
        if tx:
            tx.status = TransactionStatus.FAILED
            tx.description = f"Loan Application Declined: {request.reason[:50]}"
            db.add(tx)

        # Audit log
        audit = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="decline_loan",
            resource_type="loan_application",
            resource_id=app.id,
            details=json.dumps({"reason": request.reason})
        )
        db.add(audit)
        
        await db.commit()

        # Notifications
        user_result = await db.execute(select(User).where(User.id == app.user_id))
        user = user_result.scalar()
        if user:
            AblyRealtimeManager.publish_notification(
                user.id,
                "loan_declined",
                "Loan Declined",
                f"Your loan application has been declined. Reason: {request.reason}"
            )
            # In-app notification record
            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=user.id,
                type=NotificationType.SYSTEM,
                title="Loan Declined",
                message=f"We regret to inform you that your loan application has been declined. Reason: {request.reason}",
                action_url=f"{settings.FRONTEND_URL}/dashboard/loans"
            )
            db.add(notif)
            await db.commit()

            # Email
            try:
                if getattr(settings, "SMTP_SERVER", None):
                    email_service.send_loan_status_email(user.email, "Declined", app.requested_amount, request.reason)
            except Exception:
                pass

        return {
            "success": True,
            "application_id": app.id,
            "status": "rejected",
            "message": "Loan application declined"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Loan decline failed", error=e)
        raise InternalServerError(operation="loan decline", error_code="DECLINE_FAILED", original_error=e)


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
        old_email = user.email
        changed_fields = []
        def mark_changed(name: str): 
            changed_fields.append(name)
        if request.email and request.email != user.email:
            user.email = request.email
            mark_changed("email")
        if request.username and request.username != user.username:
            user.username = request.username
            mark_changed("username")
        if request.first_name and request.first_name != user.first_name:
            user.first_name = request.first_name
            mark_changed("first_name")
        if request.last_name and request.last_name != user.last_name:
            user.last_name = request.last_name
            mark_changed("last_name")
        if request.phone and request.phone != (user.phone or ""):
            user.phone = request.phone
            mark_changed("phone")
        if request.country and request.country.upper() != (user.country or ""):
            user.country = request.country.upper()
            mark_changed("country")
        if request.street_address is not None and request.street_address != (user.street_address or ""):
            user.street_address = request.street_address
            mark_changed("street_address")
        if request.city is not None and request.city != (user.city or ""):
            user.city = request.city
            mark_changed("city")
        if request.state is not None and request.state != (user.state or ""):
            user.state = request.state
            mark_changed("state")
        if request.postal_code is not None and request.postal_code != (user.postal_code or ""):
            user.postal_code = request.postal_code
            mark_changed("postal_code")
        if request.date_joined:
            # Normalize to naive UTC for storage and comparison
            new_dt = request.date_joined
            if isinstance(new_dt, datetime) and new_dt.tzinfo is not None:
                new_dt = new_dt.astimezone(timezone.utc).replace(tzinfo=None)
            now_utc = datetime.utcnow()
            if new_dt > now_utc:
                raise ValidationError(
                    message="date_joined cannot be in the future",
                    error_code="DATE_JOINED_FUTURE_FORBIDDEN"
                )
            user.created_at = new_dt
            mark_changed("created_at")
        if request.is_active is not None:
            user.is_active = request.is_active
            user.is_locked = not request.is_active
            mark_changed("status")
        
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
                "email": request.email,
                "username": request.username,
                "first_name": request.first_name,
                "last_name": request.last_name,
                "country": request.country,
                "city": request.city,
                "state": request.state,
                "postal_code": request.postal_code,
                "date_joined": request.date_joined.isoformat() if request.date_joined else None
            })
        )
        db.add(audit_log)
        
        await db.commit()
        
        AblyRealtimeManager.publish_admin_event("users", {"type": "edited", "user_id": user.id})
        try:
            AblyRealtimeManager.publish_notification(
                user.id,
                "profile_update",
                "Profile Updated",
                "Your profile information was updated by support.",
                {
                    "user_id": user.id,
                    "email": user.email,
                    "username": user.username,
                }
            )
        except Exception:
            pass
        # Email notifications (old and new email on email change; otherwise current email)
        try:
            if getattr(settings, "SMTP_SERVER", None) and changed_fields:
                full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username or "Customer"
                if old_email and old_email != user.email:
                    email_service.send_profile_update_notice(
                        old_email, full_name, changed_fields, old_email=old_email, new_email=user.email, acted_by=None
                    )
                    if user.email:
                        email_service.send_profile_update_notice(
                            user.email, full_name, changed_fields, old_email=old_email, new_email=user.email, acted_by=None
                        )
                elif user.email:
                    email_service.send_profile_update_notice(
                        user.email, full_name, changed_fields, acted_by=None
                    )
        except Exception:
            pass
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

@router.get("/users/detail")
async def admin_get_user_detail(
    admin_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get full user detail for edit modal"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:read"):
            raise UnauthorizedError(message="You don't have permission to view users", error_code="PERMISSION_DENIED")
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundError(resource="User", error_code="USER_NOT_FOUND")
        return {
            "success": True,
            "data": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "country": user.country,
                "street_address": user.street_address,
                "city": user.city,
                "state": user.state,
                "postal_code": user.postal_code,
                "profile_picture_url": getattr(user, "profile_picture_url", None),
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "is_active": user.is_active,
            }
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Get user detail failed", error=e)
        raise InternalServerError(operation="get user detail", error_code="GET_USER_DETAIL_FAILED", original_error=e)

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

class AdminUpdateWalletIdRequest(BaseModel):
    account_id: str
    wallet_id: str
    wallet_qrcode: Optional[str] = None

@router.put("/accounts/wallet-id")
async def admin_update_wallet_id(
    admin_id: str,
    request: AdminUpdateWalletIdRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin: set wallet_id on a crypto account"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin:
            raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")
        acc_result = await db.execute(select(Account).where(Account.id == request.account_id))
        account = acc_result.scalar_one_or_none()
        if not account:
            raise NotFoundError(resource="Account", error_code="ACCOUNT_NOT_FOUND")
        from models.account import AccountType as AT
        acct_type = account.account_type.value if hasattr(account.account_type, "value") else str(account.account_type)
        if acct_type != "crypto":
            raise ValidationError(message="Wallet ID can only be set on crypto accounts", error_code="NOT_CRYPTO_ACCOUNT")
        account.wallet_id = request.wallet_id
        if request.wallet_qrcode:
            account.wallet_qrcode = request.wallet_qrcode
        account.updated_at = datetime.utcnow()
        db.add(account)
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="update_wallet_id",
            resource_type="account",
            resource_id=account.id,
            details=json.dumps({"wallet_id": request.wallet_id, "has_qrcode": bool(request.wallet_qrcode)})
        )
        db.add(audit_log)
        await db.commit()
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "wallet_id_updated", "account_id": account.id})
        return {"success": True, "message": "Wallet ID updated"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Wallet ID update failed", error=e)
        raise InternalServerError(operation="update wallet id", error_code="WALLET_ID_UPDATE_FAILED", original_error=e)

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
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    resource_type: str | None = Query(None),
    resource_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    """Get audit logs, optionally filtered by resource type/id. Uses auth token for admin context."""
    try:
        if not admin or not AdminPermissionManager.has_permission(admin.role, "audit_logs:view"):
            raise UnauthorizedError(
                message="You don't have permission to view audit logs",
                error_code="PERMISSION_DENIED"
            )
        stmt = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
        if resource_type:
            stmt = stmt.where(AdminAuditLog.resource_type == resource_type)
        if resource_id:
            stmt = stmt.where(AdminAuditLog.resource_id == resource_id)
        stmt = stmt.offset(offset).limit(limit)
        result = await db.execute(stmt)
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
    token_request = await get_admin_ably_token_request(admin_id)
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

@router.get("/loans/applications")
async def get_all_loan_applications(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """List all loan applications for admin review"""
    try:
        if not AdminPermissionManager.has_permission(admin.role, "loans:view"):
            raise UnauthorizedError(message="Permission denied", error_code="PERMISSION_DENIED")
            
        stmt = select(LoanApplication, User.email, LoanProduct.name).join(User, LoanApplication.user_id == User.id).join(LoanProduct, LoanApplication.product_id == LoanProduct.id)
        
        if status:
            stmt = stmt.where(LoanApplication.status == status)
        
        stmt = stmt.order_by(LoanApplication.created_at.desc())
        
        result = await db.execute(stmt)
        applications = result.all()
        
        return {
            "success": True,
            "data": [
                {
                    "id": a.LoanApplication.id,
                    "user_email": a.email,
                    "product_name": a.name,
                    "amount": a.LoanApplication.requested_amount,
                    "currency": "USD", # Defaulting to USD for now or fetch from account
                    "status": a.LoanApplication.status,
                    "created_at": a.LoanApplication.created_at.isoformat(),
                    "details": f"Loan for {a.LoanApplication.purpose} - {a.LoanApplication.requested_term_months} months"
                }
                for a in applications
            ]
        }
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("Failed to fetch loan applications", error=e)
        raise InternalServerError(operation="fetch loan apps", error_code="FETCH_FAILED", original_error=e)

 

@router.post("/loans/products")
async def create_loan_product(
    request: AdminCreateLoanProductRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Admin create new loan product"""
    try:
        if not AdminPermissionManager.has_permission(admin.role, "loans:create"):
            raise UnauthorizedError(message="Permission denied", error_code="PERMISSION_DENIED")
            
        new_product = LoanProduct(
            id=request.id or f"lp_{uuid.uuid4().hex[:8]}",
            name=request.name,
            type=request.type,
            description=request.description,
            min_amount=request.min_amount,
            max_amount=request.max_amount,
            base_interest_rate=request.base_interest_rate,
            min_term_months=request.min_term_months,
            max_term_months=request.max_term_months,
            tag=request.tag,
            image_url=request.image_url,
            features=json.dumps(request.features),
            employment_required=request.employment_required,
            available_to_standard=request.available_to_standard,
            available_to_priority=request.available_to_priority,
            available_to_premium=request.available_to_premium,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_product)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="create_loan_product",
            resource_type="loan_product",
            resource_id=new_product.id,
            details=json.dumps({"name": request.name})
        )
        db.add(audit_log)
        
        await db.commit()
        
        return {
            "success": True,
            "data": {
                "id": new_product.id,
                "name": new_product.name
            },
            "message": "Loan product created successfully"
        }
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("Failed to create loan product", error=e)
        raise InternalServerError(operation="create loan product", error_code="CREATE_FAILED", original_error=e)
