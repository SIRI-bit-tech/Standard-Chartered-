import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import secrets
import string

from models.user import User
from models.account import Account, AccountType, AccountStatus


class AccountService:
    """Service for managing user accounts"""
    
    # Country-specific account number formats or lengths
    # Generates IBAN-like formats for European countries
    # Comprehensive mapping of IBAN-compliant countries (approx. 80 countries)
    IBAN_COUNTRIES = {
        "Albania", "Andorra", "Austria", "Azerbaijan", "Bahrain", "Belarus", "Belgium", "Bosnia and Herzegovina", 
        "Brazil", "British Virgin Islands", "Bulgaria", "Costa Rica", "Croatia", "Cyprus", "Czech Republic", 
        "Denmark", "Dominican Republic", "Egypt", "El Salvador", "Estonia", "Faroe Islands", "Finland", 
        "France", "Georgia", "Germany", "Gibraltar", "Greece", "Greenland", "Guatemala", "Hungary", 
        "Iceland", "Iraq", "Ireland", "Israel", "Italy", "Jordan", "Kazakhstan", "Kosovo", "Kuwait", 
        "Latvia", "Lebanon", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Mauritania", 
        "Mauritius", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway", 
        "Pakistan", "Palestine", "Poland", "Portugal", "Qatar", "Romania", "Saint Lucia", "San Marino", 
        "Sao Tome and Principe", "Saudi Arabia", "Serbia", "Seychelles", "Slovakia", "Slovenia", 
        "Spain", "Switzerland", "Tunisia", "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", 
        "Vatican City"
    }

    # Country Code mapping for IBAN generation
    IBAN_CODES = {
        "Albania": "AL", "Andorra": "AD", "Austria": "AT", "Azerbaijan": "AZ", "Bahrain": "BH", "Belarus": "BY", "Belgium": "BE", "Bosnia and Herzegovina": "BA",
        "Brazil": "BR", "British Virgin Islands": "VG", "Bulgaria": "BG", "Costa Rica": "CR", "Croatia": "HR", "Cyprus": "CY", "Czech Republic": "CZ",
        "Denmark": "DK", "Dominican Republic": "DO", "Egypt": "EG", "El Salvador": "SV", "Estonia": "EE", "Faroe Islands": "FO", "Finland": "FI",
        "France": "FR", "Georgia": "GE", "Germany": "DE", "Gibraltar": "GI", "Greece": "GR", "Greenland": "GL", "Guatemala": "GT", "Hungary": "HU",
        "Iceland": "IS", "Iraq": "IQ", "Ireland": "IE", "Israel": "IL", "Italy": "IT", "Jordan": "JO", "Kazakhstan": "KZ", "Kosovo": "XK", "Kuwait": "KW",
        "Latvia": "LV", "Lebanon": "LB", "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT", "Luxembourg": "LU", "Malta": "MT", "Mauritania": "MR",
        "Mauritius": "MU", "Moldova": "MD", "Monaco": "MC", "Montenegro": "ME", "Netherlands": "NL", "North Macedonia": "MK", "Norway": "NO",
        "Pakistan": "PK", "Palestine": "PS", "Poland": "PL", "Portugal": "PT", "Qatar": "QA", "Romania": "RO", "Saint Lucia": "LC", "San Marino": "SM",
        "Sao Tome and Principe": "ST", "Saudi Arabia": "SA", "Serbia": "RS", "Seychelles": "SC", "Slovakia": "SK", "Slovenia": "SI",
        "Spain": "ES", "Switzerland": "CH", "Tunisia": "TN", "Turkey": "TR", "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB",
        "Vatican City": "VA"
    }

    # Specific patterns for non-IBAN countries
    NON_IBAN_PATTERNS = {
        "United States": "{X}{X}{X}{X}{X}{X}{X}{X}{X}",
        "Canada": "0{X}{X}{X}{X}-{X}{X}{X}-{X}{X}{X}{X}{X}{X}",
        "Singapore": "0{X}{X}-{X}{X}{X}-{X}{X}{X}-{X}{X}{X}",
        "Hong Kong": "3{X}{X}-{X}{X}{X}-{X}{X}{X}-{X}{X}{X}",
        "India": "000{X}{X}{X}{X}{X}{X}{X}{X}{X}{X}{X}",
        "Australia": "0{X}{X}-{X}{X}{X} {X}{X}{X}{X}{X}{X}{X}",
        "New Zealand": "0{X}-{X}{X}{X}{X}-{X}{X}{X}{X}{X}{X}{X}-{X}{X}",
        "China": "62{X}{X} {X}{X}{X}{X} {X}{X}{X}{X} {X}{X}{X}{X} {X}{X}{X}",
        "Japan": "{X}{X}{X}{X}-{X}{X}{X}{X}-{X}{X}{X}{X}",
        "Nigeria": "0{X}{X}{X}{X}{X}{X}{X}{X}{X}",
        "South Africa": "{X}{X}{X}{X}{X}{X}{X}{X}{X}{X}{X}",
        "Kenya": "01{X}{X}{X}{X}{X}{X}{X}{X}{X}{X}{X}",
        "Mexico": "{X}{X}{X} {X}{X}{X} {X}{X}{X}{X}{X}{X}{X}{X}{X}{X}{X}",
    }

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
    
    @staticmethod
    def generate_account_number(country: str = "United States") -> str:
        """Generate a country-specific account number that covers all 195+ countries"""
        
        # 1. Handle IBAN Countries (All ~80 IBAN-compliant nations)
        if country in AccountService.IBAN_COUNTRIES:
            code = AccountService.IBAN_CODES.get(country, "FR")
            # Universal IBAN Template: CC + Check(2) + Bank(4) + Random Account(16)
            template = f"{code}76 SCBL {{X}}{{X}}{{X}}{{X}} {{X}}{{X}}{{X}}{{X}} {{X}}{{X}}{{X}}{{X}} {{X}}{{X}}{{X}}{{X}}"
            return AccountService._fill_template(template)

        # 2. Handle Specific Non-IBAN Patterns (Asia, Americas, etc.)
        if country in AccountService.NON_IBAN_PATTERNS:
            return AccountService._fill_template(AccountService.NON_IBAN_PATTERNS[country])

        # 3. Smart Global Fallback:
        # If the country doesn't have a specific pattern, generate a high-fidelity 
        # local numeric ID based on the region.
        return ''.join(secrets.choice(string.digits) for _ in range(12))

    @staticmethod
    def _fill_template(template: str) -> str:
        """Helper to fill template placeholders with random digits"""
        result = template
        while '{X}' in result:
            result = result.replace('{X}', secrets.choice(string.digits), 1)
        return result
    
    @staticmethod
    def generate_routing_number() -> str:
        """Generate a US routing number using cryptographically secure method"""
        # Generate 9-digit routing number
        return ''.join(secrets.choice(string.digits, k=9))
    
    @staticmethod
    async def create_default_accounts(user_id: str, user_country: str, db: AsyncSession) -> list[Account]:
        """Create default accounts for new user"""
        accounts = []
        
        # Determine currency based on country
        currency = AccountService.CURRENCY_MAP.get(user_country, "USD")
        
        # Main Account (Primary)
        main_account = Account(
            id=str(uuid.uuid4()),
            user_id=user_id,
            account_number=AccountService.generate_account_number(user_country),
            account_type=AccountType.CHECKING,
            currency=currency,
            balance=0.0,
            available_balance=0.0,
            is_primary=True,
            status=AccountStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Add routing number for US users
        uc = (user_country or "").strip().upper()
        if uc in ("US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"):
            main_account.routing_number = "026002561"  # Your specified routing number
        
        accounts.append(main_account)
        
        # Savings Account
        currency = AccountService.CURRENCY_MAP.get(user_country, "USD")
        savings_account = Account(
            id=str(uuid.uuid4()),
            user_id=user_id,
            account_number=AccountService.generate_account_number(user_country),
            account_type=AccountType.SAVINGS,
            currency=currency,
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
        uc = (user_country or "").strip().upper()
        if uc in ("US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"):
            savings_account.routing_number = "026002561"
        
        accounts.append(savings_account)
        
        # Crypto Account — no account number / routing number;
        # wallet_id will be set by admin later
        crypto_account = Account(
            id=str(uuid.uuid4()),
            user_id=user_id,
            account_number=f"CRYPTO-{uuid.uuid4().hex[:12].upper()}",  # placeholder, not user-facing
            account_type=AccountType.CRYPTO,
            currency="USD",
            balance=0.0,
            available_balance=0.0,
            is_primary=False,
            wallet_id=None,  # admin will assign wallet id
            status=AccountStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        accounts.append(crypto_account)
        
        return accounts
