from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.account import Account, AccountType, AccountStatus
from database import get_db
from utils.auth import get_current_user_id
from utils.account_helpers import _get_owned_account
import uuid
from datetime import datetime

router = APIRouter()


@router.post("")
async def create_account(
    account_type: str,
    currency: str,
    nickname: str | None = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create new account for authenticated user"""
    try:
        account_type_enum = AccountType(account_type)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid account type '{account_type}'. Valid types are: {[t.value for t in AccountType]}"
        )
    
    new_account = Account(
        id=str(uuid.uuid4()),
        user_id=user_id,
        account_number=f"SC{str(uuid.uuid4())[:12].upper()}",
        account_type=account_type_enum,
        currency=currency,
        status=AccountStatus.ACTIVE,
        nickname=nickname,
        balance=0.0,
        available_balance=0.0,
        created_at=datetime.utcnow(),
    )

    db.add(new_account)
    await db.commit()
    await db.refresh(new_account)

    return {
        "success": True,
        "data": {
            "id": new_account.id,
            "account_number": new_account.account_number,
            "type": new_account.account_type,
            "currency": new_account.currency,
        },
        "message": "Account created successfully",
    }


@router.put("/{account_id}")
async def update_account(
    account_id: str,
    nickname: str | None = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update account settings (owned account only)"""
    account = await _get_owned_account(db, account_id, user_id)

    if nickname is not None:
        account.nickname = nickname

    account.updated_at = datetime.utcnow()
    db.add(account)
    await db.commit()

    return {
        "success": True,
        "data": {"id": account.id},
        "message": "Account updated successfully",
    }
