# retune.py
# ----------------------------------------------------------------------
# Draait automatisch (via launchd, zie install_schedule.sh) en doet 3 dingen:
#   1. Bekijkt hoe de live paper-bot het tot nu toe doet.
#   2. Hertunet op VERSE data met train/test-splitsing (zoals tune.py).
#   3. Geeft alleen een seintje als er een ROBUUST betere instelling is
#      (geen ruis najagen) — past zelf NIETS aan, jij beslist.
#
# Alles wordt weggeschreven naar retune_report.txt en (indien ingesteld)
# als Telegram-melding verstuurd.
#
# Handmatig draaien:  python retune.py
# ----------------------------------------------------------------------

import json
import os
from datetime import datetime

import config
import data
import strategy
import backtest
import tune
import notify

# Hoeveel beter (in procentpunten "robuustheid") moet een nieuwe instelling
# zijn voordat we er een seintje over geven? Hoog genoeg om ruis te negeren.
IMPROVEMENT_THRESHOLD = 3.0

# Een instelling die op ÉÉN dag beter lijkt, is vaak toeval (de data schuift
# elke dag op). We sturen pas een seintje als DEZELFDE betere instelling zich
# op meerdere opeenvolgende dagen bewijst. Dit voorkomt vals alarm.
NOMINATION_FILE = config.NOMINATION_FILE
CONSECUTIVE_REQUIRED = 3


