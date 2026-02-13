from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import uuid
import secrets
import json

from models.virtual_card import VirtualCard, VirtualCardType, VirtualCardStatus
from models.account import Account
from models.user import User
from database import get_db
from schemas.virtual_card import (
    CreateVirtualCardRequest, VirtualCardResponse, VirtualCardDetailResponse,
    VirtualCardListResponse, UpdateVirtualCardRequest, VirtualCardStatusRequest,
    VirtualCardBlockRequest, VirtualCardLimitUsageResponse
)
from utils.ably import AblyRealtimeManager
from utils.auth import get_current_user_id

# Mounted in main.py at prefix="/api/v1/cards". No local prefix to avoid double-prefix.
router = APIRouter(tags=["virtual-cards"])


def generate_virtual_card_number() -> str:
    """Generate a virtual card number"""
    return "4532" + "".join([str(secrets.randbelow(10)) for _ in range(12)])


def generate_cvv() -> str:
    """Generate CVV"""
    return str(secrets.randbelow(1000)).zfill(3)


def get_expiry_dates():
    """Get expiry month and year"""
    today = datetime.utcnow()
    expiry_date = today + timedelta(days=365)
    return expiry_date.month, expiry_date.year


@router.post("/create", response_model=VirtualCardDetailResponse)
async def create_virtual_card(
    request: CreateVirtualCardRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new virtual card"""
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
        # Enforce only DEBIT and CREDIT types and maximum of 2 cards per user (one per type)
        if request.card_type not in (VirtualCardType.DEBIT, VirtualCardType.CREDIT):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only debit or credit cards are allowed")
        
        # Begin transaction and lock user's virtual cards to prevent race conditions
        async with db.begin():
            # Re-query with row-level lock to serialize concurrent requests
            existing_result = await db.execute(
                select(VirtualCard)
                .where(VirtualCard.user_id == current_user_id)
                .with_for_update()  # Row-level lock
            )
            existing_cards = existing_result.scalars().all()
            
            # Re-check uniqueness after obtaining lock
            has_debit = any(c.card_type == VirtualCardType.DEBIT and c.status != VirtualCardStatus.CANCELLED for c in existing_cards)
            has_credit = any(c.card_type == VirtualCardType.CREDIT and c.status != VirtualCardStatus.CANCELLED for c in existing_cards)
            if (request.card_type == VirtualCardType.DEBIT and has_debit) or (request.card_type == VirtualCardType.CREDIT and has_credit):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have this card type")
            if sum(1 for c in existing_cards if c.status != VirtualCardStatus.CANCELLED) >= 2:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum of two cards allowed")
            
            expiry_month, expiry_year = get_expiry_dates()
            
            virtual_card = VirtualCard(
                id=str(uuid.uuid4()),
                user_id=current_user_id,
                account_id=request.account_id,
                card_number=generate_virtual_card_number(),
                card_type=request.card_type,
                status=VirtualCardStatus.PENDING,
                expiry_month=expiry_month,
                expiry_year=expiry_year,
                cvv=generate_cvv(),
                card_name=request.card_name,
                spending_limit=request.spending_limit,
                daily_limit=request.daily_limit,
                monthly_limit=request.monthly_limit,
                valid_from=request.valid_from or datetime.utcnow(),
                valid_until=request.valid_until,
                allowed_merchants=json.dumps(request.allowed_merchants or []),
                blocked_merchants=json.dumps(request.blocked_merchants or []),
                allowed_countries=json.dumps(request.allowed_countries or []),
                requires_3d_secure=request.requires_3d_secure,
                created_at=datetime.utcnow()
            )
            
            db.add(virtual_card)
            # Transaction commits automatically when exiting the context manager
        
        await db.refresh(virtual_card)
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "virtual_card_created",
            "Virtual Card Created",
            f"Your virtual card '{request.card_name}' has been created successfully."
        )
        
        return VirtualCardDetailResponse.from_orm(virtual_card)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create virtual card: {str(e)}"
        )


@router.get("/list", response_model=VirtualCardListResponse)
async def list_virtual_cards(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List all virtual cards for user"""
    try:
        cards_result = await db.execute(
            select(VirtualCard).where(VirtualCard.user_id == current_user_id)
        )
        cards = cards_result.scalars().all()
        
        active_count = sum(1 for c in cards if c.status == VirtualCardStatus.ACTIVE)
        blocked_count = sum(1 for c in cards if c.status == VirtualCardStatus.BLOCKED)
        
        return {
            "cards": [VirtualCardResponse.from_orm(c) for c in cards],
            "total_count": len(cards),
            "active_count": active_count,
            "blocked_count": blocked_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{card_id}", response_model=VirtualCardDetailResponse)
async def get_virtual_card(
    card_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get virtual card details"""
    try:
        card_result = await db.execute(
            select(VirtualCard).where(
                (VirtualCard.id == card_id) & (VirtualCard.user_id == current_user_id)
            )
        )
        card = card_result.scalar()
        
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Virtual card not found"
            )
        
        return VirtualCardDetailResponse.from_orm(card)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.patch("/{card_id}", response_model=VirtualCardResponse)
async def update_virtual_card(
    card_id: str,
    request: UpdateVirtualCardRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update virtual card"""
    try:
        card_result = await db.execute(
            select(VirtualCard).where(
                (VirtualCard.id == card_id) & (VirtualCard.user_id == current_user_id)
            )
        )
        card = card_result.scalar()
        
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Virtual card not found"
            )
        
        if request.card_name:
            card.card_name = request.card_name
        if request.spending_limit is not None:
            card.spending_limit = request.spending_limit
        if request.daily_limit is not None:
            card.daily_limit = request.daily_limit
        if request.monthly_limit is not None:
            card.monthly_limit = request.monthly_limit
        if request.requires_3d_secure is not None:
            card.requires_3d_secure = request.requires_3d_secure
        if request.allowed_merchants is not None:
            card.allowed_merchants = json.dumps(request.allowed_merchants)
        if request.blocked_merchants is not None:
            card.blocked_merchants = json.dumps(request.blocked_merchants)
        if request.allowed_countries is not None:
            card.allowed_countries = json.dumps(request.allowed_countries)
        
        card.updated_at = datetime.utcnow()
        db.add(card)
        await db.commit()
        await db.refresh(card)
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "virtual_card_updated",
            "Virtual Card Updated",
            f"Virtual card '{card.card_name}' has been updated."
        )
        
        return VirtualCardResponse.from_orm(card)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{card_id}/block", response_model=VirtualCardResponse)
async def block_virtual_card(
    card_id: str,
    request: VirtualCardBlockRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Block virtual card"""
    try:
        card_result = await db.execute(
            select(VirtualCard).where(
                (VirtualCard.id == card_id) & (VirtualCard.user_id == current_user_id)
            )
        )
        card = card_result.scalar()
        
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Virtual card not found"
            )
        
        card.status = VirtualCardStatus.BLOCKED
        card.updated_at = datetime.utcnow()
        db.add(card)
        await db.commit()
        await db.refresh(card)
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "virtual_card_blocked",
            "Virtual Card Blocked",
            f"Virtual card '{card.card_name}' has been blocked."
        )
        
        return VirtualCardResponse.from_orm(card)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{card_id}/unblock", response_model=VirtualCardResponse)
async def unblock_virtual_card(
    card_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Unblock virtual card"""
    try:
        card_result = await db.execute(
            select(VirtualCard).where(
                (VirtualCard.id == card_id) & (VirtualCard.user_id == current_user_id)
            )
        )
        card = card_result.scalar()
        
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Virtual card not found"
            )
        
        card.status = VirtualCardStatus.ACTIVE
        card.updated_at = datetime.utcnow()
        db.add(card)
        await db.commit()
        await db.refresh(card)
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "virtual_card_unblocked",
            "Virtual Card Unblocked",
            f"Virtual card '{card.card_name}' has been unblocked."
        )
        
        return VirtualCardResponse.from_orm(card)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{card_id}")
