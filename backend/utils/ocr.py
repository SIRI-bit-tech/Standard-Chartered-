from typing import Optional, Dict, Any
from io import BytesIO
import re
from config import settings
import httpx


def _load_modules():
    try:
        import pytesseract  # type: ignore
        from PIL import Image  # type: ignore
        # Allow explicit binary path via settings/env
        try:
            if settings.TESSERACT_CMD:
                import pytesseract as pt  # type: ignore
                pt.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        except Exception:
            pass
        return pytesseract, Image
    except Exception:
        return None, None


def _pick_check_number(text: str) -> Optional[str]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    lower = [ln.lower() for ln in lines]
    noise_markers = ("call centre", "call center", "contact", "hotline", "phone", "tel", "24 hour", "bank plc")
    def is_noise(i: int) -> bool:
        ll = lower[i]
        return any(m in ll for m in noise_markers)
    # Prefer candidates from bottom lines (MICR area) and with length 6-8
    for i in range(len(lines) - 1, max(-1, len(lines) - 6), -1):
        if i < 0:
            break
        if is_noise(i):
            continue
        cands = re.findall(r"\b\d{4,10}\b", lines[i])
        if not cands:
            continue
        def score(x: str) -> tuple:
            n = len(x)
            s = 0
            if 6 <= n <= 8:
                s += 3
            elif 4 <= n <= 5:
                s += 1
            if x.startswith("0") and n == 4:
                s -= 5  # Heavily penalize 4-digit numbers starting with 0 (likely phone area codes)
            return (s, n)
        cands_sorted = sorted(cands, key=lambda x: score(x), reverse=True)
        for d in cands_sorted:
            if not (d.startswith("0") and len(d) == 4):
                return d
        # Only return a suppression candidate if it's reasonably high quality
        # If the best we found was '0114' (score -4), better to return nothing.
        # But if we found other things, check them.
        if cands_sorted:
            best = cands_sorted[0]
            # If the score is negative, it means it's likely noise we wanted to avoid
            if score(best)[0] < 0:
                continue 
            return best
    # Fallback: last acceptable candidate in the full text
    all_cands = re.findall(r"\b\d{4,10}\b", text)
    for d in reversed(all_cands):
        # Increased check: Don't return 0xxx unless we are desperate, but actually 0xxx is usually bad.
        if not (d.startswith("0") and len(d) == 4):
            return d
    return None


def extract_check_details(image_bytes: bytes) -> Dict[str, Any]:
    pytesseract, Image = _load_modules()
    if not pytesseract or not Image:
        return {"supported": False, "error": "pytesseract or Pillow not installed"}
    try:
        img = Image.open(BytesIO(image_bytes))
    except Exception as e:
        return {"supported": False, "error": f"Cannot open image: {e}"}
    try:
        gray = img.convert("L")
    except Exception:
        gray = img
    try:
        text = pytesseract.image_to_string(gray) or ""
    except Exception as e:
        # Common case: Tesseract binary not installed or misconfigured
        return {"supported": False, "error": f"OCR engine error: {e}"}
    amount: Optional[float] = None
    check_number: Optional[str] = None
    m = re.search(r"(?:\$|\bUSD\s*)?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|\d+\.\d{2})", text)
    if m:
        try:
            amount = float(m.group(1).replace(",", "").replace(" ", ""))
        except Exception:
            amount = None
    check_number = _pick_check_number(text)
    return {
        "supported": True,
        "text": text,
        "amount": amount,
        "check_number": check_number,
    }


async def extract_check_details_remote(url: str) -> Dict[str, Any]:
    provider = (settings.OCR_PROVIDER or "").strip().lower()
    if provider == "ocr_space":
        key = settings.OCR_SPACE_API_KEY
        if not key:
            return {"supported": False, "error": "OCR.Space API key missing"}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                data = {
                    "url": url,
                    "OCREngine": 2,
                    "scale": True,
                    "detectOrientation": True,
                }
                headers = {"apikey": key}
                resp = await client.post("https://api.ocr.space/parse/image", data=data, headers=headers)
                if resp.status_code != 200:
                    return {"supported": False, "error": f"http {resp.status_code}"}
                j = resp.json()
                if j.get("IsErroredOnProcessing"):
                    return {"supported": False, "error": str(j.get("ErrorMessage") or j.get("ErrorDetails") or "processing error")}
                prs = j.get("ParsedResults") or []
                txt = ""
                if prs and isinstance(prs, list):
                    txt = prs[0].get("ParsedText") or ""
                amount: Optional[float] = None
                check_number: Optional[str] = None
                m = re.search(r"(?:\$|\bUSD\s*)?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|\d+\.\d{2})", txt)
                if m:
                    try:
                        amount = float(m.group(1).replace(",", "").replace(" ", ""))
                    except Exception:
                        amount = None
                check_number = _pick_check_number(txt)
                return {
                    "supported": True,
                    "text": txt,
                    "amount": amount,
                    "check_number": check_number,
                }
        except Exception as e:
            return {"supported": False, "error": str(e)}
    return {"supported": False, "error": "no provider configured"}


def ocr_status() -> Dict[str, Any]:
    pytesseract, Image = _load_modules()
    info: Dict[str, Any] = {
        "pytesseract_installed": bool(pytesseract),
        "pillow_installed": bool(Image),
        "tesseract_cmd": None,
        "engine_ok": False,
        "error": None,
        "provider": (settings.OCR_PROVIDER or "").strip().lower() or None,
    }
    if not pytesseract or not Image:
        return info
    try:
        # best-effort detect engine binary path
        import pytesseract as pt  # type: ignore
        info["tesseract_cmd"] = getattr(pt.pytesseract, "tesseract_cmd", None)
        # Try a noop call to verify engine availability
        from PIL import Image as PILImage  # type: ignore
        img = PILImage.new("L", (10, 10))
        _ = pt.image_to_string(img)
        info["engine_ok"] = True
    except Exception as e:
        info["error"] = str(e)
    return info
