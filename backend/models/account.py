from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class AccountType(str, enum.Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CRYPTO = "crypto"


class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    CLOSED = "closed"
    PENDING = "pending"


class Account(Base):
    """User account model"""
    __tablename__ = "accounts"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Account info
    account_number = Column(String, unique=True, index=True, nullable=False)
    account_type = Column(Enum(AccountType), nullable=False)
    status = Column(Enum(AccountStatus), default=AccountStatus.ACTIVE, nullable=False)
    
    # Currency
    currency = Column(String, nullable=False)  # USD, GBP, EUR, etc.
    
    # Balance
    balance = Column(Float, default=0.0, nullable=False)
    available_balance = Column(Float, default=0.0, nullable=False)
    
    # Settings
    nickname = Column(String, nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    overdraft_enabled = Column(Boolean, default=False, nullable=False)
    overdraft_limit = Column(Float, default=0.0, nullable=False)
    
    # Interest (for savings)
    interest_rate = Column(Float, default=0.0, nullable=False)
    minimum_balance = Column(Float, default=0.0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    statements = relationship("Statement", back_populates="account", cascade="all, delete-orphan")


class Statement(Base):
    """Account statements"""
    __tablename__ = "statements"
    
    id = Column(String, primary_key=True, index=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False, index=True)
    
    # Statement period
    statement_date = Column(DateTime, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Document
    document_url = Column(String, nullable=True)
    
    # Summary
    opening_balance = Column(Float, nullable=False)
    closing_balance = Column(Float, nullable=False)
    total_credits = Column(Float, default=0.0, nullable=False)
    total_debits = Column(Float, default=0.0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    account = relationship("Account", back_populates="statements")
