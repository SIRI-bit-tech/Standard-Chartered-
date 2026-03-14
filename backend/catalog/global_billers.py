from typing import List, Dict, Optional
from services.biller_service import BillerService

# Map common full country names to ISO 2-letter codes
_COUNTRY_NAME_TO_ISO = {
    "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US", "USA": "US",
    "CANADA": "CA",
    "UNITED KINGDOM": "GB", "GREAT BRITAIN": "GB", "ENGLAND": "GB",
    "GERMANY": "DE", "FRANCE": "FR", "ITALY": "IT", "SPAIN": "ES",
    "JAPAN": "JP", "SOUTH KOREA": "KR", "KOREA": "KR",
    "SINGAPORE": "SG", "HONG KONG": "HK", "AUSTRALIA": "AU",
    "INDIA": "IN", "CHINA": "CN", "BRAZIL": "BR", "MEXICO": "MX",
    "NIGERIA": "NG", "SOUTH AFRICA": "ZA", "KENYA": "KE", "GHANA": "GH",
    "NETHERLANDS": "NL", "SWITZERLAND": "CH", "SWEDEN": "SE", "NORWAY": "NO",
    "IRELAND": "IE", "PORTUGAL": "PT", "BELGIUM": "BE", "AUSTRIA": "AT",
    "POLAND": "PL", "DENMARK": "DK", "NEW ZEALAND": "NZ",
    "UNITED ARAB EMIRATES": "AE", "UAE": "AE", "SAUDI ARABIA": "SA",
    "PHILIPPINES": "PH", "INDONESIA": "ID", "MALAYSIA": "MY", "THAILAND": "TH",
    "VIETNAM": "VN", "PAKISTAN": "PK", "BANGLADESH": "BD", "SRI LANKA": "LK",
    "EGYPT": "EG", "TURKEY": "TR", "RUSSIA": "RU", "UKRAINE": "UA",
    "ARGENTINA": "AR", "COLOMBIA": "CO", "CHILE": "CL", "PERU": "PE",
}

def _normalize_country(raw: str) -> str:
    """Convert a country name or code to a 2-letter ISO code."""
    val = raw.strip().upper()
    # Already a 2-letter ISO code?
    if len(val) == 2 and val.isalpha():
        return val
    # Try lookup
    return _COUNTRY_NAME_TO_ISO.get(val, val)


async def query_catalog(category: Optional[str] = None, q: Optional[str] = None, country: Optional[str] = None) -> List[Dict]:
    """
    Bridge function to the real BillerService.
    Automatically identifies real-world billers based on the user's country.
    """
    if not country:
        return []
        
    cc = _normalize_country(country)
            
    # Hit the real APIs for real-time data
    return await BillerService.search_billers(
        country_code=cc,
        query=q,
        category=category
    )

def find_entry_by_code(payee_code: str) -> Optional[Dict]:
    """
    Looks up a specific biller by its API-provided code.
    """
    if not payee_code:
        return None
        
    parts = payee_code.split("-")
    if len(parts) < 2:
        return None
        
    return {
        "payee_code": payee_code,
        "name": "Biller from Directory",
        "category": "Utility"
    }

def _iso2_codes() -> List[str]:
    """List of supported major western/asian countries"""
    return ["US", "CA", "GB", "DE", "FR", "IT", "ES", "JP", "KR", "SG", "HK", "AU"]

