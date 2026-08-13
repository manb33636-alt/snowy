# predict.py
# ----------------------------------------------------------------------
# Een ECHTE koers-voorspeller (machine learning) MET eerlijke test.
#
# Het model (logistische regressie) probeert te voorspellen of de VOLGENDE
# candle omhoog gaat, op basis van de indicatoren. Daarna testen we het
# walk-forward (trainen op verleden, voorspellen op niet-geziene data) en
# vergelijken met "muntje opgooien" en "altijd de meest voorkomende richting".
#
# Zo zie je EERLIJK of koersvoorspelling hier echt werkt (meestal: nauwelijks).
#
# Draaien:  python predict.py
# ----------------------------------------------------------------------

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import TimeSeriesSplit

import config
import data
import strategy

FEATURES = ["rsi", "macd_hist", "ma_ratio", "ret_1", "ret_3", "ret_6", "bb_pos", "vol"]


def build_features(df):
    df = strategy.add_indicators(df.copy())
    close = df["close"]
    df["ma_ratio"] = df["ma_fast"] / df["ma_slow"] - 1
    df["ret_1"] = close.pct_change(1)
    df["ret_3"] = close.pct_change(3)
    df["ret_6"] = close.pct_change(6)
    df["bb_pos"] = (close - df["bb_mid"]) / (df["bb_upper"] - df["bb_mid"])
    df["vol"] = df["ret_1"].rolling(12).std()
    df["target"] = (close.shift(-1) > close).astype(int)  # volgende candle omhoog?
    return df.replace([np.inf, -np.inf], np.nan)


def main(limit=1000):
    print(f"Data ophalen ({limit} candles)...")
    df = build_features(data.fetch_candles(limit=limit))

    latest = df.iloc[[-1]]                      # laatste rij = voor de voorspelling
    d = df.dropna(subset=FEATURES + ["target"])  # bruikbare rijen (met bekende uitkomst)
    X, y = d[FEATURES].values, d["target"].values

    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))

    # Walk-forward nauwkeurigheid (trainen op verleden, testen op toekomst).
    accs = []
    for tr, te in TimeSeriesSplit(n_splits=5).split(X):
        model.fit(X[tr], y[tr])
        accs.append((model.predict(X[te]) == y[te]).mean())
    wf_acc = float(np.mean(accs)) * 100

    # Baselines om eerlijk mee te vergelijken.
    up_rate = float(y.mean()) * 100
    majority = max(up_rate, 100 - up_rate)  # "altijd de meest voorkomende richting"

    # Huidige voorspelling: train op alles, voorspel de volgende candle.
    model.fit(X, y)
    xlast = latest[FEATURES].values
    prob_up = None if np.isnan(xlast).any() else float(model.predict_proba(xlast)[0][1]) * 100

    print("=" * 60)
    print(f"  KOERS-VOORSPELLER — {config.SYMBOL} ({config.TIMEFRAME})")
    print("=" * 60)
    print(f"  Model: logistische regressie op {len(FEATURES)} indicatoren")
    print(f"  Eerlijk getest op {len(X)} candles (walk-forward, 5 folds)")
    print("-" * 60)
    print(f"  Nauwkeurigheid (op niet-geziene data): {wf_acc:.1f}%")
    print(f"  Muntje opgooien (willekeurig):          50.0%")
    print(f"  Altijd meest voorkomende richting:      {majority:.1f}%")
    print("-" * 60)
    if prob_up is not None:
        richting = "OMHOOG" if prob_up >= 50 else "OMLAAG"
        print(f"  Voorspelling volgende candle: {richting} ({prob_up:.0f}% kans omhoog)")
    print("=" * 60)

    edge = wf_acc - max(50.0, majority)
    if edge >= 3:
        print(f"  -> Het model doet het {edge:.1f} procentpunt beter dan de beste baseline.")
        print("     Voorzichtig interessant — maar test véél meer voor je iets gelooft.")
    else:
        print(f"  -> Het model is NIET betrouwbaar beter dan gokken (verschil {edge:+.1f} ppt).")
        print("     Dit is de eerlijke realiteit van koersvoorspelling: extreem moeilijk.")
        print("     Gebruik dit als leerinstrument, NIET om echt geld op in te zetten.")


if __name__ == "__main__":
    main()
