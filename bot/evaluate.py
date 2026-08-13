# evaluate.py
# ----------------------------------------------------------------------
# EINDBEOORDELING: kan de bot (na een tijd paper-draaien) overwogen worden
# voor echt geld? Streng en eerlijk — na kosten, vs de markt, over alle munten,
# MET drawdown (grootste dip) en gemiddeld netto-rendement per trade.
#
#   python evaluate.py         -> toon het oordeel op het scherm
#   python evaluate.py send    -> stuur het ook naar Telegram
#
# Draait automatisch wekelijks (maandag 09:30) via launchd.
# ----------------------------------------------------------------------

import json
import os
import sys

import config
import data
import notify
import portfolios
import report  # hergebruikt aggregate_winrate / trigger_breakdown / heartbeat / BASELINE_FILE

MIN_TRADES = 20     # min. afgeronde trades voor een betrouwbaar oordeel
MIN_EVENTS = 10     # min. ONAFHANKELIJKE instapmomenten (munten kopen vaak samen)


def max_drawdown():
    """Grootste dip in de totale waarde (uit equity_history.jsonl), in %."""
    if not os.path.exists(config.EQUITY_FILE):
        return None
    vals = []
    with open(config.EQUITY_FILE) as f:
        for line in f:
            try:
                vals.append(float(json.loads(line)["total"]))
            except Exception:
                pass
    if len(vals) < 2:
        return None
    peak, mdd = vals[0], 0.0
    for v in vals:
        peak = max(peak, v)
        if peak > 0:
            mdd = max(mdd, (peak - v) / peak * 100)
    return mdd


def entry_events(ports):
    """Aantal ONAFHANKELIJKE instapmomenten (koop-uren, over munten heen geteld)."""
    hours = set()
    for pf in ports.values():
        for tr in pf.trades:
            if tr[1] == "BUY":
                hours.add(str(tr[0])[:13])  # "YYYY-MM-DD HH"
    return len(hours)


