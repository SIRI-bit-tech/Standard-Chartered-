from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.support import SupportTicket, TicketMessage, Chat, ChatMessage
from database import get_db
import uuid
from datetime import datetime
from utils.auth import get_current_user_id
from pydantic import BaseModel, Field
from utils.ably import AblyRealtimeManager
from models.user import User
from models.admin import AdminUser
from models.notification import Notification, NotificationType
from config import settings

router = APIRouter()

class CreateTicketRequest(BaseModel):
    subject: str = Field(..., min_length=3, max_length=160)
    description: str = Field(..., min_length=3, max_length=4000)
    category: str | None = None
    priority: str = Field(default="medium")

# Chat endpoints
@router.post("/chat/start")
async def start_chat(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Start chat with relationship manager"""
    new_chat = Chat(
        id=str(uuid.uuid4()),
        user_id=current_user_id,
        status="active",
        created_at=datetime.utcnow()
    )
    
    db.add(new_chat)
    await db.commit()
    
    return {
        "success": True,
        "data": {"chat_id": new_chat.id},
        "message": "Chat session started"
    }


@router.post("/chat/{chat_id}/message")
async def send_chat_message(
    chat_id: str,
    message: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Send message in chat"""
    chat_result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat_result.scalar()
    if not chat or chat.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Chat not found")

    new_message = ChatMessage(
        id=str(uuid.uuid4()),
        chat_id=chat_id,
        user_id=current_user_id,
        sender_id=current_user_id,
        message=message,
        is_from_agent=False,
        created_at=datetime.utcnow()
    )
    
    db.add(new_message)
    await db.commit()
    
    return {
        "success": True,
        "data": {"message_id": new_message.id},
        "message": "Message sent successfully"
    }


@router.get("/chat/{chat_id}/messages")
async def get_chat_messages(
    chat_id: str,
    limit: int = Query(50),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get chat messages"""
    chat_result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat_result.scalar()
    if not chat or chat.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Chat not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "message": m.message,
                "is_from_agent": m.is_from_agent,
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ],
        "message": "Chat messages retrieved"
    }


@router.get("/chats")
async def get_chats(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get all chat sessions"""
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == current_user_id)
        .order_by(Chat.created_at.desc())
    )
    chats = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": c.id,
                "status": c.status,
                "created_at": c.created_at.isoformat()
            }
            for c in chats
        ],
        "message": "Chat sessions retrieved"
    }


# Support ticket endpoints
@router.post("/tickets")
async def create_support_ticket(
    request: CreateTicketRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create support ticket (JSON body)"""
    new_ticket = SupportTicket(
        id=str(uuid.uuid4()),
        user_id=current_user_id,
        ticket_number=f"TKT{str(uuid.uuid4())[:8].upper()}",
        subject=request.subject,
        description=request.description,
        category=request.category,
        priority=request.priority,
        status="open",
        created_at=datetime.utcnow()
    )
    db.add(new_ticket)
    await db.commit()
    try:
        AblyRealtimeManager.publish_admin_event("support", {"type": "ticket_created", "ticket_id": new_ticket.id, "ticket_number": new_ticket.ticket_number})
    except Exception:
        pass
    return {
        "success": True,
        "data": {"id": new_ticket.id, "ticket_number": new_ticket.ticket_number},
        "message": "Support ticket created successfully"
    }

# Backward-compatible form variant (deprecated)
@router.post("/ticket")
async def create_support_ticket_legacy(
    subject: str,
    description: str,
    category: str | None = None,
    priority: str = "medium",
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    req = CreateTicketRequest(subject=subject, description=description, category=category, priority=priority)
    return await create_support_ticket(req, current_user_id, db)


@router.get("/tickets")
async def get_support_tickets(
    limit: int = Query(20),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get user support tickets"""
    result = await db.execute(
        select(SupportTicket)
        .where(SupportTicket.user_id == current_user_id)
        .order_by(SupportTicket.created_at.desc())
        .limit(limit)
    )
    tickets = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": t.id,
                "ticket_number": t.ticket_number,
                "subject": t.subject,
                "status": t.status,
                "priority": t.priority,
                "created_at": t.created_at.isoformat()
            }
            for t in tickets
        ],
        "message": "Support tickets retrieved"
    }


@router.get("/tickets/{ticket_id}")
async def get_support_ticket_detail(
    ticket_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get a single support ticket detail for the current user"""
    res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    t = res.scalar_one_or_none()
    if not t or t.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {
        "success": True,
        "data": {
            "id": t.id,
            "ticket_number": t.ticket_number,
            "subject": t.subject,
            "description": t.description,
            "category": t.category,
            "status": t.status,
            "priority": t.priority,
            "created_at": t.created_at.isoformat()
        }
    }


class TicketReplyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


@router.get("/tickets/{ticket_id}/replies")
async def get_ticket_replies(
    ticket_id: str,
    limit: int = Query(100),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get conversation for a ticket"""
    res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    t = res.scalar_one_or_none()
    if not t or t.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msgs_res = await db.execute(
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at.asc())
        .limit(limit)
    )
    msgs = msgs_res.scalars().all()
    # Resolve author names for user and any staff members
    authors: dict[str, str] = {}
    # User author
    u_res = await db.execute(select(User).where(User.id == t.user_id))
    u = u_res.scalar_one_or_none()
    if u:
        authors[u.id] = (f"{u.first_name} {u.last_name}".strip() or u.email)
    # Possible admin authors
    admin_ids = list({m.sender_id for m in msgs if m.is_from_staff})
    if admin_ids:
        a_res = await db.execute(select(AdminUser).where(AdminUser.id.in_(admin_ids)))
        for a in a_res.scalars().all():
            authors[a.id] = (f"{a.first_name} {a.last_name}".strip() or a.email)
    return {
        "success": True,
        "data": [
            {
                "id": m.id,
                "author_id": m.sender_id,
                "author_name": authors.get(m.sender_id),
                "message": m.message,
                "is_from_staff": m.is_from_staff,
                "created_at": m.created_at.isoformat()
            } for m in msgs
        ]
    }


@router.post("/tickets/{ticket_id}/replies")
async def post_ticket_reply(
    ticket_id: str,
    request: TicketReplyRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Post a reply from the user to a ticket"""
    res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    t = res.scalar_one_or_none()
    if not t or t.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msg = TicketMessage(
        id=str(uuid.uuid4()),
        ticket_id=t.id,
        sender_id=current_user_id,
        is_from_staff=False,
        message=request.message,
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    # notify admins via realtime and notification table (optional)
    snippet = (request.message or "").strip()
    if len(snippet) > 160:
        snippet = snippet[:157] + "…"
    try:
        AblyRealtimeManager.publish_admin_event("support", {"type": "ticket_user_replied", "ticket_id": t.id, "reply_id": msg.id})
    except Exception:
        pass
    await db.commit()
    return {"success": True, "data": {"id": msg.id}}
