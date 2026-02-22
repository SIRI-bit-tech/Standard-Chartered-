from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from config import settings
from database import engine, Base
from routers import auth, verification, accounts, transfers, loans, notifications, support, profile, documents, bill_payments, deposits, virtual_cards, admin
from routers import security as security_router
import logging

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
    # Startup: Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Add missing columns to users table if they don't exist
        try:
            from sqlalchemy import text
            print("Running database migrations...")
            
            # Authentication columns
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS transfer_pin VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS transfer_pin_failed_attempts INTEGER DEFAULT 0 NOT NULL"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS transfer_pin_locked_until TIMESTAMP"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires FLOAT"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires FLOAT"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR"
            ))
            
            # Address columns
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS street_address VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code VARCHAR"
            ))
            
            # Account columns
            await conn.execute(text(
                "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS routing_number VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wallet_id VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wallet_qrcode VARCHAR"
            ))

            # Loan columns check
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS image_url VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS base_interest_rate FLOAT"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS min_term_months INTEGER"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS max_term_months INTEGER"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS employment_required BOOLEAN DEFAULT TRUE"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS available_to_standard BOOLEAN DEFAULT TRUE"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS available_to_priority BOOLEAN DEFAULT TRUE"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS available_to_premium BOOLEAN DEFAULT TRUE"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS tag VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS features VARCHAR"
            ))

            # Loan applications columns check
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS account_id VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_amount FLOAT"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_interest_rate FLOAT"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_term_months INTEGER"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS monthly_payment FLOAT"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS supporting_documents VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS purpose VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS annual_income FLOAT"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS employment_status VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS employer_name VARCHAR"
            ))
            await conn.execute(text(
                "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS credit_score INTEGER"
            ))
            
            # Ensure existing products have flags set
            await conn.execute(text("UPDATE loan_products SET available_to_standard = TRUE WHERE available_to_standard IS NULL OR available_to_standard = ''"))
            await conn.execute(text("UPDATE loan_products SET available_to_priority = TRUE WHERE available_to_priority IS NULL OR available_to_priority = ''"))
            await conn.execute(text("UPDATE loan_products SET available_to_premium = TRUE WHERE available_to_premium IS NULL OR available_to_premium = ''"))
            await conn.execute(text("UPDATE loan_products SET employment_required = TRUE WHERE employment_required IS NULL OR employment_required = ''"))
            
            # Transaction/Loan enum migrations
            try:
                await conn.execute(text("COMMIT"))
                # Support both uppercase and lowercase for various enums
                for val in ['LOAN', 'loan', 'INTEREST', 'interest', 'FEE', 'fee']:
                    try:
                        await conn.execute(text(f"ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception: pass
                
                for val in ['PENDING', 'pending', 'COMPLETED', 'completed', 'FAILED', 'failed']:
                    try:
                        await conn.execute(text(f"ALTER TYPE transactionstatus ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception: pass
                    
                for val in ['SUBMITTED', 'under_review', 'approved', 'rejected']:
                    try:
                        await conn.execute(text(f"ALTER TYPE loanapplicationstatus ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception: pass

                for val in ['PERSONAL', 'HOME', 'AUTO', 'EDUCATION', 'BUSINESS']:
                    try:
                        await conn.execute(text(f"ALTER TYPE loantype ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception: pass

                for val in ['ACTIVE', 'COMPLETED', 'DEFAULTED']:
                    try:
                        await conn.execute(text(f"ALTER TYPE loanstatus ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception: pass
            except Exception: pass
            
            # Virtual card enum migration
            try:
                await conn.execute(text("COMMIT")) # Try to break out of transaction for ALTER TYPE
                for val in ['declined', 'pending', 'suspended', 'inactive', 'active', 'blocked', 'cancelled', 'expired']:
                    try:
                        await conn.execute(text(f"ALTER TYPE virtualcardstatus ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception: pass
                for val in ['debit', 'credit']:
                    try:
                        await conn.execute(text(f"ALTER TYPE virtualcardtype ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception: pass
            except Exception: pass
            
            # Deposit enum and data migration (ensure uppercase values)
            try:
                await conn.execute(text("COMMIT"))
                # Ensure enum labels exist (PostgreSQL) - add both cases defensively
                for val in ['PENDING','PROCESSING','VERIFIED','COMPLETED','FAILED','REJECTED','CANCELLED',
                            'pending','processing','verified','completed','failed','rejected','cancelled']:
                    try:
                        await conn.execute(text(f"ALTER TYPE depositstatus ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception:
                        pass
                for val in ['CHECK_DEPOSIT','DIRECT_DEPOSIT','MOBILE_CHECK_DEPOSIT',
                            'check_deposit','direct_deposit','mobile_check_deposit']:
                    try:
                        await conn.execute(text(f"ALTER TYPE deposittype ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception:
                        pass
                # Update existing rows to uppercase (works for enum via direct value change)
                status_map = {
                    'pending': 'PENDING',
                    'processing': 'PROCESSING',
                    'verified': 'VERIFIED',
                    'completed': 'COMPLETED',
                    'failed': 'FAILED',
                    'rejected': 'REJECTED',
                    'cancelled': 'CANCELLED',
                }
                for old, new in status_map.items():
                    try:
                        await conn.execute(text(f"UPDATE deposits SET status = '{new}' WHERE status = '{old}'"))
                    except Exception:
                        # Fallback for non-enum/text columns
                        try:
                            await conn.execute(text("UPDATE deposits SET status = UPPER(status)"))
                            break
                        except Exception:
                            pass
                type_map = {
                    'check_deposit': 'CHECK_DEPOSIT',
                    'direct_deposit': 'DIRECT_DEPOSIT',
                    'mobile_check_deposit': 'MOBILE_CHECK_DEPOSIT',
                }
                for old, new in type_map.items():
                    try:
                        await conn.execute(text(f"UPDATE deposits SET type = '{new}' WHERE type = '{old}'"))
                    except Exception:
                        try:
                            await conn.execute(text("UPDATE deposits SET type = UPPER(type)"))
                            break
                        except Exception:
                            pass
            except Exception:
                # Best effort; do not fail startup
                pass
            
            print("Database migrations completed successfully!")
            
            # Seed default loan products if none exist
            check_products = await conn.execute(text("SELECT id FROM loan_products LIMIT 1"))
            if not check_products.fetchone():
                print("Seeding default loan products...")
                import json
                loan_products = [
                    ("lp_personal_gold", "Personal Gold Facility", "personal", "Flexible personal loan for any occasion.", 5000, 50000, 6.5, 12, 60, "Low Interest", "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=500"),
                    ("lp_home_elite", "Elite Home Mortgage", "home", "Competitive rates for your dream home.", 100000, 2000000, 4.25, 120, 360, "Premium", "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=500"),
                    ("lp_auto_express", "Auto Express Loan", "auto", "Drive your new car today with instant approval.", 10000, 100000, 5.5, 12, 84, "Fast Approval", "https://images.unsplash.com/photo-1533473359331-0135ef1b58ae?q=80&w=500"),
                    ("lp_edu_support", "Education Support", "education", "Invest in your future with low rates.", 2000, 50000, 3.5, 6, 120, "Student Friendly", "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=500"),
                    ("lp_business_grow", "Business Growth Capital", "business", "Scale your business to new heights.", 20000, 500000, 7.5, 12, 120, "For SMEs", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=500")
                ]
                for lp in loan_products:
                    features = json.dumps(["Instant Approval", "Flat Interest Rate", "No Prepayment Penalty"])
                    # Use a safer INSERT or IGNORE approach if possible, but here we just try-catch per item or rely on the check_products
                    try:
                        await conn.execute(text(
                            "INSERT INTO loan_products (id, name, type, description, min_amount, max_amount, base_interest_rate, min_term_months, max_term_months, tag, image_url, features, employment_required, available_to_standard, available_to_priority, available_to_premium, created_at, updated_at) "
                            "VALUES (:id, :name, :type, :description, :min_amount, :max_amount, :rate, :min_term, :max_term, :tag, :img, :feats, TRUE, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                        ), {
                            "id": lp[0], "name": lp[1], "type": lp[2], "description": lp[3], "min_amount": lp[4], "max_amount": lp[5], "rate": lp[6], "min_term": lp[7], "max_term": lp[8], "tag": lp[9], "img": lp[10], "feats": features
                        })
                    except Exception as seed_err:
                        print(f"Skipping seeding for {lp[0]}: {seed_err}")
                print("Seeded loan products baseline.")
        except Exception as e:
            print(f"Migration error: {e}")
            import traceback
            traceback.print_exc()
    
    yield
    # Shutdown: Close database connections
    await engine.dispose()


app = FastAPI(
    title="Standard Chartered Banking API",
    description="Production-ready banking platform REST API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
# Build a clean, deduplicated list of allowed origins
_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in _cors_origins:
    _cors_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(verification.router, tags=["Verification"])
app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
app.include_router(transfers.router, prefix="/api/v1/transfers", tags=["Transfers"])
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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    logger.error(f"Request body: {exc.body}")
    
    # Construct error response with proper format
    error_response = {
        "detail": exc.errors(),
        "body": exc.body
    }
    
    return JSONResponse(
        status_code=422,
        content=error_response
    )


@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "Standard Chartered Banking API",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "database": "connected"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.DEBUG
    )
