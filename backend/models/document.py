from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class DocumentType(str, enum.Enum):
    ID_DOCUMENT = "id_document"
    STATEMENT = "statement"
    RECEIPT = "receipt"
    TAX_DOCUMENT = "tax_document"
    LOAN_APPLICATION = "loan_application"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Document(Base):
    """User documents"""
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Document info
    type = Column(Enum(DocumentType), nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED, nullable=False)
    
    # File info
    filename = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    file_size = Column(String, nullable=True)  # In bytes
    mime_type = Column(String, nullable=True)
    
    # Metadata
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    
    # Verification
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(String, nullable=True)  # User ID of verifier
    rejection_reason = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="documents")
