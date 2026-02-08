from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
import uuid
import json

from models.admin import AdminUser, AdminAuditLog, AdminRole
from models.user import User
from models.transfer import Transfer, TransferStatus
from models.deposit import Deposit, DepositStatus
from models.virtual_card import VirtualCard, VirtualCardStatus
from models.loan import Loan, LoanStatus
from database import get_db
from schemas.admin import (
    AdminRegisterRequest, AdminLoginRequest, AdminResponse,
    ApproveTransferRequest, DeclineTransferRequest, TransferApprovalResponse,
    ApproveDepositRequest, DeclineDepositRequest, DepositApprovalResponse,
    ApproveVirtualCardRequest, DeclineVirtualCardRequest, VirtualCardApprovalResponse,
    AdminCreateUserRequest, AdminEditUserRequest, AdminAuditLogResponse,
    AdminStatisticsResponse
)
from utils.admin_auth import AdminAuthManager, AdminPermissionManager
from utils.errors import (
    ValidationError, AuthenticationError, NotFoundError, UnauthorizedError, InternalServerError
)
from utils.logger import logger
from utils.ably import AblyRealtimeManager

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/auth/register", response_model=AdminResponse)
async def admin_register(
    request: AdminRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin registration with admin code"""
    try:
        # Validate admin code
        if not AdminAuthManager.validate_admin_code(request.admin_code):
            logger.warning(f"Invalid admin code attempted for email: {request.email}")
            raise ValidationError(
                field="admin_code",
                message="Invalid admin code",
                error_code="INVALID_ADMIN_CODE"
            )
        
        # Check if admin exists
        existing = await db.execute(
            select(AdminUser).where(
                (AdminUser.email == request.email) | (AdminUser.username == request.username)
            )
        )
        if existing.scalar():
            raise ValidationError(
                field="email",
                message="Admin with this email or username already exists",
                error_code="ADMIN_EXISTS"
            )
        
        # Create admin user
        new_admin = AdminUser(
            id=str(uuid.uuid4()),
            email=request.email,
            username=request.username,
            password_hash=AdminAuthManager.hash_password(request.password),
            first_name=request.first_name,
            last_name=request.last_name,
            department=request.department,
            role=AdminRole.MODERATOR,  # Default role
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(new_admin)
        await db.commit()
        await db.refresh(new_admin)
        
        logger.info(f"Admin registered: {new_admin.email}")
        
        return AdminResponse.from_orm(new_admin)
    except ValidationError:
        raise
    except Exception as e:
        logger.error("Admin registration failed", error=e)
        raise InternalServerError(
            operation="admin registration",
            error_code="REGISTRATION_FAILED",
            original_error=e
        )


@router.post("/auth/login")
async def admin_login(
    request: AdminLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin login"""
    try:
        result = await db.execute(
            select(AdminUser).where(AdminUser.email == request.email)
        )
        admin = result.scalar()
        
        if not admin or not AdminAuthManager.verify_password(request.password, admin.password_hash):
            logger.warning(f"Failed login attempt for admin: {request.email}")
            raise AuthenticationError(
                message="Invalid email or password",
                error_code="INVALID_CREDENTIALS"
            )
        
        if not admin.is_active:
            raise AuthenticationError(
                message="Admin account is inactive",
                error_code="ACCOUNT_INACTIVE"
            )
        
        # Validate additional admin code if provided
        if request.admin_code and not AdminAuthManager.validate_admin_login_code(request.admin_code):
            raise AuthenticationError(
                message="Invalid admin code",
                error_code="INVALID_ADMIN_CODE"
            )
        
        # Update last login
        admin.last_login = datetime.utcnow()
        db.add(admin)
        await db.commit()
        
        # Generate tokens
        access_token = AdminAuthManager.create_access_token(admin.id, admin.email, admin.role)
        refresh_token = AdminAuthManager.create_refresh_token(admin.id)
        
        logger.info(f"Admin logged in: {admin.email}")
        
        return {
            "success": True,
            "message": "Login successful",
            "data": {
                "admin_id": admin.id,
                "email": admin.email,
                "role": admin.role
            },
            "token": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": 3600
            }
        }
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error("Admin login failed", error=e)
        raise InternalServerError(
            operation="admin login",
            error_code="LOGIN_FAILED",
            original_error=e
        )


