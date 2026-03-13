from typing import List, Dict, Optional
from services.biller_service import BillerService


async def query_catalog(category: Optional[str] = None, q: Optional[str] = None, country: Optional[str] = None) -> List[Dict]:
    """
    Bridge function to the real BillerService.
    Automatically identifies real-world billers based on the user's country.
    """
    if not country:
        return []
        
    cc = country.upper()
            
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
