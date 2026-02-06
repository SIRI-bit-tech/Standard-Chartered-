from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ChatStatus(str, enum.Enum):
    ACTIVE = "active"
    WAITING = "waiting"
    CLOSED = "closed"


class SupportTicket(Base):
    """Support tickets"""
    __tablename__ = "support_tickets"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Ticket info
    ticket_number = Column(String, unique=True, index=True, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN, nullable=False)
    priority = Column(Enum(TicketPriority), default=TicketPriority.MEDIUM, nullable=False)
    
    # Content
    subject = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=True)
    
    # Assignment
    assigned_to = Column(String, nullable=True)  # Support staff user ID
    assigned_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="support_tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")


class TicketMessage(Base):
    """Support ticket messages"""
    __tablename__ = "ticket_messages"
    
    id = Column(String, primary_key=True, index=True)
    ticket_id = Column(String, ForeignKey("support_tickets.id"), nullable=False, index=True)
    
    # Author info
    sender_id = Column(String, nullable=False)  # User or support staff ID
    is_from_staff = Column(Boolean, default=False, nullable=False)
    
    # Message
    message = Column(String, nullable=False)
    
    # Attachments
    attachment_url = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")


class Chat(Base):
    """Live chat with relationship manager"""
    __tablename__ = "chats"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Chat info
    status = Column(Enum(ChatStatus), default=ChatStatus.ACTIVE, nullable=False)
    
    # Assignment
    agent_id = Column(String, nullable=True)  # Support agent user ID
    agent_assigned_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    
    # Relationships
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Chat messages"""
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True, index=True)
    chat_id = Column(String, ForeignKey("chats.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Author
    sender_id = Column(String, nullable=False)  # User or agent ID
    is_from_agent = Column(Boolean, default=False, nullable=False)
    
    # Message
    message = Column(String, nullable=False)
    message_type = Column(String, default="text", nullable=False)  # text, file, system
    
    # File
    attachment_url = Column(String, nullable=True)
    
    # Delivery status
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    chat = relationship("Chat", back_populates="messages")
    user = relationship("User", back_populates="chat_messages")


class LoginHistory(Base):
    """User login history"""
    __tablename__ = "login_history"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Login info
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    device_name = Column(String, nullable=True)
    device_type = Column(String, nullable=True)  # mobile, desktop, tablet
    
    # Location
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    
    # Status
    login_successful = Column(Boolean, default=True, nullable=False)
    failure_reason = Column(String, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="login_history")
