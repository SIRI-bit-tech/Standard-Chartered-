from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.account import Account, Statement
from models.transaction import Transaction
from database import get_db
from utils.auth import get_current_user_id

router = APIRouter()


async def _get_owned_account(db: AsyncSession, account_id: str, user_id: str) -> Account:
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if account.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return account


@router.get("")
async def get_accounts(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get all accounts for the authenticated user"""
    result = await db.execute(select(Account).where(Account.user_id == user_id))
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
                "available_balance": acc.available_balance,
                "status": acc.status,
                "nickname": acc.nickname or f"{acc.account_type.value} Account",
                "interest_rate": acc.interest_rate,
                "is_primary": acc.is_primary,
                "overdraft_limit": acc.overdraft_limit,
                "routing_number": acc.routing_number,
                "created_at": acc.created_at.isoformat(),
            }
            for acc in accounts
        ],
        "message": "Accounts retrieved successfully",
    }


@router.get("/{account_id}")
async def get_account_details(
    account_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get specific account details for authenticated user"""
    account = await _get_owned_account(db, account_id, user_id)

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
            "overdraft_limit": account.overdraft_limit,
            "routing_number": account.routing_number,
            "created_at": account.created_at.isoformat(),
        },
        "message": "Account details retrieved",
    }


@router.get("/{account_id}/balance")
async def get_balance(
    account_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get real-time balance (authenticated + owned account only)"""
    account = await _get_owned_account(db, account_id, user_id)

    return {
        "success": True,
        "data": {
            "account_id": account.id,
            "balance": account.balance,
            "available_balance": account.available_balance,
            "currency": account.currency,
        },
        "message": "Balance retrieved",
    }


@router.get("/{account_id}/transactions")
async def get_transactions(
    account_id: str,
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get transaction history for an owned account"""
    await _get_owned_account(db, account_id, user_id)

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
                "currency": t.currency,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
                "status": t.status,
            }
            for t in transactions
        ],
        "message": "Transactions retrieved",
    }


@router.get("/{account_id}/statements")
async def get_statements(
    account_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get account statements for an owned account"""
    await _get_owned_account(db, account_id, user_id)

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
                "document_url": s.document_url,
            }
            for s in statements
        ],
        "message": "Statements retrieved",
    }


@router.post("/{account_id}/statements/download")
async def download_statement(
    account_id: str,
    statement_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Download eStatement (authenticated + owned account only)"""
    await _get_owned_account(db, account_id, user_id)

    return {
        "success": True,
        "data": {"download_url": "https://example.com/statement.pdf", "statement_id": statement_id},
        "message": "Statement download initiated",
    }
