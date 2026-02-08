from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from models.user import User, UserTier
from database import get_db
from schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, AuthResponse,
    RefreshTokenRequest, ChangePasswordRequest, PasswordResetRequest,
    PasswordResetConfirm
)
from schemas.user import UserResponse
from utils.auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    verify_token, generate_verification_token, generate_reset_token
)
from utils.ably import AblyRealtimeManager
from utils.errors import (
    ValidationError, AuthenticationError, NotFoundError, ConflictError, InternalServerError
)
from utils.logger import logger
from config import settings
import uuid

router = APIRouter()

# Currency mapping by country - Comprehensive list for all countries
CURRENCY_MAP = {
    "Afghanistan": "AFN", "Albania": "ALL", "Algeria": "DZD", "Andorra": "EUR", "Angola": "AOA", "Antigua and Barbuda": "XCD", "Argentina": "ARS", "Armenia": "AMD", "Australia": "AUD", "Austria": "EUR", "Azerbaijan": "AZN",
    "Bahamas": "BSD", "Bahrain": "BHD", "Bangladesh": "BDT", "Barbados": "BBD", "Belarus": "BYN", "Belgium": "EUR", "Belize": "BZD", "Benin": "XOF", "Bhutan": "BTN", "Bolivia": "BOB", "Bosnia and Herzegovina": "BAM",
    "Botswana": "BWP", "Brazil": "BRL", "Brunei": "BND", "Bulgaria": "BGN", "Burkina Faso": "XOF", "Burundi": "BIF", "Cambodia": "KHR", "Cameroon": "XAF", "Canada": "CAD", "Cape Verde": "CVE",
    "Central African Republic": "XAF", "Chad": "XAF", "Chile": "CLP", "China": "CNY", "Colombia": "COP", "Comoros": "KMF", "Congo": "XAF", "Costa Rica": "CRC", "Croatia": "EUR", "Cuba": "CUP",
    "Cyprus": "EUR", "Czech Republic": "CZK", "Denmark": "DKK", "Djibouti": "DJF", "Dominica": "XCD", "Dominican Republic": "DOP", "Ecuador": "USD", "Egypt": "EGP", "El Salvador": "USD", "Equatorial Guinea": "XAF",
    "Eritrea": "ERN", "Estonia": "EUR", "Eswatini": "SZL", "Ethiopia": "ETB", "Fiji": "FJD", "Finland": "EUR", "France": "EUR", "Gabon": "XAF", "Gambia": "GMD", "Georgia": "GEL",
    "Germany": "EUR", "Ghana": "GHS", "Greece": "EUR", "Grenada": "XCD", "Guatemala": "GTQ", "Guinea": "GNF", "Guinea-Bissau": "XOF", "Guyana": "GYD", "Haiti": "HTG", "Honduras": "HNL",
    "Hong Kong": "HKD", "Hungary": "HUF", "Iceland": "ISK", "India": "INR", "Indonesia": "IDR", "Iran": "IRR", "Iraq": "IQD", "Ireland": "EUR", "Israel": "ILS", "Italy": "EUR",
    "Ivory Coast": "XOF", "Jamaica": "JMD", "Japan": "JPY", "Jordan": "JOD", "Kazakhstan": "KZT", "Kenya": "KES", "Kiribati": "AUD", "Kuwait": "KWD", "Kyrgyzstan": "KGS", "Laos": "LAK",
    "Latvia": "EUR", "Lebanon": "LBP", "Lesotho": "LSL", "Liberia": "LRD", "Libya": "LYD", "Liechtenstein": "CHF", "Lithuania": "EUR", "Luxembourg": "EUR", "Madagascar": "MGA", "Malawi": "MWK", "Malaysia": "MYR",
    "Maldives": "MVR", "Mali": "XOF", "Malta": "EUR", "Marshall Islands": "USD", "Mauritania": "MRU", "Mauritius": "MUR", "Mexico": "MXN", "Micronesia": "USD", "Moldova": "MDL", "Monaco": "EUR", "Mongolia": "MNT",
    "Montenegro": "EUR", "Morocco": "MAD", "Mozambique": "MZN", "Myanmar": "MMK", "Namibia": "NAD", "Nauru": "AUD", "Nepal": "NPR", "Netherlands": "EUR", "New Zealand": "NZD", "Nicaragua": "NIO", "Niger": "XOF",
    "Nigeria": "NGN", "North Korea": "KPW", "North Macedonia": "MKD", "Norway": "NOK", "Oman": "OMR", "Pakistan": "PKR", "Palau": "USD", "Panama": "PAB", "Papua New Guinea": "PGK", "Paraguay": "PYG", "Peru": "PEN",
    "Philippines": "PHP", "Poland": "PLN", "Portugal": "EUR", "Qatar": "QAR", "Romania": "RON", "Russia": "RUB", "Rwanda": "RWF", "Saint Kitts and Nevis": "XCD", "Saint Lucia": "XCD", "Saint Vincent and the Grenadines": "XCD", "Samoa": "WST", "San Marino": "EUR",
    "Sao Tome and Principe": "STN", "Saudi Arabia": "SAR", "Senegal": "XOF", "Serbia": "RSD", "Seychelles": "SCR", "Sierra Leone": "SLL", "Singapore": "SGD", "Slovakia": "EUR", "Slovenia": "EUR", "Solomon Islands": "SBD", "Somalia": "SOS",
    "South Africa": "ZAR", "South Korea": "KRW", "South Sudan": "SSP", "Spain": "EUR", "Sri Lanka": "LKR", "Sudan": "SDG", "Suriname": "SRD", "Sweden": "SEK", "Switzerland": "CHF", "Syria": "SYP", "Taiwan": "TWD", "Tajikistan": "TJS",
    "Tanzania": "TZS", "Thailand": "THB", "Timor-Leste": "USD", "Togo": "XOF", "Tonga": "TOP", "Trinidad and Tobago": "TTD", "Tunisia": "TND", "Turkey": "TRY", "Turkmenistan": "TMT", "Tuvalu": "AUD", "Uganda": "UGX", "Ukraine": "UAH",
    "United Arab Emirates": "AED", "United Kingdom": "GBP", "United States": "USD", "Uruguay": "UYU", "Uzbekistan": "UZS", "Vanuatu": "VUV", "Vatican City": "EUR", "Venezuela": "VES", "Vietnam": "VND", "Yemen": "YER", "Zambia": "ZMW", "Zimbabwe": "ZWL",
}


