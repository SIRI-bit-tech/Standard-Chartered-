from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime, timedelta
import uuid
import random

from models.deposit import Deposit, DepositType, DepositStatus
from models.account import Account, AccountStatus
from models.user import User
from database import get_db
from schemas.deposit import (
    CheckDepositRequest, DirectDepositSetupRequest, DepositResponse,
    DepositListResponse, DepositVerificationRequest, DepositStatusUpdateResponse,
    CheckParseRequest, CheckParseResponse
)
from utils.ably import AblyRealtimeManager
from utils.auth import get_current_user_id
import httpx
import asyncio
from utils.ocr import extract_check_details, ocr_status, extract_check_details_remote
from config import settings

router = APIRouter(tags=["deposits"])

async def _ensure_user_active(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")


@router.post("/parse-check", response_model=CheckParseResponse)
async def parse_check_image(
    request: CheckParseRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    try:
        provider = (settings.OCR_PROVIDER or "").strip().lower()
        if provider:
            result = await extract_check_details_remote(request.front_image_url)
        else:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(request.front_image_url)
                if resp.status_code != 200:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not fetch image")
                content = resp.content
            result = await asyncio.to_thread(extract_check_details, content)
        if not result.get("supported"):
            detail = result.get("error") or "OCR not configured"
            raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=detail)
        return {
            "success": True,
            "amount": result.get("amount"),
            "check_number": result.get("check_number"),
            "raw_text": result.get("text"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/ocr-health")
async def get_ocr_health(
    current_user_id: str = Depends(get_current_user_id),
):
    try:
        status_info = ocr_status()
        return {"success": True, "status": status_info}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

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
            name_on_check=request.name_on_check,
            front_image_url=request.front_image_url,
            reference_number=f"CHK-{uuid.uuid4().hex[:12].upper()}",
            is_verified=True,  # Auto-verify submission for now
            created_at=datetime.utcnow()
        )
        
        db.add(deposit)
        await db.commit()
        await db.refresh(deposit)
        try:
            AblyRealtimeManager.publish_notification(
                current_user_id,
                "check_deposit_submitted",
                "Check Deposit Submitted",
                f"Check deposit of {request.currency} {request.amount} has been submitted and is pending review."
            )
        except Exception:
            pass
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.PENDING,
            "message": "Check deposit submitted successfully and is pending review."
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
        try:
            AblyRealtimeManager.publish_notification(
                current_user_id,
                "check_deposit_verified",
                "Check Verified",
                f"Check deposit of {deposit.currency} {deposit.amount} has been verified and is being processed."
            )
        except Exception:
            pass
        
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
        acc_res = await db.execute(select(Account.id).where(Account.user_id == current_user_id))
        acc_ids = [row[0] for row in acc_res.all()]
        q = select(Deposit).where(
            or_(
                Deposit.user_id == current_user_id,
                Deposit.account_id.in_(acc_ids) if acc_ids else False,
            )
        ).order_by(Deposit.created_at.desc())
        deposits_result = await db.execute(q)
        records = deposits_result.scalars().all()
        deposits = [
            {
                "id": d.id,
                "account_id": d.account_id,
                "type": getattr(d.type, "value", str(d.type)),
                "status": getattr(d.status, "value", str(d.status)),
                "amount": d.amount,
                "currency": d.currency,
                "reference_number": d.reference_number,
                "check_number": d.check_number,
                "name_on_check": d.name_on_check,
                "front_image_url": d.front_image_url,
                "created_at": d.created_at,
                "completed_at": d.completed_at,
                "is_verified": d.is_verified,
            }
            for d in records
        ]
        pending_count = sum(1 for d in records if getattr(d.status, "value", str(d.status)) == DepositStatus.PENDING.value)
        completed_count = sum(1 for d in records if getattr(d.status, "value", str(d.status)) == DepositStatus.COMPLETED.value)
        deposits.sort(key=lambda x: x["created_at"] or 0, reverse=True)
        return {
            "success": True,
            "deposits": deposits,
            "total_count": len(records),
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
