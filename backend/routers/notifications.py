from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.notification import Notification, NotificationPreference
from database import get_db
import uuid
from datetime import datetime

router = APIRouter()


@router.get("")
async def get_notifications(
    user_id: str = Query(...),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db)
):
    """Get user notifications"""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    notifications = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "status": n.status,
                "created_at": n.created_at.isoformat()
            }
            for n in notifications
        ],
        "message": "Notifications retrieved"
    }


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Mark notification as read"""
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.status = "read"
    notification.read_at = datetime.utcnow()
    db.add(notification)
    await db.commit()
    
    return {
        "success": True,
        "data": {},
        "message": "Notification marked as read"
    }


@router.put("/read-all")
async def mark_all_read(user_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Mark all notifications as read"""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .where(Notification.status == "unread")
    )
    notifications = result.scalars().all()
    
    for notification in notifications:
        notification.status = "read"
        notification.read_at = datetime.utcnow()
    
    db.add_all(notifications)
    await db.commit()
    
    return {
        "success": True,
        "data": {"updated_count": len(notifications)},
        "message": "All notifications marked as read"
    }


@router.get("/settings")
async def get_notification_settings(
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get notification preferences"""
    result = await db.execute(
        select(NotificationPreference)
        .where(NotificationPreference.user_id == user_id)
    )
    preferences = result.scalar()
    
    if not preferences:
        # Return default preferences
        return {
            "success": True,
            "data": {
                "email_transactions": True,
                "email_security": True,
                "sms_security": True,
                "push_alerts": True
            },
            "message": "Default notification settings"
        }
    
    return {
        "success": True,
        "data": {
            "email_transactions": preferences.email_transactions,
            "email_security": preferences.email_security,
            "sms_transactions": preferences.sms_transactions,
            "push_transactions": preferences.push_transactions
        },
        "message": "Notification settings retrieved"
    }


@router.put("/settings")
async def update_notification_settings(
    user_id: str,
    email_transactions: bool = None,
    email_security: bool = None,
    sms_transactions: bool = None,
    push_alerts: bool = None,
    db: AsyncSession = Depends(get_db)
):
    """Update notification preferences"""
    result = await db.execute(
        select(NotificationPreference)
        .where(NotificationPreference.user_id == user_id)
    )
    preferences = result.scalar()
    
    if not preferences:
        preferences = NotificationPreference(
            id=str(uuid.uuid4()),
            user_id=user_id,
            created_at=datetime.utcnow()
        )
        db.add(preferences)
    
    if email_transactions is not None:
        preferences.email_transactions = email_transactions
    if email_security is not None:
        preferences.email_security = email_security
    if sms_transactions is not None:
        preferences.sms_transactions = sms_transactions
    if push_alerts is not None:
        preferences.push_transactions = push_alerts
    
    preferences.updated_at = datetime.utcnow()
    db.add(preferences)
    await db.commit()
    
    return {
        "success": True,
        "data": {},
        "message": "Notification settings updated successfully"
    }
