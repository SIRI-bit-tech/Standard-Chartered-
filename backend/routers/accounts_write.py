from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.account import Account, AccountType, AccountStatus
from database import get_db
from utils.auth import get_current_user_id
from utils.account_helpers import _get_owned_account
from services.statement_service import StatementService
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/")
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


@router.post("/generate-statement")
async def generate_statement(
    start_date: str = Query(..., description="Start date in ISO format (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date in ISO format (YYYY-MM-DD)"),
    send_email: bool = Query(False, description="Send statement to user's email"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate account statement for all user accounts for a custom date range
    
    This endpoint generates a comprehensive PDF statement including:
    - All account types (Checking, Savings, Crypto)
    - Account details and balances
    - Complete transaction history for the period
    - Opening and closing balances
    
    The statement is stored in Cloudinary and can optionally be emailed to the user.
    """
    try:
        # Parse dates
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
            )
        
        # Validate date range
        if start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
        
        # Limit to 12 months
        date_diff = (end_dt - start_dt).days
        if date_diff > 365:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date range cannot exceed 12 months"
            )
        
        # Generate statement
        result = await StatementService.generate_user_statement(
            db=db,
            user_id=user_id,
            start_date=start_dt,
            end_date=end_dt,
            send_email=send_email
        )
        
        return {
            "success": True,
            "data": result,
            "message": "Statement generated successfully"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate statement: {str(e)}"
        )
