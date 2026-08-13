# test_bot.py
# ----------------------------------------------------------------------
# De TESTSUITE van de bot. Controleert de belangrijkste logica zonder het
# netwerk op te gaan en zonder je echte bestanden aan te raken (alles draait
# in een tijdelijke map met nep-data).
#
# Draaien:  python test_bot.py
# Klaar als er "0 gefaald" staat.
# ----------------------------------------------------------------------

import os
import sys
import json
import tempfile
from datetime import datetime, timedelta

TMP = tempfile.mkdtemp(prefix="bottest_")

import config
config.STATE_FILE = os.path.join(TMP, "state.json")
config.LOG_FILE = os.path.join(TMP, "trades.log")
config.NEWS_LOG_FILE = os.path.join(TMP, "news.txt")
config.EQUITY_FILE = os.path.join(TMP, "equity.jsonl")

import pandas as pd
import data
import news
import notify
import advisor
import sentiment
import strategy
import report
import evaluate
import live
import portfolios
from portfolio import Portfolio

ok, fail = 0, 0


def check(name, cond):
    global ok, fail
    ok += bool(cond)
    fail += (not cond)
    print(f"  {'✅' if cond else '❌'} {name}")


def flat_df(price=100.0, n=60, low=None):
    """Vlakke nep-candles; optioneel één candle met een lage koers (stop-test)."""
    base = datetime(2026, 6, 1)
    rows = []
    for i in range(n):
        lo = low if (low is not None and i == n - 4) else price
        rows.append([base + timedelta(hours=i), price, price + 0.5, lo, price, 10.0])
    return pd.DataFrame(rows, columns=["timestamp", "open", "high", "low",
                                       "close", "volume"])


# Netwerk/meldingen uitschakelen voor alle tests.
notify.send = lambda m: None
news.fetch_headlines = lambda limit=25: []
data.fetch_candles = lambda symbol=None, limit=200: flat_df()
live.btc_regime_up = lambda: True   # regime standaard OK; apart getest

print("--- portemonnee: kosten, tags, opslaan/laden ---")
pf = Portfolio(cash=1000.0)
pf.buy(100.0, "t0", tag="NEWS")
check("koop schrijft tag mee", pf.trades[-1][4] == "NEWS")
check("koop rekent kosten+slippage (minder coins dan 10)", pf.coins < 10.0)
pf.sell(110.0, "t1", tag="TECH")
check("verkoop sluit positie", not pf.in_position())
pf2 = Portfolio.from_dict(pf.to_dict())
check("opslaan/laden behoudt trades", len(pf2.trades) == 2)
old = Portfolio.from_dict({"cash": 1000, "coins": 0, "trades": [
    ["t", "BUY", 100.0, 1000.0]]})           # oud 4-tuple formaat
check("oud formaat (zonder tag) laadt zonder crash", len(old.trades) == 1)

pf3 = Portfolio(cash=1000.0)
pf3.buy(100.0, "t0")
pf3.check_risk(100.0, "t1", low=94.0, high=101.0)   # -6% -> stop-loss
check("stop-loss vuurt op de laagste koers", pf3.trades[-1][1] == "STOP-LOSS")
check("risico-verkoop krijgt tag RISK", pf3.trades[-1][4] == "RISK")

print("\n--- beslisregels (advisor) ---")
check("techniek koopt bij groen licht",
      advisor.decide("BUY", 0.0, False, True)[0] == "BUY")
check("te negatief nieuws blokkeert de koop (veto)",
      advisor.decide("BUY", -0.5, False, True)[0] == "HOLD")
check("verkoopsignaal gaat vóór positief nieuws",
      advisor.decide("SELL", 0.9, True, True)[0] == "SELL")
check("zeer slecht nieuws stapt uit de markt",
      advisor.decide("HOLD", -0.7, True, True)[0] == "SELL")
