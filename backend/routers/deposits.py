from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime, timedelta
import uuid
import random

from models.deposit import Deposit, DepositType, DepositStatus
from models.account import Account, AccountStatus
from models.user import User
from database import get_db
from schemas.deposit import (
    CheckDepositRequest, DirectDepositSetupRequest, DepositResponse,
    DepositListResponse, DepositVerificationRequest, DepositStatusUpdateResponse,
    CheckParseRequest, CheckParseResponse
)
from utils.ably import AblyRealtimeManager
from utils.auth import get_current_user_id
import httpx
import asyncio
from utils.ocr import extract_check_details, ocr_status, extract_check_details_remote
from config import settings
from urllib.parse import urlparse
import socket
import ipaddress
import ssl
from typing import List, Tuple

router = APIRouter(tags=["deposits"])

async def _ensure_user_active(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")


def _is_host_allowed(host: str) -> bool:
    allowlist = getattr(settings, "TRUSTED_STORAGE_DOMAINS", "")
    entries = [e.strip().lower() for e in allowlist.split(",") if e and e.strip()]
    if not entries:
        return False
    if any(e in ("*", "all") for e in entries):
        return True
    h = (host or "").lower()
    for e in entries:
        if e.startswith("*."):
            suf = e[1:]
            if h.endswith(suf) or h == e[2:]:
                return True
        elif h == e or h.endswith("." + e):
            return True
    return False


async def _validate_public_https_url(u: str) -> Tuple[str, int, str, List[str]]:
    try:
        p = urlparse(u)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image URL")
    if p.scheme != "https" or not p.hostname:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image URL")
    if not _is_host_allowed(p.hostname):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Untrusted image host")
    try:
        infos = await asyncio.to_thread(socket.getaddrinfo, p.hostname, None)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not resolve image host")
    ips: List[str] = []
    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image host address")
        if any([
            ip.is_private,
            ip.is_loopback,
            ip.is_link_local,
            ip.is_multicast,
            ip.is_reserved,
            ip.is_unspecified,
        ]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Disallowed image host address")
        ips.append(ip_str)
    target = p.path or "/"
    if p.query:
        target = f"{target}?{p.query}"
    port = p.port or 443
    return p.hostname, port, target, sorted(set(ips))


async def _fetch_https_via_ip(host: str, port: int, target: str, ips: List[str]) -> bytes:
    if not ips:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid IP for image host")
    ip = ips[0]
    context = ssl.create_default_context()
    try:
        reader, writer = await asyncio.open_connection(ip, port, ssl=context, server_hostname=host)
        host_header = f"{host}:{port}" if port != 443 else host
        request = (
            f"GET {target} HTTP/1.1\r\n"
            f"Host: {host_header}\r\n"
            "User-Agent: standard-chartered-backend/1.0\r\n"
            "Accept: */*\r\n"
            "Connection: close\r\n"
            "\r\n"
        ).encode("ascii")
        writer.write(request)
        await writer.drain()

        # Read response headers
        header_bytes = b""
        while b"\r\n\r\n" not in header_bytes:
            chunk = await reader.read(4096)
            if not chunk:
                break
            header_bytes += chunk
            if len(header_bytes) > 65536:  # 64KB header guard
                break
        parts = header_bytes.split(b"\r\n\r\n", 1)
        if len(parts) != 2:
            writer.close()
            try:
                await writer.wait_closed()
            finally:
                pass
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid HTTP response")
        header_block, remainder = parts
        lines = header_block.split(b"\r\n")
        if not lines:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid HTTP response")
        status_line = lines[0].decode("iso-8859-1", "ignore")
        try:
            status_code = int(status_line.split(" ")[1])
        except Exception:
            status_code = 0
        headers = {}
        for line in lines[1:]:
            if b":" in line:
                k, v = line.split(b":", 1)
                headers[k.decode("iso-8859-1").strip().lower()] = v.decode("iso-8859-1").strip()
        if status_code < 200 or status_code >= 300:
            writer.close()
            try:
                await writer.wait_closed()
            finally:
                pass
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image fetch failed: {status_code}")

        body = bytearray()
        te = headers.get("transfer-encoding", "").lower()
        cl = headers.get("content-length")
        body.extend(remainder)
        if "chunked" in te:
            # Read chunked encoding
            while True:
                # read chunk size line
                line = await reader.readline()
                if not line:
                    break
                line = line.strip()
                try:
                    size = int(line.split(b";", 1)[0], 16)
                except Exception:
                    size = 0
                if size == 0:
                    # Read trailing CRLF
                    await reader.readexactly(2)
                    break
                data = await reader.readexactly(size)
                body.extend(data)
                # read CRLF after chunk
                await reader.readexactly(2)
        elif cl is not None:
            try:
                expected = int(cl)
            except Exception:
                expected = None
            if expected is not None:
                remaining = max(0, expected - len(remainder))
                if remaining:
                    body.extend(await reader.readexactly(remaining))
            else:
                while True:
                    data = await reader.read(65536)
                    if not data:
                        break
                    body.extend(data)
        else:
            while True:
                data = await reader.read(65536)
                if not data:
                    break
                body.extend(data)
        writer.close()
        try:
            await writer.wait_closed()
        finally:
            pass
        return bytes(body)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to fetch image: {str(e)}")


@router.post("/parse-check", response_model=CheckParseResponse)
async def parse_check_image(
    request: CheckParseRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    try:
        host, port, target, ips = await _validate_public_https_url(request.front_image_url)
        provider = (settings.OCR_PROVIDER or "").strip().lower()
        if provider:
            result = await extract_check_details_remote(request.front_image_url)
        else:
            content = await _fetch_https_via_ip(host, port, target, ips)
            result = await asyncio.to_thread(extract_check_details, content)
        if not result.get("supported"):
            detail = result.get("error") or "OCR not configured"
            raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=detail)
        return {
            "success": True,
            "amount": result.get("amount"),
            "check_number": result.get("check_number"),
            "raw_text": result.get("text"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/ocr-health")
async def get_ocr_health(
    current_user_id: str = Depends(get_current_user_id),
):
    try:
        status_info = ocr_status()
        return {"success": True, "status": status_info}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/check-deposit", response_model=DepositStatusUpdateResponse)
async def initiate_check_deposit(
    request: CheckDepositRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Initiate mobile check deposit"""
    try:
        await _ensure_user_active(db, current_user_id)
        account_result = await db.execute(
            select(Account).where(Account.id == request.account_id)
        )
        account = account_result.scalar()
        
        if not account or account.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        if getattr(account, "status", None) and account.status != AccountStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account inactive"
            )
        
        verification_code = str(random.randint(100000, 999999))
        
        deposit = Deposit(
            id=str(uuid.uuid4()),
            account_id=request.account_id,
            user_id=current_user_id,
            type=DepositType.MOBILE_CHECK_DEPOSIT,
            status=DepositStatus.PENDING,
            amount=request.amount,
            currency=request.currency,
            check_number=request.check_number,
            check_issuer_bank=request.check_issuer_bank,
            name_on_check=request.name_on_check,
            front_image_url=request.front_image_url,
            reference_number=f"CHK-{uuid.uuid4().hex[:12].upper()}",
            is_verified=True,  # Auto-verify submission for now
            created_at=datetime.utcnow()
        )
        
        db.add(deposit)
        await db.commit()
        await db.refresh(deposit)
        try:
            AblyRealtimeManager.publish_notification(
                current_user_id,
                "check_deposit_submitted",
                "Check Deposit Submitted",
                f"Check deposit of {request.currency} {request.amount} has been submitted and is pending review."
            )
        except Exception:
            pass
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.PENDING,
            "message": "Check deposit submitted successfully and is pending review."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate check deposit: {str(e)}"
        )


@router.post("/verify-check-deposit", response_model=DepositStatusUpdateResponse)
async def verify_check_deposit(
    request: DepositVerificationRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Verify check deposit with verification code"""
    try:
        deposit_result = await db.execute(
            select(Deposit).where(
                (Deposit.id == request.deposit_id) & (Deposit.user_id == current_user_id)
            )
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deposit not found"
            )
        
        if deposit.verification_code != request.verification_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )
        
        deposit.is_verified = True
        deposit.verified_at = datetime.utcnow()
        deposit.status = DepositStatus.VERIFIED
        db.add(deposit)
        await db.commit()
        try:
            AblyRealtimeManager.publish_notification(
                current_user_id,
                "check_deposit_verified",
                "Check Verified",
                f"Check deposit of {deposit.currency} {deposit.amount} has been verified and is being processed."
            )
        except Exception:
            pass
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.VERIFIED,
            "message": "Check deposit verified successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/direct-deposit/setup", response_model=DepositStatusUpdateResponse)
async def setup_direct_deposit(
    request: DirectDepositSetupRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Setup direct deposit"""
    try:
        account_result = await db.execute(
            select(Account).where(Account.id == request.account_id)
        )
        account = account_result.scalar()
        
        if not account or account.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        
        deposit = Deposit(
            id=str(uuid.uuid4()),
            account_id=request.account_id,
            user_id=current_user_id,
            type=DepositType.DIRECT_DEPOSIT,
            status=DepositStatus.COMPLETED,
            amount=0.0,
            currency="USD",
            direct_deposit_routing_number=request.routing_number,
            direct_deposit_account_number=request.account_number,
            employer_name=request.employer_name,
            employer_id=request.employer_id,
            reference_number=f"DD-{uuid.uuid4().hex[:12].upper()}",
            is_verified=True,
            verified_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        
        db.add(deposit)
        await db.commit()
        await db.refresh(deposit)
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "direct_deposit_setup",
            "Direct Deposit Setup",
            "Direct deposit has been setup successfully. You can now receive employer payments."
        )
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.COMPLETED,
            "message": "Direct deposit configured successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/list", response_model=DepositListResponse)
async def list_deposits(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List all deposits for user"""
    try:
        acc_res = await db.execute(select(Account.id).where(Account.user_id == current_user_id))
        acc_ids = [row[0] for row in acc_res.all()]
        q = select(Deposit).where(
            or_(
                Deposit.user_id == current_user_id,
                Deposit.account_id.in_(acc_ids) if acc_ids else False,
            )
        ).order_by(Deposit.created_at.desc())
        deposits_result = await db.execute(q)
        records = deposits_result.scalars().all()
        deposits = [
            {
                "id": d.id,
                "account_id": d.account_id,
                "type": getattr(d.type, "value", str(d.type)),
                "status": getattr(d.status, "value", str(d.status)),
                "amount": d.amount,
                "currency": d.currency,
                "reference_number": d.reference_number,
                "check_number": d.check_number,
                "name_on_check": d.name_on_check,
                "front_image_url": d.front_image_url,
                "created_at": d.created_at,
                "completed_at": d.completed_at,
                "is_verified": d.is_verified,
            }
            for d in records
        ]
        pending_count = sum(1 for d in records if getattr(d.status, "value", str(d.status)) == DepositStatus.PENDING.value)
        completed_count = sum(1 for d in records if getattr(d.status, "value", str(d.status)) == DepositStatus.COMPLETED.value)
        deposits.sort(key=lambda x: x["created_at"] or 0, reverse=True)
        return {
            "success": True,
            "deposits": deposits,
            "total_count": len(records),
            "pending_count": pending_count,
            "completed_count": completed_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{deposit_id}", response_model=DepositResponse)
async def get_deposit(
    deposit_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get deposit details"""
    try:
        deposit_result = await db.execute(
            select(Deposit).where(
                (Deposit.id == deposit_id) & (Deposit.user_id == current_user_id)
            )
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deposit not found"
            )
        
        return DepositResponse.from_orm(deposit)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{deposit_id}")
async def cancel_deposit(
    deposit_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Cancel pending deposit"""
    try:
        deposit_result = await db.execute(
            select(Deposit).where(
                (Deposit.id == deposit_id) & (Deposit.user_id == current_user_id)
            )
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deposit not found"
            )
        
        if deposit.status not in [DepositStatus.PENDING, DepositStatus.PROCESSING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel deposit with status: {deposit.status}"
            )
        
        deposit.status = DepositStatus.CANCELLED
        db.add(deposit)
        await db.commit()
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "deposit_cancelled",
            "Deposit Cancelled",
            f"Deposit {deposit.reference_number} has been cancelled."
        )
        
        return {
            "success": True,
            "message": "Deposit cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
