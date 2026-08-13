# backtest.py
# ----------------------------------------------------------------------
# BACKTEST = de strategie loslaten op ECHTE historische koersen om te
# zien of ze winst of verlies had gemaakt. Dit is de allerbelangrijkste
# stap: NOOIT live gaan voordat de backtest goed oogt.
#
# Draai met:  python backtest.py
# ----------------------------------------------------------------------

import config
import data
import strategy
from portfolio import Portfolio


def run_on_dataframe(df):
    """
    Draai de strategie op een al-opgehaalde tabel mét indicatoren.
    Print niets; geeft een resultaat-dict terug. Wordt hergebruikt door de
    optimizer (optimize.py) en de grafieken (plot.py).
    """
    pf = Portfolio()
    start_value = pf.value(df.iloc[0]["close"])

    equity = []   # (tijd, portefeuillewaarde) per candle -> voor de grafiek
    prev_row = None
    for _, row in df.iterrows():
        price = row["close"]
        time = row["timestamp"]

        # Eerst risicobeheer (stop-loss / take-profit / trailing) op de hele candle.
        if pf.check_risk(price, time, low=row["low"], high=row["high"]):
            equity.append((time, pf.value(price)))
            prev_row = row
            continue

        sig = strategy.signal_for_row(row, prev_row)
        if sig == "BUY":
            pf.buy(price, time)
        elif sig == "SELL":
            pf.sell(price, time)

        equity.append((time, pf.value(price)))
        prev_row = row

    last_price = df.iloc[-1]["close"]
    final_value = pf.value(last_price)
    buy_hold = start_value * (last_price / df.iloc[0]["close"])

    return {
        "start_value": start_value,
        "final_value": final_value,
        "buy_hold": buy_hold,
        "profit_pct": (final_value - start_value) / start_value * 100,
        "bh_pct": (buy_hold - start_value) / start_value * 100,
        "n_trades": len(pf.trades),
        "trades": pf.trades,
        "equity": equity,
        "df": df,
        "period_start": df.iloc[0]["timestamp"],
        "period_end": df.iloc[-1]["timestamp"],
    }


def run_backtest(limit=1000):
    # 1. Data ophalen en indicatoren berekenen.
    df = data.fetch_candles(limit=limit)
    df = strategy.add_indicators(df)

    # 2. Strategie draaien.
    r = run_on_dataframe(df)

    # --- Resultaten tonen ---
    print("=" * 60)
    print(f"  BACKTEST: {config.SYMBOL}  ({config.TIMEFRAME})")
    print(f"  Periode: {r['period_start']}  ->  {r['period_end']}")
    print("=" * 60)
    print(f"  Startkapitaal:        {r['start_value']:>10.2f} USDT")
    print(f"  Eindwaarde (bot):     {r['final_value']:>10.2f} USDT   ({r['profit_pct']:+.1f}%)")
    print(f"  Buy & hold (niets doen): {r['buy_hold']:>7.2f} USDT   ({r['bh_pct']:+.1f}%)")
    print(f"  Aantal trades:        {r['n_trades']:>10}")
    print("-" * 60)

    if r["trades"]:
        print("  Laatste transacties:")
        for t in r["trades"][-8:]:
            # Trades kunnen 4- (oud) of 5-tuple (met tag) zijn -> lengte-tolerant.
            time, action, price, val = t[0], t[1], t[2], t[3]
            print(f"    {time}  {action:<11} @ {price:>10.2f}   waarde: {val:.2f}")
    else:
        print("  (Geen trades -- strategie gaf geen enkel koop/verkoop-signaal.)")
    print("=" * 60)

    # Eerlijke duiding.
    if r["final_value"] > r["buy_hold"]:
        print("  -> De bot deed het BETER dan niets doen. Veelbelovend, maar")
        print("     test meer periodes voordat je conclusies trekt.")
    else:
        print("  -> De bot deed het SLECHTER dan gewoon vasthouden.")
        print("     Dat is heel normaal in het begin -- we gaan tunen.")


