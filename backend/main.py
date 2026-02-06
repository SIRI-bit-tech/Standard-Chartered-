from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from database import engine, Base
from routers import auth, accounts, transfers, loans, notifications, support, profile, documents, bill_payments, deposits, virtual_cards, admin

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for app startup and shutdown"""
    # Startup: Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
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
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
