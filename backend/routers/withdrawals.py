from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import uuid
import logging

from database import get_db
from models.account import Account, AccountStatus
from models.user import User
from models.transaction import Transaction, TransactionType as TxType, TransactionStatus as TxStatus
from models.transfer import Transfer, TransferStatus, TransferType
from schemas.transfer import TransferStatusUpdateResponse
from utils.auth import get_current_user_id, verify_password

from schemas.pin_policy import validate_transfer_pin_strength
from pydantic import BaseModel, Field, validator
from utils.crypto import get_bitcoin_price

from routers.transfers import _schedule_auto_complete

logger = logging.getLogger(__name__)


class InternalWithdrawRequest(BaseModel):
    """Withdraw between own accounts (current, savings, etc)."""
    transfer_pin: str = Field(..., pattern=r"^\d{4}$", description="4-digit transfer PIN")
    from_account_id: str
    to_account_id: str
    amount: float = Field(..., gt=0)
    description: str | None = Field(None, max_length=200)

    @validator("transfer_pin")
    def _validate_transfer_pin_strength(cls, v: str) -> str:
        return validate_transfer_pin_strength(v)


MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(hours=1)


async def _ensure_user_active(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from utils.errors import NotFoundError
        raise NotFoundError(message="User not found")
    if not user.is_active:
        from utils.errors import UnauthorizedError
        raise UnauthorizedError(message="Account suspended")


async def _verify_transfer_pin(db: AsyncSession, user_id: str, transfer_pin: str) -> None:
    """Verify user's transfer PIN; raises HTTPException/APIError if invalid."""
    result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        from utils.errors import NotFoundError
        raise NotFoundError(message="User not found")
    if not user.transfer_pin:
        from utils.errors import ValidationError
        raise ValidationError(
            message="Transfer PIN not set. Please set your PIN first.",
            details={"field": "transfer_pin"},
        )

    now = datetime.utcnow()
    if user.transfer_pin_locked_until and user.transfer_pin_locked_until > now:
        retry_after = int((user.transfer_pin_locked_until - now).total_seconds())
        from utils.errors import APIError
        raise APIError(
            status_code=423,
            message=f"Transfer PIN locked. Try again in {retry_after} seconds.",
            error_code="PIN_LOCKED",
            details={"field": "transfer_pin", "retry_after": retry_after},
        )

    if not verify_password(transfer_pin, user.transfer_pin):
        user.transfer_pin_failed_attempts = (user.transfer_pin_failed_attempts or 0) + 1
        if user.transfer_pin_failed_attempts >= MAX_FAILED_ATTEMPTS:
            user.transfer_pin_locked_until = now + LOCKOUT_DURATION
            await db.commit()
            retry_after = int(LOCKOUT_DURATION.total_seconds())
            from utils.errors import APIError
            raise APIError(
                status_code=423,
                message=f"Transfer PIN locked. Try again in {retry_after} seconds.",
                error_code="PIN_LOCKED",
                details={"field": "transfer_pin", "retry_after": retry_after},
            )

        await db.commit()
        from utils.errors import ValidationError
        raise ValidationError(
            message="Invalid transfer PIN",
            details={"field": "transfer_pin"},
        )

    if user.transfer_pin_failed_attempts or user.transfer_pin_locked_until:
        user.transfer_pin_failed_attempts = 0
        user.transfer_pin_locked_until = None
        await db.commit()


router = APIRouter(tags=["Withdrawals"])


@router.post(
    "/internal",
    response_model=TransferStatusUpdateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def internal_withdraw(
    request: InternalWithdrawRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Move money between the user's own accounts (current, savings, crypto).
    Supports real-time conversion if one account is crypto.
    """
    await _ensure_user_active(db, user_id)

    from_preview_res = await db.execute(
        select(Account).where(Account.id == request.from_account_id)
    )
    from_account_preview = from_preview_res.scalar_one_or_none()
    if not from_account_preview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source account not found")
    if from_account_preview.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if getattr(from_account_preview, "status", None) and from_account_preview.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Source account inactive")

    to_preview_res = await db.execute(
        select(Account).where(Account.id == request.to_account_id)
    )
    to_account_preview = to_preview_res.scalar_one_or_none()
    if not to_account_preview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination account not found")
    if to_account_preview.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    await _verify_transfer_pin(db, user_id, request.transfer_pin)

    # If cross-currency (crypto involved), get current price
    is_conversion = from_account_preview.currency != to_account_preview.currency
    btc_price = 0.0
    
    if is_conversion:
        btc_price = await get_bitcoin_price()

    transfer_id = str(uuid.uuid4())
    reference_number = str(uuid.uuid4())[:12].upper()
    fee_amount = 0.0
    
    # The 'amount' in request is in the currency of the FROM account
    debit_amount = request.amount
    credit_amount = request.amount
    
    if is_conversion:
        if from_account_preview.currency == "BTC":
            # Crypto -> Fiat
            credit_amount = debit_amount * btc_price
        else:
            # Fiat -> Crypto
            credit_amount = debit_amount / btc_price

    total_debit = debit_amount + fee_amount

    try:
        # Note: A transaction is likely already begun by the previous executes
        # If we want to ensure isolation, we could use begin_nested() or just commit() at the end
        
        from_account_res = await db.execute(
            select(Account)
            .where(Account.id == request.from_account_id)
            .with_for_update()
        )
        from_account = from_account_res.scalar_one_or_none()
        
        to_account_res = await db.execute(
            select(Account)
            .where(Account.id == request.to_account_id)
            .with_for_update()
        )
        to_account = to_account_res.scalar_one_or_none()

        if not from_account or not to_account:
             raise HTTPException(status_code=404, detail="Account not found")

        if (from_account.available_balance or 0.0) < total_debit:
            from utils.errors import ValidationError
            raise ValidationError(
                message="Insufficient funds",
                details={"field": "amount"},
            )

        # Record balances
        from_before = from_account.balance or 0.0
        to_before = to_account.balance or 0.0
        
        # Update balances
        from_account.balance = from_before - total_debit
        from_account.available_balance = (from_account.available_balance or 0.0) - total_debit
        from_account.updated_at = datetime.utcnow()
        
        to_account.balance = to_before + credit_amount
        to_account.available_balance = (to_account.available_balance or 0.0) + credit_amount
        to_account.updated_at = datetime.utcnow()

        description = request.description or f"Transfer to {to_account.account_type.value} account"
        if is_conversion:
            description = f"Currency conversion ({from_account.currency} to {to_account.currency})"

        new_transfer = Transfer(
            id=transfer_id,
            from_account_id=from_account.id,
            from_user_id=user_id,
            to_account_id=to_account.id,
            type=TransferType.INTERNAL,
            amount=credit_amount, # Recipient receives this
            currency=to_account.currency,
            fee_amount=fee_amount,
            total_amount=total_debit, # Sender pays this
            reference_number=reference_number,
            description=description,
            status=TransferStatus.COMPLETED,
            requires_mfa="false",
            created_at=datetime.utcnow(),
            processed_at=datetime.utcnow(),
        )
        db.add(new_transfer)

        # Source Transaction
        from_tx = Transaction(
            id=str(uuid.uuid4()),
            account_id=from_account.id,
            user_id=user_id,
            type=TxType.WITHDRAWAL,
            status=TxStatus.COMPLETED,
            amount=total_debit,
            currency=from_account.currency,
            balance_before=from_before,
            balance_after=from_account.balance,
            description=description,
            reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
            transfer_id=new_transfer.id,
            created_at=datetime.utcnow(),
        )
        db.add(from_tx)
        
        # Destination Transaction
        to_tx = Transaction(
            id=str(uuid.uuid4()),
            account_id=to_account.id,
            user_id=user_id,
            type=TxType.DEPOSIT,
            status=TxStatus.COMPLETED,
            amount=credit_amount,
            currency=to_account.currency,
            balance_before=to_before,
            balance_after=to_account.balance,
            description=description,
            reference_number=f"TX-{uuid.uuid4().hex[:12].upper()}",
            transfer_id=new_transfer.id,
            created_at=datetime.utcnow(),
        )
        db.add(to_tx)
        
        await db.commit()

        return TransferStatusUpdateResponse(
            success=True,
            transfer_id=transfer_id,
            status=TransferStatus.COMPLETED.value,
            message="Transfer completed successfully",
        )
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Internal conversion failed: %s", str(e))
        
        # Try to record a failed transfer log separately
        try:
            async with AsyncSessionLocal() as fail_db:
                fail_transfer = Transfer(
                    id=transfer_id,
                    from_account_id=request.from_account_id,
                    from_user_id=user_id,
                    to_account_id=request.to_account_id,
                    type=TransferType.INTERNAL,
                    amount=request.amount,
                    currency=from_account_preview.currency,
                    fee_amount=fee_amount,
                    total_amount=total_debit,
                    reference_number=reference_number,
                    description=request.description or "Internal account transfer",
                    status=TransferStatus.FAILED,
                    created_at=datetime.utcnow(),
                )
                fail_db.add(fail_transfer)
                await fail_db.commit()
        except:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing internal conversion",
        )

