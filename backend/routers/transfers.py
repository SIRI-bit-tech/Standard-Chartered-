from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from models.transfer import Transfer, TransferStatus, TransferType, Beneficiary
from models.bill_payment import BillPayment, BillPayee
from models.account import Account, AccountStatus
from models.user import User
from models.transaction import Transaction, TransactionType as TxType, TransactionStatus as TxStatus
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
import httpx
import asyncio
from database import AsyncSessionLocal

router = APIRouter(tags=["transfers"])

logger = logging.getLogger(__name__)

_background_tasks: set[asyncio.Task] = set()

def _schedule_auto_complete(transfer_id: str, delay_seconds: int = 120) -> None:
    task = asyncio.create_task(_auto_complete_transfer(transfer_id, delay_seconds))
    _background_tasks.add(task)
    def _done_callback(t: asyncio.Task) -> None:
        _background_tasks.discard(t)
        try:
            t.result()
        except Exception:
            logger.exception("Background auto-complete task failed")
    task.add_done_callback(_done_callback)

async def _auto_complete_transfer(transfer_id: str, delay_seconds: int = 120):
    """Automatically complete a transfer after a delay.
    Marks withdrawal tx as COMPLETED and credits recipient account if applicable."""
    try:
        await asyncio.sleep(delay_seconds)
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Transfer).where(Transfer.id == transfer_id))
            transfer = result.scalar_one_or_none()
            if not transfer:
                return
            if transfer.status not in (TransferStatus.PROCESSING, TransferStatus.PENDING):
                return
            transfer.status = TransferStatus.COMPLETED
            transfer.processed_at = datetime.utcnow()
            # Complete any linked withdrawal transactions
            tx_res = await session.execute(
                select(Transaction).where(
                    Transaction.transfer_id == transfer.id,
                    Transaction.type.in_([TxType.WITHDRAWAL, TxType.DEBIT, TxType.PAYMENT, TxType.FEE])
                )
            )
            for t in tx_res.scalars().all():
                t.status = TxStatus.COMPLETED
                t.updated_at = datetime.utcnow()
            # Credit recipient if to_account_id exists
            if getattr(transfer, "to_account_id", None):
                acc_res = await session.execute(
                    select(Account).where(Account.id == transfer.to_account_id).with_for_update()
                )
                to_acc = acc_res.scalar_one_or_none()
                if to_acc:
                    before = to_acc.balance
                    to_acc.balance = (to_acc.balance or 0.0) + transfer.amount
                    to_acc.available_balance = (to_acc.available_balance or 0.0) + transfer.amount
                    to_acc.updated_at = datetime.utcnow()
                    deposit_tx = Transaction(
                        id=str(uuid.uuid4()),
                        account_id=to_acc.id,
                        user_id=to_acc.user_id,
                        type=TxType.DEPOSIT,
                        status=TxStatus.COMPLETED,
                        amount=transfer.amount,
                        currency=transfer.currency,
                        balance_before=before,
                        balance_after=to_acc.balance,
                        description="Incoming transfer",
                        reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
                        transfer_id=transfer.id,
                        created_at=datetime.utcnow(),
                    )
                    session.add(deposit_tx)
            await session.commit()
            try:
                AblyRealtimeManager.publish_transfer_status(
                    transfer.from_user_id,
                    transfer.id,
                    "completed",
                    {"amount": transfer.amount, "currency": transfer.currency},
                )
            except Exception:
                pass
    except Exception:
        logger.exception("Auto-complete transfer failed for %s", transfer_id)

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