def _load_nomination():
    try:
        with open(NOMINATION_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save_nomination(d):
    try:
        with open(NOMINATION_FILE, "w") as f:
            json.dump(d, f)
    except Exception:
        pass


def _next_streak(nom, best_key_list, today):
    """
    Bepaal de nieuwe teller-stand voor een kandidaat-instelling.
      - Zelfde kandidaat als vorige keer: ophogen, maar alleen op een NIEUWE dag
        (een handmatige her-run op dezelfde dag telt niet dubbel).
      - Andere (of eerste) kandidaat: teller op 1.
    """
    if nom.get("key") == best_key_list:
        return nom.get("streak", 1) + (1 if nom.get("date") != today else 0)
    return 1


def review_live_bot():
    """Bekijk de live multi-coin bot: aantal munten, posities en trades."""
    import portfolios
    if not os.path.exists(config.STATE_FILE):
        return "  Live-bot: nog geen stand gevonden (draait hij?)."
    try:
        ports = portfolios.load_all(config.STATE_FILE)
        n_trades = sum(len(pf.trades) for pf in ports.values())
        n_pos = sum(1 for pf in ports.values() if pf.in_position())
        return (f"  Live-bot: {len(ports)} munten | {n_pos} in markt | "
                f"{n_trades} trades totaal")
    except Exception as e:
        return f"  Live-bot: stand niet leesbaar ({e})."


def current_config_row(rows):
    """Zoek de rij die overeenkomt met de HUIDIGE config-instellingen."""
    for r in rows:
        if (r["fast"] == config.FAST_MA and r["slow"] == config.SLOW_MA
                and r["macd"] == config.USE_MACD_CONFIRM
                and r["boll"] == config.USE_BOLLINGER_CONFIRM
                and abs(r["sl"] - config.STOP_LOSS) < 1e-9
                and abs(r["tp"] - config.TAKE_PROFIT) < 1e-9
                and abs(r["ps"] - config.POSITION_SIZE) < 1e-9):
            return r
    return None


def main(limit=1000):
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [f"===== HERTUNE {stamp} — getest op alle munten ====="]

    # 1. Live-bot bekijken.
    lines.append(review_live_bot())

    # 2. Hertunen op ELKE munt die de bot verhandelt. De config geldt immers
    #    voor alle munten — dus een aanbeveling moet op de meerderheid kloppen,
    #    niet alleen op BTC.
    per_setting = {}   # instelling -> {"setting": ..., "robusts": [...], "beats": n}
    cur_robusts = []
    tested = []
    for sym in config.SYMBOLS:
        try:
            df = data.fetch_candles(symbol=sym, limit=limit)
        except Exception as e:
            lines.append(f"  ({sym} overgeslagen: {e})")
            continue
        rows, _ = tune.search(df)
        tested.append(sym)
        cur = current_config_row(rows)
        cur_r = cur["robust"] if cur else None
        if cur_r is not None:
            cur_robusts.append(cur_r)
        for r in rows:
            if (r["train_n"] < tune.MIN_TRADES_PER_SEG
                    or r["test_n"] < tune.MIN_TRADES_PER_SEG):
                continue
            key = (r["fast"], r["slow"], r["macd"], r["boll"], r["sl"], r["tp"], r["ps"])
            e = per_setting.setdefault(key, {"setting": r, "robusts": [], "beats": 0})
            e["robusts"].append(r["robust"])
            if cur_r is not None and r["robust"] > cur_r:
                e["beats"] += 1

    if not tested:
        lines.append("  Geen koersdata opgehaald — hertune overgeslagen deze run.")
        report = "\n".join(lines) + "\n"
        print(report)
        with open(config.RETUNE_REPORT, "a") as f:
            f.write(report + "\n")
        return

    majority = len(tested) // 2 + 1
    cur_mean = sum(cur_robusts) / len(cur_robusts) if cur_robusts else None
    if cur_mean is not None:
        lines.append(f"  Huidige config (MA {config.FAST_MA}/{config.SLOW_MA}, "
                     f"MACD={config.USE_MACD_CONFIRM}): gem. robuustheid "
                     f"{cur_mean:+.1f} over {len(cur_robusts)}/{len(tested)} munten")

    # Beste instelling = hoogste GEMIDDELDE robuustheid, mits actief op een
    # meerderheid van de munten.
    candidates = [e for e in per_setting.values() if len(e["robusts"]) >= majority]
    best = max(candidates, key=lambda e: sum(e["robusts"]) / len(e["robusts"])) \
        if candidates else None

    improved = False
    if best is not None:
        s = best["setting"]
        best_mean = sum(best["robusts"]) / len(best["robusts"])
        conf = "+".join([x for x, on in (("MACD", s["macd"]), ("BB", s["boll"])) if on]) or "geen"
        lines.append(f"  Beste over munten: MA {s['fast']}/{s['slow']} | conf {conf} | "
                     f"SL {s['sl']:.0%} TP {s['tp']:.0%} POS {s['ps']:.0%} | gem. robuustheid "
                     f"{best_mean:+.1f} | beter dan huidig op {best['beats']}/{len(tested)} munten")

        # 3. Alleen seintje bij een ECHTE verbetering: duidelijk hoger gemiddelde
        #    ÉN beter op een meerderheid van de munten ÉN een andere instelling.
        cur_key = (config.FAST_MA, config.SLOW_MA, config.USE_MACD_CONFIRM,
                   config.USE_BOLLINGER_CONFIRM, config.STOP_LOSS, config.TAKE_PROFIT,
                   config.POSITION_SIZE)
        best_key = (s["fast"], s["slow"], s["macd"], s["boll"], s["sl"], s["tp"], s["ps"])
        improved = (cur_mean is not None
                    and best_mean - cur_mean >= IMPROVEMENT_THRESHOLD
                    and best["beats"] >= majority
                    and best_key != cur_key)

    # 4. Debounce: tel hoe vaak DEZELFDE betere instelling zich op rij bewijst.
    #    Pas na CONSECUTIVE_REQUIRED opeenvolgende dagen sturen we een seintje.
    today = datetime.now().strftime("%Y-%m-%d")
    nom = _load_nomination()
    if improved:
        best_key_list = list(best_key)
        streak = _next_streak(nom, best_key_list, today)
        _save_nomination({"key": best_key_list, "streak": streak, "date": today})

        if streak >= CONSECUTIVE_REQUIRED:
            msg = (f"💡 Trading bot: betere instelling BEVESTIGD op {streak} "
                   f"opeenvolgende dagen (getest op {len(tested)} munten)! "
                   f"MA {s['fast']}/{s['slow']}, conf {conf}, "
                   f"SL {s['sl']:.0%} TP {s['tp']:.0%} POS {s['ps']:.0%} — gem. robuustheid "
                   f"{best_mean:+.1f} vs huidig {cur_mean:+.1f}, beter op "
                   f"{best['beats']}/{len(tested)} munten. "
                   f"Check retune_report.txt en pas het zelf aan als je wilt.")
            lines.append(f"  >>> VERBETERING BEVESTIGD ({streak}x op rij) — seintje verstuurd.")
            notify.send(msg)
        else:
            lines.append(f"  >>> Mogelijke verbetering (dag {streak}/{CONSECUTIVE_REQUIRED}) "
                         f"— wacht op bevestiging voordat ik een seintje stuur.")
    else:
        # De nominatie is verbroken: reset de teller (niet meer beter vandaag).
        if nom:
            _save_nomination({})
        lines.append("  >>> Huidige config is nog steeds goed (geen wijziging nodig).")

    report = "\n".join(lines) + "\n"
    print(report)
    with open(config.RETUNE_REPORT, "a") as f:
        f.write(report + "\n")


if __name__ == "__main__":
    main()
