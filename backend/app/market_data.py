"""
Live marktdata via Twelve Data (https://twelvedata.com).

Belangrijk principe van deze module: als de API niet bereikbaar is, faalt of
rate-limited, geven we dat EXPLICIET terug (status="unavailable") — we verzinnen
nooit een prijs. De aanroepende code (routers, scheduler) moet die status
doorgeven aan de gebruiker.
"""
import httpx
from typing import Optional
from app.config import settings

BASE_URL = "https://api.twelvedata.com"


class MarketDataError(Exception):
    pass


async def _get(endpoint: str, params: dict) -> dict:
    if not settings.TWELVEDATA_API_KEY:
        raise MarketDataError("Geen TWELVEDATA_API_KEY ingesteld in .env")

    params = {**params, "apikey": settings.TWELVEDATA_API_KEY}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(f"{BASE_URL}/{endpoint}", params=params)
        except httpx.HTTPError as e:
            raise MarketDataError(f"Netwerkfout richting marktdata-API: {e}")

    data = resp.json()
    # Twelve Data geeft bij fouten {"code":..., "message":..., "status":"error"}
    if isinstance(data, dict) and data.get("status") == "error":
        raise MarketDataError(data.get("message", "Onbekende fout van marktdata-API"))
    return data


async def get_quote(symbol: str) -> dict:
    """Actuele prijs, dag hoog/laag, volume, en of de markt open is."""
    try:
        data = await _get("quote", {"symbol": symbol})
        return {
            "symbol": symbol,
            "price": _num(data.get("close")),
            "bid": _num(data.get("bid")) if data.get("bid") else None,
            "ask": _num(data.get("ask")) if data.get("ask") else None,
            "volume": _num(data.get("volume")),
            "day_high": _num(data.get("high")),
            "day_low": _num(data.get("low")),
            "previous_close": _num(data.get("previous_close")),
            "percent_change": _num(data.get("percent_change")),
            "is_market_open": data.get("is_market_open"),
            "last_updated": data.get("datetime"),
            "status": "ok",
        }
    except MarketDataError as e:
        return {"symbol": symbol, "status": "unavailable", "message": str(e)}


async def get_time_series(symbol: str, interval: str = "1day", outputsize: int = 40) -> dict:
    try:
        data = await _get("time_series", {"symbol": symbol, "interval": interval, "outputsize": outputsize})
        values = data.get("values", [])
        values.reverse()  # Twelve Data geeft nieuwste eerst; wij willen chronologisch
        return {"status": "ok", "values": values}
    except MarketDataError as e:
        return {"status": "unavailable", "message": str(e), "values": []}


async def _get_single_indicator(endpoint: str, symbol: str, interval: str, extra: Optional[dict] = None) -> Optional[dict]:
    try:
        params = {"symbol": symbol, "interval": interval}
        if extra:
            params.update(extra)
        data = await _get(endpoint, params)
        values = data.get("values")
        if not values:
            return None
        return values[0]  # meest recente waarde
    except MarketDataError:
        return None


async def get_indicators(symbol: str, interval: str = "1day") -> dict:
    """Haalt RSI, MACD, EMA, SMA, Bollinger Bands en ATR op (elk een losse Twelve Data-indicator-endpoint)."""
    rsi = await _get_single_indicator("rsi", symbol, interval)
    macd = await _get_single_indicator("macd", symbol, interval)
    ema = await _get_single_indicator("ema", symbol, interval, {"time_period": 20})
    sma = await _get_single_indicator("sma", symbol, interval, {"time_period": 20})
    bbands = await _get_single_indicator("bbands", symbol, interval)
    atr = await _get_single_indicator("atr", symbol, interval)

    if not any([rsi, macd, ema, sma, bbands, atr]):
        return {"symbol": symbol, "status": "unavailable", "message": "Indicatoren tijdelijk niet beschikbaar"}

    return {
        "symbol": symbol,
        "status": "ok",
        "rsi": _num(rsi.get("rsi")) if rsi else None,
        "macd": _num(macd.get("macd")) if macd else None,
        "macd_signal": _num(macd.get("macd_signal")) if macd else None,
        "ema": _num(ema.get("ema")) if ema else None,
        "sma": _num(sma.get("sma")) if sma else None,
        "bbands_upper": _num(bbands.get("upper_band")) if bbands else None,
        "bbands_lower": _num(bbands.get("lower_band")) if bbands else None,
        "atr": _num(atr.get("atr")) if atr else None,
    }


def _num(v) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
