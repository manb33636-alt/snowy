# advisor.py
# ----------------------------------------------------------------------
# Brengt ALLES samen: techniek + nieuws/AI.
# Vertelt je in gewone taal wat de bot op dit moment zou doen en waarom.
#
# Draai met:  python advisor.py
# ----------------------------------------------------------------------

import config
import data
import strategy
import news
import sentiment
from portfolio import Portfolio


def decide(technical_signal, sentiment_score, in_position=False, trend_up=None):
    """
    Combineer het technische signaal met de sentiment-score tot één
    eindbeslissing. Geeft (actie, uitleg, tag) terug, waarbij tag de trigger
    is: 'TECH', 'NEWS' of None (voor het meten van de nieuws-bijdrage).

    Kernregels:
      - Techniek zegt VERKOOP                          -> VERKOOP (nieuws negeren).
      - In de markt + ZÉÉR negatief nieuws             -> VERKOOP (nieuws-uitstap).
      - Techniek zegt KOOP, maar nieuws is te negatief -> VETO (wacht).
      - Techniek zegt KOOP en nieuws is oké            -> KOOP.
      - Nieuws uitzonderlijk positief ÉN trend niet tegen -> KOOP (nieuws).
    """
    # Verkoopsignalen laten we altijd door (kapitaal beschermen gaat voor).
    if technical_signal == "SELL":
        return "SELL", "Technisch verkoopsignaal — uitstappen.", "TECH"

    # Nieuwsfilter uit? Dan puur op techniek.
    if not config.USE_NEWS_FILTER:
        return technical_signal, "Nieuwsfilter staat uit; puur technisch besluit.", "TECH"

    # Nieuws-gedreven uitstap: in de markt én zeer slecht nieuws -> eruit.
    if (config.USE_NEWS_EXIT and in_position
            and sentiment_score <= config.SENTIMENT_FORCE_SELL):
        return "SELL", (
            f"Zeer negatief nieuws (score {sentiment_score:+.2f}) terwijl we in de "
            f"markt zitten — uitstappen om kapitaal te beschermen."
        ), "NEWS"

    if technical_signal == "BUY":
        if sentiment_score < config.SENTIMENT_BLOCK_BUY:
            return "HOLD", (
                f"Techniek wil kopen, maar het nieuws is te negatief "
                f"(score {sentiment_score:+.2f}). AI geeft een veto — wachten."
            ), None
        tag = "TECH+NEWS" if sentiment_score >= config.SENTIMENT_STRONG_BUY else "TECH"
        return "BUY", (
            f"Technisch koopsignaal én het nieuws zit niet tegen "
            f"(score {sentiment_score:+.2f}). Kopen."
        ), tag

    # Geen technisch signaal (HOLD), maar misschien is het nieuws zó goed dat we
    # toch instappen — MAAR alleen als de trend niet tégen ons is (geen all-in
    # op puur nieuws in een dalende trend).
    if sentiment_score >= config.SENTIMENT_STRONG_BUY:
        if trend_up is False:
            return "HOLD", (
                f"Sterk positief nieuws (score {sentiment_score:+.2f}), maar de trend "
                f"wijst omlaag — niet instappen op alleen nieuws."
            ), None
        return "BUY", (
            f"Geen technisch signaal, maar het nieuws is uitgesproken positief "
            f"(score {sentiment_score:+.2f}) en de trend zit niet tegen. Instappen."
        ), "NEWS"

    return "HOLD", "Geen duidelijk signaal — niets doen.", None


def run_advice():
    print("=" * 60)
    print(f"  ADVIES voor {config.SYMBOL}  ({config.TIMEFRAME})")
    print("=" * 60)

    # 1. Techniek: laatste AFGESLOTEN candle + indicatoren -> signaal.
    #    iloc[-2] = laatste volledig afgesloten candle (iloc[-1] loopt nog).
    #    Zo beslist de advisor op exact dezelfde data als live.py en de backtest.
    df = data.fetch_candles(limit=200)
    df = strategy.add_indicators(df)
    last, prev = df.iloc[-2], df.iloc[-3]
    technical_signal = strategy.signal_for_row(last, prev)

    price = last["close"]
    print(f"  Laatste slotkoers: {price:,.2f} USDT")
    print(f"  Snel gemiddelde:  {last['ma_fast']:,.2f}")
    print(f"  Traag gemiddelde: {last['ma_slow']:,.2f}")
    print(f"  RSI:              {last['rsi']:.1f}")
    print(f"  Technisch signaal: {technical_signal}")
    print("-" * 60)

    # 2. Nieuws/AI (indien aan).
    sentiment_score = 0.0
    if config.USE_NEWS_FILTER:
        print(f"  Nieuws ophalen en beoordelen (methode: {config.SENTIMENT_METHOD})...")
        koppen = news.fetch_headlines(limit=15)
        sentiment_score, uitleg = sentiment.get_sentiment(koppen)
        print(f"  Sentiment-score:  {sentiment_score:+.2f}")
        print(f"  Uitleg:           {uitleg}")
        print("-" * 60)

    # 3. Eindbeslissing (houd rekening met of de live-bot in de markt zit
    #    voor déze munt — het statusbestand is multi-coin).
    import portfolios
    ports = portfolios.load_all(config.STATE_FILE)
    in_markt = ports.get(config.SYMBOL, Portfolio()).in_position()
    trend_up = bool(last["ma_fast"] > last["ma_slow"])
    actie, uitleg, _tag = decide(technical_signal, sentiment_score, in_markt, trend_up)
    print(f"  >>> BESLISSING: {actie}")
    print(f"      {uitleg}")
    print("=" * 60)
    print("  Let op: dit is PAPER TRADING / advies. Er gaat geen echt geld om.")


if __name__ == "__main__":
    run_advice()
