# dashboard_api.py
# ----------------------------------------------------------------------
# Een kleine, ingebouwde webserver die de ECHTE stand van de bot als een
# webpagina toont (het "Snowy Tracks"-dashboard). Gebruikt alleen Python zelf
# (geen extra installatie) en HERGEBRUIKT je bestaande, geteste code
# (report.py / evaluate.py), zodat de cijfers exact kloppen met je rapporten.
#
# Draaien:
#   python dashboard_api.py            -> http://localhost:8000
#   python dashboard_api.py 8080       -> op een andere poort
#
# Dit LEEST alleen de bot-bestanden (portefeuille, logboek, historie) — het
# handelt zelf niet en verandert niets. Veilig om naast de live-bot te draaien.
# ----------------------------------------------------------------------

import json
import os
import re
import sys
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import config
import portfolios
import report
import evaluate
import backtest

HERE = os.path.dirname(os.path.abspath(__file__))

# Nette namen per munt (voor het dashboard).
COIN_NAMES = {
    "BTC/USDT": "Bitcoin", "ETH/USDT": "Ethereum", "SOL/USDT": "Solana",
    "BNB/USDT": "BNB", "XRP/USDT": "XRP", "ADA/USDT": "Cardano",
    "DOGE/USDT": "Dogecoin", "AVAX/USDT": "Avalanche", "LINK/USDT": "Chainlink",
    "LTC/USDT": "Litecoin",
}


def last_prices_from_log():
    """
    Haal de LAATST GEZIENE koers per munt uit trades.log. De live-bot logt elke
    ronde de koers ('koers 123.45' of '@ 123.45'); zo hebben we een prijs zonder
    zelf het internet op te moeten (snel en werkt altijd).
    """
    prices, last_round = {}, None
    if not os.path.exists(config.LOG_FILE):
        return prices, last_round
    pat = re.compile(r"\[(.*?)\] \[([A-Z0-9]+/[A-Z0-9]+)\].*?(?:koers|@) "
                     r"([\d,]+\.?\d*)")
    round_pat = re.compile(r"\[(.*?)\].*Ronde \d+ klaar")
    try:
        with open(config.LOG_FILE) as f:
            for line in f:
                m = pat.search(line)
                if m:
                    prices[m.group(2)] = float(m.group(3).replace(",", ""))
                rm = round_pat.match(line)
                if rm:
                    last_round = rm.group(1)
    except Exception:
        pass
    return prices, last_round


def equity_series():
    """Dagelijkse totale waarde uit equity_history.jsonl (voor de grafiek)."""
    out = []
    if not os.path.exists(config.EQUITY_FILE):
        return out
    try:
        with open(config.EQUITY_FILE) as f:
            for line in f:
                try:
                    d = json.loads(line)
                    out.append({"date": d.get("date"), "total": float(d["total"])})
                except Exception:
                    pass
    except Exception:
        pass
    return out


def _baseline_compare(ports, prices):
    """Bot vs markt + BTC-vasthouden sinds de baseline (zoals report.py)."""
    result = {"bot_since": None, "market_since": None, "margin": None,
              "btc_hold": None, "since": None}
    if not os.path.exists(report.BASELINE_FILE):
        return result
    try:
        base = json.load(open(report.BASELINE_FILE))
    except Exception:
        return result
    common = [s for s in prices if s in base.get("prices", {})]
    if not common:
        return result
    base_vals = base.get("values", {})
    bot = sum((ports[s].value(prices[s]) / base_vals.get(s, config.START_CASH) - 1) * 100
              for s in common) / len(common)
    markt = sum((prices[s] / base["prices"][s] - 1) * 100 for s in common) / len(common)
    result.update(bot_since=round(bot, 2), market_since=round(markt, 2),
                  margin=round(bot - markt, 2), since=base.get("date", "")[:10])
    if "BTC/USDT" in prices and "BTC/USDT" in base["prices"]:
        result["btc_hold"] = round(
            (prices["BTC/USDT"] / base["prices"]["BTC/USDT"] - 1) * 100, 2)
    return result


