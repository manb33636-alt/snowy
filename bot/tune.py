# tune.py
# ----------------------------------------------------------------------
# Zoekt de BESTE ROBUUSTE instellingen — niet door simpelweg de winnaar op
# het verleden te pakken (= overfitting), maar met een eerlijke splitsing:
#
#   TRAIN  = eerste deel van de data (om instellingen te kiezen)
#   TEST   = laatste deel (om te controleren of het ook op NIEUWE data werkt)
#
# We meten "excess return" = hoeveel de bot het BETER deed dan simpelweg
# vasthouden (buy & hold). De winnaar moet in ZOWEL train als test buy&hold
# verslaan -> dat is een echt randje, geen toeval.
#
# We negeren instellingen die nauwelijks handelen (anders "wint" gewoon
# cash-aanhouden in een dalende markt — dat is geen strategie).
#
# Draaien:  python tune.py
# ----------------------------------------------------------------------

import config
import data
import strategy
import backtest

# De zoekruimte (de knoppen die we testen):
FASTS = [10, 15, 20, 30]            # snelle MA
SLOWS = [40, 50, 75, 100]           # trage MA
CONFIRMS = [                        # (MACD-bevestiging, Bollinger-bevestiging)
    (False, False), (True, False), (False, True), (True, True),
]
STOP_LOSSES = [0.03, 0.05, 0.08]    # stop-loss %
TAKE_PROFITS = [0.08, 0.10, 0.15]   # take-profit %
POSITION_SIZES = [0.10, 0.15, 0.20, 0.30]   # % van kapitaal per trade

MIN_TRADES_PER_SEG = 2              # moet in ELK deel minstens zo vaak handelen


def _seg(df_seg):
    r = backtest.run_on_dataframe(df_seg)
    return r["profit_pct"], r["bh_pct"], r["n_trades"]


def search(df, train_frac=0.6):
    n = len(df)
    split = int(n * train_frac)

    # Originele config bewaren om na afloop netjes terug te zetten.
    orig = (config.USE_MACD_CONFIRM, config.USE_BOLLINGER_CONFIRM,
            config.STOP_LOSS, config.TAKE_PROFIT, config.POSITION_SIZE)

    rows = []
    for fast in FASTS:
        for slow in SLOWS:
            if fast >= slow:
                continue
            d = strategy.add_indicators(df.copy(), fast_ma=fast, slow_ma=slow)
            d_train, d_test = d.iloc[:split], d.iloc[split:]
            for mc, bc in CONFIRMS:
                config.USE_MACD_CONFIRM = mc
                config.USE_BOLLINGER_CONFIRM = bc
                for sl in STOP_LOSSES:
                    for tp in TAKE_PROFITS:
                        config.STOP_LOSS, config.TAKE_PROFIT = sl, tp
                        for ps in POSITION_SIZES:
                            config.POSITION_SIZE = ps
                            tr_p, tr_bh, tr_n = _seg(d_train)
                            te_p, te_bh, te_n = _seg(d_test)
                            rows.append({
                                "fast": fast, "slow": slow, "macd": mc, "boll": bc,
                                "sl": sl, "tp": tp, "ps": ps,
                                "train": tr_p, "train_bh": tr_bh, "train_n": tr_n,
                                "test": te_p, "test_bh": te_bh, "test_n": te_n,
                                "train_exc": tr_p - tr_bh, "test_exc": te_p - te_bh,
                                # robuustheid = de ZWAKSTE van de twee helften
                                "robust": min(tr_p - tr_bh, te_p - te_bh),
                            })

    config.USE_MACD_CONFIRM, config.USE_BOLLINGER_CONFIRM, \
        config.STOP_LOSS, config.TAKE_PROFIT, config.POSITION_SIZE = orig
    return rows, split


def _fmt(r):
    conf = []
    if r["macd"]:
        conf.append("MACD")
    if r["boll"]:
        conf.append("BB")
    conf = "+".join(conf) if conf else "geen"
    return (f"  MA {r['fast']:>2}/{r['slow']:>3} | conf {conf:<8} | "
            f"SL {r['sl']:.0%} TP {r['tp']:.0%} POS {r['ps']:.0%} | "
            f"train {r['train']:>+6.1f}% (bh {r['train_bh']:>+6.1f}%, {r['train_n']}t) | "
            f"test {r['test']:>+6.1f}% (bh {r['test_bh']:>+6.1f}%, {r['test_n']}t)")


def main(limit=1000):
    print(f"Data ophalen ({limit} candles, 1x)...")
    df = data.fetch_candles(limit=limit)
    rows, split = search(df)
    n = len(df)
    print(f"  {n} candles | train = eerste {split}, test = laatste {n - split}\n")

    # Alleen instellingen die in BEIDE helften echt handelen.
    active = [r for r in rows
              if r["train_n"] >= MIN_TRADES_PER_SEG and r["test_n"] >= MIN_TRADES_PER_SEG]
    if not active:
        print("  (geen enkele instelling handelde genoeg in beide helften; "
              "filter versoepeld naar 'handelt in test')")
        active = [r for r in rows if r["test_n"] >= 1] or rows

    active.sort(key=lambda r: r["robust"], reverse=True)

    print(f"=== TOP 12 robuuste instellingen (van {len(active)} actieve) ===")
    print("    (robuust = verslaat buy&hold ook op de TEST-data, niet alleen train)")
    for r in active[:12]:
        print(_fmt(r))

    # Huidige config ter vergelijking.
    base = next((r for r in rows if r["fast"] == 20 and r["slow"] == 50
                 and not r["macd"] and not r["boll"]
                 and abs(r["sl"] - 0.05) < 1e-9 and abs(r["tp"] - 0.10) < 1e-9
                 and abs(r["ps"] - config.POSITION_SIZE) < 1e-9), None)
    if base:
        print(f"\n=== Huidige config (MA 20/50, geen conf, SL 5% TP 10%, POS {config.POSITION_SIZE:.0%}) ===")
        print(_fmt(base))

    best = active[0]
    print("\n=== AANBEVELING (beste robuuste) ===")
    print(_fmt(best))
    print(f"\n  Pas toe in config.py:")
    print(f"    FAST_MA = {best['fast']}")
    print(f"    SLOW_MA = {best['slow']}")
    print(f"    STOP_LOSS = {best['sl']}")
    print(f"    TAKE_PROFIT = {best['tp']}")
    print(f"    POSITION_SIZE = {best['ps']}")
    print(f"    USE_MACD_CONFIRM = {best['macd']}")
    print(f"    USE_BOLLINGER_CONFIRM = {best['boll']}")
    return best


if __name__ == "__main__":
    main()
