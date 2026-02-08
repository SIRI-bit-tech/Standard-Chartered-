from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from config import settings
from database import engine, Base
from routers import auth, verification, accounts, transfers, loans, notifications, support, profile, documents, bill_payments, deposits, virtual_cards, admin
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
            
            print("✅ Database migrations completed successfully!")
        except Exception as e:
            print(f"❌ Migration error: {e}")
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", settings.FRONTEND_URL],
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
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])


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
