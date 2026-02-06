from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.bill_payment import BillPayee, BillPayment, ScheduledPayment
from database import get_db
import uuid
from datetime import datetime

router = APIRouter()


@router.get("/payees")
async def get_bill_payees(
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get bill payees"""
    result = await db.execute(
        select(BillPayee)
        .where((BillPayee.user_id == user_id) & (BillPayee.is_active == True))
    )
    payees = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category
            }
            for p in payees
        ],
        "message": "Payees retrieved"
    }


@router.post("/payees")
async def add_bill_payee(
    user_id: str,
    name: str,
    account_number: str,
    category: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Add new bill payee"""
    new_payee = BillPayee(
        id=str(uuid.uuid4()),
        user_id=user_id,
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


@router.post("/pay")
async def pay_bill(
    user_id: str,
    account_id: str,
    payee_id: str,
    amount: float,
    payment_date: str,
    reference: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Pay bill"""
    new_payment = BillPayment(
        id=str(uuid.uuid4()),
        user_id=user_id,
        account_id=account_id,
        payee_id=payee_id,
        amount=amount,
        currency="USD",
        payment_reference=reference or str(uuid.uuid4())[:12].upper(),
        payment_date=datetime.fromisoformat(payment_date),
        status="pending",
        created_at=datetime.utcnow()
    )
    
    db.add(new_payment)
    await db.commit()
    
    return {
        "success": True,
        "data": {"payment_id": new_payment.id},
        "message": "Bill payment submitted"
    }


@router.get("/history")
async def get_payment_history(
    user_id: str = Query(...),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db)
):
    """Get bill payment history"""
    result = await db.execute(
        select(BillPayment)
        .where(BillPayment.user_id == user_id)
        .order_by(BillPayment.created_at.desc())
        .limit(limit)
    )
    payments = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": p.id,
                "payee_id": p.payee_id,
                "amount": p.amount,
                "status": p.status,
                "payment_date": p.payment_date.isoformat(),
                "created_at": p.created_at.isoformat()
            }
            for p in payments
        ],
        "message": "Payment history retrieved"
    }


@router.post("/schedule")
async def schedule_payment(
    user_id: str,
    account_id: str,
    payee_id: str,
    amount: float,
    frequency: str,
    start_date: str,
    end_date: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Schedule recurring bill payment"""
    new_schedule = ScheduledPayment(
        id=str(uuid.uuid4()),
        user_id=user_id,
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
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get scheduled payments"""
    result = await db.execute(
        select(ScheduledPayment)
        .where((ScheduledPayment.user_id == user_id) & (ScheduledPayment.is_active == True))
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
