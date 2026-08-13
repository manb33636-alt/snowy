# Snowy Tracks — projectoverzicht

> Dit bestand wordt automatisch ingelezen door Claude Code. Lees het eerst.

Nederlands is de voertaal van dit project: uitleg in gewone taal, code-commentaar
in het Nederlands. Tim is enthousiast maar beginner in programmeren — schrijf
geen jargon zonder uitleg.

**Er gaat nergens echt geld om.** Alles is paper trading met nepgeld. Er is
bewust geen broker-koppeling en die komt er ook niet.

## De drie onderdelen

| Map | Wat het is | Taal |
|---|---|---|
| `/` (root, `src/`) | **Snowy Tracks v2 live** — de React-frontend. Hier wordt aan gewerkt. | React + Vite |
| `backend/` | **Snowy_Tracks API** — FastAPI-backend: live marktdata, AI-advies, papertrading-portefeuille, transactiehistorie. | Python (FastAPI) |
| `bot/` | **De crypto-tradingbot** — losstaand 24/7-experiment met eigen dashboard. | Python |

`docs/` bevat de overdrachtsdocumenten en de bewaarde eerdere frontends.

### 1. Frontend — Snowy Tracks v2 live (`src/SnowyTracks.jsx`)

Eén groot bestand met de hele app: vensterbeheer, marktstore, indicatoren en CSS.
Haalt op dit moment data **rechtstreeks uit de browser**:

- Crypto + goud (PAXG): Binance public API — geen sleutel nodig
- Forex: Frankfurter.dev (ECB-dagkoersen) — geen sleutel nodig
- Aandelen/ETF's: Twelve Data — gratis sleutel, in te vullen bij Instellingen
- Zonder sleutel draaien aandelen/ETF's/indices op een snapshot + simulatie, zichtbaar gemarkeerd als "SIM"

Starten: `npm run dev` → http://localhost:5173 (wachtwoord `sneeuw123`).
Los HTML-bestand zonder installatie: `npm run build:single`.

### 2. Backend — Snowy_Tracks API (`backend/`)

FastAPI + SQLAlchemy (standaard SQLite, 0-config). Draait een achtergrond-scheduler
die de `WATCHLIST` uit `.env` blijft verversen, ook als er niemand kijkt.

```
POST /auth/login            inloggen (bcrypt-hash + oplopende lockout)
GET  /auth/session          sessie geldig?
POST /auth/logout
GET  /market/watchlist      alle gevolgde symbolen + laatste data
GET  /market/quote/{sym}    live quote (uit cache)
GET  /market/indicators/{sym}   RSI/MACD/EMA/SMA/Bollinger/ATR
GET  /analyse/{sym}         quote + indicatoren + AI-advies + historie
GET  /testing/portfolio     virtuele portefeuille, posities, P&L
POST /testing/deposit       nepgeld storten
POST /testing/trade         kopen/verkopen tegen live prijs
POST /testing/ai/toggle     AI automatisch laten handelen aan/uit
GET  /history?filter=...    all / buy / sell / today / week / month
```

Starten (Windows: dubbelklik `backend/start-windows.bat`, die doet dit allemaal):

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python eerste-keer-instellen.py     # maakt .env: wachtwoord-hash, sessiesleutel, API-sleutel
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Testinterface: http://localhost:8000/docs

Wachtwoorden gaan via `bcrypt` rechtstreeks, niet via `passlib` — dat pakket
wordt sinds 2020 niet meer onderhouden en crasht op bcrypt 5. Bestaande hashes
blijven werken; het formaat is hetzelfde.

**Belangrijk:** is de marktdata-API niet bereikbaar (storing, rate limit, geen
sleutel), dan geeft de backend `"status": "unavailable"` terug met uitleg — nooit
verzonnen cijfers. De AI handelt in dat geval ook niet. Houd dat zo.

### 3. Bot (`bot/`)

Losstaand project: crypto paper-trading bot die 10 munten volgt, nieuws leest en
24/7 draait, met een eigen zelfstandig dashboard (`dashboard_api.py` +
`dashboard.html`, alleen Python-stdlib). Volledige uitleg, de gemaakte keuzes en
de valkuilen staan in **`docs/BOT-OVERDRACHT.md`** — lees dat voordat je hier iets
wijzigt. Kernafspraken: geen overfitting, `python test_bot.py` moet 0 gefaald
geven vóór en ná elke wijziging, eerlijkheid boven mooie cijfers.

## Wat nooit in git mag

`.env` (sleutels), `portfolio_state.json`, `baseline.json`, `equity_history.jsonl`,
`trades.log`, `news_log.txt` en de overige logs. Staan in `.gitignore`.

## Openstaand: frontend en backend koppelen

De v2-frontend en de backend kennen elkaar nog niet. De frontend haalt zijn data
rechtstreeks uit de browser; de backend heeft dezelfde data plus een echte
portefeuille, historie in een database en een scheduler. Ze samenvoegen is de
grootste openstaande stap. Let bij het koppelen op:

- CORS in `backend/app/main.py` staat nu op `http://localhost:3000` — de Vite-dev-server draait op `:5173`
- De backend dekt alleen de symbolen uit `WATCHLIST`; de frontend toont er ruim honderd. Wat de backend niet kent, blijft uit de browser komen
- Login zit nu op twee plekken: hardcoded `sneeuw123` in de frontend, bcrypt-hash in de backend
