# report.py
# ----------------------------------------------------------------------
# Stuurt een VOORTGANGSRAPPORT (Telegram + scherm + report_log.txt) over ALLE
# munten: totale waarde + winst/verlies, per munt de prestatie, aantal trades,
# win-percentage, en bot vs. de markt sinds we begonnen te meten.
#
# Handmatig:  python report.py
# Automatisch: elke avond 20:00 via launchd (zie install_schedule.sh).
# ----------------------------------------------------------------------

import json
import os
import re
from datetime import datetime

import config
import data
import notify
import portfolios

# Paden staan centraal in config (zodat ze online naar een blijvende schijf
# kunnen wijzen via DATA_DIR, i.p.v. bij elke update gewist te worden).
BASELINE_FILE = config.BASELINE_FILE
REPORT_LOG = config.REPORT_LOG


def latest_news_sentiment():
    """Lees de laatst gemeten nieuws-score uit news_log.txt (indien aanwezig)."""
    if not os.path.exists(config.NEWS_LOG_FILE):
        return None
    try:
        with open(config.NEWS_LOG_FILE) as f:
            for line in reversed(f.read().splitlines()):
                m = re.search(r"sentiment ([+-]?\d+\.\d+)", line)
                if m:
                    return float(m.group(1))
    except Exception:
        pass
    return None


def round_trips(ports):
    """
    Alle AFGERONDE trades als (netto_rendement%, koop-tag, prijs-regime, meta),
    NA kosten (fee bij koop én verkoop). Werkt met 4-, 5- en 6-tuple trades
    (tag is het 5e element, meta het 6e -- beide optioneel voor oudere data).

    prijs-regime: "ticker" als de verkoop een NEWS-EXIT was (die vult op een
    LIVE koers via data.fetch_price, midden in een candle), anders "candle"
    (alle andere verkopen vullen op de slot-/hoog-/laagkoers van een candle).
    Zo kan de statistiek eerlijk melden dat sommige trades met een andere
    prijsbron gemeten zijn, i.p.v. ze stil door elkaar te husselen.

    `meta` in het resultaat is de meta van de KOOP (voor "welke indicatoren/
    confidence bij instap voorspelden succes") samen met de meta van de
    VERKOOP samengevoegd onder aparte sleutels, zodat je ook de sluitreden hebt.
    """
    result = []
    for pf in ports.values():
        buy_price, buy_tag, buy_meta = None, None, None
        for tr in pf.trades:
            action, price = tr[1], tr[2]
            tag = tr[4] if len(tr) > 4 else None
            meta = tr[5] if len(tr) > 5 else None
            if action == "BUY":
                buy_price, buy_tag, buy_meta = price, tag, meta
            elif buy_price is not None:  # elke niet-BUY sluit de positie
                net = (price * (1 - config.FEE)) / (buy_price * (1 + config.FEE)) - 1
                regime = "ticker" if action == "NEWS-EXIT" else "candle"
                combined_meta = dict(buy_meta or {})
                if meta:
                    combined_meta["sell_reason_close"] = meta.get("reason_close")
                result.append((net * 100, buy_tag, regime, combined_meta))
                buy_price, buy_tag, buy_meta = None, None, None
    return result


def aggregate_winrate(ports):
    """Win% én gemiddeld netto-rendement over alle afgeronde trades (na kosten)."""
    rts = round_trips(ports)
    if not rts:
        return None, 0, None
    rets = [r for r, *_ in rts]   # tolerant: 2- of 3-tuple round-trips
    win_rate = sum(1 for r in rets if r > 0) / len(rets) * 100
    mean_net = sum(rets) / len(rets)
    return win_rate, len(rets), mean_net


def trigger_breakdown(ports):
    """
    Per koop-reden (TECH / NEWS / TECH+NEWS): (aantal, gem. netto%, win%,
    aantal_ticker_geprijsd). Het laatste getal maakt zichtbaar hoeveel trades
    in die groep op een LIVE koers (NEWS-EXIT) zijn afgesloten i.p.v. op een
    candle — zodat je weet dat die niet 1-op-1 met de rest te vergelijken zijn.
    """
    from collections import defaultdict
    groups = defaultdict(list)
    ticker = defaultdict(int)
    for net, tag, regime, _meta in round_trips(ports):
        key = tag or "?"
        groups[key].append(net)
        if regime == "ticker":
            ticker[key] += 1
    return {tag: (len(r), sum(r) / len(r), sum(1 for x in r if x > 0) / len(r) * 100,
                  ticker[tag])
            for tag, r in groups.items()}


