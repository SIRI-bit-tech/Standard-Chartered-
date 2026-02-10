from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.account import Account, Statement


async def _get_owned_account(db: AsyncSession, account_id: str, user_id: str) -> Account:
    """Get account by ID and verify ownership by user"""
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if account.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return account


async def _get_statement_by_id(db: AsyncSession, statement_id: str, account_id: str) -> Statement:
    """Get statement by ID and verify it belongs to the account"""
    result = await db.execute(select(Statement).where(Statement.id == statement_id))
    statement = result.scalar_one_or_none()
    if not statement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    if statement.account_id != account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    return statement
