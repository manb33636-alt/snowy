# compare.py
# ----------------------------------------------------------------------
# Eerlijke KRACHTMETING tussen twee (of meer) vaste instellingen, over ALLE
# munten, walk-forward-stijl, op een LANGERE historie dan waarop een
# kandidaat ooit gekozen is (dat beperkt selectie-bias).
#
# Meet per fold de "excess" = bot-rendement MIN buy&hold. Hoger = beter.
#
# Draaien:  python compare.py
# ----------------------------------------------------------------------

import random
import time as _time

import pandas as pd

import config
import data
import strategy
import backtest

# De deelnemers aan de krachtmeting. Pas gerust aan.
SETTINGS = [
    {"name": "HUIDIG (MA10/50+MACD, TP10%)", "fast": 10, "slow": 50,
     "macd": True, "boll": False, "sl": 0.05, "tp": 0.10},
    {"name": "KANDIDAAT (MA15/40, TP8%)", "fast": 15, "slow": 40,
     "macd": False, "boll": False, "sl": 0.05, "tp": 0.08},
]

WARMUP = 100   # candles vooraf zodat de indicatoren "warm" zijn (geen NaN-gat)
TEST = 250     # candles per fold (~10 dagen op 1h)


def fetch_history(symbol, total=3000, chunk=1000):
    """
    Haal een LANGERE historie op dan één aanvraag toestaat, door te
    pagineren (meerdere aanvragen achter elkaar).
    """
    ex = data.get_exchange()
    tf_ms = 3600 * 1000  # 1 uur in milliseconden
    end = ex.milliseconds()
    since = end - total * tf_ms
    rows = []
    while since < end:
        batch = ex.fetch_ohlcv(symbol, timeframe=config.TIMEFRAME,
                               since=since, limit=chunk)
        if not batch:
            break
        rows += batch
        since = batch[-1][0] + tf_ms
        if len(batch) < chunk:
            break
        _time.sleep(ex.rateLimit / 1000)
    df = pd.DataFrame(rows, columns=["timestamp", "open", "high", "low",
                                     "close", "volume"])
    df = df.drop_duplicates("timestamp").reset_index(drop=True)
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    return df


def bootstrap_ci(values, iters=2000, lo=5, hi=95, seed=42):
    """
    90%-betrouwbaarheidsinterval voor het GEMIDDELDE via bootstrap: we loten
    steeds opnieuw folds met teruglegging en kijken hoe het gemiddelde varieert.
    Zo zien we of het verschil betrouwbaar van nul afligt, of dat nul er nog
    gewoon in past (= ruis). Vaste seed -> zelfde uitkomst bij herhaald draaien.
    """
    if not values:
        return 0.0, 0.0, 0.0
    n = len(values)
    rnd = random.Random(seed)
    means = []
    for _ in range(iters):
        s = 0.0
        for _ in range(n):
            s += values[rnd.randrange(n)]
        means.append(s / n)
    means.sort()
    point = sum(values) / n
    lo_v = means[int(lo / 100 * iters)]
    hi_v = means[min(iters - 1, int(hi / 100 * iters))]
    return point, lo_v, hi_v


def eval_setting(s, context_df, test_len):
    """Evalueer één instelling op één fold; geeft (excess%, n_trades)."""
    orig = (config.USE_MACD_CONFIRM, config.USE_BOLLINGER_CONFIRM,
            config.STOP_LOSS, config.TAKE_PROFIT)
    try:
        config.USE_MACD_CONFIRM = s["macd"]
        config.USE_BOLLINGER_CONFIRM = s["boll"]
        config.STOP_LOSS, config.TAKE_PROFIT = s["sl"], s["tp"]
        d = strategy.add_indicators(context_df.copy(),
                                    fast_ma=s["fast"], slow_ma=s["slow"])
        r = backtest.run_on_dataframe(d.iloc[-test_len:])
        return r["profit_pct"] - r["bh_pct"], r["n_trades"]
    finally:
        config.USE_MACD_CONFIRM, config.USE_BOLLINGER_CONFIRM, \
            config.STOP_LOSS, config.TAKE_PROFIT = orig


