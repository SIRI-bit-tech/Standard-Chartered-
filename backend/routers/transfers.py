from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.transfer import Transfer, TransferStatus, TransferType
from models.account import Account
from database import get_db
from schemas.transfer import (
    ACHTransferRequest, WireTransferRequest, TransferResponse, TransferStatusUpdateResponse
)
from utils.ably import AblyRealtimeManager
import uuid
from datetime import datetime

router = APIRouter(prefix="/transfers", tags=["transfers"])


@router.post("/internal")
async def internal_transfer(
    from_account_id: str,
    to_account_id: str,
    amount: float,
    description: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Internal transfer between own accounts"""
    new_transfer = Transfer(
        id=str(uuid.uuid4()),
        from_account_id=from_account_id,
        to_account_id=to_account_id,
        type=TransferType.INTERNAL,
        amount=amount,
        currency="USD",
        fee_amount=0.0,
        total_amount=amount,
        reference_number=str(uuid.uuid4())[:12].upper(),
        description=description or "Internal Transfer",
        status=TransferStatus.COMPLETED,
        created_at=datetime.utcnow()
    )
    
    db.add(new_transfer)
    await db.commit()
    
    return {
        "success": True,
        "data": {"transfer_id": new_transfer.id, "reference": new_transfer.reference_number},
        "message": "Internal transfer completed successfully"
    }


@router.post("/domestic")
async def domestic_transfer(
    from_account_id: str,
    to_account_number: str,
    amount: float,
    description: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Domestic transfer to other SC accounts"""
    new_transfer = Transfer(
        id=str(uuid.uuid4()),
        from_account_id=from_account_id,
        to_account_number=to_account_number,
        type=TransferType.DOMESTIC,
        amount=amount,
        currency="USD",
        fee_amount=2.50,
        total_amount=amount + 2.50,
        reference_number=str(uuid.uuid4())[:12].upper(),
        description=description or "Domestic Transfer",
        status=TransferStatus.PROCESSING,
        created_at=datetime.utcnow()
    )
    
    db.add(new_transfer)
    await db.commit()
    
    return {
        "success": True,
        "data": {"transfer_id": new_transfer.id, "reference": new_transfer.reference_number},
        "message": "Domestic transfer submitted"
    }


@router.post("/ach", response_model=TransferStatusUpdateResponse)
async def ach_transfer(
    user_id: str,
    request: ACHTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """ACH transfer to external bank account"""
    try:
        account_result = await db.execute(
            select(Account).where(Account.id == request.from_account_id)
        )
        account = account_result.scalar()
        
        if not account or account.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        
        new_transfer = Transfer(
            id=str(uuid.uuid4()),
            from_account_id=request.from_account_id,
            from_user_id=user_id,
            type=TransferType.ACH,
            amount=request.amount,
            currency=account.currency,
            fee_amount=0.0,
            total_amount=request.amount,
            reference_number=f"ACH-{uuid.uuid4().hex[:12].upper()}",
            description=request.description or "ACH Transfer",
            status=TransferStatus.PROCESSING,
            created_at=datetime.utcnow()
        )
        
        db.add(new_transfer)
        await db.commit()
        await db.refresh(new_transfer)
        
        AblyRealtimeManager.publish_notification(
            user_id,
            "ach_transfer",
            "ACH Transfer Initiated",
            f"ACH transfer of ${request.amount} initiated. Processing typically takes 3-5 business days."
        )
        
        return {
            "success": True,
            "transfer_id": new_transfer.id,
            "status": TransferStatus.PROCESSING,
            "message": "ACH transfer submitted. Processing typically takes 3-5 business days."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate ACH transfer: {str(e)}"
        )


@router.post("/wire", response_model=TransferStatusUpdateResponse)
async def wire_transfer(
    user_id: str,
    request: WireTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """Wire transfer to external bank account"""
    try:
        account_result = await db.execute(
            select(Account).where(Account.id == request.from_account_id)
        )
        account = account_result.scalar()
        
        if not account or account.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        
        new_transfer = Transfer(
            id=str(uuid.uuid4()),
            from_account_id=request.from_account_id,
            from_user_id=user_id,
            type=TransferType.WIRE,
            amount=request.amount,
            currency=request.currency,
            fee_amount=35.00,
            total_amount=request.amount + 35.00,
            reference_number=f"WIRE-{uuid.uuid4().hex[:12].upper()}",
            description=request.purpose or "Wire Transfer",
            status=TransferStatus.PENDING,
            requires_mfa=True,
            created_at=datetime.utcnow()
        )
        
        db.add(new_transfer)
        await db.commit()
        await db.refresh(new_transfer)
        
        AblyRealtimeManager.publish_notification(
            user_id,
            "wire_transfer",
            "Wire Transfer Initiated",
            f"Wire transfer of {request.currency} {request.amount} submitted for approval."
        )
        
        return {
            "success": True,
            "transfer_id": new_transfer.id,
            "status": TransferStatus.PENDING,
            "message": "Wire transfer submitted for approval. MFA required for confirmation."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate wire transfer: {str(e)}"
        )


@router.post("/international")
async def international_transfer(
    from_account_id: str,
    beneficiary_id: str,
    amount: float,
    description: str = None,
    db: AsyncSession = Depends(get_db)
):
    """International wire transfer (SWIFT)"""
    new_transfer = Transfer(
        id=str(uuid.uuid4()),
        from_account_id=from_account_id,
        to_beneficiary_id=beneficiary_id,
        type=TransferType.INTERNATIONAL,
        amount=amount,
        currency="USD",
        fee_amount=25.00,
        total_amount=amount + 25.00,
        reference_number=str(uuid.uuid4())[:12].upper(),
        description=description or "International Transfer",
        status=TransferStatus.PENDING,
        requires_mfa=True,
        created_at=datetime.utcnow()
    )
    
    db.add(new_transfer)
    await db.commit()
    
    return {
        "success": True,
        "data": {"transfer_id": new_transfer.id, "reference": new_transfer.reference_number},
        "message": "International transfer submitted for approval"
    }


@router.get("/{transfer_id}")
async def get_transfer(transfer_id: str, db: AsyncSession = Depends(get_db)):
    """Get transfer details"""
    result = await db.execute(
        select(Transfer).where(Transfer.id == transfer_id)
    )
    transfer = result.scalar()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    return {
        "success": True,
        "data": {
            "id": transfer.id,
            "type": transfer.type,
            "amount": transfer.amount,
            "status": transfer.status,
            "reference_number": transfer.reference_number,
            "created_at": transfer.created_at.isoformat()
        },
        "message": "Transfer details retrieved"
    }


@router.get("/history")
async def get_transfer_history(
    user_id: str = Query(...),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get transfer history"""
    result = await db.execute(
        select(Transfer)
        .where(Transfer.from_user_id == user_id)
        .order_by(Transfer.created_at.desc())
        .limit(limit)
    )
    transfers = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": t.id,
                "type": t.type,
                "amount": t.amount,
                "status": t.status,
                "created_at": t.created_at.isoformat()
            }
            for t in transfers
        ],
        "message": "Transfer history retrieved"
    }


@router.post("/{transfer_id}/cancel")
async def cancel_transfer(transfer_id: str, db: AsyncSession = Depends(get_db)):
    """Cancel pending transfer"""
    result = await db.execute(
        select(Transfer).where(Transfer.id == transfer_id)
    )
    transfer = result.scalar()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    if transfer.status != TransferStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cannot cancel transfer")
    
    transfer.status = TransferStatus.CANCELLED
    db.add(transfer)
    await db.commit()
    
    return {
        "success": True,
        "data": {},
        "message": "Transfer cancelled successfully"
    }


@router.get("/beneficiaries")
async def get_beneficiaries(user_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Get saved beneficiaries"""
    result = await db.execute(
        select(Beneficiary)
        .where(Beneficiary.user_id == user_id)
    )
    beneficiaries = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": b.id,
                "name": b.name,
                "account_number": b.account_number,
                "transfer_type": b.transfer_type
            }
            for b in beneficiaries
        ],
        "message": "Beneficiaries retrieved"
    }


@router.post("/beneficiaries")
async def add_beneficiary(
    user_id: str,
    name: str,
    account_number: str,
    transfer_type: str,
    db: AsyncSession = Depends(get_db)
):
    """Add new beneficiary"""
    new_beneficiary = Beneficiary(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=name,
        account_number=account_number,
        transfer_type=TransferType(transfer_type),
        is_active=True,
        created_at=datetime.utcnow()
    )
    
    db.add(new_beneficiary)
    await db.commit()
    
    return {
        "success": True,
        "data": {"beneficiary_id": new_beneficiary.id},
        "message": "Beneficiary added successfully"
    }


@router.delete("/beneficiaries/{beneficiary_id}")
async def remove_beneficiary(beneficiary_id: str, db: AsyncSession = Depends(get_db)):
    """Remove beneficiary"""
    result = await db.execute(
        select(Beneficiary).where(Beneficiary.id == beneficiary_id)
    )
    beneficiary = result.scalar()
    
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    
    await db.delete(beneficiary)
    await db.commit()
    
    return {
        "success": True,
        "data": {},
        "message": "Beneficiary removed successfully"
    }
