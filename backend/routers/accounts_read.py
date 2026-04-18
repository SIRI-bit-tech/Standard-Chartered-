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
from utils.logger import logger

router = APIRouter()

from utils.crypto import get_crypto_price


@router.get("/crypto-price")
async def get_crypto_price_endpoint(symbol: str = Query("bitcoin")):
    """Get crypto price using the centralized utility."""
    try:
        price = await get_crypto_price(symbol)
        return {"success": True, "price": price, "source": "real-time"}
    except Exception as e:
        logger.error(f"Endpoint failed to get price for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Price data for {symbol} is currently unavailable."
        )


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
                "created_at": acc.created_at.isoformat() + 'Z',
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
            "created_at": account.created_at.isoformat() + 'Z',
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
                "created_at": t.created_at.isoformat() + 'Z',
                "status": t.status,
            }
            for t in transactions
        ],
        "message": "Transactions retrieved",
    }


def _get_transaction_subtitle(transaction, direction: str) -> str:
    """Get meaningful subtitle for generated transactions"""
    desc = getattr(transaction, "description", "")
    if not desc:
        return "Credit" if direction == "credit" else "Debit"
    
    desc_str = str(desc)
    
    # Check for specific transaction types with priority order
    if any(keyword in desc_str for keyword in ["Bill Payment"]):
        return "Bill Payment"
    elif any(keyword in desc_str for keyword in ["Loan Payment"]):
        return "Loan Payment"
    elif "Salary" in desc_str or "Payroll" in desc_str:
        return "Salary/Payroll"
    elif "Bonus" in desc_str or "Commission" in desc_str:
        return "Bonus/Commission"
    elif "Dividend" in desc_str:
        return "Dividend"
    elif "Investment" in desc_str or "Stock" in desc_str:
        return "Investment"
    elif "Tax Refund" in desc_str:
        return "Tax Refund"
    elif "Insurance" in desc_str:
        return "Insurance"
    elif "Rental Income" in desc_str:
        return "Rental Income"
    elif "Freelance" in desc_str:
        return "Freelance"
    elif "Check Deposit" in desc_str or "Check deposit" in desc_str:
        return "Check Deposit"
    elif "Zelle" in desc_str:
        return "Zelle"
    elif "Venmo" in desc_str:
        return "Venmo"
    elif "Cash App" in desc_str:
        return "Cash App"
    elif "PayPal" in desc_str:
        return "PayPal"
    elif "Wire transfer" in desc_str or "Wire Transfer" in desc_str:
        return "Wire Transfer"
    elif "Purchase" in desc_str:
        return "Purchase"
    elif "Subscription" in desc_str:
        return "Subscription"
    elif "Crypto" in desc_str or "Bitcoin" in desc_str or "Ethereum" in desc_str:
        return "Cryptocurrency"
    elif any(keyword in desc_str for keyword in ["Transfer", "Payment"]):
        return "Transfer"
    else:
        return "Credit" if direction == "credit" else "Debit"