def main():
    ports = portfolios.load_all(config.STATE_FILE)

    prices, per_coin, skipped = {}, [], []
    for sym in config.SYMBOLS:
        try:
            price = float(data.fetch_candles(symbol=sym, limit=5).iloc[-1]["close"])
        except Exception as e:
            print(f"  ({sym} overgeslagen: {e})")
            skipped.append(sym.split("/")[0])
            continue
        prices[sym] = price
        pnl_pct = (ports[sym].value(price) - config.START_CASH) / config.START_CASH * 100
        per_coin.append((sym, pnl_pct))

    total_value = sum(ports[s].value(prices[s]) for s in prices)
    total_start = config.START_CASH * len(prices)
    total_pnl_pct = (total_value - total_start) / total_start * 100 if total_start else 0.0
    win_rate, n_round, mean_net = report.aggregate_winrate(ports)
    win_rate = win_rate or 0.0
    mean_net = mean_net if mean_net is not None else 0.0
    n_events = entry_events(ports)
    mdd = max_drawdown()

    # Bot vs markt PER MUNT (robuust als SYMBOLS later verandert).
    bot_since, market_since = total_pnl_pct, None
    if os.path.exists(report.BASELINE_FILE):
        base = json.load(open(report.BASELINE_FILE))
        common = [s for s in prices if s in base.get("prices", {})]
        if common:
            base_vals = base.get("values", {})
            missing_vals = [s for s in common if s not in base_vals]
            if missing_vals:
                # Zelfde landmijn als in report.py: oude baseline-entries zonder
                # 'values' vallen anders stil terug op START_CASH als deler,
                # wat bot_since (en dus het go/no-go-oordeel) scheeftrekt.
                # evaluate.py schrijft baseline.json niet zelf weg (dat doet
                # report.py); hier alleen in-memory bijvullen zodat dít oordeel
                # klopt, en het zichtbaar maken i.p.v. stil laten gebeuren.
                print(f"  (baseline mist 'values' voor {missing_vals}; "
                      f"gebruik huidige waarde als schatting ipv START_CASH — "
                      f"draai report.py om dit permanent te patchen)")
                base_vals = dict(base_vals)
                base_vals.update({s: ports[s].value(prices[s]) for s in missing_vals})
            bot_since = sum(
                (ports[s].value(prices[s]) / base_vals.get(s, config.START_CASH) - 1) * 100
                for s in common) / len(common)
            market_since = sum((prices[s] / base["prices"][s] - 1) * 100
                               for s in common) / len(common)
    margin = (bot_since - market_since) if market_since is not None else None
    winners = sum(1 for (_, p) in per_coin if p > 0)

    # --- Streng oordeel ---
    if n_round < MIN_TRADES or n_events < MIN_EVENTS:
        verdict = "⏳ TE VROEG"
        detail = (f"pas {n_round} afgeronde trades / {n_events} instapmomenten "
                  f"(min {MIN_TRADES} / {MIN_EVENTS})")
    else:
        reasons = []
        if total_pnl_pct <= 0:
            reasons.append("geen winst na kosten")
        if mean_net <= 0:
            reasons.append(f"gem. trade verliest na kosten ({mean_net:+.2f}%)")
        if margin is not None and margin < config.EVAL_MIN_MARGIN:
            reasons.append(f"verslaat de markt niet met {config.EVAL_MIN_MARGIN:.0f}pp "
                           f"(nu {margin:+.1f}pp)")
        if mdd is not None and mdd > config.EVAL_MAX_DRAWDOWN:
            reasons.append(f"te grote dip ({mdd:.0f}% > {config.EVAL_MAX_DRAWDOWN:.0f}%)")
        if not reasons:
            verdict, detail = "🟢 VOORZICHTIG GROEN", "voldoet aan alle minimale criteria"
        else:
            verdict, detail = "🔴 NOG NIET", "; ".join(reasons)

    # --- Console ---
    print("=" * 60)
    print("  BEOORDELING — kan de bot voor het echt?")
    print("=" * 60)
    print(f"  Totale waarde:      {total_value:,.2f} USDT ({total_pnl_pct:+.1f}%, NA kosten)")
    print(f"  Afgeronde trades:   {n_round}  ({n_events} onafh. instapmomenten)")
    print(f"  Gem. per trade:     {mean_net:+.2f}%   |  win-rate: {win_rate:.0f}% (info)")
    if margin is not None:
        print(f"  Bot vs markt:       {bot_since:+.1f}% vs {market_since:+.1f}% "
              f"(verschil {margin:+.1f}pp)")
    if mdd is not None:
        print(f"  Grootste dip:       {mdd:.1f}%")
    print(f"  Winstgevende munten: {winners}/{len(per_coin)}  "
          f"(info — de munten zijn sterk gecorreleerd, dus zwak bewijs)")
    print("-" * 60)
    print(f"  {verdict} — {detail}")
    if verdict.startswith("🟢"):
        print("     Overweeg een KLEINE echt-geld test (alleen wat je kunt missen).")
        print("     Geen garantie; blijf streng monitoren.")
    elif verdict.startswith("🔴"):
        print("     Blijf op paper trading. Begin NIET met echt geld.")
    else:
        print("     Te weinig om iets te bewijzen. Laat langer draaien.")
    print("=" * 60)

    # --- Telegram ---
    if "send" in sys.argv:
        lines = []
        hb = report.heartbeat_warning()
        if hb:
            lines.append(hb)
        lines += [
            "📋 Weekbeoordeling — bot voor echt?",
            f"Waarde: {total_value:,.0f} USDT ({total_pnl_pct:+.1f}%, na kosten)",
            f"Afgerond: {n_round} trades ({n_events} instapmomenten) | gem. {mean_net:+.2f}%/trade",
        ]
        if margin is not None:
            lines.append(f"Bot {bot_since:+.1f}% vs markt {market_since:+.1f}% ({margin:+.1f}pp)")
        if mdd is not None:
            lines.append(f"Grootste dip: {mdd:.1f}%")
        if skipped:
            lines.append(f"⚠️ {len(skipped)} munt(en) niet opgehaald ({', '.join(skipped)})")
        lines.append(f"Oordeel: {verdict}")
        if detail:
            lines.append(detail)
        notify.send("\n".join(lines))
        print("\n  (weekbeoordeling naar Telegram gestuurd)")


if __name__ == "__main__":
    main()
