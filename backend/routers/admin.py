from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from datetime import datetime, timezone, timedelta
import uuid
import json

from models.admin import AdminUser, AdminAuditLog
from models.support import SupportTicket, TicketMessage, LoginHistory
from models.user import User
from models.account import Account, AccountStatus
from models.transaction import Transaction, TransactionType, TransactionStatus
from models.transfer import Transfer, TransferStatus, TransferType, Beneficiary
from models.deposit import Deposit, DepositStatus
from models.virtual_card import VirtualCard, VirtualCardStatus
from models.loan import Loan, LoanStatus, LoanApplication, LoanApplicationStatus, LoanProduct, LoanType, LoanPayment, LoanSchedule
from models.notification import Notification, NotificationType
from models.document import Document
from models.bill_payment import BillPayment, BillPayee, ScheduledPayment
from models.user_restriction import UserRestriction, RestrictionType
from schemas.admin import (
    AdminRegisterRequest, AdminLoginRequest, AdminResponse,
    ApproveTransferRequest, DeclineTransferRequest, TransferApprovalResponse,
    ApproveDepositRequest, DeclineDepositRequest, DepositApprovalResponse,
    ApproveVirtualCardRequest, DeclineVirtualCardRequest, VirtualCardApprovalResponse,
    ApproveLoanRequest, DeclineLoanRequest, LoanApprovalResponse,
    ApproveUserRequest, DeclineUserRequest, UserApprovalResponse,
    AdminCreateUserRequest, AdminEditUserRequest, AdminAuditLogResponse,
    AdminAccountStatusRequest, AdminAdjustBalanceRequest, AdminUpdateCardStatusRequest, AdminCardActionRequest,
    AdminStatisticsResponse, AdminCreateLoanProductRequest, AdminCreateLoanRequest,
    GenerateTransactionsRequest, GenerateTransactionsPreviewRequest,
    GenerateTransactionsPreviewResponse, GenerateTransactionsResponse
)
from schemas.user_restriction import (
    CreateRestrictionRequest, RemoveRestrictionRequest, 
    UserRestrictionResponse, UserRestrictionsResponse
)
from pydantic import ValidationError as PydanticValidationError
from utils.admin_auth import AdminAuthManager, AdminPermissionManager, get_current_admin
from database import get_db
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
    if not user.email_verified:
        return "pending_verification"
    if not user.is_approved:
        return "pending_approval"
    if not user.is_active:
        return "inactive"
    if getattr(user, "is_locked", False):
        return "suspended"
    if getattr(user, "is_restricted", False):
        return "restricted"
    return "active"


