# optimize.py
# ----------------------------------------------------------------------
# Test in EEN keer veel verschillende instellingen op dezelfde historische
# data, en laat zien welke het in het verleden het beste deed. Ook kun je de
# strategie op meerdere munten vergelijken.
#
# Draaien:
#   python optimize.py            -> test MA-instellingen op het ingestelde paar
#   python optimize.py symbols    -> vergelijk de strategie op meerdere munten
#
# ⚠️ "Beste op het verleden" is NIET automatisch het beste in de toekomst
#    (overfitting). Gebruik dit als richting, nooit als garantie.
# ----------------------------------------------------------------------

import sys

import mpl_safe  # noqa: F401  -- werkt een macOS-font-crash om (vóór matplotlib)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

import config
import data
import strategy
import backtest

# Welke combinaties van snel/traag gemiddelde testen we?
FAST_OPTIONS = [10, 15, 20, 30]
SLOW_OPTIONS = [40, 50, 75, 100]

# Welke munten vergelijken we bij 'python optimize.py symbols'?
# Standaard alle munten die de live bot verhandelt (config.SYMBOLS).
COMPARE_SYMBOLS = config.SYMBOLS


def optimize_parameters(df, fast_options=FAST_OPTIONS, slow_options=SLOW_OPTIONS):
    """Test elke (snel, traag)-combinatie op dezelfde data. Snel = in geheugen."""
    results = []
    for fast in fast_options:
        for slow in slow_options:
            if fast >= slow:
                continue  # snel moet kleiner zijn dan traag
            d = strategy.add_indicators(df.copy(), fast_ma=fast, slow_ma=slow)
            r = backtest.run_on_dataframe(d)
            results.append({
                "fast": fast, "slow": slow,
                "profit_pct": r["profit_pct"], "bh_pct": r["bh_pct"],
                "n_trades": r["n_trades"],
            })
    results.sort(key=lambda x: x["profit_pct"], reverse=True)
    return results


def print_param_table(results):
    print(f"  {'MA-snel':>8} {'MA-traag':>9} {'Bot':>9} {'Trades':>7}")
    print("  " + "-" * 36)
    for r in results:
        print(f"  {r['fast']:>8} {r['slow']:>9} {r['profit_pct']:>+8.1f}% {r['n_trades']:>7}")


def heatmap(results, fast_options, slow_options, path="optimize_heatmap.png"):
    """Sla een kleurenkaart op: groen = goed rendement, rood = slecht."""
    grid = np.full((len(slow_options), len(fast_options)), np.nan)
    for r in results:
        i = slow_options.index(r["slow"])
        j = fast_options.index(r["fast"])
        grid[i][j] = r["profit_pct"]

    fig, ax = plt.subplots(figsize=(8, 5))
    im = ax.imshow(grid, cmap="RdYlGn", aspect="auto")
    ax.set_xticks(range(len(fast_options)))
    ax.set_xticklabels(fast_options)
    ax.set_yticks(range(len(slow_options)))
    ax.set_yticklabels(slow_options)
    ax.set_xlabel("MA snel (candles)")
    ax.set_ylabel("MA traag (candles)")
    ax.set_title(f"Bot-rendement per instelling — {config.SYMBOL} ({config.TIMEFRAME})")
    for i in range(len(slow_options)):
        for j in range(len(fast_options)):
            v = grid[i][j]
            if v == v:  # geen NaN
                ax.text(j, i, f"{v:+.0f}%", ha="center", va="center", fontsize=8)
    fig.colorbar(im, label="Bot rendement %")
    fig.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)
    return path


def compare_symbols(symbols, limit=1000):
    """Draai de HUIDIGE strategie op meerdere munten (één fetch per munt)."""
    rows = []
    for sym in symbols:
        try:
            df = data.fetch_candles(symbol=sym, limit=limit)
            df = strategy.add_indicators(df)
            r = backtest.run_on_dataframe(df)
            rows.append({"symbol": sym, "profit_pct": r["profit_pct"],
                         "bh_pct": r["bh_pct"], "n_trades": r["n_trades"]})
        except Exception as e:
            print(f"  ({sym} overgeslagen: {e})")
    return rows


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "symbols":
        print("Strategie testen op meerdere munten (kan even duren — fetch per munt)...")
        rows = compare_symbols(COMPARE_SYMBOLS)
        print(f"\n=== Strategie per munt ({config.TIMEFRAME}) ===")
        print(f"  {'Munt':>10} {'Bot':>9} {'Buy&hold':>10} {'Trades':>7}")
        print("  " + "-" * 40)
        for r in rows:
            print(f"  {r['symbol']:>10} {r['profit_pct']:>+8.1f}% "
                  f"{r['bh_pct']:>+9.1f}% {r['n_trades']:>7}")
        return

    print("Data ophalen (1x) en alle instellingen testen...")
    df = data.fetch_candles(limit=1000)
    results = optimize_parameters(df)

    print(f"\n=== Beste MA-instellingen — {config.SYMBOL} ({config.TIMEFRAME}) ===")
    print(f"  (huidige config: snel={config.FAST_MA}, traag={config.SLOW_MA})")
    print_param_table(results)
    best = results[0]
    print(f"\n  -> Beste in deze test: snel={best['fast']}, traag={best['slow']} "
          f"({best['profit_pct']:+.1f}%)")
    path = heatmap(results, FAST_OPTIONS, SLOW_OPTIONS)
    print(f"  Heatmap opgeslagen: {path}")
    print("\n  ⚠️ Beste op het verleden = NIET automatisch beste in de toekomst.")
    print("     Gebruik dit als richting, niet als garantie.")


if __name__ == "__main__":
    main()
