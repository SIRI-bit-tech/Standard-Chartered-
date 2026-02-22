from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.account import Account, Statement
from models.user import User
from models.transaction import Transaction
from models.transfer import Transfer
from database import get_db
from utils.auth import get_current_user_id
from utils.account_helpers import _get_owned_account, _get_statement_by_id
import httpx
from datetime import datetime, timedelta

router = APIRouter()

# Simple in-memory cache for crypto prices to avoid rate limits
price_cache = {}
CACHE_TTL = 60 # seconds


@router.get("/crypto-price")
async def get_crypto_price(symbol: str = Query("bitcoin")):
    """Get crypto price with caching to avoid rate limits"""
    now = datetime.now()
    
    # Check cache
    if symbol in price_cache:
        cached_price, expiry = price_cache[symbol]
        if now < expiry:
            return {"success": True, "price": cached_price, "source": "cache"}

    # Fetch from CoinGecko
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={symbol}&vs_currencies=usd"
            response = await client.get(url, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                if symbol in data and "usd" in data[symbol]:
                    price = float(data[symbol]["usd"])
                    # Update cache
                    price_cache[symbol] = (price, now + timedelta(seconds=CACHE_TTL))
                    return {"success": True, "price": price, "source": "api"}
            
            # If rate limited or error, try to return expired cache if exists
            if symbol in price_cache:
                return {"success": True, "price": price_cache[symbol][0], "source": "expired_cache"}
                
            # Fallback
            return {"success": True, "price": 65000.0, "source": "fallback"}
            
    except Exception as e:
        print(f"Error fetching crypto price: {e}")
        if symbol in price_cache:
            return {"success": True, "price": price_cache[symbol][0], "source": "expired_cache"}
        return {"success": True, "price": 65000.0, "source": "fallback"}


@router.get("/")
async def get_accounts(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get all accounts for the authenticated user"""
    result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = result.scalars().all()
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    uc = ((user.country if user else "") or "").strip().upper()
    is_us = uc in ("US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA")

    return {
        "success": True,
        "data": [
            {
                "id": acc.id,
                "account_number": acc.account_number,
                "type": acc.account_type,
                "currency": acc.currency,
                "balance": acc.balance,
                "available_balance": acc.available_balance,
                "status": acc.status,
                "nickname": acc.nickname or f"{getattr(acc.account_type, 'value', 'Account')} Account",
                "interest_rate": acc.interest_rate,
                "is_primary": acc.is_primary,
                "overdraft_limit": acc.overdraft_limit,
                "routing_number": acc.routing_number or ("026002561" if is_us else None),
                "wallet_id": acc.wallet_id,
                "wallet_qrcode": getattr(acc, "wallet_qrcode", None),
                "created_at": acc.created_at.isoformat(),
            }
            for acc in accounts
        ],
        "message": "Accounts retrieved successfully",
    }


@router.get("/{account_id}")
async def get_account_details(
    account_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get specific account details for authenticated user"""
    account = await _get_owned_account(db, account_id, user_id)
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    uc = ((user.country if user else "") or "").strip().upper()
    is_us = uc in ("US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA")

    return {
        "success": True,
        "data": {
            "id": account.id,
            "account_number": account.account_number,
            "type": account.account_type,
            "currency": account.currency,
            "balance": account.balance,
            "available_balance": account.available_balance,
            "status": account.status,
            "nickname": account.nickname,
            "interest_rate": account.interest_rate,
            "is_primary": account.is_primary,
            "overdraft_limit": account.overdraft_limit,
            "routing_number": account.routing_number or ("026002561" if is_us else None),
            "wallet_id": account.wallet_id,
            "wallet_qrcode": getattr(account, "wallet_qrcode", None),
            "created_at": account.created_at.isoformat(),
        },
        "message": "Account details retrieved",
    }


@router.get("/{account_id}/balance")
async def get_balance(
    account_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get real-time balance (authenticated + owned account only)"""
    account = await _get_owned_account(db, account_id, user_id)

    return {
        "success": True,
        "data": {
            "account_id": account.id,
            "balance": account.balance,
            "available_balance": account.available_balance,
            "currency": account.currency,
        },
        "message": "Balance retrieved",
    }


@router.get("/{account_id}/transactions")
async def get_transactions(
    account_id: str,
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get transaction history for an owned account"""
    await _get_owned_account(db, account_id, user_id)

    result = await db.execute(
        select(Transaction)
        .where(Transaction.account_id == account_id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    transactions = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": t.id,
                "type": t.type,
                "amount": t.amount,
                "currency": t.currency,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
                "status": t.status,
            }
            for t in transactions
        ],
        "message": "Transactions retrieved",
    }


@router.get("/{account_id}/history")
async def get_account_history(
    account_id: str,
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return enriched history items for a single account, matching transfers/history formatting."""
    # Ensure the requester owns this account
    account = await _get_owned_account(db, account_id, user_id)

    # Load recent transactions for this account
    tx_res = await db.execute(
        select(Transaction)
        .where(Transaction.account_id == account_id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    txs = list(tx_res.scalars().all())

    # Batch load transfers referenced by these transactions (if any)
    transfer_ids = [getattr(t, "transfer_id", None) for t in txs if getattr(t, "transfer_id", None)]
    transfer_map = {}
    if transfer_ids:
        tr_res = await db.execute(select(Transfer).where(Transfer.id.in_(transfer_ids)))
        transfer_map = {tr.id: tr for tr in tr_res.scalars().all()}

    # Batch load accounts referenced by transfers to resolve names/ownership
    to_ids = [getattr(tr, "to_account_id", None) for tr in transfer_map.values() if getattr(tr, "to_account_id", None)]
    from_ids = [getattr(tr, "from_account_id", None) for tr in transfer_map.values() if getattr(tr, "from_account_id", None)]
    acc_ids = list({*(to_ids or []), *(from_ids or [])})
    acc_map = {}
    if acc_ids:
        acc_res = await db.execute(select(Account).where(Account.id.in_(acc_ids)))
        acc_map = {a.id: a for a in acc_res.scalars().all()}

    # Batch load users for those accounts to display sender names
    user_ids = list({a.user_id for a in acc_map.values()}) if acc_map else []
    user_map = {}
    if user_ids:
        u_res = await db.execute(select(User).where(User.id.in_(user_ids)))
        user_map = {u.id: u for u in u_res.scalars().all()}
    # Current user display name (sender label for debits)
    my_display_name = None
    if user_id:
        me = user_map.get(user_id)
        if not me:
            # If current user wasn't in the above set (possible when only external accounts present), fetch explicitly
            u_res2 = await db.execute(select(User).where(User.id == user_id))
            me = u_res2.scalar_one_or_none()
        if me:
            full = f"{getattr(me, 'first_name', '')} {getattr(me, 'last_name', '')}".strip()
            my_display_name = full or getattr(me, "username", None) or "Sender"

    # Helper to mask this account number
    def mask_account() -> str:
        acc_label = account.account_type.value if hasattr(account.account_type, "value") else str(account.account_type)
        last4 = account.account_number[-4:] if getattr(account, "account_number", None) else "—"
        return f"...{last4} ({acc_label.title()})"

    # Best-effort determine debit/credit using type and amount sign
    def is_debit(t) -> bool:
        tval = getattr(getattr(t, "type", None), "value", None) or str(getattr(t, "type", None))
        tval = tval.lower() if isinstance(tval, str) else str(tval).lower()
        return tval in ("debit", "withdrawal", "fee", "payment", "transfer")

    def type_label(tr_type) -> str:
        try:
            tval = tr_type.value if hasattr(tr_type, "value") else str(tr_type)
        except Exception:
            tval = str(tr_type)
        return {
            "internal": "Internal Transfer",
            "domestic": "Domestic Transfer",
            "international": "International Transfer",
            "ach": "ACH Transfer",
            "wire": "Wire Transfer",
        }.get(str(tval).lower(), str(tval).title())

    items = []
    for t in txs:
        direction = "debit" if is_debit(t) else "credit"
        tr = transfer_map.get(getattr(t, "transfer_id", None))

        counterparty = None
        subtitle = None
        bank_name = None
        if tr:
            subtitle = type_label(getattr(tr, "type", None))
            # For outgoing from this account, show current user's name (like transfer history)
            if direction == "debit":
                counterparty = my_display_name or "Sender"
            else:
                # Incoming: try to resolve sender account/user first
                src_acc = acc_map.get(getattr(tr, "from_account_id", None)) if acc_map else None
                if src_acc:
                    if src_acc.user_id == user_id:
                        # Sender is one of our own accounts
                        acc_label = getattr(src_acc.account_type, "value", str(src_acc.account_type)).title()
                        counterparty = src_acc.nickname or f"Own {acc_label} Account"
                    else:
                        u = user_map.get(src_acc.user_id) if user_map else None
                        if u:
                            full_name = f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip()
                            counterparty = full_name or getattr(u, "username", None) or "Sender"
                # Fallback: prefer encoded sender name "name | bank" in transfer.description
                if not counterparty:
                    try:
                        desc = getattr(tr, "description", None)
                        if desc and "|" in str(desc):
                            parts = [p.strip() for p in str(desc).split("|", 1)]
                            if parts:
                                counterparty = parts[0]
                            if len(parts) == 2:
                                bank_name = parts[1]
                    except Exception:
                        pass
        # Fallbacks
        if not counterparty:
            if getattr(t, "description", None):
                counterparty = t.description
            else:
                counterparty = "External Bank" if direction == "debit" else "Incoming Transfer"

        items.append(
            {
                "id": t.id,
                "date": t.created_at.isoformat(),
                "counterparty": counterparty,
                "subtitle": subtitle or ("Credit" if direction == "credit" else "Debit"),
                "bank_name": bank_name,
                "reference": getattr(t, "reference_number", None),
                "account_masked": mask_account(),
                "status": getattr(getattr(t, "status", None), "value", None) or str(getattr(t, "status", "")),
                "amount": t.amount if direction == "credit" else -t.amount,
                "currency": t.currency,
                "direction": direction,
                "transfer_id": getattr(t, "transfer_id", None),
            }
        )

    return {"success": True, "data": {"items": items, "total": len(items)}, "message": "Account history retrieved"}

@router.get("/{account_id}/statements")
async def get_statements(
    account_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get account statements for an owned account"""
    await _get_owned_account(db, account_id, user_id)

    result = await db.execute(
        select(Statement)
        .where(Statement.account_id == account_id)
        .order_by(Statement.statement_date.desc())
    )
    statements = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "statement_date": s.statement_date.isoformat(),
                "document_url": s.document_url,
            }
            for s in statements
        ],
        "message": "Statements retrieved",
    }


@router.get("/{account_id}/statements/{statement_id}/download")
async def download_statement(
    account_id: str,
    statement_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Download eStatement (authenticated + owned account only)"""
    # Verify account ownership
    await _get_owned_account(db, account_id, user_id)
    
    # Verify statement exists and belongs to the account
    statement = await _get_statement_by_id(db, statement_id, account_id)
    
    # Generate download URL using the statement's document_url
    download_url = statement.document_url
    
    if not download_url:
        return {
            "success": False,
            "error": "Statement document not available",
            "data": {
                "download_url": None, 
                "statement_id": statement_id,
                "statement_date": statement.statement_date.isoformat(),
                "period": {
                    "start": statement.start_date.isoformat(),
                    "end": statement.end_date.isoformat()
                }
            },
            "message": "Statement document is not available for download",
        }
    
    return {
        "success": True,
        "data": {
            "download_url": download_url, 
            "statement_id": statement_id,
            "statement_date": statement.statement_date.isoformat(),
            "period": {
                "start": statement.start_date.isoformat(),
                "end": statement.end_date.isoformat()
            }
        },
        "message": "Statement download URL generated",
    }


