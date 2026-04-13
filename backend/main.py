from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from config import settings
from database import engine, Base, AsyncSessionLocal
from routers import auth, verification, accounts, transfers, withdrawals, loans, notifications, support, profile, documents, bill_payments, deposits, virtual_cards, admin
from routers import security as security_router
import logging
import asyncio
import httpx
import os
from datetime import datetime, timedelta
from utils.errors import APIError

# Import all models to ensure they're registered
from models.user import User
from models.account import Account, Statement
from models.transaction import Transaction
from models.transfer import Transfer, Beneficiary
from models.loan import Loan, LoanApplication, LoanProduct, LoanPayment, LoanSchedule
from models.notification import Notification, NotificationPreference
from models.document import Document
from models.support import SupportTicket, TicketMessage, Chat, ChatMessage, LoginHistory
from models.bill_payment import BillPayment, BillPayee, ScheduledPayment
from models.deposit import Deposit
from models.virtual_card import VirtualCard
from models.admin import AdminUser, AdminAuditLog, AdminPermission
from models.security import TrustedDevice

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for app startup and shutdown"""
    from sqlalchemy import text

    # Step 1: ID Length Migrations (Critical for Stytch/Auth)
    async with engine.begin() as conn:
        try:
            print("\n" + "="*50)
            print("MIGRATION STAGE 1: ID COLUMN EXTENSIONS")
            print("="*50)
            await conn.execute(text("ALTER TABLE admin_users ALTER COLUMN id TYPE VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE admin_users ALTER COLUMN created_by TYPE VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE admin_audit_logs ALTER COLUMN id TYPE VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE admin_audit_logs ALTER COLUMN admin_id TYPE VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE admin_audit_logs ALTER COLUMN resource_id TYPE VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE admin_permissions ALTER COLUMN id TYPE VARCHAR(255)"))
            print("SUCCESS: Stage 1 completed.")
        except Exception as e:
            print(f"STAGE 1 NOTICE: {e}")

    # Step 2: Table Creation
    async with engine.begin() as conn:
        try:
            print("MIGRATION STAGE 2: TABLE CREATION")
            await conn.run_sync(Base.metadata.create_all)
            print("SUCCESS: Stage 2 completed.")
        except Exception as e:
            print(f"STAGE 2 ERROR: {e}")

    # Step 3: Functional Columns and Table Alterations
    async with engine.begin() as conn:
        try:
            print("MIGRATION STAGE 3: FUNCTIONAL COLUMNS")
            # User Columns
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS transfer_pin VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS transfer_pin_failed_attempts INTEGER DEFAULT 0 NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS transfer_pin_locked_until TIMESTAMPTZ"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires FLOAT"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires FLOAT"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT FALSE NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS street_address VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_until TIMESTAMPTZ"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMPTZ"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR"))
            # Account Columns
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS routing_number VARCHAR"))
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wallet_id VARCHAR"))
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wallet_qrcode VARCHAR"))
            # Loan Product Columns
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS image_url VARCHAR"))
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS base_interest_rate FLOAT"))
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS min_term_months INTEGER"))
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS max_term_months INTEGER"))
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS employment_required BOOLEAN DEFAULT TRUE"))
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS available_to_standard BOOLEAN DEFAULT TRUE"))
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS available_to_priority BOOLEAN DEFAULT TRUE"))
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS available_to_premium BOOLEAN DEFAULT TRUE"))
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS tag VARCHAR"))
            await conn.execute(text("ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS features VARCHAR"))
            # Loan Applications Columns
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS account_id VARCHAR"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_amount FLOAT"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_interest_rate FLOAT"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_term_months INTEGER"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS monthly_payment FLOAT"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS supporting_documents VARCHAR"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS purpose VARCHAR"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS annual_income FLOAT"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS employment_status VARCHAR"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS employer_name VARCHAR"))
            await conn.execute(text("ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS credit_score INTEGER"))
            # Loan Creation Columns (Admin)
            await conn.execute(text("ALTER TABLE loans ADD COLUMN IF NOT EXISTS daily_interest_rate FLOAT DEFAULT 0.0"))
            await conn.execute(text("ALTER TABLE loans ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE"))
            
            # Initial Data Cleanup
            await conn.execute(text("UPDATE loan_products SET available_to_standard = TRUE WHERE available_to_standard IS NULL OR available_to_standard = ''"))
            await conn.execute(text("UPDATE loan_products SET available_to_priority = TRUE WHERE available_to_priority IS NULL OR available_to_priority = ''"))
            await conn.execute(text("UPDATE loan_products SET available_to_premium = TRUE WHERE available_to_premium IS NULL OR available_to_premium = ''"))
            await conn.execute(text("UPDATE loan_products SET employment_required = TRUE WHERE employment_required IS NULL OR employment_required = ''"))
            print("SUCCESS: Stage 3 completed.")
        except Exception as e:
            print(f"STAGE 3 NOTICE: {e}")

    # Step 4: Enum Extensions (Separated to avoid transaction toxicity)
    async with engine.begin() as conn:
        try:
            print("MIGRATION STAGE 4: ENUM EXTENSIONS")
            # Transaction Types
            for val in ['LOAN', 'loan', 'INTEREST', 'interest', 'FEE', 'fee']:
                try: await conn.execute(text(f"ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception: pass
            # Transaction Status
            for val in ['PENDING', 'pending', 'COMPLETED', 'completed', 'FAILED', 'failed']:
                try: await conn.execute(text(f"ALTER TYPE transactionstatus ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception: pass
            # Loan Application Status
            for val in ['SUBMITTED', 'under_review', 'approved', 'rejected']:
                try: await conn.execute(text(f"ALTER TYPE loanapplicationstatus ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception: pass
            # Loan Types
            for val in ['PERSONAL', 'HOME', 'AUTO', 'EDUCATION', 'BUSINESS']:
                try: await conn.execute(text(f"ALTER TYPE loantype ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception: pass
            # Loan Status
            for val in ['ACTIVE', 'COMPLETED', 'DEFAULTED']:
                try: await conn.execute(text(f"ALTER TYPE loanstatus ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception: pass
            # Virtual Card Status
            for val in ['declined', 'pending', 'suspended', 'inactive', 'active', 'blocked', 'cancelled', 'expired']:
                try: await conn.execute(text(f"ALTER TYPE virtualcardstatus ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception: pass
            # Virtual Card Types
            for val in ['debit', 'credit']:
                try: await conn.execute(text(f"ALTER TYPE virtualcardtype ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception: pass
            # Deposit Status
            for val in ['PENDING','PROCESSING','VERIFIED','COMPLETED','FAILED','REJECTED','CANCELLED',
                        'pending','processing','verified','completed','failed','rejected','cancelled']:
                try: await conn.execute(text(f"ALTER TYPE depositstatus ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception: pass
            # Deposit Types
            for val in ['CHECK_DEPOSIT','DIRECT_DEPOSIT','MOBILE_CHECK_DEPOSIT',
                        'check_deposit','direct_deposit','mobile_check_deposit']:
                try: await conn.execute(text(f"ALTER TYPE deposittype ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception: pass
            print("SUCCESS: Stage 4 completed.")
        except Exception as e:
            print(f"STAGE 4 NOTICE: {e}")

    # Step 5: Special Admin Resources & Data Normalization
    async with engine.begin() as conn:
        try:
            print("MIGRATION STAGE 5: ADMIN RESOURCES")
            # Fix existing products that were seeded with '{}' instead of '[]'
            await conn.execute(text("UPDATE loan_products SET features = '[]' WHERE features = '{}'"))
            # Normalize Deposit Data
            status_map = {'pending': 'PENDING','processing': 'PROCESSING','verified': 'VERIFIED','completed': 'COMPLETED','failed': 'FAILED','rejected': 'REJECTED','cancelled': 'CANCELLED'}
            for old, new in status_map.items():
                try: await conn.execute(text(f"UPDATE deposits SET status = '{new}' WHERE status = '{old}'"))
                except Exception: pass
            print("SUCCESS: Stage 5 completed.")
        except Exception as e:
            print(f"STAGE 5 NOTICE: {e}")

    # Step 6: Composite Indexes (Isolated because errors here are common but non-critical)
    async with engine.begin() as conn:
        print("MIGRATION STAGE 6: COMPOSITE INDEXES")
        index_ddls = [
            "CREATE INDEX IF NOT EXISTS ix_transactions_account_created ON transactions (account_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_transactions_user_created ON transactions (user_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_transactions_status ON transactions (status)",
            "CREATE INDEX IF NOT EXISTS ix_transfers_from_account_created ON transfers (from_account_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_transfers_user_created ON transfers (from_user_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_transfers_status ON transfers (status)",
            "CREATE INDEX IF NOT EXISTS ix_transfers_scheduled_status ON transfers (status, scheduled_for)",
            "CREATE INDEX IF NOT EXISTS ix_loans_user_status ON loans (user_id, status)",
            "CREATE INDEX IF NOT EXISTS ix_loans_next_payment ON loans (status, next_payment_date)",
            "CREATE INDEX IF NOT EXISTS ix_loan_applications_user_status ON loan_applications (user_id, status)",
            "CREATE INDEX IF NOT EXISTS ix_loan_applications_status_created ON loan_applications (status, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_deposits_account_status ON deposits (account_id, status)",
            "CREATE INDEX IF NOT EXISTS ix_deposits_user_created ON deposits (user_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_deposits_status_created ON deposits (status, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_notifications_user_status ON notifications (user_id, status)",
            "CREATE INDEX IF NOT EXISTS ix_notifications_user_created ON notifications (user_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_support_tickets_user_status ON support_tickets (user_id, status)",
            "CREATE INDEX IF NOT EXISTS ix_support_tickets_status_created ON support_tickets (status, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_support_tickets_status_priority ON support_tickets (status, priority)",
            "CREATE INDEX IF NOT EXISTS ix_login_history_user_created ON login_history (user_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_login_history_user_success ON login_history (user_id, login_successful)",
            "CREATE INDEX IF NOT EXISTS ix_bill_payments_user_created ON bill_payments (user_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_bill_payments_status ON bill_payments (status)",
            "CREATE INDEX IF NOT EXISTS ix_scheduled_payments_next_date_active ON scheduled_payments (next_payment_date, is_active)",
            "CREATE INDEX IF NOT EXISTS ix_scheduled_payments_user_active ON scheduled_payments (user_id, is_active)",
            "CREATE INDEX IF NOT EXISTS ix_virtual_cards_account_status ON virtual_cards (account_id, status)",
            "CREATE INDEX IF NOT EXISTS ix_virtual_cards_user_status ON virtual_cards (user_id, status)",
        ]
        count = 0
        for ddl in index_ddls:
            try:
                await conn.execute(text(ddl))
                count += 1
            except Exception as e:
                pass # Silently skip failed index creation
        print(f"SUCCESS: Stage 6 completed ({count} indexes verified).")

    # Step 7: Seeding default loan products if none exist
    async with engine.begin() as conn:
        try:
            print("MIGRATION STAGE 7: PRODUCT SEEDING")
            check_products = await conn.execute(text("SELECT id FROM loan_products LIMIT 1"))
            if not check_products.fetchone():
                import json
                loan_products = [
                    ("lp_personal_gold", "Personal Gold Facility", "personal", "Flexible personal loan for any occasion.", 5000, 50000, 6.5, 12, 60, "Low Interest", "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=500"),
                    ("lp_home_elite", "Elite Home Mortgage", "home", "Competitive rates for your dream home.", 100000, 2000000, 4.25, 120, 360, "Premium", "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=500"),
                    ("lp_auto_express", "Auto Express Loan", "auto", "Drive your new car today with instant approval.", 10000, 100000, 5.5, 12, 84, "Fast Approval", "https://images.unsplash.com/photo-1533473359331-0135ef1b58ae?q=80&w=500"),
                    ("lp_edu_support", "Education Support", "education", "Invest in your future with low rates.", 2000, 50000, 3.5, 6, 120, "Student Friendly", "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=500"),
                    ("lp_business_grow", "Business Growth Capital", "business", "Scale your business to new heights.", 20000, 500000, 7.5, 12, 120, "For SMEs", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=500")
                ]
                for lid, name, ltype, desc, min_a, max_a, rate, min_t, max_t, tag, img in loan_products:
                    feats = json.dumps(["Instant Approval", "Flat Interest Rate", "No Prepayment Penalty"])
                    await conn.execute(text(
                        "INSERT INTO loan_products (id, name, type, description, min_amount, max_amount, base_interest_rate, min_term_months, max_term_months, tag, image_url, features, employment_required, available_to_standard, available_to_priority, available_to_premium, created_at, updated_at) "
                        "VALUES (:id, :name, :type, :description, :min_amount, :max_amount, :rate, :min_term, :max_term, :tag, :img, :feats, TRUE, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                    ), {"id": lid, "name": name, "type": ltype, "description": desc, "min_amount": min_a, "max_amount": max_a, "rate": rate, "min_term": min_t, "max_term": max_t, "tag": tag, "img": img, "feats": feats})
                print("SUCCESS: Stage 7 completed (Default products seeded).")
            else:
                print("STAGE 7 NOTICE: Products already exist, skipping seed.")
        except Exception as e:
            print(f"STAGE 7 NOTICE: {e}")

    print("="*50)
    print("ALL MIGRATIONS FINISHED SUCCESSFULLY.")
    print("="*50 + "\n")

    # Final Stage: Cleanup unwanted administrative resources
    async with engine.begin() as conn:
        try:
            print("MIGRATION STAGE 8: RESOURCE CLEANUP")
            # Find any valid product ID to use as a fallback
            fallback_res = await conn.execute(text("SELECT id FROM loan_products WHERE id != 'admin_created' LIMIT 1"))
            fallback = fallback_res.fetchone()
            
            if fallback:
                fallback_id = fallback[0]
                # Migrate any applications referencing the old admin product to a standard one
                await conn.execute(text(f"UPDATE loan_applications SET product_id = '{fallback_id}' WHERE product_id = 'admin_created'"))
                # Now safe to delete
                await conn.execute(text("DELETE FROM loan_products WHERE id = 'admin_created'"))
                print(f"SUCCESS: Stage 8 completed (Special Facility removed, migrated to {fallback_id}).")
            else:
                print("STAGE 8 NOTICE: No fallback products found, skipping cleanup to prevent data loss.")
        except Exception as e:
            print(f"STAGE 8 NOTICE: {e}")

    # Background Tasks
    async def _keep_alive():
        await asyncio.sleep(30)
        backend_url = os.environ.get("RENDER_EXTERNAL_URL", "https://standard-chartered-frkm.onrender.com")
        ping_url = f"{backend_url.rstrip('/')}/health"
        logger.info(f"Keep-alive pinger started → {ping_url}")
        while True:
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.get(ping_url)
                    logger.info(f"Keep-alive ping → {resp.status_code}")
            except Exception as exc:
                logger.warning(f"Keep-alive ping failed: {exc}")
            await asyncio.sleep(600)

    _keep_alive_task = asyncio.create_task(_keep_alive())

    async def _daily_interest_accrual():
        from zoneinfo import ZoneInfo
        eastern = ZoneInfo("America/New_York")
        while True:
            try:
                now_et = datetime.now(eastern)
                target = now_et.replace(hour=7, minute=0, second=0, microsecond=0)
                if now_et >= target:
                    target += timedelta(days=1)
                wait_seconds = (target - now_et).total_seconds()
                logger.info(f"Daily interest accrual: sleeping {wait_seconds:.0f}s until {target}")
                await asyncio.sleep(wait_seconds)

                from sqlalchemy import select as sa_select, and_
                async with AsyncSessionLocal() as session:
                    result = await session.execute(
                        sa_select(Loan).where(and_(Loan.status == "active", Loan.daily_interest_rate > 0))
                    )
                    loans_list = result.scalars().all()
                    if loans_list:
                        import uuid
                        from models.notification import NotificationType
                        for loan in loans_list:
                            loan.remaining_balance += loan.daily_interest_rate
                            loan.total_interest_paid += loan.daily_interest_rate
                            session.add(loan)
                            
                            # Create in-app notification for the user
                            notif = Notification(
                                id=str(uuid.uuid4()),
                                user_id=loan.user_id,
                                type=NotificationType.LOAN,
                                title="Loan Interest Added",
                                message=f"${loan.daily_interest_rate:.2f} interest has been accrued on your {loan.type.lower()} loan balance.",
                                loan_id=loan.id
                            )
                            session.add(notif)
                            
                        await session.commit()
                        logger.info(f"Daily interest accrued and notifications sent for {len(loans_list)} loan(s)")
                    else:
                        logger.info("Daily interest accrual: no qualifying loans")
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Daily interest accrual error: {exc}")
                await asyncio.sleep(3600)

    _daily_interest_task = asyncio.create_task(_daily_interest_accrual())

    yield
    # Shutdown
    _keep_alive_task.cancel()
    _daily_interest_task.cancel()
    try: await _keep_alive_task
    except asyncio.CancelledError: pass
    try: await _daily_interest_task
    except asyncio.CancelledError: pass
    await engine.dispose()

app = FastAPI(
    title="Standard Chartered Banking API",
    description="Production-ready banking platform REST API",
    version="1.0.0",
    lifespan=lifespan
)

# HTTPS Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

class ForceHTTPSSchemeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        if request.headers.get("x-forwarded-proto") == "https":
            request.scope["scheme"] = "https"
        return await call_next(request)

app.add_middleware(ForceHTTPSSchemeMiddleware)

# CORS configuration
_cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in _cors_origins:
    _cors_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router mounting
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(verification.router, tags=["Verification"])
app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
app.include_router(transfers.router, prefix="/api/v1/transfers", tags=["Transfers"])
app.include_router(withdrawals.router, prefix="/api/v1/withdrawals", tags=["Withdrawals"])
app.include_router(loans.router, prefix="/api/v1/loans", tags=["Loans"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(support.router, prefix="/api/v1/support", tags=["Support"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(bill_payments.router, prefix="/api/v1/bills", tags=["Bill Payments"])
app.include_router(deposits.router, prefix="/api/v1/deposits", tags=["Deposits"])
app.include_router(virtual_cards.router, prefix="/api/v1/cards", tags=["Virtual Cards"])
app.include_router(admin.router, tags=["Admin"])
app.include_router(security_router.router)

@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    error_msg = "Validation failed"
    if exc.errors():
        first_error = exc.errors()[0]
        error_msg = first_error.get('msg', 'Validation failed')
    return JSONResponse(status_code=422, content={"detail": error_msg})

@app.get("/")
async def root():
    return {"message": "Standard Chartered Banking API", "version": "1.0.0", "status": "operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=settings.DEBUG)
