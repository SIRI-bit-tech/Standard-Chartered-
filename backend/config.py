from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


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
    AUTH_PROVIDER: str = "better-auth"
    CLERK_SECRET_KEY: Optional[str] = None
    
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
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
settings = Settings()
