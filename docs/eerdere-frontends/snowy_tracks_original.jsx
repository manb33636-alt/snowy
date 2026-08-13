import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Lock, TrendingUp, TrendingDown, ShieldAlert, Search, Bell, Settings as SettingsIcon,
  History, Wallet, Newspaper, ChevronRight, RefreshCw, AlertTriangle, Check, X,
  LayoutDashboard, Snowflake, ArrowUpRight, ArrowDownRight, Circle, Square, Diamond, Info
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const DEMO_PASSWORD = "sneeuw123";

/* ---------- mock data engine ---------- */

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TICKERS = [
  { symbol: "NVDA", name: "NVIDIA", sector: "Halfgeleiders", base: 118.4, vol: 0.028, seed: 11 },
  { symbol: "AAPL", name: "Apple", sector: "Technologie", base: 214.2, vol: 0.014, seed: 22 },
  { symbol: "TSLA", name: "Tesla", sector: "Automotive", base: 246.8, vol: 0.038, seed: 33 },
  { symbol: "ASML", name: "ASML Holding", sector: "Halfgeleiders", base: 812.5, vol: 0.021, seed: 44 },
  { symbol: "BTC", name: "Bitcoin", sector: "Crypto", base: 61230, vol: 0.045, seed: 55 },
  { symbol: "MSFT", name: "Microsoft", sector: "Technologie", base: 452.1, vol: 0.012, seed: 66 },
];

/* Market Explorer dataset — gesimuleerd, gegroepeerd per categorie zoals een echte
   marktdata-API (bv. Yahoo Finance) ze zou aanbieden. In de echte backend-koppeling
   wordt dit vervangen door een live /search + /category endpoint. */
const ASSET_CATEGORIES = {
  stocks: {
    label: "Stocks", icon: "📁",
    items: [
      { symbol: "AAPL", name: "Apple", base: 214.2, vol: 0.014, seed: 101 },
      { symbol: "MSFT", name: "Microsoft", base: 452.1, vol: 0.012, seed: 102 },
      { symbol: "NVDA", name: "NVIDIA", base: 118.4, vol: 0.028, seed: 103 },
      { symbol: "TSLA", name: "Tesla", base: 246.8, vol: 0.038, seed: 104 },
      { symbol: "AMZN", name: "Amazon", base: 198.3, vol: 0.019, seed: 105 },
      { symbol: "META", name: "Meta Platforms", base: 512.6, vol: 0.024, seed: 106 },
      { symbol: "GOOGL", name: "Alphabet (Google)", base: 172.9, vol: 0.017, seed: 107 },
      { symbol: "ASML", name: "ASML Holding", base: 812.5, vol: 0.021, seed: 108 },
      { symbol: "NFLX", name: "Netflix", base: 684.3, vol: 0.022, seed: 109 },
      { symbol: "AMD", name: "Advanced Micro Devices", base: 142.7, vol: 0.031, seed: 110 },
      { symbol: "INTC", name: "Intel", base: 31.8, vol: 0.026, seed: 111 },
      { symbol: "ORCL", name: "Oracle", base: 168.4, vol: 0.016, seed: 112 },
      { symbol: "CRM", name: "Salesforce", base: 296.2, vol: 0.018, seed: 113 },
      { symbol: "ADBE", name: "Adobe", base: 512.9, vol: 0.017, seed: 114 },
      { symbol: "PYPL", name: "PayPal", base: 78.4, vol: 0.023, seed: 115 },
      { symbol: "UBER", name: "Uber Technologies", base: 82.1, vol: 0.021, seed: 116 },
      { symbol: "SHOP", name: "Shopify", base: 96.5, vol: 0.027, seed: 117 },
      { symbol: "COIN", name: "Coinbase Global", base: 224.8, vol: 0.042, seed: 118 },
      { symbol: "JPM", name: "JPMorgan Chase", base: 218.6, vol: 0.013, seed: 119 },
      { symbol: "V", name: "Visa", base: 312.4, vol: 0.011, seed: 120 },
      { symbol: "MA", name: "Mastercard", base: 498.7, vol: 0.011, seed: 121 },
      { symbol: "KO", name: "Coca-Cola", base: 64.3, vol: 0.008, seed: 122 },
      { symbol: "PEP", name: "PepsiCo", base: 148.9, vol: 0.009, seed: 123 },
      { symbol: "WMT", name: "Walmart", base: 92.6, vol: 0.010, seed: 124 },
      { symbol: "DIS", name: "Walt Disney", base: 108.2, vol: 0.018, seed: 125 },
      { symbol: "BA", name: "Boeing", base: 178.5, vol: 0.026, seed: 126 },
      { symbol: "XOM", name: "ExxonMobil", base: 114.8, vol: 0.015, seed: 127 },
      { symbol: "CVX", name: "Chevron", base: 156.3, vol: 0.014, seed: 128 },
      { symbol: "PFE", name: "Pfizer", base: 27.4, vol: 0.014, seed: 129 },
      { symbol: "JNJ", name: "Johnson & Johnson", base: 156.9, vol: 0.009, seed: 130 },
      { symbol: "NKE", name: "Nike", base: 76.2, vol: 0.019, seed: 131 },
      { symbol: "SBUX", name: "Starbucks", base: 92.8, vol: 0.017, seed: 132 },
      { symbol: "IBM", name: "IBM", base: 232.1, vol: 0.013, seed: 133 },
      { symbol: "QCOM", name: "Qualcomm", base: 168.4, vol: 0.020, seed: 134 },
      { symbol: "TXN", name: "Texas Instruments", base: 198.6, vol: 0.015, seed: 135 },
      { symbol: "BABA", name: "Alibaba Group", base: 88.3, vol: 0.029, seed: 136 },
      { symbol: "SONY", name: "Sony Group", base: 24.6, vol: 0.016, seed: 137 },
      { symbol: "ABNB", name: "Airbnb", base: 132.7, vol: 0.023, seed: 138 },
      { symbol: "SNAP", name: "Snap Inc.", base: 11.2, vol: 0.035, seed: 139 },
      { symbol: "RIVN", name: "Rivian Automotive", base: 13.8, vol: 0.044, seed: 140 },
      { symbol: "PLTR", name: "Palantir Technologies", base: 38.6, vol: 0.037, seed: 141 },
    ],
  },
  crypto: {
    label: "Crypto", icon: "📁",
    items: [
      { symbol: "BTC", name: "Bitcoin", base: 61230, vol: 0.045, seed: 201 },
      { symbol: "ETH", name: "Ethereum", base: 3412, vol: 0.052, seed: 202 },
      { symbol: "SOL", name: "Solana", base: 168.4, vol: 0.068, seed: 203 },
      { symbol: "BNB", name: "BNB", base: 592.3, vol: 0.041, seed: 204 },
      { symbol: "XRP", name: "XRP", base: 0.62, vol: 0.058, seed: 205 },
      { symbol: "DOGE", name: "Dogecoin", base: 0.14, vol: 0.072, seed: 206 },
      { symbol: "ADA", name: "Cardano", base: 0.48, vol: 0.055, seed: 207 },
      { symbol: "AVAX", name: "Avalanche", base: 32.6, vol: 0.062, seed: 208 },
      { symbol: "LINK", name: "Chainlink", base: 14.8, vol: 0.058, seed: 209 },
      { symbol: "DOT", name: "Polkadot", base: 6.42, vol: 0.056, seed: 210 },
      { symbol: "MATIC", name: "Polygon", base: 0.72, vol: 0.061, seed: 211 },
      { symbol: "LTC", name: "Litecoin", base: 84.6, vol: 0.048, seed: 212 },
      { symbol: "TRX", name: "TRON", base: 0.16, vol: 0.038, seed: 213 },
      { symbol: "SHIB", name: "Shiba Inu", base: 0.000018, vol: 0.075, seed: 214 },
      { symbol: "ATOM", name: "Cosmos", base: 8.2, vol: 0.054, seed: 215 },
      { symbol: "XLM", name: "Stellar", base: 0.11, vol: 0.049, seed: 216 },
      { symbol: "NEAR", name: "NEAR Protocol", base: 5.4, vol: 0.063, seed: 217 },
      { symbol: "APT", name: "Aptos", base: 9.6, vol: 0.067, seed: 218 },
      { symbol: "ARB", name: "Arbitrum", base: 0.84, vol: 0.065, seed: 219 },
      { symbol: "OP", name: "Optimism", base: 1.92, vol: 0.064, seed: 220 },
      { symbol: "FIL", name: "Filecoin", base: 5.1, vol: 0.059, seed: 221 },
      { symbol: "ICP", name: "Internet Computer", base: 10.8, vol: 0.066, seed: 222 },
      { symbol: "ETC", name: "Ethereum Classic", base: 21.4, vol: 0.051, seed: 223 },
      { symbol: "HBAR", name: "Hedera", base: 0.096, vol: 0.057, seed: 224 },
      { symbol: "UNI", name: "Uniswap", base: 9.8, vol: 0.06, seed: 225 },
      { symbol: "AAVE", name: "Aave", base: 168.2, vol: 0.063, seed: 226 },
    ],
  },
  etfs: {
    label: "ETF's", icon: "📁",
    items: [
      { symbol: "SPY", name: "SPDR S&P 500 ETF", base: 562.4, vol: 0.009, seed: 301 },
      { symbol: "QQQ", name: "Invesco QQQ (Nasdaq-100)", base: 482.1, vol: 0.011, seed: 302 },
      { symbol: "VOO", name: "Vanguard S&P 500 ETF", base: 516.8, vol: 0.009, seed: 303 },
      { symbol: "VTI", name: "Vanguard Total Stock Market", base: 268.3, vol: 0.009, seed: 304 },
      { symbol: "IWM", name: "iShares Russell 2000", base: 218.6, vol: 0.014, seed: 305 },
      { symbol: "DIA", name: "SPDR Dow Jones ETF", base: 412.9, vol: 0.008, seed: 306 },
      { symbol: "ARKK", name: "ARK Innovation ETF", base: 52.4, vol: 0.032, seed: 307 },
      { symbol: "XLK", name: "Technology Select Sector", base: 232.6, vol: 0.014, seed: 308 },
      { symbol: "XLF", name: "Financial Select Sector", base: 46.8, vol: 0.012, seed: 309 },
      { symbol: "XLE", name: "Energy Select Sector", base: 92.1, vol: 0.017, seed: 310 },
      { symbol: "GLD", name: "SPDR Gold Shares", base: 246.3, vol: 0.010, seed: 311 },
      { symbol: "SLV", name: "iShares Silver Trust", base: 28.6, vol: 0.018, seed: 312 },
      { symbol: "EEM", name: "iShares MSCI Emerging Markets", base: 44.2, vol: 0.013, seed: 313 },
      { symbol: "VEA", name: "Vanguard FTSE Developed Markets", base: 52.8, vol: 0.010, seed: 314 },
      { symbol: "BND", name: "Vanguard Total Bond Market", base: 72.4, vol: 0.005, seed: 315 },
    ],
  },
  forex: {
    label: "Forex", icon: "📁",
    items: [
      { symbol: "EUR/USD", name: "Euro / US-dollar", base: 1.086, vol: 0.006, seed: 401 },
      { symbol: "GBP/USD", name: "Brits pond / US-dollar", base: 1.268, vol: 0.007, seed: 402 },
      { symbol: "USD/JPY", name: "US-dollar / Japanse yen", base: 156.4, vol: 0.007, seed: 403 },
      { symbol: "USD/CHF", name: "US-dollar / Zwitserse frank", base: 0.898, vol: 0.006, seed: 404 },
      { symbol: "AUD/USD", name: "Australische dollar / US-dollar", base: 0.664, vol: 0.008, seed: 405 },
      { symbol: "USD/CAD", name: "US-dollar / Canadese dollar", base: 1.372, vol: 0.006, seed: 406 },
      { symbol: "NZD/USD", name: "Nieuw-Zeelandse dollar / US-dollar", base: 0.612, vol: 0.008, seed: 407 },
      { symbol: "EUR/GBP", name: "Euro / Brits pond", base: 0.856, vol: 0.005, seed: 408 },
      { symbol: "EUR/JPY", name: "Euro / Japanse yen", base: 169.8, vol: 0.008, seed: 409 },
      { symbol: "USD/TRY", name: "US-dollar / Turkse lira", base: 34.2, vol: 0.021, seed: 410 },
    ],
  },
  commodities: {
    label: "Commodities", icon: "📁",
    items: [
      { symbol: "XAU", name: "Goud", base: 2384.6, vol: 0.012, seed: 501 },
      { symbol: "XAG", name: "Zilver", base: 28.4, vol: 0.019, seed: 502 },
      { symbol: "WTI", name: "Olie (WTI Crude)", base: 78.6, vol: 0.024, seed: 503 },
      { symbol: "BRENT", name: "Olie (Brent Crude)", base: 82.4, vol: 0.023, seed: 504 },
      { symbol: "NG", name: "Aardgas", base: 2.68, vol: 0.038, seed: 505 },
      { symbol: "HG", name: "Koper", base: 4.42, vol: 0.017, seed: 506 },
      { symbol: "ZW", name: "Tarwe", base: 612.4, vol: 0.021, seed: 507 },
      { symbol: "ZC", name: "Maïs", base: 448.2, vol: 0.019, seed: 508 },
    ],
  },
  indices: {
    label: "Indices", icon: "📁",
    items: [
      { symbol: "SPX", name: "S&P 500", base: 6142.8, vol: 0.009, seed: 601 },
      { symbol: "IXIC", name: "NASDAQ Composite", base: 19842.3, vol: 0.012, seed: 602 },
      { symbol: "DJI", name: "Dow Jones Industrial Average", base: 42186.4, vol: 0.008, seed: 603 },
      { symbol: "AEX", name: "AEX (Amsterdam)", base: 912.6, vol: 0.009, seed: 604 },
      { symbol: "DAX", name: "DAX (Frankfurt)", base: 19624.8, vol: 0.010, seed: 605 },
      { symbol: "FTSE", name: "FTSE 100 (Londen)", base: 8246.2, vol: 0.008, seed: 606 },
      { symbol: "N225", name: "Nikkei 225 (Tokio)", base: 39482.6, vol: 0.013, seed: 607 },
      { symbol: "HSI", name: "Hang Seng (Hongkong)", base: 18642.4, vol: 0.015, seed: 608 },
    ],
  },
};

