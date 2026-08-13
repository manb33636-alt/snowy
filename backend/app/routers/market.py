from fastapi import APIRouter, Depends
from app.routers.auth_router import require_session
from app.cache import get_symbol_data, all_symbols
from app.config import settings

router = APIRouter(prefix="/market", tags=["market"], dependencies=[Depends(require_session)])


@router.get("/watchlist")
def watchlist():
    """Alle gevolgde symbolen met hun laatst opgehaalde live data (uit de cache, dus instant)."""
    symbols = [s.strip() for s in settings.WATCHLIST.split(",") if s.strip()]
    result = []
    for sym in symbols:
        cached = get_symbol_data(sym)
        if not cached:
            result.append({"symbol": sym, "status": "loading", "message": "Nog niet opgehaald sinds opstarten"})
        else:
            result.append({"symbol": sym, **cached["quote"], "cached_at": cached["cached_at"]})
    return {"symbols": result}


@router.get("/quote/{symbol}")
def quote(symbol: str):
    cached = get_symbol_data(symbol)
    if not cached:
        return {"symbol": symbol, "status": "loading", "message": "Nog niet opgehaald sinds opstarten"}
    return {**cached["quote"], "cached_at": cached["cached_at"]}


@router.get("/indicators/{symbol}")
def indicators(symbol: str):
    cached = get_symbol_data(symbol)
    if not cached:
        return {"symbol": symbol, "status": "loading", "message": "Nog niet opgehaald sinds opstarten"}
    return {**cached["indicators"], "cached_at": cached["cached_at"]}
