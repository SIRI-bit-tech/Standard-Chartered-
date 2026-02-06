from sqlalchemy import Column, String, DateTime, Boolean, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class AdminRole(str, enum.Enum):
    """Admin role levels"""
    SUPER_ADMIN = "super_admin"
    MANAGER = "manager"
    MODERATOR = "moderator"
    SUPPORT = "support"


class AdminUser(Base):
    """Admin user model"""
    __tablename__ = "admin_users"

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(SQLEnum(AdminRole), default=AdminRole.MODERATOR, nullable=False)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    email_verified_at = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    login_history = Column(Text, nullable=True)  # JSON string
    permissions = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(String(36), nullable=True)  # Admin who created this admin
    
    def __repr__(self):
        return f"<AdminUser {self.email}>"


class AdminAuditLog(Base):
    """Track admin actions for compliance"""
    __tablename__ = "admin_audit_logs"

    id = Column(String(36), primary_key=True, index=True)
    admin_id = Column(String(36), nullable=False, index=True)
    admin_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)  # approve_transfer, decline_transfer, etc.
    resource_type = Column(String(50), nullable=False)  # transfer, deposit, card, etc.
    resource_id = Column(String(36), nullable=False, index=True)
    details = Column(Text, nullable=True)  # JSON with action details
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f"<AdminAuditLog {self.action}>"


class AdminPermission(Base):
    """Admin permissions"""
    __tablename__ = "admin_permissions"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    resource = Column(String(50), nullable=False)  # users, transfers, deposits, cards, etc.
    action = Column(String(50), nullable=False)  # create, read, update, delete, approve, decline
    
    def __repr__(self):
        return f"<AdminPermission {self.name}>"