check("sterk nieuws koopt NIET tegen een dalende trend in",
      advisor.decide("HOLD", 0.7, False, False)[0] == "HOLD")

print("\n--- nieuws-analyse ---")
s, _ = sentiment.keyword_sentiment(["Major exchange hacked"])
check("crisiswoord (hack) telt dubbel", abs(s - (-0.4)) < 1e-9)
check("'not bullish' wordt negatief",
      sentiment.keyword_sentiment(["market is not bullish"])[0] < 0)
check("één los woord blijft gedempt (geen paniek)",
      abs(sentiment.keyword_sentiment(["prices drop"])[0]) <= 0.2 + 1e-9)
# Contrasterend nieuws: goed voor BTC, slecht voor DOGE. (Met álleen BTC-nieuws
# zou het marktsentiment gelijk zijn aan het BTC-sentiment — dan is er terecht
# geen verschil; het verschil hoort te ontstaan bij tegengesteld nieuws.)
sentiment._pc_last_key = None
_, _, per = sentiment.get_sentiment_per_coin(
    ["Bitcoin surges to record high", "Dogecoin plunges amid fraud lawsuit"],
    ["BTC/USDT", "DOGE/USDT"])
check("munt met eigen goed nieuws scoort hoger dan munt met eigen slecht nieuws",
      per["BTC/USDT"] > per["DOGE/USDT"])
check("munt met eigen slecht nieuws zakt onder nul", per["DOGE/USDT"] < 0)

print("\n--- inhaalslag: gemiste stop na slaap ---")
df_stop = flat_df(low=90.0)          # candle n-4 breekt de 5%-stop
data.fetch_candles = lambda symbol=None, limit=200: df_stop
config.SYMBOLS = ["BTC/USDT"]
p = Portfolio(cash=0.0)
p.coins, p.entry_price, p.high_since_entry = 10.0, 100.0, 100.0
p.last_ts = str(df_stop.iloc[-6]["timestamp"])      # loopt achter -> inhaalslag
ports = {"BTC/USDT": p}
live.run_cycle(ports)
check("gemiste stop-loss vuurt alsnog", not p.in_position()
      and p.trades[-1][1] == "STOP-LOSS")
check("stop vult rond het juiste niveau (~95)", abs(p.trades[-1][2] - 95.0) < 0.5)
data.fetch_candles = lambda symbol=None, limit=200: flat_df()

print("\n--- correlatie-limiet + beste kandidaat wint ---")
syms = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"]
config.SYMBOLS = syms
config.USE_NEWS_FILTER = False
config.MAX_OPEN_POSITIONS = 2
advisor.decide = lambda *a, **k: ("BUY", "forced", "TECH")
# Geef elke munt een ander sentiment; de twee STERKSTE horen te winnen.
scores = {"BTC/USDT": 0.1, "ETH/USDT": 0.9, "SOL/USDT": 0.2,
          "BNB/USDT": 0.8, "XRP/USDT": 0.3}
_orig_gspc = sentiment.get_sentiment_per_coin
sentiment.get_sentiment_per_coin = lambda h, s: (0.0, "test", scores)
config.USE_NEWS_FILTER = True
news.fetch_headlines = lambda limit=25: ["dummy kop"]
ports = {s: Portfolio(cash=1000.0) for s in syms}
for s in syms:
    ports[s].last_ts = "2026-06-02 00:00:00"
live.run_cycle(ports)
inpos = [s for s in syms if ports[s].in_position()]
check("niet meer dan de limiet gekocht", len(inpos) == 2)
check("de 2 STERKSTE kandidaten wonnen (ETH+BNB, niet de config-volgorde)",
      sorted(inpos) == ["BNB/USDT", "ETH/USDT"])

print("\n--- BTC-regime-filter ---")
live.btc_regime_up = lambda: False        # BTC daalt -> niets kopen
ports = {s: Portfolio(cash=1000.0) for s in syms}
for s in syms:
    ports[s].last_ts = "2026-06-02 00:00:00"
