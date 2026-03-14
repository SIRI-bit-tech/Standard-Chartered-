from typing import List, Dict, Optional
from services.biller_service import BillerService
from utils.logger import logger
from catalog.fallback_billers_data import FALLBACK_BILLERS

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
    "POLAND": "PL", "DENMARK": "DK", "NEW ZEALAND": "NZ", "FINLAND": "FI",
    "GREECE": "GR", "CZECH REPUBLIC": "CZ", "HUNGARY": "HU", "ROMANIA": "RO",
    "UNITED ARAB EMIRATES": "AE", "UAE": "AE", "SAUDI ARABIA": "SA",
    "QATAR": "QA", "KUWAIT": "KW", "BAHRAIN": "BH", "OMAN": "OM",
    "PHILIPPINES": "PH", "INDONESIA": "ID", "MALAYSIA": "MY", "THAILAND": "TH",
    "VIETNAM": "VN", "PAKISTAN": "PK", "BANGLADESH": "BD", "SRI LANKA": "LK",
    "EGYPT": "EG", "TURKEY": "TR", "TURKIYE": "TR",
    "RUSSIA": "RU", "UKRAINE": "UA",
    "ARGENTINA": "AR", "COLOMBIA": "CO", "CHILE": "CL", "PERU": "PE",
    "TANZANIA": "TZ",
}


def _normalize_country(raw: str) -> str:
    """Convert a country name or code to a 2-letter ISO code."""
    val = raw.strip().upper()
    if len(val) == 2 and val.isalpha():
        return val
    return _COUNTRY_NAME_TO_ISO.get(val, val)


def _get_fallback(cc: str, q: Optional[str] = None, category: Optional[str] = None) -> List[Dict]:
    """Return built-in billers, optionally filtered by query/category."""
    items = list(FALLBACK_BILLERS.get(cc, []))
    if category:
        items = [i for i in items if i.get("category", "").lower() == category.lower()]
    if q:
        ql = q.lower()
        items = [i for i in items if ql in i.get("name", "").lower()]
    return items


async def query_catalog(category: Optional[str] = None, q: Optional[str] = None, country: Optional[str] = None) -> List[Dict]:
    """
    Bridge function to the real BillerService.
    Tries external APIs first, falls back to built-in catalog.
    """
    if not country:
        return []

    cc = _normalize_country(country)

    # Try external APIs first
    try:
        results = await BillerService.search_billers(
            country_code=cc,
            query=q,
            category=category
        )
        if results:
            return results
    except Exception as e:
        logger.warning(f"External biller API failed for {cc}: {e}")

    # Fall back to built-in catalog
    logger.info(f"Using fallback biller catalog for {cc}")
    return _get_fallback(cc, q, category)


def find_entry_by_code(payee_code: str) -> Optional[Dict]:
    """
    Looks up a specific biller by its API-provided code or fallback code.
    """
    if not payee_code:
        return None

    # Check fallback catalogs
    if payee_code.startswith("BLR-"):
        for billers in FALLBACK_BILLERS.values():
            for b in billers:
                if b["payee_code"] == payee_code:
                    return b
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
    """List of supported countries with fallback catalogs"""
    return list(FALLBACK_BILLERS.keys())
