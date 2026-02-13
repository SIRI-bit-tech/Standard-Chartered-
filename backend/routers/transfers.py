from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from models.transfer import Transfer, TransferStatus, TransferType, Beneficiary
from models.account import Account, AccountStatus
from models.user import User
from database import get_db
from schemas.transfer import (
    InternalTransferRequest,
    DomesticTransferRequest,
    InternationalTransferRequest,
    ACHTransferRequest,
    WireTransferRequest,
    TransferResponse,
    TransferStatusUpdateResponse,
)
from utils.auth import get_current_user_id, verify_password
from utils.ably import AblyRealtimeManager
import logging
import uuid
from datetime import datetime, timedelta

router = APIRouter(prefix="/transfers", tags=["transfers"])

logger = logging.getLogger(__name__)

async def _ensure_user_active(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")


@router.get("/recipients/search")
async def search_recipients(
    query: str = Query(..., min_length=2, description="Search query for recipients"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Search for recipients by partial name matching"""
    try:
        # Search users by first name, last name, or username
        search_pattern = f"%{query}%"
        
        users = await db.execute(
            select(User).where(
                or_(
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                    User.username.ilike(search_pattern)
                )
            ).limit(10)  # Limit results for performance
        )
        users = users.scalars().all()
        
        # Get accounts for each user
        recipients = []
        for user in users:
            user_accounts = await db.execute(
                select(Account).where(Account.user_id == user.id)
            )
            accounts = user_accounts.scalars().all()
            
            # Format accounts for display (masked account numbers)
            formatted_accounts = []
            for account in accounts:
                formatted_accounts.append({
                    "id": account.id,
                    "type": account.account_type.value,
                    "currency": account.currency,
                    "last_four": account.account_number[-4:],  # Mask: show only last 4 digits
                    "is_primary": account.is_primary,
                    "status": account.status.value
                })
            
            recipients.append({
                "user_id": user.id,
                "display_name": f"{user.first_name} {user.last_name}".strip(),
                "username": user.username,
                "email": user.email,
                "accounts": formatted_accounts
            })
        
        return {
            "success": True,
            "data": recipients,
            "message": f"Found {len(recipients)} recipients"
        }
        
    except Exception as e:
        logger.error(f"Failed to search recipients: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search recipients"
        )


MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(hours=1)


async def _verify_transfer_pin(db: AsyncSession, user_id: str, transfer_pin: str) -> None:
    """Verify user's transfer PIN; raises HTTPException if invalid."""
    result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.transfer_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer PIN not set. Please set your PIN first.",
        )

    now = datetime.utcnow()
    if user.transfer_pin_locked_until and user.transfer_pin_locked_until > now:
        retry_after = int((user.transfer_pin_locked_until - now).total_seconds())
        raise HTTPException(
            status_code=423,
            detail=f"Transfer PIN locked. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    if not verify_password(transfer_pin, user.transfer_pin):
        user.transfer_pin_failed_attempts = (user.transfer_pin_failed_attempts or 0) + 1
        if user.transfer_pin_failed_attempts >= MAX_FAILED_ATTEMPTS:
            user.transfer_pin_locked_until = now + LOCKOUT_DURATION
            await db.commit()
            retry_after = int(LOCKOUT_DURATION.total_seconds())
            raise HTTPException(
                status_code=423,
                detail=f"Transfer PIN locked. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )

        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid transfer PIN")

    if user.transfer_pin_failed_attempts or user.transfer_pin_locked_until:
        user.transfer_pin_failed_attempts = 0
        user.transfer_pin_locked_until = None
        await db.commit()


@router.post("/internal")
async def internal_transfer(
    request: InternalTransferRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Internal transfer between own accounts. Requires PIN."""
    await _ensure_user_active(db, user_id)
    from_account_check = await db.execute(
        select(Account).where(Account.id == request.from_account_id)
    )
    from_account_preview = from_account_check.scalar_one_or_none()
    if not from_account_preview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if from_account_preview.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if getattr(from_account_preview, "status", None) and from_account_preview.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Source account inactive")

    to_account_check = await db.execute(
        select(Account).where(Account.id == request.to_account_id)
    )
    to_account_preview = to_account_check.scalar_one_or_none()
    if not to_account_preview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination account not found")
    if to_account_preview.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    await _verify_transfer_pin(db, user_id, request.transfer_pin)

    transfer_id = str(uuid.uuid4())
    reference_number = str(uuid.uuid4())[:12].upper()
    fee_amount = 0.0
    total_amount = request.amount + fee_amount

    try:
        async with db.begin():
            from_account_result = await db.execute(
                select(Account)
                .where(Account.id == request.from_account_id)
                .with_for_update()
            )
            from_account = from_account_result.scalar_one_or_none()
            if not from_account:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

            to_account_result = await db.execute(
                select(Account)
                .where(Account.id == request.to_account_id)
                .with_for_update()
            )
            to_account = to_account_result.scalar_one_or_none()
            if not to_account:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination account not found")

            if from_account.currency != to_account.currency:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Currency mismatch between accounts",
                )

            if from_account.available_balance < total_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient funds",
                )

            from_account.balance -= total_amount
            from_account.available_balance -= total_amount
            from_account.updated_at = datetime.utcnow()

            to_account.balance += request.amount
            to_account.available_balance += request.amount
            to_account.updated_at = datetime.utcnow()

            new_transfer = Transfer(
                id=transfer_id,
                from_account_id=from_account.id,
                from_user_id=user_id,
                to_account_id=to_account.id,
                type=TransferType.INTERNAL,
                amount=request.amount,
                currency=from_account.currency,
                fee_amount=fee_amount,
                total_amount=total_amount,
                reference_number=reference_number,
                description=request.description or "Internal Transfer",
                status=TransferStatus.COMPLETED,
                processed_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
            db.add(new_transfer)

        return {
            "success": True,
            "data": {"transfer_id": transfer_id, "reference": reference_number},
            "message": "Internal transfer completed successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.add(
                Transfer(
                    id=transfer_id,
                    from_account_id=request.from_account_id,
                    from_user_id=user_id,
                    to_account_id=request.to_account_id,
                    type=TransferType.INTERNAL,
                    amount=request.amount,
                    currency=from_account_preview.currency,
                    fee_amount=fee_amount,
                    total_amount=total_amount,
                    reference_number=reference_number,
                    description=request.description or "Internal Transfer",
                    status=TransferStatus.FAILED,
                    created_at=datetime.utcnow(),
                )
            )
            await db.commit()
        except Exception:
            await db.rollback()

        logger.exception(
            "Internal transfer failed - transfer_id: %s, from_account: %s, to_account: %s, user_id: %s, amount: %s",
            transfer_id, request.from_account_id, request.to_account_id, user_id, request.amount
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error processing transfer",
        )


@router.post("/domestic")
async def domestic_transfer(
    request: DomesticTransferRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Domestic transfer to other accounts. Supports both account number and recipient name."""
    await _ensure_user_active(db, user_id)
    # Verify from account ownership and balance
    account_result = await db.execute(
        select(Account).where(Account.id == request.from_account_id)
    )
    from_account = account_result.scalar_one_or_none()
    if not from_account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source account not found")
    if from_account.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if getattr(from_account, "status", None) and from_account.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Source account inactive")
    
    # Handle recipient - prioritized name-based transfers with optional account number fallback
    to_account = None
    recipient_info = None
    
    if request.recipient_id:
        # Primary: Modern name-based transfer using recipient_id
        # First verify recipient exists and get their accounts
        recipient_result = await db.execute(
            select(User).where(User.id == request.recipient_id)
        )
        recipient_user = recipient_result.scalar_one_or_none()
        if not recipient_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")
        
        # Get recipient's primary account for transfer
        recipient_accounts = await db.execute(
            select(Account).where(
                Account.user_id == request.recipient_id,
                Account.is_primary == True
            )
        )
        to_account = recipient_accounts.scalar_one_or_none()
        if not to_account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient has no primary account")
        
        recipient_info = f"{recipient_user.first_name} {recipient_user.last_name}"
        
    elif request.to_account_id:
        # Fallback: Traditional account ID transfer (backward compatibility)
        to_account_result = await db.execute(
            select(Account).where(Account.id == request.to_account_id)
        )
        to_account = to_account_result.scalar_one_or_none()
        if not to_account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient account not found")
        
        recipient_info = f"Account ending in {to_account.account_number[-4:]}"
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="recipient_id is required for domestic transfers"
        )
    
    # Verify sufficient funds
    total_amount = request.amount + 2.50  # Include domestic transfer fee
    if from_account.balance < total_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient funds"
        )

    await _verify_transfer_pin(db, user_id, request.transfer_pin)
    new_transfer = Transfer(
        id=str(uuid.uuid4()),
        from_account_id=request.from_account_id,
        from_user_id=user_id,
        to_account_id=to_account.id,  # Use account ID, not account number
        type=TransferType.DOMESTIC,
        amount=request.amount,
        currency=from_account.currency,
        fee_amount=2.50,
        total_amount=request.amount + 2.50,
        reference_number=str(uuid.uuid4())[:12].upper(),
        description=request.description or "Domestic Transfer",
        status=TransferStatus.PROCESSING,
        created_at=datetime.utcnow(),
    )
    db.add(new_transfer)
    await db.commit()
    return {
        "success": True,
        "data": {"transfer_id": new_transfer.id, "reference": new_transfer.reference_number},
        "message": "Domestic transfer submitted",
    }


@router.post("/ach", response_model=TransferStatusUpdateResponse)
async def ach_transfer(
    request: ACHTransferRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """ACH transfer to external bank account. Requires PIN."""
    await _ensure_user_active(db, user_id)
    await _verify_transfer_pin(db, user_id, request.transfer_pin)
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
        if getattr(account, "status", None) and account.status != AccountStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Source account inactive")
        
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
    except Exception:
        logger.exception(
            "ACH transfer failed - user_id: %s, from_account: %s, amount: %s, account_holder: %s",
            user_id, request.from_account_id, request.amount, request.account_holder
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error processing transfer"
        )


@router.post("/wire", response_model=TransferStatusUpdateResponse)
async def wire_transfer(
    request: WireTransferRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Wire transfer to external bank account. Requires PIN."""
    await _ensure_user_active(db, user_id)
    await _verify_transfer_pin(db, user_id, request.transfer_pin)
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
    except Exception:
        logger.exception(
            "Wire transfer failed - user_id: %s, from_account: %s, amount: %s, currency: %s",
            user_id, request.from_account_id, request.amount, request.currency
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error processing transfer"
        )


@router.post("/international")
async def international_transfer(
    request: InternationalTransferRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """International wire transfer (SWIFT). Requires PIN."""
    await _ensure_user_active(db, user_id)
    account_result = await db.execute(
        select(Account).where(Account.id == request.from_account_id)
    )
    account = account_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if account.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if getattr(account, "status", None) and account.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Source account inactive")

    await _verify_transfer_pin(db, user_id, request.transfer_pin)
    new_transfer = Transfer(
        id=str(uuid.uuid4()),
        from_account_id=request.from_account_id,
        from_user_id=user_id,
        to_beneficiary_id=None,
        type=TransferType.INTERNATIONAL,
        amount=request.amount,
        currency="USD",
        fee_amount=25.00,
        total_amount=request.amount + 25.00,
        reference_number=str(uuid.uuid4())[:12].upper(),
        description=request.purpose or "International Transfer",
        status=TransferStatus.PENDING,
        requires_mfa=True,
        created_at=datetime.utcnow(),
    )
    db.add(new_transfer)
    await db.commit()
    return {
        "success": True,
        "data": {"transfer_id": new_transfer.id, "reference": new_transfer.reference_number},
        "message": "International transfer submitted for approval",
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
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get transfer history. Requires auth."""
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
async def get_beneficiaries(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get saved beneficiaries. Requires auth."""
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
    user_id: str = Depends(get_current_user_id),
    name: str = Query(...),
    account_number: str = Query(...),
    transfer_type: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Add new beneficiary. Requires auth."""
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