def parse_news_log(limit=6):
    """
    Lees de laatste `limit` metingen uit news_log.txt: tijdstip, sentiment,
    vertrouwen (indien vermeld) en de echte krantenkoppen die bij die meting
    hoorden. Nieuwste eerst. Geeft [] terug als het bestand niet bestaat of
    leeg is — er wordt nooit iets verzonnen.
    """
    path = getattr(config, "NEWS_LOG_FILE", "news_log.txt")
    if not os.path.exists(path):
        return []
    header_re = re.compile(
        r"^\[(?P<time>[^\]]+)\]\s+sentiment\s+(?P<sent>[+-]?\d+\.\d+)\s*\|\s*(?P<detail>.+)$")
    conf_re = re.compile(r"vertrouwen\s+(\d+)%")

    blocks = []
    current = None
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            for raw in f:
                line = raw.rstrip("\n")
                m = header_re.match(line)
                if m:
                    if current:
                        blocks.append(current)
                    conf_m = conf_re.search(m.group("detail"))
                    current = {
                        "time": m.group("time"),
                        "sentiment": float(m.group("sent")),
                        "confidence": int(conf_m.group(1)) if conf_m else None,
                        "headlines": [],
                    }
                elif current is not None and line.strip().startswith("-"):
                    headline = line.strip().lstrip("-").strip()
                    if headline:
                        current["headlines"].append(headline)
        if current:
            blocks.append(current)
    except Exception:
        return []

    return list(reversed(blocks[-limit:]))


