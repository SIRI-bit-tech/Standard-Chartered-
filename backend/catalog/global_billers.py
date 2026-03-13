from typing import List, Dict, Optional
from services.biller_service import BillerService

# The hardcoded COUNTRY_BILLERS has been removed in favor of real API integration 
# through Method FI and Salt Edge.

async def query_catalog(category: Optional[str] = None, q: Optional[str] = None, country: Optional[str] = None) -> List[Dict]:
    """
    Bridge function to the real BillerService.
    Automatically identifies real-world billers based on the user's country.
    """
    if not country:
        # If no country provided, we return empty as searching global is too broad for these APIs
        return []
        
    return await BillerService.search_billers(
        country_code=country,
        query=q,
        category=category
    )

def find_entry_by_code(payee_code: str) -> Optional[Dict]:
    """
    For real entries, we'd ideally fetch them from the provider.
    For now, we return a basic placeholder structure that the import endpoint can use.
    """
    if not payee_code:
        return None
        
    # Example payee_code: "METHOD-mrt_123"
    parts = payee_code.split("-")
    if len(parts) < 2:
        return None
        
    # We return enough info for the database record to be created
    return {
        "payee_code": payee_code,
        "name": "Biller from Directory",
        "category": "Utility"
    }

def _iso2_codes() -> List[str]:
    """List of supported major western/asian countries for the searchable directory"""
    return ["US", "CA", "GB", "DE", "FR", "IT", "ES", "JP", "KR", "SG", "HK", "AU"]
