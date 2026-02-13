from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.user import User
from models.support import LoginHistory
from database import get_db
from datetime import datetime
from utils.auth import get_current_user_id

router = APIRouter()

@router.get("/realtime/token")
async def get_realtime_token(
    current_user_id: str = Depends(get_current_user_id),
):
    from utils.ably import get_ably_token_request
    token_request = get_ably_token_request(current_user_id)
    if token_request is None:
        raise HTTPException(status_code=500, detail="Real-time service unavailable")
    return token_request


@router.get("")
async def get_profile(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get user profile"""
    result = await db.execute(
        select(User).where(User.id == current_user_id)
    )
    user = result.scalar()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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
            "primary_currency": user.primary_currency,
            "tier": user.tier,
            "email_verified": user.email_verified,
            "phone_verified": user.phone_verified,
            "identity_verified": user.identity_verified
        },
        "message": "Profile retrieved successfully"
    }


@router.put("")
async def update_profile(
    current_user_id: str = Depends(get_current_user_id),
    first_name: str = None,
    last_name: str = None,
    phone: str = None,
    bio: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Update profile"""
    result = await db.execute(
        select(User).where(User.id == current_user_id)
    )
    user = result.scalar()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name
    if phone:
        user.phone = phone
    if bio:
        user.bio = bio
    
    user.updated_at = datetime.utcnow()
    db.add(user)
    await db.commit()
    
    return {
        "success": True,
        "data": {},
        "message": "Profile updated successfully"
    }


@router.get("/settings")
async def get_settings(current_user_id: str = Depends(get_current_user_id)):
    """Get user settings"""
    return {
        "success": True,
        "data": {
            "theme": "light",
            "language": "en",
            "notifications_enabled": True
        },
        "message": "Settings retrieved"
    }


@router.put("/settings")
async def update_settings(
    current_user_id: str = Depends(get_current_user_id),
    theme: str = None,
    language: str = None
):
    """Update settings"""
    return {
        "success": True,
        "data": {},
        "message": "Settings updated successfully"
    }


@router.post("/documents/upload")
async def upload_document(
    document_type: str,
    file_url: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """Upload ID document"""
    return {
        "success": True,
        "data": {"document_id": str(__import__('uuid').uuid4())},
        "message": "Document uploaded successfully"
    }


@router.get("/documents")
async def get_documents(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get uploaded documents"""
    from models.document import Document
    result = await db.execute(
        select(Document).where(Document.user_id == current_user_id)
    )
    documents = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": d.id,
                "type": d.type,
                "filename": d.filename,
                "status": d.status,
                "created_at": d.created_at.isoformat()
            }
            for d in documents
        ],
        "message": "Documents retrieved"
    }


@router.get("/login-history")
async def get_login_history(
    current_user_id: str = Depends(get_current_user_id),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db)
):
    """Get login history"""
    result = await db.execute(
        select(LoginHistory)
        .where(LoginHistory.user_id == current_user_id)
        .order_by(LoginHistory.created_at.desc())
        .limit(limit)
    )
    history = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "ip_address": h.ip_address,
                "device_name": h.device_name,
                "device_type": h.device_type,
                "country": h.country,
                "city": h.city,
                "created_at": h.created_at.isoformat()
            }
            for h in history
        ],
        "message": "Login history retrieved"
    }
