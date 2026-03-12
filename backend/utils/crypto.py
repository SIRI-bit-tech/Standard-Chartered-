import httpx
from utils.logger import logger

# Simple in-memory cache to avoid rate limits
_price_cache = {}
CACHE_TTL = 60  # seconds

async def get_crypto_price(symbol: str = "bitcoin") -> float:
    """
    Fetch real-time crypto price from multiple sources with caching.
    Uses CoinGecko as primary and Binance as secondary source.
    """
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    
    # Check cache
    if symbol in _price_cache:
        price, expiry = _price_cache[symbol]
        if now < expiry:
            return price

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Source 1: CoinGecko
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={symbol}&vs_currencies=usd"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if symbol in data and "usd" in data[symbol]:
                    price = float(data[symbol]["usd"])
                    _price_cache[symbol] = (price, now + timedelta(seconds=CACHE_TTL))
                    return price
            
            # Source 2: Binance (primarily for BTC/USDT)
            # Map common symbols for Binance
            binance_symbol_map = {
                "bitcoin": "BTCUSDT",
                "ethereum": "ETHUSDT",
                "litecoin": "LTCUSDT",
                "ripple": "XRPUSDT"
            }
            if symbol in binance_symbol_map:
                b_symbol = binance_symbol_map[symbol]
                url2 = f"https://api.binance.com/api/v3/ticker/price?symbol={b_symbol}"
                resp2 = await client.get(url2)
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    price2 = data2.get("price")
                    if price2:
                        price = float(price2)
                        _price_cache[symbol] = (price, now + timedelta(seconds=CACHE_TTL))
                        return price
                        
    except Exception as e:
        logger.error(f"Error fetching {symbol} price: {str(e)}")
        # Check if we have an expired cache to return as last resort
        if symbol in _price_cache:
            return _price_cache[symbol][0]

    # If all fails and no cache, raise error (remove hardcoded fallbacks)
    raise RuntimeError(f"Could not retrieve real-time price for {symbol}.")

async def get_bitcoin_price() -> float:
    """Helper for the most common case."""
    return await get_crypto_price("bitcoin")
