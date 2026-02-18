from fastapi import Request
from typing import Optional, Tuple, Dict, Any
import json
import urllib.request
from ipaddress import ip_address, ip_network
from config import settings


def _parse_trusted_proxies():
    cidrs = getattr(settings, "TRUSTED_PROXY_CIDRS", "") or ""
    items = [c.strip() for c in cidrs.split(",") if c.strip()]
    nets = []
    for item in items:
        try:
            nets.append(ip_network(item, strict=False))
        except Exception:
            continue
    return nets


_TRUSTED_PROXY_NETS = _parse_trusted_proxies()


def _is_trusted_proxy(remote: Optional[str]) -> bool:
    if not remote or not _TRUSTED_PROXY_NETS:
        return False
    try:
        rip = ip_address(remote)
        return any(rip in n for n in _TRUSTED_PROXY_NETS)
    except Exception:
        return False


def get_client_ip(request: Request) -> Optional[str]:
    """Extract the real client IP from common proxy headers or fallback to connection host."""
    headers = request.headers
    remote = None
    try:
        if request.client and request.client.host:
            remote = request.client.host
    except Exception:
        remote = None

    # Only inspect proxy-provided headers when the request originates from a trusted proxy
    if _is_trusted_proxy(remote):
        header_order = ["x-forwarded-for", "cf-connecting-ip", "x-real-ip"]
        for key in header_order:
            val = headers.get(key) or headers.get(key.upper())
            if val:
                # x-forwarded-for can be a list: client, proxy1, proxy2
                ip = val.split(",")[0].strip()
                if ip and ip not in ("::1", "127.0.0.1", "0.0.0.0"):
                    return ip

        # Only accept x-client-ip when request is from a trusted reverse proxy
        val = headers.get("x-client-ip") or headers.get("X-CLIENT-IP")
        if val:
            ip = val.split(",")[0].strip()
            if ip and ip not in ("::1", "127.0.0.1", "0.0.0.0"):
                return ip
    else:
        # If not from a trusted proxy, return the direct connection host immediately
        try:
            if remote:
                return remote
        except Exception:
            pass

    try:
        if remote:
            return remote
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
