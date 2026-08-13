# analyze.py
# ----------------------------------------------------------------------
# Een volledige MARKTANALYSE van dit moment: trend, momentum, volatiliteit,
# steun/weerstand en de stand van de indicatoren — in gewone taal.
#
# Let op: dit is een BESCHRIJVING van waar de markt nu staat, GEEN
# voorspelling van waar hij heen gaat. (Voor een echte voorspelling +
# eerlijke nauwkeurigheid: zie predict.py.)
#
# Draaien:  python analyze.py
# ----------------------------------------------------------------------

import os
import sys

import config
import data
import strategy
import news
import notify


def multi_coin_overview():
    """
    Kort marktbreed overzicht van ALLE munten die de bot verhandelt:
    trend (↑/↓), koers, 24-uurs beweging en RSI per munt.
    """
    lines = []
    for sym in config.SYMBOLS:
        try:
            df = data.fetch_candles(symbol=sym, limit=80)
            df = strategy.add_indicators(df)
            last = df.iloc[-1]
            price = float(last["close"])
            m24 = ((price / float(df.iloc[-25]["close"]) - 1) * 100
                   if len(df) > 25 else None)
            trend = "↑" if last["ma_fast"] > last["ma_slow"] else "↓"
            rsi = float(last["rsi"])
            m24_txt = f"{m24:+.1f}%" if m24 is not None else "?"
            rsi_txt = f"{rsi:.0f}" if rsi == rsi else "?"
            lines.append(f"{trend} {sym.split('/')[0]}: {price:,.2f} "
                         f"(24u {m24_txt}, RSI {rsi_txt})")
        except Exception:
            lines.append(f"? {sym.split('/')[0]}: geen data deze ronde")
    return lines


