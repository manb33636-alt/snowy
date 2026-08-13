# plot.py
# ----------------------------------------------------------------------
# Maakt grafieken van een backtest:
#   1) vermogenscurve: de bot vs simpelweg vasthouden (buy & hold)
#   2) de koers met groene koop- en rode verkoop-markeringen
#
# Draai met:  python plot.py   -> haalt data op, backtest, en slaat 2 PNG's op.
# ----------------------------------------------------------------------

import mpl_safe  # noqa: F401  -- werkt een macOS-font-crash om (vóór matplotlib)
import matplotlib
matplotlib.use("Agg")  # geen scherm nodig; we slaan plaatjes op als bestand
import matplotlib.pyplot as plt

import config
import data
import strategy
import backtest


def plot_results(result, prefix="backtest"):
    """Maak twee PNG-bestanden van een backtest-resultaat. Geeft de paden terug."""
    df = result["df"]
    times = df["timestamp"]

    # --- Grafiek 1: vermogenscurve (bot vs buy & hold) ---
    eq_times, eq_values = zip(*result["equity"])
    bh_curve = result["start_value"] * df["close"] / df.iloc[0]["close"]

    fig, ax = plt.subplots(figsize=(11, 5))
    ax.plot(eq_times, eq_values, label="Bot (paper)", linewidth=2, color="#1f77b4")
    ax.plot(times, bh_curve, label="Buy & hold", linewidth=1.5,
            color="#888888", linestyle="--")
    ax.axhline(result["start_value"], color="#cccccc", linewidth=1)
    ax.set_title(f"Vermogenscurve — {config.SYMBOL} ({config.TIMEFRAME})  |  "
                 f"bot {result['profit_pct']:+.1f}%  vs  buy&hold {result['bh_pct']:+.1f}%")
    ax.set_ylabel("Portefeuillewaarde (USDT)")
    ax.legend()
    ax.grid(alpha=0.3)
    equity_path = f"{prefix}_equity.png"
    fig.tight_layout()
    fig.savefig(equity_path, dpi=110)
    plt.close(fig)

    # --- Grafiek 2: koers met koop/verkoop-markeringen ---
    fig, ax = plt.subplots(figsize=(11, 5))
    ax.plot(times, df["close"], label="Koers", linewidth=1, color="#333333")
    ax.plot(times, df["ma_fast"], label=f"MA{config.FAST_MA}", linewidth=1, color="#2ca02c")
    ax.plot(times, df["ma_slow"], label=f"MA{config.SLOW_MA}", linewidth=1, color="#d62728")

    # Markeringen: groene driehoek omhoog = koop, rode omlaag = verkoop.
    # Trades zijn 4- (oud) of 5-tuple (met tag) -> lengte-tolerant indexeren.
    buys = [(t[0], t[2]) for t in result["trades"] if t[1] == "BUY"]
    sells = [(t[0], t[2]) for t in result["trades"] if t[1] != "BUY"]
    if buys:
        bt, bp = zip(*buys)
        ax.scatter(bt, bp, marker="^", s=90, color="#2ca02c", zorder=5, label="Koop")
    if sells:
        st, sp = zip(*sells)
        ax.scatter(st, sp, marker="v", s=90, color="#d62728", zorder=5, label="Verkoop")

    ax.set_title(f"Koers + handelsmomenten — {config.SYMBOL} ({config.TIMEFRAME})")
    ax.set_ylabel("Prijs (USDT)")
    ax.legend()
    ax.grid(alpha=0.3)
    price_path = f"{prefix}_price.png"
    fig.tight_layout()
    fig.savefig(price_path, dpi=110)
    plt.close(fig)

    return equity_path, price_path


def main(limit=1000):
    print("Data ophalen en backtest draaien...")
    df = data.fetch_candles(limit=limit)
    df = strategy.add_indicators(df)
    result = backtest.run_on_dataframe(df)
    eq, pr = plot_results(result)
    print(f"  Bot: {result['profit_pct']:+.1f}%  |  Buy & hold: {result['bh_pct']:+.1f}%  "
          f"|  trades: {result['n_trades']}")
    print(f"  Grafieken opgeslagen:\n    - {eq}\n    - {pr}")


if __name__ == "__main__":
    main()