def win_loss_breakdown(ports):
    """Gemiddelde winst apart van gemiddeld verlies (i.p.v. één gemengd getal)."""
    rets = [r for r, *_ in round_trips(ports)]
    wins = [r for r in rets if r > 0]
    losses = [r for r in rets if r <= 0]
    avg_win = sum(wins) / len(wins) if wins else None
    avg_loss = sum(losses) / len(losses) if losses else None
    return avg_win, avg_loss, len(wins), len(losses)


def best_worst_strategy(ports):
    """
    'Strategie' = koop-trigger (TECH / NEWS / TECH+NEWS). Geeft de beste en de
    slechtste terug als (tag, gem_netto%, n) — of None als er te weinig data is
    (minstens 2 trades in die groep, anders is één toevalstreffer geen 'beste').
    """
    breakdown = {k: v for k, v in trigger_breakdown(ports).items() if v[0] >= 2}
    if not breakdown:
        return None, None
    ranked = sorted(breakdown.items(), key=lambda kv: kv[1][1], reverse=True)
    best = (ranked[0][0], ranked[0][1][1], ranked[0][1][0])
    worst = (ranked[-1][0], ranked[-1][1][1], ranked[-1][1][0])
    return best, worst


def indicator_success(ports):
    """
    Welke indicator-conditie bij INSTAP hing het meest samen met een
    winnende trade? Kijkt naar de indicator-snapshot die bij elke koop wordt
    opgeslagen (strategy.indicator_snapshot). Alleen trades MET die snapshot
    tellen mee -- oudere trades zonder meta worden overgeslagen, nooit geraden.
    Geeft een dict {conditie_naam: (n, gem_netto%, win%)} terug, aflopend
    gesorteerd op gemiddeld rendement.
    """
    from collections import defaultdict
    buckets = defaultdict(list)
    for net, _tag, _regime, meta in round_trips(ports):
        ind = (meta or {}).get("indicators")
        if not ind:
            continue
        rsi = ind.get("rsi")
        macd_hist = ind.get("macd_hist")
        ma_fast, ma_slow = ind.get("ma_fast"), ind.get("ma_slow")
        if rsi is not None:
            buckets["RSI < 40 bij instap (oversold-zone)" if rsi < 40 else
                     "RSI > 60 bij instap" if rsi > 60 else
                     "RSI neutraal (40-60) bij instap"].append(net)
        if macd_hist is not None:
            buckets["MACD-histogram positief bij instap"
                    if macd_hist > 0 else "MACD-histogram negatief bij instap"].append(net)
        if ma_fast is not None and ma_slow not in (None, 0):
            gap = abs(ma_fast - ma_slow) / abs(ma_slow) * 100
            buckets["Sterke MA-kruising (>1% verschil)" if gap > 1
                    else "Zwakke MA-kruising (<1% verschil)"].append(net)
    result = {name: (len(vals), sum(vals) / len(vals),
                     sum(1 for v in vals if v > 0) / len(vals) * 100)
              for name, vals in buckets.items() if len(vals) >= 2}
    return dict(sorted(result.items(), key=lambda kv: kv[1][1], reverse=True))


def confidence_success(ports):
    """
    Hield een hogere confidence-score bij instap ook echt beter stand?
    Groepeert afgeronde trades in confidence-bakken (<50 / 50-70 / 70-85 / 85+).
    """
    from collections import defaultdict
    buckets = defaultdict(list)
    for net, _tag, _regime, meta in round_trips(ports):
        conf = (meta or {}).get("confidence")
        if conf is None:
            continue
        bucket = "< 50 (laag)" if conf < 50 else "50-70 (gemiddeld)" if conf < 70 \
            else "70-85 (hoog)" if conf < 85 else "85+ (zeer hoog)"
        buckets[bucket].append(net)
    return {b: (len(v), sum(v) / len(v), sum(1 for x in v if x > 0) / len(v) * 100)
            for b, v in buckets.items() if v}


def heartbeat_warning():
    """Geef een waarschuwing terug als de live-bot te lang geen ronde draaide."""
    if not os.path.exists(config.LOG_FILE):
        return None
    try:
        with open(config.LOG_FILE) as f:
            for line in reversed(f.read().splitlines()):
                m = re.match(r"\[(.*?)\].*Ronde \d+ klaar", line)
                if m:
                    last = datetime.strptime(m.group(1), "%Y-%m-%d %H:%M:%S")
                    hours = (datetime.now() - last).total_seconds() / 3600
                    if hours > 3:
                        return (f"⚠️ LIVE-BOT LIJKT GESTOPT — laatste ronde {hours:.0f}u "
                                f"geleden (check ./bot.sh status)")
                    return None
    except Exception:
        pass
    return None


