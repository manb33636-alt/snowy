# data.py
# ----------------------------------------------------------------------
# Haalt koersdata op van de beurs via de 'ccxt' library.
# We krijgen "OHLCV" data terug: Open, High, Low, Close, Volume per candle.
# Dit is GRATIS, publieke data -- geen account of API-sleutel nodig.
# ----------------------------------------------------------------------

import time

import ccxt
import pandas as pd
import config


def get_exchange():
    """Maak een verbinding met de beurs (alleen voor data ophalen)."""
    exchange_class = getattr(ccxt, config.EXCHANGE)
    return exchange_class({
        "enableRateLimit": True,  # netjes binnen limieten blijven
        "timeout": 20000,         # max 20s wachten, anders niet eindeloos hangen
    })


def fetch_candles(symbol=config.SYMBOL, timeframe=config.TIMEFRAME, limit=500,
                  retries=3):
    """
    Haal de laatste `limit` candles op.

    Probeert het bij een netwerkstoring een paar keer opnieuw (belangrijk voor
    een bot die lang blijft draaien). Geeft een pandas DataFrame terug met
    kolommen: timestamp, open, high, low, close, volume

    Gooit pas een fout als alle pogingen mislukken.
    """
    exchange = get_exchange()
    laatste_fout = None
    for poging in range(1, retries + 1):
        try:
            raw = exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
            df = pd.DataFrame(
                raw, columns=["timestamp", "open", "high", "low", "close", "volume"]
            )
            # timestamp staat in milliseconden -> omzetten naar leesbare datum/tijd
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
            return df
        except Exception as e:
            laatste_fout = e
            print(f"  (data ophalen mislukt, poging {poging}/{retries}: {e})")
            if poging < retries:
                time.sleep(3)  # even wachten en opnieuw proberen

    raise ConnectionError(
        f"Kon geen koersdata ophalen na {retries} pogingen: {laatste_fout}"
    )


def fetch_price(symbol, retries=2):
    """
    Haal alleen de HUIDIGE prijs op (veel lichter dan candles ophalen).
    Gebruikt door de snelle nieuwswaker voor een directe beschermverkoop.
    """
    exchange = get_exchange()
    laatste_fout = None
    for poging in range(1, retries + 1):
        try:
            ticker = exchange.fetch_ticker(symbol)
            price = ticker.get("last") or ticker.get("close")
            if price:
                return float(price)
            raise ValueError("ticker zonder prijs")
        except Exception as e:
            laatste_fout = e
            if poging < retries:
                time.sleep(2)
    raise ConnectionError(f"Kon geen prijs ophalen voor {symbol}: {laatste_fout}")


def fetch_candles_range(symbol, timeframe, days, retries=3, max_calls=80):
    """
    Haal ALLE candles op van `days` dagen geleden tot nu — in stukjes, want een
    beurs geeft nooit duizenden candles in één keer terug (Binance: max 1000).

    Wordt gebruikt voor de backtest-periodes (1 maand / 3 maanden / 1 jaar /
    5 jaar). Bij lange periodes op een klein timeframe (bv. 5 jaar op '1h')
    kan dit een paar tientallen aanvragen kosten en dus wat langer duren —
    dat is normaal, geen fout.
    """
    import time as _time

    exchange = get_exchange()
    tf_ms = exchange.parse_timeframe(timeframe) * 1000
    since = exchange.milliseconds() - days * 24 * 60 * 60 * 1000
    now = exchange.milliseconds()

    all_rows = []
    calls = 0
    while since < now and calls < max_calls:
        laatste_fout = None
        raw = None
        for poging in range(1, retries + 1):
            try:
                raw = exchange.fetch_ohlcv(symbol, timeframe=timeframe, since=since, limit=1000)
                break
            except Exception as e:
                laatste_fout = e
                if poging < retries:
                    _time.sleep(2)
        calls += 1
        if raw is None:
            raise ConnectionError(
                f"Kon geen historische data ophalen voor {symbol}: {laatste_fout}")
        if not raw:
            break
        all_rows.extend(raw)
        since = raw[-1][0] + tf_ms  # verder vanaf de laatste opgehaalde candle

    if not all_rows:
        raise ValueError(f"Geen historische data gevonden voor {symbol} ({timeframe}, {days}d)")

    df = pd.DataFrame(all_rows, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df = df.drop_duplicates(subset="timestamp").reset_index(drop=True)
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    return df


if __name__ == "__main__":
    # Snel testen: draai `python data.py` om te zien of data ophalen werkt.
    df = fetch_candles(limit=5)
    print(f"Laatste {len(df)} candles voor {config.SYMBOL} ({config.TIMEFRAME}):")
    print(df.to_string(index=False))
