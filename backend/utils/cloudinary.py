import cloudinary
import cloudinary.uploader
import cloudinary.api
from config import settings
from typing import Optional, Dict, Any
import hashlib
import hmac
import json
import base64
from datetime import datetime, timedelta

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)


class CloudinaryManager:
    """Manage Cloudinary uploads and resources"""
    
    @staticmethod
    def generate_signed_upload_url(
        folder: str,
        resource_type: str = "auto",
        unsigned: bool = False,
        expire_seconds: int = 3600
    ) -> Dict[str, Any]:
        """Generate signed URL for direct upload to Cloudinary"""
        
        timestamp = int((datetime.utcnow() + timedelta(seconds=expire_seconds)).timestamp())
        
        params = {
            "timestamp": timestamp,
            "folder": f"banking/{folder}",
            "resource_type": resource_type,
            "eager": "w_400,h_300,c_pad|w_400,h_300,c_crop",  # Auto transformations
            "eager_async": True,
            "eager_notification_url": f"{settings.FRONTEND_URL}/api/webhooks/cloudinary"
        }
        
        if unsigned:
            params["unsigned"] = True
        
        # Create signature
        string_to_sign = "&".join(
            [f"{k}={v}" for k, v in sorted(params.items())]
        )
        signature = hashlib.sha256(
            (string_to_sign + settings.CLOUDINARY_API_SECRET).encode()
        ).hexdigest()
        
        params["signature"] = signature
        params["api_key"] = settings.CLOUDINARY_API_KEY
        
        upload_url = f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/auto/upload"
        
        return {
            "upload_url": upload_url,
            "params": params,
            "expires_in": expire_seconds
        }
    
    @staticmethod
    def upload_document(
        file_path: str,
        document_type: str,
        user_id: str,
        public_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upload document to Cloudinary with watermark"""
        
        folder = f"documents/{document_type}"
        
        upload_params = {
            "folder": folder,
            "public_id": public_id or f"{user_id}_{document_type}_{datetime.utcnow().timestamp()}",
            "overwrite": True,
            "resource_type": "auto",
            "quality": "auto",
            "fetch_format": "auto",
            # Add watermark
            "overlay": {
                "text": f"Standard Chartered - {datetime.utcnow().strftime('%Y-%m-%d')}",
                "font_family": "Arial",
                "font_size": 20,
                "font_color": "rgba(100,100,100,0.5)",
                "position": "south",
                "y": 10
            }
        }
        
        result = cloudinary.uploader.upload(file_path, **upload_params)
        
        return {
            "public_id": result.get("public_id"),
            "url": result.get("secure_url"),
            "version": result.get("version"),
            "format": result.get("format"),
            "width": result.get("width"),
            "height": result.get("height")
        }
    
    @staticmethod
    def delete_document(public_id: str, resource_type: str = "auto") -> bool:
        """Delete document from Cloudinary"""
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return result.get("result") == "ok"
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
    
    @staticmethod
    def get_document_url(
        public_id: str,
        transformations: Optional[Dict[str, Any]] = None
    ) -> str:
        """Get optimized document URL with transformations"""
        
        url = cloudinary.CloudinaryResource(public_id).build_url(
            secure=True,
            quality="auto",
            fetch_format="auto",
            **(transformations or {})
        )
        
        return url
    
    @staticmethod
    def create_signed_urls_batch(
        public_ids: list,
        expire_hours: int = 24
    ) -> Dict[str, str]:
        """Create signed URLs for multiple documents"""
        
        signed_urls = {}
        
        for public_id in public_ids:
            signed_urls[public_id] = CloudinaryManager.get_document_url(public_id)
        
        return signed_urls


def verify_cloudinary_webhook_signature(
    data: bytes,
    timestamp: str,
    signature: str
) -> bool:
    """Verify Cloudinary webhook signature"""
    
    expected_signature = hashlib.sha256(
        (data + settings.CLOUDINARY_API_SECRET + timestamp).encode()
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)
