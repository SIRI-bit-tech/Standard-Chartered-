from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid
from models.document import Document
from models.user import User
from database import get_db
from schemas.document import (
    DocumentResponse, DocumentListResponse
)
from utils.cloudinary import CloudinaryManager
from utils.ably import AblyRealtimeManager
import os

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {
    "application/pdf", "image/jpeg", "image/png", "application/x-pdf"
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload-url")
async def get_upload_url(
    document_type: str,
    file_name: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get signed upload URL for direct client-side upload"""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        if not result.scalar():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        upload_config = CloudinaryManager.generate_signed_upload_url(
            folder=document_type,
            resource_type="auto",
            unsigned=False,
            expire_seconds=3600
        )
        
        return {
            "success": True,
            "data": upload_config
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/upload")
async def upload_document(
    user_id: str,
    document_type: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload document with server-side processing"""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds 10MB limit"
            )
        
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        temp_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(file_content)
        
        try:
            cloudinary_response = CloudinaryManager.upload_document(
                temp_path,
                document_type,
                user_id
            )
            
            document = Document(
                id=str(uuid.uuid4()),
                user_id=user_id,
                document_type=document_type,
                file_name=file.filename,
                file_url=cloudinary_response["url"],
                status="pending",
                uploaded_at=datetime.utcnow()
            )
            
            db.add(document)
            await db.commit()
            await db.refresh(document)
            
            AblyRealtimeManager.publish_notification(
                user_id,
                "document_uploaded",
                "Document Uploaded",
                f"Your {document_type} document uploaded successfully."
            )
            
            return {
                "success": True,
                "data": DocumentResponse.from_orm(document)
            }
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.get("/list", response_model=DocumentListResponse)
async def list_documents(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all user documents"""
    try:
        result = await db.execute(
            select(Document).where(Document.user_id == user_id)
        )
        documents = result.scalars().all()
        
        return {
            "documents": [DocumentResponse.from_orm(doc) for doc in documents],
            "total_count": len(documents)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get document details"""
    try:
        result = await db.execute(
            select(Document).where(
                (Document.id == document_id) & (Document.user_id == user_id)
            )
        )
        document = result.scalar()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        return DocumentResponse.from_orm(document)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete document"""
    try:
        result = await db.execute(
            select(Document).where(
                (Document.id == document_id) & (Document.user_id == user_id)
            )
        )
        document = result.scalar()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        await db.delete(document)
        await db.commit()
        
        AblyRealtimeManager.publish_notification(
            user_id,
            "document_deleted",
            "Document Deleted",
            f"Your {document.document_type} has been deleted."
        )
        
        return {
            "success": True,
            "message": "Document deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