@router.get("/{account_id}/history")
async def get_account_history(
    account_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return enriched history items for a single account, matching transfers/history formatting."""
    # Ensure the requester owns this account
    account = await _get_owned_account(db, account_id, user_id)

    # Get total count
    from sqlalchemy import func
    count_res = await db.execute(
        select(func.count(Transaction.id)).where(Transaction.account_id == account_id)
    )
    total = count_res.scalar() or 0

    # Load recent transactions for this account
    offset = (page - 1) * page_size
    tx_res = await db.execute(
        select(Transaction)
        .where(Transaction.account_id == account_id)
        .order_by(Transaction.created_at.desc())
        .limit(page_size)
        .offset(offset)
    )
    txs = list(tx_res.scalars().all())

    # Batch load transfers referenced by these transactions (if any)
    transfer_ids = [getattr(t, "transfer_id", None) for t in txs if getattr(t, "transfer_id", None)]
    transfer_map = {}
    if transfer_ids:
        tr_res = await db.execute(select(Transfer).where(Transfer.id.in_(transfer_ids)))
        transfer_map = {tr.id: tr for tr in tr_res.scalars().all()}

    # Batch load bill payments for payment-linked transactions
    from models.bill_payment import BillPayment, BillPayee
    payment_ids = [getattr(t, "payment_id", None) for t in txs if getattr(t, "payment_id", None)]
    bill_map = {}
    payee_map = {}
    if payment_ids:
        bp_res = await db.execute(select(BillPayment).where(BillPayment.id.in_(payment_ids)))
        bill_map = {bp.id: bp for bp in bp_res.scalars().all()}
        payee_ids = [bp.payee_id for bp in bill_map.values()]
        if payee_ids:
            py_res = await db.execute(select(BillPayee).where(BillPayee.id.in_(payee_ids)))
            payee_map = {py.id: py for py in py_res.scalars().all()}

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
            if direction == "debit":
                # Outgoing: show the recipient (destination account user)
                dest_acc = acc_map.get(getattr(tr, "to_account_id", None)) if acc_map else None
                if dest_acc:
                    if dest_acc.user_id == user_id:
                        # Internal transfer to own account -> show user's name
                        counterparty = my_display_name or "Siri Dev"
                    else:
                        u = user_map.get(dest_acc.user_id) if user_map else None
                        if u:
                            full_name = f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip()
                            counterparty = full_name or getattr(u, "username", None) or "Recipient"
                else:
                    # External transfer - extract from description
                    name = None
                    try:
                        desc = str(getattr(tr, "description", ""))
                        if "|" in desc:
                            name = desc.split("|", 1)[0].strip()
                    except: pass
                    counterparty = name or getattr(tr, "description", None) or "Recipient"
            else:
                # Incoming: show the sender (source account user)
                src_acc = acc_map.get(getattr(tr, "from_account_id", None)) if acc_map else None
                if src_acc:
                    if src_acc.user_id == user_id:
                        # Internal transfer from own account -> show user's name
                        counterparty = my_display_name or "Siri Dev"
                    else:
                        u = user_map.get(src_acc.user_id) if user_map else None
                        if u:
                            full_name = f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip()
                            counterparty = full_name or getattr(u, "username", None) or "Sender"
                else:
                    # For external incoming - extract from description
                    name = None
                    try:
                        desc = str(getattr(tr, "description", ""))
                        if "|" in desc:
                            parts = [p.strip() for p in desc.split("|", 1)]
                            name = parts[0]
                            if len(parts) == 2:
                                bank_name = parts[1]
                    except: pass
                    counterparty = name or getattr(tr, "description", None) or "External Bank"
            # Extract recipient bank from encoded "name | bank" where applicable
            if not bank_name:
                try:
                    if getattr(tr, "description", None) and "|" in str(tr.description):
                        parts = [p.strip() for p in str(tr.description).split("|", 1)]
                        if len(parts) == 2:
                            bank_name = parts[1]
                except Exception:
                    bank_name = None
        
        # If this is a bill payment, prefer payee name and 'Bill Payment'
        if not counterparty and getattr(t, "payment_id", None):
            bp = bill_map.get(getattr(t, "payment_id"))
            if bp:
                payee = payee_map.get(getattr(bp, "payee_id", None))
                if payee:
                    counterparty = payee.name
                    subtitle = "Bill Payment"
                    bank_name = getattr(payee, "category", None)
        
        # For generated transactions, extract counterparty from description
        if not counterparty and getattr(t, "description", None):
            desc = str(t.description)
            
            # Check if this is a person-to-person transaction (Transfer/Payment/Zelle/etc from/to someone)
            if any(keyword in desc for keyword in [
                "Transfer from ", "Payment from ", "Zelle from ", "Wire transfer from ", 
                "Venmo from ", "Cash App from ", "Check deposit from ", "PayPal from ",
                "Transfer to ", "Payment to ", "Zelle to ", "Wire transfer to ", 
                "Check payment to ", "Venmo to ", "Cash App to ", "PayPal to "
            ]):
                # Extract name from description like "Transfer from John Smith" or "Payment to Jane Doe"
                if " from " in desc:
                    counterparty = desc.split(" from ", 1)[1].strip()
                elif " to " in desc:
                    counterparty = desc.split(" to ", 1)[1].strip()
            
            # Check for income/salary transactions (show as-is)
            elif any(keyword in desc for keyword in [
                "Salary", "Payroll", "Bonus", "Commission", "Tax Refund", 
                "Insurance Claim", "Investment Return", "Stock Dividend", 
                "Rental Income", "Business Income", "Freelance", "Dividend",
                "Crypto Investment", "Bitcoin", "Ethereum", "Cryptocurrency"
            ]):
                counterparty = desc
            
            # Check for check deposits (show as-is)
            elif any(keyword in desc for keyword in [
                "Check Deposit", "Payroll Check", "Tax Refund Check", 
                "Insurance Claim Check", "Dividend Check", "Settlement Check",
                "Refund Check", "Rebate Check", "Gift Check", "Inheritance Check"
            ]):
                counterparty = desc
            
            # Check for bill payments, loan payments, purchases (show as-is)
            elif any(keyword in desc for keyword in [
                "Bill Payment", "Loan Payment", "Purchase", "Subscription",
                "Utility Payment", "Credit Card Payment"
            ]):
                counterparty = desc
            
            else:
                # Fallback to full description
                counterparty = desc
        
        # Final fallback
        if not counterparty:
            counterparty = "External Bank" if direction == "debit" else "Incoming Transfer"

        items.append(
            {
                "id": t.id,
                "date": t.created_at.isoformat() + 'Z',
                "counterparty": counterparty,
                "subtitle": subtitle or _get_transaction_subtitle(t, direction),
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

    return {
        "success": True,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size
        },
        "message": "Account history retrieved"
    }

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
                "statement_date": s.statement_date.isoformat() + 'Z',
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
                "statement_date": statement.statement_date.isoformat() + 'Z',
                "period": {
                    "start": statement.start_date.isoformat() + 'Z',
                    "end": statement.end_date.isoformat() + 'Z'
                }
            },
            "message": "Statement document is not available for download",
        }
    
    return {
        "success": True,
        "data": {
            "download_url": download_url, 
            "statement_id": statement_id,
            "statement_date": statement.statement_date.isoformat() + 'Z',
            "period": {
                "start": statement.start_date.isoformat() + 'Z',
                "end": statement.end_date.isoformat() + 'Z'
            }
        },
        "message": "Statement download URL generated",
    }


