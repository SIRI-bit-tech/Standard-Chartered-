from fastapi import Request
from typing import Optional, Dict, Any
import json
import urllib.request
from ipaddress import ip_address, ip_network

# Private/reserved IP ranges that can never be geolocated
_PRIVATE_NETS = [
    ip_network("10.0.0.0/8"),
    ip_network("172.16.0.0/12"),
    ip_network("192.168.0.0/16"),
    ip_network("127.0.0.0/8"),
    ip_network("169.254.0.0/16"),
]


def _is_private(ip_str: Optional[str]) -> bool:
    if not ip_str:
        return True
    try:
        addr = ip_address(ip_str.split("%")[0])  # strip IPv6 zone id
        if addr.is_loopback or addr.is_link_local or addr.is_private:
            return True
        return any(addr in net for net in _PRIVATE_NETS)
    except Exception:
        return True


def get_client_ip(request: Request) -> Optional[str]:
    """Extract the real client IP — always check proxy headers first.

    On Render (and most cloud deployments) the direct connection host is
    always an internal 10.x IP from the ingress router, so we must read
    the forwarded-for / Cloudflare headers to get the real public IP.
    """
    headers = request.headers

    # Priority 1: Cloudflare header — set only by CF, hardest to spoof
    for cf_key in ("cf-connecting-ip", "CF-Connecting-IP"):
        cf = headers.get(cf_key)
        if cf:
            ip = cf.split(",")[0].strip()
            if ip and not _is_private(ip):
                return ip

    # Priority 2: Standard X-Forwarded-For (take the first non-private hop)
    xff = headers.get("x-forwarded-for") or headers.get("X-Forwarded-For")
    if xff:
        for part in xff.split(","):
            ip = part.strip()
            if ip and not _is_private(ip):
                return ip

    # Priority 3: X-Real-IP (nginx / other proxies)
    for xri_key in ("x-real-ip", "X-Real-IP"):
        xri = headers.get(xri_key)
        if xri:
            ip = xri.strip()
            if ip and not _is_private(ip):
                return ip

    # Fallback: direct connection host (may be private on Render)
    try:
        if request.client and request.client.host:
            return request.client.host
    except Exception:
        pass

    return None


def geolocate_ip(ip: Optional[str]) -> Optional[Dict[str, Any]]:
    """Best-effort geolocation for an IP using ip-api.com (free, no key needed)."""
    if not ip or _is_private(ip):
        return None
    try:
        url = f"https://ip-api.com/json/{ip}?fields=status,country,city,timezone,query"
        with urllib.request.urlopen(url, timeout=5) as resp:
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