def _verification_status(user: User) -> str:
    if not user.email_verified:
        return "pending"
    if not user.is_approved:
        return "pending_approval"
    return "verified"


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
    cutoff = datetime.now(timezone.utc).timestamp() - (30 * 24 * 60 * 60)
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
    now = datetime.now(timezone.utc)
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
        "created_at": t.created_at.isoformat() + 'Z' if t.created_at else None,
        "updated_at": t.updated_at.isoformat() + 'Z' if getattr(t, "updated_at", None) else None,
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
    t.assigned_at = datetime.now(timezone.utc)
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
        t.resolved_at = datetime.now(timezone.utc) if request.status == "resolved" else getattr(t, "resolved_at", None)
        t.closed_at = datetime.now(timezone.utc) if request.status == "closed" else getattr(t, "closed_at", None)
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
            "created_at": m.created_at.isoformat() + 'Z' if m.created_at else None,
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
        created_at=datetime.now(timezone.utc),
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
            card.status = VirtualCardStatus.PENDING
        elif request.status == "active":
            card.status = VirtualCardStatus.ACTIVE
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
                    title="Virtual Card Ready",
                    message=f"Your card \"{card.card_name}\" is ready and available for use.",
                    action_url=f"{settings.FRONTEND_URL}/dashboard/virtual-cards",
                )
                db.add(notif)
                await db.commit()
                AblyRealtimeManager.publish_notification(
                    user.id,
                    "system",
                    "Virtual Card Ready",
                    f"Your card \"{card.card_name}\" is ready and available for use.",
                    {"id": notif.id, "created_at": datetime.now(timezone.utc).isoformat()}
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
        if card.status != VirtualCardStatus.ACTIVE:
            raise ValidationError(message="Only active cards can be frozen", error_code="INVALID_STATE")
        card.status = VirtualCardStatus.SUSPENDED
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
        AblyRealtimeManager.publish_card_status_update(card.user_id, card.id, VirtualCardStatus.SUSPENDED.value if hasattr(VirtualCardStatus.SUSPENDED, "value") else "suspended", "freeze")
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
        if card.status != VirtualCardStatus.SUSPENDED:
            raise ValidationError(message="Only suspended cards can be unfreezed", error_code="INVALID_STATE")
        card.status = VirtualCardStatus.ACTIVE
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
        AblyRealtimeManager.publish_card_status_update(card.user_id, card.id, VirtualCardStatus.ACTIVE.value if hasattr(VirtualCardStatus.ACTIVE, "value") else "active", "unfreeze")
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
        card.status = VirtualCardStatus.BLOCKED
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
        AblyRealtimeManager.publish_card_status_update(card.user_id, card.id, VirtualCardStatus.BLOCKED.value if hasattr(VirtualCardStatus.BLOCKED, "value") else "blocked", "block")
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
                "created_at": c.created_at.isoformat() + 'Z' if c.created_at else None,
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
        # Fetch user restrictions
        restrictions_result = await db.execute(
            select(UserRestriction).where(
                UserRestriction.user_id == u.id,
                UserRestriction.is_active == True
            )
        )
        restrictions = restrictions_result.scalars().all()
        
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
                "is_restricted": getattr(u, "is_restricted", False),
                "restricted_until": u.restricted_until.isoformat() + 'Z' if getattr(u, "restricted_until", None) else None,
                "restrictions": [
                    {
                        "id": r.id,
                        "restriction_type": r.restriction_type.value if isinstance(r.restriction_type, RestrictionType) else r.restriction_type,
                        "is_active": r.is_active,
                        "message": r.message
                    }
                    for r in restrictions
                ],
                "created_at": u.created_at.isoformat() + 'Z' if u.created_at else None,
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
                "created_at": a.created_at.isoformat() + 'Z' if getattr(a, "created_at", None) else None,
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
                            created_at=datetime.now(timezone.utc),
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
                        created_at=datetime.now(timezone.utc),
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
    """Transactions list for admin UI - includes both real and generated transactions."""
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    # Get all transactions (both with and without transfer_id - includes generated transactions)
    tx_result = await db.execute(
        select(Transaction).order_by(Transaction.created_at.desc())
    )
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
    total_pages = (total + page_size - 1) // page_size  # Calculate total pages
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
                "created_at": t.created_at.isoformat() + 'Z' if getattr(t, "created_at", None) else None,
                "transfer_id": getattr(t, "transfer_id", None),
                "is_generated": getattr(t, "transfer_id", None) is None,  # Flag for generated transactions
                "account_number": acc.account_number if acc else "",
                "user": {
                    "id": user.id if user else "",
                    "name": f"{user.first_name} {user.last_name}".strip() if user else "",
                    "display_id": _to_admin_user_id(user) if user else "",
                },
            }
        )

    return {
        "success": True, 
        "data": {
            "items": payload, 
            "total": total, 
            "page": page, 
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


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
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(new_admin)
        await db.commit()
        await db.refresh(new_admin)
        
        logger.info(f"Admin registered: {new_admin.email}")
        
        return {
            "success": True,
            "message": "Admin registration successful",
            "data": AdminResponse.model_validate(new_admin)
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


@router.post("/users/approve", response_model=UserApprovalResponse)
async def approve_user(
    admin_id: str,
    request: ApproveUserRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve a newly registered user"""
    try:
        # Verify admin exists and has permission
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(message="Admin not found")
        
        if not AdminPermissionManager.has_permission(admin.role, "users:update"):
            raise UnauthorizedError(message="You don't have permission to approve users")
            
        # Get user
        user_result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = user_result.scalar()
        
        if not user:
            raise NotFoundError(resource="User")
            
        if user.is_approved:
            raise ConflictError("User is already approved")
            
        # Approve user
        user.is_approved = True
        user.is_active = True
        user.updated_at = datetime.now(timezone.utc)
        db.add(user)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="approve_user",
            resource_type="user",
            resource_id=user.id,
            details=json.dumps({"notes": request.notes})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Send approval email
        try:
            email_service.send_approval_email(user.email, user.first_name)
        except Exception as e:
            logger.error(f"Failed to send approval email to {user.email}: {e}")
            
        # Create notification for user
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=user.id,
            type=NotificationType.SYSTEM,
            title="Account Approved",
            message="Your account has been approved! Welcome to SCIB. Please set your transfer PIN to begin banking.",
            action_url="/auth/set-transfer-pin"
        )
        db.add(notif)
        await db.commit()
        
        # Publish real-time events
        try:
            AblyRealtimeManager.publish_admin_event("users", {
                "type": "user_approved",
                "user_id": user.id,
                "admin_email": admin.email
            })
            AblyRealtimeManager.publish_notification(user.id, "account_approved", "Account Approved", "Your account is now active.")
        except Exception:
            pass
            
        return UserApprovalResponse(
            success=True,
            user_id=user.id,
            status="approved",
            message="User account approved successfully"
        )
    except (UnauthorizedError, NotFoundError, ConflictError):
        raise
    except Exception as e:
        logger.error(f"User approval failed: {e}")
        raise InternalServerError(operation="approve user", original_error=e)


@router.post("/users/decline", response_model=UserApprovalResponse)
async def decline_user(
    admin_id: str,
    request: DeclineUserRequest,
    db: AsyncSession = Depends(get_db)
):
    """Decline a user registration"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:update"):
            raise UnauthorizedError(message="Permission denied")
            
        user_result = await db.execute(select(User).where(User.id == request.user_id))
        user = user_result.scalar()
        if not user:
            raise NotFoundError(resource="User")
            
        user.is_active = False
        user.is_approved = False
        db.add(user)
        
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="decline_user",
            resource_type="user",
            resource_id=user.id,
            details=json.dumps({"reason": request.reason})
        )
        db.add(audit_log)
        await db.commit()
        
        return UserApprovalResponse(
            success=True,
            user_id=user.id,
            status="declined",
            message="User registration declined"
        )
    except Exception as e:
        logger.error(f"User decline failed: {e}")
        raise InternalServerError(operation="decline user", original_error=e)


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

@router.delete("/transactions/{transaction_id}")
async def admin_delete_transaction(
    transaction_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a transaction from the database."""
    try:
        admin = current_admin
        if not AdminPermissionManager.has_permission(admin.role, "transactions:delete"):
            raise UnauthorizedError(message="You don't have permission to delete transactions", error_code="PERMISSION_DENIED")
        
        result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
        tx = result.scalar_one_or_none()
        if not tx:
            raise NotFoundError(resource="Transaction", error_code="TX_NOT_FOUND")
        
        # Store transaction details for audit log before deletion
        tx_details = {
            "transaction_id": tx.id,
            "user_id": tx.user_id,
            "account_id": tx.account_id,
            "type": tx.type,
            "amount": float(tx.amount),
            "description": tx.description,
            "created_at": tx.created_at.isoformat() + 'Z' if tx.created_at else None
        }
        
        # Delete the transaction
        await db.delete(tx)
        
        # Create audit log
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="delete_transaction",
            resource_type="transaction",
            resource_id=transaction_id,
            details=json.dumps(tx_details)
        )
        db.add(audit_log)
        await db.commit()
        
        return {"success": True, "message": "Transaction deleted successfully"}
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Delete transaction failed", error=e)
        raise InternalServerError(operation="delete transaction", error_code="TX_DELETE_FAILED", original_error=e)

@router.post("/transactions/{transaction_id}/approve")
async def admin_approve_transaction(
    transaction_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending transaction and mark it as completed."""
    try:
        admin = current_admin
        if not AdminPermissionManager.has_permission(admin.role, "transactions:approve"):
            raise UnauthorizedError(message="You don't have permission to approve transactions", error_code="PERMISSION_DENIED")
        
        result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
        tx = result.scalar_one_or_none()
        if not tx:
            raise NotFoundError(resource="Transaction", error_code="TX_NOT_FOUND")
        
        if tx.status != TransactionStatus.PENDING:
            raise ValidationError(message="Only pending transactions can be approved", error_code="INVALID_STATUS")
        
        # Update transaction status to completed
        tx.status = TransactionStatus.COMPLETED
        tx.updated_at = datetime.utcnow()  # Use utcnow() instead of now(timezone.utc)
        db.add(tx)
        
        # If this transaction is linked to a transfer, also approve the transfer
        if tx.transfer_id:
            transfer_result = await db.execute(select(Transfer).where(Transfer.id == tx.transfer_id))
            transfer = transfer_result.scalar_one_or_none()
            if transfer and transfer.status == TransferStatus.PENDING:
                transfer.status = TransferStatus.COMPLETED
                transfer.processed_at = datetime.utcnow()  # Use utcnow() instead of now(timezone.utc)
                db.add(transfer)
        
        # Create audit log
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="approve_transaction",
            resource_type="transaction",
            resource_id=transaction_id,
            details=json.dumps({
                "transaction_id": tx.id,
                "user_id": tx.user_id,
                "account_id": tx.account_id,
                "amount": float(tx.amount),
                "previous_status": "pending",
                "new_status": "completed"
            })
        )
        db.add(audit_log)
        await db.commit()
        
        # Publish real-time notification to user
        try:
            AblyRealtimeManager.publish_notification(
                tx.user_id,
                "transaction_approved",
                "Transaction Approved",
                f"Your transaction of {tx.currency} {tx.amount} has been approved and completed."
            )
        except Exception:
            pass
        
        return {"success": True, "message": "Transaction approved successfully"}
    except (UnauthorizedError, NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error("Approve transaction failed", error=e)
        raise InternalServerError(operation="approve transaction", error_code="TX_APPROVE_FAILED", original_error=e)

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
            created_at=datetime.now(timezone.utc),
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
                    created_at=datetime.now(timezone.utc),
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
        
        card.status = VirtualCardStatus.ACTIVE
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
        
        # Notify user (Realtime)
        AblyRealtimeManager.publish_notification(
            card.user_id,
            "card_approved",
            "Virtual Card Approved",
            f"Your virtual card '{card.card_name}' has been approved and is ready to use."
        )

        # Create in-app notification record
        from models.notification import Notification, NotificationType
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=card.user_id,
            type=NotificationType.LOAN,
            title="Card Approved",
            message=f"Your virtual card '{card.card_name}' has been approved. You can now view its details in the card management section.",
            created_at=datetime.utcnow()
        )
        db.add(notif)
        
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "card_approved", "card_id": card.id})
        
        logger.info(f"Virtual card approved by {admin.email}: {card.id}")
        
        return {
            "success": True,
            "card_id": card.id,
            "status": VirtualCardStatus.ACTIVE,
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
        
        card.status = VirtualCardStatus.DECLINED
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
        
        # Notify user (Realtime)
        AblyRealtimeManager.publish_notification(
            card.user_id,
            "card_declined",
            "Virtual Card Request Declined",
            f"Your virtual card request for '{card.card_name}' has been declined. Reason: {request.reason}"
        )

        # Create in-app notification record
        from models.notification import Notification, NotificationType
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=card.user_id,
            type=NotificationType.LOAN,
            title="Card Request Cancelled",
            message=f"Your request for card '{card.card_name}' was declined. Reason: {request.reason}",
            created_at=datetime.utcnow()
        )
        db.add(notif)
        
        AblyRealtimeManager.publish_admin_event("accounts", {"type": "card_declined", "card_id": card.id})
        
        logger.info(f"Virtual card declined by {admin.email}: {card.id}")
        
        return {
            "success": True,
            "card_id": card.id,
            "status": VirtualCardStatus.DECLINED,
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
            if isinstance(new_dt, datetime) and new_dt.tzinfo is None:
                new_dt = new_dt.replace(tzinfo=timezone.utc)
            now_utc = datetime.now(timezone.utc)
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
        if request.is_restricted is not None:
            user.is_restricted = request.is_restricted
            mark_changed("is_restricted")
            # If manually disabling restriction, also clear the expiry date
            if not request.is_restricted:
                user.restricted_until = None
                mark_changed("restricted_until")
                
        # Use pydantic's fields set to detect explicit null vs missing field
        if "restricted_until" in request.__fields_set__:
            user.restricted_until = request.restricted_until
            mark_changed("restricted_until")
            if request.restricted_until is not None:
                # Setting an expiry date implies restrictions are active
                user.is_restricted = True
                mark_changed("is_restricted")
            else:
                # Explicitly clearing expiration implies restrictions are removed
                user.is_restricted = False
                mark_changed("is_restricted")
        
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
                "is_restricted": request.is_restricted,
                "restricted_until": request.restricted_until.isoformat() + 'Z' if request.restricted_until else None,
                "date_joined": request.date_joined.isoformat() + 'Z' if request.date_joined else None
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
            # Filter out restricted fields for email notifications as requested
            email_changed_fields = [f for f in (changed_fields or []) if f not in ('is_restricted', 'restricted_until')]
            
            if getattr(settings, "SMTP_SERVER", None) and email_changed_fields:
                full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username or "Customer"
                if old_email and old_email != user.email:
                    email_service.send_profile_update_notice(
                        old_email, full_name, email_changed_fields, old_email=old_email, new_email=user.email, acted_by=None
                    )
                    if user.email:
                        email_service.send_profile_update_notice(
                            user.email, full_name, email_changed_fields, old_email=old_email, new_email=user.email, acted_by=None
                        )
                elif user.email:
                    email_service.send_profile_update_notice(
                        user.email, full_name, email_changed_fields, acted_by=None
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
                "created_at": user.created_at.isoformat() + 'Z' if user.created_at else None,
                "is_active": user.is_active,
                "is_restricted": getattr(user, "is_restricted", False),
                "restricted_until": user.restricted_until.isoformat() + 'Z' if getattr(user, "restricted_until", None) else None,
            }
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Get user detail failed", error=e)
        raise InternalServerError(operation="get user detail", error_code="GET_USER_DETAIL_FAILED", original_error=e)

@router.get("/users/{user_id}/accounts")
async def admin_get_user_accounts(
    user_id: str,
    admin_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get all accounts for a specific user"""
    try:
        # Verify admin
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:read"):
            raise UnauthorizedError(message="You don't have permission to view user accounts", error_code="PERMISSION_DENIED")
        
        # Verify user exists
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundError(resource="User", error_code="USER_NOT_FOUND")
        
        # Fetch user's accounts
        accounts_result = await db.execute(
            select(Account).where(Account.user_id == user_id)
        )
        accounts = accounts_result.scalars().all()
        
        # Format response
        accounts_data = []
        for account in accounts:
            accounts_data.append({
                "id": account.id,
                "account_number": account.account_number,
                "account_type": account.account_type.value if hasattr(account.account_type, "value") else str(account.account_type),
                "currency": account.currency,
                "balance": float(account.balance),
                "status": account.status.value if hasattr(account.status, "value") else str(account.status),
                "is_primary": account.is_primary,
                "created_at": account.created_at.isoformat() + 'Z' if account.created_at else None,
            })
        
        return {
            "success": True,
            "data": accounts_data
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Get user accounts failed", error=e)
        raise InternalServerError(operation="get user accounts", error_code="GET_USER_ACCOUNTS_FAILED", original_error=e)

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
    """Admin delete user account and all associated data"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:delete"):
            raise UnauthorizedError(message="You don't have permission to delete users", error_code="PERMISSION_DENIED")
        
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundError(resource="User", error_code="USER_NOT_FOUND")
        
        logger.info(f"Admin {admin.email} starting complete deletion of user {user_id}")
        
        # Delete from Stytch if applicable
        if settings.AUTH_PROVIDER == "stytch":
            try:
                from utils.stytch_client import delete_stytch_user
                # In our system, User.id IS the Stytch User ID if provider is stytch
                delete_stytch_user(user.id)
                logger.info(f"User {user.id} deleted from Stytch by admin {admin.email}")
            except Exception as stytch_err:
                logger.error(f"Failed to delete user {user.id} from Stytch: {stytch_err}")

        # Delete all user-related data in order of dependencies
        deletion_steps = []
        
        # 1. Delete user restrictions
        restrictions_result = await db.execute(select(UserRestriction).where(UserRestriction.user_id == user_id))
        restrictions = restrictions_result.scalars().all()
        for restriction in restrictions:
            await db.delete(restriction)
            deletion_steps.append(f"restriction_{restriction.id}")
        
        # 2. Delete user notifications
        notifications_result = await db.execute(select(Notification).where(Notification.user_id == user_id))
        notifications = notifications_result.scalars().all()
        for notification in notifications:
            await db.delete(notification)
            deletion_steps.append(f"notification_{notification.id}")
        
        # 3. Delete user support tickets and messages
        tickets_result = await db.execute(select(SupportTicket).where(SupportTicket.user_id == user_id))
        tickets = tickets_result.scalars().all()
        for ticket in tickets:
            # Delete ticket messages first
            messages_result = await db.execute(select(TicketMessage).where(TicketMessage.ticket_id == ticket.id))
            messages = messages_result.scalars().all()
            for message in messages:
                await db.delete(message)
                deletion_steps.append(f"message_{message.id}")
            # Delete the ticket
            await db.delete(ticket)
            deletion_steps.append(f"ticket_{ticket.id}")
        
        # 4. Delete user documents
        documents_result = await db.execute(select(Document).where(Document.user_id == user_id))
        documents = documents_result.scalars().all()
        for document in documents:
            await db.delete(document)
            deletion_steps.append(f"document_{document.id}")
        
        # 5. Handle loan applications and loans carefully to avoid foreign key constraints
        # First, set application_id to NULL for all user loans
        loans_result = await db.execute(select(Loan).where(Loan.user_id == user_id))
        loans = loans_result.scalars().all()
        for loan in loans:
            # Clear the foreign key reference first
            loan.application_id = None
            await db.flush()  # Flush to ensure the change is applied
        
        # Now delete loan applications
        applications_result = await db.execute(select(LoanApplication).where(LoanApplication.user_id == user_id))
        applications = applications_result.scalars().all()
        for application in applications:
            await db.delete(application)
            deletion_steps.append(f"loan_application_{application.id}")
        
        # Now delete loans and their related data
        for loan in loans:
            # Delete loan payments
            payments_result = await db.execute(select(LoanPayment).where(LoanPayment.loan_id == loan.id))
            payments = payments_result.scalars().all()
            for payment in payments:
                await db.delete(payment)
                deletion_steps.append(f"loan_payment_{payment.id}")
            # Delete loan schedule
            schedule_result = await db.execute(select(LoanSchedule).where(LoanSchedule.loan_id == loan.id))
            schedule = schedule_result.scalars().all()
            for schedule_item in schedule:
                await db.delete(schedule_item)
                deletion_steps.append(f"loan_schedule_{schedule_item.id}")
            # Delete the loan
            await db.delete(loan)
            deletion_steps.append(f"loan_{loan.id}")
        
        # 6. Delete user virtual cards
        cards_result = await db.execute(select(VirtualCard).where(VirtualCard.user_id == user_id))
        cards = cards_result.scalars().all()
        for card in cards:
            await db.delete(card)
            deletion_steps.append(f"virtual_card_{card.id}")
        
        # 7. Delete user bill payments and payees
        bill_payments_result = await db.execute(select(BillPayment).where(BillPayment.user_id == user_id))
        bill_payments = bill_payments_result.scalars().all()
        for payment in bill_payments:
            await db.delete(payment)
            deletion_steps.append(f"bill_payment_{payment.id}")
        
        payees_result = await db.execute(select(BillPayee).where(BillPayee.user_id == user_id))
        payees = payees_result.scalars().all()
        for payee in payees:
            await db.delete(payee)
            deletion_steps.append(f"bill_payee_{payee.id}")
        
        # 8. Delete user scheduled payments
        scheduled_payments_result = await db.execute(select(ScheduledPayment).where(ScheduledPayment.user_id == user_id))
        scheduled_payments = scheduled_payments_result.scalars().all()
        for scheduled_payment in scheduled_payments:
            await db.delete(scheduled_payment)
            deletion_steps.append(f"scheduled_payment_{scheduled_payment.id}")
        
        # 9. Delete user deposits
        deposits_result = await db.execute(select(Deposit).where(Deposit.user_id == user_id))
        deposits = deposits_result.scalars().all()
        for deposit in deposits:
            await db.delete(deposit)
            deletion_steps.append(f"deposit_{deposit.id}")
        
        # 10. Delete user beneficiaries
        beneficiaries_result = await db.execute(select(Beneficiary).where(Beneficiary.user_id == user_id))
        beneficiaries = beneficiaries_result.scalars().all()
        for beneficiary in beneficiaries:
            await db.delete(beneficiary)
            deletion_steps.append(f"beneficiary_{beneficiary.id}")
        
        # 11. Delete user transfers
        transfers_result = await db.execute(select(Transfer).where(Transfer.from_user_id == user_id))
        transfers = transfers_result.scalars().all()
        for transfer in transfers:
            await db.delete(transfer)
            deletion_steps.append(f"transfer_{transfer.id}")
        
        # 12. Delete user transactions
        transactions_result = await db.execute(select(Transaction).where(Transaction.user_id == user_id))
        transactions = transactions_result.scalars().all()
        for transaction in transactions:
            await db.delete(transaction)
            deletion_steps.append(f"transaction_{transaction.id}")
        
        # 13. Delete user accounts (this should be last due to foreign key constraints)
        accounts_result = await db.execute(select(Account).where(Account.user_id == user_id))
        accounts = accounts_result.scalars().all()
        for account in accounts:
            await db.delete(account)
            deletion_steps.append(f"account_{account.id}")
        
        # 14. Delete user login history
        login_history_result = await db.execute(select(LoginHistory).where(LoginHistory.user_id == user_id))
        login_history = login_history_result.scalars().all()
        for history in login_history:
            await db.delete(history)
            deletion_steps.append(f"login_history_{history.id}")
        
        # 15. Finally delete the user
        await db.delete(user)
        deletion_steps.append(f"user_{user_id}")
        
        # Create audit log
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="delete_user_complete",
            resource_type="user",
            resource_id=user_id,
            details=json.dumps({
                "user_id": user_id,
                "user_email": user.email,
                "deleted_items": deletion_steps,
                "total_items_deleted": len(deletion_steps)
            })
        )
        db.add(audit_log)
        
        await db.commit()
        
        AblyRealtimeManager.publish_admin_event("users", {"type": "deleted", "user_id": user_id})
        logger.info(f"Complete user deletion by admin {admin.email}: {user_id} - {len(deletion_steps)} items deleted")
        
        return {
            "success": True, 
            "message": f"User and all associated data deleted successfully",
            "details": {
                "user_id": user_id,
                "total_items_deleted": len(deletion_steps),
                "deleted_categories": {
                    "restrictions": len([s for s in deletion_steps if s.startswith("restriction_")]),
                    "notifications": len([s for s in deletion_steps if s.startswith("notification_")]),
                    "support_tickets": len([s for s in deletion_steps if s.startswith("ticket_")]),
                    "documents": len([s for s in deletion_steps if s.startswith("document_")]),
                    "loans": len([s for s in deletion_steps if s.startswith("loan_")]),
                    "virtual_cards": len([s for s in deletion_steps if s.startswith("virtual_card_")]),
                    "bill_payments": len([s for s in deletion_steps if s.startswith("bill_payment_")]),
                    "transfers": len([s for s in deletion_steps if s.startswith("transfer_")]),
                    "beneficiaries": len([s for s in deletion_steps if s.startswith("beneficiary_")]),
                    "transactions": len([s for s in deletion_steps if s.startswith("transaction_")]),
                    "accounts": len([s for s in deletion_steps if s.startswith("account_")])
                }
            }
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Complete user deletion failed", error=e)
        raise InternalServerError(operation="complete user deletion", error_code="DELETION_FAILED", original_error=e)
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
        return [AdminAuditLogResponse.model_validate(log) for log in logs]
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
                    "created_at": a.LoanApplication.created_at.isoformat() + 'Z',
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
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
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



# ==================== TRANSACTION GENERATION ENDPOINTS ====================

@router.post("/users/{user_id}/transactions/preview", response_model=GenerateTransactionsPreviewResponse)
async def preview_generated_transactions(
    user_id: str,
    request: GenerateTransactionsPreviewRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Preview generated transactions before creating them
    
    This endpoint allows admins to see a sample of what transactions will be generated
    before actually creating them in the database.
    """
    try:
        from services.transaction_generator import TransactionGenerator
        from decimal import Decimal
        
        # Verify user exists
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundError(resource="User", identifier=user_id)
        
        # Create generator instance
        generator = TransactionGenerator()
        
        # Generate preview
        preview_data = generator.generate_preview(
            start_date=request.start_date,
            end_date=request.end_date,
            starting_balance=Decimal(str(request.starting_balance)),
            closing_balance=Decimal(str(request.closing_balance)),
            transaction_count=request.transaction_count,
            preview_count=request.preview_count
        )
        
        return preview_data
        
    except ValueError as e:
        raise ValidationError(field="generation_params", message=str(e))
    except Exception as e:
        logger.error(f"Error previewing transactions: {str(e)}")
        raise InternalServerError(operation="preview transactions", error_code="PREVIEW_FAILED", original_error=e)


@router.post("/users/{user_id}/transactions/generate", response_model=GenerateTransactionsResponse)
async def generate_transactions_for_user(
    user_id: str,
    request: GenerateTransactionsRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate realistic transaction history for a user
    
    This endpoint creates actual transaction records in database with:
    - Real merchant and person names (no AI-generated names)
    - High transaction amounts ($100 - $50,000)
    - Realistic distribution of debits and credits
    - Chronologically distributed timestamps
    
    The generated transactions will:
    - Appear in the user's transaction history
    - Be included in statement downloads
    - Update the account balance to match closing_balance
    """
    try:
        from services.transaction_generator import TransactionGenerator
        from decimal import Decimal
        from models.account import AccountType as AT
        import random
        
        # Verify user exists
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundError(resource="User", identifier=user_id)
        
        # Verify account exists and belongs to user
        account_result = await db.execute(
            select(Account).where(
                and_(
                    Account.id == request.account_id,
                    Account.user_id == user_id
                )
            )
        )
        account = account_result.scalar_one_or_none()
        if not account:
            raise NotFoundError(resource="Account", identifier=request.account_id)
        
        # Create generator instance
        generator = TransactionGenerator(user_name=f"{user.first_name} {user.last_name}")
        
        # Generate transactions
        transactions_data = generator.generate_transactions(
            start_date=request.start_date,
            end_date=request.end_date,
            starting_balance=Decimal(str(request.starting_balance)),
            closing_balance=Decimal(str(request.closing_balance)),
            transaction_count=request.transaction_count,
            account_id=request.account_id,
            currency=request.currency,
            user_name=f"{user.first_name} {user.last_name}"
        )
        
        # Insert transactions into database without creating synthetic transfer records
        # Generated transactions should stand alone with descriptive text
        created_count = 0
        for txn_data in transactions_data:
            # Parse datetime and remove timezone info for database
            created_at = datetime.fromisoformat(txn_data["created_at"]).replace(tzinfo=None)
            posted_date = datetime.fromisoformat(txn_data["posted_date"]).replace(tzinfo=None)
            
            transaction = Transaction(
                id=str(uuid.uuid4()),
                account_id=txn_data["account_id"],
                user_id=user_id,  # Add user_id to satisfy NOT NULL constraint
                type=TransactionType(txn_data["type"]),
                amount=txn_data["amount"],
                currency=txn_data["currency"],
                description=txn_data["description"],
                status=TransactionStatus(txn_data["status"]),
                balance_before=txn_data["balance_before"],
                balance_after=txn_data["balance_after"],
                reference_number=txn_data["reference_number"],
                transfer_id=None,  # No transfer link for generated transactions
                created_at=created_at,
                posted_date=posted_date
            )
            db.add(transaction)
            created_count += 1
        
        # Create audit log
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="generate_transactions",
            resource_type="transaction",
            resource_id=request.account_id,
            details=json.dumps({
                "user_id": user_id,
                "account_id": request.account_id,
                "transaction_count": created_count,
                "start_date": request.start_date.isoformat(),
                "end_date": request.end_date.isoformat(),
                "starting_balance": request.starting_balance,
                "closing_balance": request.closing_balance
            }),
            created_at=datetime.now(timezone.utc)
        )
        db.add(audit_log)
        
        # Commit all changes
        await db.commit()
        await db.refresh(account)
        
        # Get all user accounts to update balances appropriately
        all_accounts_result = await db.execute(
            select(Account).where(Account.user_id == user_id)
        )
        all_accounts = all_accounts_result.scalars().all()
        
        # Separate account types
        checking_accounts = [acc for acc in all_accounts if acc.account_type == AT.CHECKING]
        savings_accounts = [acc for acc in all_accounts if acc.account_type == AT.SAVINGS]
        crypto_accounts = [acc for acc in all_accounts if acc.account_type == AT.CRYPTO]
        
        # Update only checking and savings accounts with the closing balance
        # Ensure savings balance is always larger than checking balance
        total_closing_balance = Decimal(str(request.closing_balance))
        
        if checking_accounts and savings_accounts:
            # Split balance: 60% to savings, 40% to checking
            checking_balance = total_closing_balance * Decimal('0.4')
            savings_balance = total_closing_balance * Decimal('0.6')
            
            # Update checking accounts
            for checking_acc in checking_accounts:
                checking_acc.balance = checking_balance
                checking_acc.available_balance = checking_balance
                checking_acc.updated_at = datetime.utcnow()
                db.add(checking_acc)
            
            # Update savings accounts
            for savings_acc in savings_accounts:
                savings_acc.balance = savings_balance
                savings_acc.available_balance = savings_balance
                savings_acc.updated_at = datetime.utcnow()
                db.add(savings_acc)
                
        elif checking_accounts:
            # Only checking accounts - give them full balance
            for checking_acc in checking_accounts:
                checking_acc.balance = total_closing_balance
                checking_acc.available_balance = total_closing_balance
                checking_acc.updated_at = datetime.utcnow()
                db.add(checking_acc)
                
        elif savings_accounts:
            # Only savings accounts - give them full balance
            for savings_acc in savings_accounts:
                savings_acc.balance = total_closing_balance
                savings_acc.available_balance = total_closing_balance
                savings_acc.updated_at = datetime.utcnow()
                db.add(savings_acc)
        
        # Crypto accounts remain unchanged (keep existing balance)
        
        # Commit balance updates
        await db.commit()
        
        logger.info(f"Admin {admin.id} generated {created_count} transactions for user {user_id}, account {request.account_id}")
        
        return {
            "success": True,
            "message": f"Successfully generated {created_count} transactions",
            "transactions_created": created_count,
            "account_id": request.account_id,
            "new_balance": float(total_closing_balance)
        }
        
    except ValueError as e:
        raise ValidationError(field="generation_params", message=str(e))
    except Exception as e:
        logger.error(f"Error generating transactions: {str(e)}")
        await db.rollback()
        raise InternalServerError(operation="generate transactions", error_code="GENERATION_FAILED", original_error=e)


# ═══════════════════════════════════════════════════════════════════════
# Loan Management — Admin endpoints
# ═══════════════════════════════════════════════════════════════════════

@router.get("/users/search")
async def admin_search_users(
    admin_id: str,
    q: str = Query("", max_length=120),
    db: AsyncSession = Depends(get_db),
):
    """Return all users (optionally filtered by search query) for the admin
    loan-creation modal's searchable dropdown."""
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    result = await db.execute(select(User))
    users = result.scalars().all()

    q_lower = q.strip().lower()
    if q_lower:
        users = [
            u for u in users
            if q_lower in (u.email or "").lower()
            or q_lower in f"{u.first_name} {u.last_name}".lower()
            or q_lower in (u.username or "").lower()
        ]

    return {
        "success": True,
        "data": [
            {
                "id": u.id,
                "name": f"{u.first_name} {u.last_name}",
                "email": u.email,
            }
            for u in users
        ],
    }


@router.get("/loans/applications")
async def admin_get_loan_applications(
    admin_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return all loan applications across all users for the admin dashboard."""
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    apps_result = await db.execute(
        select(LoanApplication).order_by(LoanApplication.created_at.desc())
    )
    applications = apps_result.scalars().all()

    # Batch–load users and products for display
    user_ids = {a.user_id for a in applications}
    product_ids = {a.product_id for a in applications}

    users_map: dict[str, User] = {}
    products_map: dict[str, LoanProduct] = {}

    if user_ids:
        u_res = await db.execute(select(User).where(User.id.in_(list(user_ids))))
        for u in u_res.scalars().all():
            users_map[u.id] = u
    if product_ids:
        p_res = await db.execute(select(LoanProduct).where(LoanProduct.id.in_(list(product_ids))))
        for p in p_res.scalars().all():
            products_map[p.id] = p

    data = []
    for a in applications:
        user = users_map.get(a.user_id)
        product = products_map.get(a.product_id)
        data.append({
            "id": a.id,
            "user_id": a.user_id,
            "user_email": user.email if user else "Unknown",
            "product_name": product.name if product else "N/A",
            "product_id": a.product_id,
            "status": a.status.value if hasattr(a.status, "value") else a.status,
            "amount": a.requested_amount,
            "details": f"{a.requested_amount} - {a.requested_term_months}mo",
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return {"success": True, "data": data}


@router.post("/loans/products")
async def admin_create_loan_product(
    request: AdminCreateLoanProductRequest,
    admin_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new loan product."""
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    product_id = request.id or str(uuid.uuid4())
    product = LoanProduct(
        id=product_id,
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
        features=json.dumps(request.features) if request.features else None,
        employment_required=request.employment_required,
        available_to_standard=request.available_to_standard,
        available_to_priority=request.available_to_priority,
        available_to_premium=request.available_to_premium,
    )
    db.add(product)

    audit_log = AdminAuditLog(
        id=str(uuid.uuid4()),
        admin_id=admin.id,
        admin_email=admin.email,
        action="create_loan_product",
        resource_type="loan_product",
        resource_id=product_id,
        details=json.dumps({"name": request.name, "type": request.type}),
    )
    db.add(audit_log)
    await db.commit()

    return {"success": True, "data": {"id": product_id}, "message": "Loan product created"}


@router.post("/loans/create")
async def admin_create_loan(
    request: AdminCreateLoanRequest,
    admin_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Admin creates a loan directly for a user.
    - NO disbursement into the user's account.
    - The loan appears in the user's My Loans tab as a normal active loan.
    - Daily interest (if set) will accrue automatically.
    """
    # Verify admin
    admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = admin_result.scalar()
    if not admin:
        raise UnauthorizedError(message="Admin not found", error_code="ADMIN_NOT_FOUND")

    # Verify user
    user_result = await db.execute(select(User).where(User.id == request.user_id))
    user = user_result.scalar()
    if not user:
        raise NotFoundError(resource="User", error_code="USER_NOT_FOUND")

    # Get user's first active account (needed as FK on Loan)
    acc_result = await db.execute(
        select(Account).where(Account.user_id == request.user_id, Account.status == "active")
    )
    account = acc_result.scalars().first()
    if not account:
        raise ValidationError(message="User has no active account", error_code="NO_ACTIVE_ACCOUNT")

    # Calculate monthly payment (standard amortisation formula)
    monthly_rate = request.interest_rate / 100 / 12
    if monthly_rate > 0:
        monthly_payment = (
            request.amount * monthly_rate / (1 - (1 + monthly_rate) ** (-request.term_months))
        )
    else:
        monthly_payment = request.amount / request.term_months

    loan_id = str(uuid.uuid4())
    now = datetime.utcnow()
    maturity = now + timedelta(days=30 * request.term_months)

    # Map string type to enum
    try:
        loan_type_enum = LoanType(request.loan_type.lower())
    except ValueError:
        loan_type_enum = LoanType.PERSONAL

    # Find a suitable product template for this loan (previously hardcoded to admin_created)
    prod_res = await db.execute(
        select(LoanProduct).where(LoanProduct.type == loan_type_enum.value.upper())
    )
    template_product = prod_res.scalars().first()
    if not template_product:
        # Fallback to any product if type match fails
        prod_res = await db.execute(select(LoanProduct))
        template_product = prod_res.scalars().first()
    
    if not template_product:
        raise ValidationError(message="No loan products available to use as a template", error_code="NO_PRODUCTS")

    app_id = str(uuid.uuid4())
    app = LoanApplication(
        id=app_id,
        user_id=request.user_id,
        product_id=template_product.id,
        account_id=account.id,
        status=LoanApplicationStatus.APPROVED,
        requested_amount=request.amount,
        requested_term_months=request.term_months,
        approved_amount=request.amount,
        approved_interest_rate=request.interest_rate,
        approved_term_months=request.term_months,
        monthly_payment=round(monthly_payment, 2),
        purpose="Facility",
        submitted_at=now,
        approved_at=now,
        created_at=now,
    )
    db.add(app)
    await db.flush()  # Ensure the application exists before the loan references it

    new_loan = Loan(
        id=loan_id,
        user_id=request.user_id,
        account_id=account.id,
        application_id=app_id,  # Link to the application we just created
        type=loan_type_enum,
        status=LoanStatus.ACTIVE,
        principal_amount=request.amount,
        interest_rate=request.interest_rate,
        term_months=request.term_months,
        monthly_payment=round(monthly_payment, 2),
        next_payment_date=now + timedelta(days=30),
        remaining_balance=request.amount,
        daily_interest_rate=request.daily_interest_rate,
        created_by_admin=True,
        originated_at=now,
        maturity_date=maturity,
    )
    db.add(new_loan)

    # Audit log
    audit = AdminAuditLog(
        id=str(uuid.uuid4()),
        admin_id=admin.id,
        admin_email=admin.email,
        action="create_loan_for_user",
        resource_type="loan",
        resource_id=loan_id,
        details=json.dumps({
            "user_id": request.user_id,
            "amount": request.amount,
            "interest_rate": request.interest_rate,
            "daily_interest_rate": request.daily_interest_rate,
        }),
    )
    db.add(audit)
    await db.commit()

    logger.info(f"Admin {admin.id} created loan {loan_id} for user {request.user_id}, amount={request.amount}")

    return {
        "success": True,
        "data": {"loan_id": loan_id},
        "message": "Loan created successfully",
    }


# User Restrictions Management
# ═════════════════════════════════════════════════════════════════════

@router.post("/users/restrict", response_model=UserRestrictionResponse)
async def create_user_restriction(
    admin_id: str,
    request: CreateRestrictionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a user restriction"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:update"):
            raise UnauthorizedError(
                message="You don't have permission to restrict users",
                error_code="PERMISSION_DENIED"
            )
        
        user_result = await db.execute(select(User).where(User.id == request.user_id))
        user = user_result.scalar()
        
        if not user:
            raise NotFoundError(
                resource="User",
                error_code="USER_NOT_FOUND"
            )
        
        # Check if restriction already exists
        existing = await db.execute(
            select(UserRestriction).where(
                and_(
                    UserRestriction.user_id == request.user_id,
                    UserRestriction.restriction_type == request.restriction_type,
                    UserRestriction.is_active == True
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError(
                message=f"User already has {request.restriction_type.value} restriction",
                error_code="RESTRICTION_EXISTS"
            )
        
        # Create restriction
        restriction = UserRestriction(
            id=str(uuid.uuid4()),
            user_id=request.user_id,
            restriction_type=request.restriction_type,
            message=request.message,
            created_by=admin_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(restriction)
        
        # Audit log
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="create_restriction",
            resource_type="user_restriction",
            resource_id=restriction.id,
            details=json.dumps({
                "user_id": request.user_id,
                "restriction_type": request.restriction_type.value,
                "message": request.message
            })
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user via realtime
        restriction_type_display = "Post No Debit" if request.restriction_type == RestrictionType.POST_NO_DEBIT else "Online Banking"
        AblyRealtimeManager.publish_notification(
            request.user_id,
            "restriction_added",
            f"Account Restricted: {restriction_type_display}",
            f"Your account has been restricted. {request.message}"
        )
        
        logger.info(f"Admin {admin.id} created {request.restriction_type.value} restriction for user {request.user_id}")
        
        return {
            "success": True,
            "restriction_id": restriction.id,
            "restriction_type": request.restriction_type,
            "message": f"{restriction_type_display} restriction created successfully"
        }
        
    except (UnauthorizedError, NotFoundError, ConflictError):
        raise
    except Exception as e:
        logger.error("Create user restriction failed", error=e)
        raise InternalServerError(
            operation="create_user_restriction",
            error_code="CREATE_RESTRICTION_FAILED",
            original_error=e
        )


@router.delete("/users/restrict", response_model=UserRestrictionResponse)
async def remove_user_restriction(
    admin_id: str,
    request: RemoveRestrictionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Remove a user restriction"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:update"):
            raise UnauthorizedError(
                message="You don't have permission to remove restrictions",
                error_code="PERMISSION_DENIED"
            )
        
        # Find and deactivate restriction
        restriction_result = await db.execute(
            select(UserRestriction).where(
                and_(
                    UserRestriction.user_id == request.user_id,
                    UserRestriction.restriction_type == request.restriction_type,
                    UserRestriction.is_active == True
                )
            )
        )
        restriction = restriction_result.scalar_one_or_none()
        
        if not restriction:
            raise NotFoundError(
                resource="User Restriction",
                error_code="RESTRICTION_NOT_FOUND"
            )
        
        # Deactivate restriction
        restriction.is_active = False
        db.add(restriction)
        
        # Audit log
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="remove_restriction",
            resource_type="user_restriction",
            resource_id=restriction.id,
            details=json.dumps({
                "user_id": request.user_id,
                "restriction_type": request.restriction_type.value
            })
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user via realtime
        restriction_type_display = "Post No Debit" if request.restriction_type == RestrictionType.POST_NO_DEBIT else "Online Banking"
        AblyRealtimeManager.publish_notification(
            request.user_id,
            "restriction_removed",
            f"Restriction Removed: {restriction_type_display}",
            f"Your {restriction_type_display} restriction has been removed."
        )
        
        logger.info(f"Admin {admin.id} removed {request.restriction_type.value} restriction from user {request.user_id}")
        
        return {
            "success": True,
            "restriction_id": restriction.id,
            "restriction_type": request.restriction_type,
            "message": f"{restriction_type_display} restriction removed successfully"
        }
        
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Remove user restriction failed", error=e)
        raise InternalServerError(
            operation="remove_user_restriction",
            error_code="REMOVE_RESTRICTION_FAILED",
            original_error=e
        )


@router.get("/users/{user_id}/restrictions", response_model=UserRestrictionsResponse)
async def get_user_restrictions(
    user_id: str,
    admin_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get all restrictions for a user"""
    try:
        admin_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = admin_result.scalar()
        
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:read"):
            raise UnauthorizedError(
                message="You don't have permission to view user restrictions",
                error_code="PERMISSION_DENIED"
            )
        
        restrictions_result = await db.execute(
            select(UserRestriction)
            .where(UserRestriction.user_id == user_id)
            .order_by(UserRestriction.created_at.desc())
        )
        restrictions = restrictions_result.scalars().all()
        
        restriction_details = []
        for r in restrictions:
            restriction_details.append({
                "id": r.id,
                "restriction_type": r.restriction_type,
                "is_active": r.is_active,
                "message": r.message,
                "created_at": r.created_at.isoformat(),
                "created_by": r.created_by
            })
        
        return {
            "success": True,
            "restrictions": restriction_details
        }
        
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("Get user restrictions failed", error=e)
        raise InternalServerError(
            operation="get_user_restrictions",
            error_code="GET_RESTRICTIONS_FAILED",
            original_error=e
        )

