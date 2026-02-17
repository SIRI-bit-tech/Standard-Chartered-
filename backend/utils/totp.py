import base64
import hashlib
import hmac
import struct
import time
from typing import Optional


def _int_to_bytes(i: int) -> bytes:
    return struct.pack(">Q", i)


def hotp(secret_b32: str, counter: int, digits: int = 6) -> str:
    key = base64.b32decode(secret_b32, casefold=True)
    msg = _int_to_bytes(counter)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    o = h[-1] & 0x0F
    code = (struct.unpack(">I", h[o:o+4])[0] & 0x7FFFFFFF) % (10 ** digits)
    return str(code).zfill(digits)


def totp(secret_b32: str, period: int = 30, digits: int = 6, t: Optional[int] = None) -> str:
    if t is None:
        t = int(time.time())
    counter = int(t // period)
    return hotp(secret_b32, counter, digits)


def verify_totp(code: str, secret_b32: str, period: int = 30, digits: int = 6, skew: int = 1) -> bool:
    """Verify a TOTP code within +-skew steps."""
    try:
        if not code or not secret_b32:
            return False
        now = int(time.time())
        for s in range(-skew, skew + 1):
            if totp(secret_b32, period, digits, now + s * period) == code:
                return True
        return False
    except Exception:
        return False


def generate_secret_b32(length: int = 20) -> str:
    import os
    raw = os.urandom(length)
    return base64.b32encode(raw).decode("ascii").replace("=", "")


def otpauth_uri(secret_b32: str, account_name: str, issuer: str = "Standard Chartered", digits: int = 6, period: int = 30) -> str:
    return f"otpauth://totp/{issuer}:{account_name}?secret={secret_b32}&issuer={issuer}&period={period}&digits={digits}"

