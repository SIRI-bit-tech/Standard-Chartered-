from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.account import Account, Statement, AccountType, AccountStatus
from models.transaction import Transaction
from database import get_db
import uuid
from datetime import datetime

router = APIRouter()


@router.get("")
async def get_accounts(
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get all user accounts"""
    result = await db.execute(
        select(Account).where(Account.user_id == user_id)
    )
    accounts = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": acc.id,
                "account_number": acc.account_number,
                "type": acc.account_type,
                "currency": acc.currency,
                "balance": acc.balance,
                "status": acc.status,
                "nickname": acc.nickname or f"{acc.account_type.value} Account"
            }
            for acc in accounts
        ],
        "message": "Accounts retrieved successfully"
    }


@router.get("/{account_id}")
async def get_account_details(
    account_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get specific account details"""
    result = await db.execute(
        select(Account).where(Account.id == account_id)
    )
    account = result.scalar()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {
        "success": True,
        "data": {
            "id": account.id,
            "account_number": account.account_number,
            "type": account.account_type,
            "currency": account.currency,
            "balance": account.balance,
            "available_balance": account.available_balance,
            "status": account.status,
            "nickname": account.nickname,
            "interest_rate": account.interest_rate,
            "is_primary": account.is_primary,
            "created_at": account.created_at.isoformat()
        },
        "message": "Account details retrieved"
    }


@router.post("")
async def create_account(
    user_id: str,
    account_type: str,
    currency: str,
    nickname: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Create new account (checking, savings, crypto)"""
    new_account = Account(
        id=str(uuid.uuid4()),
        user_id=user_id,
        account_number=f"SC{str(uuid.uuid4())[:12].upper()}",
        account_type=AccountType(account_type),
        currency=currency,
        status=AccountStatus.ACTIVE,
        nickname=nickname,
        balance=0.0,
        available_balance=0.0,
        created_at=datetime.utcnow()
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
            "currency": new_account.currency
        },
        "message": "Account created successfully"
    }


@router.put("/{account_id}")
async def update_account(
    account_id: str,
    nickname: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Update account settings"""
    result = await db.execute(
        select(Account).where(Account.id == account_id)
    )
    account = result.scalar()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if nickname:
        account.nickname = nickname
    
    account.updated_at = datetime.utcnow()
    db.add(account)
    await db.commit()
    
    return {
        "success": True,
        "data": {"id": account.id},
        "message": "Account updated successfully"
    }


@router.get("/{account_id}/balance")
async def get_balance(account_id: str, db: AsyncSession = Depends(get_db)):
    """Get real-time balance"""
    result = await db.execute(
        select(Account).where(Account.id == account_id)
    )
    account = result.scalar()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {
        "success": True,
        "data": {
            "account_id": account.id,
            "balance": account.balance,
            "available_balance": account.available_balance,
            "currency": account.currency
        },
        "message": "Balance retrieved"
    }


@router.get("/{account_id}/transactions")
async def get_transactions(
    account_id: str,
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db)
):
    """Get transaction history (90 days)"""
    result = await db.execute(
        select(Transaction)
        .where(Transaction.account_id == account_id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    transactions = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": t.id,
                "type": t.type,
                "amount": t.amount,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
                "status": t.status
            }
            for t in transactions
        ],
        "message": "Transactions retrieved"
    }


@router.get("/{account_id}/statements")
async def get_statements(
    account_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get account statements"""
    result = await db.execute(
        select(Statement)
        .where(Statement.account_id == account_id)
        .order_by(Statement.statement_date.desc())
    )
    statements = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "statement_date": s.statement_date.isoformat(),
                "document_url": s.document_url
            }
            for s in statements
        ],
        "message": "Statements retrieved"
    }


@router.post("/{account_id}/statements/download")
async def download_statement(account_id: str, statement_id: str):
    """Download eStatement"""
    return {
        "success": True,
        "data": {"download_url": "https://example.com/statement.pdf"},
        "message": "Statement download initiated"
    }
