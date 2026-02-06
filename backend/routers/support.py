from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.support import SupportTicket, TicketMessage, Chat, ChatMessage
from database import get_db
import uuid
from datetime import datetime

router = APIRouter()


# Chat endpoints
@router.post("/chat/start")
async def start_chat(user_id: str, db: AsyncSession = Depends(get_db)):
    """Start chat with relationship manager"""
    new_chat = Chat(
        id=str(uuid.uuid4()),
        user_id=user_id,
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
    user_id: str,
    message: str,
    db: AsyncSession = Depends(get_db)
):
    """Send message in chat"""
    new_message = ChatMessage(
        id=str(uuid.uuid4()),
        chat_id=chat_id,
        user_id=user_id,
        sender_id=user_id,
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
    db: AsyncSession = Depends(get_db)
):
    """Get chat messages"""
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
async def get_chats(user_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Get all chat sessions"""
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == user_id)
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
@router.post("/ticket")
async def create_support_ticket(
    user_id: str,
    subject: str,
    description: str,
    category: str = None,
    priority: str = "medium",
    db: AsyncSession = Depends(get_db)
):
    """Create support ticket"""
    new_ticket = SupportTicket(
        id=str(uuid.uuid4()),
        user_id=user_id,
        ticket_number=f"TKT{str(uuid.uuid4())[:8].upper()}",
        subject=subject,
        description=description,
        category=category,
        priority=priority,
        status="open",
        created_at=datetime.utcnow()
    )
    
    db.add(new_ticket)
    await db.commit()
    
    return {
        "success": True,
        "data": {"ticket_id": new_ticket.id, "ticket_number": new_ticket.ticket_number},
        "message": "Support ticket created successfully"
    }


@router.get("/tickets")
async def get_support_tickets(
    user_id: str = Query(...),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db)
):
    """Get user support tickets"""
    result = await db.execute(
        select(SupportTicket)
        .where(SupportTicket.user_id == user_id)
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
