import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import random
import string

from models.user import User
from models.account import Account, AccountType, AccountStatus


class AccountService:
    """Service for managing user accounts"""
    
    # Country-specific account number lengths
    ACCOUNT_LENGTHS = {
        # Asia-Pacific
        "Singapore": 10,
        "Hong Kong": 12,
        "India": 14,
        "Pakistan": 14,
        "Malaysia": 14,
        "China": 12,
        "Japan": 10,
        "Thailand": 10,
        "Indonesia": 10,
        "Philippines": 12,
        "Vietnam": 12,
        "Bangladesh": 13,
        "Sri Lanka": 12,
        "Taiwan": 12,
        "South Korea": 11,
        
        # Middle East
        "United Arab Emirates": 14,
        "Saudi Arabia": 14,
        "Kuwait": 14,
        "Bahrain": 14,
        "Qatar": 14,
        "Oman": 14,
        "Jordan": 14,
        "Lebanon": 14,
        
        # Africa
        "Kenya": 13,
        "Uganda": 13,
        "Tanzania": 13,
        "Ghana": 13,
        "Nigeria": 10,
        "South Africa": 11,
        "Zambia": 13,
        "Botswana": 12,
        "Zimbabwe": 13,
        "Côte d'Ivoire": 24,
        "Cameroon": 23,
        "Egypt": 12,
        
        # Europe
        "United Kingdom": 8,
        "Germany": 10,
        "France": 11,
        "Italy": 12,
        "Spain": 10,
        "Netherlands": 10,
        "Poland": 16,
        "Jersey": 10,
        
        # Americas
        "United States": 9,
        "Canada": 12,
        "Brazil": 12,
        "Mexico": 11,
    }
    
    @staticmethod
    def generate_account_number(country: str = "United States") -> str:
        """Generate a country-specific account number"""
        length = AccountService.ACCOUNT_LENGTHS.get(country, 12)  # Default to 12 digits
        return ''.join(random.choices(string.digits, k=length))
    
    @staticmethod
    def generate_routing_number() -> str:
        """Generate a US routing number"""
        # Generate 9-digit routing number
        return ''.join(random.choices(string.digits, k=9))
    
    @staticmethod
    async def create_default_accounts(user_id: str, user_country: str, db: AsyncSession) -> list[Account]:
        """Create default accounts for new user"""
        accounts = []
        
        # Main Account (Primary)
        main_account = Account(
            id=str(uuid.uuid4()),
            user_id=user_id,
            account_number=AccountService.generate_account_number(user_country),
            account_type=AccountType.CHECKING,
            currency="USD",
            balance=0.0,
            available_balance=0.0,
            is_primary=True,
            status=AccountStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Add routing number for US users
        if user_country == "United States":
            main_account.routing_number = "026002561"  # Your specified routing number
        
        accounts.append(main_account)
        
        # Savings Account
        savings_account = Account(
            id=str(uuid.uuid4()),
            user_id=user_id,
            account_number=AccountService.generate_account_number(user_country),
            account_type=AccountType.SAVINGS,
            currency="USD",
            balance=0.0,
            available_balance=0.0,
            is_primary=False,
            interest_rate=0.02,  # 2% APY
            minimum_balance=100.0,
            status=AccountStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Add routing number for US users
        if user_country == "United States":
            savings_account.routing_number = "026002561"
        
        accounts.append(savings_account)
        
        # Crypto Account
        crypto_account = Account(
            id=str(uuid.uuid4()),
            user_id=user_id,
            account_number=AccountService.generate_account_number(user_country),
            account_type=AccountType.CRYPTO,
            currency="USD",
            balance=0.0,
            available_balance=0.0,
            is_primary=False,
            status=AccountStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Add routing number for US users
        if user_country == "United States":
            crypto_account.routing_number = "026002561"
        
        accounts.append(crypto_account)
        
        return accounts
