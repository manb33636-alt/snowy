import React, { useState, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  Lock, TrendingUp, ShieldAlert, Search, Settings as SettingsIcon,
  History, Wallet, Newspaper, ChevronRight, RefreshCw, AlertTriangle, Check, X,
  LayoutDashboard, Snowflake, ArrowUpRight, ArrowDownRight, Circle, Square, Diamond, Info,
  Globe, KeyRound, Trash2, Bot, RotateCcw
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

/* ============================================================================
   Snowy_Tracks v2 — persoonlijke marktassistent met ECHTE live data.

   Databronnen (allemaal gratis, direct vanuit de browser):
   • Crypto + goud (PAXG):  Binance public API — live, geen key nodig
   • Forex:                 Frankfurter.dev (ECB-dagkoersen) — live, geen key nodig
   • Aandelen/ETF's:        Twelve Data — gratis API-key nodig (twelvedata.com,
                            800 credits/dag, 8 credits/min, 1 credit per symbool).
                            Key invullen bij Instellingen; de app doseert automatisch.
   Zonder Twelve Data-key draaien aandelen/ETF's/indices op een ingebakken
   snapshot + simulatie en staan ze duidelijk gemarkeerd als "SIM".

   Er wordt NOOIT echt gehandeld: Testing = papertrading met nepgeld,
   Live Mode logt alleen signalen (er is bewust geen broker-koppeling).
   ============================================================================ */

const DEMO_PASSWORD = "sneeuw123";

const BINANCE = "https://data-api.binance.vision/api/v3";
const FRANKFURTER = "https://api.frankfurter.dev/v1";
const TD_BASE = "https://api.twelvedata.com";
const TD_KEY_STORAGE = "snowy_td_key";
const PAPER_STORAGE = "snowy_paper_v2";

/* Snapshot-prijzen (fallback als er geen live bron is) — datum zie SNAPSHOT_DATE. */
const SNAPSHOT_DATE = "19 juli 2026";
const SNAPSHOT = {
  AAPL: { price: 333.74, prev: 333.26001 },
  MSFT: { price: 393.82, prev: 401.100006 },
  NVDA: { price: 202.81, prev: 207.399994 },
  TSLA: { price: 380.84, prev: 391.059998 },
  AMZN: { price: 247.23, prev: 249.889999 },
  META: { price: 646.01, prev: 664.539978 },
  GOOGL: { price: 346.77, prev: 354.459991 },
  ASML: { price: 1747.58, prev: 1784.869995 },
  NFLX: { price: 68.95, prev: 74.349998 },
  AMD: { price: 495.76, prev: 500.940002 },
  INTC: { price: 95.04, prev: 96.980003 },
  ORCL: { price: 126.41, prev: 124.209999 },
  CRM: { price: 170.77, prev: 172.679993 },
  ADBE: { price: 237.25, prev: 235.309998 },
  PYPL: { price: 56.56, prev: 56.73 },
  UBER: { price: 72.46, prev: 74.040001 },
  SHOP: { price: 123.56, prev: 125.059998 },
  COIN: { price: 157.12, prev: 160.490005 },
  JPM: { price: 341.1, prev: 343.149994 },
  V: { price: 358.56, prev: 365.140015 },
  MA: { price: 543.6, prev: 551.539978 },
  KO: { price: 81.56, prev: 84.919998 },
  PEP: { price: 137.12, prev: 139.429993 },
  WMT: { price: 114.24, prev: 114.949997 },
  DIS: { price: 97.67, prev: 99.709999 },
  BA: { price: 214.03, prev: 214.339996 },
  XOM: { price: 147.36, prev: 145.949997 },
  CVX: { price: 187.38, prev: 183.860001 },
  PFE: { price: 25.05, prev: 25.139999 },
  JNJ: { price: 253.04, prev: 249.970001 },
  NKE: { price: 43.76, prev: 44.57 },
  SBUX: { price: 105.49, prev: 108.370003 },
  IBM: { price: 212.67, prev: 219.050003 },
  QCOM: { price: 171.78, prev: 170.610001 },
  TXN: { price: 284.02, prev: 291.220001 },
  BABA: { price: 114.97, prev: 117.489998 },
  SONY: { price: 21.12, prev: 21.389999 },
  ABNB: { price: 145.98, prev: 147.800003 },
  SNAP: { price: 4.53, prev: 4.69 },
  RIVN: { price: 17.455, prev: 17.09 },
  PLTR: { price: 132.38, prev: 134.440002 },
  SPY: { price: 743.29, prev: 750.719971 },
  QQQ: { price: 695.33, prev: 705.940002 },
  VOO: { price: 683.17, prev: 690.140015 },
  VTI: { price: 367.01, prev: 370.579987 },
  IWM: { price: 294.04, prev: 295.589996 },
  DIA: { price: 520.81, prev: 524.830017 },
  ARKK: { price: 75.2, prev: 76.669998 },
  XLK: { price: 175.59, prev: 177.520004 },
  XLF: { price: 56.26, prev: 56.75 },
  XLE: { price: 57.68, prev: 57.02 },
  GLD: { price: 368.41, prev: 364.959991 },
  SLV: { price: 50.78, prev: 50.389999 },
  EEM: { price: 63.29, prev: 64.190002 },
  VEA: { price: 69.7, prev: 70.029999 },
  BND: { price: 72.86, prev: 72.809998 },
  SPX: { price: 7457.69, prev: 7533.77002 },
  IXIC: { price: 25520.244, prev: 25881.949219 },
  DJI: { price: 52146.42, prev: 52552.96875 },
  AEX: { price: 1091.97, prev: 1102.380005 },
  DAX: { price: 24830.98, prev: 24915.490234 },
  FTSE: { price: 10600.37, prev: 10572.200195 },
  N225: { price: 64141.12, prev: 66835.539062 },
  HSI: { price: 24562.24, prev: 25008.599609 },
  XAU: { price: 4018.8, prev: 3985.600098 },
  XAG: { price: 56.326, prev: 55.897999 },
  WTI: { price: 81.78, prev: 78.949997 },
  BRENT: { price: 88.1, prev: 84.230003 },
  NG: { price: 2.911, prev: 2.858 },
  HG: { price: 6.265, prev: 6.296 },
  ZW: { price: 682.75, prev: 674.75 },
  ZC: { price: 467.5, prev: 441.5 },
};

/* ---------- activa-catalogus ----------
   src: { kind: "binance", pair } | { kind: "fx", b, q } | { kind: "td", sym } | { kind: "sim" } */

const ASSET_CATEGORIES = {
  stocks: {
    label: "Aandelen",
    items: [
      ["AAPL", "Apple", 333.74, 0.014], ["MSFT", "Microsoft", 393.82, 0.012],
      ["NVDA", "NVIDIA", 118.4, 0.028], ["TSLA", "Tesla", 246.8, 0.038],
      ["AMZN", "Amazon", 198.3, 0.019], ["META", "Meta Platforms", 512.6, 0.024],
      ["GOOGL", "Alphabet (Google)", 172.9, 0.017], ["ASML", "ASML Holding", 812.5, 0.021],
      ["NFLX", "Netflix", 684.3, 0.022], ["AMD", "Advanced Micro Devices", 142.7, 0.031],
      ["INTC", "Intel", 31.8, 0.026], ["ORCL", "Oracle", 168.4, 0.016],
      ["CRM", "Salesforce", 296.2, 0.018], ["ADBE", "Adobe", 512.9, 0.017],
      ["PYPL", "PayPal", 78.4, 0.023], ["UBER", "Uber Technologies", 82.1, 0.021],
      ["SHOP", "Shopify", 96.5, 0.027], ["COIN", "Coinbase Global", 224.8, 0.042],
      ["JPM", "JPMorgan Chase", 218.6, 0.013], ["V", "Visa", 312.4, 0.011],
      ["MA", "Mastercard", 498.7, 0.011], ["KO", "Coca-Cola", 64.3, 0.008],
      ["PEP", "PepsiCo", 148.9, 0.009], ["WMT", "Walmart", 92.6, 0.01],
      ["DIS", "Walt Disney", 108.2, 0.018], ["BA", "Boeing", 178.5, 0.026],
      ["XOM", "ExxonMobil", 114.8, 0.015], ["CVX", "Chevron", 156.3, 0.014],
      ["PFE", "Pfizer", 27.4, 0.014], ["JNJ", "Johnson & Johnson", 156.9, 0.009],
      ["NKE", "Nike", 76.2, 0.019], ["SBUX", "Starbucks", 92.8, 0.017],
      ["IBM", "IBM", 232.1, 0.013], ["QCOM", "Qualcomm", 168.4, 0.02],
      ["TXN", "Texas Instruments", 198.6, 0.015], ["BABA", "Alibaba Group", 88.3, 0.029],
      ["SONY", "Sony Group", 24.6, 0.016], ["ABNB", "Airbnb", 132.7, 0.023],
      ["SNAP", "Snap Inc.", 11.2, 0.035], ["RIVN", "Rivian Automotive", 13.8, 0.044],
      ["PLTR", "Palantir Technologies", 38.6, 0.037],
    ].map(([symbol, name, base, vol]) => ({ symbol, name, base, vol, src: { kind: "td", sym: symbol } })),
  },
  crypto: {
    label: "Crypto",
    items: [
      ["BTC", "Bitcoin", 64482, 0.045], ["ETH", "Ethereum", 1856.7, 0.052],
      ["SOL", "Solana", 75.26, 0.068], ["BNB", "BNB", 570.5, 0.041],
      ["XRP", "XRP", 1.0916, 0.058], ["DOGE", "Dogecoin", 0.07233, 0.072],
      ["ADA", "Cardano", 0.1657, 0.055], ["AVAX", "Avalanche", 6.567, 0.062],
      ["LINK", "Chainlink", 8.316, 0.058], ["DOT", "Polkadot", 0.835, 0.056],
      ["POL", "Polygon (POL)", 0.08111, 0.061], ["LTC", "Litecoin", 47.05, 0.048],
      ["TRX", "TRON", 0.3257, 0.038], ["SHIB", "Shiba Inu", 0.00000414, 0.075],
      ["ATOM", "Cosmos", 1.495, 0.054], ["XLM", "Stellar", 0.1869, 0.049],
      ["NEAR", "NEAR Protocol", 1.936, 0.063], ["APT", "Aptos", 0.605, 0.067],
      ["ARB", "Arbitrum", 0.0881, 0.065], ["OP", "Optimism", 0.0954, 0.064],
      ["FIL", "Filecoin", 0.749, 0.059], ["ICP", "Internet Computer", 2.158, 0.066],
      ["ETC", "Ethereum Classic", 6.97, 0.051], ["HBAR", "Hedera", 0.06667, 0.057],
      ["UNI", "Uniswap", 3.525, 0.06], ["AAVE", "Aave", 89.37, 0.063],
    ].map(([symbol, name, base, vol]) => ({ symbol, name, base, vol, src: { kind: "binance", pair: symbol + "USDT" } })),
  },
  etfs: {
    label: "ETF's",
    items: [
      ["SPY", "SPDR S&P 500 ETF", 562.4, 0.009], ["QQQ", "Invesco QQQ (Nasdaq-100)", 482.1, 0.011],
      ["VOO", "Vanguard S&P 500 ETF", 516.8, 0.009], ["VTI", "Vanguard Total Stock Market", 268.3, 0.009],
      ["IWM", "iShares Russell 2000", 218.6, 0.014], ["DIA", "SPDR Dow Jones ETF", 412.9, 0.008],
      ["ARKK", "ARK Innovation ETF", 52.4, 0.032], ["XLK", "Technology Select Sector", 232.6, 0.014],
      ["XLF", "Financial Select Sector", 46.8, 0.012], ["XLE", "Energy Select Sector", 92.1, 0.017],
      ["GLD", "SPDR Gold Shares", 246.3, 0.01], ["SLV", "iShares Silver Trust", 28.6, 0.018],
      ["EEM", "iShares MSCI Emerging Markets", 44.2, 0.013], ["VEA", "Vanguard FTSE Developed Markets", 52.8, 0.01],
      ["BND", "Vanguard Total Bond Market", 72.4, 0.005],
    ].map(([symbol, name, base, vol]) => ({ symbol, name, base, vol, src: { kind: "td", sym: symbol } })),
  },
  forex: {
    label: "Forex",
    items: [
      ["EUR/USD", "Euro / US-dollar", 1.1435, 0.006, "EUR", "USD"],
      ["GBP/USD", "Brits pond / US-dollar", 1.268, 0.007, "GBP", "USD"],
      ["USD/JPY", "US-dollar / Japanse yen", 162.35, 0.007, "USD", "JPY"],
      ["USD/CHF", "US-dollar / Zwitserse frank", 0.807, 0.006, "USD", "CHF"],
      ["AUD/USD", "Australische dollar / US-dollar", 0.664, 0.008, "AUD", "USD"],
      ["USD/CAD", "US-dollar / Canadese dollar", 1.4023, 0.006, "USD", "CAD"],
      ["NZD/USD", "Nieuw-Zeelandse dollar / US-dollar", 0.612, 0.008, "NZD", "USD"],
      ["EUR/GBP", "Euro / Brits pond", 0.856, 0.005, "EUR", "GBP"],
      ["EUR/JPY", "Euro / Japanse yen", 185.6, 0.008, "EUR", "JPY"],
      ["USD/TRY", "US-dollar / Turkse lira", 47.14, 0.021, "USD", "TRY"],
    ].map(([symbol, name, base, vol, b, q]) => ({ symbol, name, base, vol, src: { kind: "fx", b, q } })),
  },
  commodities: {
    label: "Commodities",
    items: [
      { symbol: "XAU", name: "Goud (PAXG-proxy)", base: 4009.7, vol: 0.012, src: { kind: "binance", pair: "PAXGUSDT" } },
      { symbol: "XAG", name: "Zilver", base: 28.4, vol: 0.019, src: { kind: "td", sym: "XAG/USD" } },
      { symbol: "WTI", name: "Olie (WTI Crude)", base: 78.6, vol: 0.024, src: { kind: "sim" } },
      { symbol: "BRENT", name: "Olie (Brent Crude)", base: 82.4, vol: 0.023, src: { kind: "sim" } },
      { symbol: "NG", name: "Aardgas", base: 2.68, vol: 0.038, src: { kind: "sim" } },
      { symbol: "HG", name: "Koper", base: 4.42, vol: 0.017, src: { kind: "sim" } },
      { symbol: "ZW", name: "Tarwe", base: 612.4, vol: 0.021, src: { kind: "sim" } },
      { symbol: "ZC", name: "Maïs", base: 448.2, vol: 0.019, src: { kind: "sim" } },
    ],
  },
  indices: {
    label: "Indices",
    items: [
      ["SPX", "S&P 500", 6142.8, 0.009], ["IXIC", "NASDAQ Composite", 19842.3, 0.012],
      ["DJI", "Dow Jones Industrial Average", 42186.4, 0.008], ["AEX", "AEX (Amsterdam)", 912.6, 0.009],
      ["DAX", "DAX (Frankfurt)", 19624.8, 0.01], ["FTSE", "FTSE 100 (Londen)", 8246.2, 0.008],
      ["N225", "Nikkei 225 (Tokio)", 39482.6, 0.013], ["HSI", "Hang Seng (Hongkong)", 18642.4, 0.015],
    ].map(([symbol, name, base, vol]) => ({ symbol, name, base, vol, src: { kind: "sim" } })),
  },
};

const CATEGORY_ORDER = ["stocks", "crypto", "etfs", "forex", "commodities", "indices"];
const ALL_ASSETS = Object.entries(ASSET_CATEGORIES).flatMap(([catKey, cat]) =>
  cat.items.map((item) => ({ ...item, category: catKey, categoryLabel: cat.label }))
);
const ASSETS_BY_SYMBOL = Object.fromEntries(ALL_ASSETS.map((a) => [a.symbol, a]));
const FX_CURRENCIES = ["EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD", "TRY"];
const CORE_WATCH = ["BTC", "ETH", "SOL", "XRP", "LTC", "AAPL", "MSFT", "NVDA"];
// Uitgebreide, geordende pool waar de "aantal munten"-instelling uit put: eerst
// de oorspronkelijke 8 (voor continuïteit), dan de rest van de sleutelloze
// crypto (betrouwbaarder), dan de Twelve-Data-aandelen (hebben een key nodig).
const WATCH_POOL = [
  ...CORE_WATCH,
  ...ASSET_CATEGORIES.crypto.items.map((a) => a.symbol).filter((s) => !CORE_WATCH.includes(s)),
  ...ASSET_CATEGORIES.stocks.items.map((a) => a.symbol).filter((s) => !CORE_WATCH.includes(s)),
];
const WATCH_COUNT_STORAGE = "snowy_watch_count";
const TD_AUTO_WATCH = ["AAPL", "MSFT", "NVDA", "TSLA", "SPY", "QQQ"];

/* ---------- helpers ---------- */

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashSeed(str) {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 2147483647;
  return h + 13;
}

async function fetchJson(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    let body = null;
    try { body = await r.json(); } catch { body = null; }
    if (!r.ok) {
      // API-fouten met JSON-body (bv. Twelve Data {code:429}) teruggeven zodat de
      // caller ze kan classificeren; alleen bodyloze fouten gooien.
      if (body && typeof body === "object") return body;
      const err = new Error(`HTTP ${r.status}`);
      err.status = r.status;
      throw err;
    }
    if (body === null) throw new Error("Lege of ongeldige JSON-respons");
    return body;
  } finally {
    clearTimeout(t);
  }
}

