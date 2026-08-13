# validate_coins.py
# ----------------------------------------------------------------------
# Draait een WALK-FORWARD validatie (tune op verleden -> handel op de
# volgende, niet-geziene periode) voor ELKE munt in config.SYMBOLS. Zo zie
# je zwart-op-wit op welke munten de strategie robuust is en op welke niet —
# belangrijk vóór je een nieuwe munt vertrouwt.
#
# Geeft per munt de gemiddelde out-of-sample excess (bot boven buy&hold) en
# hoe vaak de bot buy&hold versloeg. Aan het eind een oordeel per munt.
#
# Draaien:  python validate_coins.py
# ----------------------------------------------------------------------

import config
import data
import walkforward


def validate_symbol(sym, limit=1200, train=500, test=150, step=150):
    """Walk-forward op één munt; geeft (gem_excess, beats, n_folds) of None."""
    try:
        df = data.fetch_candles(symbol=sym, limit=limit)
    except Exception as e:
        print(f"  {sym}: data ophalen mislukt ({e})")
        return None

    folds = []
    start = 0
    while start + train + test <= len(df):
        folds.append((df.iloc[start:start + train],
                      df.iloc[start:start + train + test]))
        start += step
    if not folds:
        print(f"  {sym}: te weinig data ({len(df)} candles)")
        return None

    excesses, beats = [], 0
    for tr, context in folds:
        best = walkforward.pick_best(tr)
        r = walkforward.evaluate(best, context, test)
        exc = r["profit_pct"] - r["bh_pct"]
        excesses.append(exc)
        beats += (exc > 0)
    avg = sum(excesses) / len(excesses)
    return avg, beats, len(folds)


def verdict(avg, beats, n):
    if avg > 0 and beats >= n * 0.6:
        return "🟢 ROBUUST"
    if avg > 0:
        return "🟡 WISSELEND"
    return "🔴 ZWAK"


def main():
    print("=" * 68)
    print("  WALK-FORWARD VALIDATIE PER MUNT (tune op verleden, handel daarna)")
    print("=" * 68)
    print(f"  {'Munt':<10} {'gem. OOS-excess':>16} {'versloeg B&H':>14} {'oordeel':>12}")
    print("  " + "-" * 64)

    results = {}
    for sym in config.SYMBOLS:
        out = validate_symbol(sym)
        if out is None:
            continue
        avg, beats, n = out
        results[sym] = out
        print(f"  {sym.split('/')[0]:<10} {avg:>+15.1f}% {beats:>8}/{n:<5} "
              f"{verdict(avg, beats, n):>12}")

    print("  " + "-" * 64)
    robust = [s for s, (a, b, n) in results.items() if a > 0 and b >= n * 0.6]
    weak = [s for s, (a, b, n) in results.items() if a <= 0]
    print(f"\n  Robuust op {len(robust)}/{len(results)} munten: "
          f"{', '.join(s.split('/')[0] for s in robust) or 'geen'}")
    if weak:
        print(f"  ⚠️  Zwak (geen betrouwbaar voordeel): "
              f"{', '.join(s.split('/')[0] for s in weak)}")
        print("     Overweeg deze munten uit SYMBOLS te halen, of accepteer dat")
        print("     de strategie daar (nog) niet werkt.")
    print("=" * 68)
    print("  Let op: dit is historisch bewijs, geen garantie voor de toekomst.")


if __name__ == "__main__":
    main()
