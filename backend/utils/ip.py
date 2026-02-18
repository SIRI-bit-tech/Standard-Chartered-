from fastapi import Request
from typing import Optional, Tuple, Dict, Any
import json
import urllib.request


def get_client_ip(request: Request) -> Optional[str]:
    """Extract the real client IP from common proxy headers or fallback to connection host."""
    headers = request.headers
    # Prefer explicit client IP from frontend if provided (dev/proxy environments)
    for key in ["x-client-ip", "x-forwarded-for", "cf-connecting-ip", "x-real-ip"]:
        val = headers.get(key) or headers.get(key.upper())
        if val:
            # x-forwarded-for can be a list: client, proxy1, proxy2
            ip = val.split(",")[0].strip()
            if ip and ip not in ("::1", "127.0.0.1", "0.0.0.0"):
                return ip
    try:
        if request.client and request.client.host:
            host = request.client.host
            return host
    except Exception:
        pass
    return None


def geolocate_ip(ip: Optional[str]) -> Optional[Dict[str, Any]]:
    """Best-effort geolocation for an IP using a public API. Avoids dependencies."""
    if not ip or ip in ("127.0.0.1", "::1", "0.0.0.0"):
        return None
    try:
        url = f"https://ip-api.com/json/{ip}?fields=status,country,city,timezone,query"
        with urllib.request.urlopen(url, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("status") == "success":
                return {
                    "country": data.get("country"),
                    "city": data.get("city"),
                    "timezone": data.get("timezone"),
                }
    except Exception:
        pass
    return None

