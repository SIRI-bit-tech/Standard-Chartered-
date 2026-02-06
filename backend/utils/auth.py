from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from config import settings
import secrets

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: str) -> str:
    """Create refresh token"""
    data = {"sub": user_id, "type": "refresh"}
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except ExpiredSignatureError:
        return None
    except JWTError:
        return None


def generate_verification_token() -> str:
    """Generate email verification token"""
    return secrets.token_urlsafe(32)


def generate_reset_token() -> str:
    """Generate password reset token"""
    return secrets.token_urlsafe(32)


def generate_device_verification_code() -> str:
    """Generate 6-digit device verification code"""
    return ''.join(secrets.choice('0123456789') for _ in range(6))


def generate_account_number(country: str, account_type: str) -> str:
    """Generate unique account number"""
    prefix = country[:2].upper()
    acc_type_code = account_type[:2].upper()
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_suffix = secrets.token_hex(4).upper()
    return f"{prefix}{acc_type_code}{timestamp}{random_suffix}"


class BetterAuthConfig:
    """Better Auth configuration"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.jwt_algorithm = settings.ALGORITHM
        self.access_token_expire = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire = settings.REFRESH_TOKEN_EXPIRE_DAYS
        self.frontend_url = settings.FRONTEND_URL
        self.enable_2fa = True
        self.enable_email_verification = True
        self.enable_device_tracking = True
    
    def get_jwt_config(self):
        """Get JWT configuration for Better Auth"""
        return {
            "secret": self.secret_key,
            "expiresIn": f"{self.access_token_expire}m",
            "algorithm": self.jwt_algorithm,
            "audience": "banking-app",
            "issuer": "standard-chartered-bank"
        }