@router.get("/validate-routing")
async def validate_routing_number(number: str = Query(..., min_length=9, max_length=9)):
    """Validate routing number using an authoritative directory and return bank name if found."""
    try:
        if not number.isdigit() or len(number) != 9:
            return {"valid": False}
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"https://bankrouting.io/api/v1/aba/{number}")
        if resp.status_code != 200:
            return {"valid": False}
        payload = resp.json()
        if payload.get("status") == "success" and payload.get("data", {}).get("bank_name"):
            bank_name = str(payload["data"]["bank_name"]).strip()
            return {"valid": True, "bank_name": bank_name}
        return {"valid": False}
    except Exception:
        logger.exception("Routing number validation error")
        # Return generic false instead of raising server error for cleaner UX
        return {"valid": False}


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

            from_balance_before = from_account.balance
            to_balance_before = to_account.balance
            from_account.balance = from_balance_before - total_amount
            from_account.available_balance = from_account.available_balance - total_amount
            from_account.updated_at = datetime.utcnow()

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
                status=TransferStatus.PROCESSING,
                requires_mfa="false",
                created_at=datetime.utcnow(),
            )
            db.add(new_transfer)
            
            from_tx = Transaction(
                id=str(uuid.uuid4()),
                account_id=from_account.id,
                user_id=user_id,
                type=TxType.WITHDRAWAL,
                status=TxStatus.PROCESSING,
                amount=total_amount,
                currency=from_account.currency,
                balance_before=from_balance_before,
                balance_after=from_account.balance,
                description="Internal transfer to own account",
                reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
                transfer_id=new_transfer.id,
                created_at=datetime.utcnow(),
            )
            db.add(from_tx)

        # Schedule auto-completion in ~2 minutes
        _schedule_auto_complete(transfer_id, 120)

        return {
            "success": True,
            "data": {"transfer_id": transfer_id, "reference": reference_number},
            "message": "Internal transfer is processing",
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
    # Debit immediately and create processing ledger
    transfer_id = str(uuid.uuid4())
    reference = str(uuid.uuid4())[:12].upper()
    from_before = from_account.balance
    from_account.balance = from_account.balance - total_amount
    from_account.available_balance = from_account.available_balance - total_amount
    from_account.updated_at = datetime.utcnow()
    new_transfer = Transfer(
        id=transfer_id,
        from_account_id=request.from_account_id,
        from_user_id=user_id,
        to_account_id=to_account.id,
        type=TransferType.DOMESTIC,
        amount=request.amount,
        currency=from_account.currency,
        fee_amount=2.50,
        total_amount=total_amount,
        reference_number=reference,
        # Persist recipient name for history
        description=recipient_info,
        status=TransferStatus.PROCESSING,
        requires_mfa="false",
        created_at=datetime.utcnow(),
    )
    db.add(new_transfer)
    tx = Transaction(
        id=str(uuid.uuid4()),
        account_id=from_account.id,
        user_id=user_id,
        type=TxType.WITHDRAWAL,
        status=TxStatus.PROCESSING,
        amount=total_amount,
        currency=from_account.currency,
        balance_before=from_before,
        balance_after=from_account.balance,
        description=f"Domestic transfer to {recipient_info}",
        reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
        transfer_id=new_transfer.id,
        created_at=datetime.utcnow(),
    )
    db.add(tx)
    await db.commit()
    # Auto-complete
    _schedule_auto_complete(transfer_id, 120)
    return {
        "success": True,
        "data": {"transfer_id": transfer_id, "reference": reference},
        "message": "Domestic transfer is processing",
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
        # Authoritative routing number lookup + bank name match
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"https://bankrouting.io/api/v1/aba/{request.routing_number}")
        except Exception:
            logger.exception("Authoritative routing lookup failed during ACH")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid routing number")
        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid routing number")
        payload = resp.json()
        directory_name = (payload.get("data") or {}).get("bank_name")
        if payload.get("status") != "success" or not directory_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid routing number")
        def _norm(s: str) -> str:
            s2 = s.lower().replace("&", "and")
            # collapse whitespace and remove common punctuation
            import re
            s2 = re.sub(r"[^\w\s]", " ", s2)
            s2 = re.sub(r"\s+", " ", s2).strip()
            return s2
        if _norm(request.bank_name) != _norm(directory_name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bank name does not match routing number",
            )

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
        if account.available_balance < request.amount:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient funds")
        
        balance_before = account.balance
        account.balance = account.balance - request.amount
        account.available_balance = account.available_balance - request.amount
        account.updated_at = datetime.utcnow()
        # Persist useful receipt details in available fields (no schema change)
        # - to_account_number stores recipient account number
        # - description encodes "recipient_name | bank_name" for later parsing
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
            description=f"{request.account_holder.strip()} | {request.bank_name.strip()}",
            status=TransferStatus.PROCESSING,
            requires_mfa="false",
            created_at=datetime.utcnow(),
            to_account_number=request.account_number,
        )
        
        db.add(new_transfer)
        tx = Transaction(
            id=str(uuid.uuid4()),
            account_id=account.id,
            user_id=user_id,
            type=TxType.WITHDRAWAL,
            status=TxStatus.PROCESSING,
            amount=request.amount,
            currency=account.currency,
            balance_before=balance_before,
            balance_after=account.balance,
            description="ACH transfer initiated",
            reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
            transfer_id=new_transfer.id,
            created_at=datetime.utcnow(),
        )
        db.add(tx)
        await db.commit()
        await db.refresh(new_transfer)
        
        # Auto-complete this transfer in ~2 minutes
        asyncio.create_task(_auto_complete_transfer(new_transfer.id, 120))
        
        AblyRealtimeManager.publish_notification(
            user_id,
            "ach_transfer",
            "ACH Transfer Initiated",
            f"ACH transfer of ${request.amount} initiated. Processing typically takes 3-5 business days."
        )
        
        return {
            "success": True,
            "transfer_id": new_transfer.id,
            "status": "processing",
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
        
        # Debit immediately and mark processing
        total_amount = request.amount + 35.00
        available = account.available_balance if account.available_balance is not None else (account.balance or 0.0)
        if available < total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient funds"
            )
        before = account.balance
        account.balance = (account.balance or 0.0) - total_amount
        account.available_balance = (account.available_balance or 0.0) - total_amount
        account.updated_at = datetime.utcnow()
        new_transfer = Transfer(
            id=str(uuid.uuid4()),
            from_account_id=request.from_account_id,
            from_user_id=user_id,
            type=TransferType.WIRE,
            amount=request.amount,
            currency=request.currency,
            fee_amount=35.00,
            total_amount=total_amount,
            reference_number=f"WIRE-{uuid.uuid4().hex[:12].upper()}",
            # Persist "recipient | bank" for display
            description=f"{request.account_holder.strip()} | {request.bank_name.strip()}",
            status=TransferStatus.PROCESSING,
            requires_mfa="false",
            created_at=datetime.utcnow()
        )
        db.add(new_transfer)
        tx = Transaction(
            id=str(uuid.uuid4()),
            account_id=account.id,
            user_id=user_id,
            type=TxType.WITHDRAWAL,
            status=TxStatus.PROCESSING,
            amount=total_amount,
            currency=request.currency,
            balance_before=before,
            balance_after=account.balance,
            description="Wire transfer initiated",
            reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
            transfer_id=new_transfer.id,
            created_at=datetime.utcnow(),
        )
        db.add(tx)
        await db.commit()
        await db.refresh(new_transfer)
        
        # Auto-complete
        _schedule_auto_complete(new_transfer.id, 120)
        
        AblyRealtimeManager.publish_notification(
            user_id,
            "wire_transfer",
            "Wire Transfer Initiated",
            f"Wire transfer of {request.currency} {request.amount} submitted for approval."
        )
        
        return {
            "success": True,
            "transfer_id": new_transfer.id,
            "status": "processing",
            "message": "Wire transfer is processing"
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
    # Debit immediately and create processing ledger
    total_amount = request.amount + 25.00
    available = account.available_balance if account.available_balance is not None else (account.balance or 0.0)
    if available < total_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient funds"
        )
    before = account.balance
    account.balance = (account.balance or 0.0) - total_amount
    account.available_balance = (account.available_balance or 0.0) - total_amount
    account.updated_at = datetime.utcnow()
    transfer_id = str(uuid.uuid4())
    reference = str(uuid.uuid4())[:12].upper()
    new_transfer = Transfer(
        id=transfer_id,
        from_account_id=request.from_account_id,
        from_user_id=user_id,
        to_beneficiary_id=None,
        type=TransferType.INTERNATIONAL,
        amount=request.amount,
        currency="USD",
        fee_amount=25.00,
        total_amount=total_amount,
        reference_number=reference,
        # Encode "recipient_name | bank_name" for display in history/receipt
        description=f"{request.beneficiary_name.strip()} | {request.beneficiary_bank_name.strip()}",
        status=TransferStatus.PROCESSING,
        requires_mfa="false",
        created_at=datetime.utcnow(),
    )
    db.add(new_transfer)
    tx = Transaction(
        id=str(uuid.uuid4()),
        account_id=account.id,
        user_id=user_id,
        type=TxType.WITHDRAWAL,
        status=TxStatus.PROCESSING,
        amount=total_amount,
        currency="USD",
        balance_before=before,
        balance_after=account.balance,
        description="International transfer initiated",
        reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
        transfer_id=new_transfer.id,
        created_at=datetime.utcnow(),
    )
    db.add(tx)
    await db.commit()
    _schedule_auto_complete(transfer_id, 120)
    return {
        "success": True,
        "data": {"transfer_id": transfer_id, "reference": reference},
        "message": "International transfer is processing",
    }

