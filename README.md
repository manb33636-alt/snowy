# Snowy Tracks v2

Persoonlijke marktassistent met echte live data — aandelen, crypto, ETF's, forex en commodities in een dashboard met vensters, technische analyse, papertrading en signaallogging.

Deze repository bevat drie onderdelen:

| Map | Wat het is |
| --- | --- |
| `/` + `src/` | **Snowy Tracks v2 live** — de React-frontend (waar aan gewerkt wordt) |
| `backend/` | **Snowy_Tracks API** — FastAPI-backend met marktdata, papertrading-portefeuille en historie |
| `bot/` | **De crypto-tradingbot** — losstaand 24/7-experiment met eigen dashboard |

Uitleg per onderdeel staat in [`CLAUDE.md`](CLAUDE.md); de bot heeft een eigen
overdrachtsdocument in [`docs/BOT-OVERDRACHT.md`](docs/BOT-OVERDRACHT.md).

**Er wordt nooit echt gehandeld**: Testing = papertrading met nepgeld, Live Mode logt alleen signalen (er is bewust geen broker-koppeling).

## Databronnen

| Bron | Gebruikt voor | Key nodig? |
| --- | --- | --- |
| Binance public API | Crypto + goud (PAXG-proxy) | Nee |
| Frankfurter.dev (ECB) | Forex | Nee |
| Twelve Data | Aandelen, ETF's, indices | Ja — gratis key via [twelvedata.com](https://twelvedata.com), invullen bij Instellingen |

Zonder Twelve Data-key draaien aandelen/ETF's/indices op een ingebakken snapshot + simulatie en staan ze gemarkeerd als "SIM".

## Starten

Op Windows: dubbelklik `start-windows.bat`. Dat installeert de eerste keer zelf
de pakketten en opent de app daarna in je browser. Node.js moet geïnstalleerd
zijn ([nodejs.org](https://nodejs.org), LTS-versie).

Handmatig, op elk systeem:

```bash
npm install
npm run dev
```

Open daarna de getoonde lokale URL in je browser. Demo-wachtwoord: `sneeuw123`.

## Één los bestand, zonder installatie

```bash
npm run build:single
```

Levert `dist-single/index.html` op: de hele app in één bestand zonder externe
verwijzingen, te openen door erop te dubbelklikken. Handig om te delen of om de
app te gebruiken zonder Node.js.

## Structuur

- `src/SnowyTracks.jsx` — de volledige app (componenten, marktstore, indicatoren, CSS)
- `src/main.jsx` — entrypoint dat de app mount
- `start-windows.bat` — startknop voor Windows