@router.post("/transfers/approve", response_model=TransferApprovalResponse)
async def approve_transfer(
    admin_id: str,
    request: ApproveTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve pending transfer"""
    try:
        # Verify admin exists and has permission
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "transfers:approve"):
            logger.warning(f"Unauthorized transfer approval attempt by {admin.email}")
            raise UnauthorizedError(
                message="You don't have permission to approve transfers",
                error_code="PERMISSION_DENIED"
            )
        
        # Get transfer
        transfer_result = await db.execute(
            select(Transfer).where(Transfer.id == request.transfer_id)
        )
        transfer = transfer_result.scalar()
        
        if not transfer:
            raise NotFoundError(
                resource="Transfer",
                error_code="TRANSFER_NOT_FOUND"
            )
        
        # Approve transfer
        transfer.status = TransferStatus.APPROVED
        db.add(transfer)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="approve_transfer",
            resource_type="transfer",
            resource_id=transfer.id,
            details=json.dumps({"notes": request.notes})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            transfer.from_user_id,
            "transfer_approved",
            "Transfer Approved",
            f"Your transfer of {transfer.currency} {transfer.amount} has been approved."
        )
        
        logger.info(f"Transfer approved by {admin.email}: {transfer.id}")
        
        return {
            "success": True,
            "transfer_id": transfer.id,
            "status": TransferStatus.APPROVED,
            "message": "Transfer approved successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Transfer approval failed", error=e)
        raise InternalServerError(
            operation="transfer approval",
            error_code="APPROVAL_FAILED",
            original_error=e
        )


@router.post("/transfers/decline", response_model=TransferApprovalResponse)
async def decline_transfer(
    admin_id: str,
    request: DeclineTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """Decline pending transfer"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "transfers:decline"):
            logger.warning(f"Unauthorized transfer decline attempt by {admin.email}")
            raise UnauthorizedError(
                message="You don't have permission to decline transfers",
                error_code="PERMISSION_DENIED"
            )
        
        transfer_result = await db.execute(
            select(Transfer).where(Transfer.id == request.transfer_id)
        )
        transfer = transfer_result.scalar()
        
        if not transfer:
            raise NotFoundError(
                resource="Transfer",
                error_code="TRANSFER_NOT_FOUND"
            )
        
        # Decline transfer
        transfer.status = TransferStatus.DECLINED
        db.add(transfer)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="decline_transfer",
            resource_type="transfer",
            resource_id=transfer.id,
            details=json.dumps({"reason": request.reason})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            transfer.from_user_id,
            "transfer_declined",
            "Transfer Declined",
            f"Your transfer has been declined. Reason: {request.reason}"
        )
        
        logger.info(f"Transfer declined by {admin.email}: {transfer.id}")
        
        return {
            "success": True,
            "transfer_id": transfer.id,
            "status": TransferStatus.DECLINED,
            "message": "Transfer declined successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Transfer decline failed", error=e)
        raise InternalServerError(
            operation="transfer decline",
            error_code="DECLINE_FAILED",
            original_error=e
        )


@router.post("/deposits/approve", response_model=DepositApprovalResponse)
async def approve_deposit(
    admin_id: str,
    request: ApproveDepositRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve check or direct deposit"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "deposits:approve"):
            raise UnauthorizedError(
                message="You don't have permission to approve deposits",
                error_code="PERMISSION_DENIED"
            )
        
        deposit_result = await db.execute(
            select(Deposit).where(Deposit.id == request.deposit_id)
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise NotFoundError(
                resource="Deposit",
                error_code="DEPOSIT_NOT_FOUND"
            )
        
        # Approve deposit
        deposit.status = DepositStatus.APPROVED
        if request.confirmation_code:
            deposit.confirmation_code = request.confirmation_code
        
        db.add(deposit)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="approve_deposit",
            resource_type="deposit",
            resource_id=deposit.id,
            details=json.dumps({"notes": request.notes, "confirmation": request.confirmation_code})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            deposit.user_id,
            "deposit_approved",
            "Deposit Approved",
            f"Your {deposit.deposit_type} deposit of {deposit.currency} {deposit.amount} has been approved."
        )
        
        logger.info(f"Deposit approved by {admin.email}: {deposit.id}")
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.APPROVED,
            "message": "Deposit approved successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Deposit approval failed", error=e)
        raise InternalServerError(
            operation="deposit approval",
            error_code="APPROVAL_FAILED",
            original_error=e
        )


