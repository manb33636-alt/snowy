"""
Simpele in-memory cache. De achtergrond-scheduler (scheduler.py) is de ENIGE
die de marktdata-API aanroept; alle routers lezen alleen uit deze cache.
Dat houdt de app snel en respecteert de rate limit van de gratis API-tier.
"""
from datetime import datetime
from typing import Optional

_cache: dict = {}


def set_symbol_data(symbol: str, quote: dict, indicators: dict, advice: dict):
    _cache[symbol] = {
        "quote": quote,
        "indicators": indicators,
        "advice": advice,
        "cached_at": datetime.utcnow().isoformat(),
    }


def get_symbol_data(symbol: str) -> Optional[dict]:
    return _cache.get(symbol)


def all_symbols() -> dict:
    return dict(_cache)
