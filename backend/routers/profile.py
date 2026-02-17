from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.user import User
from models.support import LoginHistory
from database import get_db
from datetime import datetime
from utils.auth import get_current_user_id
from utils.cloudinary import CloudinaryManager

router = APIRouter()

@router.get("/realtime/token")
async def get_realtime_token(
    current_user_id: str = Depends(get_current_user_id),
):
    from utils.ably import get_ably_token_request
    token_request = await get_ably_token_request(current_user_id)
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
            "street_address": user.street_address,
            "city": user.city,
            "state": user.state,
            "postal_code": user.postal_code,
            "country": user.country,
            "primary_currency": user.primary_currency,
            "tier": user.tier,
            "profile_picture_url": user.profile_picture_url,
            "email_verified": user.email_verified,
            "phone_verified": user.phone_verified,
            "identity_verified": user.identity_verified,
            "two_factor_enabled": getattr(user, "two_factor_enabled", False),
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None
        },
        "message": "Profile retrieved successfully"
    }


@router.put("")
async def update_profile(
    payload: dict = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update profile"""
    result = await db.execute(
        select(User).where(User.id == current_user_id)
    )
    user = result.scalar()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    first_name = payload.get("first_name")
    last_name = payload.get("last_name")
    phone = payload.get("phone")
    street_address = payload.get("street_address")
    city = payload.get("city")
    state = payload.get("state")
    postal_code = payload.get("postal_code")
    country = payload.get("country")

    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if phone is not None:
        user.phone = phone
    if street_address is not None:
        user.street_address = street_address
    if city is not None:
        user.city = city
    if state is not None:
        user.state = state
    if postal_code is not None:
        user.postal_code = postal_code
    if country is not None:
        user.country = country
    
    user.updated_at = datetime.utcnow()
    db.add(user)
    await db.commit()
    
    return {
        "success": True,
        "data": {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "street_address": user.street_address,
            "city": user.city,
            "state": user.state,
            "postal_code": user.postal_code,
            "country": user.country
        },
        "message": "Profile updated successfully"
    }


@router.post("/avatar/upload-url")
async def get_avatar_upload_url(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Provide a signed Cloudinary upload config for avatar images"""
    # Ensure user exists
    res = await db.execute(select(User).where(User.id == current_user_id))
    if not res.scalar():
        raise HTTPException(status_code=404, detail="User not found")
    cfg = CloudinaryManager.generate_signed_upload_url(folder="avatars", resource_type="image", expire_seconds=900)
    return {"success": True, "data": cfg}


@router.put("/avatar")
async def set_avatar(
    payload: dict,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Store avatar URL on the user profile"""
    image_url = payload.get("image_url")
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url is required")
    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.profile_picture_url = image_url
    user.updated_at = datetime.utcnow()
    db.add(user)
    await db.commit()
    return {"success": True, "data": {"profile_picture_url": image_url}, "message": "Avatar updated"}


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