@router.post("/deposits/decline", response_model=DepositApprovalResponse)
async def decline_deposit(
    admin_id: str,
    request: DeclineDepositRequest,
    db: AsyncSession = Depends(get_db)
):
    """Decline check or direct deposit"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "deposits:decline"):
            raise UnauthorizedError(
                message="You don't have permission to decline deposits",
                error_code="PERMISSION_DENIED"
            )
        
        deposit_result = await db.execute(
            select(Deposit).where(Deposit.id == request.deposit_id)
        )
        deposit = deposit_result.scalar()
        
        if not deposit:
            raise NotFoundError(
                resource="Deposit",
                error_code="DEPOSIT_NOT_FOUND"
            )
        
        deposit.status = DepositStatus.DECLINED
        db.add(deposit)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="decline_deposit",
            resource_type="deposit",
            resource_id=deposit.id,
            details=json.dumps({"reason": request.reason})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            deposit.user_id,
            "deposit_declined",
            "Deposit Declined",
            f"Your {deposit.deposit_type} deposit has been declined. Reason: {request.reason}"
        )
        
        logger.info(f"Deposit declined by {admin.email}: {deposit.id}")
        
        return {
            "success": True,
            "deposit_id": deposit.id,
            "status": DepositStatus.DECLINED,
            "message": "Deposit declined successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Deposit decline failed", error=e)
        raise InternalServerError(
            operation="deposit decline",
            error_code="DECLINE_FAILED",
            original_error=e
        )


@router.post("/cards/approve", response_model=VirtualCardApprovalResponse)
async def approve_virtual_card(
    admin_id: str,
    request: ApproveVirtualCardRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve virtual card creation"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "cards:approve"):
            raise UnauthorizedError(
                message="You don't have permission to approve cards",
                error_code="PERMISSION_DENIED"
            )
        
        card_result = await db.execute(
            select(VirtualCard).where(VirtualCard.id == request.card_id)
        )
        card = card_result.scalar()
        
        if not card:
            raise NotFoundError(
                resource="Virtual Card",
                error_code="CARD_NOT_FOUND"
            )
        
        card.status = CardStatus.ACTIVE
        db.add(card)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="approve_card",
            resource_type="virtual_card",
            resource_id=card.id,
            details=json.dumps({"notes": request.notes})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            card.user_id,
            "card_approved",
            "Virtual Card Approved",
            f"Your virtual card has been approved and is ready to use."
        )
        
        logger.info(f"Virtual card approved by {admin.email}: {card.id}")
        
        return {
            "success": True,
            "card_id": card.id,
            "status": CardStatus.ACTIVE,
            "message": "Virtual card approved successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Virtual card approval failed", error=e)
        raise InternalServerError(
            operation="virtual card approval",
            error_code="APPROVAL_FAILED",
            original_error=e
        )


@router.post("/cards/decline", response_model=VirtualCardApprovalResponse)
async def decline_virtual_card(
    admin_id: str,
    request: DeclineVirtualCardRequest,
    db: AsyncSession = Depends(get_db)
):
    """Decline virtual card creation"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        if not AdminPermissionManager.has_permission(admin.role, "cards:decline"):
            raise UnauthorizedError(
                message="You don't have permission to decline cards",
                error_code="PERMISSION_DENIED"
            )
        
        card_result = await db.execute(
            select(VirtualCard).where(VirtualCard.id == request.card_id)
        )
        card = card_result.scalar()
        
        if not card:
            raise NotFoundError(
                resource="Virtual Card",
                error_code="CARD_NOT_FOUND"
            )
        
        card.status = CardStatus.DECLINED
        db.add(card)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="decline_card",
            resource_type="virtual_card",
            resource_id=card.id,
            details=json.dumps({"reason": request.reason})
        )
        db.add(audit_log)
        
        await db.commit()
        
        # Notify user
        AblyRealtimeManager.publish_notification(
            card.user_id,
            "card_declined",
            "Virtual Card Request Declined",
            f"Your virtual card request has been declined. Reason: {request.reason}"
        )
        
        logger.info(f"Virtual card declined by {admin.email}: {card.id}")
        
        return {
            "success": True,
            "card_id": card.id,
            "status": CardStatus.DECLINED,
            "message": "Virtual card declined successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("Virtual card decline failed", error=e)
        raise InternalServerError(
            operation="virtual card decline",
            error_code="DECLINE_FAILED",
            original_error=e
        )


@router.post("/users/create")
async def admin_create_user(
    admin_id: str,
    request: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin create user"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:create"):
            raise UnauthorizedError(
                message="You don't have permission to create users",
                error_code="PERMISSION_DENIED"
            )
        
        # Create user
        new_user = User(
            id=str(uuid.uuid4()),
            email=request.email,
            username=request.username,
            first_name=request.first_name,
            last_name=request.last_name,
            phone=request.phone,
            country=request.country.upper(),
            is_active=True,
            is_email_verified=True,
            created_at=datetime.utcnow()
        )
        
        db.add(new_user)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="create_user",
            resource_type="user",
            resource_id=new_user.id,
            details=json.dumps({"email": request.email, "username": request.username})
        )
        db.add(audit_log)
        
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"User created by admin {admin.email}: {new_user.email}")
        
        return {
            "success": True,
            "user_id": new_user.id,
            "message": "User created successfully"
        }
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("User creation failed", error=e)
        raise InternalServerError(
            operation="user creation",
            error_code="CREATION_FAILED",
            original_error=e
        )


