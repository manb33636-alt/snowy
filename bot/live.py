# live.py
# ----------------------------------------------------------------------
# De LIVE paper-trading loop — nu MULTI-COIN. Checkt elke ronde alle munten
# uit config.SYMBOLS, elk met zijn eigen paper-portefeuille, en handelt met
# NEPGELD. Slaat alles op, dus je kunt stoppen (Ctrl+C) en later verder.
#
# Draaien:
#   python live.py            -> oneindig, interval uit config
#   python live.py 2 5        -> 2 rondes, elke 5 seconden (om te testen)
#
# Stoppen: Ctrl+C  (of via ./bot.sh stop als hij onder launchd draait)
# ----------------------------------------------------------------------

import json
import os
import subprocess
import sys
import time
from datetime import datetime

import config
import data
import strategy
import news
import sentiment
import advisor
import notify
import portfolios


def log(message):
    """Schrijf een regel naar het scherm én naar het logboek-bestand."""
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{stamp}] {message}"
    print(line)
    with open(config.LOG_FILE, "a") as f:
        f.write(line + "\n")


def log_news(score, uitleg, koppen):
    """Schrijf het gevolgde nieuws + sentiment naar een apart logboek."""
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(config.NEWS_LOG_FILE, "a") as f:
        f.write(f"[{stamp}] sentiment {score:+.2f} | {uitleg}\n")
        for k in koppen[:5]:
            f.write(f"    - {k}\n")


def record_equity(total_value):
    """Schrijf één keer per DAG de totale waarde weg (voor de drawdown-check)."""
    import json
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        if os.path.exists(config.EQUITY_FILE):
            with open(config.EQUITY_FILE) as f:
                lines = f.read().splitlines()
            if lines and json.loads(lines[-1]).get("date") == today:
                return  # vandaag al genoteerd
        with open(config.EQUITY_FILE, "a") as f:
            f.write(json.dumps({"date": today, "total": round(total_value, 2)}) + "\n")
    except Exception as e:
        log(f"  (waarschuwing: kon vermogenshistorie niet schrijven: {e})")


# --- Ingebouwde planner (vervangt macOS launchd als de bot ONLINE draait) ---
#
# Op je Mac regelt launchd de dagelijkse taken; dan staat deze planner UIT.
# Online bestaat launchd niet, dus zet daar RUN_SCHEDULER=1 en doet de bot het
# zelf. De taken starten los van de handelsronde (fire-and-forget), zodat een
# trage hertune nooit het handelen ophoudt. Output gaat naar een logbestand.
JOBS = [
    {"naam": "analyse", "script": "analyze.py", "args": ["send"],
     "tijd": "08:00", "weekdag": None},
    {"naam": "hertune", "script": "retune.py", "args": [],
     "tijd": "09:00", "weekdag": None},
    {"naam": "rapport", "script": "report.py", "args": [],
     "tijd": "20:00", "weekdag": None},
    {"naam": "beoordeling", "script": "evaluate.py", "args": ["send"],
     "tijd": "09:30", "weekdag": 0},   # 0 = maandag
]


