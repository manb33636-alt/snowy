# walkforward.py
# ----------------------------------------------------------------------
# WALK-FORWARD VALIDATIE — het eerlijkste bewijs of de strategie werkt.
#
# In plaats van één keer tunen en testen, doen we het in meerdere "folds":
#   - tune op een stuk verleden (in-sample)
#   - handel daarna op de DAAROPVOLGENDE, niet-geziene periode (out-of-sample)
#   - schuif een stuk op en herhaal
#
# Als de bot op al die niet-geziene stukken buy&hold verslaat, is dat veel
# sterker bewijs dan één losse test (het bootst na hoe je 'm echt gebruikt).
#
# Draaien:  python walkforward.py
# ----------------------------------------------------------------------

import config
import data
import strategy
import backtest
import tune


def pick_best(train_df):
    """Kies de beste robuuste instelling op het TRAIN-stuk (zoals tune.py)."""
    rows, _ = tune.search(train_df)
    active = [r for r in rows
              if r["train_n"] >= tune.MIN_TRADES_PER_SEG
              and r["test_n"] >= tune.MIN_TRADES_PER_SEG]
    if not active:
        active = [r for r in rows if r["test_n"] >= 1] or rows
    active.sort(key=lambda r: r["robust"], reverse=True)
    return active[0]


def evaluate(setting, context_df, test_len):
    """
    Pas een instelling toe op het (niet-geziene) TEST-stuk.

    Belangrijk: de indicatoren worden berekend op train+test SAMEN (context),
    zodat de test-candles vanaf dag één geldige indicatoren hebben. Zonder dit
    verliest elke fold de eerste ~SLOW_MA candles aan "opwarmen" — een derde
    van de test! Dit is GEEN vooruitkijken: voortschrijdende gemiddelden
    gebruiken alleen het verleden, dat op testmoment gewoon bekend was.
    """
    orig = (config.USE_MACD_CONFIRM, config.USE_BOLLINGER_CONFIRM,
            config.STOP_LOSS, config.TAKE_PROFIT, config.POSITION_SIZE)
    try:
        config.USE_MACD_CONFIRM = setting["macd"]
        config.USE_BOLLINGER_CONFIRM = setting["boll"]
        config.STOP_LOSS, config.TAKE_PROFIT = setting["sl"], setting["tp"]
        config.POSITION_SIZE = setting.get("ps", config.POSITION_SIZE)
        d = strategy.add_indicators(context_df.copy(),
                                    fast_ma=setting["fast"], slow_ma=setting["slow"])
        return backtest.run_on_dataframe(d.iloc[-test_len:])
    finally:
        config.USE_MACD_CONFIRM, config.USE_BOLLINGER_CONFIRM, \
            config.STOP_LOSS, config.TAKE_PROFIT, config.POSITION_SIZE = orig


def main(limit=1200, train=500, test=150, step=150):
    print(f"Data ophalen ({limit} candles, 1x)...")
    df = data.fetch_candles(limit=limit)

    folds = []
    start = 0
    while start + train + test <= len(df):
        # (train-stuk, train+test samen als context voor de indicator-opwarming)
        folds.append((df.iloc[start:start + train],
                      df.iloc[start:start + train + test]))
        start += step
    print(f"  {len(df)} candles -> {len(folds)} folds (train {train}, test {test})\n")

    print("=== Walk-forward: tune op verleden, handel op de VOLGENDE periode ===")
    print(f"  {'Fold':>4} {'gekozen instelling':>26} {'OOS bot':>9} {'buy&hold':>9} {'excess':>8}")
    print("  " + "-" * 62)

    excesses, beats = [], 0
    for i, (tr, context) in enumerate(folds, 1):
        best = pick_best(tr)
        r = evaluate(best, context, test)
        exc = r["profit_pct"] - r["bh_pct"]
        excesses.append(exc)
        beats += (exc > 0)
        conf = "+".join([x for x, on in (("MACD", best["macd"]), ("BB", best["boll"])) if on]) or "geen"
        label = f"MA{best['fast']}/{best['slow']} {conf} SL{best['sl']:.0%}TP{best['tp']:.0%}"
        print(f"  {i:>4} {label:>26} {r['profit_pct']:>+8.1f}% {r['bh_pct']:>+8.1f}% {exc:>+7.1f}%")

    print("  " + "-" * 62)
    avg = sum(excesses) / len(excesses) if excesses else 0.0
    print(f"\n  Gemiddelde OOS-excess (bot boven buy&hold): {avg:+.1f}%")
    print(f"  Versloeg buy&hold in {beats}/{len(folds)} niet-geziene periodes")
    if avg > 0 and beats >= len(folds) * 0.6:
        print("  -> ROBUUST: 'tunen dan handelen' werkt consistent op niet-geziene data.")
    elif avg > 0:
        print("  -> WISSELEND: gemiddeld positief, maar niet in elke fold. Voorzichtig positief.")
    else:
        print("  -> ZWAK: op niet-geziene data geen betrouwbaar voordeel. Wees voorzichtig.")


if __name__ == "__main__":
    main()
