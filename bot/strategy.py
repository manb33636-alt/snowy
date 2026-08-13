# strategy.py
# ----------------------------------------------------------------------
# Het "brein" van de bot (de technische kant).
# Rekent indicatoren uit en bepaalt per candle: "BUY", "SELL" of "HOLD".
#
# Indicatoren:
#   - Twee voortschrijdende gemiddelden (de kern-crossover-strategie)
#   - RSI (over-/onderverkocht)
#   - MACD (momentum)          -> optionele extra bevestiging
#   - Bollinger Bands (afstand) -> optionele extra bevestiging
# ----------------------------------------------------------------------

import config
import numpy as np
import pandas as pd


def indicator_snapshot(row):
    """
    Momentopname van de indicatoren bij een beslissing, voor het trade-log.
    Slaat platte, JSON-vriendelijke getallen op (geen NaN, geen pandas-types).
    """
    def clean(v):
        try:
            v = float(v)
            return None if v != v else round(v, 4)  # NaN -> None
        except (TypeError, ValueError):
            return None
    return {
        "ma_fast": clean(row.get("ma_fast")), "ma_slow": clean(row.get("ma_slow")),
        "ema_fast": clean(row.get("ema_fast")), "ema_slow": clean(row.get("ema_slow")),
        "rsi": clean(row.get("rsi")), "macd_hist": clean(row.get("macd_hist")),
        "bb_upper": clean(row.get("bb_upper")), "bb_lower": clean(row.get("bb_lower")),
        "vwap": clean(row.get("vwap")), "atr_pct": clean(row.get("atr_pct")),
        "support": clean(row.get("support")), "resistance": clean(row.get("resistance")),
        "close": clean(row.get("close")),
    }


def confidence_score(row, sentiment_score=0.0, closes=None):
    """
    Zuiver informatieve 0-100 score voor het trade-log en dagrapport: hoe sterk
    wijzen de indicatoren dezelfde kant op? Verandert NOOIT het koop/verkoop-
    signaal zelf (dat blijft uitsluitend signal_for_row hierboven) -- dit is
    alleen voor "hoe overtuigend was dit signaal achteraf te verklaren".

    Telt nu 7 bevestigingen mee i.p.v. 3: MA-trend, RSI, MACD, EMA-bevestiging,
    VWAP-positie, ATR/volatiliteit, en nieuws-sentiment. Support/Resistance en
    Fibonacci tellen mee als `closes` wordt meegegeven (optioneel, want ze
    hebben een langere prijsreeks nodig dan alleen deze ene rij).
    """
    ma_fast, ma_slow = row.get("ma_fast"), row.get("ma_slow")
    rsi, macd_hist = row.get("rsi"), row.get("macd_hist")
    if ma_fast != ma_fast or ma_slow != ma_slow or ma_slow == 0:  # NaN-check
        return 50
    trend_dir = 1 if ma_fast > ma_slow else -1
    points, total = 0.0, 0.0

    # 1) Trendkracht: hoe ver ma_fast van ma_slow ligt (% van ma_slow).
    total += 20
    gap_pct = abs(ma_fast - ma_slow) / abs(ma_slow) * 100
    points += min(20, 20 * min(1.0, gap_pct / 1.5))

    # 2) RSI: staat hij (in de richting van de trend) weg van neutraal (50)?
    total += 20
    if rsi == rsi:
        rsi_dev = (rsi - 50) * trend_dir
        points += max(0, min(20, 20 * max(0, rsi_dev) / 25))

    # 3) MACD-histogram: bevestigt het momentum dezelfde richting?
    total += 15
    if macd_hist == macd_hist:
        if (macd_hist > 0) == (trend_dir > 0):
            points += 15

    # 4) EMA bevestigt de SMA-kruising? (twee onafhankelijke gemiddelden eens)
    total += 10
    ema_fast, ema_slow = row.get("ema_fast"), row.get("ema_slow")
    if ema_fast == ema_fast and ema_slow == ema_slow:
        ema_dir = 1 if ema_fast > ema_slow else -1
        if ema_dir == trend_dir:
            points += 10

    # 5) VWAP: koers aan de "juiste" kant van het volumegewogen gemiddelde?
    total += 10
    vwap, close = row.get("vwap"), row.get("close")
    if vwap == vwap and close == close and vwap:
        vwap_dir = 1 if close > vwap else -1
        if vwap_dir == trend_dir:
            points += 10

    # 6) ATR: bij hoge volatiliteit is een signaal minder te vertrouwen.
    total += 10
    atr_pct = row.get("atr_pct")
    if atr_pct == atr_pct:
        points += max(0, min(10, 10 * (1 - min(1, atr_pct / 8))))
    else:
        points += 5  # onbekend -> neutraal, niet straffen of belonen

    # 7) Nieuws-sentiment: versterkt het de richting, of werkt het tegen?
    total += 15
    aligned = sentiment_score * trend_dir
    points += max(0, min(15, 15 * (0.5 + aligned)))

    # 8) (optioneel) Support/Resistance + Fibonacci -- alleen als er genoeg
    #    prijsgeschiedenis is meegegeven om een swing-hoog/-laag te bepalen.
    if closes is not None and len(closes) >= 20:
        total += 10
        recent = closes[-20:]
        swing_low, swing_high = min(recent), max(recent)
        levels = fibonacci_levels(swing_low, swing_high)
        fib_hit = nearest_fib_level(close, levels) if levels and close == close else None
        if fib_hit:
            points += 10  # koers zit dicht bij een klassiek terugval-niveau
        else:
            # dichter bij support (bij een koop) of resistance (bij een verkoop) is ook een plus
            if trend_dir > 0 and swing_high > swing_low:
                nearness = 1 - min(1, abs(close - swing_low) / (swing_high - swing_low))
                points += 10 * max(0, nearness - 0.5) * 2
            elif trend_dir < 0 and swing_high > swing_low:
                nearness = 1 - min(1, abs(close - swing_high) / (swing_high - swing_low))
                points += 10 * max(0, nearness - 0.5) * 2

    return round(max(0, min(100, points / total * 100))) if total else 50


