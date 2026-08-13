# Snowy_Tracks Backend

Echte FastAPI-backend voor Snowy_Tracks: live marktdata (Twelve Data), AI-advies,
Testing Mode met echte koop/verkoop-P&L, en trading history met filters.

## 1. Installeren

```bash
cd snowy_tracks_backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Configureren

```bash
cp .env.example .env
```

Vul in `.env` in:
- `TWELVEDATA_API_KEY` — gratis account aanmaken op https://twelvedata.com/
- `APP_PASSWORD_HASH` — genereer met:
  ```bash
  python -m app.tools.hash_password
  ```
  (vraagt je nieuwe wachtwoord, print de bcrypt-hash — het platte wachtwoord wordt nergens opgeslagen)
- `SESSION_SECRET` — een lange willekeurige string, bv.:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```

**Het `.env` bestand nooit delen, committen naar git, of aan mij (Claude) geven** — dat is precies het bestand
dat je wachtwoord-hash en API-sleutel bevat.

## 3. Starten

```bash
uvicorn app.main:app --reload --port 8000
```

De achtergrond-scheduler start automatisch mee en ververst continu — ook als er niemand
naar de site kijkt — de symbolen uit `WATCHLIST` in je `.env`.

Documentatie/testinterface: http://localhost:8000/docs

## Belangrijke beperkingen om te weten

- **Gratis Twelve Data-tier heeft een rate limit** (beperkt aantal credits/minuut). Elke volledige
  ververs-cyclus van één symbool kost ~7 credits (1 quote + 6 indicatoren). De scheduler ververst
  symbolen daarom na elkaar met een pauze ertussen — bij een gratis sleutel kun je realistisch een
  handvol symbolen goed live volgen. Voor meer/snellere symbolen: upgrade naar een betaald Twelve
  Data-plan (zie hun pricing-pagina) en verlaag `DELAY_BETWEEN_SYMBOLS_SECONDS` in `app/scheduler.py`.
- **Als de marktdata-API niet bereikbaar is** (storing, rate limit overschreden, verkeerde key):
  krijg je `"status": "unavailable"` terug met een duidelijke boodschap — nooit verzonnen cijfers.
  De AI handelt in dat geval ook niet.
- **Marktgesloten-detectie** gebruikt het `is_market_open`-veld van Twelve Data's quote-endpoint.
  Als de markt dicht is, blijft de laatst bekende koers zichtbaar.
- **PostgreSQL**: standaard draait dit op SQLite (0-config). Wil je PostgreSQL? Zet
  `DATABASE_URL=postgresql+psycopg2://gebruiker:wachtwoord@localhost:5432/snowy_tracks` in `.env`
  en installeer `psycopg2-binary` (staat als comment in requirements.txt).
- **Nieuws & marktsentiment** zitten nog niet in deze versie — Twelve Data's gratis laag heeft dit
  niet. Kan later toegevoegd worden via Alpha Vantage's NEWS_SENTIMENT endpoint (gratis, apart
  account) als aanvulling.
- **Deze backend vervangt de eerdere Claude-artifact-demo.** Een artifact in de Claude-chat kan geen
  verbinding maken met deze lokale backend (sandboxing) — de echte frontend (Next.js/React) moet nu
  apart draaien en hiernaartoe verbinden, bv. op `http://localhost:3000` (al toegestaan in CORS-instellingen).

## Endpoints (overzicht)

| Endpoint | Methode | Omschrijving |
|---|---|---|
| `/auth/login` | POST | Inloggen met wachtwoord, incl. oplopende lockout |
| `/auth/session` | GET | Check of sessie nog geldig is |
| `/auth/logout` | POST | Uitloggen |
| `/market/watchlist` | GET | Alle gevolgde symbolen + laatste live data |
| `/market/quote/{symbol}` | GET | Live quote (cache) |
| `/market/indicators/{symbol}` | GET | RSI/MACD/EMA/SMA/Bollinger/ATR (cache) |
| `/analyse/{symbol}` | GET | Quote + indicatoren + AI-advies + historie |
| `/testing/portfolio` | GET | Virtuele portefeuille, posities, P&L |
| `/testing/deposit` | POST | Nep geld storten |
| `/testing/trade` | POST | Handmatig kopen/verkopen tegen live prijs |
| `/testing/ai/toggle` | POST | AI automatisch laten handelen aan/uit |
| `/history?filter=...` | GET | Trading history: `all`/`buy`/`sell`/`today`/`week`/`month` |

## Volgende stap

Dit is de backend. De volgende stap is een echte frontend (Next.js) die deze endpoints
aanroept in plaats van de mock-data uit de eerdere Claude-artifact-demo.
