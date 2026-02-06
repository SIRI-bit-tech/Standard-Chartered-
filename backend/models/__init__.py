"""
SQLAlchemy ORM models for Standard Chartered Banking API.

This module defines all database models for the banking application.
All models inherit from Base and are registered with the engine.
"""

from .user import User
from .account import Account, Statement
from .transaction import Transaction
from .transfer import Transfer, Beneficiary, TransferType, TransferStatus
from .loan import Loan, LoanApplication, LoanProduct, LoanPayment, LoanSchedule
from .notification import Notification, NotificationPreference
from .document import Document
from .support import SupportTicket, TicketMessage, Chat, ChatMessage, LoginHistory
from .bill_payment import BillPayment, BillPayee, ScheduledPayment
from .deposit import Deposit, DepositType, DepositStatus
from .virtual_card import VirtualCard, VirtualCardType, VirtualCardStatus

__all__ = [
    "User",
    "Account",
    "Statement",
    "Transaction",
    "Transfer",
    "Beneficiary",
    "TransferType",
    "TransferStatus",
    "Loan",
    "LoanApplication",
    "LoanProduct",
    "LoanPayment",
    "LoanSchedule",
    "Notification",
    "NotificationPreference",
    "Document",
    "SupportTicket",
    "TicketMessage",
    "Chat",
    "ChatMessage",
    "LoginHistory",
    "BillPayment",
    "BillPayee",
    "ScheduledPayment",
    "Deposit",
    "DepositType",
    "DepositStatus",
    "VirtualCard",
    "VirtualCardType",
    "VirtualCardStatus",
]
