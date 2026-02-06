"""
FastAPI routers for Standard Chartered Banking API.

This module exports all API route handlers for the banking application.
Each router is responsible for a specific domain (auth, accounts, transfers, etc.)
"""

from . import auth
from . import accounts
from . import transfers
from . import loans
from . import notifications
from . import support
from . import profile
from . import documents
from . import bill_payments
from . import deposits
from . import virtual_cards

__all__ = [
    "auth",
    "accounts",
    "transfers",
    "loans",
    "notifications",
    "support",
    "profile",
    "documents",
    "bill_payments",
    "deposits",
    "virtual_cards",
]