def build_snapshot():
    """Bouw één JSON-momentopname van de echte bot-stand."""
    ports = portfolios.load_all(config.STATE_FILE)
    prices, last_round = last_prices_from_log()

    # Per munt.
    coins, total_value, total_start = [], 0.0, 0.0
    for sym in config.SYMBOLS:
        pf = ports.get(sym)
        if pf is None:
            continue
        price = prices.get(sym)
        # Zonder positie is de koers niet nodig voor de waarde (alleen cash).
        value = pf.value(price) if price is not None else (
            pf.cash if not pf.in_position() else None)
        pnl_pct = ((value - config.START_CASH) / config.START_CASH * 100
                   if value is not None else None)
        if value is not None:
            total_value += value
            total_start += config.START_CASH
        coins.append({
            "symbol": sym, "short": sym.split("/")[0],
            "name": COIN_NAMES.get(sym, sym.split("/")[0]),
            "price": price, "value": round(value, 2) if value is not None else None,
            "pnl_pct": round(pnl_pct, 2) if pnl_pct is not None else None,
            "in_position": pf.in_position(), "n_trades": len(pf.trades),
            "market_type": config.MARKET_TYPES.get(sym, "overig"),
        })

    total_pnl_pct = ((total_value - total_start) / total_start * 100
                     if total_start else 0.0)

    # Trades (alle munten samen, nieuwste eerst).
    trades = []
    for sym, pf in ports.items():
        for t in pf.trades:
            meta = t[5] if len(t) > 5 else None
            trades.append({
                "time": str(t[0]), "symbol": sym.split("/")[0], "action": t[1],
                "price": t[2], "value": t[3],
                "tag": t[4] if len(t) > 4 else None,
                "confidence": (meta or {}).get("confidence"),
                "reason": (meta or {}).get("reason_open") or (meta or {}).get("reason_close"),
                "news_sentiment": (meta or {}).get("news_sentiment"),
                "indicators": (meta or {}).get("indicators"),
            })
    trades.sort(key=lambda x: x["time"], reverse=True)

    # Metingen (hergebruik van de bestaande, geteste bot-code).
    win_rate, n_round, mean_net = report.aggregate_winrate(ports)
    # trigger_breakdown geeft per tag (aantal, gem%, win%, ...). We pakken de
    # eerste drie lengte-tolerant, zodat extra velden nooit crashen.
    triggers = {}
    for tag, vals in report.trigger_breakdown(ports).items():
        n, mn, wr = vals[0], vals[1], vals[2]
        triggers[tag] = {"n": n, "mean": round(mn, 2), "win": round(wr)}
    mdd = evaluate.max_drawdown()
    n_events = evaluate.entry_events(ports)

    # Uitgebreide analyse voor het dagrapport/trade-log-venster.
    avg_win, avg_loss, n_win, n_loss = report.win_loss_breakdown(ports)
    best_strat, worst_strat = report.best_worst_strategy(ports)
    analysis = {
        "avg_win_pct": round(avg_win, 2) if avg_win is not None else None,
        "avg_loss_pct": round(avg_loss, 2) if avg_loss is not None else None,
        "n_win": n_win, "n_loss": n_loss,
        "best_strategy": {"tag": best_strat[0], "mean": round(best_strat[1], 2), "n": best_strat[2]} if best_strat else None,
        "worst_strategy": {"tag": worst_strat[0], "mean": round(worst_strat[1], 2), "n": worst_strat[2]} if worst_strat else None,
        "indicator_success": {k: {"n": v[0], "mean": round(v[1], 2), "win": round(v[2])}
                              for k, v in report.indicator_success(ports).items()},
        "confidence_success": {k: {"n": v[0], "mean": round(v[1], 2), "win": round(v[2])}
                               for k, v in report.confidence_success(ports).items()},
    }

    # Per markt-type.
    from collections import defaultdict
    by_type = defaultdict(list)
    for c in coins:
        if c["pnl_pct"] is not None:
            by_type[c["market_type"]].append(c["pnl_pct"])
    market_types = [{"type": t, "mean": round(sum(v) / len(v), 2), "n": len(v)}
                    for t, v in sorted(by_type.items(),
                                       key=lambda kv: sum(kv[1]) / len(kv[1]),
                                       reverse=True)]

    cmp = _baseline_compare(ports, prices)

    # Go/no-go-status (zonder internet: op basis van de tellingen + laatste prijzen).
    if n_round < evaluate.MIN_TRADES or n_events < evaluate.MIN_EVENTS:
        verdict, detail = "⏳ TE VROEG", (
            f"pas {n_round} afgeronde trades / {n_events} instapmomenten "
            f"(min {evaluate.MIN_TRADES} / {evaluate.MIN_EVENTS})")
    else:
        reasons = []
        if total_pnl_pct <= 0:
            reasons.append("geen winst na kosten")
        if (mean_net or 0) <= 0:
            reasons.append("gem. trade verliest na kosten")
        if cmp["margin"] is not None and cmp["margin"] < config.EVAL_MIN_MARGIN:
            reasons.append(f"verslaat de markt niet met {config.EVAL_MIN_MARGIN:.0f}pp")
        if mdd is not None and mdd > config.EVAL_MAX_DRAWDOWN:
            reasons.append(f"te grote dip ({mdd:.0f}%)")
        verdict = "🔴 NOG NIET" if reasons else "🟢 VOORZICHTIG GROEN"
        detail = "; ".join(reasons) if reasons else "voldoet aan alle minimale criteria"

    return {
        "updated": last_round or "",
        "generated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "heartbeat": report.heartbeat_warning(),
        "overview": {
            "total_value": round(total_value, 2), "total_start": round(total_start, 2),
            "pnl": round(total_value - total_start, 2), "pnl_pct": round(total_pnl_pct, 2),
            "in_market": sum(1 for c in coins if c["in_position"]),
            "max_positions": config.MAX_OPEN_POSITIONS, "n_coins": len(coins),
            **cmp,
        },
        "coins": coins,
        "trades": trades[:25],
        "equity": equity_series(),
        "sentiment": report.latest_news_sentiment(),
        "news": parse_news_log(),
        "triggers": triggers,
        "analysis": analysis,
        "market_types": market_types,
        "evaluation": {
            "n_round": n_round, "n_events": n_events,
            "win_rate": round(win_rate) if win_rate is not None else None,
            "mean_net": round(mean_net, 2) if mean_net is not None else None,
            "drawdown": round(mdd, 1) if mdd is not None else None,
            "verdict": verdict, "detail": detail,
        },
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass  # geen ruis op het scherm

    def _send(self, code, body, ctype):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/", "/index.html", "/dashboard.html"):
            try:
                with open(os.path.join(HERE, "dashboard.html"), encoding="utf-8") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except FileNotFoundError:
                self._send(404, "dashboard.html niet gevonden", "text/plain")
        elif path == "/api/state":
            try:
                self._send(200, json.dumps(build_snapshot()),
                           "application/json; charset=utf-8")
            except Exception as e:
                self._send(500, json.dumps({"error": str(e)}), "application/json")
        elif path == "/api/backtest":
            qs = parse_qs(urlparse(self.path).query)
            symbol = (qs.get("symbol") or [config.SYMBOLS[0]])[0]
            period = (qs.get("period") or ["1m"])[0]
            days_map = {"1m": 30, "3m": 90, "1y": 365, "5y": 365 * 5}
            days = days_map.get(period)
            if symbol not in config.SYMBOLS:
                self._send(400, json.dumps({"error": f"Onbekend symbool: {symbol}"}),
                           "application/json")
                return
            if days is None:
                self._send(400, json.dumps({"error": f"Onbekende periode: {period}"}),
                           "application/json")
                return
            try:
                result = backtest.run_backtest_period(symbol, days)
                self._send(200, json.dumps(result), "application/json; charset=utf-8")
            except Exception as e:
                # Nooit verzonnen resultaten teruggeven -- gewoon eerlijk de fout tonen.
                self._send(500, json.dumps({"error": str(e)}), "application/json; charset=utf-8")
        else:
            self._send(404, "Niet gevonden", "text/plain")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print("=" * 56)
    print("  SNOWY TRACKS — dashboard van je trading bot")
    print("=" * 56)
    print(f"  Open in je browser:  http://localhost:{port}")
    print(f"  Wachtwoord:          sneeuw123")
    print("  (Leest alleen de bot-stand; handelt niets. Ctrl+C = stoppen.)")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDashboard gestopt.")


if __name__ == "__main__":
    main()
