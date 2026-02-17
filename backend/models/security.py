from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class TrustedDevice(Base):
    """Trusted devices for 2FA bypass"""
    __tablename__ = "trusted_devices"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    device_id = Column(String, nullable=False, index=True)  # stable fingerprint from client
    device_name = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    
    user = relationship("User")