live.run_cycle(ports)
check("BTC-trend omlaag -> geen enkele aankoop",
      not any(ports[s].in_position() for s in syms))
live.btc_regime_up = lambda: True
advisor.decide = advisor.decide  # herstel hieronder
sentiment.get_sentiment_per_coin = _orig_gspc

print("\n--- nieuwswaker: beschermverkoop ---")
config.USE_NEWS_FILTER = True
config.SYMBOLS = ["BTC/USDT"]
p = Portfolio(cash=0.0)
p.coins, p.entry_price, p.high_since_entry = 0.01, 60000.0, 60000.0
ports = {"BTC/USDT": p}
news.fetch_headlines = lambda limit=25: [
    "Bitcoin crashes as exchange hacked", "Bitcoin bankruptcy fears spark selloff",
    "Bitcoin plunges amid fraud lawsuit and fear"]
data.fetch_price = lambda sym: 58000.0
live._seen_news_key = None
n = live.news_protective_check(ports)
check("waker verkoopt bij rampnieuws", n == 1 and not p.in_position())
check("waker-verkoop heet NEWS-EXIT", p.trades[-1][1] == "NEWS-EXIT")
live._seen_news_key = None
news.fetch_headlines = lambda limit=25: ["Markets trade quietly today"]
p2 = Portfolio(cash=0.0)
p2.coins, p2.entry_price = 0.01, 60000.0
check("waker verkoopt NIET bij mild nieuws",
      live.news_protective_check({"BTC/USDT": p2}) == 0 and p2.in_position())

print("\n--- rapport & beoordeling ---")
pa = Portfolio(cash=1000.0)
pa.trades = [("t0", "BUY", 100.0, 1000.0, "TECH"),
             ("t1", "SELL", 120.0, 1200.0, "TECH")]
wr, n_round, mean = report.aggregate_winrate({"X": pa})
check("win-rate + gemiddelde per trade berekend",
      wr == 100.0 and n_round == 1 and mean > 0)
check("NEWS-EXIT telt ook als afgeronde trade",
      len(report.round_trips({"Y": Portfolio.from_dict({
          "cash": 0, "coins": 0, "trades": [
              ["t0", "BUY", 100, 1000, "TECH"],
              ["t1", "NEWS-EXIT", 90, 900, "NEWS"]]})})) == 1)
with open(config.EQUITY_FILE, "w") as f:
    for v in [1000, 1100, 900, 1050]:
        f.write(json.dumps({"date": "d", "total": v}) + "\n")
check("grootste dip (drawdown) klopt: 1100 -> 900 = 18.2%",
      abs(evaluate.max_drawdown() - 18.181818) < 0.01)
pe = Portfolio(cash=0.0)
pe.trades = [("2026-07-01 10:00:00", "BUY", 1, 1, "TECH")]
pe2 = Portfolio(cash=0.0)
pe2.trades = [("2026-07-01 10:00:00", "BUY", 1, 1, "TECH")]   # zelfde uur
check("gecorreleerde instap op hetzelfde uur telt 1x",
      evaluate.entry_events({"A": pe, "B": pe2}) == 1)

print("\n--- online: blijvende opslag (DATA_DIR) ---")
check("DATA_DIR standaard = projectmap (lokaal onveranderd)",
      config.data_path("x.json") in ("./x.json", "x.json")
      or config.DATA_DIR == ".")
check("paden staan centraal in config (voor een volume online)",
      all(hasattr(config, n) for n in
          ("STATE_FILE", "BASELINE_FILE", "EQUITY_FILE", "REPORT_LOG",
           "NOMINATION_FILE", "SCHEDULE_STATE")))
check("report gebruikt het centrale baseline-pad",
      report.BASELINE_FILE == config.BASELINE_FILE)