function fmtMoney(n) {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPrice(n, asset) {
  if (n == null || !isFinite(n)) return "—";
  const cat = asset?.category;
  const prefix = cat === "forex" || cat === "indices" ? "" : "$";
  let str;
  if (cat === "forex") {
    // pip-niveau: 4 decimalen, JPY-achtige paren (>= 20) 3
    const d = n >= 20 ? 3 : 4;
    str = n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  } else if (n >= 1) {
    str = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (n >= 0.01) {
    str = n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  } else {
    str = n.toLocaleString("en-US", { maximumSignificantDigits: 3 });
  }
  return prefix + str;
}

function fmtCompact(n) {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function fmtQty(q) {
  return q.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* Binance-activa hebben één serie per interval ("BTC:1u"); andere bronnen één per symbool. */
function seriesFor(market, symbol, interval = "1u") {
  const a = ASSETS_BY_SYMBOL[symbol];
  if (a?.src.kind === "binance") return market.series[`${symbol}:${interval}`] || market.series[`${symbol}:1u`];
  return market.series[symbol];
}

/* ---------- technische indicatoren (op echte candles) ---------- */

function smaAt(closes, n) {
  const m = Math.min(n, closes.length);
  if (m === 0) return null;
  const s = closes.slice(-m);
  return s.reduce((a, b) => a + b, 0) / s.length;
}

function emaSeries(values, n) {
  if (!values.length) return [];
  const k = 2 / (n + 1);
  let e = values[0];
  const out = [e];
  for (let i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out.push(e);
  }
  return out;
}

function wilderRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  let ag = g / period, al = l / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (al === 0) return ag === 0 ? 50 : 100;
  return 100 - 100 / (1 + ag / al);
}

function macdCalc(closes) {
  if (closes.length < 35) return { line: 0, signal: 0, hist: 0 };
  const e12 = emaSeries(closes, 12);
  const e26 = emaSeries(closes, 26);
  const line = closes.map((_, i) => e12[i] - e26[i]);
  const signal = emaSeries(line, 9);
  return {
    line: line[line.length - 1],
    signal: signal[signal.length - 1],
    hist: line[line.length - 1] - signal[signal.length - 1],
  };
}

function realizedVolPct(closes) {
  if (closes.length < 3) return 0;
  const rets = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  if (!rets.length) return 0;
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const v = Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / rets.length);
  return v * 100;
}

function computeIndicators(closes, volumes) {
  const last = closes[closes.length - 1];
  const sma10 = smaAt(closes, 10);
  const sma20 = smaAt(closes, 20);
  const rsi = wilderRSI(closes, 14);
  const macd = macdCalc(closes);
  const back = closes.length > 5 ? closes[closes.length - 6] : closes[0];
  const mom5 = back > 0 ? (last - back) / back : 0;
  const trendStrengthPct = sma10 != null && sma20 != null && sma20 > 0
    ? Math.abs(sma10 - sma20) / sma20 * 100 : 0;

  let volRatio = null;
  if (Array.isArray(volumes) && volumes.length >= 5) {
    const recent = volumes.slice(-20);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const lastVol = volumes[volumes.length - 1];
    volRatio = avg > 0 ? lastVol / avg : null;
  }

  return {
    last, sma10, sma20,
    rsi: Math.min(99, Math.max(1, rsi)),
    macd,
    mom5,
    volPct: realizedVolPct(closes.slice(-40)),
    trendUp: sma10 != null && sma20 != null && sma10 > sma20,
    trendStrengthPct,
    volRatio,
  };
}

function generateAdvice(ind) {
  const reasons = [];
  let score = 0;
  const weakTrend = ind.trendStrengthPct < 0.12; // SMA10/SMA20 liggen nauwelijks uiteen -- geen echte richting

  if (weakTrend) {
    reasons.push(`Trend te zwak om op te varen (SMA-verschil ${ind.trendStrengthPct.toFixed(2)}%)`);
  } else if (ind.trendUp) { score += 1; reasons.push("SMA(10) boven SMA(20) — korte trend wijst omhoog"); }
  else { score -= 1; reasons.push("SMA(10) onder SMA(20) — korte trend wijst omlaag"); }

  if (ind.rsi > 70) { score -= 1; reasons.push(`RSI hoog (${ind.rsi.toFixed(0)}) — mogelijk overgekocht`); }
  else if (ind.rsi < 30) { score += 1; reasons.push(`RSI laag (${ind.rsi.toFixed(0)}) — mogelijk oversold`); }
  else { reasons.push(`RSI neutraal (${ind.rsi.toFixed(0)})`); }

  if (ind.macd.hist > 0) { score += 1; reasons.push("MACD boven de signaallijn (positief momentum)"); }
  else if (ind.macd.hist < 0) { score -= 1; reasons.push("MACD onder de signaallijn (negatief momentum)"); }

  if (ind.mom5 > 0.01) { score += 1; reasons.push(`Koers +${(ind.mom5 * 100).toFixed(1)}% over de laatste 5 candles`); }
  else if (ind.mom5 < -0.01) { score -= 1; reasons.push(`Koers ${(ind.mom5 * 100).toFixed(1)}% over de laatste 5 candles`); }

  const lowVolume = ind.volRatio != null && ind.volRatio < 0.5;
  if (lowVolume) reasons.push(`Handelsvolume laag (${Math.round(ind.volRatio * 100)}% van het gemiddelde) — signaal minder betrouwbaar`);

  const tooRisky = ind.volPct > 6; // extreme volatiliteit over de laatste candles
  if (tooRisky) reasons.push(`Volatiliteit erg hoog (${ind.volPct.toFixed(1)}%) — risico te groot om nu te handelen`);

  // Categorie = het exacte, voor de gebruiker leesbare "waarom". Risico is een universele
  // veto die als EERSTE gecheckt wordt -- ongeacht hoe sterk een eventueel signaal is, want
  // "te riskant om nu te handelen" moet altijd voorrang krijgen op een toevallig signaal.
  let advice = "HOUDEN";
  let category;
  if (tooRisky) {
    category = "Risico te hoog";
  } else if (score >= 2) {
    if (lowVolume) { category = "Handelsvolume te laag"; }
    else { advice = "MOGELIJK KOPEN"; category = "Koopsignaal bevestigd"; }
  } else if (score <= -2) {
    advice = "MOGELIJK VERKOPEN"; category = "Verkoopsignaal bevestigd";
  } else if (weakTrend) {
    category = "Trend onvoldoende sterk";
  } else if (score === 1 || score === -1) {
    category = "Wachten op bevestiging";
  } else {
    category = "Geen geldig koopsignaal";
  }

  const confidence = Math.round(Math.min(90, Math.max(35, 50 + score * 9 + Math.min(10, Math.abs(ind.mom5) * 300))));
  const risk = ind.volPct > 2 ? "Hoog" : ind.volPct > 0.8 ? "Gemiddeld" : "Laag";

  return { advice, confidence, reasons: reasons.slice(0, 5), risk, score, category };
}

/* ============================================================================
   Backtest — dezelfde strategie (computeIndicators + generateAdvice) losgelaten
   op ECHTE historische Binance-candles. Alleen voor Binance-activa (crypto +
   PAXG-goud): dat is de enige bron hier met gratis, sleutelloze, diepe
   geschiedenis. Geen verzonnen data — als het ophalen mislukt, gooit dit
   gewoon een fout.
   ============================================================================ */

async function fetchBinanceHistory(pair, days, interval = "1h", maxCalls = 80) {
  const intervalMs = { "15m": 9e5, "1h": 36e5, "4h": 144e5, "1d": 864e5 }[interval] || 36e5;
  const now = Date.now();
  let start = now - days * 24 * 3600 * 1000;
  const all = [];
  let calls = 0;
  while (start < now && calls < maxCalls) {
    const url = `${BINANCE}/klines?symbol=${pair}&interval=${interval}&startTime=${start}&limit=1000`;
    const data = await fetchJson(url, 20000);
    calls++;
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    start = data[data.length - 1][0] + intervalMs;
  }
  if (all.length === 0) throw new Error(`Geen historische data ontvangen voor ${pair}.`);
  return all.map((k) => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4] }));
}

function _roundTrips(trades) {
  const out = [];
  let buyPrice = null;
  for (const t of trades) {
    if (t.type === "buy") buyPrice = t.price;
    else if (buyPrice != null) { out.push(((t.price - buyPrice) / buyPrice) * 100); buyPrice = null; }
  }
  return out;
}

function _maxDrawdown(equity) {
  if (equity.length < 2) return 0;
  let peak = equity[0].value, mdd = 0;
  for (const p of equity) {
    peak = Math.max(peak, p.value);
    if (peak > 0) mdd = Math.max(mdd, ((peak - p.value) / peak) * 100);
  }
  return mdd;
}

function simulateBacktest(candles, startCash = 1000) {
  let cash = startCash, holdings = null;
  const trades = [];
  const equity = [];
  const WINDOW = 80; // rollend venster: ruim genoeg voor MACD(26)/RSI(14)/SMA(20), veel sneller dan de volledige reeks

  for (let i = 0; i < candles.length; i++) {
    const price = candles[i].close;
    if (i >= 20) {
      const lo = Math.max(0, i - WINDOW + 1);
      const closes = candles.slice(lo, i + 1).map((c) => c.close);
      const adv = generateAdvice(computeIndicators(closes));
      if (adv.advice === "MOGELIJK KOPEN" && !holdings) {
        const budget = cash * 0.12;
        const qty = budget / price;
        if (qty > 0 && qty * price >= 5) {
          cash -= qty * price;
          holdings = { qty, avg: price };
          trades.push({ time: candles[i].time, type: "buy", price, qty });
        }
      } else if (adv.advice === "MOGELIJK VERKOPEN" && holdings) {
        cash += holdings.qty * price;
        trades.push({ time: candles[i].time, type: "sell", price, qty: holdings.qty });
        holdings = null;
      }
    }
    equity.push({ time: candles[i].time, value: cash + (holdings ? holdings.qty * price : 0) });
  }

  const lastPrice = candles[candles.length - 1].close;
  if (holdings) cash += holdings.qty * lastPrice; // open positie meetellen tegen laatste koers
  const finalValue = cash;
  const buyHold = startCash * (lastPrice / candles[0].close);

  const rets = _roundTrips(trades);
  const wins = rets.filter((r) => r > 0);
  const losses = rets.filter((r) => r <= 0);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));

  return {
    start_value: startCash,
    final_value: finalValue,
    profit_pct: ((finalValue - startCash) / startCash) * 100,
    buy_hold_value: buyHold,
    buy_hold_pct: ((buyHold - startCash) / startCash) * 100,
    n_trades: trades.length,
    n_round_trips: rets.length,
    win_rate: rets.length ? (wins.length / rets.length) * 100 : null,
    avg_win_pct: wins.length ? grossWin / wins.length : null,
    avg_loss_pct: losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : null,
    biggest_win_pct: rets.length ? Math.max(...rets) : null,
    biggest_loss_pct: rets.length ? Math.min(...rets) : null,
    profit_factor: grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : null),
    max_drawdown_pct: _maxDrawdown(equity),
    equity,
    period_start: candles[0].time,
    period_end: candles[candles.length - 1].time,
    n_candles: candles.length,
  };
}

async function runBacktestFor(asset, days) {
  const candles = await fetchBinanceHistory(asset.src.pair, days, "1h");
  if (candles.length < 30) {
    throw new Error(`Te weinig candles (${candles.length}) voor een betrouwbare backtest — probeer een langere periode.`);
  }
  return simulateBacktest(candles);
}



