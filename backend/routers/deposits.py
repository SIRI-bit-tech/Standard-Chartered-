from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import uuid
import random

from models.deposit import Deposit, DepositType, DepositStatus
from models.account import Account, AccountStatus
from models.user import User
from database import get_db
from schemas.deposit import (
    CheckDepositRequest, DirectDepositSetupRequest, DepositResponse,
    DepositListResponse, DepositVerificationRequest, DepositStatusUpdateResponse
)
from utils.ably import AblyRealtimeManager
from utils.auth import get_current_user_id

router = APIRouter(prefix="/deposits", tags=["deposits"])

async def _ensure_user_active(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")


@router.post("/check-deposit", response_model=DepositStatusUpdateResponse)
async def initiate_check_deposit(
    request: CheckDepositRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Initiate mobile check deposit"""
    try:
        await _ensure_user_active(db, current_user_id)
        account_result = await db.execute(
            select(Account).where(Account.id == request.account_id)
        )
        account = account_result.scalar()
        
        if not account or account.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        if getattr(account, "status", None) and account.status != AccountStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account inactive"
            )
        
        verification_code = str(random.randint(100000, 999999))
        
        deposit = Deposit(
            id=str(uuid.uuid4()),
            account_id=request.account_id,
            user_id=current_user_id,
            type=DepositType.MOBILE_CHECK_DEPOSIT,
            status=DepositStatus.PENDING,
            amount=request.amount,
            currency=request.currency,
            check_number=request.check_number,
            check_issuer_bank=request.check_issuer_bank,
            reference_number=f"CHK-{uuid.uuid4().hex[:12].upper()}",
            verification_code=verification_code,
            created_at=datetime.utcnow()
        )
        
        db.add(deposit)
        await db.commit()
        await db.refresh(deposit)
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "check_deposit_initiated",
            "Check Deposit Initiated",
            f"Check deposit of {request.currency} {request.amount} initiated. Verification code sent."
        )
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.PENDING,
            "message": "Check deposit initiated. Verification code sent to your phone."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate check deposit: {str(e)}"
        )


@router.post("/verify-check-deposit", response_model=DepositStatusUpdateResponse)
async def verify_check_deposit(
    request: DepositVerificationRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Verify check deposit with verification code"""
    try:
        deposit_result = await db.execute(
            select(Deposit).where(
                (Deposit.id == request.deposit_id) & (Deposit.user_id == current_user_id)
            )
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deposit not found"
            )
        
        if deposit.verification_code != request.verification_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )
        
        deposit.is_verified = True
        deposit.verified_at = datetime.utcnow()
        deposit.status = DepositStatus.VERIFIED
        db.add(deposit)
        await db.commit()
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "check_deposit_verified",
            "Check Verified",
            f"Check deposit of {deposit.currency} {deposit.amount} has been verified and is being processed."
        )
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.VERIFIED,
            "message": "Check deposit verified successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/direct-deposit/setup", response_model=DepositStatusUpdateResponse)
async def setup_direct_deposit(
    request: DirectDepositSetupRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Setup direct deposit"""
    try:
        account_result = await db.execute(
            select(Account).where(Account.id == request.account_id)
        )
        account = account_result.scalar()
        
        if not account or account.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        
        deposit = Deposit(
            id=str(uuid.uuid4()),
            account_id=request.account_id,
            user_id=current_user_id,
            type=DepositType.DIRECT_DEPOSIT,
            status=DepositStatus.COMPLETED,
            amount=0.0,
            currency="USD",
            direct_deposit_routing_number=request.routing_number,
            direct_deposit_account_number=request.account_number,
            employer_name=request.employer_name,
            employer_id=request.employer_id,
            reference_number=f"DD-{uuid.uuid4().hex[:12].upper()}",
            is_verified=True,
            verified_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        
        db.add(deposit)
        await db.commit()
        await db.refresh(deposit)
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "direct_deposit_setup",
            "Direct Deposit Setup",
            "Direct deposit has been setup successfully. You can now receive employer payments."
        )
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.COMPLETED,
            "message": "Direct deposit configured successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/list", response_model=DepositListResponse)
async def list_deposits(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List all deposits for user"""
    try:
        deposits_result = await db.execute(
            select(Deposit).where(Deposit.user_id == current_user_id)
        )
        deposits = deposits_result.scalars().all()
        
        pending_count = sum(1 for d in deposits if d.status == DepositStatus.PENDING)
        completed_count = sum(1 for d in deposits if d.status == DepositStatus.COMPLETED)
        
        return {
            "deposits": [DepositResponse.from_orm(d) for d in deposits],
            "total_count": len(deposits),
            "pending_count": pending_count,
            "completed_count": completed_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{deposit_id}", response_model=DepositResponse)
async def get_deposit(
    deposit_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get deposit details"""
    try:
        deposit_result = await db.execute(
            select(Deposit).where(
                (Deposit.id == deposit_id) & (Deposit.user_id == current_user_id)
            )
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deposit not found"
            )
        
        return DepositResponse.from_orm(deposit)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{deposit_id}")
async def cancel_deposit(
    deposit_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Cancel pending deposit"""
    try:
        deposit_result = await db.execute(
            select(Deposit).where(
                (Deposit.id == deposit_id) & (Deposit.user_id == current_user_id)
            )
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deposit not found"
            )
        
        if deposit.status not in [DepositStatus.PENDING, DepositStatus.PROCESSING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel deposit with status: {deposit.status}"
            )
        
        deposit.status = DepositStatus.CANCELLED
        db.add(deposit)
        await db.commit()
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "deposit_cancelled",
            "Deposit Cancelled",
            f"Deposit {deposit.reference_number} has been cancelled."
        )
        
        return {
            "success": True,
            "message": "Deposit cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
