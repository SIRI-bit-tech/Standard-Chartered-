from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings from environment variables"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # JWT
    SECRET_KEY: str = Field(validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET"))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Auth Provider
    AUTH_PROVIDER: str = "stytch"
    STYTCH_PROJECT_ID: Optional[str] = None
    STYTCH_SECRET: Optional[str] = None
    STYTCH_ENVIRONMENT: str = "test"  # "test" for dev/staging, "live" for production
    
    # Ably
    ABLY_API_KEY: str
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # Email
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_FROM: str
    SMTP_TIMEOUT_SECONDS: int = 10  # Connection/operation timeout for SMTP
    RESEND_API_KEY: Optional[str] = None # API Key for Resend API delivery
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Admin
    ADMIN_CODE: str
    
    # Biller Directory APIs
    METHOD_FI_API_KEY: Optional[str] = None
    SALT_EDGE_APP_ID: Optional[str] = None
    SALT_EDGE_SECRET: Optional[str] = None
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Networking / Security
    # Comma-separated list of CIDRs/IPs that are trusted reverse proxies
    TRUSTED_PROXY_CIDRS: str = ""
    
    # OCR
    TESSERACT_CMD: Optional[str] = None
    OCR_PROVIDER: Optional[str] = None
    OCR_SPACE_API_KEY: Optional[str] = None
    
    # Timezone - Always use US Eastern Time
    TIMEZONE: str = "America/New_York"
    
settings = Settings()

# Set timezone for the entire application
os.environ['TZ'] = settings.TIMEZONE