function createMarketStore() {
  let tdKey = "";
  try { tdKey = localStorage.getItem(TD_KEY_STORAGE) || ""; } catch { /* private mode */ }

  let aiWatchCount = CORE_WATCH.length;
  try {
    const savedCount = parseInt(localStorage.getItem(WATCH_COUNT_STORAGE), 10);
    if (Number.isFinite(savedCount)) aiWatchCount = Math.min(WATCH_POOL.length, Math.max(1, savedCount));
  } catch { /* private mode */ }

  let state = {
    quotes: {},        // symbol -> {price, changePct, high, low, volume, quoteVolume, prevClose, ts, source, live}
    series: {},        // serieKey -> {points:[{t,price}], interval, source, ts}
    status: { binance: "idle", ecb: "idle", td: tdKey ? "idle" : "no-key" },
    tdKey,
    lastUpdate: null,
    snapshotDate: SNAPSHOT_DATE,
    paper: null,       // set below
    aiStatus: {},      // symbol -> {time, advice, confidence, risk, reasons, held, note} -- ook bijgehouden als er niets gebeurt
    aiWatchCount,      // hoeveel munten uit WATCH_POOL de AI momenteel in de gaten houdt (zelf instelbaar)
  };

  const listeners = new Set();
  /* Mutaties bouwen nieuwe containers en committen die in één keer — het snapshot
     dat React al vasthoudt wordt nooit in-place gewijzigd (useSyncExternalStore-contract). */
  function commit(partial) {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  }
  function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
  function getSnapshot() { return state; }

  function seriesKey(symbol, interval = "1u") {
    return ASSETS_BY_SYMBOL[symbol]?.src.kind === "binance" ? `${symbol}:${interval}` : symbol;
  }

  /* ----- sim-engine (fallback zonder live bron) ----- */

  const simState = {}; // symbol -> {price, rng, ticks, ref}
  // na hoeveel stilte een "live" bron als dood geldt en sim het overneemt
  const STALE_MS = { binance: 5 * 60e3, ecb: 3 * 3600e3, twelvedata: 20 * 60e3 };

  function effBase(a) {
    return SNAPSHOT[a.symbol]?.price ?? a.base;
  }

  function genSimSeries(a, points = 90) {
    // achterwaartse random walk die exact op de snapshot/basisprijs eindigt
    const rng = seededRandom(a.symbol ? hashSeed(a.symbol) : 1);
    const baseVol = 1000 * (0.5 + rng());
    const arr = [{ t: Date.now(), price: effBase(a), volume: baseVol * (0.7 + rng() * 0.6) }];
    let p = effBase(a);
    for (let i = 1; i < points; i++) {
      const drift = (rng() - 0.5) * a.vol;
      p = p / (1 + drift);
      const volume = baseVol * (0.7 + rng() * 0.6) * (rng() > 0.95 ? 1.8 : 1); // af en toe een volumepiek
      arr.unshift({ t: Date.now() - i * 3600e3, price: p, volume });
    }
    return arr;
  }

  function initSimState() {
    const quotes = {};
    const series = {};
    ALL_ASSETS.forEach((a) => {
      simState[a.symbol] = { price: effBase(a), rng: seededRandom(hashSeed(a.symbol) + 7), ticks: 0, ref: null };
      const snap = SNAPSHOT[a.symbol];
      quotes[a.symbol] = {
        price: effBase(a),
        changePct: snap?.prev ? ((snap.price / snap.prev) - 1) * 100 : 0,
        high: null, low: null, volume: null, quoteVolume: null,
        prevClose: snap?.prev ?? null,
        ts: Date.now(), source: "sim", live: false,
      };
      series[seriesKey(a.symbol)] = { points: genSimSeries(a), interval: "1u", source: "sim", ts: Date.now() };
    });
    return { quotes, series };
  }

  function simTick() {
    const quotes = { ...state.quotes };
    const series = { ...state.series };
    let changed = false;
    ALL_ASSETS.forEach((a) => {
      const q = quotes[a.symbol];
      const s = simState[a.symbol];
      if (q && q.live) {
        // bron te lang stil? demoteer naar sim, verder vanaf de laatste echte koers
        const maxAge = STALE_MS[q.source] ?? 10 * 60e3;
        if (Date.now() - q.ts <= maxAge) return;
        s.price = q.price;
        s.ref = q.price;
        quotes[a.symbol] = { ...q, live: false, source: "sim", ts: Date.now() };
        changed = true;
        return;
      }
      const ref0 = s.ref ?? effBase(a);
      // kleine random walk met mean-reversion naar de referentieprijs,
      // zodat SIM-koersen niet ver van hun snapshot wegdrijven
      const drift = (s.rng() - 0.5) * a.vol * 0.08 + (ref0 / s.price - 1) * 0.01;
      s.price = Math.max(s.price * (1 + drift), 1e-9);
      s.ticks += 1;
      const ref = s.ref ?? effBase(a);
      quotes[a.symbol] = {
        ...(q || {}), price: s.price, changePct: ((s.price / ref) - 1) * 100, ts: Date.now(), source: "sim", live: false,
      };
      const key = seriesKey(a.symbol);
      const ser = series[key];
      if (ser && ser.source === "sim") {
        const pts = ser.points.slice();
        if (s.ticks % 12 === 0) pts.push({ t: Date.now(), price: s.price });
        else pts[pts.length - 1] = { t: Date.now(), price: s.price };
        series[key] = { ...ser, points: pts.slice(-180), ts: Date.now() };
      }
      changed = true;
    });
    if (changed) commit({ quotes, series, lastUpdate: Date.now() });
  }

  /* ----- Binance (crypto + PAXG-goud) ----- */

  const binanceAssets = ALL_ASSETS.filter((a) => a.src.kind === "binance");
  const pairToSymbol = Object.fromEntries(binanceAssets.map((a) => [a.src.pair, a.symbol]));

  async function pollBinance() {
    try {
      const pairs = binanceAssets.map((a) => a.src.pair);
      const url = `${BINANCE}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`;
      const data = await fetchJson(url, 15000);
      if (!Array.isArray(data)) throw new Error("unexpected response");
      const quotes = { ...state.quotes };
      data.forEach((t) => {
        const sym = pairToSymbol[t.symbol];
        if (!sym) return;
        quotes[sym] = {
          price: +t.lastPrice,
          changePct: +t.priceChangePercent,
          high: +t.highPrice, low: +t.lowPrice,
          volume: +t.volume, quoteVolume: +t.quoteVolume,
          prevClose: +t.prevClosePrice,
          ts: Date.now(), source: "binance", live: true,
        };
      });
      commit({ quotes, status: { ...state.status, binance: "ok" }, lastUpdate: Date.now() });
      checkAllRisk();
    } catch {
      commit({ status: { ...state.status, binance: "error" } });
    }
  }

  /* ----- Frankfurter / ECB (forex, dagkoersen) ----- */

  const fxAssets = ALL_ASSETS.filter((a) => a.src.kind === "fx");

  async function pollEcb() {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 120 * 24 * 3600e3);
      const dstr = (d) => d.toISOString().slice(0, 10);
      const url = `${FRANKFURTER}/${dstr(start)}..${dstr(end)}?base=USD&symbols=${FX_CURRENCIES.join(",")}`;
      const data = await fetchJson(url, 15000);
      const dates = Object.keys(data.rates || {}).sort();
      if (dates.length < 2) throw new Error("no rates");
      const get = (day, c) => (c === "USD" ? 1 : data.rates[day][c]);
      const quotes = { ...state.quotes };
      const series = { ...state.series };
      fxAssets.forEach((a) => {
        const { b, q } = a.src;
        const points = dates
          .filter((d) => get(d, b) && get(d, q))
          .map((d) => ({ t: Date.parse(d), price: get(d, q) / get(d, b) }));
        if (points.length < 2) return;
        const last = points[points.length - 1].price;
        const prev = points[points.length - 2].price;
        quotes[a.symbol] = {
          price: last, changePct: ((last / prev) - 1) * 100,
          high: null, low: null, volume: null, quoteVolume: null, prevClose: prev,
          ts: Date.now(), source: "ecb", live: true,
        };
        series[a.symbol] = { points, interval: "1d", source: "ecb", ts: Date.now() };
      });
      commit({ quotes, series, status: { ...state.status, ecb: "ok" }, lastUpdate: Date.now() });
    } catch {
      commit({ status: { ...state.status, ecb: "error" } });
    }
  }

  /* ----- Twelve Data (aandelen/ETF's) -----
     Let op: TD rekent 1 credit PER SYMBOOL (ook in een batch-quote), 8 credits/min
     op het gratis plan. De limiter budgetteert daarom op credits, niet op requests. */

  const tdQueue = [];
  const tdQueued = new Set();
  const tdFailed = {};          // sym -> ts van laatste mislukking (10 min cooldown)
  const tdCredits = [];         // tijdstempels van bestede credits (rollend 62s-venster)
  const TD_CREDITS_PER_MIN = 7; // marge onder de echte limiet van 8
  let tdBusy = false;

  function tdEnqueue(job) {
    if (!state.tdKey) return;
    const sig = job.type + ":" + (job.symbols ? job.symbols.join(",") : job.symbol);
    if (tdQueued.has(sig)) return;
    tdQueued.add(sig);
    job.sig = sig;
    if (job.priority) tdQueue.unshift(job); else tdQueue.push(job);
    tdPump();
  }

  function tdPump() {
    if (tdBusy || !tdQueue.length) return;
    const job = tdQueue[0];
    const cost = job.type === "quote" ? job.symbols.length : 1;
    const now = Date.now();
    while (tdCredits.length && now - tdCredits[0] > 62e3) tdCredits.shift();
    if (tdCredits.length + cost > TD_CREDITS_PER_MIN) {
      // wachten tot er weer creditruimte is in het rollende venster
      tdBusy = true;
      const wait = tdCredits.length ? Math.max(62e3 - (now - tdCredits[0]) + 500, 1000) : 5000;
      setTimeout(() => { tdBusy = false; tdPump(); }, wait);
      return;
    }
    tdQueue.shift();
    tdBusy = true;
    for (let i = 0; i < cost; i++) tdCredits.push(now);
    runTdJob(job).finally(() => {
      tdQueued.delete(job.sig);
      setTimeout(() => { tdBusy = false; tdPump(); }, 1500);
    });
  }

  function tdRetryLater(job) {
    if (job.retried) return; // maximaal één automatische retry per job
    setTimeout(() => tdEnqueue({ ...job, retried: true, sig: undefined }), 65e3);
  }

  function tdDemoteAll(newStatus) {
    const quotes = { ...state.quotes };
    ALL_ASSETS.filter((a) => a.src.kind === "td").forEach((a) => {
      const q = quotes[a.symbol];
      if (q && q.source === "twelvedata") {
        simState[a.symbol].price = q.price;
        simState[a.symbol].ref = q.price;
        quotes[a.symbol] = { ...q, live: false, source: "sim" };
      }
    });
    tdQueue.length = 0;
    tdQueued.clear();
    commit({ quotes, status: { ...state.status, td: newStatus } });
  }

  function applyTdQuote(sym, d, quotes) {
    const asset = ALL_ASSETS.find((a) => a.src.kind === "td" && a.src.sym === sym);
    if (!asset || d.code || !d.close) {
      if (asset) tdFailed[asset.symbol] = Date.now();
      return;
    }
    quotes[asset.symbol] = {
      price: +d.close,
      changePct: d.percent_change != null ? +d.percent_change : 0,
      high: d.high != null ? +d.high : null,
      low: d.low != null ? +d.low : null,
      volume: d.volume != null ? +d.volume : null,
      quoteVolume: null,
      prevClose: d.previous_close != null ? +d.previous_close : null,
      ts: Date.now(), source: "twelvedata", live: true,
    };
  }

  async function runTdJob(job) {
    try {
      if (job.type === "quote") {
        const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(job.symbols.join(","))}&apikey=${encodeURIComponent(state.tdKey)}`;
        const data = await fetchJson(url, 15000);
        if (data.code === 401) { tdDemoteAll("invalid"); return; }
        if (data.code === 429) { commit({ status: { ...state.status, td: "limit" } }); tdRetryLater(job); return; }
        const quotes = { ...state.quotes };
        if (job.symbols.length === 1) applyTdQuote(job.symbols[0], data, quotes);
        else job.symbols.forEach((s) => { if (data[s]) applyTdQuote(s, data[s], quotes); });
        commit({ quotes, status: { ...state.status, td: "ok" }, lastUpdate: Date.now() });
      } else if (job.type === "series") {
        const url = `${TD_BASE}/time_series?symbol=${encodeURIComponent(job.symbol)}&interval=1h&outputsize=150&timezone=UTC&apikey=${encodeURIComponent(state.tdKey)}`;
        const data = await fetchJson(url, 15000);
        if (data.code === 401) { tdDemoteAll("invalid"); return; }
        if (data.code === 429) { commit({ status: { ...state.status, td: "limit" } }); tdRetryLater(job); return; }
        const asset = ALL_ASSETS.find((a) => a.src.kind === "td" && a.src.sym === job.symbol);
        if (asset && Array.isArray(data.values) && data.values.length) {
          const points = data.values
            .map((v) => ({ t: Date.parse(v.datetime.replace(" ", "T") + "Z"), price: +v.close }))
            .filter((p) => isFinite(p.price) && isFinite(p.t))
            .reverse();
          commit({
            series: { ...state.series, [asset.symbol]: { points, interval: "1u", source: "twelvedata", ts: Date.now() } },
            status: { ...state.status, td: "ok" },
          });
        } else if (asset) {
          tdFailed[asset.symbol] = Date.now();
          commit({ status: { ...state.status } });
        }
      }
    } catch (err) {
      if (err && err.status === 401) { tdDemoteAll("invalid"); return; }
      if (err && err.status === 429) { commit({ status: { ...state.status, td: "limit" } }); tdRetryLater(job); return; }
      commit({ status: { ...state.status, td: "error" } });
    }
  }

  function tdQuoteFresh(sym, maxAgeMs) {
    const q = state.quotes[sym];
    return q && q.source === "twelvedata" && Date.now() - q.ts < maxAgeMs;
  }

  function ensureFolderQuotes(catKey) {
    if (!state.tdKey || state.status.td === "invalid") return;
    const items = (ASSET_CATEGORIES[catKey]?.items || []).filter((a) => a.src.kind === "td");
    const missing = items
      .filter((a) => !tdQuoteFresh(a.symbol, 150e3))
      .filter((a) => !tdFailed[a.symbol] || Date.now() - tdFailed[a.symbol] > 600e3)
      .slice(0, 7)
      .map((a) => a.src.sym);
    if (missing.length) tdEnqueue({ type: "quote", symbols: missing });
  }

  let seriesReqCounter = 0;
  const seriesReqToken = {};

  async function ensureSeries(symbol, opts = {}) {
    const a = ASSETS_BY_SYMBOL[symbol];
    if (!a) return;
    const interval = opts.interval || "1u";
    const key = seriesKey(symbol, interval);
    const cur = state.series[key];
    const fresh = cur && cur.source !== "sim" && Date.now() - cur.ts < 300e3;
    if (fresh && !opts.force) return;

    if (a.src.kind === "binance") {
      const ivMap = { "15m": "15m", "1u": "1h", "4u": "4h", "1d": "1d" };
      const token = ++seriesReqCounter;
      seriesReqToken[key] = token;
      try {
        const url = `${BINANCE}/klines?symbol=${a.src.pair}&interval=${ivMap[interval] || "1h"}&limit=120`;
        const data = await fetchJson(url, 15000);
        if (seriesReqToken[key] !== token) return; // verouderde respons na snelle interval-switch
        if (Array.isArray(data)) {
          const points = data.map((k) => ({ t: k[0], price: +k[4], volume: +k[5] }));
          commit({ series: { ...state.series, [key]: { points, interval, source: "binance", ts: Date.now() } } });
        }
      } catch { /* hou bestaande serie */ }
    } else if (a.src.kind === "fx") {
      if (!cur || cur.source !== "ecb") pollEcb();
    } else if (a.src.kind === "td") {
      if (state.tdKey && (!tdFailed[symbol] || Date.now() - tdFailed[symbol] > 600e3)) {
        tdEnqueue({ type: "series", symbol: a.src.sym, priority: !!opts.priority });
      }
    }
  }

  function ensureQuote(symbol) {
    const a = ASSETS_BY_SYMBOL[symbol];
    if (!a) return;
    if (a.src.kind === "td" && state.tdKey && !tdQuoteFresh(symbol, 90e3)) {
      if (!tdFailed[symbol] || Date.now() - tdFailed[symbol] > 600e3) {
        tdEnqueue({ type: "quote", symbols: [a.src.sym], priority: true });
      }
    }
  }

  function setTdKey(key) {
    tdKey = key.trim();
    try {
      if (tdKey) localStorage.setItem(TD_KEY_STORAGE, tdKey);
      else localStorage.removeItem(TD_KEY_STORAGE);
    } catch { /* ignore */ }
    Object.keys(tdFailed).forEach((k) => delete tdFailed[k]);
    commit({ tdKey, status: { ...state.status, td: tdKey ? "testing" : "no-key" } });
    if (tdKey) tdEnqueue({ type: "quote", symbols: ["AAPL"], priority: true });
    else tdDemoteAll("no-key"); // verouderde "live" quotes niet laten hangen
  }

  /* ----- papertrading (Testing) — gedeeld met Portfolio-venster ----- */

  let txId = 1;

  function defaultPaper() {
    return {
      cash: 10000, startingCapital: 10000, holdings: {}, txs: [],
      history: [{ t: Date.now(), value: 10000 }], aiActive: true,
    };
  }

  function loadPaper() {
    try {
      const raw = localStorage.getItem(PAPER_STORAGE);
      if (!raw) return defaultPaper();
      const p = JSON.parse(raw);
      const num = (v, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);
      const holdings = {};
      if (p.holdings && typeof p.holdings === "object") {
        Object.entries(p.holdings).forEach(([sym, h]) => {
          const hq = num(h?.qty), ha = num(h?.avg);
          if (ASSETS_BY_SYMBOL[sym] && hq > 0 && ha >= 0) {
            holdings[sym] = { qty: hq, avg: ha, highSinceEntry: num(h?.highSinceEntry, ha) };
          }
        });
      }
      const txs = Array.isArray(p.txs)
        ? p.txs.filter((t) => t && typeof t === "object" && typeof t.symbol === "string" && isFinite(num(t.price, NaN))).slice(0, 200)
        : [];
      const history = Array.isArray(p.history)
        ? p.history.filter((h) => h && isFinite(num(h.t, NaN)) && isFinite(num(h.value, NaN))).slice(-300)
        : [];
      txId = txs.reduce((m, t) => Math.max(m, num(t.id)), 0) + 1;
      const cash = Math.max(0, num(p.cash, 10000));
      return {
        cash,
        startingCapital: Math.max(1, num(p.startingCapital, 10000)),
        holdings, txs,
        history: history.length ? history : [{ t: Date.now(), value: cash }],
        aiActive: p.aiActive !== false,
      };
    } catch {
      return defaultPaper();
    }
  }

  function savePaper(p) {
    try {
      localStorage.setItem(PAPER_STORAGE, JSON.stringify({
        ...p, txs: p.txs.slice(0, 120), history: p.history.slice(-300),
      }));
    } catch { /* ignore */ }
  }

  function paperValueOf(p) {
    const held = Object.entries(p.holdings).reduce((sum, [sym, h]) => {
      const q = state.quotes[sym];
      return sum + h.qty * (q ? q.price : h.avg);
    }, 0);
    return p.cash + held;
  }

  function withHistory(p) {
    const v = +paperValueOf(p).toFixed(2);
    return { ...p, history: [...p.history, { t: Date.now(), value: v }].slice(-300) };
  }

  function commitPaper(p) {
    savePaper(p);
    commit({ paper: p });
  }

  function paperDeposit(amount) {
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) return;
    const p = state.paper;
    commitPaper(withHistory({
      ...p,
      cash: p.cash + amt,
      startingCapital: p.startingCapital + amt, // storting is geen winst
      txs: [{ id: txId++, type: "deposit", symbol: "—", qty: 1, price: amt, time: fmtTime(Date.now()), origin: "manual", reason: "Handmatige storting", confidence: null }, ...p.txs].slice(0, 200),
    }));
  }

  /* Handmatig munten toevoegen/wegnemen -- volledig LOS van het automatische
     winst/verlies-systeem (dat blijft precies zo werken via paperTrade/
     checkAllRisk/aiStep, hier niets aan gewijzigd). Dit is puur een extra
     "geef/haal munten"-knop, zoals het storten van nepgeld maar dan in
     munten i.p.v. cash. De waarde wordt bij de startkapitaal-basislijn
     opgeteld/afgetrokken (net als bij storten), zodat dit nooit als
     valse winst of vals verlies in de statistieken verschijnt. */
  function paperGiveCoins(symbol, delta) {
    const d = Number(delta);
    if (!d) return { error: "Vul een aantal ongelijk aan 0 in." };
    const q = state.quotes[symbol];
    if (!q || !isFinite(q.price) || q.price <= 0) return { error: "Geen geldige koers voor dit activum." };
    const p = state.paper;
    const price = q.price;
    const cur = p.holdings[symbol] || { qty: 0, avg: price, highSinceEntry: price };

    if (d > 0) {
      // Munten erbij: nieuwe gemiddelde aankoopprijs, alsof ze net tegen de
      // huidige koers "gekocht" zijn -- maar zonder dat het als AI/handmatige
      // trade meetelt.
      const newQty = cur.qty + d;
      const newAvg = (cur.avg * cur.qty + price * d) / newQty;
      const value = d * price;
      commitPaper(withHistory({
        ...p,
        startingCapital: p.startingCapital + value, // toegevoegde waarde telt niet als winst
        holdings: { ...p.holdings, [symbol]: { qty: newQty, avg: newAvg, highSinceEntry: Math.max(cur.highSinceEntry || price, price) } },
        txs: [{ id: txId++, type: "gift", symbol, qty: d, price, time: fmtTime(Date.now()), origin: "manual", reason: `Handmatig ${d} munten toegevoegd`, confidence: null }, ...p.txs].slice(0, 200),
      }));
      return { ok: true };
    } else {
      // Munten weg: kan nooit meer wegnemen dan er zijn.
      const remove = Math.min(cur.qty, -d);
      if (remove <= 0) return { error: "Geen munten om weg te nemen." };
      const newQty = cur.qty - remove;
      const value = remove * price;
      const holdings = { ...p.holdings };
      if (newQty <= 1e-9) delete holdings[symbol]; else holdings[symbol] = { ...cur, qty: newQty };
      commitPaper(withHistory({
        ...p,
        startingCapital: Math.max(0, p.startingCapital - value), // weggehaalde waarde telt niet als verlies
        holdings,
        txs: [{ id: txId++, type: "gift", symbol, qty: -remove, price, time: fmtTime(Date.now()), origin: "manual", reason: `Handmatig ${remove} munten weggehaald`, confidence: null }, ...p.txs].slice(0, 200),
      }));
      return { ok: true };
    }
  }

  function paperStart(amount) {
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) return;
    commitPaper({
      cash: amt, startingCapital: amt, holdings: {}, txs: [],
      history: [{ t: Date.now(), value: amt }], aiActive: true,
    });
  }

  // Risicobeheer -- zelfde percentages als de echte Python-bot, voor consistentie.
  const STOP_LOSS_PCT = 0.03;      // 3% onder instapprijs
  const TAKE_PROFIT_PCT = 0.08;    // 8% boven instapprijs
  const TRAILING_STOP_PCT = 0.05;  // 5% terug vanaf de piek sinds instap
  const USE_TRAILING_STOP = true;

  function paperTrade(type, symbol, qty, origin = "manual", meta = {}) {
    const q = state.quotes[symbol];
    if (!q || !isFinite(q.price) || q.price <= 0 || !(qty > 0)) return { error: "Geen geldige koers." };
    const p = state.paper;
    const price = q.price;
    const cost = qty * price;
    const reason = meta.reason || (origin === "ai" ? "AI-signaal" : "Handmatige order");
    const confidence = typeof meta.confidence === "number" ? meta.confidence : null;
    const dataQuality = meta.dataQuality || (origin === "ai" ? "onbekend" : null);
    let next;
    if (type === "buy") {
      if (cost > p.cash + 1e-6) return { error: "Onvoldoende nepgeld voor deze order." };
      const cur = p.holdings[symbol] || { qty: 0, avg: 0, highSinceEntry: price };
      const newQty = cur.qty + qty;
      const newAvg = (cur.avg * cur.qty + cost) / newQty;
      next = {
        ...p,
        cash: p.cash - cost,
        holdings: { ...p.holdings, [symbol]: { qty: newQty, avg: newAvg, highSinceEntry: Math.max(cur.highSinceEntry || price, price) } },
        txs: [{ id: txId++, type: "buy", symbol, qty, price, time: fmtTime(Date.now()), origin, reason, confidence, dataQuality }, ...p.txs].slice(0, 200),
      };
    } else {
      const cur = p.holdings[symbol];
      if (!cur || cur.qty < qty - 1e-9) return { error: "Niet genoeg stukken in positie." };
      const profit = (price - cur.avg) * qty;
      const newQty = cur.qty - qty;
      const holdings = { ...p.holdings };
      if (newQty <= 1e-9) delete holdings[symbol]; else holdings[symbol] = { ...cur, qty: newQty };
      next = {
        ...p,
        cash: p.cash + cost,
        holdings,
        txs: [{ id: txId++, type: "sell", symbol, qty, price, time: fmtTime(Date.now()), origin, profit, reason, confidence, dataQuality }, ...p.txs].slice(0, 200),
      };
    }
    commitPaper(withHistory(next));
    return { ok: true };
  }

  /* Risicobeheer: stop-loss / take-profit / trailing-stop. Wordt bij elke
     verse koersupdate gecheckt (niet pas elke 20s via aiStep) zodat een klap
     omlaag snel genoeg wordt opgevangen -- net als bij de echte bot. Sluit
     ALTIJD de volledige positie, en werkt onafhankelijk van de AI-schakelaar
     (risicobeheer blijft aan, ook als je de AI-trader hebt uitgezet, want een
     open positie beschermen is geen "nieuwe handelsbeslissing").*/
  function checkAllRisk() {
    const p = state.paper;
    let holdings = null, txsToAdd = [], cashDelta = 0;
    Object.entries(p.holdings).forEach(([sym, pos]) => {
      const q = state.quotes[sym];
      if (!q || !isFinite(q.price)) return;
      const price = q.price;
      const newHigh = Math.max(pos.highSinceEntry || pos.avg, price);

      const stopLevel = pos.avg * (1 - STOP_LOSS_PCT);
      const tpLevel = pos.avg * (1 + TAKE_PROFIT_PCT);
      const trailLevel = newHigh * (1 - TRAILING_STOP_PCT);

      let exitReason = null;
      if (price <= stopLevel) exitReason = { tag: "STOP-LOSS", text: `Stop-loss geraakt op ${(STOP_LOSS_PCT * 100).toFixed(0)}% onder instapprijs.` };
      else if (price >= tpLevel) exitReason = { tag: "TAKE-PROFIT", text: `Take-profit geraakt op ${(TAKE_PROFIT_PCT * 100).toFixed(0)}% boven instapprijs.` };
      else if (USE_TRAILING_STOP && price <= trailLevel && newHigh > pos.avg) exitReason = { tag: "TRAILING-STOP", text: `Trailing-stop geraakt: ${(TRAILING_STOP_PCT * 100).toFixed(0)}% terug vanaf de piek sinds instap.` };

      if (exitReason) {
        const profit = (price - pos.avg) * pos.qty;
        cashDelta += pos.qty * price;
        txsToAdd.push({
          id: txId++, type: "sell", symbol: sym, qty: pos.qty, price, time: fmtTime(Date.now()),
          origin: "risico", profit, reason: exitReason.text, confidence: null, dataQuality: null, riskTag: exitReason.tag,
        });
        if (!holdings) holdings = { ...p.holdings };
        delete holdings[sym];
      } else if (newHigh !== pos.highSinceEntry) {
        if (!holdings) holdings = { ...p.holdings };
        holdings[sym] = { ...pos, highSinceEntry: newHigh };
      }
    });
    if (holdings || txsToAdd.length) {
      commitPaper(withHistory({
        ...p,
        cash: p.cash + cashDelta,
        holdings: holdings || p.holdings,
        txs: txsToAdd.length ? [...txsToAdd.reverse(), ...p.txs].slice(0, 200) : p.txs,
      }));
    }
  }

  function paperReset() {
    commitPaper(defaultPaper());
  }

  function setAiWatchCount(n) {
    const clamped = Math.min(WATCH_POOL.length, Math.max(1, Math.round(n)));
    try { localStorage.setItem(WATCH_COUNT_STORAGE, String(clamped)); } catch { /* private mode */ }
    commit({ aiWatchCount: clamped });
  }

  function setAiActive(on) {
    commitPaper({ ...state.paper, aiActive: on });
  }

  /* AI-papertrader: handelt alleen op LIVE quotes ÉN verse candles,
     max 1 trade per symbool per 5 min. Slaat bij ELKE stap de redenering op
     (ook "geen actie"), zodat je altijd kunt zien waar de AI mee bezig is. */
  const aiLastTrade = {};

  function aiStep() {
    if (!state.paper.aiActive) return;
    const status = { ...state.aiStatus };
    const activeWatch = WATCH_POOL.slice(0, state.aiWatchCount);
    activeWatch.forEach((sym) => {
      const q = state.quotes[sym];
      const s = state.series[seriesKey(sym, "1u")];

      // Altijd proberen de échte bron te verversen op de achtergrond -- maar NOOIT
      // wachten tot die er is: de AI test de strategie ondertussen door op de beste
      // beschikbare data (live, of anders duidelijk gelabeld gesimuleerd).
      const seriesStale = !s || Date.now() - s.ts > 900e3;
      if (seriesStale) ensureSeries(sym);

      if (!q || !s || s.points.length < 21) {
        status[sym] = { time: Date.now(), advice: null, note: "Nog geen candles beschikbaar — data wordt opgehaald…", dataQuality: "geen" };
        return;
      }

      const isLive = !!q.live && Date.now() - q.ts < 180e3 && s.source !== "sim" && Date.now() - s.ts < 900e3;
      const dataQuality = isLive ? "live" : "gesimuleerd";
      const dataTag = isLive ? "" : " (gesimuleerde koers — geen live verbinding)";

      const closes = s.points.map((p) => p.price);
      const volumes = s.points.map((p) => p.volume).filter((v) => typeof v === "number");
      closes[closes.length - 1] = q.price;
      const ind = computeIndicators(closes, volumes);
      const adv = generateAdvice(ind);
      const held = state.paper.holdings[sym];
      const cooldown = aiLastTrade[sym] && Date.now() - aiLastTrade[sym] < 300e3;

      let note;
      if (adv.advice === "MOGELIJK KOPEN" && !held) {
        if (cooldown) {
          note = `Koopsignaal, maar net al gehandeld — wacht de afkoelperiode af.${dataTag}`;
        } else {
          const budget = state.paper.cash * 0.12; // risicobeheer: max ~12% vrije cash per positie
          const qty = +(budget / q.price).toFixed(6);
          if (qty > 0 && qty * q.price >= 10) {
            paperTrade("buy", sym, qty, "ai", {
              reason: (adv.reasons[0] || "AI-signaal") + dataTag, confidence: adv.confidence, dataQuality,
            });
            aiLastTrade[sym] = Date.now();
            note = `Gekocht — ${adv.reasons[0] || "koopsignaal"}.${dataTag}`;
          } else {
            note = `Koopsignaal, maar te weinig vrij nepgeld voor een zinnige order.${dataTag}`;
          }
        }
      } else if (adv.advice === "MOGELIJK VERKOPEN" && held) {
        if (cooldown) {
          note = `Verkoopsignaal, maar net al gehandeld — wacht de afkoelperiode af.${dataTag}`;
        } else {
          paperTrade("sell", sym, held.qty, "ai", {
            reason: (adv.reasons[0] || "AI-signaal") + dataTag, confidence: adv.confidence, dataQuality,
          });
          aiLastTrade[sym] = Date.now();
          note = `Verkocht — ${adv.reasons[0] || "verkoopsignaal"}.${dataTag}`;
        }
      } else if (adv.advice === "MOGELIJK KOPEN" && held) {
        note = `Koopsignaal, maar er is al een positie in dit activum.${dataTag}`;
      } else if (adv.advice === "MOGELIJK VERKOPEN" && !held) {
        note = `Verkoopsignaal, maar er is geen positie om te verkopen.${dataTag}`;
      } else {
        // HOUDEN -- de categorie legt precies uit waarom (een van de 5 gevraagde redenen)
        note = `${adv.category}.${dataTag}`;
      }

      status[sym] = {
        time: Date.now(), advice: adv.advice, confidence: adv.confidence, risk: adv.risk,
        reasons: adv.reasons, held: !!held, note, dataQuality, category: adv.category,
      };
    });
    commit({ aiStatus: status });
  }


  /* ----- start pollers ----- */

  const init = initSimState();
  state.quotes = init.quotes;
  state.series = init.series;
  state.paper = loadPaper();

  const timers = [];
  function start() {
    pollBinance();
    pollEcb();
    timers.push(setInterval(pollBinance, 8000));
    timers.push(setInterval(pollEcb, 30 * 60e3));
    timers.push(setInterval(simTick, 5000));
    timers.push(setInterval(() => commitPaper(withHistory(state.paper)), 15000));
    timers.push(setInterval(aiStep, 20000));
    timers.push(setInterval(() => {
      if (!state.tdKey || state.status.td === "invalid") return;
      const missing = TD_AUTO_WATCH.filter((s) => !tdQuoteFresh(s, 110e3));
      if (missing.length) tdEnqueue({ type: "quote", symbols: missing.map((s) => ASSETS_BY_SYMBOL[s].src.sym) });
    }, 60e3));
    // candles voor de AI-watchlist vers houden (Binance klines zijn gratis/keyless)
    const refreshWatchSeries = () => WATCH_POOL.slice(0, state.aiWatchCount).forEach((sym) => {
      if (ASSETS_BY_SYMBOL[sym]?.src.kind === "binance") ensureSeries(sym);
    });
    refreshWatchSeries();
    timers.push(setInterval(refreshWatchSeries, 240e3));
  }
  function stop() { timers.forEach(clearInterval); timers.length = 0; }

  return {
    subscribe, getSnapshot, start, stop,
    ensureSeries, ensureQuote, ensureFolderQuotes, setTdKey,
    paperDeposit, paperGiveCoins, paperTrade, paperReset, paperStart, setAiActive, setAiWatchCount,
  };
}

function getStore() {
  if (typeof window === "undefined") return null;
  if (!window.__snowyStore) {
    window.__snowyStore = createMarketStore();
    window.__snowyStore.start();
  }
  return window.__snowyStore;
}

const EMPTY_MARKET = {
  quotes: {}, series: {}, status: { binance: "idle", ecb: "idle", td: "no-key" },
  tdKey: "", lastUpdate: null, snapshotDate: SNAPSHOT_DATE, aiStatus: {}, aiWatchCount: CORE_WATCH.length,
  paper: { cash: 0, startingCapital: 1, holdings: {}, txs: [], history: [], aiActive: false },
};
const noopSubscribe = () => () => {};

function useMarket() {
  const store = getStore();
  return useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getSnapshot : () => EMPTY_MARKET,
    () => EMPTY_MARKET
  );
}

/* ---------- gedeelde UI ---------- */

function ModeBadge({ mode }) {
  const map = {
    analyse: { icon: Circle, label: "Analyse", color: "#7DD9B3" },
    testing: { icon: Square, label: "Testing", color: "#8ECAE6" },
    live: { icon: Diamond, label: "Live", color: "#E8846B" },
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

const SOURCE_LABEL = {
  binance: "Binance", ecb: "ECB", twelvedata: "Twelve Data", sim: "SIM",
};

function LiveChip({ quote, compact }) {
  const live = quote?.live;
  const label = live ? (compact ? "LIVE" : `LIVE · ${SOURCE_LABEL[quote.source]}`) : "SIM";
  return (
    <span className={`live-chip ${live ? "live" : "sim"}`} title={
      live ? `Live data via ${SOURCE_LABEL[quote.source]} — laatste update ${fmtTime(quote.ts)}`
        : `Gesimuleerd rond snapshot van ${SNAPSHOT_DATE} — koppel een gratis Twelve Data-key via Instellingen voor live data`
    }>
      <span className="live-dot" />{label}
    </span>
  );
}

function AdviceTag({ advice }) {
  const cls =
    advice === "MOGELIJK KOPEN" ? "tag tag-buy" :
    advice === "MOGELIJK VERKOPEN" ? "tag tag-sell" : "tag tag-hold";
  return <span className={cls}>{advice}</span>;
}

function ChangePill({ pct, size = 12 }) {
  if (pct == null || !isFinite(pct)) return <span className="ticker-change">—</span>;
  const up = pct >= 0;
  return (
    <span className={`ticker-change ${up ? "up" : "down"}`}>
      {up ? <ArrowUpRight size={size} /> : <ArrowDownRight size={size} />}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

/* ---------- login ---------- */

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
    if (!value) { setError("Voer een wachtwoord in."); return; }

    const ok = value === DEMO_PASSWORD;
    setLog((l) => [{ time: new Date().toLocaleTimeString("nl-NL"), success: ok }, ...l].slice(0, 6));
    if (ok) { onUnlock(); return; }

    const next = attempts + 1;
    setAttempts(next);
    setValue("");

    if (lockLevel === 0) {
      if (next === 1) { setError("Onjuist wachtwoord. Probeer opnieuw."); return; }
      if (next === 2) { setError("Onjuist wachtwoord. Nog 1 fout tot 15 minuten wachten."); return; }
      setLockMinutes(15);
      setError("Probeer over 15 minuten opnieuw.");
      setLockUntil(Date.now() + 15 * 1000); // demo-tempo: 1 sec = 1 min
      setLockLevel(1);
      return;
    }
    setLockMinutes(60);
    setError("Probeer over 60 minuten opnieuw.");
    setLockUntil(Date.now() + 60 * 1000);
  }

  return (
    <div className="login-wrap">
      <style>{LOGIN_CSS}</style>

      {[...Array(18)].map((_, i) => (
        <Snowflake key={i} className="flake" size={10 + (i % 4) * 6}
          style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`, opacity: 0.15 + (i % 3) * 0.1 }} />
      ))}

      <div className="login-card">
        <div className="login-brand">
          <Snowflake size={22} color="#8ECAE6" strokeWidth={2} />
          <span className="login-title">Snowy_Tracks</span>
        </div>
        <p className="login-sub">Persoonlijke AI-marktassistent — beveiligde toegang</p>

        <div>
          <label className="login-label" htmlFor="pw">Wachtwoord</label>
          <input
            id="pw" type="password" autoComplete="off" autoFocus className="login-input"
            value={value} disabled={!!lockUntil}
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
          Demo-omgeving — wachtwoord: <b style={{ color: "#8ECAE6" }}>{DEMO_PASSWORD}</b><br />
          In een productieversie wordt dit nooit getoond en wordt het wachtwoord gehasht (Argon2/bcrypt) opgeslagen.
        </div>
      </div>
    </div>
  );
}

