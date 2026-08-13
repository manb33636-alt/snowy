"""
Zet live koers + indicatoren om in een AI-advies.
Belangrijk: dit is een kansinschatting op basis van regels/data — nooit een garantie.
"""
from typing import Optional


def generate_advice(quote: dict, indicators: dict) -> dict:
    if quote.get("status") != "ok" or indicators.get("status") != "ok":
        return {
            "advice": None,
            "confidence": None,
            "risk": None,
            "reasons": [],
            "status": "unavailable",
            "message": quote.get("message") or indicators.get("message") or "Live data niet beschikbaar",
        }

    reasons = []
    score = 0

    rsi = indicators.get("rsi")
    if rsi is not None:
        if rsi > 70:
            score -= 1
            reasons.append(f"RSI hoog ({rsi:.0f}) — mogelijk overgekocht")
        elif rsi < 30:
            score += 1
            reasons.append(f"RSI laag ({rsi:.0f}) — mogelijk oversold")
        else:
            reasons.append(f"RSI neutraal ({rsi:.0f})")

    ema = indicators.get("ema")
    sma = indicators.get("sma")
    if ema is not None and sma is not None:
        if ema > sma:
            score += 1
            reasons.append("EMA boven SMA — korte-termijn trend is sterker dan lange-termijn trend")
        else:
            score -= 1
            reasons.append("EMA onder SMA — korte-termijn trend zwakker dan lange-termijn trend")

    macd = indicators.get("macd")
    macd_signal = indicators.get("macd_signal")
    if macd is not None and macd_signal is not None:
        if macd > macd_signal:
            score += 1
            reasons.append("MACD boven signaallijn — positief momentum")
        else:
            score -= 1
            reasons.append("MACD onder signaallijn — negatief momentum")

    percent_change = quote.get("percent_change")
    if percent_change is not None:
        if percent_change > 1:
            reasons.append(f"Sterke stijging vandaag ({percent_change:.2f}%)")
        elif percent_change < -1:
            reasons.append(f"Sterke daling vandaag ({percent_change:.2f}%)")

    atr = indicators.get("atr")
    price = quote.get("price")
    risk = "Gemiddeld"
    if atr is not None and price:
        atr_pct = (atr / price) * 100
        if atr_pct > 3:
            risk = "Hoog"
        elif atr_pct < 1:
            risk = "Laag"
        reasons.append(f"ATR {atr_pct:.1f}% van koers — indicatie van volatiliteit")

    advice = "HOUDEN"
    if score >= 2:
        advice = "MOGELIJK KOPEN"
    elif score <= -2:
        advice = "MOGELIJK VERKOPEN"

    confidence = min(92, max(35, 55 + score * 12))

    return {
        "advice": advice,
        "confidence": round(confidence),
        "risk": risk,
        "reasons": reasons[:5],
        "status": "ok",
        "message": None,
    }