def ai_analysis(a, headlines, overview=None):
    """
    Vraag Claude om een kwalitatieve analyse in gewone taal.
    Werkt ALLEEN als er een ANTHROPIC_API_KEY in .env staat; anders None
    (dan valt de bot terug op de gratis statistische samenvatting).
    """
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    try:
        import anthropic
        client = anthropic.Anthropic()
        koppen = "\n".join(f"- {h}" for h in headlines[:12])
        m24_txt = f" (24u {a['m24']:+.1f}%)" if a["m24"] is not None else ""
        breedte = ("\nHELE MARKT (alle munten van de bot):\n"
                   + "\n".join(f"- {r}" for r in overview) + "\n") if overview else ""
        prompt = (
            f"Je bent een nuchtere crypto-analist. Geef een korte, eerlijke analyse in het "
            f"Nederlands (max ~180 woorden), met {config.SYMBOL} als hoofdmunt maar ook "
            f"een blik op de bredere markt. Geen beleggingsadvies; "
            f"wees duidelijk dat het een inschatting is, geen garantie.\n\n"
            f"TECHNISCH ({config.SYMBOL}):\n"
            f"- Koers: {a['price']:.0f}{m24_txt}\n"
            f"- Trend: {'omhoog' if a['trend_up'] else 'omlaag'}\n"
            f"- RSI: {a['rsi']:.0f} ({a['rsi_zone']})\n"
            f"- MACD: {'opwaarts' if a['macd_up'] else 'neerwaarts'}\n"
            f"- Bollinger: koers {a['bb_pos']}\n"
            f"- Steun {a['support']:.0f}, weerstand {a['resistance']:.0f}\n"
            f"{breedte}\n"
            f"NIEUWS:\n{koppen}\n\n"
            f"Geef: het beeld in 2-3 zinnen, wat de bredere markt zegt (lopen munten "
            f"uiteen of bewegen ze samen?), de belangrijkste spanning tussen techniek "
            f"en nieuws, en 1-2 concrete koersniveaus om te volgen."
        )
        resp = client.messages.create(
            model=config.ANALYSIS_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        # Alleen de tekstblokken (Fable 5 heeft 'thinking' altijd aan; die slaan
        # we over). Leeg antwoord -> None, zodat we terugvallen op statistisch.
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        return text or None
    except Exception as e:
        print(f"  (Claude-analyse mislukt: {e} -> statistische versie)")
        return None


def telegram_text(a):
    """Compacte versie van de analyse voor een Telegram-bericht."""
    # Te weinig data voor de indicatoren? Dan geen "RSI nan" versturen.
    if a["rsi"] != a["rsi"]:  # NaN-check
        return (f"📈 Marktanalyse {config.SYMBOL}\n"
                f"Koers {a['price']:,.0f} — te weinig data voor een volledige "
                f"analyse deze ronde.")
    lines = [
        f"📈 Marktanalyse {config.SYMBOL}",
        f"Koers {a['price']:,.0f}" +
        (f" (24u {a['m24']:+.1f}%)" if a["m24"] is not None else ""),
        f"Trend {'omhoog' if a['trend_up'] else 'omlaag'} · "
        f"RSI {a['rsi']:.0f} ({a['rsi_zone'].split(' ')[0]}) · "
        f"MACD {'op' if a['macd_up'] else 'neer'}",
        f"Steun {a['support']:,.0f} · Weerstand {a['resistance']:,.0f}",
        f"Beeld: {a['bias']}",
    ]
    return "\n".join(lines)


def analyze(df):
    """Bouw een analyse-dict uit een tabel mét indicatoren."""
    last = df.iloc[-1]
    price = float(last["close"])

    # Trend: snel vs traag gemiddelde + helling van het trage gemiddelde.
    trend_up = last["ma_fast"] > last["ma_slow"]
    slope = last["ma_slow"] - df.iloc[-10]["ma_slow"] if len(df) > 10 else 0

    # Momentum: RSI-zone + MACD.
    rsi = float(last["rsi"])
    if rsi >= config.RSI_OVERBOUGHT:
        rsi_zone = "overgekocht (mogelijk te duur)"
    elif rsi <= config.RSI_OVERSOLD:
        rsi_zone = "oververkocht (mogelijk goedkoop)"
    else:
        rsi_zone = "neutraal"
    macd_up = last["macd_hist"] > 0

    # Volatiliteit: breedte van de Bollinger Banden t.o.v. het midden.
    bb_width = (last["bb_upper"] - last["bb_lower"]) / last["bb_mid"] * 100
    if price > last["bb_upper"]:
        bb_pos = "boven de bovenband (ver doorgeschoten omhoog)"
    elif price < last["bb_lower"]:
        bb_pos = "onder de onderband (ver doorgeschoten omlaag)"
    elif price > last["bb_mid"]:
        bb_pos = "in de bovenste helft"
    else:
        bb_pos = "in de onderste helft"

    # Steun/weerstand: recente laagste/hoogste koers.
    window = df.tail(60)
    support = float(window["low"].min())
    resistance = float(window["high"].max())

    # Recente beweging.
    def change_over(h):
        return (price / float(df.iloc[-1 - h]["close"]) - 1) * 100 if len(df) > h else None
    m24, m7d = change_over(24), change_over(168)

    # Simpele "bias"-score (samenvatting, GEEN voorspelling).
    score = 0
    score += 1 if trend_up else -1
    score += 1 if macd_up else -1
    score += 1 if price > last["bb_mid"] else -1
    if rsi >= config.RSI_OVERBOUGHT:
        score -= 1
    elif rsi <= config.RSI_OVERSOLD:
        score += 1
    if score >= 2:
        bias = "positief (bullish) beeld"
    elif score <= -2:
        bias = "negatief (bearish) beeld"
    else:
        bias = "gemengd / neutraal beeld"

    return {
        "price": price, "trend_up": trend_up, "slope": slope,
        "rsi": rsi, "rsi_zone": rsi_zone, "macd_up": macd_up,
        "bb_width": bb_width, "bb_pos": bb_pos,
        "support": support, "resistance": resistance,
        "m24": m24, "m7d": m7d, "bias": bias,
    }


def main(limit=300):
    print(f"Data ophalen voor {config.SYMBOL}...")
    df = data.fetch_candles(limit=limit)
    df = strategy.add_indicators(df)
    a = analyze(df)

    print("=" * 60)
    print(f"  MARKTANALYSE — {config.SYMBOL} ({config.TIMEFRAME})")
    print("=" * 60)
    print(f"  Koers nu:        {a['price']:,.2f} USDT")
    if a["m24"] is not None:
        print(f"  Beweging:        24u {a['m24']:+.1f}%" +
              (f" | 7d {a['m7d']:+.1f}%" if a["m7d"] is not None else ""))
    print("-" * 60)
    print(f"  Trend:           {'omhoog' if a['trend_up'] else 'omlaag'} "
          f"(snel gemiddelde {'boven' if a['trend_up'] else 'onder'} traag, "
          f"traag {'stijgt' if a['slope'] > 0 else 'daalt'})")
    print(f"  Momentum (RSI):  {a['rsi']:.0f} — {a['rsi_zone']}")
    print(f"  Momentum (MACD): {'opwaarts' if a['macd_up'] else 'neerwaarts'}")
    print(f"  Volatiliteit:    bandbreedte {a['bb_width']:.1f}% — koers {a['bb_pos']}")
    print(f"  Steun (recent):  {a['support']:,.2f}")
    print(f"  Weerstand:       {a['resistance']:,.2f}")
    print("-" * 60)
    print(f"  SAMENVATTING:    {a['bias']}")
    print("=" * 60)

    # Marktbreed overzicht: hoe staan ALLE munten van de bot ervoor?
    print("  HELE MARKT (alle munten van de bot):")
    overview = multi_coin_overview()
    for r in overview:
        print(f"    {r}")
    print("=" * 60)
    print("  Let op: dit beschrijft waar de markt NU staat — het is GEEN")
    print("  voorspelling. Voor een echte voorspelling: python predict.py")

    # Met 'python analyze.py send' gaat de analyse ook naar Telegram.
    # Staat er een ANTHROPIC_API_KEY in .env? Dan een slimme Claude-analyse;
    # zo niet, dan de gratis statistische samenvatting. Automatisch.
    if "send" in sys.argv:
        koppen = news.fetch_headlines(limit=12) if config.USE_NEWS_FILTER else []
        ai = ai_analysis(a, koppen, overview)
        if ai:
            notify.send(f"🧠 Claude-analyse {config.SYMBOL}\n\n{ai}")
            print("\n  (Claude-AI-analyse naar Telegram gestuurd)")
        else:
            msg = telegram_text(a) + "\n— hele markt —\n" + "\n".join(overview)
            notify.send(msg)
            print("\n  (statistische analyse naar Telegram gestuurd)")


if __name__ == "__main__":
    main()