const LOGIN_CSS = `
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
  .login-input { width:100%; box-sizing:border-box; background:#0E1A28; border:1px solid rgba(142,202,230,0.25); border-radius:10px;
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
`;

/* ---------- Markt Explorer ---------- */

function MarketExplorer({ onOpenAsset }) {
  const market = useMarket();
  const [openFolder, setOpenFolder] = useState(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    if (!openFolder) return;
    const store = getStore();
    store.ensureFolderQuotes(openFolder);
    const t = setInterval(() => store.ensureFolderQuotes(openFolder), 150e3);
    return () => clearInterval(t);
  }, [openFolder]);

  const searching = query.trim().length > 0;
  const list = useMemo(() => {
    let assets;
    if (searching) {
      const q = query.trim().toLowerCase();
      assets = ALL_ASSETS.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0, 60);
    } else if (openFolder) {
      assets = ASSET_CATEGORIES[openFolder].items.map((a) => ({ ...a, category: openFolder, categoryLabel: ASSET_CATEGORIES[openFolder].label }));
    } else {
      assets = [];
    }
    const rows = assets.map((a) => ({ asset: a, quote: market.quotes[a.symbol] }));
    if (sortBy === "gainers") rows.sort((x, y) => (y.quote?.changePct ?? -999) - (x.quote?.changePct ?? -999));
    if (sortBy === "losers") rows.sort((x, y) => (x.quote?.changePct ?? 999) - (y.quote?.changePct ?? 999));
    return rows;
  }, [market, query, searching, openFolder, sortBy]);

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

      <div className="explorer-breadcrumb">
        {!searching ? (
          <>
            <button className="crumb" onClick={() => setOpenFolder(null)}>📁 Markt Explorer</button>
            {openFolder && <><ChevronRight size={13} /><span className="crumb current">{ASSET_CATEGORIES[openFolder].label}</span></>}
          </>
        ) : (
          <span className="crumb current">Zoekresultaten voor "{query}" ({list.length})</span>
        )}
        {(openFolder || searching) && (
          <div className="sort-row">
            {[["default", "Standaard"], ["gainers", "Stijgers"], ["losers", "Dalers"]].map(([k, l]) => (
              <button key={k} className={`sort-btn ${sortBy === k ? "active" : ""}`} onClick={() => setSortBy(k)}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {!searching && !openFolder && (
        <div className="folder-grid">
          {CATEGORY_ORDER.map((key) => {
            const cat = ASSET_CATEGORIES[key];
            const liveCount = cat.items.filter((a) => market.quotes[a.symbol]?.live).length;
            return (
              <button key={key} className="folder-card" onClick={() => setOpenFolder(key)}>
                <span className="folder-icon">📁</span>
                <span className="folder-label">{cat.label}</span>
                <span className="folder-count">{cat.items.length} activa · {liveCount} live</span>
              </button>
            );
          })}
        </div>
      )}

      {(openFolder || searching) && (
        <div className="asset-list">
          {list.length === 0 && <div className="empty-note">Geen resultaten gevonden.</div>}
          {list.map(({ asset, quote }) => (
            <button key={asset.symbol} className="asset-row" onClick={() => onOpenAsset(asset)}>
              <div className="asset-id">
                <span className="asset-symbol">{asset.symbol}</span>
                <span className="asset-name">{asset.name}</span>
                {searching && <span className="asset-cat-tag">{asset.categoryLabel}</span>}
              </div>
              <LiveChip quote={quote} compact />
              <div className="asset-right">
                <span className="asset-price">{fmtPrice(quote?.price, asset)}</span>
                <ChangePill pct={quote?.changePct} />
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
  .explorer-breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:14px; color:#7C93AC; flex-wrap:wrap; }
  .crumb { background:none; border:none; color:#8ECAE6; font-size:12.5px; cursor:pointer; padding:2px 0; font-weight:600; }
  .crumb.current { color:#7C93AC; font-weight:400; cursor:default; }
  .sort-row { margin-left:auto; display:flex; gap:4px; }
  .sort-btn { background:none; border:1px solid rgba(142,202,230,0.15); color:#7C93AC; font-size:11px; padding:4px 10px;
    border-radius:20px; cursor:pointer; }
  .sort-btn.active { border-color:#8ECAE6; color:#8ECAE6; }
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

/* ---------- asset-detailvenster ---------- */

const CHART_INTERVALS = ["15m", "1u", "4u", "1d"];

function AssetDetailWindow({ asset }) {
  const market = useMarket();
  const [interval, setChartInterval] = useState("1u");
  const quote = market.quotes[asset.symbol];
  const series = seriesFor(market, asset.symbol, interval);

  useEffect(() => {
    const store = getStore();
    const refresh = () => {
      store.ensureQuote(asset.symbol);
      store.ensureSeries(asset.symbol, { interval, priority: true });
    };
    refresh();
    const t = setInterval(refresh, 150e3);
    return () => clearInterval(t);
  }, [asset.symbol, interval]);

  const { chartData, ind, advice } = useMemo(() => {
    const pts = series?.points || [];
    const closes = pts.map((p) => p.price);
    if (quote?.live && closes.length) closes[closes.length - 1] = quote.price;
    const ind0 = closes.length >= 5 ? computeIndicators(closes) : null;
    const data = pts.map((p, i) => {
      const row = { t: p.t, price: closes[i] };
      if (i >= 19) {
        let s = 0;
        for (let j = i - 19; j <= i; j++) s += closes[j];
        row.sma20 = s / 20;
      }
      return row;
    });
    return { chartData: data, ind: ind0, advice: ind0 ? generateAdvice(ind0) : null };
  }, [series, quote]);

  const isBinance = asset.src.kind === "binance";
  const seriesLabel =
    series?.source === "binance" ? `Binance · ${series.interval}-candles` :
    series?.source === "ecb" ? "ECB · dagkoersen" :
    series?.source === "twelvedata" ? "Twelve Data · 1u-candles" :
    `Gesimuleerd rond snapshot ${SNAPSHOT_DATE}`;

  const related = useMemo(() => {
    return (ASSET_CATEGORIES[asset.category]?.items || [])
      .filter((a) => a.symbol !== asset.symbol)
      .map((a) => ({
        asset: { ...a, category: asset.category, categoryLabel: asset.categoryLabel },
        quote: market.quotes[a.symbol],
      }))
      .filter((r) => r.quote)
      .sort((x, y) => Math.abs(y.quote.changePct ?? 0) - Math.abs(x.quote.changePct ?? 0))
      .slice(0, 3);
  }, [market, asset]);

  return (
    <div className="ticker-detail asset-detail-window">
      <style>{ANALYSE_CSS}</style>
      <div className="detail-head">
        <div>
          <div className="detail-symbol">
            {asset.symbol} <span className="detail-sector">{asset.categoryLabel}</span>
          </div>
          <div className="detail-name">{asset.name}</div>
          <div style={{ marginTop: 6 }}><LiveChip quote={quote} /></div>
        </div>
        <div className="detail-price-block">
          <div className="detail-price">{fmtPrice(quote?.price, asset)}</div>
          <ChangePill pct={quote?.changePct} size={13} />
          <div className="detail-updated">update {quote ? fmtTime(quote.ts) : "—"}</div>
        </div>
      </div>

      <div className="chart-toolbar">
        <span className="src-note">{seriesLabel}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {isBinance && CHART_INTERVALS.map((iv) => (
            <button key={iv} className={`sort-btn ${interval === iv ? "active" : ""}`} onClick={() => setChartInterval(iv)}>{iv}</button>
          ))}
          <button className="sort-btn" title="Vernieuwen"
            onClick={() => getStore().ensureSeries(asset.symbol, { interval, force: true })}>
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      <div className="detail-chart">
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`priceFill-${asset.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ECAE6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8ECAE6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(142,202,230,0.08)" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip
              contentStyle={{ background: "#0E1A28", border: "1px solid rgba(142,202,230,0.25)", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(t) => new Date(t).toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              formatter={(v, name) => [fmtPrice(v, asset), name === "sma20" ? "SMA(20)" : "Prijs"]}
            />
            <Area type="monotone" dataKey="price" stroke="#8ECAE6" strokeWidth={2} fill={`url(#priceFill-${asset.symbol})`} />
            <Area type="monotone" dataKey="sma20" stroke="#7DD9B3" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="indicator-row stats-row-6">
        <div className="indicator-chip"><span className="indicator-label">24u hoog</span>
          <span className="indicator-value">{fmtPrice(quote?.high, asset)}</span></div>
        <div className="indicator-chip"><span className="indicator-label">24u laag</span>
          <span className="indicator-value">{fmtPrice(quote?.low, asset)}</span></div>
        <div className="indicator-chip"><span className="indicator-label">24u volume</span>
          <span className="indicator-value">{fmtCompact(quote?.quoteVolume ?? quote?.volume)}</span></div>
        <div className="indicator-chip"><span className="indicator-label">RSI(14)</span>
          <span className="indicator-value">{ind ? ind.rsi.toFixed(0) : "—"}</span></div>
        <div className="indicator-chip"><span className="indicator-label">MACD</span>
          <span className="indicator-value">{ind ? (ind.macd.hist > 0 ? "Positief" : ind.macd.hist < 0 ? "Negatief" : "Vlak") : "—"}</span></div>
        <div className="indicator-chip"><span className="indicator-label">Trend</span>
          <span className="indicator-value">{ind ? (ind.trendUp ? "Stijgend" : "Dalend") : "—"}</span></div>
      </div>

      {advice && (
        <div className="advice-card">
          <div className="advice-head">
            <span className="advice-label">Technische analyse</span>
            <AdviceTag advice={advice.advice} />
          </div>
          <div className="advice-conf">
            <span>Signaalsterkte</span>
            <div className="conf-bar"><div className="conf-fill" style={{ width: `${advice.confidence}%` }} /></div>
            <span className="conf-num">{advice.confidence}%</span>
          </div>
          <ul className="advice-reasons">
            {advice.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <div className="advice-risk">
            <ShieldAlert size={13} /> Volatiliteit/risico: <b>{advice.risk}</b>
          </div>
          <div className="advice-disclaimer">
            <Info size={12} /> Automatische indicatie op basis van koersdata{quote?.live ? "" : " (gesimuleerd)"} — geen financieel advies, geen garantie.
          </div>
        </div>
      )}

      {related.length > 0 && (
        <>
          <div className="panel-title" style={{ marginTop: 16 }}>Grootste bewegers in {asset.categoryLabel}</div>
          <div className="news-list">
            {related.map(({ asset: a, quote: q }) => (
              <div key={a.symbol} className="news-row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="asset-symbol">{a.symbol}</span>
                  <span className="news-text">{a.name}</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="asset-price">{fmtPrice(q.price, a)}</span>
                  <ChangePill pct={q.changePct} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
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
  .detail-price-block { text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
  .detail-price { font-family:'JetBrains Mono', monospace; font-size:20px; color:#F4F8FB; }
  .detail-updated { font-size:10px; color:#5A7391; font-family:'JetBrains Mono', monospace; }
  .chart-toolbar { display:flex; justify-content:space-between; align-items:center; margin:8px 0 2px; }
  .src-note { font-size:10.5px; color:#5A7391; }
  .detail-chart { margin: 6px 0 6px; }
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

/* ---------- Testing (papertrading op live koersen) ---------- */

function TestingMode() {
  const market = useMarket();
  const paper = market.paper;
  const [depositAmount, setDepositAmount] = useState(1000);
  const [startAmount, setStartAmount] = useState(10000);
  const [customStart, setCustomStart] = useState("");
  const [confirmStart, setConfirmStart] = useState(false);
  const [selected, setSelected] = useState("BTC");
  const [qty, setQty] = useState(1);
  const [tradeMsg, setTradeMsg] = useState(null);
  const [giftAmount, setGiftAmount] = useState(0);
  const [giftMsg, setGiftMsg] = useState(null);

  const activeAsset = ASSETS_BY_SYMBOL[selected];
  const quote = market.quotes[selected];
  const price = quote?.price;

  const holdingsValue = Object.entries(paper.holdings).reduce((sum, [sym, h]) => {
    const q = market.quotes[sym];
    return sum + h.qty * (q ? q.price : h.avg);
  }, 0);
  const totalValue = paper.cash + holdingsValue;
  const pnl = totalValue - paper.startingCapital;
  const pnlPct = paper.startingCapital ? (pnl / paper.startingCapital) * 100 : 0;
  const pnlSign = pnl > 0.005 ? "pos" : pnl < -0.005 ? "neg" : "flat";
  const pnlDot = pnlSign === "pos" ? "🟢" : pnlSign === "neg" ? "🔴" : "⚪";

  const statusMsg =
    pnlSign === "pos" ? `${pnlDot} De AI heeft momenteel ${fmtMoney(Math.abs(pnl))} winst gemaakt.` :
    pnlSign === "neg" ? `${pnlDot} De AI staat momenteel ${fmtMoney(Math.abs(pnl))} in verlies.` :
    `${pnlDot} Nog geen winst of verlies.`;

  function doTrade(type) {
    const res = getStore().paperTrade(type, selected, Number(qty) || 0);
    setTradeMsg(res?.error || null);
    if (!res?.error) setTradeMsg(null);
  }

  function applyGiveCoins() {
    const res = getStore().paperGiveCoins(selected, giftAmount);
    setGiftMsg(res?.error || null);
    if (!res?.error) { setGiftAmount(0); setGiftMsg(null); }
  }

  function startTesting() {
    const amt = startAmount === "custom" ? Number(customStart) : startAmount;
    if (!amt || amt <= 0) return;
    getStore().paperStart(amt);
    setConfirmStart(false);
  }

  const realizedSells = paper.txs.filter((t) => t.type === "sell" && typeof t.profit === "number");
  const openPositions = Object.entries(paper.holdings).map(([sym, h]) => ({
    profit: ((market.quotes[sym]?.price ?? h.avg) - h.avg) * h.qty,
  }));
  const evaluated = [...realizedSells.map((t) => ({ profit: t.profit })), ...openPositions];
  const wins = evaluated.filter((e) => e.profit > 0).length;
  const successRate = evaluated.length ? Math.round((wins / evaluated.length) * 100) : null;

  const aiWatchRows = CORE_WATCH
    .map((sym) => ({ sym, asset: ASSETS_BY_SYMBOL[sym], st: market.aiStatus?.[sym] }))
    .filter((r) => r.asset);

  return (
    <div className="testing-wrap">
      <style>{TESTING_CSS}</style>

      <div className="start-box">
        <div className="start-head">
          <span className="deposit-label">Starten met een nieuwe test</span>
          <button
            className={`ai-toggle ${paper.aiActive ? "on" : ""}`}
            onClick={() => getStore().setAiActive(!paper.aiActive)}
            title="AI-papertrader handelt automatisch met nepgeld op live signalen (alleen activa met live data)"
          >
            <Bot size={13} /> AI-trader: {paper.aiActive ? "AAN" : "UIT"}
          </button>
        </div>
        <div className="start-amounts">
          {[1000, 5000, 10000].map((amt) => (
            <button key={amt} className={`sort-btn ${startAmount === amt ? "active" : ""}`} onClick={() => setStartAmount(amt)}>
              {fmtMoney(amt)}
            </button>
          ))}
          <button className={`sort-btn ${startAmount === "custom" ? "active" : ""}`} onClick={() => setStartAmount("custom")}>Eigen bedrag</button>
          {startAmount === "custom" && (
            <input
              type="number" min="1" className="deposit-input" placeholder="Bedrag…"
              value={customStart} onChange={(e) => setCustomStart(e.target.value)}
            />
          )}
          {!confirmStart ? (
            <button className="trade-btn buy" onClick={() => setConfirmStart(true)}>▶️ Start Testing</button>
          ) : (
            <>
              <span className="confirm-text">Dit reset je huidige test (saldo, posities, geschiedenis). Zeker weten?</span>
              <button className="trade-btn buy" onClick={startTesting}>Ja, start opnieuw</button>
              <button className="trade-btn sell" onClick={() => setConfirmStart(false)}>Annuleer</button>
            </>
          )}
        </div>

        <div className="deposit-controls" style={{ marginTop: 10 }}>
          <span className="deposit-label" style={{ marginRight: 4 }}>Of nepgeld bijstorten:</span>
          <span className="deposit-prefix">$</span>
          <input
            type="number" min="1" className="deposit-input" value={depositAmount}
            onChange={(e) => setDepositAmount(Math.max(1, Number(e.target.value) || 0))}
          />
          <button className="trade-btn buy" onClick={() => getStore().paperDeposit(depositAmount)}>Storten</button>
        </div>

        <div className="deposit-controls" style={{ marginTop: 10 }}>
          <span className="deposit-label" style={{ marginRight: 4 }}>Munten geven ({selected}):</span>
          <div className="gift-stepper">
            <button className="gift-step-btn" onClick={() => setGiftAmount((v) => v - 1)}>−</button>
            <input
              type="number" className="gift-step-input" value={giftAmount}
              onChange={(e) => setGiftAmount(Number(e.target.value) || 0)}
            />
            <button className="gift-step-btn" onClick={() => setGiftAmount((v) => v + 1)}>+</button>
          </div>
          <button className="trade-btn buy" onClick={applyGiveCoins} disabled={!giftAmount}>
            {giftAmount > 0 ? `Geef ${giftAmount} munten` : giftAmount < 0 ? `Haal ${-giftAmount} munten weg` : "Munten geven"}
          </button>
        </div>
        {giftMsg && <div className="trade-error"><AlertTriangle size={12} /> {giftMsg}</div>}
        <div className="gift-note">
          Los van het automatische systeem — de AI wint/verliest munten nog steeds vanzelf via trades. Dit is alleen een handmatige correctie op je huidige positie in {selected}, telt niet mee als winst of verlies.
        </div>
      </div>

      {!paper.aiActive && (
        <div className="ai-off-banner">
          <Bot size={15} />
          De AI-trader staat UIT — daarom gebeurt er niets vanzelf. Klik hierboven op "AI-trader: UIT" om 'm aan te zetten.
        </div>
      )}

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-label">Beginsaldo</span>
          <span className="stat-value">{fmtMoney(paper.startingCapital)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Huidig saldo</span>
          <span className={`stat-value ${pnlSign}`}>{fmtMoney(totalValue)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Resultaat</span>
          <span className={`stat-value ${pnlSign}`}>
            {pnl >= 0 ? "+" : ""}{fmtMoney(pnl)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Transacties</span>
          <span className="stat-value">{paper.txs.length}</span>
        </div>
      </div>

      <div className={`status-line ${pnlSign}`}>{statusMsg}</div>

      <div className="testing-grid">
        <div className="chart-panel">
          <div className="panel-title">Portefeuilleverloop</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={paper.history}>
              <CartesianGrid stroke="rgba(142,202,230,0.08)" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip
                contentStyle={{ background: "#0E1A28", border: "1px solid rgba(142,202,230,0.25)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [fmtMoney(v), "Waarde"]}
                labelFormatter={(t) => new Date(t).toLocaleTimeString("nl-NL")}
              />
              <Line type="monotone" dataKey="value" stroke={pnlSign === "neg" ? "#E8846B" : "#7DD9B3"} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>

          <div className="panel-title" style={{ marginTop: 18 }}>Handelen (nepgeld, live koersen)</div>
          <div className="trade-box">
            <select className="trade-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {CATEGORY_ORDER.map((catKey) => (
                <optgroup key={catKey} label={ASSET_CATEGORIES[catKey].label}>
                  {ASSET_CATEGORIES[catKey].items.map((a) => (
                    <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="trade-price">{fmtPrice(price, activeAsset)}</span>
            <LiveChip quote={quote} compact />
            <input
              type="number" min="0.000001" step="any" className="trade-qty" value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <button className="trade-btn buy" onClick={() => doTrade("buy")}>Koop</button>
            <button className="trade-btn sell" onClick={() => doTrade("sell")}>Verkoop</button>
          </div>
          {tradeMsg && <div className="trade-error"><AlertTriangle size={12} /> {tradeMsg}</div>}

          <div className="panel-title" style={{ marginTop: 18 }}>
            <Bot size={12} style={{ marginRight: 5, verticalAlign: "-2px" }} />
            Wat de AI nu ziet {paper.aiActive ? "" : "(uitgeschakeld)"}
          </div>
          <div className="ai-status-list">
            {aiWatchRows.map(({ sym, asset, st }) => {
              const needsTdKey = asset.src.kind === "td" && !market.tdKey;
              const secondsAgo = st?.time ? Math.round((Date.now() - st.time) / 1000) : null;
              return (
                <div className="ai-status-row" key={sym}>
                  <div className="ai-status-head">
                    <span className="holding-symbol">{sym}</span>
                    <span style={{ fontSize: 11, color: "#7C93AC" }}>{asset.name}</span>
                    {st?.advice && <AdviceTag advice={st.advice} />}
                    {st?.confidence != null && <span className="ai-status-conf">{st.confidence}%</span>}
                    {secondsAgo != null && <span className="ai-status-age">· {secondsAgo}s geleden gecheckt</span>}
                  </div>
                  <div className="ai-status-note">
                    {needsTdKey
                      ? "Vereist een gratis Twelve Data-key (zie Instellingen) — zonder key kan de AI dit activum niet volgen."
                      : st?.note || "Nog niet geëvalueerd sinds pagina open ging…"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="side-panel">
          <div className="panel-title">Open posities</div>
          {Object.keys(paper.holdings).length === 0 && <div className="empty-note">Nog geen posities geopend.</div>}
          {Object.entries(paper.holdings).map(([sym, h]) => {
            const a = ASSETS_BY_SYMBOL[sym];
            const cur = market.quotes[sym]?.price ?? h.avg;
            const diff = h.avg > 0 ? ((cur - h.avg) / h.avg) * 100 : 0;
            return (
              <div className="holding-row" key={sym}>
                <div>
                  <div className="holding-symbol">{sym}</div>
                  <div className="holding-qty">{fmtQty(h.qty)} stuks · gem. {fmtPrice(h.avg, a)}</div>
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
                ? "Nog geen posities of verkopen — het percentage verschijnt zodra de AI (of jij) handelt."
                : "Aandeel posities met winst — open posities tegen actuele koers plus afgesloten verkopen."}
            </div>
          </div>
        </div>
      </div>

      <div className="panel-title" style={{ marginTop: 20 }}>Transactiegeschiedenis</div>
      <div className="tx-list">
        <div className="tx-row head">
          <span>Type</span><span>Wie</span><span>Asset</span><span>Aantal</span>
          <span>Prijs</span><span>Resultaat</span><span>AI-reden</span><span>Conf.</span><span style={{ textAlign: "right" }}>Datum/tijd</span>
        </div>
        {paper.txs.length === 0 && <div className="empty-note">Nog geen transacties.</div>}
        {paper.txs.slice(0, 60).map((t) => (
          <div className="tx-row" key={t.id}>
            <span className={`tx-type ${t.type}`}>
              {t.type === "buy" ? "Koop" : t.type === "sell" ? "Verkoop" : t.type === "gift" ? (t.qty >= 0 ? "Gift +" : "Gift −") : "Storting"}
            </span>
            <span className={`tx-origin ${t.origin === "risico" ? "risk" : ""}`}>{t.origin === "ai" ? "AI" : t.origin === "risico" ? "Risico" : "Jij"}</span>
            <span className="tx-symbol">{t.symbol}</span>
            <span className="tx-qty">{t.type === "deposit" ? "—" : fmtQty(t.type === "gift" ? Math.abs(t.qty) : t.qty)}</span>
            <span className="tx-price">
              {t.type === "deposit" ? fmtMoney(t.price) : fmtPrice(t.price, ASSETS_BY_SYMBOL[t.symbol])}
            </span>
            <span className={`tx-result ${typeof t.profit === "number" ? (t.profit >= 0 ? "pos" : "neg") : ""}`}>
              {typeof t.profit === "number" ? (t.profit >= 0 ? "+" : "") + fmtMoney(t.profit) : "—"}
            </span>
            <span className="tx-reason" title={t.reason || ""}>{t.reason || "—"}</span>
            <span className="tx-conf">{t.confidence != null ? `${t.confidence}%` : "—"}</span>
            <span className="tx-time">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TESTING_CSS = `
  .start-box { background:#131F2E; border:1px solid rgba(142,202,230,0.15); border-radius:12px; padding:14px 16px; margin-bottom:14px; }
  .start-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .start-amounts { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .confirm-text { font-size:11.5px; color:#E8846B; }
  .deposit-box { background:#131F2E; border:1px solid rgba(125,217,179,0.25); border-radius:12px; padding:12px 16px;
    display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:14px; flex-wrap:wrap; }
  .deposit-label { font-size:12px; color:#B8C9DB; }
  .deposit-controls { display:flex; align-items:center; gap:6px; }
  .deposit-prefix { color:#7C93AC; font-size:13px; }
  .deposit-input { width:100px; background:#0E1A28; color:#F4F8FB; border:1px solid rgba(142,202,230,0.2); border-radius:8px; padding:8px; font-size:12.5px; }
  .gift-stepper { display:flex; align-items:center; gap:0; }
  .gift-step-btn { width:32px; height:34px; background:#0E1A28; border:1px solid rgba(142,202,230,0.2); color:#8ECAE6;
    font-size:16px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .gift-step-btn:first-child { border-radius:8px 0 0 8px; border-right:none; }
  .gift-step-btn:last-child { border-radius:0 8px 8px 0; border-left:none; }
  .gift-step-btn:hover { background:#16263A; }
  .gift-step-input { width:70px; height:34px; text-align:center; background:#0E1A28; color:#F4F8FB;
    border:1px solid rgba(142,202,230,0.2); border-left:none; border-right:none; font-size:13px; font-family:'JetBrains Mono', monospace; }
  .gift-note { font-size:11px; color:#5A7391; margin-top:8px; line-height:1.5; }
  .ai-toggle { display:flex; align-items:center; gap:6px; background:#0E1A28; border:1px solid rgba(142,202,230,0.2);
    color:#7C93AC; padding:8px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; }
  .ai-toggle.on { border-color:#7DD9B3; color:#7DD9B3; background:rgba(125,217,179,0.08); }
  .stat-row { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:12px; }
  .stat-card { background:#131F2E; border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:6px; }
  .stat-label { font-size:11px; color:#5A7391; text-transform:uppercase; letter-spacing:0.06em; }
  .stat-value { font-family:'JetBrains Mono', monospace; font-size:17px; color:#F4F8FB; }
  .stat-value.pos { color:#7DD9B3; }
  .stat-value.neg { color:#E8846B; }
  .stat-value.flat { color:#B8C9DB; }
  .ai-off-banner { display:flex; align-items:center; gap:8px; background:rgba(232,132,107,0.1); border:1px solid rgba(232,132,107,0.35);
    color:#E8846B; font-size:12.5px; font-weight:600; padding:10px 14px; border-radius:10px; margin-bottom:14px; }
  .status-line { font-size:13px; font-weight:600; padding:10px 14px; border-radius:10px; margin-bottom:16px; }
  .status-line.pos { background:rgba(125,217,179,0.1); color:#7DD9B3; border:1px solid rgba(125,217,179,0.3); }
  .status-line.neg { background:rgba(232,132,107,0.1); color:#E8846B; border:1px solid rgba(232,132,107,0.3); }
  .status-line.flat { background:rgba(142,202,230,0.08); color:#B8C9DB; border:1px solid rgba(142,202,230,0.2); }
  .testing-grid { display:grid; grid-template-columns: 1.6fr 1fr; gap:18px; }
  .chart-panel, .side-panel { background:#131F2E; border:1px solid rgba(142,202,230,0.12); border-radius:16px; padding:18px 20px; }
  .panel-title { font-size:12px; color:#8ECAE6; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; font-weight:600; }
  .trade-box { display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:#0E1A28; border-radius:10px; padding:10px 12px; }
  .trade-select { background:#0B1420; color:#F4F8FB; border:1px solid rgba(142,202,230,0.2); border-radius:8px; padding:8px 10px; font-size:12.5px; max-width:220px; }
  .trade-price { font-family:'JetBrains Mono', monospace; color:#F4F8FB; font-size:13px; min-width:80px; }
  .trade-qty { width:80px; background:#0B1420; color:#F4F8FB; border:1px solid rgba(142,202,230,0.2); border-radius:8px; padding:8px; font-size:12.5px; }
  .trade-btn { border:none; border-radius:8px; padding:9px 16px; font-weight:600; font-size:12.5px; cursor:pointer; }
  .trade-btn.buy { background:#7DD9B3; color:#0B1420; }
  .trade-btn.sell { background:#E8846B; color:#0B1420; }
  .trade-error { display:flex; align-items:center; gap:6px; color:#E8846B; font-size:12px; margin-top:8px; }
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
  .ai-status-list { display:flex; flex-direction:column; gap:6px; max-height:220px; overflow:auto; }
  .ai-status-row { background:#0E1A28; border-radius:8px; padding:8px 12px; }
  .ai-status-head { display:flex; align-items:center; gap:8px; margin-bottom:3px; }
  .ai-status-conf { font-family:'JetBrains Mono', monospace; font-size:11px; color:#8ECAE6; }
  .ai-status-age { font-size:10.5px; color:#5A7391; }
  .ai-status-note { font-size:11.5px; color:#7C93AC; line-height:1.4; }
  .tx-list { display:flex; flex-direction:column; gap:2px; overflow-x:auto; }
  .tx-row { display:grid; grid-template-columns: 64px 34px 56px 60px 74px 84px 1fr 50px 100px; align-items:center; gap:8px;
    background:#131F2E; border-radius:8px; padding:9px 14px; font-size:11.5px; min-width:820px; }
  .tx-row.head { background:none; color:#5A7391; font-size:10px; text-transform:uppercase; letter-spacing:.04em; padding:2px 14px; }
  .tx-type { font-weight:600; font-size:11px; padding:3px 8px; border-radius:6px; text-align:center; }
  .tx-type.buy { background:rgba(125,217,179,0.15); color:#7DD9B3; }
  .tx-type.sell { background:rgba(232,132,107,0.15); color:#E8846B; }
  .tx-type.deposit { background:rgba(142,202,230,0.15); color:#8ECAE6; }
  .tx-type.gift { background:rgba(231,196,107,0.15); color:#E7C46B; }
  .tx-origin { font-size:10px; color:#8ECAE6; font-weight:600; }
  .tx-origin.risk { color:#E8846B; }
  .tx-symbol { font-family:'JetBrains Mono', monospace; color:#F4F8FB; font-weight:600; }
  .tx-qty { color:#B8C9DB; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tx-price { color:#F4F8FB; font-family:'JetBrains Mono', monospace; }
  .tx-result { font-family:'JetBrains Mono', monospace; color:#B8C9DB; }
  .tx-result.pos { color:#7DD9B3; }
  .tx-result.neg { color:#E8846B; }
  .tx-reason { color:#8ECAE6; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tx-conf { font-family:'JetBrains Mono', monospace; color:#7C93AC; }
  .tx-time { color:#5A7391; text-align:right; font-family:'JetBrains Mono', monospace; white-space:nowrap; }
`;

/* ---------- Live Mode (signalen loggen, nooit echte orders) ---------- */

function LiveMode() {
  const market = useMarket();
  const [brokerConnected, setBrokerConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [maxPerTrade, setMaxPerTrade] = useState(500);
  const [maxDailyLossPct, setMaxDailyLossPct] = useState(5);
  const [marketsAllowed, setMarketsAllowed] = useState({ stocks: true, crypto: true, forex: false });
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [log, setLog] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const lastAdviceRef = useRef({});
  const logIdRef = useRef(1);

  useEffect(() => {
    // series voor de watchlist klaarzetten (crypto is keyless)
    WATCH_POOL.slice(0, market.aiWatchCount).forEach((sym) => getStore().ensureSeries(sym));
  }, [market.aiWatchCount]);

  const rows = useMemo(() => {
    return WATCH_POOL.slice(0, market.aiWatchCount).map((sym) => {
      const asset = ASSETS_BY_SYMBOL[sym];
      const quote = market.quotes[sym];
      const series = seriesFor(market, sym, "1u");
      let advice = null;
      if (series && series.points.length >= 5) {
        const closes = series.points.map((p) => p.price);
        if (quote?.live) closes[closes.length - 1] = quote.price;
        advice = generateAdvice(computeIndicators(closes));
      }
      return { asset, quote, advice, simSignal: !quote?.live || series?.source === "sim" };
    });
  }, [market]);

  function pushLog(text, type = "info") {
    setLog((l) => [{ id: logIdRef.current++, time: fmtTime(Date.now()), text, type }, ...l].slice(0, 40));
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
      pushLog(next ? "Live handelen ingeschakeld (signaal-logboek)." : "Live handelen uitgeschakeld.", next ? "ok" : "warn");
      return next;
    });
  }

  useEffect(() => {
    if (!liveEnabled) return;
    rows.forEach(({ asset, advice, simSignal }) => {
      if (!advice || simSignal) return; // alleen signalen op echte data loggen
      const prev = lastAdviceRef.current[asset.symbol];
      if (advice.advice !== "HOUDEN" && advice.advice !== prev) {
        const allowed =
          asset.category === "crypto" ? marketsAllowed.crypto :
          asset.category === "forex" ? marketsAllowed.forex : marketsAllowed.stocks;
        if (allowed) {
          pushLog(
            `Signaal ${asset.symbol}: ${advice.advice} (${advice.confidence}%, max $${maxPerTrade}/transactie) — niet uitgevoerd, geen broker-API gekoppeld.`,
            advice.advice === "MOGELIJK KOPEN" ? "buy" : "sell"
          );
        }
      }
      lastAdviceRef.current[asset.symbol] = advice.advice;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, liveEnabled]);

  return (
    <div className="live-wrap">
      <style>{LIVE_CSS}</style>

      <div className="live-banner">
        <ShieldAlert size={15} />
        Deze app voert nooit echte orders uit — er is bewust geen broker-API gekoppeld. Signalen hieronder komen wel van echte marktdata.
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
              <input type="number" min="1" value={maxPerTrade}
                onChange={(e) => setMaxPerTrade(Math.max(1, Number(e.target.value) || 1))} />
            </div>
          </div>
          <div className="form-row">
            <label>Maximaal dagverlies</label>
            <div className="input-suffix">
              <input type="number" min="1" max="100" value={maxDailyLossPct}
                onChange={(e) => setMaxDailyLossPct(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
              <span>%</span>
            </div>
          </div>
          <div className="form-row">
            <label>Toegestane markten</label>
            <div className="checkbox-row">
              {[["stocks", "Aandelen"], ["crypto", "Crypto"], ["forex", "Forex"]].map(([key, label]) => (
                <button
                  key={key}
                  className={`chip-toggle ${marketsAllowed[key] ? "active" : ""}`}
                  onClick={() => setMarketsAllowed((m) => ({ ...m, [key]: !m[key] }))}
                >
                  {marketsAllowed[key] && <Check size={11} />} {label}
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
            {rows.map(({ asset, quote, advice, simSignal }) => {
              const isOpen = expanded === asset.symbol;
              return (
                <div key={asset.symbol} className={`signal-item ${isOpen ? "open" : ""}`}>
                  <button className="signal-row" onClick={() => setExpanded(isOpen ? null : asset.symbol)}>
                    <div className="signal-id">
                      <span className="signal-symbol">{asset.symbol}</span>
                      <span className="signal-name">{asset.name}</span>
                      <span className="signal-price">{fmtPrice(quote?.price, asset)}</span>
                      {simSignal && <span className="live-chip sim"><span className="live-dot" />SIM</span>}
                    </div>
                    <div className="signal-right">
                      {advice ? <AdviceTag advice={advice.advice} /> : <span className="empty-note">laden…</span>}
                      <ChevronRight size={14} className="signal-chevron" />
                    </div>
                  </button>
                  {isOpen && advice && (
                    <div className="signal-detail">
                      <div className="advice-conf">
                        <span>Signaalsterkte</span>
                        <div className="conf-bar"><div className="conf-fill" style={{ width: `${advice.confidence}%` }} /></div>
                        <span className="conf-num">{advice.confidence}%</span>
                      </div>
                      <ul className="advice-reasons">
                        {advice.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                      <div className="advice-risk">
                        <ShieldAlert size={13} /> Volatiliteit/risico: <b>{advice.risk}</b>
                      </div>
                      <div className="signal-action-note">
                        {advice.advice === "MOGELIJK KOPEN" && `Zou kopen tot max $${maxPerTrade} in ${asset.symbol} als Live Mode actief is en ${asset.categoryLabel.toLowerCase()} is toegestaan.`}
                        {advice.advice === "MOGELIJK VERKOPEN" && `Zou een openstaande positie in ${asset.symbol} sluiten als Live Mode actief is.`}
                        {advice.advice === "HOUDEN" && `Geen actie — signaal houdt ${asset.symbol} momenteel aan.`}
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
  .signal-list .tag { font-size:10px; padding:4px 9px; white-space:nowrap; }
  .signal-item { background:#0E1A28; border-radius:8px; overflow:hidden; }
  .signal-item.open { outline:1px solid rgba(142,202,230,0.25); }
  .signal-row { width:100%; display:flex; justify-content:space-between; align-items:center; gap:8px; background:none; border:none;
    padding:9px 12px; cursor:pointer; text-align:left; }
  .signal-id { display:flex; align-items:center; gap:10px; min-width:0; flex:1; }
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

/* ---------- Markt-venster (top-bewegers + bronstatus) ---------- */

function MarketOverview({ onOpenAsset }) {
  const market = useMarket();

  const liveRows = ALL_ASSETS
    .map((a) => ({ asset: a, quote: market.quotes[a.symbol] }))
    .filter((r) => r.quote?.live && isFinite(r.quote.changePct));
  const gainers = [...liveRows].sort((a, b) => b.quote.changePct - a.quote.changePct).slice(0, 5);
  const losers = [...liveRows].sort((a, b) => a.quote.changePct - b.quote.changePct).slice(0, 5);

  const statusLabel = (s) => (
    s === "ok" ? ["Verbonden", "ok"] :
    s === "error" ? ["Storing", "err"] :
    s === "no-key" ? ["Geen API-key", "warn"] :
    s === "invalid" ? ["Key ongeldig", "err"] :
    s === "limit" ? ["Daglimiet bereikt", "warn"] :
    s === "testing" ? ["Key testen…", "warn"] : ["Wachten…", "warn"]
  );

  return (
    <div>
      <style>{MARKET_CSS}</style>
      <div className="panel-title">Databronnen</div>
      <div className="source-grid">
        {[
          ["Binance", "Crypto + goud (PAXG) — realtime", market.status.binance],
          ["ECB / Frankfurter", "Forex — dagkoersen", market.status.ecb],
          ["Twelve Data", "Aandelen & ETF's — live quotes", market.status.td],
        ].map(([name, desc, st]) => {
          const [label, cls] = statusLabel(st);
          return (
            <div key={name} className="source-row">
              <div>
                <div className="source-name">{name}</div>
                <div className="source-desc">{desc}</div>
              </div>
              <span className={`source-status ${cls}`}>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="src-note" style={{ margin: "6px 0 14px" }}>
        Activa zonder live bron draaien gesimuleerd rond een snapshot van {SNAPSHOT_DATE} en zijn gemarkeerd als SIM.
        Laatste update: {market.lastUpdate ? fmtTime(market.lastUpdate) : "—"}.
      </div>

      <div className="movers-grid">
        <div>
          <div className="panel-title">Grootste stijgers (live)</div>
          {gainers.map(({ asset, quote }) => (
            <button key={asset.symbol} className="mover-row" onClick={() => onOpenAsset(asset)}>
              <span className="asset-symbol">{asset.symbol}</span>
              <span className="mover-name">{asset.name}</span>
              <ChangePill pct={quote.changePct} />
            </button>
          ))}
          {gainers.length === 0 && <div className="empty-note">Wachten op live data…</div>}
        </div>
        <div>
          <div className="panel-title">Grootste dalers (live)</div>
          {losers.map(({ asset, quote }) => (
            <button key={asset.symbol} className="mover-row" onClick={() => onOpenAsset(asset)}>
              <span className="asset-symbol">{asset.symbol}</span>
              <span className="mover-name">{asset.name}</span>
              <ChangePill pct={quote.changePct} />
            </button>
          ))}
          {losers.length === 0 && <div className="empty-note">Wachten op live data…</div>}
        </div>
      </div>
    </div>
  );
}

const MARKET_CSS = `
  .source-grid { display:flex; flex-direction:column; gap:6px; margin-bottom:8px; }
  .source-row { display:flex; justify-content:space-between; align-items:center; background:#0E1A28; border-radius:10px; padding:10px 14px; }
  .source-name { color:#F4F8FB; font-size:13px; font-weight:600; }
  .source-desc { color:#5A7391; font-size:11px; margin-top:2px; }
  .source-status { font-size:11px; font-weight:600; padding:4px 10px; border-radius:20px; }
  .source-status.ok { background:rgba(125,217,179,0.15); color:#7DD9B3; }
  .source-status.err { background:rgba(232,132,107,0.15); color:#E8846B; }
  .source-status.warn { background:rgba(142,202,230,0.12); color:#8ECAE6; }
  .movers-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .mover-row { width:100%; display:flex; align-items:center; gap:8px; background:#131F2E; border:1px solid transparent;
    border-radius:8px; padding:8px 12px; cursor:pointer; margin-bottom:4px; }
  .mover-row:hover { border-color:rgba(142,202,230,0.25); }
  .mover-name { flex:1; text-align:left; color:#7C93AC; font-size:11.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
`;

/* ---------- Portfolio-venster ---------- */

function PortfolioWindow() {
  const market = useMarket();
  const paper = market.paper;

  const positions = Object.entries(paper.holdings).map(([sym, h]) => {
    const a = ASSETS_BY_SYMBOL[sym];
    const price = market.quotes[sym]?.price ?? h.avg;
    const value = h.qty * price;
    return { sym, asset: a, h, price, value, pnl: (price - h.avg) * h.qty };
  }).sort((x, y) => y.value - x.value);

  const holdingsValue = positions.reduce((s, p) => s + p.value, 0);
  const totalValue = paper.cash + holdingsValue;
  const pnl = totalValue - paper.startingCapital;

  return (
    <div>
      <style>{PORTFOLIO_CSS}</style>
      <div className="stat-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="stat-card"><span className="stat-label">Totale waarde</span>
          <span className="stat-value">{fmtMoney(totalValue)}</span></div>
        <div className="stat-card"><span className="stat-label">Resultaat</span>
          <span className={`stat-value ${pnl >= 0 ? "pos" : "neg"}`}>{pnl >= 0 ? "+" : ""}{fmtMoney(pnl)}</span></div>
        <div className="stat-card"><span className="stat-label">Vrije cash</span>
          <span className="stat-value">{fmtMoney(paper.cash)}</span></div>
      </div>

      <div className="panel-title" style={{ marginTop: 14 }}>Allocatie (papertrading)</div>
      {positions.length === 0 && <div className="empty-note">Geen open posities — open de Testing-app om te handelen (of laat de AI-trader aan staan).</div>}
      {positions.map((p) => (
        <div key={p.sym} className="alloc-row">
          <div className="alloc-head">
            <span className="asset-symbol">{p.sym}</span>
            <span className="alloc-name">{p.asset?.name}</span>
            <span className={`ticker-change ${p.pnl >= 0 ? "up" : "down"}`}>
              {p.pnl >= 0 ? "+" : ""}{fmtMoney(p.pnl)}
            </span>
            <span className="alloc-value">{fmtMoney(p.value)}</span>
          </div>
          <div className="alloc-bar">
            <div className="alloc-fill" style={{ width: `${totalValue > 0 ? (p.value / totalValue) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
      {totalValue > 0 && (
        <div className="alloc-row">
          <div className="alloc-head">
            <span className="asset-symbol">CASH</span>
            <span className="alloc-name">Vrij nepgeld</span>
            <span className="alloc-value">{fmtMoney(paper.cash)}</span>
          </div>
          <div className="alloc-bar"><div className="alloc-fill cash" style={{ width: `${(paper.cash / totalValue) * 100}%` }} /></div>
        </div>
      )}
    </div>
  );
}

const PORTFOLIO_CSS = `
  .alloc-row { margin-bottom:10px; }
  .alloc-head { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
  .alloc-name { flex:1; color:#7C93AC; font-size:11.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .alloc-value { font-family:'JetBrains Mono', monospace; color:#F4F8FB; font-size:12px; }
  .alloc-bar { height:6px; background:#1B2A3B; border-radius:4px; overflow:hidden; }
  .alloc-fill { height:100%; background:linear-gradient(90deg,#8ECAE6,#7DD9B3); }
  .alloc-fill.cash { background:#5A7391; }
`;

/* ---------- Instellingen ---------- */

function SettingsWindow() {
  const market = useMarket();
  const [keyInput, setKeyInput] = useState(market.tdKey || "");
  const [confirmReset, setConfirmReset] = useState(false);

  const tdStatus = market.status.td;
  const tdMsg =
    tdStatus === "ok" ? ["Key werkt — aandelen & ETF's zijn live.", "ok"] :
    tdStatus === "invalid" ? ["Key geweigerd door Twelve Data. Controleer of je hem goed hebt geplakt.", "err"] :
    tdStatus === "limit" ? ["Rate-limit bereikt (8/min of 800/dag). Data komt vertraagd binnen.", "warn"] :
    tdStatus === "testing" ? ["Key wordt getest…", "warn"] :
    tdStatus === "no-key" ? ["Geen key ingesteld — aandelen/ETF's draaien gesimuleerd (SIM).", "warn"] :
    ["Nog niet getest.", "warn"];

  return (
    <div>
      <style>{SETTINGS_CSS}</style>
      <div className="panel-title"><KeyRound size={12} style={{ marginRight: 5, verticalAlign: "-2px" }} />Twelve Data API-key (aandelen & ETF's live)</div>
      <div className="settings-block">
        <p className="settings-text">
          Crypto (Binance) en forex (ECB) zijn al live zonder key. Voor live <b>aandelen en ETF's</b> heb je een
          gratis key nodig van <b>twelvedata.com</b> (800 credits per dag, 8 per minuut, 1 credit per aandeel —
          de app doseert dit automatisch).
        </p>
        <div className="key-row">
          <input
            className="key-input" type="text" spellCheck={false} placeholder="Plak hier je API-key…"
            value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
          />
          <button className="live-btn primary" onClick={() => getStore().setTdKey(keyInput)}>Opslaan & testen</button>
          {market.tdKey && (
            <button className="live-btn ghost" onClick={() => { setKeyInput(""); getStore().setTdKey(""); }}>
              <Trash2 size={12} style={{ verticalAlign: "-2px" }} /> Wis key
            </button>
          )}
        </div>
        <div className={`td-status ${tdMsg[1]}`}>{tdMsg[0]}</div>
        <p className="settings-text dim">
          De key wordt alleen lokaal in je browser opgeslagen (localStorage) en gaat rechtstreeks naar Twelve Data — nooit naar een andere server.
        </p>
      </div>

      <div className="panel-title" style={{ marginTop: 18 }}>Databronnen & versheid</div>
      <div className="settings-block">
        <ul className="settings-list">
          <li><b>Crypto + goud (PAXG):</b> Binance, elke 8 seconden ververst.</li>
          <li><b>Forex:</b> ECB-referentiekoersen via Frankfurter, dagelijks (weekend = vrijdagkoers).</li>
          <li><b>Aandelen/ETF's:</b> Twelve Data, quotes per ~2 min (rate-limit vriendelijk).</li>
          <li><b>Indices & overige commodities:</b> nog geen gratis live bron — gesimuleerd rond snapshot {SNAPSHOT_DATE}, gemarkeerd als SIM.</li>
        </ul>
      </div>

      <div className="panel-title" style={{ marginTop: 18 }}><RotateCcw size={12} style={{ marginRight: 5, verticalAlign: "-2px" }} />Papertrading resetten</div>
      <div className="settings-block">
        <p className="settings-text">Zet de Testing-portefeuille terug naar $10.000 en wist alle transacties (lokaal opgeslagen).</p>
        {!confirmReset ? (
          <button className="live-btn ghost" onClick={() => setConfirmReset(true)}>Reset portefeuille…</button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="settings-text" style={{ color: "#E8846B" }}>Zeker weten?</span>
            <button className="live-btn primary" onClick={() => { getStore().paperReset(); setConfirmReset(false); }}>Ja, reset</button>
            <button className="live-btn ghost" onClick={() => setConfirmReset(false)}>Annuleer</button>
          </div>
        )}
      </div>

      <div className="advice-disclaimer" style={{ marginTop: 16 }}>
        <Info size={12} /> Snowy_Tracks is een analyse- en oefentool. Signalen zijn technische indicaties, geen financieel advies.
        Er worden nooit echte orders geplaatst.
      </div>
    </div>
  );
}

const SETTINGS_CSS = `
  .settings-block { background:#0E1A28; border-radius:12px; padding:14px 16px; }
  .settings-text { color:#B8C9DB; font-size:12.5px; line-height:1.6; margin:0 0 10px; }
  .settings-text.dim { color:#5A7391; font-size:11px; margin:10px 0 0; }
  .settings-list { margin:0; padding-left:18px; color:#B8C9DB; font-size:12.5px; line-height:1.9; }
  .key-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .key-input { flex:1; min-width:200px; background:#0B1420; border:1px solid rgba(142,202,230,0.25); border-radius:8px;
    padding:10px 12px; color:#F4F8FB; font-family:'JetBrains Mono', monospace; font-size:12px; outline:none; }
  .key-input:focus { border-color:#8ECAE6; }
  .td-status { margin-top:10px; font-size:12px; padding:8px 12px; border-radius:8px; }
  .td-status.ok { background:rgba(125,217,179,0.12); color:#7DD9B3; }
  .td-status.err { background:rgba(232,132,107,0.12); color:#E8846B; }
  .td-status.warn { background:rgba(142,202,230,0.1); color:#8ECAE6; }
`;

/* ---------- window manager ---------- */

/* ---------- Backtest ---------- */

const BACKTEST_PERIODS = [["1m", 30, "1 Maand"], ["3m", 90, "3 Maanden"], ["1y", 365, "1 Jaar"], ["5y", 365 * 5, "5 Jaar"]];
const BACKTEST_ASSETS = ALL_ASSETS.filter((a) => a.src.kind === "binance");

function BacktestWindow() {
  const [symbol, setSymbol] = useState(BACKTEST_ASSETS[0]?.symbol);
  const [periodKey, setPeriodKey] = useState("3m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const asset = ASSETS_BY_SYMBOL[symbol];
  const period = BACKTEST_PERIODS.find((p) => p[0] === periodKey);

  function run() {
    if (!asset) return;
    setLoading(true); setError(null); setResult(null);
    runBacktestFor(asset, period[1])
      .then((r) => setResult(r))
      .catch((e) => setError(e.message || "Onbekende fout bij het ophalen van historische data."))
      .finally(() => setLoading(false));
  }

  const chartData = result
    ? result.equity.filter((_, i) => i % Math.max(1, Math.floor(result.equity.length / 300)) === 0)
    : [];

  return (
    <div>
      <style>{BACKTEST_CSS}</style>
      <div className="advice-disclaimer" style={{ marginBottom: 14 }}>
        <Info size={12} /> Test de échte strategie (dezelfde code als Testing Mode) op échte historische Binance-koersen.
        Alleen crypto + goud (PAXG): dat is de enige bron hier met gratis, sleutelloze, diepe geschiedenis.
      </div>

      <div className="panel-title">Instellingen</div>
      <div className="bt-controls">
        <select className="bt-select" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {BACKTEST_ASSETS.map((a) => <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</option>)}
        </select>
        <div className="bt-periods">
          {BACKTEST_PERIODS.map(([k, , label]) => (
            <button key={k} className={`sort-btn ${periodKey === k ? "active" : ""}`} onClick={() => setPeriodKey(k)}>{label}</button>
          ))}
        </div>
        <button className="live-btn primary" onClick={run} disabled={loading}>
          {loading ? "Bezig met backtesten…" : "▶️ Start backtest"}
        </button>
      </div>

      {error && (
        <div className="td-status err" style={{ marginTop: 10 }}>{error}</div>
      )}

      {result && (
        <>
          <div className="stat-row" style={{ marginTop: 16 }}>
            <div className="stat-card">
              <span className="stat-label">Resultaat bot</span>
              <span className={`stat-value ${result.profit_pct >= 0 ? "pos" : "neg"}`}>{result.profit_pct >= 0 ? "+" : ""}{result.profit_pct.toFixed(1)}%</span>
              <span className="stat-sub">{fmtMoney(result.start_value)} → {fmtMoney(result.final_value)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Buy &amp; hold</span>
              <span className={`stat-value ${result.buy_hold_pct >= 0 ? "pos" : "neg"}`}>{result.buy_hold_pct >= 0 ? "+" : ""}{result.buy_hold_pct.toFixed(1)}%</span>
              <span className="stat-sub">gewoon vasthouden</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Verschil</span>
              <span className={`stat-value ${result.profit_pct - result.buy_hold_pct >= 0 ? "pos" : "neg"}`}>
                {(result.profit_pct - result.buy_hold_pct >= 0 ? "+" : "") + (result.profit_pct - result.buy_hold_pct).toFixed(1)}%
              </span>
              <span className="stat-sub">bot t.o.v. buy&amp;hold</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Grootste dip</span>
              <span className="stat-value">{result.max_drawdown_pct.toFixed(1)}%</span>
            </div>
          </div>

          <div className="detail-chart" style={{ marginTop: 12 }}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="btFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={result.profit_pct >= 0 ? "#7DD9B3" : "#E8846B"} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={result.profit_pct >= 0 ? "#7DD9B3" : "#E8846B"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(142,202,230,0.08)" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip
                  contentStyle={{ background: "#0E1A28", border: "1px solid rgba(142,202,230,0.25)", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(t) => new Date(t).toLocaleDateString("nl-NL")}
                  formatter={(v) => [fmtMoney(v), "Waarde"]}
                />
                <Area type="monotone" dataKey="value" stroke={result.profit_pct >= 0 ? "#7DD9B3" : "#E8846B"} strokeWidth={2} fill="url(#btFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="stat-row" style={{ marginTop: 12 }}>
            <div className="stat-card"><span className="stat-label">Trades</span><span className="stat-value">{result.n_trades}</span><span className="stat-sub">{result.n_round_trips} afgerond</span></div>
            <div className="stat-card"><span className="stat-label">Winrate</span><span className="stat-value">{result.win_rate == null ? "—" : result.win_rate.toFixed(0) + "%"}</span></div>
            <div className="stat-card"><span className="stat-label">Gem. winst</span><span className="stat-value pos">{result.avg_win_pct == null ? "—" : "+" + result.avg_win_pct.toFixed(1) + "%"}</span></div>
            <div className="stat-card"><span className="stat-label">Gem. verlies</span><span className="stat-value neg">{result.avg_loss_pct == null ? "—" : result.avg_loss_pct.toFixed(1) + "%"}</span></div>
            <div className="stat-card"><span className="stat-label">Grootste winst</span><span className="stat-value pos">{result.biggest_win_pct == null ? "—" : "+" + result.biggest_win_pct.toFixed(1) + "%"}</span></div>
            <div className="stat-card"><span className="stat-label">Grootste verlies</span><span className="stat-value neg">{result.biggest_loss_pct == null ? "—" : result.biggest_loss_pct.toFixed(1) + "%"}</span></div>
            <div className="stat-card"><span className="stat-label">Profit factor</span><span className="stat-value">{result.profit_factor == null ? "—" : result.profit_factor === Infinity ? "∞" : result.profit_factor.toFixed(2)}</span></div>
          </div>

          <div className="empty-note">
            Periode: {new Date(result.period_start).toLocaleDateString("nl-NL")} t/m {new Date(result.period_end).toLocaleDateString("nl-NL")} ·
            {" "}{result.n_candles} candles (1u) · symbool {asset.symbol}
          </div>
          <div className="advice-disclaimer" style={{ marginTop: 8 }}>
            <Info size={12} /> {result.profit_pct > result.buy_hold_pct
              ? "De bot deed het beter dan gewoon vasthouden in deze periode."
              : "De bot deed het slechter dan gewoon vasthouden in deze periode."} Eén periode zegt niet alles —
            test ook andere periodes en munten voordat je conclusies trekt.
          </div>
        </>
      )}
    </div>
  );
}

const BACKTEST_CSS = `
  .bt-controls { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:6px; }
  .bt-select { background:#0E1A28; color:#F4F8FB; border:1px solid rgba(142,202,230,0.2); border-radius:8px; padding:8px 10px; font-size:12.5px; }
  .bt-periods { display:flex; gap:6px; }
`;

const APPS = [
  { key: "analyse", label: "Markt Explorer", icon: LayoutDashboard, mode: "analyse", w: 780, h: 600, pinned: true },
  { key: "testing", label: "Testing", icon: RefreshCw, mode: "testing", w: 800, h: 620 },
  { key: "backtest", label: "Backtest", icon: TrendingUp, mode: null, w: 780, h: 640 },
  { key: "live", label: "Live", icon: Wallet, mode: "live", w: 780, h: 600 },
  { key: "portfolio", label: "Portfolio", icon: History, mode: null, w: 560, h: 460 },
  { key: "markt", label: "Markt", icon: Globe, mode: null, w: 560, h: 520 },
  { key: "settings", label: "Instellingen", icon: SettingsIcon, mode: null, w: 600, h: 560 },
];

function windowContent(win, onOpenAsset) {
  if (win.type === "asset") {
    const asset = ASSETS_BY_SYMBOL[win.assetSymbol];
    return asset
      ? <AssetDetailWindow asset={asset} />
      : <div className="empty-note">Dit activum bestaat niet (meer) in de dataset.</div>;
  }
  const key = win.key;
  if (key === "analyse") return <MarketExplorer onOpenAsset={onOpenAsset} />;
  if (key === "testing") return <TestingMode />;
  if (key === "backtest") return <BacktestWindow />;
  if (key === "live") return <LiveMode />;
  if (key === "portfolio") return <PortfolioWindow />;
  if (key === "markt") return <MarketOverview onOpenAsset={onOpenAsset} />;
  if (key === "settings") return <SettingsWindow />;
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
    const minVisible = 60;
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

function StatusCluster() {
  const market = useMarket();
  const dot = (st) => (st === "ok" ? "on" : st === "error" || st === "invalid" ? "err" : "idle");
  return (
    <div className="status-cluster" title={`Binance: ${market.status.binance} · ECB: ${market.status.ecb} · Twelve Data: ${market.status.td}`}>
      <span className={`status-dot ${dot(market.status.binance)}`} />
      <span className={`status-dot ${dot(market.status.ecb)}`} />
      <span className={`status-dot ${dot(market.status.td)}`} />
      <span className="status-time">{market.lastUpdate ? fmtTime(market.lastUpdate) : "—"}</span>
    </div>
  );
}

function Dashboard({ onLock }) {
  const [windows, setWindows] = useState([
    { key: "analyse", x: 40, y: 30, w: 780, h: 600, z: 1 },
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
      return [...ws, clampIntoView({ key, x: 60 + offset, y: 40 + offset, w: app.w, h: app.h, z: zRef.current })];
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
      return [...ws, clampIntoView({ key, type: "asset", assetSymbol: asset.symbol, x: 90 + offset, y: 60 + offset, w: 660, h: 640, z: zRef.current })];
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
    setWindows((ws) => ws.map((w) => (w.key === key ? { ...w, x, y } : w)));
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
        <StatusCluster />
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
  .taskbar { display:flex; align-items:center; gap:14px; padding:10px 16px; background:#0E1A28; border-top:1px solid rgba(142,202,230,0.12); flex-shrink:0; min-width:0; }
  .taskbar-brand { display:flex; align-items:center; gap:7px; font-family:'Space Grotesk', sans-serif; font-weight:600; color:#F4F8FB; font-size:13px; flex-shrink:0; }
  .taskbar-apps { display:flex; gap:6px; flex:1; min-width:0; overflow-x:auto; overflow-y:hidden; scrollbar-width:thin; scrollbar-color:rgba(142,202,230,0.3) transparent; }
  .taskbar-apps::-webkit-scrollbar { height:5px; }
  .taskbar-apps::-webkit-scrollbar-thumb { background:rgba(142,202,230,0.3); border-radius:10px; }
  .taskbar-apps::-webkit-scrollbar-track { background:transparent; }
  .taskbar-btn { display:flex; align-items:center; gap:7px; background:none; border:1px solid transparent; color:#7C93AC;
    padding:7px 11px; border-radius:9px; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0; transition: background .15s, border-color .15s, color .15s; }
  .taskbar-btn:hover { background: rgba(142,202,230,0.08); color:#F4F8FB; }
  .taskbar-btn.open { border-color: rgba(142,202,230,0.35); color:#8ECAE6; }
  .status-cluster { display:flex; align-items:center; gap:5px; padding:6px 10px; background:#131F2E; border-radius:20px; flex-shrink:0; }
  .status-dot { width:7px; height:7px; border-radius:50%; background:#5A7391; }
  .status-dot.on { background:#7DD9B3; }
  .status-dot.err { background:#E8846B; }
  .status-time { font-size:10px; color:#5A7391; font-family:'JetBrains Mono', monospace; margin-left:3px; }
  .lock-btn { display:flex; align-items:center; gap:7px; background:none; border:1px solid rgba(142,202,230,0.15);
    color:#7C93AC; padding:8px 12px; border-radius:9px; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0; }
  .lock-btn:hover { border-color:#8ECAE6; color:#8ECAE6; }
  .ticker-change { display:inline-flex; align-items:center; gap:2px; font-size:12px; font-family:'JetBrains Mono', monospace; color:#7C93AC; }
  .ticker-change.up { color:#7DD9B3; }
  .ticker-change.down { color:#E8846B; }
  .live-chip { display:inline-flex; align-items:center; gap:5px; font-size:9px; font-weight:700; letter-spacing:0.08em;
    padding:2.5px 8px; border-radius:20px; flex-shrink:0; }
  .live-chip.live { background:rgba(125,217,179,0.12); color:#7DD9B3; }
  .live-chip.sim { background:rgba(90,115,145,0.18); color:#7C93AC; }
  .live-chip .live-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
  .live-chip.live .live-dot { animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
  .empty-note { color:#5A7391; font-size:12.5px; padding:8px 0; }
  .panel-title { font-size:12px; color:#8ECAE6; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; font-weight:600; }
  .asset-symbol { font-family:'JetBrains Mono', monospace; font-weight:600; font-size:13px; color:#F4F8FB; flex-shrink:0; }
  .asset-price { font-family:'JetBrains Mono', monospace; font-size:13px; color:#F4F8FB; }
  .stat-row { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:18px; }
  .stat-card { background:#131F2E; border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:6px; }
  .stat-label { font-size:11px; color:#5A7391; text-transform:uppercase; letter-spacing:0.06em; }
  .stat-value { font-family:'JetBrains Mono', monospace; font-size:17px; color:#F4F8FB; }
  .stat-value.pos { color:#7DD9B3; }
  .stat-value.neg { color:#E8846B; }
  .advice-disclaimer { font-size:11px; color:#5A7391; display:flex; align-items:flex-start; gap:6px; line-height:1.5; border-top:1px solid rgba(142,202,230,0.1); padding-top:10px; }
  .live-btn { border:none; border-radius:8px; padding:9px 14px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; }
  .live-btn.primary { background:#8ECAE6; color:#0B1420; }
  .live-btn.ghost { background:none; border:1px solid rgba(142,202,230,0.3); color:#8ECAE6; }
  .src-note { font-size:10.5px; color:#5A7391; }
  .sort-btn { background:none; border:1px solid rgba(142,202,230,0.15); color:#7C93AC; font-size:11px; padding:4px 10px;
    border-radius:20px; cursor:pointer; }
  .sort-btn.active { border-color:#8ECAE6; color:#8ECAE6; }
`;

/* ---------- app-root ---------- */

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