@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register new user with email verification"""
    try:
        logger.info(f"Registration attempt for email: {request.email}")
        
        # Check if user exists
        existing = await db.execute(
            select(User).where((User.email == request.email) | (User.username == request.username))
        )
        
        if existing.scalar():
            logger.warning(f"User already exists: {request.email}")
            raise ConflictError(
                message="This email or username is already registered"
            )
        
        primary_currency = CURRENCY_MAP.get(request.country, "USD")

        # Create new user
        new_user = User(
            id=str(uuid.uuid4()),
            email=request.email,
            username=request.username,
            first_name=request.first_name,
            last_name=request.last_name,
            country=request.country,
            phone=request.phone,
            street_address=request.street_address,
            city=request.city,
            state=request.state,
            postal_code=request.postal_code,
            password_hash=hash_password(request.password),
            primary_currency=primary_currency,
            tier=UserTier.PREMIUM,  # All users get Premium tier
            is_active=False,
            email_verified=False,
            email_verification_token=generate_verification_token(),
            email_verification_expires=datetime.utcnow().timestamp() + 86400,
            created_at=datetime.utcnow()
        )

        db.add(new_user)
        await db.commit()

        # TODO: Send verification email

        # Generate tokens
        access_token = create_access_token({"sub": new_user.id, "email": new_user.email})
        refresh_token = create_refresh_token(new_user.id)
        
        # Publish notification
        try:
            # Skip Ably notification if API key is not configured
            if settings.ABLY_API_KEY and settings.ABLY_API_KEY != "your-ably-api-key":
                AblyRealtimeManager.publish_notification(
                    new_user.id,
                    "account_creation",
                    "Welcome to Standard Chartered",
                    "Your account has been created. Please verify your email."
                )
        except Exception as e:
            logger.warning(f"Failed to publish notification: {e}")
        
        logger.info(f"User registered successfully: {new_user.email}")
        
        return AuthResponse(
            success=True,
            message="Registration successful! Please check your email for verification code.",
            data={
                "user_id": new_user.id,
                "redirect_to": "/auth/verify-email",
                "email": new_user.email
            },
            token=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        )
    except ConflictError:
        raise
    except Exception as e:
        logger.error("Registration failed", error=e)
        import traceback
        traceback.print_exc()
        raise InternalServerError(
            operation="user registration",
            error_code="REGISTRATION_FAILED",
            original_error=e
        )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login user with username and password"""
    result = await db.execute(
        select(User).where((User.email == request.username) | (User.username == request.username))
    )
    user = result.scalar()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please verify your email."
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.add(user)
    await db.commit()
    
    # Generate tokens
    access_token = create_access_token({"sub": user.id, "email": user.username})
    refresh_token = create_refresh_token(user.id)
    
    # Publish notification
    try:
        # Skip Ably notification if API key is not configured
        if settings.ABLY_API_KEY and settings.ABLY_API_KEY != "your-ably-api-key":
            AblyRealtimeManager.publish_notification(
                user.id,
                "login",
                "New Login",
                f"You logged in on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
            )
    except Exception as e:
        logger.warning(f"Failed to publish notification: {e}")
    
    return AuthResponse(
        success=True,
        message="Login successful",
        data={
            "user_id": user.id,
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "token": access_token
        },
        token=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    payload = verify_token(request.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate new access token
    access_token = create_access_token({"sub": user.id, "email": user.email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=request.refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/change-password", response_model=AuthResponse)
async def change_password(
    user_id: str,
    request: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Update password
    user.password_hash = hash_password(request.new_password)
    db.add(user)
    await db.commit()
    
    # Publish notification
    AblyRealtimeManager.publish_notification(
        user.id,
        "password_changed",
        "Password Changed",
        "Your password has been successfully changed."
    )
    
    return AuthResponse(
        success=True,
        message="Password changed successfully"
    )


@router.post("/request-password-reset", response_model=AuthResponse)
async def request_password_reset(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset"""
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar()
    
    if user:
        reset_token = generate_reset_token()
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.utcnow().timestamp() + 3600
        db.add(user)
        await db.commit()
    
    # Always return success to prevent email enumeration
    return AuthResponse(
        success=True,
        message="If email exists, password reset link has been sent"
    )


@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Reset password with token"""
    result = await db.execute(
        select(User).where(User.password_reset_token == request.token)
    )
    user = result.scalar()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    if user.password_reset_expires < datetime.utcnow().timestamp():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token expired"
        )
    
    # Update password
    user.password_hash = hash_password(request.password)
    user.password_reset_token = None
    db.add(user)
    await db.commit()
    
    # Publish notification
    AblyRealtimeManager.publish_notification(
        user.id,
        "password_reset",
        "Password Reset",
        "Your password has been successfully reset."
    )
    
    return AuthResponse(
        success=True,
        message="Password has been reset successfully"
    )