const ALL_ASSETS = Object.entries(ASSET_CATEGORIES).flatMap(([catKey, cat]) =>
  cat.items.map((item) => ({ ...item, category: catKey, categoryLabel: cat.label }))
);
const ASSETS_BY_SYMBOL = Object.fromEntries(ALL_ASSETS.map((a) => [a.symbol, a]));

function genHistory(ticker, points = 40) {
  const rnd = seededRandom(ticker.seed);
  let price = ticker.base * (0.9 + rnd() * 0.2);
  const arr = [];
  for (let i = 0; i < points; i++) {
    const drift = (rnd() - 0.48) * ticker.vol;
    price = Math.max(price * (1 + drift), price * 0.5);
    arr.push({ i, price: Number(price.toFixed(ticker.base > 1000 ? 0 : ticker.base < 1 ? 6 : 2)) });
  }
  return arr;
}

function computeIndicators(history) {
  const closes = history.map((h) => h.price);
  const last = closes[closes.length - 1];
  const sma = (n) => {
    const slice = closes.slice(-n);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  };
  const sma10 = sma(10);
  const sma20 = sma(20);

  let gains = 0, losses = 0;
  for (let i = closes.length - 14; i < closes.length - 1; i++) {
    if (i < 0) continue;
    const diff = closes[i + 1] - closes[i];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const rs = losses === 0 ? gains : gains / (losses || 1);
  const rsi = losses === 0 && gains === 0 ? 50 : 100 - 100 / (1 + rs);

  const trendUp = sma10 > sma20;
  const momentum = (last - closes[closes.length - 6]) / closes[closes.length - 6];

  return { last, sma10, sma20, rsi: Math.min(99, Math.max(1, rsi)), trendUp, momentum };
}

function generateAdvice(ind, ticker) {
  const reasons = [];
  let score = 0;

  if (ind.trendUp) { score += 1; reasons.push("Korte-termijn gemiddelde boven lange-termijn gemiddelde"); }
  else { score -= 1; reasons.push("Korte-termijn gemiddelde onder lange-termijn gemiddelde"); }

  if (ind.rsi > 70) { score -= 1; reasons.push(`RSI hoog (${ind.rsi.toFixed(0)}) — mogelijk overgekocht`); }
  else if (ind.rsi < 30) { score += 1; reasons.push(`RSI laag (${ind.rsi.toFixed(0)}) — mogelijk oversold`); }
  else { reasons.push(`RSI neutraal (${ind.rsi.toFixed(0)})`); }

  if (ind.momentum > 0.01) { score += 1; reasons.push("Positief koersmomentum over de laatste periode"); }
  else if (ind.momentum < -0.01) { score -= 1; reasons.push("Negatief koersmomentum over de laatste periode"); }

  if (ticker.vol > 0.03) reasons.push("Verhoogde volatiliteit in dit segment");

  let advice = "HOUDEN";
  if (score >= 2) advice = "MOGELIJK KOPEN";
  else if (score <= -2) advice = "MOGELIJK VERKOPEN";

  const confidence = Math.min(92, Math.max(38, 55 + score * 12 + (Math.abs(ind.momentum) * 200)));
  const risk = ticker.vol > 0.03 ? "Hoog" : ticker.vol > 0.02 ? "Gemiddeld" : "Laag";

  return { advice, confidence: Math.round(confidence), reasons: reasons.slice(0, 4), risk };
}

/* ---------- shared bits ---------- */

function ModeBadge({ mode }) {
  const map = {
    analyse: { icon: Circle, label: "Analyse", color: "var(--mint)" },
    testing: { icon: Square, label: "Testing", color: "var(--frost)" },
    live: { icon: Diamond, label: "Live", color: "var(--ember)" },
  };
  const m = map[mode];
  const Icon = m.icon;
  return (
    <span className="mode-badge" style={{ "--badge-color": m.color }}>
      <Icon size={10} strokeWidth={3} fill={m.color} />
      {m.label}
    </span>
  );
}

function AdviceTag({ advice }) {
  const cls =
    advice === "MOGELIJK KOPEN" ? "tag tag-buy" :
    advice === "MOGELIJK VERKOPEN" ? "tag tag-sell" : "tag tag-hold";
  return <span className={cls}>{advice}</span>;
}

function fmtMoney(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPrice(n, ticker) {
  const isForex = ticker?.symbol?.includes("/");
  if (n < 1) {
    return (isForex ? "" : "$") + n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }
  return (isForex ? "" : "$") + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- login screen ---------- */

const LOCK_MINUTES = [15, 30, 45, 60]; // escalates, capped at 60

function LoginScreen({ onUnlock }) {
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockLevel, setLockLevel] = useState(0);
  const [error, setError] = useState("");
  const [lockUntil, setLockUntil] = useState(null);
  const [lockMinutes, setLockMinutes] = useState(15);
  const [remaining, setRemaining] = useState(0);
  const [log, setLog] = useState([]);

  useEffect(() => {
    if (!lockUntil) return;
    const t = setInterval(() => {
      const r = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) {
        setLockUntil(null);
        setAttempts(0);
        setError("Je kunt het opnieuw proberen.");
      }
    }, 250);
    return () => clearInterval(t);
  }, [lockUntil]);

  function submit(e) {
    e.preventDefault();
    if (lockUntil) return;

    if (!value) {
      setError("Voer een wachtwoord in.");
      return;
    }

    const now = new Date();
    const ok = value === DEMO_PASSWORD;
    setLog((l) => [{ time: now.toLocaleTimeString("nl-NL"), success: ok }, ...l].slice(0, 6));

    if (ok) { onUnlock(); return; }

    const next = attempts + 1;
    setAttempts(next);
    setValue("");

    if (lockLevel === 0) {
      // first cycle: build up over 3 attempts, then lock 15 minutes
      if (next === 1) {
        setError("Onjuist wachtwoord. Probeer opnieuw.");
        return;
      } else if (next === 2) {
        setError("Onjuist wachtwoord. Nog 1 fout tot 15 minuten wachten.");
        return;
      } else {
        const minutes = 15;
        setLockMinutes(minutes);
        setError(`Probeer over ${minutes} minuten opnieuw.`);
        setLockUntil(Date.now() + minutes * 1000); // demo speed: 1 sec = 1 min
        setLockLevel(1);
        return;
      }
    }

    // already been locked out at least once before: any wrong attempt now
    // immediately re-locks for 60 minutes, indefinitely, until correct password
    const minutes = 60;
    setLockMinutes(minutes);
    setError(`Probeer over ${minutes} minuten opnieuw.`);
    setLockUntil(Date.now() + minutes * 1000);
  }

  return (
    <div className="login-wrap">
      <style>{`
        .login-wrap { min-height: 640px; display:flex; align-items:center; justify-content:center;
          background: radial-gradient(ellipse at 50% -10%, #1b3652 0%, #0b1420 55%), #0b1420;
          font-family: 'Inter', system-ui, sans-serif; position: relative; overflow:hidden; padding: 40px 20px; border-radius: 16px; }
        .login-wrap .flake { position:absolute; color: rgba(228,242,255,0.35); }
        .login-card { position:relative; z-index:2; width: 100%; max-width: 380px; background: rgba(19,31,46,0.75);
          border: 1px solid rgba(142,202,230,0.18); border-radius: 18px; padding: 40px 32px; backdrop-filter: blur(6px);
          box-shadow: 0 30px 80px rgba(0,0,0,0.5); }
        .login-brand { display:flex; align-items:center; gap:10px; justify-content:center; margin-bottom: 6px; }
        .login-title { font-family:'Space Grotesk', sans-serif; font-weight:600; font-size: 22px; letter-spacing:0.02em; color:#F4F8FB; }
        .login-sub { text-align:center; color:#7C93AC; font-size:13px; margin: 6px 0 28px; letter-spacing:0.03em; }
        .login-label { color:#8ECAE6; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:8px; display:block; }
        .login-input { width:100%; background:#0E1A28; border:1px solid rgba(142,202,230,0.25); border-radius:10px;
          padding:13px 14px; color:#F4F8FB; font-size:15px; font-family:'JetBrains Mono', monospace; letter-spacing:0.05em;
          outline:none; transition: border-color .15s; }
        .login-input:focus { border-color:#8ECAE6; }
        .login-btn { width:100%; margin-top:16px; padding:13px; border-radius:10px; border:none; cursor:pointer;
          background: linear-gradient(135deg, #8ECAE6, #6FB3D6); color:#0B1420; font-weight:600; font-size:14px;
          letter-spacing:0.03em; transition: transform .1s, opacity .15s; }
        .login-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .login-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .login-error { margin-top:14px; font-size:12.5px; color:#E8846B; display:flex; gap:6px; align-items:flex-start; line-height:1.5; }
        .login-lock { margin-top:14px; padding:12px 14px; border-radius:10px; background:rgba(232,132,107,0.1);
          border:1px solid rgba(232,132,107,0.3); color:#E8846B; font-size:12.5px; text-align:center; }
        .login-hint { margin-top: 22px; text-align:center; font-size:11px; color:#4C607A; line-height:1.6; }
        .login-log { margin-top:20px; border-top:1px solid rgba(142,202,230,0.12); padding-top:14px; }
        .login-log-title { font-size:10.5px; color:#5A7391; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px; }
        .login-log-row { display:flex; justify-content:space-between; font-size:11.5px; font-family:'JetBrains Mono', monospace;
          color:#6E88A6; padding:3px 0; }
        .login-log-row.ok { color:#7DD9B3; }
        .login-log-row.fail { color:#E8846B; }
      `}</style>

      {[...Array(18)].map((_, i) => (
        <Snowflake
          key={i}
          className="flake"
          size={10 + (i % 4) * 6}
          style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 37) % 100}%`,
            opacity: 0.15 + (i % 3) * 0.1,
          }}
        />
      ))}

      <div className="login-card">
        <div className="login-brand">
          <Snowflake size={22} color="#8ECAE6" strokeWidth={2} />
          <span className="login-title">Snowy_Tracks</span>
        </div>
        <p className="login-sub">Persoonlijke AI-marktassistent — beveiligde toegang</p>

        <div>
          <label className="login-label">Wachtwoord</label>
          <input
            type="password"
            autoComplete="off"
            className="login-input"
            value={value}
            disabled={!!lockUntil}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(e); }}
            placeholder="••••••••••••"
          />
          <button className="login-btn" type="button" onClick={submit} disabled={!!lockUntil}>
            {lockUntil ? `Geblokkeerd — nog ${remaining}s (demo)` : "Toegang"}
          </button>
        </div>

        {error && !lockUntil && (
          <div className="login-error"><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>
        )}
        {lockUntil && (
          <div className="login-lock">
            Probeer over {lockMinutes} minuten opnieuw.<br />
            <span style={{ opacity: 0.7, fontSize: 11 }}>(demo versneld: {remaining}s resterend = {lockMinutes} min in het echt)</span>
          </div>
        )}

        {log.length > 0 && (
          <div className="login-log">
            <div className="login-log-title">Laatste inlogpogingen</div>
            {log.map((l, i) => (
              <div key={i} className={`login-log-row ${l.success ? "ok" : "fail"}`}>
                <span>{l.time}</span>
                <span>{l.success ? "Toegang verleend" : "Mislukt"}</span>
              </div>
            ))}
          </div>
        )}

        <div className="login-hint">
          Demo-mockup — wachtwoord: <b style={{ color: "#8ECAE6" }}>{DEMO_PASSWORD}</b><br />
          In de echte versie wordt dit veld nooit getoond en het wachtwoord veilig gehasht (Argon2/bcrypt) opgeslagen.
        </div>
      </div>
    </div>
  );
}

/* ---------- market explorer ---------- */

const CATEGORY_ORDER = ["stocks", "crypto", "etfs", "forex", "commodities", "indices"];

function useLiveRows(assets, tick, seedOffset = 0) {
  return useMemo(() => {
    return assets.map((a) => {
      const hist = genHistory({ ...a, seed: a.seed + seedOffset + Math.floor(tick / 3) });
      const ind = computeIndicators(hist);
      const advice = generateAdvice(ind, a);
      const change = ((ind.last - hist[0].price) / hist[0].price) * 100;
      return { asset: a, hist, ind, advice, change };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, tick]);
}

function MarketExplorer({ onOpenAsset }) {
  const [openFolder, setOpenFolder] = useState(null);
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const searching = query.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!searching) return [];
    const q = query.trim().toLowerCase();
    return ALL_ASSETS.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0, 60);
  }, [query, searching]);

  const currentAssets = searching ? searchResults : openFolder ? ASSET_CATEGORIES[openFolder].items : [];
  const rows = useLiveRows(currentAssets, tick);

  return (
    <div className="explorer-wrap">
      <style>{EXPLORER_CSS}</style>

      <div className="explorer-search">
        <Search size={15} color="#5A7391" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op naam, ticker of symbool… (bv. BTC, Apple, EUR/USD)"
        />
        {query && <button className="explorer-clear" onClick={() => setQuery("")}><X size={14} /></button>}
      </div>

      {!searching && (
        <div className="explorer-breadcrumb">
          <button className="crumb" onClick={() => setOpenFolder(null)}>📁 Market Explorer</button>
          {openFolder && <><ChevronRight size={13} /><span className="crumb current">{ASSET_CATEGORIES[openFolder].label}</span></>}
        </div>
      )}

      {searching && (
        <div className="explorer-breadcrumb">
          <span className="crumb current">Zoekresultaten voor "{query}" ({searchResults.length})</span>
        </div>
      )}

      {!searching && !openFolder && (
        <div className="folder-grid">
          {CATEGORY_ORDER.map((key) => {
            const cat = ASSET_CATEGORIES[key];
            return (
              <button key={key} className="folder-card" onClick={() => setOpenFolder(key)}>
                <span className="folder-icon">📁</span>
                <span className="folder-label">{cat.label}</span>
                <span className="folder-count">{cat.items.length} activa</span>
              </button>
            );
          })}
        </div>
      )}

      {(openFolder || searching) && (
        <div className="asset-list">
          {rows.length === 0 && <div className="empty-note">Geen resultaten gevonden.</div>}
          {rows.map(({ asset, ind, change }) => (
            <button key={asset.symbol} className="asset-row" onClick={() => onOpenAsset(asset)}>
              <div className="asset-id">
                <span className="asset-symbol">{asset.symbol}</span>
                <span className="asset-name">{asset.name}</span>
                {searching && <span className="asset-cat-tag">{asset.categoryLabel}</span>}
              </div>
              <div className="asset-right">
                <span className="asset-price">{fmtPrice(ind.last, asset)}</span>
                <span className={`ticker-change ${change >= 0 ? "up" : "down"}`}>
                  {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(change).toFixed(2)}%
                </span>
              </div>
              <ChevronRight size={15} className="asset-chevron" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EXPLORER_CSS = `
  .explorer-search { display:flex; align-items:center; gap:10px; background:#0E1A28; border:1px solid rgba(142,202,230,0.15);
    border-radius:10px; padding:11px 14px; margin-bottom:14px; }
  .explorer-search input { flex:1; background:none; border:none; outline:none; color:#F4F8FB; font-size:13px; }
  .explorer-clear { background:none; border:none; color:#5A7391; cursor:pointer; display:flex; }
  .explorer-breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:14px; color:#7C93AC; }
  .crumb { background:none; border:none; color:#8ECAE6; font-size:12.5px; cursor:pointer; padding:2px 0; font-weight:600; }
  .crumb.current { color:#7C93AC; font-weight:400; cursor:default; }
  .folder-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
  .folder-card { display:flex; flex-direction:column; align-items:flex-start; gap:6px; background:#131F2E;
    border:1px solid rgba(142,202,230,0.12); border-radius:14px; padding:18px 16px; cursor:pointer; text-align:left;
    transition: border-color .15s, background .15s; }
  .folder-card:hover { border-color:#8ECAE6; background:#16263A; }
  .folder-icon { font-size:26px; }
  .folder-label { font-family:'Space Grotesk', sans-serif; font-weight:600; color:#F4F8FB; font-size:14.5px; }
  .folder-count { font-size:11.5px; color:#5A7391; }
  .asset-list { display:flex; flex-direction:column; gap:5px; max-height:440px; overflow:auto; }
  .asset-row { width:100%; display:flex; align-items:center; gap:12px; background:#131F2E; border:1px solid transparent;
    border-radius:10px; padding:11px 14px; cursor:pointer; text-align:left; transition: border-color .15s, background .15s; }
  .asset-row:hover { border-color: rgba(142,202,230,0.25); background:#16263A; }
  .asset-id { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
  .asset-symbol { font-family:'JetBrains Mono', monospace; font-weight:600; font-size:13px; color:#F4F8FB; flex-shrink:0; }
  .asset-name { font-size:11.5px; color:#7C93AC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .asset-cat-tag { font-size:9.5px; color:#8ECAE6; border:1px solid rgba(142,202,230,0.3); border-radius:20px; padding:2px 7px; flex-shrink:0; }
  .asset-right { display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0; }
  .asset-price { font-family:'JetBrains Mono', monospace; font-size:13px; color:#F4F8FB; }
  .asset-chevron { color:#5A7391; flex-shrink:0; }
`;

/* ---------- asset detail window ---------- */

function AssetDetailWindow({ asset }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const hist = useMemo(() => genHistory({ ...asset, seed: asset.seed + Math.floor(tick / 3) }, 60), [asset, tick]);
  const ind = computeIndicators(hist);
  const advice = generateAdvice(ind, asset);
  const change = ((ind.last - hist[0].price) / hist[0].price) * 100;

  const recent = hist.slice(-20);
  const dayHigh = Math.max(...recent.map((h) => h.price));
  const dayLow = Math.min(...recent.map((h) => h.price));
  const rnd = seededRandom(asset.seed + 999);
  const volume = Math.round((0.5 + rnd()) * (asset.category === "crypto" ? 8e9 : 4e7));
  const marketCap = asset.category === "crypto" || asset.category === "stocks"
    ? ind.last * (asset.category === "crypto" ? (18e6 + rnd() * 100e6) : (2e8 + rnd() * 8e9))
    : null;

  const NEWS = useMemo(() => {
    const rnd2 = seededRandom(asset.seed + 42);
    const templates = [
      `Analisten wijzen op ${advice.ind === undefined ? "toenemende" : "toenemende"} interesse in ${asset.name} na recente marktbewegingen.`,
      `${asset.name} in het nieuws vanwege sectorbrede ontwikkelingen bij ${asset.categoryLabel || "vergelijkbare activa"}.`,
      `Marktcommentatoren blijven verdeeld over de korte-termijnrichting van ${asset.symbol}.`,
    ];
    return templates.map((t, i) => ({ id: i, text: t, time: `${1 + Math.floor(rnd2() * 11)}u geleden` }));
  }, [asset]);

  return (
    <div className="ticker-detail asset-detail-window">
      <style>{ANALYSE_CSS}</style>
      <div className="detail-head">
        <div>
          <div className="detail-symbol">{asset.symbol} <span className="detail-sector">{asset.categoryLabel}</span></div>
          <div className="detail-name">{asset.name}</div>
        </div>
        <div className="detail-price-block">
          <div className="detail-price">{fmtPrice(ind.last, asset)}</div>
          <div className={`ticker-change ${change >= 0 ? "up" : "down"}`}>
            {change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(change).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="detail-chart">
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={hist}>
            <defs>
              <linearGradient id={`priceFill-${asset.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ECAE6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8ECAE6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(142,202,230,0.08)" vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip
              contentStyle={{ background: "#0E1A28", border: "1px solid rgba(142,202,230,0.25)", borderRadius: 8, fontSize: 12 }}
              labelFormatter={() => ""}
              formatter={(v) => [fmtPrice(v, asset), "Prijs"]}
            />
            <Area type="monotone" dataKey="price" stroke="#8ECAE6" strokeWidth={2} fill={`url(#priceFill-${asset.symbol})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="indicator-row stats-row-6">
        <div className="indicator-chip"><span className="indicator-label">Daghoog</span><span className="indicator-value">{fmtPrice(dayHigh, asset)}</span></div>
        <div className="indicator-chip"><span className="indicator-label">Daglaag</span><span className="indicator-value">{fmtPrice(dayLow, asset)}</span></div>
        <div className="indicator-chip"><span className="indicator-label">24u Volume</span><span className="indicator-value">{volume.toLocaleString("en-US")}</span></div>
        <div className="indicator-chip"><span className="indicator-label">Marktkap.</span><span className="indicator-value">{marketCap ? fmtMoney(marketCap).replace(/\.00$/, "") : "n.v.t."}</span></div>
        <div className="indicator-chip"><span className="indicator-label">RSI</span><span className="indicator-value">{ind.rsi.toFixed(0)}</span></div>
        <div className="indicator-chip"><span className="indicator-label">Trend</span><span className="indicator-value">{ind.trendUp ? "Stijgend" : "Dalend"}</span></div>
      </div>

      <div className="advice-card">
        <div className="advice-head">
          <span className="advice-label">AI-advies</span>
          <AdviceTag advice={advice.advice} />
        </div>
        <div className="advice-conf">
          <span>Betrouwbaarheid</span>
          <div className="conf-bar"><div className="conf-fill" style={{ width: `${advice.confidence}%` }} /></div>
          <span className="conf-num">{advice.confidence}%</span>
        </div>
        <ul className="advice-reasons">
          {advice.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
        <div className="advice-risk">
          <ShieldAlert size={13} /> Risico: <b>{advice.risk}</b>
        </div>
        <div className="advice-disclaimer">
          <Info size={12} /> Dit is een kansinschatting op basis van data, geen garantie op toekomstige koers.
        </div>
      </div>

      <div className="panel-title" style={{ marginTop: 16 }}>Nieuws (gesimuleerd)</div>
      <div className="news-list">
        {NEWS.map((n) => (
          <div key={n.id} className="news-row">
            <Newspaper size={13} color="#5A7391" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div className="news-text">{n.text}</div>
              <div className="news-time">{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ANALYSE_CSS = `
  .asset-detail-window { max-width: none; }
  .stats-row-6 { grid-template-columns: repeat(6, 1fr) !important; }
  .ticker-detail { background:#131F2E; border:1px solid rgba(142,202,230,0.12); border-radius:16px; padding:20px 22px; }
  .detail-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px; }
  .detail-symbol { font-family:'Space Grotesk', sans-serif; font-size:20px; font-weight:600; color:#F4F8FB; }
  .detail-sector { font-family:'Inter', sans-serif; font-size:11px; color:#5A7391; font-weight:400; margin-left:8px; }
  .detail-name { color:#7C93AC; font-size:12.5px; margin-top:2px; }
  .detail-price-block { text-align:right; }
  .detail-price { font-family:'JetBrains Mono', monospace; font-size:20px; color:#F4F8FB; }
  .detail-chart { margin: 10px 0 6px; }
  .indicator-row { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin: 14px 0 18px; }
  .indicator-chip { background:#0E1A28; border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:4px; }
  .indicator-label { font-size:10px; color:#5A7391; text-transform:uppercase; letter-spacing:0.08em; }
  .indicator-value { font-family:'JetBrains Mono', monospace; font-size:13px; color:#F4F8FB; }
  .advice-card { background: #0E1A28; border:1px solid rgba(142,202,230,0.15); border-radius:14px; padding:16px 18px; }
  .advice-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
  .advice-label { font-size:11px; color:#5A7391; text-transform:uppercase; letter-spacing:0.08em; }
  .tag { font-size:12px; font-weight:600; padding:5px 12px; border-radius:20px; letter-spacing:0.02em; }
  .tag-buy { background:rgba(125,217,179,0.15); color:#7DD9B3; }
  .tag-sell { background:rgba(232,132,107,0.15); color:#E8846B; }
  .tag-hold { background:rgba(142,202,230,0.15); color:#8ECAE6; }
  .advice-conf { display:flex; align-items:center; gap:10px; font-size:12px; color:#7C93AC; margin-bottom:12px; }
  .conf-bar { flex:1; height:6px; background:#1B2A3B; border-radius:4px; overflow:hidden; }
  .conf-fill { height:100%; background: linear-gradient(90deg, #8ECAE6, #7DD9B3); border-radius:4px; }
  .conf-num { font-family:'JetBrains Mono', monospace; color:#F4F8FB; font-size:12.5px; min-width:34px; text-align:right; }
  .advice-reasons { margin: 0 0 12px; padding-left:18px; color:#B8C9DB; font-size:12.5px; line-height:1.8; }
  .advice-risk { font-size:12.5px; color:#B8C9DB; display:flex; align-items:center; gap:6px; margin-bottom:10px; }
  .advice-disclaimer { font-size:11px; color:#5A7391; display:flex; align-items:flex-start; gap:6px; line-height:1.5; border-top:1px solid rgba(142,202,230,0.1); padding-top:10px; }
  .panel-title { font-size:12px; color:#8ECAE6; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; font-weight:600; }
  .news-list { display:flex; flex-direction:column; gap:8px; }
  .news-row { display:flex; gap:8px; background:#0E1A28; border-radius:10px; padding:10px 12px; }
  .news-text { font-size:12px; color:#B8C9DB; line-height:1.5; }
  .news-time { font-size:10.5px; color:#5A7391; margin-top:3px; }
`;

/* ---------- testing mode (paper trading) ---------- */

function TestingMode() {
  const [cash, setCash] = useState(10000);
  const [startingCapital, setStartingCapital] = useState(10000);
  const [depositAmount, setDepositAmount] = useState(1000);
  const [holdings, setHoldings] = useState({});
  const [txs, setTxs] = useState([]);
  const [selected, setSelected] = useState(TICKERS[0].symbol);
  const [qty, setQty] = useState(1);
  const [history, setHistory] = useState(() => [{ t: 0, value: 10000 }]);
  const [aiActive, setAiActive] = useState(true);
  const [tick, setTick] = useState(0);
  const tRef = useRef(0);
  const cashRef = useRef(cash);
  const holdingsRef = useRef(holdings);

  useEffect(() => { cashRef.current = cash; }, [cash]);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 3500);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    return TICKERS.map((t) => {
      const hist = genHistory({ ...t, seed: t.seed + Math.floor(tick / 3) });
      const ind = computeIndicators(hist);
      const advice = generateAdvice(ind, t);
      return { ticker: t, hist, ind, advice };
    });
  }, [tick]);

  const prices = useMemo(() => {
    const map = {};
    rows.forEach((r) => { map[r.ticker.symbol] = r.ind.last; });
    return map;
  }, [rows]);

  const activeTicker = TICKERS.find((t) => t.symbol === selected);
  const price = prices[selected];

  const holdingsValue = Object.entries(holdings).reduce((sum, [sym, h]) => sum + h.qty * (prices[sym] || 0), 0);
  const totalValue = cash + holdingsValue;
  const pnl = totalValue - startingCapital;
  const pnlPct = startingCapital ? (pnl / startingCapital) * 100 : 0;

  function deposit() {
    const amt = Math.round(Number(depositAmount));
    if (!amt || amt <= 0) return;
    setCash((c) => c + amt);
    setStartingCapital((s) => s + amt); // deposits are not profit, so baseline moves with them
    setTxs((list) => [{
      id: Date.now(), type: "deposit", symbol: "—", qty: 1, price: amt, time: new Date().toLocaleTimeString("nl-NL"), origin: "manual"
    }, ...list]);
  }

  // Autonomous AI trading: on every tick, re-evaluate each ticker's advice and act with virtual money.
  useEffect(() => {
    if (!aiActive || tick === 0) return;
    let workingCash = cashRef.current;
    const workingHoldings = { ...holdingsRef.current };
    const newTxs = [];

    rows.forEach(({ ticker, ind, advice }) => {
      const sym = ticker.symbol;
      const priceNow = ind.last;
      const cur = workingHoldings[sym];

      if (advice.advice === "MOGELIJK KOPEN" && !cur) {
        const budget = workingCash * 0.12; // AI risk-sizing: max ~12% of free cash per nieuwe positie
        const q = Math.floor(budget / priceNow);
        if (q >= 1) {
          const cost = q * priceNow;
          workingCash -= cost;
          workingHoldings[sym] = { qty: q, avg: priceNow };
          newTxs.push({
            id: Date.now() + Math.random(), type: "buy", symbol: sym, qty: q, price: priceNow,
            time: new Date().toLocaleTimeString("nl-NL"), origin: "ai"
          });
        }
      } else if (advice.advice === "MOGELIJK VERKOPEN" && cur) {
        const proceeds = cur.qty * priceNow;
        const profit = (priceNow - cur.avg) * cur.qty;
        workingCash += proceeds;
        delete workingHoldings[sym];
        newTxs.push({
          id: Date.now() + Math.random(), type: "sell", symbol: sym, qty: cur.qty, price: priceNow,
          time: new Date().toLocaleTimeString("nl-NL"), origin: "ai", profit
        });
      }
    });

    if (newTxs.length > 0) {
      setCash(workingCash);
      setHoldings(workingHoldings);
      setTxs((list) => [...newTxs.reverse(), ...list]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, aiActive]);

  function trade(type) {
    const cost = qty * price;
    let profit = null;
    if (type === "buy") {
      if (cost > cash) return;
      setCash((c) => c - cost);
      setHoldings((h) => {
        const cur = h[selected] || { qty: 0, avg: 0 };
        const newQty = cur.qty + qty;
        const newAvg = (cur.avg * cur.qty + cost) / newQty;
        return { ...h, [selected]: { qty: newQty, avg: newAvg } };
      });
    } else {
      const cur = holdings[selected];
      if (!cur || cur.qty < qty) return;
      profit = (price - cur.avg) * qty;
      setCash((c) => c + cost);
      setHoldings((h) => {
        const newQty = cur.qty - qty;
        const next = { ...h };
        if (newQty <= 0) delete next[selected]; else next[selected] = { ...cur, qty: newQty };
        return next;
      });
    }
    setTxs((list) => [{
      id: Date.now(), type, symbol: selected, qty, price, time: new Date().toLocaleTimeString("nl-NL"),
      origin: "manual", profit
    }, ...list]);
  }

  useEffect(() => {
    tRef.current += 1;
    setHistory((h) => [...h, { t: tRef.current, value: Number(totalValue.toFixed(2)) }].slice(-30));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cash, JSON.stringify(holdings)]);

  const realizedSells = txs.filter((t) => t.type === "sell" && typeof t.profit === "number");
  const openPositions = Object.entries(holdings).map(([sym, h]) => ({
    profit: (prices[sym] - h.avg) * h.qty,
  }));
  const evaluated = [...realizedSells.map((t) => ({ profit: t.profit })), ...openPositions];
  const wins = evaluated.filter((e) => e.profit > 0).length;
  const successRate = evaluated.length ? Math.round((wins / evaluated.length) * 100) : null;

  return (
    <div className="testing-wrap">
      <style>{TESTING_CSS}</style>

      <div className="deposit-box">
        <span className="deposit-label">Nep geld storten (voor AI-training/testen)</span>
        <div className="deposit-controls">
          <span className="deposit-prefix">$</span>
          <input
            type="number" min="1" className="deposit-input" value={depositAmount}
            onChange={(e) => setDepositAmount(Math.max(1, Number(e.target.value) || 0))}
          />
          <button className="trade-btn buy" onClick={deposit}>Storten</button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-label">Portefeuille­waarde</span>
          <span className="stat-value">{fmtMoney(totalValue)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Resultaat</span>
          <span className={`stat-value ${pnl >= 0 ? "pos" : "neg"}`}>
            {pnl >= 0 ? "+" : ""}{fmtMoney(pnl)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vrij nep geld</span>
          <span className="stat-value">{fmtMoney(cash)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Transacties</span>
          <span className="stat-value">{txs.length}</span>
        </div>
      </div>

      <div className="testing-grid">
        <div className="chart-panel">
          <div className="panel-title">Portefeuille verloop (simulatie)</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history}>
              <CartesianGrid stroke="rgba(142,202,230,0.08)" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip
                contentStyle={{ background: "#0E1A28", border: "1px solid rgba(142,202,230,0.25)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [fmtMoney(v), "Waarde"]}
                labelFormatter={() => ""}
              />
              <Line type="monotone" dataKey="value" stroke="#7DD9B3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <div className="panel-title" style={{ marginTop: 18 }}>Handelen (nep geld)</div>
          <div className="trade-box">
            <select className="trade-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {TICKERS.map((t) => <option key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</option>)}
            </select>
            <span className="trade-price">{fmtPrice(price, activeTicker)}</span>
            <input
              type="number" min="1" className="trade-qty" value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
            <button className="trade-btn buy" onClick={() => trade("buy")}>Koop</button>
            <button className="trade-btn sell" onClick={() => trade("sell")}>Verkoop</button>
          </div>
        </div>

        <div className="side-panel">
          <div className="panel-title">Posities</div>
          {Object.keys(holdings).length === 0 && <div className="empty-note">Nog geen posities geopend.</div>}
          {Object.entries(holdings).map(([sym, h]) => {
            const t = TICKERS.find((x) => x.symbol === sym);
            const cur = prices[sym];
            const diff = ((cur - h.avg) / h.avg) * 100;
            return (
              <div className="holding-row" key={sym}>
                <div>
                  <div className="holding-symbol">{sym}</div>
                  <div className="holding-qty">{h.qty} stuks · gem. {fmtPrice(h.avg, t)}</div>
                </div>
                <div className={`ticker-change ${diff >= 0 ? "up" : "down"}`}>
                  {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                </div>
              </div>
            );
          })}

          <div className="panel-title" style={{ marginTop: 18 }}>Succespercentage</div>
          <div className="success-ring-row">
            <div className="success-ring" style={{ "--pct": successRate ?? 0 }}>
              <span>{successRate === null ? "–" : `${successRate}%`}</span>
            </div>
            <div className="success-note">
              {successRate === null
                ? "Nog geen posities of verkopen — percentage verschijnt zodra de AI (of jij) iets koopt of verkoopt."
                : "Percentage posities met winst — inclusief openstaande posities tegen actuele koers, en afgesloten verkopen."}
            </div>
          </div>
        </div>
      </div>

      <div className="panel-title" style={{ marginTop: 20 }}>Transactiegeschiedenis</div>
      <div className="tx-list">
        {txs.length === 0 && <div className="empty-note">Nog geen transacties.</div>}
        {txs.map((t) => (
          <div className="tx-row" key={t.id}>
            <span className={`tx-type ${t.type}`}>
              {t.type === "buy" ? "Koop" : t.type === "sell" ? "Verkoop" : "Storting"}
            </span>
            <span className="tx-symbol">{t.symbol}</span>
            <span className="tx-qty">{t.type === "deposit" ? "" : `${t.qty}x`}</span>
            <span className="tx-price">
              {t.type === "deposit" ? fmtMoney(t.price) : fmtPrice(t.price, TICKERS.find(x => x.symbol === t.symbol))}
            </span>
            <span className="tx-time">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TESTING_CSS = `
  .deposit-box { background:#131F2E; border:1px solid rgba(125,217,179,0.25); border-radius:12px; padding:12px 16px;
    display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:14px; flex-wrap:wrap; }
  .deposit-label { font-size:12px; color:#B8C9DB; }
  .deposit-controls { display:flex; align-items:center; gap:6px; }
  .deposit-prefix { color:#7C93AC; font-size:13px; }
  .deposit-input { width:100px; background:#0E1A28; color:#F4F8FB; border:1px solid rgba(142,202,230,0.2); border-radius:8px; padding:8px; font-size:12.5px; }
  .stat-row { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:18px; }
  .stat-card { background:#131F2E; border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:6px; }
  .stat-label { font-size:11px; color:#5A7391; text-transform:uppercase; letter-spacing:0.06em; }
  .stat-value { font-family:'JetBrains Mono', monospace; font-size:17px; color:#F4F8FB; }
  .stat-value.pos { color:#7DD9B3; }
  .stat-value.neg { color:#E8846B; }
  .testing-grid { display:grid; grid-template-columns: 1.6fr 1fr; gap:18px; }
  .chart-panel, .side-panel { background:#131F2E; border:1px solid rgba(142,202,230,0.12); border-radius:16px; padding:18px 20px; }
  .panel-title { font-size:12px; color:#8ECAE6; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; font-weight:600; }
  .trade-box { display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:#0E1A28; border-radius:10px; padding:10px 12px; }
  .trade-select { background:#0B1420; color:#F4F8FB; border:1px solid rgba(142,202,230,0.2); border-radius:8px; padding:8px 10px; font-size:12.5px; }
  .trade-price { font-family:'JetBrains Mono', monospace; color:#F4F8FB; font-size:13px; min-width:80px; }
  .trade-qty { width:60px; background:#0B1420; color:#F4F8FB; border:1px solid rgba(142,202,230,0.2); border-radius:8px; padding:8px; font-size:12.5px; }
  .trade-btn { border:none; border-radius:8px; padding:9px 16px; font-weight:600; font-size:12.5px; cursor:pointer; }
  .trade-btn.buy { background:#7DD9B3; color:#0B1420; }
  .trade-btn.sell { background:#E8846B; color:#0B1420; }
  .empty-note { color:#5A7391; font-size:12.5px; padding:8px 0; }
  .holding-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(142,202,230,0.08); }
  .holding-symbol { font-family:'JetBrains Mono', monospace; font-weight:600; color:#F4F8FB; font-size:13px; }
  .holding-qty { font-size:11px; color:#7C93AC; margin-top:2px; }
  .success-ring-row { display:flex; align-items:center; gap:16px; }
  .success-ring { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    background: conic-gradient(#7DD9B3 calc(var(--pct) * 1%), #1B2A3B 0); flex-shrink:0; }
  .success-ring span { background:#131F2E; width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:13px; color:#F4F8FB; font-family:'JetBrains Mono', monospace; }
  .success-note { font-size:11.5px; color:#7C93AC; line-height:1.5; }
  .tx-list { display:flex; flex-direction:column; gap:2px; }
  .tx-row { display:grid; grid-template-columns: 70px 60px 50px 1fr 90px; align-items:center; gap:8px;
    background:#131F2E; border-radius:8px; padding:9px 14px; font-size:12px; }
  .tx-type { font-weight:600; font-size:11px; padding:3px 8px; border-radius:6px; text-align:center; }
  .tx-type.buy { background:rgba(125,217,179,0.15); color:#7DD9B3; }
  .tx-type.sell { background:rgba(232,132,107,0.15); color:#E8846B; }
  .tx-type.deposit { background:rgba(142,202,230,0.15); color:#8ECAE6; }
  .tx-symbol { font-family:'JetBrains Mono', monospace; color:#F4F8FB; font-weight:600; }
  .tx-qty { color:#B8C9DB; }
  .tx-price { color:#F4F8FB; font-family:'JetBrains Mono', monospace; }
  .tx-time { color:#5A7391; text-align:right; font-family:'JetBrains Mono', monospace; }
`;

/* ---------- live mode ---------- */

function LiveMode() {
  const [brokerConnected, setBrokerConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [maxPerTrade, setMaxPerTrade] = useState(500);
  const [maxDailyLossPct, setMaxDailyLossPct] = useState(5);
  const [markets, setMarkets] = useState({ stocks: true, crypto: true, forex: false });
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [log, setLog] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [tick, setTick] = useState(0);
  const lastAdviceRef = useRef({});

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    return TICKERS.map((t) => {
      const hist = genHistory({ ...t, seed: t.seed + 500 + Math.floor(tick / 3) });
      const ind = computeIndicators(hist);
      const advice = generateAdvice(ind, t);
      return { ticker: t, ind, advice };
    });
  }, [tick]);

  function pushLog(text, type = "info") {
    setLog((l) => [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString("nl-NL"), text, type }, ...l].slice(0, 40));
  }

  function toggleExpand(symbol) {
    setExpanded((cur) => (cur === symbol ? null : symbol));
  }

  function connectBroker() {
    setConnecting(true);
    setTimeout(() => {
      setBrokerConnected(true);
      setConnecting(false);
      pushLog("Broker gekoppeld (demo-verbinding, geen echte broker).", "ok");
    }, 1100);
  }

  function disconnectBroker() {
    setBrokerConnected(false);
    setLiveEnabled(false);
    pushLog("Broker losgekoppeld. Live handelen automatisch uitgeschakeld.", "warn");
  }

  function toggleLive() {
    if (!brokerConnected) return;
    if (!liveEnabled && !confirmChecked) return;
    setLiveEnabled((v) => {
      const next = !v;
      pushLog(next ? "Live handelen ingeschakeld." : "Live handelen uitgeschakeld.", next ? "ok" : "warn");
      return next;
    });
  }

  // Log AI signals as "would execute" — never actually trades, since no real broker exists here.
  useEffect(() => {
    if (!liveEnabled) return;
    rows.forEach(({ ticker, ind, advice }) => {
      const prev = lastAdviceRef.current[ticker.symbol];
      if (advice.advice !== "HOUDEN" && advice.advice !== prev) {
        const marketAllowed = ticker.symbol === "BTC" ? markets.crypto : markets.stocks;
        if (marketAllowed) {
          pushLog(
            `Signaal ${ticker.symbol}: ${advice.advice} (${advice.confidence}% betrouwbaarheid, max $${maxPerTrade}/transactie) — niet uitgevoerd, geen broker-API gekoppeld.`,
            advice.advice === "MOGELIJK KOPEN" ? "buy" : "sell"
          );
        }
      }
      lastAdviceRef.current[ticker.symbol] = advice.advice;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, liveEnabled]);

  return (
    <div className="live-wrap">
      <style>{LIVE_CSS}</style>

      <div className="live-banner">
        <ShieldAlert size={15} />
        Deze demo voert nooit echte orders uit — er is geen broker-API gekoppeld. Alles hieronder is functioneel maar gesimuleerd.
      </div>

      <div className="live-grid">
        <div className="live-panel">
          <div className="panel-title">Broker-koppeling</div>
          <div className="broker-row">
            <div className={`broker-dot ${brokerConnected ? "on" : "off"}`} />
            <div>
              <div className="broker-status">{brokerConnected ? "Gekoppeld (demo)" : "Niet gekoppeld"}</div>
              <div className="broker-sub">{brokerConnected ? "Snowy_Tracks Demo Broker" : "Koppel eerst een broker om live te kunnen handelen"}</div>
            </div>
            {!brokerConnected ? (
              <button className="live-btn primary" onClick={connectBroker} disabled={connecting}>
                {connecting ? "Bezig met koppelen…" : "Koppel broker"}
              </button>
            ) : (
              <button className="live-btn ghost" onClick={disconnectBroker}>Loskoppelen</button>
            )}
          </div>

          <div className="panel-title" style={{ marginTop: 20 }}>Risicolimieten</div>
          <div className="form-row">
            <label>Maximaal bedrag per transactie</label>
            <div className="input-suffix">
              <span>$</span>
              <input type="number" min="1" value={maxPerTrade} onChange={(e) => setMaxPerTrade(Math.max(1, Number(e.target.value) || 1))} />
            </div>
          </div>
          <div className="form-row">
            <label>Maximaal dagverlies</label>
            <div className="input-suffix">
              <input type="number" min="1" max="100" value={maxDailyLossPct} onChange={(e) => setMaxDailyLossPct(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
              <span>%</span>
            </div>
          </div>
          <div className="form-row">
            <label>Toegestane markten</label>
            <div className="checkbox-row">
              {[["stocks", "Aandelen"], ["crypto", "Crypto"], ["forex", "Forex"]].map(([key, label]) => (
                <button
                  key={key}
                  className={`chip-toggle ${markets[key] ? "active" : ""}`}
                  onClick={() => setMarkets((m) => ({ ...m, [key]: !m[key] }))}
                >
                  {markets[key] && <Check size={11} />} {label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-title" style={{ marginTop: 20 }}>Activeren</div>
          {!liveEnabled && (
            <label className="confirm-row">
              <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} />
              Ik begrijp dat Live Mode met echt geld zou werken zodra er een echte broker-API gekoppeld is.
            </label>
          )}
          <button
            className={`toggle-live ${liveEnabled ? "on" : ""}`}
            onClick={toggleLive}
            disabled={!brokerConnected || (!liveEnabled && !confirmChecked)}
          >
            <span className="toggle-knob" />
            {liveEnabled ? "Live handelen: AAN" : "Live handelen: UIT"}
          </button>
        </div>

        <div className="live-panel">
          <div className="panel-title">Live signalen {liveEnabled ? "(actief)" : "(gepauzeerd)"}</div>
          <div className="signal-list">
            {rows.map(({ ticker, ind, advice }) => {
              const isOpen = expanded === ticker.symbol;
              return (
                <div key={ticker.symbol} className={`signal-item ${isOpen ? "open" : ""}`}>
                  <button className="signal-row" onClick={() => toggleExpand(ticker.symbol)}>
                    <div className="signal-id">
                      <span className="signal-symbol">{ticker.symbol}</span>
                      <span className="signal-name">{ticker.name}</span>
                      <span className="signal-price">{fmtPrice(ind.last, ticker)}</span>
                    </div>
                    <div className="signal-right">
                      <AdviceTag advice={advice.advice} />
                      <ChevronRight size={14} className="signal-chevron" />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="signal-detail">
                      <div className="advice-conf">
                        <span>Betrouwbaarheid</span>
                        <div className="conf-bar"><div className="conf-fill" style={{ width: `${advice.confidence}%` }} /></div>
                        <span className="conf-num">{advice.confidence}%</span>
                      </div>
                      <ul className="advice-reasons">
                        {advice.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                      <div className="advice-risk">
                        <ShieldAlert size={13} /> Risico: <b>{advice.risk}</b>
                      </div>
                      <div className="signal-action-note">
                        {advice.advice === "MOGELIJK KOPEN" && `Zou kopen tot max $${maxPerTrade} in ${ticker.symbol} als Live Mode actief is en ${ticker.symbol === "BTC" ? "crypto" : "aandelen"} is toegestaan.`}
                        {advice.advice === "MOGELIJK VERKOPEN" && `Zou een openstaande positie in ${ticker.symbol} sluiten als Live Mode actief is.`}
                        {advice.advice === "HOUDEN" && `Geen actie — AI houdt ${ticker.symbol} momenteel aan.`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="panel-title" style={{ marginTop: 18 }}>Activiteitenlog</div>
          <div className="live-log">
            {log.length === 0 && <div className="empty-note">Nog geen activiteit.</div>}
            {log.map((l) => (
              <div key={l.id} className={`live-log-row ${l.type}`}>
                <span className="live-log-time">{l.time}</span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const LIVE_CSS = `
  .live-banner { display:flex; align-items:center; gap:8px; background:rgba(232,132,107,0.1); border:1px solid rgba(232,132,107,0.3);
    color:#E8846B; font-size:12px; padding:10px 14px; border-radius:10px; margin-bottom:16px; line-height:1.5; }
  .live-grid { display:grid; grid-template-columns: 1fr 1fr; gap:18px; align-items:start; }
  .live-panel { background:#131F2E; border:1px solid rgba(142,202,230,0.12); border-radius:16px; padding:18px 20px; }
  .broker-row { display:flex; align-items:center; gap:12px; background:#0E1A28; border-radius:10px; padding:12px 14px; }
  .broker-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
  .broker-dot.on { background:#7DD9B3; box-shadow:0 0 8px rgba(125,217,179,0.6); }
  .broker-dot.off { background:#5A7391; }
  .broker-status { color:#F4F8FB; font-size:13px; font-weight:600; }
  .broker-sub { color:#7C93AC; font-size:11px; margin-top:2px; }
  .broker-row > div:nth-child(2) { flex:1; }
  .live-btn { border:none; border-radius:8px; padding:9px 14px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; }
  .live-btn.primary { background:#8ECAE6; color:#0B1420; }
  .live-btn.primary:disabled { opacity:0.6; cursor:not-allowed; }
  .live-btn.ghost { background:none; border:1px solid rgba(232,132,107,0.4); color:#E8846B; }
  .form-row { margin-bottom:14px; }
  .form-row label { display:block; font-size:12px; color:#B8C9DB; margin-bottom:6px; }
  .input-suffix { display:flex; align-items:center; gap:8px; background:#0E1A28; border:1px solid rgba(142,202,230,0.15);
    border-radius:8px; padding:8px 12px; width:fit-content; }
  .input-suffix span { color:#5A7391; font-size:12.5px; }
  .input-suffix input { background:none; border:none; outline:none; color:#F4F8FB; font-family:'JetBrains Mono', monospace; font-size:13px; width:90px; }
  .checkbox-row { display:flex; gap:8px; flex-wrap:wrap; }
  .chip-toggle { display:flex; align-items:center; gap:5px; background:#0E1A28; border:1px solid rgba(142,202,230,0.15);
    color:#7C93AC; padding:7px 12px; border-radius:20px; font-size:12px; cursor:pointer; }
  .chip-toggle.active { border-color:#7DD9B3; color:#7DD9B3; background:rgba(125,217,179,0.08); }
  .confirm-row { display:flex; align-items:flex-start; gap:8px; font-size:11.5px; color:#7C93AC; line-height:1.5; margin-bottom:12px; cursor:pointer; }
  .confirm-row input { margin-top:2px; }
  .toggle-live { width:100%; display:flex; align-items:center; gap:10px; background:#0E1A28; border:1px solid rgba(142,202,230,0.2);
    color:#7C93AC; padding:11px 14px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; }
  .toggle-live:disabled { opacity:0.45; cursor:not-allowed; }
  .toggle-live.on { border-color:#7DD9B3; color:#7DD9B3; background:rgba(125,217,179,0.08); }
  .toggle-knob { width:30px; height:16px; border-radius:20px; background:#1B2A3B; position:relative; flex-shrink:0; transition:background .15s; }
  .toggle-knob::after { content:''; position:absolute; top:2px; left:2px; width:12px; height:12px; border-radius:50%; background:#5A7391; transition: transform .15s, background .15s; }
  .toggle-live.on .toggle-knob { background:rgba(125,217,179,0.25); }
  .toggle-live.on .toggle-knob::after { transform: translateX(14px); background:#7DD9B3; }
  .signal-list { display:flex; flex-direction:column; gap:6px; }
  .signal-item { background:#0E1A28; border-radius:8px; overflow:hidden; }
  .signal-item.open { outline:1px solid rgba(142,202,230,0.25); }
  .signal-row { width:100%; display:flex; justify-content:space-between; align-items:center; background:none; border:none;
    padding:9px 12px; cursor:pointer; text-align:left; }
  .signal-id { display:flex; align-items:center; gap:10px; min-width:0; }
  .signal-symbol { font-family:'JetBrains Mono', monospace; font-weight:600; color:#F4F8FB; font-size:13px; flex-shrink:0; }
  .signal-name { color:#7C93AC; font-size:11.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .signal-price { font-family:'JetBrains Mono', monospace; color:#7C93AC; font-size:12px; flex-shrink:0; }
  .signal-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
  .signal-chevron { color:#5A7391; transition: transform .15s; }
  .signal-item.open .signal-chevron { transform: rotate(90deg); }
  .signal-detail { padding:4px 14px 14px; border-top:1px solid rgba(142,202,230,0.08); margin-top:2px; }
  .signal-action-note { font-size:11.5px; color:#8ECAE6; background:rgba(142,202,230,0.08); border-radius:8px; padding:9px 11px; margin-top:8px; line-height:1.5; }
  .live-log { display:flex; flex-direction:column; gap:5px; max-height:180px; overflow:auto; }
  .live-log-row { font-size:11.5px; color:#B8C9DB; display:flex; gap:8px; line-height:1.5; padding:6px 10px; background:#0E1A28; border-radius:6px; }
  .live-log-row.ok { border-left:2px solid #7DD9B3; }
  .live-log-row.warn { border-left:2px solid #E8846B; }
  .live-log-row.buy { border-left:2px solid #7DD9B3; }
  .live-log-row.sell { border-left:2px solid #E8846B; }
  .live-log-time { color:#5A7391; font-family:'JetBrains Mono', monospace; flex-shrink:0; }
`;

/* ---------- window manager ---------- */

const APPS = [
  { key: "analyse", label: "Markt Explorer", icon: LayoutDashboard, mode: "analyse", w: 760, h: 600 },
  { key: "testing", label: "Testing", icon: RefreshCw, mode: "testing", w: 780, h: 600 },
  { key: "live", label: "Live", icon: Wallet, mode: "live", w: 760, h: 580 },
  { key: "portfolio", label: "Portfolio", icon: History, mode: null, w: 520, h: 320 },
  { key: "news", label: "Nieuws", icon: Newspaper, mode: null, w: 480, h: 300 },
  { key: "settings", label: "Instellingen", icon: SettingsIcon, mode: null, w: 480, h: 300 },
];

function windowContent(win, onOpenAsset) {
  if (win.type === "asset") {
    const asset = ASSETS_BY_SYMBOL[win.assetSymbol];
    return asset ? <AssetDetailWindow asset={asset} /> : <PlaceholderPanel icon={AlertTriangle} title="Niet gevonden" text="Dit activum bestaat niet (meer) in de dataset." />;
  }
  const key = win.key;
  if (key === "analyse") return <MarketExplorer onOpenAsset={onOpenAsset} />;
  if (key === "testing") return <TestingMode />;
  if (key === "live") return <LiveMode />;
  if (key === "portfolio") return (
    <PlaceholderPanel icon={History} title="Portfolio-overzicht"
      text="In de volledige versie toont dit venster je samengevoegde posities uit Testing en Live Mode, inclusief een AI-risicoanalyse van je totale portefeuille." />
  );
  if (key === "news") return (
    <PlaceholderPanel icon={Newspaper} title="Marktnieuws"
      text="Hier verschijnt straks live financieel nieuws per aandeel, gekoppeld aan een echte nieuws-API." />
  );
  if (key === "settings") return (
    <PlaceholderPanel icon={SettingsIcon} title="Instellingen"
      text="Risicolimieten, maximaal bedrag per transactie en toegestane markten voor Live Mode komen hier — pas actief zodra de broker-koppeling gebouwd is." />
  );
  return null;
}

function Window({ win, isTop, onFocus, onClose, onMove, onResize, surfaceRef, onOpenAsset }) {
  function getBounds() {
    const el = surfaceRef.current;
    return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 1200, h: 600 };
  }

  function startDrag(e) {
    onFocus();
    const startX = e.clientX, startY = e.clientY;
    const origX = win.x, origY = win.y;
    const { w: boundW, h: boundH } = getBounds();
    const minVisible = 60; // px of window that must always stay reachable
    function onMouseMove(ev) {
      let nx = origX + (ev.clientX - startX);
      let ny = origY + (ev.clientY - startY);
      nx = Math.min(Math.max(nx, -(win.w - minVisible)), boundW - minVisible);
      ny = Math.min(Math.max(ny, 0), boundH - 32);
      onMove(win.key, nx, ny);
    }
    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function startResize(e) {
    e.stopPropagation();
    onFocus();
    const startX = e.clientX, startY = e.clientY;
    const origW = win.w, origH = win.h;
    function onMouseMove(ev) {
      onResize(
        win.key,
        Math.max(340, origW + (ev.clientX - startX)),
        Math.max(220, origH + (ev.clientY - startY))
      );
    }
    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  const isAsset = win.type === "asset";
  const app = isAsset ? null : APPS.find((a) => a.key === win.key);
  const asset = isAsset ? ASSETS_BY_SYMBOL[win.assetSymbol] : null;
  const Icon = isAsset ? TrendingUp : app.icon;
  const title = isAsset ? (asset ? `${asset.symbol} — ${asset.name}` : win.assetSymbol) : app.label;

  return (
    <div
      className={`os-window ${isTop ? "top" : ""}`}
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      onMouseDown={onFocus}
    >
      <div className="os-titlebar" onMouseDown={startDrag}>
        <div className="os-title">
          <Icon size={13} />
          <span>{title}</span>
          {!isAsset && app.mode && <ModeBadge mode={app.mode} />}
        </div>
        <button className="os-close" onMouseDown={(e) => e.stopPropagation()} onClick={() => onClose(win.key)}>
          <X size={13} />
        </button>
      </div>
      <div className="os-body">{windowContent(win, onOpenAsset)}</div>
      <div className="os-resize-handle" onMouseDown={startResize} />
    </div>
  );
}

function Dashboard({ onLock }) {
  const [windows, setWindows] = useState([
    { key: "analyse", x: 40, y: 30, w: 760, h: 600, z: 1 },
  ]);
  const zRef = useRef(2);
  const surfaceRef = useRef(null);

  function clampIntoView(win) {
    const el = surfaceRef.current;
    if (!el) return win;
    const boundW = el.clientWidth, boundH = el.clientHeight;
    const minVisible = 60;
    const x = Math.min(Math.max(win.x, -(win.w - minVisible)), Math.max(0, boundW - minVisible));
    const y = Math.min(Math.max(win.y, 0), Math.max(0, boundH - 32));
    return { ...win, x, y };
  }

  function openApp(key) {
    setWindows((ws) => {
      const existing = ws.find((w) => w.key === key);
      if (existing) {
        zRef.current += 1;
        return ws.map((w) => (w.key === key ? clampIntoView({ ...w, z: zRef.current }) : w));
      }
      const app = APPS.find((a) => a.key === key);
      zRef.current += 1;
      const offset = ws.length * 26;
      return [...ws, { key, x: 60 + offset, y: 40 + offset, w: app.w, h: app.h, z: zRef.current }];
    });
  }

  function openAsset(asset) {
    const key = `asset:${asset.symbol}`;
    setWindows((ws) => {
      const existing = ws.find((w) => w.key === key);
      if (existing) {
        zRef.current += 1;
        return ws.map((w) => (w.key === key ? clampIntoView({ ...w, z: zRef.current }) : w));
      }
      zRef.current += 1;
      const offset = (ws.length * 22) % 200;
      return [...ws, { key, type: "asset", assetSymbol: asset.symbol, x: 90 + offset, y: 60 + offset, w: 640, h: 640, z: zRef.current }];
    });
  }

  function closeApp(key) {
    setWindows((ws) => ws.filter((w) => w.key !== key));
  }

  function focusApp(key) {
    zRef.current += 1;
    const z = zRef.current;
    setWindows((ws) => ws.map((w) => (w.key === key ? { ...w, z } : w)));
  }

  function moveApp(key, x, y) {
    setWindows((ws) => ws.map((w) => (w.key === key ? { ...w, x: Math.max(0, x), y: Math.max(0, y) } : w)));
  }

  function resizeApp(key, w, h) {
    setWindows((ws) => ws.map((win) => (win.key === key ? { ...win, w, h } : win)));
  }

  const topKey = windows.reduce((top, w) => (!top || w.z > top.z ? w : top), null)?.key;

  return (
    <div className="desktop-wrap">
      <style>{DASH_CSS}</style>

      <div className="desktop-surface" ref={surfaceRef}>
        {[...Array(10)].map((_, i) => (
          <Snowflake key={i} className="desk-flake" size={12 + (i % 3) * 6}
            style={{ left: `${(i * 71) % 100}%`, top: `${(i * 43) % 100}%`, opacity: 0.05 + (i % 3) * 0.03 }} />
        ))}

        {windows.map((w) => (
          <Window
            key={w.key}
            win={w}
            isTop={w.key === topKey}
            onFocus={() => focusApp(w.key)}
            onClose={closeApp}
            onMove={moveApp}
            onResize={resizeApp}
            surfaceRef={surfaceRef}
            onOpenAsset={openAsset}
          />
        ))}

        {windows.length === 0 && (
          <div className="desk-empty">Alle vensters gesloten. Open er een via de taakbalk hieronder.</div>
        )}
      </div>

      <div className="taskbar">
        <div className="taskbar-brand">
          <Snowflake size={16} color="#8ECAE6" />
          <span>Snowy_Tracks</span>
        </div>
        <div className="taskbar-apps">
          {APPS.map((a) => {
            const Icon = a.icon;
            const isOpen = windows.some((w) => w.key === a.key);
            return (
              <button key={a.key} className={`taskbar-btn ${isOpen ? "open" : ""}`} onClick={() => openApp(a.key)}>
                <Icon size={15} />
                <span>{a.label}</span>
                {a.mode && <ModeBadge mode={a.mode} />}
              </button>
            );
          })}
        </div>
        <button className="lock-btn" onClick={onLock}>
          <Lock size={14} /> Vergrendelen
        </button>
      </div>
    </div>
  );
}

const DASH_CSS = `
  .desktop-wrap { display:flex; flex-direction:column; height: 680px; background:#0B1420; font-family:'Inter', system-ui, sans-serif; border-radius:16px; overflow:hidden; }
  .desktop-surface { position:relative; flex:1; overflow:hidden;
    background: radial-gradient(ellipse at 50% -10%, #14263a 0%, #0b1420 60%), #0b1420; }
  .desk-flake { position:absolute; color: rgba(228,242,255,0.4); pointer-events:none; }
  .desk-empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#5A7391; font-size:13px; }
  .os-window { position:absolute; display:flex; flex-direction:column; background:#131F2E; border:1px solid rgba(142,202,230,0.15);
    border-radius:12px; box-shadow: 0 20px 50px rgba(0,0,0,0.45); overflow:hidden; }
  .os-window.top { border-color: rgba(142,202,230,0.4); box-shadow: 0 24px 60px rgba(0,0,0,0.6); }
  .os-titlebar { display:flex; align-items:center; justify-content:space-between; padding:9px 12px; background:#0E1A28;
    border-bottom:1px solid rgba(142,202,230,0.1); cursor:move; user-select:none; flex-shrink:0; }
  .os-title { display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; color:#F4F8FB; }
  .os-close { background:none; border:none; color:#7C93AC; cursor:pointer; padding:4px; border-radius:6px; display:flex; }
  .os-close:hover { background:rgba(232,132,107,0.15); color:#E8846B; }
  .os-body { flex:1; overflow:auto; padding:18px 20px; }
  .os-resize-handle { position:absolute; right:0; bottom:0; width:16px; height:16px; cursor:nwse-resize;
    background: linear-gradient(135deg, transparent 50%, rgba(142,202,230,0.35) 50%); }
  .mode-badge { display:inline-flex; align-items:center; gap:4px; font-size:9.5px; color: var(--badge-color); border:1px solid var(--badge-color);
    padding: 2px 7px; border-radius: 20px; font-weight:600; letter-spacing:0.02em; }
  .taskbar { display:flex; align-items:center; gap:18px; padding:10px 16px; background:#0E1A28; border-top:1px solid rgba(142,202,230,0.12); flex-shrink:0; }
  .taskbar-brand { display:flex; align-items:center; gap:7px; font-family:'Space Grotesk', sans-serif; font-weight:600; color:#F4F8FB; font-size:13px; }
  .taskbar-apps { display:flex; gap:6px; flex:1; overflow-x:auto; }
  .taskbar-btn { display:flex; align-items:center; gap:7px; background:none; border:1px solid transparent; color:#7C93AC;
    padding:7px 11px; border-radius:9px; font-size:12px; cursor:pointer; white-space:nowrap; transition: background .15s, border-color .15s, color .15s; }
  .taskbar-btn:hover { background: rgba(142,202,230,0.08); color:#F4F8FB; }
  .taskbar-btn.open { border-color: rgba(142,202,230,0.35); color:#8ECAE6; }
  .lock-btn { display:flex; align-items:center; gap:7px; background:none; border:1px solid rgba(142,202,230,0.15);
    color:#7C93AC; padding:8px 12px; border-radius:9px; font-size:12px; cursor:pointer; white-space:nowrap; }
  .lock-btn:hover { border-color:#8ECAE6; color:#8ECAE6; }
`;

/* ---------- app root ---------- */

export default function SnowyTracks() {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {!unlocked
        ? <LoginScreen onUnlock={() => setUnlocked(true)} />
        : <Dashboard onLock={() => setUnlocked(false)} />}
    </div>
  );
}
