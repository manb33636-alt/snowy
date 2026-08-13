"""
Achtergrondtaak: ververst continu (zolang de backend draait — dus ook als
niemand de site open heeft) live data voor elk symbool in de watchlist.

Belangrijk over de gratis Twelve Data-laag: die staat maar een beperkt aantal
credits per minuut toe. Elke volledige ververs-cyclus voor één symbool kost
~7 credits (1 quote + 6 indicatoren). Met een gratis sleutel kun je dus maar
een handvol symbolen realistisch tegelijk live volgen zonder een betaald plan.
Dit script ververst symbolen daarom NA ELKAAR, met een korte pauze ertussen,
in plaats van allemaal tegelijk.
"""
import asyncio
import logging
from app.config import settings
from app.market_data import get_quote, get_indicators
from app.analysis import generate_advice
from app.cache import set_symbol_data
from app.testing_engine import maybe_autotrade

logger = logging.getLogger("snowy_tracks.scheduler")

DELAY_BETWEEN_SYMBOLS_SECONDS = 8  # respecteert de rate limit van de gratis tier


async def refresh_symbol(symbol: str):
    quote = await get_quote(symbol)
    indicators = await get_indicators(symbol)
    advice = generate_advice(quote, indicators)
    set_symbol_data(symbol, quote, indicators, advice)

    if quote.get("status") == "ok":
        logger.info(f"[{symbol}] {quote.get('price')} — advies: {advice.get('advice')}")
    else:
        logger.warning(f"[{symbol}] marktdata niet beschikbaar: {quote.get('message')}")

    # Laat de Testing Mode AI reageren op het nieuwe advies (indien actief)
    await maybe_autotrade(symbol, quote, advice)


async def refresh_loop():
    symbols = [s.strip() for s in settings.WATCHLIST.split(",") if s.strip()]
    if not symbols:
        logger.warning("Geen symbolen in WATCHLIST ingesteld (.env)")
        return

    while True:
        for symbol in symbols:
            try:
                await refresh_symbol(symbol)
            except Exception as e:
                logger.exception(f"Onverwachte fout bij verversen van {symbol}: {e}")
            await asyncio.sleep(DELAY_BETWEEN_SYMBOLS_SECONDS)
        # Na een volledige ronde: wacht het ingestelde interval voordat we opnieuw beginnen
        await asyncio.sleep(settings.REFRESH_INTERVAL_SECONDS)


def start_scheduler():
    asyncio.create_task(refresh_loop())
