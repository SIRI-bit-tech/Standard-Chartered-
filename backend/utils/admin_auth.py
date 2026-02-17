import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from utils.auth import hash_password, verify_password, create_access_token as create_user_token, verify_token
from utils.logger import logger
from config import settings
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.admin import AdminUser


class AdminAuthManager:
    """Manage admin authentication"""
    
    # Single admin code from environment - used for both registration and login
    ADMIN_CODE = settings.ADMIN_CODE
    
    @staticmethod
    def validate_admin_code(provided_code: str) -> bool:
        """Validate admin code for registration and login"""
        if not AdminAuthManager.ADMIN_CODE:
            logger.error("ADMIN_CODE not configured")
            return False
        
        # Use constant-time comparison to prevent timing attacks
        return secrets.compare_digest(provided_code, AdminAuthManager.ADMIN_CODE)
    
    @staticmethod
    def validate_admin_login_code(provided_code: Optional[str]) -> bool:
        """Validate admin login code (optional, for additional security)"""
        if not provided_code:
            return True  # Optional
        
        if not AdminAuthManager.ADMIN_CODE:
            logger.error("ADMIN_CODE not configured")
            return False
        
        # Use same admin code for login validation
        return secrets.compare_digest(provided_code, AdminAuthManager.ADMIN_CODE)
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        return hash_password(password)
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return verify_password(password, password_hash)
    
    @staticmethod
    def create_access_token(admin_id: str, admin_email: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token for admin"""
        payload = {
            "sub": admin_id,
            "email": admin_email,
            "role": role,
            "type": "admin_access"
        }
        return create_user_token(payload, expires_delta)
    
    @staticmethod
    def create_refresh_token(admin_id: str) -> str:
        """Create refresh token for admin"""
        payload = {
            "sub": admin_id,
            "type": "admin_refresh"
        }
        # Refresh token expires in 30 days
        return create_user_token(payload, timedelta(days=30))


class AdminPermissionManager:
    """Manage admin permissions"""
    
    # Default role permissions mapping
    ROLE_PERMISSIONS = {
        "super_admin": [
            "users:create", "users:read", "users:update", "users:delete",
            "transfers:approve", "transfers:decline", "transfers:view",
            "transfers:edit", "transfers:reverse",
            "transactions:edit",
            "deposits:approve", "deposits:decline", "deposits:view",
            "cards:approve", "cards:decline", "cards:view", "cards:update",
            "loans:approve", "loans:decline", "loans:view",
            "admins:create", "admins:read", "admins:update", "admins:delete",
            "audit_logs:view", "settings:manage"
        ],
        "manager": [
            "users:read", "users:update",
            "transfers:approve", "transfers:decline", "transfers:view",
            "transfers:edit", "transfers:reverse",
            "transactions:edit",
            "deposits:approve", "deposits:decline", "deposits:view",
            "cards:approve", "cards:decline", "cards:view", "cards:update",
            "loans:approve", "loans:decline", "loans:view",
            "audit_logs:view"
        ],
        "moderator": [
            "users:read",
            "transfers:view", "deposits:view", "cards:view", "cards:update", "loans:view",
            "audit_logs:view"
        ],
        "support": [
            "users:read",
            "transfers:view", "deposits:view", "cards:view",
            "support_tickets:view", "support_tickets:respond"
        ]
    }
    
    @staticmethod
    def has_permission(role: str, permission: str) -> bool:
        """Check if role has specific permission"""
        permissions = AdminPermissionManager.ROLE_PERMISSIONS.get(role, [])
        return permission in permissions
    
    @staticmethod
    def get_role_permissions(role: str) -> list:
        """Get all permissions for a role"""
        return AdminPermissionManager.ROLE_PERMISSIONS.get(role, [])


async def get_current_admin(request: Request, db: AsyncSession = Depends(get_db)) -> AdminUser:
    """Extract and verify JWT for admin; return the AdminUser object."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )
    token = auth.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload or payload.get("type") != "admin_access" or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin token",
        )
    admin_id = str(payload["sub"])
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()
    if not admin or not getattr(admin, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin not found or inactive",
        )
    return admin