def main():
    totals = {s["name"]: [] for s in SETTINGS}
    coin_wins = {s["name"]: 0 for s in SETTINGS}
    coins_done = 0

    for sym in config.SYMBOLS:
        print(f"\n=== {sym} ===")
        try:
            df = fetch_history(sym)
        except Exception as e:
            print(f"  (overgeslagen: {e})")
            continue
        coins_done += 1
        print(f"  {len(df)} candles ({df.iloc[0]['timestamp']} -> "
              f"{df.iloc[-1]['timestamp']})")

        folds = []
        start = 0
        while start + WARMUP + TEST <= len(df):
            folds.append(df.iloc[start:start + WARMUP + TEST])
            start += TEST

        coin_mean = {}
        for s in SETTINGS:
            excs, trades = [], 0
            for ctx in folds:
                exc, n = eval_setting(s, ctx, TEST)
                excs.append(exc)
                trades += n
            mean = sum(excs) / len(excs) if excs else 0.0
            coin_mean[s["name"]] = mean
            totals[s["name"]] += excs
            print(f"  {s['name']:<30} gem. excess {mean:+6.2f}%  "
                  f"({len(folds)} folds, {trades} transacties)")
        winnaar = max(coin_mean, key=coin_mean.get)
        coin_wins[winnaar] += 1
        print(f"  -> winnaar op {sym}: {winnaar}")

    print("\n" + "=" * 62)
    print("  EINDSTAND (excess = bot boven buy&hold, per fold gemiddeld)")
    print("=" * 62)
    for s in SETTINGS:
        e = totals[s["name"]]
        mean = sum(e) / len(e) if e else 0.0
        pos = sum(1 for x in e if x > 0)
        print(f"  {s['name']:<30} gem. {mean:+6.2f}% | positief in "
              f"{pos}/{len(e)} folds | munten gewonnen: {coin_wins[s['name']]}/{coins_done}")
    print("=" * 62)

    # Paarsgewijze toets: omdat beide instellingen op EXACT dezelfde folds
    # draaiden, kunnen we per fold het verschil nemen (A minus B) en met een
    # bootstrap kijken of dat verschil betrouwbaar van nul afligt. Dit is veel
    # eerlijker dan twee losse gemiddelden naast elkaar leggen.
    if len(SETTINGS) == 2:
        a, b = SETTINGS[0]["name"], SETTINGS[1]["name"]
        ea, eb = totals[a], totals[b]
        m = min(len(ea), len(eb))
        diffs = [ea[i] - eb[i] for i in range(m)]  # per fold: A - B (zelfde fold)
        point, lo_v, hi_v = bootstrap_ci(diffs)
        print("  --- Paarsgewijze toets (zelfde folds) ---")
        print(f"  '{a}'  MIN  '{b}'")
        print(f"  Gemiddeld verschil: {point:+.2f}% per fold over {m} folds")
        print(f"  90%-interval:       [{lo_v:+.2f}%, {hi_v:+.2f}%]")
        if lo_v > 0:
            print(f"  -> '{a}' is BETROUWBAAR beter (nul valt buiten het interval).")
        elif hi_v < 0:
            print(f"  -> '{b}' is BETROUWBAAR beter (nul valt buiten het interval).")
        else:
            print("  -> Verschil is NIET betrouwbaar: nul zit in het interval = ruis.")
            print("     Niet overstappen; blijf bij de huidige instelling.")
        print("=" * 62)

    print("  ⚠️ Een kandidaat die op recente data gekozen is heeft een")
    print("     voorsprong (selectie-bias). Stap alleen over bij een DUIDELIJK")
    print("     verschil op deze langere historie, niet bij een nipte winst.")


if __name__ == "__main__":
    main()