def _load_schedule_state():
    try:
        with open(config.SCHEDULE_STATE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save_schedule_state(d):
    try:
        with open(config.SCHEDULE_STATE, "w") as f:
            json.dump(d, f)
    except Exception as e:
        log(f"  (planner: kon stand niet opslaan: {e})")


def run_scheduled_jobs(now=None):
    """
    Start geplande taken waarvan de tijd voorbij is en die vandaag nog niet
    draaiden. Alleen actief met RUN_SCHEDULER=1 (online); op je Mac doet
    launchd dit. Geeft de namen van de gestarte taken terug.
    """
    if os.environ.get("RUN_SCHEDULER") != "1":
        return []
    now = now or datetime.now()
    vandaag = now.strftime("%Y-%m-%d")
    state = _load_schedule_state()
    hier = os.path.dirname(os.path.abspath(__file__))
    gestart = []

    for job in JOBS:
        if job["weekdag"] is not None and now.weekday() != job["weekdag"]:
            continue
        uur, minuut = (int(x) for x in job["tijd"].split(":"))
        if (now.hour, now.minute) < (uur, minuut):
            continue                       # tijd nog niet bereikt vandaag
        if state.get(job["naam"]) == vandaag:
            continue                       # vandaag al gedraaid
        try:
            uitvoer = open(config.data_path(f"job_{job['naam']}.log"), "a")
            subprocess.Popen([sys.executable, job["script"]] + job["args"],
                             cwd=hier, stdout=uitvoer, stderr=subprocess.STDOUT)
            log(f"Geplande taak gestart: {job['naam']} ({job['script']})")
            gestart.append(job["naam"])
        except Exception as e:
            log(f"Geplande taak {job['naam']} kon niet starten: {e}")
        # Ook bij een mislukte start vandaag niet blijven herproberen.
        state[job["naam"]] = vandaag
        _save_schedule_state(state)
    return gestart


def btc_regime_up():
    """
    Staat Bitcoin (de marktleider) in een opgaande trend? Kijkt naar de laatste
    AFGESLOTEN 1-uurs candle: snel gemiddelde boven traag = opgaand regime.
    Fail-open: lukt de BTC-check niet (netwerk), geef dan True terug zodat we
    niet per ongeluk álle aankopen blokkeren op een tijdelijke storing.
    """
    if not config.USE_BTC_REGIME_FILTER:
        return True
    try:
        bdf = strategy.add_indicators(
            data.fetch_candles(symbol=config.BTC_REGIME_SYMBOL, limit=200))
        blast = bdf.iloc[-2]  # laatste afgesloten candle
        if blast["ma_fast"] != blast["ma_fast"]:  # NaN -> te weinig data
            return True
        return bool(blast["ma_fast"] > blast["ma_slow"])
    except Exception as e:
        log(f"  (regime-check BTC mislukt: {e} — filter deze ronde uit)")
        return True


def run_cycle(ports):
    """Eén ronde: nieuws ophalen (1x), dan elke munt checken en verhandelen."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Nieuws één keer per ronde: ALGEMEEN marktsentiment + score PER MUNT
    #    (Bitcoin-nieuws weegt zwaarder voor BTC dan voor bv. DOGE).
    sentiment_score = 0.0
    coin_scores = {}
    if config.USE_NEWS_FILTER:
        koppen = news.fetch_headlines(limit=config.NEWS_HEADLINES_LIMIT)
        sentiment_score, sent_uitleg, coin_scores = sentiment.get_sentiment_per_coin(
            koppen, config.SYMBOLS)
        log_news(sentiment_score, sent_uitleg, koppen)

    # 1b. Markt-regime: koopt de bot deze ronde überhaupt? Alleen als Bitcoin
    #     (de marktleider) in een opgaande trend zit. Eén keer bepalen, geldt
    #     voor alle munten. Verkopen/risicobeheer staan hier los van.
    regime_up = btc_regime_up()
    if config.USE_BTC_REGIME_FILTER and not regime_up:
        log("  Markt-regime: BTC-trend OMLAAG -> deze ronde geen nieuwe aankopen "
            "(verkopen/risicobeheer blijven actief).")

    # 2. Elke munt apart. Koopsignalen verzamelen we eerst (zie 2b): pas als
    #    ALLE munten bekeken zijn — inclusief de verkopen, die plekken vrijmaken —
    #    delen we de beschikbare plekken uit aan de BESTE kandidaten.
    prices = {}
    kandidaten = []
    for sym in config.SYMBOLS:
        pf = ports[sym]
        try:
            df = data.fetch_candles(symbol=sym, limit=200)
            df = strategy.add_indicators(df)
            closed = df.iloc[:-1]                    # afgesloten candles (laatste loopt nog)
            last, prev = df.iloc[-2], df.iloc[-3]    # laatste AFGESLOTEN candle
            price = float(last["close"])
            prices[sym] = price
            cur_ts = str(last["timestamp"])

            # --- Risicobeheer met INHAALSLAG ---
            # Check elke NIEUW afgesloten candle sinds vorige keer op stop-loss/
            # take-profit/trailing. Sliep de Mac een nacht? Dan halen we de
            # gemiste candles alsnog in, zodat een stop op het juiste moment vuurt.
            if pf.last_ts is None:
                to_check = closed.iloc[[-1]]          # eerste keer: alleen huidige candle
            else:
                to_check = closed[closed["timestamp"].astype(str) > pf.last_ts]
            pf.last_ts = cur_ts

            sold = False
            if pf.in_position() and len(to_check):
                if len(to_check) > 1:
                    log(f"[{sym}] inhaalslag: {len(to_check)} gemiste candles op "
                        f"risico gecheckt (bot heeft geslapen?)")
                for _, r in to_check.iterrows():
                    if pf.check_risk(float(r["close"]), str(r["timestamp"]),
                                     low=float(r["low"]), high=float(r["high"])):
                        reden, fill = pf.trades[-1][1], pf.trades[-1][2]
                        log(f"[{sym}] RISICO-VERKOOP ({reden}) @ {fill:,.2f} | "
                            f"waarde {pf.value(price):,.2f}")
                        notify.send(f"🔴 {sym}: {reden} @ {fill:,.2f} | "
                                    f"waarde {pf.value(price):,.2f} (paper)")
                        sold = True
                        break
            if sold:
                continue

            # --- Beslissing (techniek + nieuws + trend), met trigger-tag ---
            # We gebruiken het sentiment van DEZE munt (valt terug op het
            # algemene marktsentiment als er geen munt-specifiek nieuws is).
            technical_signal = strategy.signal_for_row(last, prev)
            trend_up = bool(last["ma_fast"] > last["ma_slow"])
            sym_sent = coin_scores.get(sym, sentiment_score)
            actie, uitleg, tag = advisor.decide(
                technical_signal, sym_sent, pf.in_position(), trend_up)
            confidence = strategy.confidence_score(last, sym_sent, closes=df["close"].tolist())
            snapshot = strategy.indicator_snapshot(last)
            if actie == "BUY" and not pf.in_position():
                if config.USE_BTC_REGIME_FILTER and not regime_up:
                    # Marktleider BTC daalt: niet tegen de hele markt in kopen.
                    log(f"[{sym}] KOOP-signaal, maar BTC-trend is omlaag "
                        f"(marktregime) — overgeslagen")
                else:
                    # Nog niet kopen: eerst alle munten zien, dan de beste kiezen.
                    kandidaten.append({"sym": sym, "price": price, "tag": tag,
                                       "uitleg": uitleg, "sent": sym_sent,
                                       "confidence": confidence, "indicators": snapshot})
            elif actie == "SELL" and pf.in_position():
                pf.sell(price, now, tag=tag, meta={
                    "reason_close": uitleg, "confidence": confidence,
                    "indicators": snapshot, "news_sentiment": sym_sent,
                })
                log(f"[{sym}] VERKOOP @ {price:,.2f} | {uitleg}")
                notify.send(f"🔵 {sym}: VERKOOP @ {price:,.2f} | "
                            f"waarde {pf.value(price):,.2f} (paper)")
            else:
                pos = "IN MARKT" if pf.in_position() else "uit markt"
                log(f"[{sym}] WACHT ({pos}) | koers {price:,.2f} | tech={technical_signal} "
                    f"sent={sym_sent:+.2f}")
        except Exception as e:
            # Eén kapotte munt mag de rest niet tegenhouden.
            log(f"[{sym}] FOUT: {e} — overgeslagen deze ronde.")

    # 2b. Vrije plekken verdelen onder de BESTE kandidaten.
    #     Waarom niet gewoon "wie het eerst in SYMBOLS staat"? Dan bepaalt de
    #     volgorde in het configuratiebestand wie er in mag — willekeurig. Nu
    #     krijgt de kandidaat met het STERKSTE nieuws-sentiment voorrang. Ook
    #     tellen we de plekken pas NA alle verkopen, zodat een net vrijgekomen
    #     plek dezelfde ronde nog benut kan worden.
    if kandidaten:
        vrij = config.MAX_OPEN_POSITIONS - sum(
            1 for p in ports.values() if p.in_position())
        kandidaten.sort(key=lambda k: k["sent"], reverse=True)
        for k in kandidaten:
            if vrij <= 0:
                log(f"[{k['sym']}] KOOP-signaal, maar portefeuille vol "
                    f"({config.MAX_OPEN_POSITIONS} posities) — overgeslagen "
                    f"(correlatie-limiet; sterkere kandidaten gingen voor)")
                continue
            pf = ports[k["sym"]]
            pf.buy(k["price"], now, tag=k["tag"], meta={
                "reason_open": k["uitleg"], "confidence": k["confidence"],
                "indicators": k["indicators"], "news_sentiment": k["sent"],
            })
            vrij -= 1
            log(f"[{k['sym']}] KOOP ({k['tag']}) @ {k['price']:,.2f} | "
                f"sent {k['sent']:+.2f} | {k['uitleg']}")
            notify.send(f"🟢 {k['sym']}: KOOP @ {k['price']:,.2f} | "
                        f"{k['uitleg']} (paper)")

    # 3. Alles opslaan + dagelijkse vermogenshistorie.
    portfolios.save_all(config.STATE_FILE, ports)
    total = portfolios.total_value(ports, prices)
    if len(prices) == len(config.SYMBOLS):
        record_equity(total)
    else:
        log(f"  (vermogenshistorie NIET geschreven: slechts {len(prices)}/"
            f"{len(config.SYMBOLS)} munten opgehaald deze ronde)")
    return total, prices


# --- Snelle nieuwswaker (tussen de uur-rondes door) ---------------------

# Onthoudt welke koppen we al gezien hebben, zodat we alleen werk doen als
# er ECHT nieuw nieuws is.
_seen_news_key = None


def news_protective_check(ports):
    """
    Eén snelle nieuwscheck tussen de uur-rondes door. Doet bewust maar één
    ding: KAPITAAL BESCHERMEN. Wordt het nieuws voor een munt zéér negatief
    terwijl we erin zitten, dan verkopen we DIRECT (niet pas over een uur).
    Kopen doen we hier bewust NIET — instappen blijft alleen op afgesloten
    uur-candles (discipline; geen impulsaankopen op een enkele kop).
    Geeft het aantal verkopen terug.
    """
    global _seen_news_key
    if not (config.USE_NEWS_FILTER and config.USE_NEWS_EXIT):
        return 0
    if not any(pf.in_position() for pf in ports.values()):
        return 0  # niets te beschermen -> geen werk doen

    try:
        koppen = news.fetch_headlines(limit=config.NEWS_HEADLINES_LIMIT)
    except Exception as e:
        log(f"  (nieuwswaker: koppen ophalen mislukt: {e})")
        return 0
    if not koppen:
        return 0

    # De key bevat ook WELKE munten nu een open positie hebben. Anders kan een
    # net geopende positie (tussen twee checks in, via de uur-ronde) helemaal
    # geen bescherming krijgen zolang de koppen toevallig niet wijzigen: de
    # oude key zou dan nog steeds matchen en we zouden vóór de per-munt-loop
    # al terugkeren, dus die nieuwe positie wordt nooit gescoord.
    positions_key = frozenset(sym for sym, pf in ports.items() if pf.in_position())
    key = (tuple(koppen), positions_key)
    if key == _seen_news_key:
        return 0  # zelfde nieuws EN zelfde open posities als vorige check -> niets veranderd
    _seen_news_key = key

    score, uitleg, coin_scores = sentiment.get_sentiment_per_coin(
        koppen, config.SYMBOLS)
    log_news(score, f"(nieuwswaker) {uitleg}", koppen)

    exits = 0
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for sym, pf in ports.items():
        if not pf.in_position():
            continue
        if coin_scores.get(sym, score) > config.SENTIMENT_FORCE_SELL:
            continue
        try:
            price = data.fetch_price(sym)
        except Exception as e:
            log(f"  (nieuwswaker: prijs {sym} mislukt: {e})")
            continue
        pf.sell(price, now, reason="NEWS-EXIT", tag="NEWS", meta={
            "reason_close": f"Zeer negatief nieuws (score {coin_scores.get(sym, score):+.2f}) — direct beschermend verkocht.",
            "news_sentiment": coin_scores.get(sym, score),
        })
        # Meteen opslaan — VÓÓR we het loggen/melden. Zijn er meerdere posities
        # die eruit moeten en crasht het proces halverwege, dan is deze verkoop
        # al veilig op schijf en klopt de melding met de opgeslagen stand (geen
        # "verkocht"-seintje terwijl het statusbestand de positie nog open toont).
        portfolios.save_all(config.STATE_FILE, ports)
        fill = pf.trades[-1][2]
        log(f"[{sym}] NIEUWS-VERKOOP (waker) @ {fill:,.2f} | score "
            f"{coin_scores.get(sym, score):+.2f} | {uitleg}")
        notify.send(f"🚨 {sym}: NIEUWS-VERKOOP @ {fill:,.2f} — zeer negatief "
                    f"nieuws (score {coin_scores.get(sym, score):+.2f}), niet "
                    f"gewacht op de uur-ronde (paper)")
        exits += 1

    return exits


def wait_with_news_watch(ports, seconds):
    """
    Wacht tot de volgende uur-ronde, maar word elke NEWS_WATCH_INTERVAL_SECONDS
    even wakker voor een snelle nieuwscheck. Zo reageert de bot binnen ~5
    minuten op een nieuws-crash in plaats van pas na een uur.
    """
    remaining = seconds
    while remaining > 0:
        chunk = min(remaining, config.NEWS_WATCH_INTERVAL_SECONDS)
        time.sleep(chunk)
        remaining -= chunk
        if remaining <= 0:
            break  # de gewone uur-ronde neemt het zo over
        try:
            news_protective_check(ports)
        except Exception as e:
            # De waker mag de hoofdloop NOOIT laten crashen.
            log(f"  (nieuwswaker-fout: {e} — volgende check gaat gewoon door)")


def main():
    max_cycles = int(sys.argv[1]) if len(sys.argv) > 1 else None
    interval = int(sys.argv[2]) if len(sys.argv) > 2 else config.CHECK_INTERVAL_SECONDS

    ports = portfolios.load_all(config.STATE_FILE)
    log("=" * 50)
    log(f"BOT GESTART — {len(config.SYMBOLS)} munten | paper trading (NEPGELD)")
    log(f"Munten: {', '.join(config.SYMBOLS)}")
    log(f"Interval: {interval}s | nieuwsfilter: {config.USE_NEWS_FILTER} "
        f"({config.SENTIMENT_METHOD}) | nieuwswaker: elke "
        f"{config.NEWS_WATCH_INTERVAL_SECONDS // 60} min")
    log("=" * 50)
    notify.send(f"🤖 Trading bot (her)start — {len(config.SYMBOLS)} munten, paper trading")

    ronde = 0
    try:
        while max_cycles is None or ronde < max_cycles:
            ronde += 1
            try:
                total, prices = run_cycle(ports)
                log(f"Ronde {ronde} klaar | totale waarde: {total:,.2f} USDT "
                    f"over {len(prices)}/{len(config.SYMBOLS)} munten")
            except Exception as e:
                log(f"FOUT in ronde {ronde}: {e} — door naar volgende ronde.")
            try:
                run_scheduled_jobs()   # alleen online actief (RUN_SCHEDULER=1)
            except Exception as e:
                log(f"  (planner-fout: {e} — handelen gaat gewoon door)")
            if max_cycles is None or ronde < max_cycles:
                wait_with_news_watch(ports, interval)
    except KeyboardInterrupt:
        log("Gestopt door gebruiker (Ctrl+C). Stand is opgeslagen.")
    log("BOT GESTOPT.")


if __name__ == "__main__":
    main()