def add_indicators(df, fast_ma=None, slow_ma=None, rsi_period=None):
    """
    Bereken alle indicatoren en zet ze als kolommen in de tabel.

    De parameters fast_ma/slow_ma/rsi_period kun je overschrijven (handig voor
    de optimizer die verschillende instellingen test). Laat je ze leeg, dan
    pakt hij de waarden uit config.py.
    """
    fast = fast_ma or config.FAST_MA
    slow = slow_ma or config.SLOW_MA
    rsi_p = rsi_period or config.RSI_PERIOD
    close = df["close"]

    # --- Voortschrijdende gemiddelden (de kern) ---
    df["ma_fast"] = close.rolling(window=fast).mean()
    df["ma_slow"] = close.rolling(window=slow).mean()

    # --- RSI ---
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=rsi_p).mean()
    avg_loss = loss.rolling(window=rsi_p).mean()
    rs = avg_gain / avg_loss
    df["rsi"] = 100 - (100 / (1 + rs))

    # --- MACD (momentum) ---
    ema_fast = close.ewm(span=config.MACD_FAST, adjust=False).mean()
    ema_slow = close.ewm(span=config.MACD_SLOW, adjust=False).mean()
    df["macd"] = ema_fast - ema_slow
    df["macd_signal"] = df["macd"].ewm(span=config.MACD_SIGNAL, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]  # >0 = opwaarts momentum

    # --- Bollinger Bands (afstand tot het gemiddelde) ---
    mid = close.rolling(window=config.BOLLINGER_PERIOD).mean()
    std = close.rolling(window=config.BOLLINGER_PERIOD).std()
    df["bb_mid"] = mid
    df["bb_upper"] = mid + config.BOLLINGER_STD * std
    df["bb_lower"] = mid - config.BOLLINGER_STD * std

    # --- EMA (exponentieel, los van de SMA-kruising hierboven -- ter bevestiging:
    #     als EMA en SMA het niet eens zijn over de richting, is het signaal minder sterk) ---
    df["ema_fast"] = close.ewm(span=fast, adjust=False).mean()
    df["ema_slow"] = close.ewm(span=slow, adjust=False).mean()

    # --- VWAP (volumegewogen gemiddelde prijs, rollend venster i.p.v. sessie
    #     -- crypto handelt 24/7, dus er is geen natuurlijk sessiebegin) ---
    if "volume" in df.columns and "high" in df.columns and "low" in df.columns:
        typical_price = (df["high"] + df["low"] + close) / 3
        pv = typical_price * df["volume"]
        vol_sum = df["volume"].rolling(window=slow).sum()
        df["vwap"] = pv.rolling(window=slow).sum() / vol_sum.replace(0, float("nan"))
    else:
        df["vwap"] = float("nan")

    # --- ATR (Average True Range -- hoe groot zijn de prijsbewegingen echt) ---
    if "high" in df.columns and "low" in df.columns:
        prev_close = close.shift(1)
        tr = pd.concat([
            df["high"] - df["low"],
            (df["high"] - prev_close).abs(),
            (df["low"] - prev_close).abs(),
        ], axis=1).max(axis=1)
        df["atr"] = tr.rolling(window=14).mean()
        df["atr_pct"] = df["atr"] / close * 100  # relatief, vergelijkbaar tussen munten
    else:
        df["atr"], df["atr_pct"] = float("nan"), float("nan")

    # --- Support & Resistance (recente swing-niveaus, rollend venster) ---
    if "high" in df.columns and "low" in df.columns:
        df["resistance"] = df["high"].rolling(window=slow).max()
        df["support"] = df["low"].rolling(window=slow).min()
    else:
        df["resistance"], df["support"] = float("nan"), float("nan")

    return df