@router.get("/history")
async def get_transfer_history(
    user_id: str = Depends(get_current_user_id),
    q: str = Query("", max_length=100),
    period: str = Query("30", pattern="^(30|90|all)$"),
    type: str = Query("all"),
    status: str = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=5, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Unified transfer history built from transaction ledger.
    Returns items across user accounts with metrics and pagination."""
    # Load all accounts for the user
    accounts_result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = {a.id: a for a in accounts_result.scalars().all()}
    if not accounts:
        return {"success": True, "data": {"items": [], "total": 0, "page": page, "page_size": page_size,
                                          "metrics": {"sent_monthly": 0.0, "sent_count": 0, "received_monthly": 0.0, "received_count": 0, "pending_amount": 0.0, "pending_count": 0}},
                "message": "Transfer history retrieved"}
    
    # Fetch transactions for these accounts
    tx_result = await db.execute(
        select(Transaction).where(Transaction.account_id.in_(list(accounts.keys()))).order_by(Transaction.created_at.desc())
    )
    transactions = list(tx_result.scalars().all())
    
    # Apply in-memory filters (sufficient for demo and small datasets)
    q_lower = q.strip().lower()
    if period != "all":
        days = int(period)
        cutoff = datetime.utcnow() - timedelta(days=days)
        transactions = [t for t in transactions if t.created_at >= cutoff]
    if type != "all":
        try:
            tx_type = getattr(TxType, type.upper())
            transactions = [t for t in transactions if t.type == tx_type]
        except Exception:
            transactions = [t for t in transactions if False]
    if status != "all":
        try:
            tx_status = getattr(TxStatus, status.upper())
            transactions = [t for t in transactions if t.status == tx_status]
        except Exception:
            transactions = [t for t in transactions if False]
    if q_lower:
        safe_filtered = []
        for t in transactions:
            acct = accounts.get(t.account_id)
            desc = (t.description or "").lower()
            ref = (getattr(t, "reference_number", None) or "").lower()
            acc_num = ((acct.account_number if acct else "") or "").lower()
            if q_lower in desc or q_lower in ref or q_lower in acc_num:
                safe_filtered.append(t)
        transactions = safe_filtered
    
    total = len(transactions)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = transactions[start:end]
    
    # Metrics for current month
    first_day_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_txs = [t for t in transactions if t.created_at >= first_day_month]
    def is_debit(t: Transaction) -> bool:
        return t.type in (TxType.DEBIT, TxType.WITHDRAWAL, TxType.FEE, TxType.PAYMENT, TxType.TRANSFER) and t.amount > 0
    def is_credit(t: Transaction) -> bool:
        return t.type in (TxType.CREDIT, TxType.DEPOSIT, TxType.INTEREST) and t.amount > 0
    sent_monthly = sum(t.amount for t in month_txs if is_debit(t))
    received_monthly = sum(t.amount for t in month_txs if is_credit(t))
    pending_amount = sum(t.amount for t in transactions if t.status in (TxStatus.PENDING, TxStatus.PROCESSING))
    
    def mask_account(acc: Account) -> str:
        if not acc or not acc.account_number:
            return ""
        return f"...{acc.account_number[-4:]} ({acc.nickname or acc.account_type.value.title()})"
    
    # Batch load transfers related to current page for counterparty or metadata resolution
    transfer_ids = [getattr(t, "transfer_id", None) for t in page_items if getattr(t, "transfer_id", None)]
    transfer_map = {}
    if transfer_ids:
        tr_res = await db.execute(select(Transfer).where(Transfer.id.in_(transfer_ids)))
        transfer_map = {tr.id: tr for tr in tr_res.scalars().all()}
    # Batch load bill payments for payment-linked transactions
    payment_ids = [getattr(t, "payment_id", None) for t in page_items if getattr(t, "payment_id", None)]
    bill_map = {}
    payee_map = {}
    if payment_ids:
        bp_res = await db.execute(select(BillPayment).where(BillPayment.id.in_(payment_ids)))
        bill_map = {bp.id: bp for bp in bp_res.scalars().all()}
        payee_ids = [bp.payee_id for bp in bill_map.values()]
        if payee_ids:
            py_res = await db.execute(select(BillPayee).where(BillPayee.id.in_(payee_ids)))
            payee_map = {py.id: py for py in py_res.scalars().all()}
    # Batch load accounts for transfer endpoints
    to_ids = [tr.to_account_id for tr in transfer_map.values() if getattr(tr, "to_account_id", None)]
    from_ids = [tr.from_account_id for tr in transfer_map.values() if getattr(tr, "from_account_id", None)]
    acc_ids = list({*(to_ids or []), *(from_ids or [])})
    acc_map = {}
    if acc_ids:
        acc_res = await db.execute(select(Account).where(Account.id.in_(acc_ids)))
        acc_map = {a.id: a for a in acc_res.scalars().all()}
    # Batch load users for those accounts
    user_ids = list({a.user_id for a in acc_map.values()})
    user_map = {}
    if user_ids:
        u_res = await db.execute(select(User).where(User.id.in_(user_ids)))
        user_map = {u.id: u for u in u_res.scalars().all()}
    # Resolve current user's display name (sender label for debits)
    my_display_name = None
    me = user_map.get(user_id)
    if me:
        full = f"{getattr(me, 'first_name', '')} {getattr(me, 'last_name', '')}".strip()
        my_display_name = full or getattr(me, "username", None) or "Sender"

    def type_label(tr_type) -> str:
        try:
            tval = tr_type.value if hasattr(tr_type, "value") else str(tr_type)
        except Exception:
            tval = str(tr_type)
        return {
            "internal": "Internal Transfer",
            "domestic": "Domestic Transfer",
            "international": "International Transfer",
            "ach": "ACH Transfer",
            "wire": "Wire Transfer",
            "loan": "Loan Disbursement",
        }.get(tval, tval.title())

    items = []
    for t in page_items:
        acc = accounts.get(t.account_id)
        direction = "debit" if is_debit(t) else "credit"
        # Resolve counterparty based on transfer linkage
        tr = transfer_map.get(getattr(t, "transfer_id", None))
        counterparty = None
        subtitle = None
        bank_name = None
        if tr:
            subtitle = type_label(getattr(tr, "type", None))
            if direction == "debit":
                # Outgoing: show the actual sender (current user)
                counterparty = my_display_name or "Sender"
            else:
                # Incoming: show sender
                src_acc = acc_map.get(getattr(tr, "from_account_id", None))
                if src_acc:
                    if src_acc.user_id == user_id:
                        counterparty = src_acc.nickname or f"Own {getattr(src_acc.account_type, 'value', str(src_acc.account_type)).title()} Account"
                    else:
                        u = user_map.get(src_acc.user_id)
                        if u:
                            full_name = f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip()
                            counterparty = full_name or u.username or "Sender"
                else:
                    # For external incoming, prefer sender name from description if encoded "name | bank"
                    name = None
                    try:
                        if getattr(tr, "description", None) and "|" in tr.description:
                            parts = [p.strip() for p in tr.description.split("|", 1)]
                            name = parts[0] if parts else None
                            if len(parts) == 2:
                                bank_name = parts[1]
                    except Exception:
                        name = None
                    counterparty = name or tr.description or "External Bank"
            # Extract recipient bank from encoded "name | bank" where applicable
            if not bank_name:
                try:
                    if getattr(tr, "description", None) and "|" in str(tr.description):
                        parts = [p.strip() for p in str(tr.description).split("|", 1)]
                        if len(parts) == 2:
                            bank_name = parts[1]
                except Exception:
                    bank_name = None
        # If this is a bill payment, prefer payee name and 'Bill Payment'
        if not counterparty and getattr(t, "payment_id", None):
            bp = bill_map.get(getattr(t, "payment_id"))
            if bp:
                payee = payee_map.get(getattr(bp, "payee_id", None))
                if payee:
                    counterparty = payee.name
                    subtitle = "Bill Payment"
                    bank_name = getattr(payee, "category", None)

        # Fallbacks if no transfer/bill link
        if not counterparty:
            if t.description:
                counterparty = t.description
            else:
                counterparty = "External Bank" if direction == "debit" else "Incoming Transfer"
        items.append({
            "id": t.id,
            "date": t.created_at.isoformat(),
            "counterparty": counterparty,
            "subtitle": subtitle or ("Credit" if direction == "credit" else "Debit"),
            "bank_name": bank_name,
            "reference": t.reference_number,
            "account_masked": mask_account(acc),
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "amount": t.amount if direction == "credit" else -t.amount,
            "currency": t.currency,
            "direction": direction,
            "transfer_id": getattr(t, "transfer_id", None),
        })
    
    return {
        "success": True,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "metrics": {
                "sent_monthly": sent_monthly,
                "sent_count": len([t for t in month_txs if is_debit(t)]),
                "received_monthly": received_monthly,
                "received_count": len([t for t in month_txs if is_credit(t)]),
                "pending_amount": pending_amount,
                "pending_count": len([t for t in transactions if t.status in (TxStatus.PENDING, TxStatus.PROCESSING)]),
            }
        },
        "message": "Transfer history retrieved"
    }


@router.get("/{transfer_id}")
async def get_transfer(
    transfer_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get rich transfer receipt details for UI/printing."""
    result = await db.execute(select(Transfer).where(Transfer.id == transfer_id))
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    # Authorization: allow only participants to view (sender or recipient owner)
    if getattr(transfer, "from_user_id", None) != user_id:
        allowed = False
        if getattr(transfer, "to_account_id", None):
            to_check = await db.execute(select(Account).where(Account.id == transfer.to_account_id))
            to_owner = to_check.scalar_one_or_none()
            if to_owner and getattr(to_owner, "user_id", None) == user_id:
                allowed = True
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    
    from_acc = None
    to_acc = None
    if getattr(transfer, "from_account_id", None):
        fr = await db.execute(select(Account).where(Account.id == transfer.from_account_id))
        from_acc = fr.scalar_one_or_none()
    if getattr(transfer, "to_account_id", None):
        tr = await db.execute(select(Account).where(Account.id == transfer.to_account_id))
        to_acc = tr.scalar_one_or_none()
    
    def mask_account(acc: Account | None) -> str | None:
        if not acc:
            return None
        last4 = acc.account_number[-4:] if getattr(acc, "account_number", None) else "—"
        acc_label = acc.account_type.value if hasattr(acc.account_type, "value") else str(acc.account_type)
        return f"{acc_label.title()} Account (**** {last4})"
    
    recipient_name = None
    recipient_bank = None
    recipient_account_masked = None
    # Best-effort: infer from available fields
    if to_acc:
        recipient_name = "Own Account" if from_acc and to_acc and from_acc.user_id == to_acc.user_id else "Recipient Account"
        recipient_account_masked = mask_account(to_acc)
    elif getattr(transfer, "to_account_number", None):
        num = transfer.to_account_number
        recipient_account_masked = f"Account (**** {num[-4:]})"
    # Try to infer bank and recipient from encoded description "name | bank" for external transfers
    try:
        if transfer.description and "|" in str(transfer.description):
            parts = [p.strip() for p in str(transfer.description).split("|", 1)]
            if len(parts) == 2:
                recipient_name = recipient_name or (parts[0] or None)
                recipient_bank = recipient_bank or (parts[1] or None)
    except Exception:
        pass
    
    data = {
        "id": transfer.id,
        "type": transfer.type.value if hasattr(transfer.type, "value") else str(transfer.type),
        "status": transfer.status.value if hasattr(transfer.status, "value") else str(transfer.status),
        "amount": transfer.amount,
        "currency": transfer.currency,
        "fee_amount": getattr(transfer, "fee_amount", 0.0) or 0.0,
        "total_amount": getattr(transfer, "total_amount", None) or (transfer.amount + (getattr(transfer, "fee_amount", 0.0) or 0.0)),
        "reference_number": transfer.reference_number,
        "created_at": transfer.created_at.isoformat() if transfer.created_at else None,
        "processed_at": transfer.processed_at.isoformat() if getattr(transfer, "processed_at", None) else None,
        "from_account_masked": mask_account(from_acc),
        "recipient_bank": recipient_bank,
        "recipient_name": recipient_name,
        "recipient_account_masked": recipient_account_masked,
        "description": transfer.description,
    }
    
    return {"success": True, "data": data, "message": "Transfer details retrieved"}



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
