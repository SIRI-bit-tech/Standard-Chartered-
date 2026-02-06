from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketCategory(str, Enum):
    ACCOUNT = "account"
    TRANSACTION = "transaction"
    TECHNICAL = "technical"
    BILLING = "billing"
    SECURITY = "security"
    OTHER = "other"


class CreateTicketRequest(BaseModel):
    """Create support ticket"""
    category: TicketCategory
    subject: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    priority: TicketPriority = TicketPriority.MEDIUM
    attachment_ids: Optional[List[str]] = None


class TicketResponse(BaseModel):
    """Support ticket response"""
    id: str
    user_id: str
    category: TicketCategory
    subject: str
    description: str
    status: TicketStatus
    priority: TicketPriority
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    ticket_number: str
    
    class Config:
        from_attributes = True


class TicketListResponse(BaseModel):
    """Ticket list response"""
    tickets: List[TicketResponse]
    total_count: int
    page: int
    per_page: int


class ChatMessageRequest(BaseModel):
    """Chat message request"""
    ticket_id: str
    message: str = Field(..., min_length=1, max_length=5000)


class ChatMessageResponse(BaseModel):
    """Chat message response"""
    id: str
    ticket_id: str
    sender_id: str
    sender_name: str
    message: str
    is_agent_response: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class TicketUpdateRequest(BaseModel):
    """Update ticket request"""
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[str] = None