print("\n--- online: ingebouwde planner ---")
config.SCHEDULE_STATE = os.path.join(TMP, "sched.json")
gestart = []
live.subprocess.Popen = lambda *a, **k: gestart.append(a[0][1])
os.environ.pop("RUN_SCHEDULER", None)
check("planner staat UIT op je Mac (launchd doet het daar)",
      live.run_scheduled_jobs(datetime(2026, 7, 16, 8, 30)) == [])

os.environ["RUN_SCHEDULER"] = "1"
laat = datetime(2026, 7, 16, 21, 0)      # donderdag 21:00
namen = live.run_scheduled_jobs(laat)
check("online draait de planner de taken van vandaag",
      set(namen) == {"analyse", "hertune", "rapport"})
check("maandag-taak draait NIET op donderdag", "beoordeling" not in namen)
check("tweede keer dezelfde dag -> niets dubbel",
      live.run_scheduled_jobs(laat) == [])

def _wis_planner_stand():
    """Doe alsof de planner vandaag nog niets deed."""
    if os.path.exists(config.SCHEDULE_STATE):
        os.remove(config.SCHEDULE_STATE)


_wis_planner_stand()
vroeg = datetime(2026, 7, 16, 7, 0)      # vóór 08:00
check("taak van 08:00 start nog niet om 07:00",
      live.run_scheduled_jobs(vroeg) == [])

_wis_planner_stand()
maandag = datetime(2026, 7, 20, 10, 0)   # maandag ná 09:30
check("weekbeoordeling draait wél op maandag",
      "beoordeling" in live.run_scheduled_jobs(maandag))
os.environ.pop("RUN_SCHEDULER", None)

print("\n--- dashboard-API: momentopname van de echte stand ---")
import dashboard_api
# Zet een nep-portefeuille + logregel klaar in de tempmap.
ports_d = {s: Portfolio(cash=1000.0) for s in
           ["BTC/USDT", "ETH/USDT", "DOGE/USDT"]}
ports_d["BTC/USDT"].buy(60000.0, "2026-07-01 10:00:00", tag="TECH")
ports_d["BTC/USDT"].sell(66000.0, "2026-07-01 15:00:00", tag="TECH")
config.SYMBOLS = ["BTC/USDT", "ETH/USDT", "DOGE/USDT"]
portfolios.save_all(config.STATE_FILE, ports_d)
with open(config.LOG_FILE, "w") as f:
    f.write("[2026-07-01 16:00:00] [BTC/USDT] WACHT | koers 66,000.00\n")
    f.write("[2026-07-01 16:00:00] [ETH/USDT] WACHT | koers 1,800.00\n")
    f.write("[2026-07-01 16:00:00] [DOGE/USDT] WACHT | koers 0.07\n")
    f.write("[2026-07-01 16:00:05] Ronde 1 klaar | totale waarde: 3,000.00 USDT\n")
snap = dashboard_api.build_snapshot()
check("snapshot heeft alle hoofdsecties",
      all(k in snap for k in ("overview", "coins", "trades", "equity",
                              "evaluation", "market_types", "triggers")))
check("prijs uit het logboek geparsed (BTC 66000)",
      next(c["price"] for c in snap["coins"] if c["short"] == "BTC") == 66000.0)
check("komma-getallen correct geparsed (geen 66 ipv 66000)",
      snap["coins"][0]["price"] > 1000)
check("afgeronde trade zit in de evaluatie", snap["evaluation"]["n_round"] == 1)
check("go/no-go begint bij TE VROEG (te weinig trades)",
      snap["evaluation"]["verdict"].startswith("⏳"))
check("laatste-ronde-tijd uit het logboek", snap["updated"] == "2026-07-01 16:00:05")
check("trades staan nieuwste eerst",
      len(snap["trades"]) == 2 and snap["trades"][0]["action"] == "SELL")

print("\n" + "=" * 52)
print(f"  RESULTAAT: {ok} geslaagd, {fail} gefaald")
print("=" * 52)
sys.exit(1 if fail else 0)
