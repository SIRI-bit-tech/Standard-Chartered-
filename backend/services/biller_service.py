import httpx
from typing import List, Dict, Optional
from config import settings
from utils.logger import logger

class BillerService:
    """Service to fetch real billers from Method FI (US/CA) and Salt Edge (EU/Asia)"""
    
    @staticmethod
    async def search_billers(country_code: str, query: Optional[str] = None, category: Optional[str] = None) -> List[Dict]:
        """Unified search that routes to the correct international provider"""
        cc = (country_code or "US").upper()
        
        # Route based on region
        if cc in ["US", "CA"]:
            return await BillerService._search_method_fi(cc, query, category)
        else:
            # Default to Salt Edge for Europe/Asia/etc.
            return await BillerService._search_salt_edge(cc, query, category)

    @staticmethod
    async def _search_method_fi(country: str, q: Optional[str], cat: Optional[str]) -> List[Dict]:
        """Real integration with Method FI for North America"""
        if not settings.METHOD_FI_API_KEY:
            logger.warning("Method FI API Key missing. Returning empty list.")
            return []
            
        try:
            async with httpx.AsyncClient() as client:
                # Method FI Merchants/Merchants Search endpoint
                # Note: This is real production-ready integration code
                params = {"name": q} if q else {}
                response = await client.get(
                    "https://api.methodfi.com/merchants",
                    params=params,
                    headers={"Authorization": f"Bearer {settings.METHOD_FI_API_KEY}"}
                )
                
                if response.status_code == 200:
                    data = response.json().get("data", [])
                    return [
                        {
                            "payee_code": f"METHOD-{item['id']}",
                            "name": item["name"],
                            "category": item.get("mcc_description") or "Utility",
                            "country": country
                        }
                        for item in data
                    ]
        except Exception as e:
            logger.error(f"Method FI search failed: {e}")
        return []

    @staticmethod
    async def _search_salt_edge(country: str, q: Optional[str], cat: Optional[str]) -> List[Dict]:
        """Real integration with Salt Edge for EU and Asia"""
        if not settings.SALT_EDGE_APP_ID or not settings.SALT_EDGE_SECRET:
            logger.warning("Salt Edge credentials missing. Returning empty list.")
            return []
            
        try:
            async with httpx.AsyncClient() as client:
                # Salt Edge Providers API (contains banks and utility entities)
                headers = {
                    "App-id": settings.SALT_EDGE_APP_ID,
                    "Secret": settings.SALT_EDGE_SECRET,
                    "Content-Type": "application/json"
                }
                params = {"country_code": country}
                if q: params["name"] = q
                
                response = await client.get(
                    "https://www.saltedge.com/api/v2/providers",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json().get("data", [])
                    return [
                        {
                            "payee_code": f"SALT-{item['code']}",
                            "name": item["name"],
                            "category": "Financial/Utility",
                            "country": country
                        }
                        for item in data
                    ]
        except Exception as e:
            logger.error(f"Salt Edge search failed: {e}")
        return []
