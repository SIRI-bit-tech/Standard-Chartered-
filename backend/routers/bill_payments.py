from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.bill_payment import BillPayee, BillPayment, ScheduledPayment, BillPaymentStatus
from models.account import Account
from models.transaction import Transaction, TransactionType as TxType, TransactionStatus as TxStatus
from models.user import User
from database import get_db
import uuid
from datetime import datetime
from utils.auth import get_current_user_id
from routers.transfers import _verify_transfer_pin
from catalog.global_billers import query_catalog as global_query_catalog, find_entry_by_code
from pydantic import BaseModel

router = APIRouter()

_BILLER_CATALOG = None

@router.get("/payees")
async def get_bill_payees(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get bill payees"""
    result = await db.execute(
        select(BillPayee)
        .where((BillPayee.user_id == current_user_id) & (BillPayee.is_active == True))
    )
    payees = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "account_number": p.account_number
            }
            for p in payees
        ],
        "message": "Payees retrieved"
    }

@router.get("/catalog")
async def get_payee_catalog(
    category: str | None = Query(None),
    q: str | None = Query(None),
    country: str | None = Query(None),
):
    items = global_query_catalog(category=category, q=q, country=country)
    return {"success": True, "data": items, "message": "Biller catalog retrieved"}

class ImportFromCatalog(BaseModel):
    payee_code: str
    customer_account: str


class PayBillRequest(BaseModel):
    account_id: str
    payee_id: str
    amount: float
    payment_date: str
    reference: str | None = None
    transfer_pin: str | None = None

@router.post("/payees/import-from-catalog")
async def import_payee_from_catalog(
    req: ImportFromCatalog | None = None,
    payee_code: str | None = Query(None),
    customer_account: str | None = Query(None),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    code = (req.payee_code if req and getattr(req, "payee_code", None) else payee_code)
    acct = (req.customer_account if req and getattr(req, "customer_account", None) else customer_account)
    if not code:
        raise HTTPException(status_code=422, detail="payee_code required")
    if not acct or len(acct.strip()) < 3:
        raise HTTPException(status_code=422, detail="customer_account required")
    entry = find_entry_by_code(code)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catalog payee not found")
    code = entry.get("payee_code") or code
    new_payee = BillPayee(
        id=str(uuid.uuid4()),
        user_id=current_user_id,
        name=entry.get("name"),
        payee_code=entry.get("payee_code"),
        account_number=acct.strip(),
        category=entry.get("category"),
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_payee)
    await db.commit()
    return {
        "success": True,
        "data": {
            "id": new_payee.id,
            "name": new_payee.name,
            "category": new_payee.category,
            "account_number": new_payee.account_number,
            "payee_code": new_payee.payee_code,
        },
        "message": "Payee added from catalog"
    }


@router.post("/payees")
async def add_bill_payee(
    name: str,
    account_number: str,
    category: str = None,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Add new bill payee"""
    new_payee = BillPayee(
        id=str(uuid.uuid4()),
        user_id=current_user_id,
        name=name,
        account_number=account_number,
        category=category,
        is_active=True,
        created_at=datetime.utcnow()
    )
    
    db.add(new_payee)
    await db.commit()
    
    return {
        "success": True,
        "data": {"payee_id": new_payee.id},
        "message": "Payee added successfully"
    }


@router.delete("/payees/{payee_id}")
async def delete_bill_payee(
    payee_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Soft-delete a bill payee owned by the current user"""
    res = await db.execute(select(BillPayee).where(BillPayee.id == payee_id))
    payee = res.scalar_one_or_none()
    if not payee or payee.user_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payee not found")
    if not payee.is_active:
        return {"success": True, "data": {"id": payee.id}, "message": "Payee already deleted"}
    payee.is_active = False
    payee.updated_at = datetime.utcnow() if hasattr(payee, "updated_at") else datetime.utcnow()
    db.add(payee)
    await db.commit()
    return {"success": True, "data": {"id": payee.id}, "message": "Payee deleted"}


@router.post("/pay")
async def pay_bill(
    req: PayBillRequest | None = None,
    account_id: str | None = Query(None),
    payee_id: str | None = Query(None),
    amount: float | None = Query(None),
    payment_date: str | None = Query(None),
    reference: str | None = Query(None),
    transfer_pin: str | None = Query(None),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Pay bill: verifies PIN, debits account, writes ledger, and records bill payment.
    This integrates with unified history by creating a Transaction with type=PAYMENT."""
    account_id = req.account_id if req and getattr(req, "account_id", None) else account_id
    payee_id = req.payee_id if req and getattr(req, "payee_id", None) else payee_id
    amount = req.amount if req and getattr(req, "amount", None) is not None else amount
    payment_date = req.payment_date if req and getattr(req, "payment_date", None) else payment_date
    reference = req.reference if req and getattr(req, "reference", None) else reference
    transfer_pin = req.transfer_pin if req and getattr(req, "transfer_pin", None) else transfer_pin

    if not account_id or not payee_id or amount is None or not payment_date:
        raise HTTPException(status_code=422, detail="account_id, payee_id, amount, and payment_date are required")

    # Optional server-side PIN verification (client should have called verify endpoint already)
    if transfer_pin:
        await _verify_transfer_pin(db, current_user_id, transfer_pin)

    # Validate account ownership and sufficient funds
    acc_res = await db.execute(select(Account).where(Account.id == account_id))
    account = acc_res.scalar_one_or_none()
    if not account or account.user_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if (account.available_balance or 0.0) < amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient funds")

    # Load payee for description
    payee_res = await db.execute(select(BillPayee).where(BillPayee.id == payee_id))
    payee = payee_res.scalar_one_or_none()
    if not payee or payee.user_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payee not found")

    payment_id = str(uuid.uuid4())
    tx_id = str(uuid.uuid4())
    ref = reference or f"BILL-{uuid.uuid4().hex[:12].upper()}"
    when = datetime.fromisoformat(payment_date)

    # Perform debit and persist entities atomically
    before = account.balance
    account.balance = (account.balance or 0.0) - amount
    account.available_balance = (account.available_balance or 0.0) - amount
    account.updated_at = datetime.utcnow()

    payment = BillPayment(
        id=payment_id,
        user_id=current_user_id,
        account_id=account_id,
        payee_id=payee_id,
        amount=amount,
        currency=account.currency,
        payment_reference=ref,
        payment_date=when,
        status=BillPaymentStatus.PAID,
        created_at=datetime.utcnow(),
        processed_at=datetime.utcnow(),
        transaction_id=tx_id,
    )
    db.add(payment)

    tx = Transaction(
        id=tx_id,
        account_id=account.id,
        user_id=current_user_id,
        type=TxType.PAYMENT,
        status=TxStatus.COMPLETED,
        amount=amount,
        currency=account.currency,
        balance_before=before,
        balance_after=account.balance,
        description=f"Bill payment to {payee.name}",
        reference_number=ref,
        payment_id=payment_id,
        created_at=datetime.utcnow(),
        posted_date=datetime.utcnow(),
    )
    db.add(tx)

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    return {
        "success": True,
        "data": {"payment_id": payment_id, "reference": ref},
        "message": "Bill payment completed"
    }


@router.get("/history")
async def get_payment_history(
    limit: int = Query(20),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get bill payment history"""
    result = await db.execute(
        select(BillPayment)
        .where(BillPayment.user_id == current_user_id)
        .order_by(BillPayment.created_at.desc())
        .limit(limit)
    )
    payments = result.scalars().all()
    # Load payees for names/categories
    payee_ids = list({p.payee_id for p in payments})
    payee_map = {}
    if payee_ids:
        payee_res = await db.execute(select(BillPayee).where(BillPayee.id.in_(payee_ids)))
        payee_map = {pp.id: pp for pp in payee_res.scalars().all()}
    
    return {
        "success": True,
        "data": [
            {
                "id": p.id,
                "payee_id": p.payee_id,
                "payee_name": (payee_map.get(p.payee_id).name if payee_map.get(p.payee_id) else None),
                "payee_category": (payee_map.get(p.payee_id).category if payee_map.get(p.payee_id) else None),
                "amount": p.amount,
                "currency": p.currency,
                "status": p.status,
                "payment_date": p.payment_date.isoformat(),
                "created_at": p.created_at.isoformat(),
                "reference": p.payment_reference,
            }
            for p in payments
        ],
        "message": "Payment history retrieved"
    }


@router.post("/schedule")
async def schedule_payment(
    account_id: str,
    payee_id: str,
    amount: float,
    frequency: str,
    start_date: str,
    end_date: str = None,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Schedule recurring bill payment"""
    new_schedule = ScheduledPayment(
        id=str(uuid.uuid4()),
        user_id=current_user_id,
        account_id=account_id,
        payee_id=payee_id,
        amount=amount,
        currency="USD",
        frequency=frequency,
        start_date=datetime.fromisoformat(start_date),
        end_date=datetime.fromisoformat(end_date) if end_date else None,
        is_active=True,
        next_payment_date=datetime.fromisoformat(start_date),
        created_at=datetime.utcnow()
    )
    
    db.add(new_schedule)
    await db.commit()
    
    return {
        "success": True,
        "data": {"schedule_id": new_schedule.id},
        "message": "Recurring payment scheduled"
    }


@router.get("/scheduled")
async def get_scheduled_payments(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get scheduled payments"""
    result = await db.execute(
        select(ScheduledPayment)
        .where((ScheduledPayment.user_id == current_user_id) & (ScheduledPayment.is_active == True))
    )
    scheduled = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "payee_id": s.payee_id,
                "amount": s.amount,
                "frequency": s.frequency,
                "next_payment_date": s.next_payment_date.isoformat() if s.next_payment_date else None
            }
            for s in scheduled
        ],
        "message": "Scheduled payments retrieved"
    }


@router.delete("/scheduled/{schedule_id}")
async def cancel_scheduled_payment(
    schedule_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Cancel scheduled payment"""
    result = await db.execute(
        select(ScheduledPayment).where(ScheduledPayment.id == schedule_id)
    )
    schedule = result.scalar()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    schedule.is_active = False
    db.add(schedule)
    await db.commit()
    
    return {
        "success": True,
        "data": {},
        "message": "Scheduled payment cancelled"
    }
