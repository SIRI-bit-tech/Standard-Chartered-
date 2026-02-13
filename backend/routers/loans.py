from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.loan import LoanProduct, LoanApplication, LoanApplicationStatus, LoanType, Loan
from models.user import User
from models.account import Account
from database import get_db
import uuid
from datetime import datetime, timedelta
from utils.auth import get_current_user_id

router = APIRouter()

async def _ensure_user_active(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account suspended")


@router.get("/products")
async def get_loan_products(
    user_tier: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get available loan products"""
    result = await db.execute(
        select(LoanProduct)
    )
    products = result.scalars().all()
    
    available_products = []
    for product in products:
        if user_tier == "standard" and product.available_to_standard:
            available_products.append(product)
        elif user_tier == "priority" and product.available_to_priority:
            available_products.append(product)
        elif user_tier == "premium" and product.available_to_premium:
            available_products.append(product)
    
    return {
        "success": True,
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "type": p.type,
                "min_amount": p.min_amount,
                "max_amount": p.max_amount,
                "interest_rate": p.base_interest_rate,
                "min_term": p.min_term_months,
                "max_term": p.max_term_months
            }
            for p in available_products
        ],
        "message": "Loan products retrieved"
    }


@router.post("/apply")
async def apply_for_loan(
    product_id: str,
    requested_amount: float,
    requested_term: int,
    purpose: str = None,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Apply for loan"""
    await _ensure_user_active(db, current_user_id)
    # Verify product exists
    product_result = await db.execute(
        select(LoanProduct).where(LoanProduct.id == product_id)
    )
    product = product_result.scalar()
    
    if not product:
        raise HTTPException(status_code=404, detail="Loan product not found")
    
    # Validate amount
    if requested_amount < product.min_amount or requested_amount > product.max_amount:
        raise HTTPException(status_code=400, detail="Amount outside allowed range")
    
    new_application = LoanApplication(
        id=str(uuid.uuid4()),
        user_id=current_user_id,
        product_id=product_id,
        requested_amount=requested_amount,
        requested_term_months=requested_term,
        purpose=purpose,
        status=LoanApplicationStatus.SUBMITTED,
        submitted_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    
    db.add(new_application)
    await db.commit()
    
    return {
        "success": True,
        "data": {"application_id": new_application.id},
        "message": "Loan application submitted successfully"
    }


@router.get("/applications")
async def get_applications(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get loan applications"""
    result = await db.execute(
        select(LoanApplication)
        .where(LoanApplication.user_id == current_user_id)
        .order_by(LoanApplication.created_at.desc())
    )
    applications = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": a.id,
                "status": a.status,
                "amount": a.requested_amount,
                "created_at": a.created_at.isoformat()
            }
            for a in applications
        ],
        "message": "Applications retrieved"
    }


@router.get("/applications/{application_id}")
async def get_application_details(
    application_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get application details"""
    result = await db.execute(
        select(LoanApplication).where(LoanApplication.id == application_id)
    )
    application = result.scalar()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "success": True,
        "data": {
            "id": application.id,
            "status": application.status,
            "requested_amount": application.requested_amount,
            "approved_amount": application.approved_amount,
            "interest_rate": application.approved_interest_rate,
            "monthly_payment": application.monthly_payment
        },
        "message": "Application details retrieved"
    }


@router.get("/accounts")
async def get_loan_accounts(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get active loan accounts"""
    result = await db.execute(
        select(Loan)
        .where(Loan.user_id == current_user_id)
    )
    loans = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": l.id,
                "type": l.type,
                "principal": l.principal_amount,
                "remaining_balance": l.remaining_balance,
                "interest_rate": l.interest_rate,
                "monthly_payment": l.monthly_payment,
                "next_payment_date": l.next_payment_date.isoformat()
            }
            for l in loans
        ],
        "message": "Loan accounts retrieved"
    }


@router.get("/accounts/{loan_id}")
async def get_loan_details(loan_id: str, db: AsyncSession = Depends(get_db)):
    """Get loan details"""
    result = await db.execute(
        select(Loan).where(Loan.id == loan_id)
    )
    loan = result.scalar()
    
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    return {
        "success": True,
        "data": {
            "id": loan.id,
            "type": loan.type,
            "principal_amount": loan.principal_amount,
            "interest_rate": loan.interest_rate,
            "remaining_balance": loan.remaining_balance,
            "monthly_payment": loan.monthly_payment,
            "payments_made": loan.total_payments_made,
            "next_payment_date": loan.next_payment_date.isoformat()
        },
        "message": "Loan details retrieved"
    }


@router.post("/accounts/{loan_id}/payment")
async def make_loan_payment(loan_id: str, amount: float, db: AsyncSession = Depends(get_db)):
    """Make loan payment"""
    result = await db.execute(
        select(Loan).where(Loan.id == loan_id)
    )
    loan = result.scalar()
    
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Calculate interest and principal portions
    interest_payment = (loan.remaining_balance * loan.interest_rate / 12 / 100)
    principal_payment = amount - interest_payment
    
    loan.remaining_balance -= principal_payment
    loan.total_payments_made += 1
    loan.total_interest_paid += interest_payment
    loan.last_payment_date = datetime.utcnow()
    loan.next_payment_date = datetime.utcnow() + timedelta(days=30)
    
    db.add(loan)
    await db.commit()
    
    return {
        "success": True,
        "data": {"new_balance": loan.remaining_balance},
        "message": "Loan payment processed successfully"
    }


@router.get("/accounts/{loan_id}/schedule")
async def get_payment_schedule(loan_id: str):
    """Get payment schedule"""
    # This would typically fetch from LoanSchedule table
    return {
        "success": True,
        "data": [],
        "message": "Payment schedule retrieved"
    }


@router.get("/accounts/{loan_id}/statements")
async def get_loan_statements(loan_id: str):
    """Get loan statements"""
    return {
        "success": True,
        "data": [],
        "message": "Loan statements retrieved"
    }


@router.post("/balance-transfer")
async def balance_transfer_request(
    amount: float,
    current_user_id: str = Depends(get_current_user_id)
):
    """Request balance transfer"""
    return {
        "success": True,
        "data": {"request_id": str(uuid.uuid4())},
        "message": "Balance transfer request submitted"
    }