@router.put("/users/edit")
async def admin_edit_user(
    admin_id: str,
    request: AdminEditUserRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin edit user details"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin or not AdminPermissionManager.has_permission(admin.role, "users:update"):
            raise UnauthorizedError(
                message="You don't have permission to edit users",
                error_code="PERMISSION_DENIED"
            )
        
        user_result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = user_result.scalar()
        
        if not user:
            raise NotFoundError(
                resource="User",
                error_code="USER_NOT_FOUND"
            )
        
        # Update fields
        if request.first_name:
            user.first_name = request.first_name
        if request.last_name:
            user.last_name = request.last_name
        if request.phone:
            user.phone = request.phone
        if request.country:
            user.country = request.country.upper()
        if request.date_joined:
            user.created_at = request.date_joined
        if request.is_active is not None:
            user.is_active = request.is_active
        
        db.add(user)
        
        # Log audit
        audit_log = AdminAuditLog(
            id=str(uuid.uuid4()),
            admin_id=admin.id,
            admin_email=admin.email,
            action="edit_user",
            resource_type="user",
            resource_id=user.id,
            details=json.dumps({
                "first_name": request.first_name,
                "last_name": request.last_name,
                "date_joined": request.date_joined.isoformat() if request.date_joined else None
            })
        )
        db.add(audit_log)
        
        await db.commit()
        
        logger.info(f"User edited by admin {admin.email}: {user.email}")
        
        return {
            "success": True,
            "user_id": user.id,
            "message": "User updated successfully"
        }
    except (UnauthorizedError, NotFoundError):
        raise
    except Exception as e:
        logger.error("User edit failed", error=e)
        raise InternalServerError(
            operation="user edit",
            error_code="EDIT_FAILED",
            original_error=e
        )


@router.get("/audit-logs", response_model=list[AdminAuditLogResponse])
async def get_audit_logs(
    admin_id: str,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get audit logs"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin or not AdminPermissionManager.has_permission(admin.role, "audit_logs:view"):
            raise UnauthorizedError(
                message="You don't have permission to view audit logs",
                error_code="PERMISSION_DENIED"
            )
        
        result = await db.execute(
            select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit)
        )
        logs = result.scalars().all()
        
        return [AdminAuditLogResponse.from_orm(log) for log in logs]
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("Failed to fetch audit logs", error=e)
        raise InternalServerError(
            operation="fetch audit logs",
            error_code="FETCH_FAILED",
            original_error=e
        )


@router.get("/statistics", response_model=AdminStatisticsResponse)
async def get_admin_statistics(
    admin_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard statistics"""
    try:
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = admin_result.scalar()
        
        if not admin:
            raise UnauthorizedError(
                message="Admin not found",
                error_code="ADMIN_NOT_FOUND"
            )
        
        # Get statistics
        users_result = await db.execute(select(User))
        total_users = len(users_result.scalars().all())
        
        active_users_result = await db.execute(
            select(User).where(User.is_active == True)
        )
        active_users = len(active_users_result.scalars().all())
        
        transfers_result = await db.execute(select(Transfer))
        total_transfers = len(transfers_result.scalars().all())
        
        pending_transfers_result = await db.execute(
            select(Transfer).where(Transfer.status == TransferStatus.PENDING)
        )
        pending_transfers = len(pending_transfers_result.scalars().all())
        
        deposits_result = await db.execute(select(Deposit))
        total_deposits = len(deposits_result.scalars().all())
        
        pending_deposits_result = await db.execute(
            select(Deposit).where(Deposit.status == DepositStatus.PENDING)
        )
        pending_deposits = len(pending_deposits_result.scalars().all())
        
        loans_result = await db.execute(select(Loan))
        total_loans = len(loans_result.scalars().all())
        
        pending_loans_result = await db.execute(
            select(Loan).where(Loan.status == LoanStatus.PENDING)
        )
        pending_loans = len(pending_loans_result.scalars().all())
        
        cards_result = await db.execute(select(VirtualCard))
        total_cards = len(cards_result.scalars().all())
        
        pending_cards_result = await db.execute(
            select(VirtualCard).where(VirtualCard.status == CardStatus.PENDING)
        )
        pending_cards = len(pending_cards_result.scalars().all())
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_transfers": total_transfers,
            "pending_transfers": pending_transfers,
            "total_deposits": total_deposits,
            "pending_deposits": pending_deposits,
            "total_loans": total_loans,
            "pending_loans": pending_loans,
            "total_virtual_cards": total_cards,
            "pending_cards": pending_cards
        }
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error("Failed to fetch statistics", error=e)
        raise InternalServerError(
            operation="fetch statistics",
            error_code="FETCH_FAILED",
            original_error=e
        )
