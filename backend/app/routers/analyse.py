from fastapi import APIRouter, Depends
from app.routers.auth_router import require_session
from app.cache import get_symbol_data
from app.market_data import get_time_series

router = APIRouter(prefix="/analyse", tags=["analyse"], dependencies=[Depends(require_session)])


@router.get("/{symbol}")
async def analyse_symbol(symbol: str):
    cached = get_symbol_data(symbol)
    if not cached:
        return {"symbol": symbol, "status": "loading", "message": "Nog niet opgehaald sinds opstarten"}

    history = await get_time_series(symbol, interval="1day", outputsize=40)

    return {
        "symbol": symbol,
        "quote": cached["quote"],
        "indicators": cached["indicators"],
        "advice": cached["advice"],
        "history": history.get("values", []),
        "history_status": history.get("status"),
        "cached_at": cached["cached_at"],
    }