def main():
    ports = portfolios.load_all(config.STATE_FILE)

    # 1. Huidige prijzen + waarde per munt.
    prices, per_coin, skipped = {}, [], []
    for sym in config.SYMBOLS:
        try:
            df = data.fetch_candles(symbol=sym, limit=30)
            price = float(df.iloc[-1]["close"])
        except Exception as e:
            print(f"  ({sym} overgeslagen: {e})")
            skipped.append(sym.split("/")[0])
            continue
        prices[sym] = price
        pf = ports[sym]
        value = pf.value(price)
        pnl_pct = (value - config.START_CASH) / config.START_CASH * 100
        per_coin.append((sym, value, pnl_pct, pf.in_position(), len(pf.trades)))

    total_value = sum(v for (_, v, _, _, _) in per_coin)
    total_start = config.START_CASH * len(per_coin)
    total_pnl = total_value - total_start
    total_pnl_pct = (total_pnl / total_start * 100) if total_start else 0.0

    # 2. Bot vs markt (gelijk gewogen) sinds de baseline.
    #    PER MUNT vergelijken (robuust als je later munten toevoegt/weghaalt).
    btc_hold = None   # benchmark: had je gewoon BTC vastgehouden?
    if os.path.exists(BASELINE_FILE):
        with open(BASELINE_FILE) as f:
            base = json.load(f)
        # Oude baselines (vóór de per-munt 'values' uitbreiding) missen 'values'
        # voor munten die toen al bestonden. Zonder backfill valt de deler stil
        # terug op START_CASH i.p.v. de echte portefeuillewaarde bij baseline-
        # datum, wat bot_since scheeftrekt. Vul ontbrekende entries nu bij
        # (beste beschikbare schatting: waarde nu) en meld dit expliciet.
        missing_vals = [s for s in prices
                        if s in base.get("prices", {}) and s not in base.get("values", {})]
        if missing_vals:
            print(f"  (baseline mist 'values' voor {missing_vals}; nu bijgevuld "
                  f"met huidige waarde ipv START_CASH — bot_since voor deze "
                  f"munten was tot nu toe scheefgetrokken)")
            base.setdefault("values", {}).update(
                {s: ports[s].value(prices[s]) for s in missing_vals})
            with open(BASELINE_FILE, "w") as f:
                json.dump(base, f)

        common = [s for s in prices if s in base.get("prices", {})]
        if common:
            base_vals = base.get("values", {})  # portefeuillewaarde per munt bij baseline
            bot_since = sum(
                (ports[s].value(prices[s]) / base_vals.get(s, config.START_CASH) - 1) * 100
                for s in common) / len(common)
            market_since = sum((prices[s] / base["prices"][s] - 1) * 100
                               for s in common) / len(common)
            analyse = (f"Sinds {base['date'][:10]}: bot {bot_since:+.1f}% vs "
                       f"markt {market_since:+.1f}% (verschil {bot_since - market_since:+.1f}%)")
            # Simpelste eerlijke lat: gewoon Bitcoin kopen en vasthouden.
            if "BTC/USDT" in prices and "BTC/USDT" in base["prices"]:
                btc_hold = (prices["BTC/USDT"] / base["prices"]["BTC/USDT"] - 1) * 100
        else:
            analyse = "Baseline mist overlappende munten (verwijder baseline.json om te resetten)."
        # Nieuwe munten die nog niet in de baseline staan: nu toevoegen, zodat
        # ze vanaf vandaag meetellen (i.p.v. voor altijd buiten de meting vallen).
        nieuw = [s for s in prices if s not in base.get("prices", {})]
        if nieuw:
            base.setdefault("prices", {}).update({s: prices[s] for s in nieuw})
            base.setdefault("values", {}).update(
                {s: ports[s].value(prices[s]) for s in nieuw})
            with open(BASELINE_FILE, "w") as f:
                json.dump(base, f)
    elif prices:
        with open(BASELINE_FILE, "w") as f:
            json.dump({"date": datetime.now().isoformat(), "prices": prices,
                       "values": {s: ports[s].value(prices[s]) for s in prices}}, f)
        analyse = "Baseline ingesteld — vanaf nu vergelijk ik bot vs markt."
    else:
        # Alle koers-aanvragen faalden: GEEN lege baseline wegschrijven (die zou
        # de bot-vs-markt-meting voorgoed uitschakelen). Volgende run opnieuw.
        analyse = "Baseline uitgesteld — geen prijzen opgehaald deze run."

    # 3. Bericht opbouwen.
    win_rate, n_round, mean_net = aggregate_winrate(ports)
    sent = latest_news_sentiment()
    stamp = datetime.now().strftime("%d-%m %H:%M")
    in_markt = sum(1 for c in per_coin if c[3])

    lines = []
    hb = heartbeat_warning()
    if hb:
        lines.append(hb)
    lines += [
        f"📊 Trading bot — rapport {stamp}",
        f"Totaal: {total_value:,.0f} USDT ({total_pnl:+,.0f} / {total_pnl_pct:+.1f}%)",
        f"{len(per_coin)} munten | {in_markt} in markt | "
        f"{sum(c[4] for c in per_coin)} transacties",
    ]
    if skipped:
        lines.append(f"⚠️ {len(skipped)} munt(en) niet opgehaald ({', '.join(skipped)}) "
                     f"— totalen gaan alleen over de overige {len(per_coin)}")
    if n_round > 0:
        lines.append(f"Afgeronde trades: {n_round} | win (na kosten): {win_rate:.0f}% | "
                     f"gem. {mean_net:+.2f}%/trade")
        avg_win, avg_loss, n_win, n_loss = win_loss_breakdown(ports)
        if avg_win is not None or avg_loss is not None:
            lines.append(f"   Gem. winst: {('+%.2f%%' % avg_win) if avg_win is not None else '—'} "
                         f"({n_win}x) | Gem. verlies: "
                         f"{('%.2f%%' % avg_loss) if avg_loss is not None else '—'} ({n_loss}x)")
        # Nieuws vs techniek: verdient de nieuws-laag zijn plek? (dit antwoordt
        # ook meteen "welke nieuwssoort was de beste voorspeller": NEWS/TECH+NEWS
        # vergeleken met pure TECH.)
        for tag, (n, mn, wr, nt) in sorted(trigger_breakdown(ports).items()):
            extra = f" ({nt} op live koers)" if nt else ""
            lines.append(f"   {tag}: {n} trades, gem. {mn:+.2f}%, win {wr:.0f}%{extra}")

        best, worst = best_worst_strategy(ports)
        if best and worst and best[0] != worst[0]:
            lines.append(f"   🏆 Beste strategie: {best[0]} ({best[1]:+.2f}% gem., {best[2]} trades) "
                         f"| 🥶 Slechtste: {worst[0]} ({worst[1]:+.2f}% gem., {worst[2]} trades)")

        ind_succ = indicator_success(ports)
        if ind_succ:
            lines.append("   — meest succesvolle instap-condities —")
            for naam, (n, mn, wr) in list(ind_succ.items())[:4]:
                lines.append(f"      {naam}: {mn:+.2f}% gem. ({n}x, win {wr:.0f}%)")

        conf_succ = confidence_success(ports)
        if len(conf_succ) > 1:
            lines.append("   — confidence-score vs. resultaat —")
            volgorde = ["< 50 (laag)", "50-70 (gemiddeld)", "70-85 (hoog)", "85+ (zeer hoog)"]
            for b in volgorde:
                if b in conf_succ:
                    n, mn, wr = conf_succ[b]
                    lines.append(f"      {b}: {mn:+.2f}% gem. ({n}x, win {wr:.0f}%)")
    lines.append("— per munt —")
    for (sym, _v, pnl_pct, inpos, ntr) in sorted(per_coin, key=lambda c: c[2], reverse=True):
        flag = "🟢" if inpos else "⚪"
        lines.append(f"{flag} {sym.split('/')[0]}: {pnl_pct:+.1f}% ({ntr} transacties)")

    # Per markt-type: waar werkt de strategie het beste? (large-cap / smart-
    # contract / betaling / meme). Zo zie je meer dan alleen losse munten.
    from collections import defaultdict
    by_type = defaultdict(list)
    for (sym, _v, pnl_pct, _inpos, _ntr) in per_coin:
        by_type[config.MARKET_TYPES.get(sym, "overig")].append(pnl_pct)
    if len(by_type) > 1:
        lines.append("— per markt-type —")
        for mtype, pnls in sorted(by_type.items(),
                                  key=lambda kv: sum(kv[1]) / len(kv[1]), reverse=True):
            gem = sum(pnls) / len(pnls)
            lines.append(f"   {mtype}: {gem:+.1f}% gem. ({len(pnls)} munten)")

    if sent is not None:
        lines.append(f"Nieuws-sentiment: {sent:+.2f}")
    lines.append(analyse)
    # Benchmark: versloeg de bot 'gewoon Bitcoin vasthouden'?
    if btc_hold is not None:
        verschil = total_pnl_pct - btc_hold
        oordeel = "bot wint" if verschil > 0 else "BTC-hold wint"
        lines.append(f"Benchmark: bot {total_pnl_pct:+.1f}% vs BTC-vasthouden "
                     f"{btc_hold:+.1f}% ({oordeel}, {verschil:+.1f}pp)")

    msg = "\n".join(lines)
    print(msg)
    notify.send(msg)
    with open(REPORT_LOG, "a") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]\n{msg}\n\n")


if __name__ == "__main__":
    main()
