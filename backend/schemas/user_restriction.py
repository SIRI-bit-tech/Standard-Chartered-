from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from models.user_restriction import RestrictionType


class CreateRestrictionRequest(BaseModel):
    """Request to create a user restriction"""
    user_id: str = Field(..., description="User ID to restrict")
    restriction_type: RestrictionType = Field(..., description="Type of restriction")
    message: str = Field(..., min_length=1, max_length=500, description="Custom message for user")


class RemoveRestrictionRequest(BaseModel):
    """Request to remove a user restriction"""
    user_id: str = Field(..., description="User ID to remove restriction from")
    restriction_type: RestrictionType = Field(..., description="Type of restriction to remove")


class UserRestrictionResponse(BaseModel):
    """Response for restriction operations"""
    success: bool
    restriction_id: Optional[str] = None
    restriction_type: Optional[RestrictionType] = None
    message: str


class UserRestrictionDetail(BaseModel):
    """User restriction details for display"""
    id: str
    restriction_type: RestrictionType
    is_active: bool
    message: str
    created_at: datetime
    created_by: Optional[str] = None


class UserRestrictionsResponse(BaseModel):
    """Response with all user restrictions"""
    success: bool
    restrictions: list[UserRestrictionDetail]