def trendline_slope(closes, window=20):
    """
    Richting EN kracht van de trendlijn: de helling van een lineaire regressie
    over de laatste `window` sluitkoersen, uitgedrukt als %-verandering per
    candle (zodat het vergelijkbaar is tussen goedkope en dure munten).
    Werkt op een lijst/array van sluitkoersen (niet de hele dataframe) omdat
    dit alleen op het BESLISMOMENT wordt uitgerekend, niet per historische rij.
    """
    recent = np.asarray(closes[-window:] if len(closes) > window else closes, dtype=float)
    recent = recent[~np.isnan(recent)]
    if len(recent) < 3 or recent[-1] == 0:
        return None
    x = np.arange(len(recent))
    slope, _ = np.polyfit(x, recent, 1)
    return round(slope / recent[-1] * 100, 4)


def fibonacci_levels(swing_low, swing_high):
    """De klassieke Fibonacci-retracementniveaus tussen een recent dal en piek."""
    if swing_high is None or swing_low is None or swing_high <= swing_low:
        return None
    diff = swing_high - swing_low
    return {
        "0.0": swing_high, "23.6": swing_high - 0.236 * diff,
        "38.2": swing_high - 0.382 * diff, "50.0": swing_high - 0.5 * diff,
        "61.8": swing_high - 0.618 * diff, "78.6": swing_high - 0.786 * diff,
        "100.0": swing_low,
    }


def nearest_fib_level(price, levels, tolerance_pct=1.0):
    """
    Het dichtstbijzijnde Fibonacci-niveau als de prijs er dicht genoeg bij zit
    (binnen `tolerance_pct`), anders None. Fibonacci-niveaus worden traditioneel
    gebruikt als "prijs kaatst hier mogelijk terug" -- dit maakt dat concreet meetbaar.
    """
    if not levels or not price:
        return None
    best = None
    for label, level in levels.items():
        if level <= 0:
            continue
        dist_pct = abs(price - level) / level * 100
        if dist_pct <= tolerance_pct and (best is None or dist_pct < best[2]):
            best = (label, level, dist_pct)
    return best


def _confirmations_ok(row):
    """
    Extra bevestigingen (alleen als ze in config aanstaan).
    Geeft True als KOPEN is toegestaan volgens de extra indicatoren.
    """
    if config.USE_MACD_CONFIRM:
        hist = row["macd_hist"]
        # NaN (nog niet genoeg data) of niet-positief momentum -> niet bevestigd.
        if hist != hist or hist <= 0:
            return False

    if config.USE_BOLLINGER_CONFIRM:
        upper, close = row["bb_upper"], row["close"]
        if upper != upper or close != close:
            return False
        # Koers al boven de bovenband = te ver doorgeschoten -> niet kopen.
        if close > upper:
            return False

    return True


def signal_for_row(row, prev_row):
    """
    Bepaal het signaal voor EEN candle.

    KOPEN  als het snelle gemiddelde NET boven het trage kruist (omhoog),
           de RSI niet al overgekocht is, EN eventuele extra bevestigingen kloppen.
    VERKOPEN als het snelle gemiddelde NET onder het trage kruist (omlaag).
    Anders: HOLD.
    """
    if prev_row is None:
        return "HOLD"
    # Niet genoeg data voor de kern-indicatoren -> niets doen.
    for value in (row["ma_fast"], row["ma_slow"], prev_row["ma_fast"],
                  prev_row["ma_slow"], row["rsi"]):
        if value != value:  # truc: NaN is nooit gelijk aan zichzelf
            return "HOLD"

    crossed_up = prev_row["ma_fast"] <= prev_row["ma_slow"] and row["ma_fast"] > row["ma_slow"]
    crossed_down = prev_row["ma_fast"] >= prev_row["ma_slow"] and row["ma_fast"] < row["ma_slow"]

    if crossed_up and row["rsi"] < config.RSI_OVERBOUGHT and _confirmations_ok(row):
        return "BUY"
    if crossed_down:
        return "SELL"
    return "HOLD"