async def delete_virtual_card(
    card_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Cancel/delete virtual card"""
    try:
        card_result = await db.execute(
            select(VirtualCard).where(
                (VirtualCard.id == card_id) & (VirtualCard.user_id == current_user_id)
            )
        )
        card = card_result.scalar()
        
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Virtual card not found"
            )
        
        card.status = VirtualCardStatus.CANCELLED
        card.cancelled_at = datetime.utcnow()
        db.add(card)
        await db.commit()
        
        AblyRealtimeManager.publish_notification(
            current_user_id,
            "virtual_card_cancelled",
            "Virtual Card Cancelled",
            f"Virtual card '{card.card_name}' has been cancelled."
        )
        
        return {
            "success": True,
            "message": "Virtual card cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{card_id}/limit-usage", response_model=VirtualCardLimitUsageResponse)
async def get_card_limit_usage(
    card_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get card spending limit usage"""
    try:
        card_result = await db.execute(
            select(VirtualCard).where(
                (VirtualCard.id == card_id) & (VirtualCard.user_id == current_user_id)
            )
        )
        card = card_result.scalar()
        
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Virtual card not found"
            )
        
        spent = card.spent_this_month
        limit = card.monthly_limit
        remaining = limit - spent if limit else None
        percentage = (spent / limit * 100) if limit else 0
        
        return {
            "spending_limit": limit,
            "spent_amount": spent,
            "remaining_limit": remaining,
            "percentage_used": percentage,
            "currency": "USD"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