def _round_trips(trades):
    """
    Zelfde logica als report.round_trips(), maar dan voor de trade-lijst van
    ÉÉN backtest-run i.p.v. de live portfolio's: (netto% na kosten, koop-tag).
    """
    result = []
    buy_price, buy_tag = None, None
    for tr in trades:
        action, price = tr[1], tr[2]
        tag = tr[4] if len(tr) > 4 else None
        if action == "BUY":
            buy_price, buy_tag = price, tag
        elif buy_price is not None:
            net = (price * (1 - config.FEE)) / (buy_price * (1 + config.FEE)) - 1
            result.append((net * 100, buy_tag))
            buy_price, buy_tag = None, None
    return result


def _max_drawdown(equity):
    """Grootste dip (piek-naar-dal, in %) over de eigen equity-curve van de backtest."""
    if len(equity) < 2:
        return 0.0
    peak, mdd = equity[0][1], 0.0
    for _, v in equity:
        peak = max(peak, v)
        if peak > 0:
            mdd = max(mdd, (peak - v) / peak * 100)
    return mdd


def run_backtest_period(symbol, days, timeframe=None):
    """
    Test de ECHTE strategie (dezelfde code als de live bot) over de laatste
    `days` dagen echte historische koersen. Geen verzonnen data — als het
    ophalen mislukt, gooit dit gewoon een fout in plaats van iets te verzinnen.
    """
    timeframe = timeframe or config.TIMEFRAME
    df = data.fetch_candles_range(symbol, timeframe, days)
    df = strategy.add_indicators(df)
    if len(df) < 30:
        raise ValueError(
            f"Te weinig candles ({len(df)}) voor een betrouwbare backtest van {symbol} "
            f"over deze periode — probeer een langere periode.")

    r = run_on_dataframe(df)
    rts = _round_trips(r["trades"])
    rets = [net for net, _tag in rts]
    wins = [x for x in rets if x > 0]
    losses = [x for x in rets if x <= 0]

    win_rate = (len(wins) / len(rets) * 100) if rets else None
    avg_win = (sum(wins) / len(wins)) if wins else None
    avg_loss = (sum(losses) / len(losses)) if losses else None
    biggest_win = max(rets) if rets else None
    biggest_loss = min(rets) if rets else None
    gross_win = sum(wins) if wins else 0.0
    gross_loss = abs(sum(losses)) if losses else 0.0
    profit_factor = (gross_win / gross_loss) if gross_loss > 0 else (None if gross_win == 0 else float("inf"))

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "days": days,
        "period_start": str(r["period_start"]),
        "period_end": str(r["period_end"]),
        "n_candles": len(df),
        "start_value": round(r["start_value"], 2),
        "final_value": round(r["final_value"], 2),
        "profit_pct": round(r["profit_pct"], 2),
        "buy_hold_pct": round(r["bh_pct"], 2),
        "vs_buy_hold": round(r["profit_pct"] - r["bh_pct"], 2),
        "n_trades": r["n_trades"],
        "n_round_trips": len(rets),
        "win_rate": round(win_rate, 1) if win_rate is not None else None,
        "avg_win_pct": round(avg_win, 2) if avg_win is not None else None,
        "avg_loss_pct": round(avg_loss, 2) if avg_loss is not None else None,
        "biggest_win_pct": round(biggest_win, 2) if biggest_win is not None else None,
        "biggest_loss_pct": round(biggest_loss, 2) if biggest_loss is not None else None,
        "profit_factor": round(profit_factor, 2) if isinstance(profit_factor, float) and profit_factor != float("inf") else profit_factor,
        "max_drawdown_pct": round(_max_drawdown(r["equity"]), 2),
        "equity": [{"time": str(t), "value": round(v, 2)} for t, v in r["equity"][::max(1, len(r["equity"]) // 300)]],
    }


if __name__ == "__main__":
    run_backtest()
