# Snowy Tracks v2

Persoonlijke marktassistent met echte live data — aandelen, crypto, ETF's, forex en commodities in een dashboard met vensters, technische analyse, papertrading en signaallogging.

**Er wordt nooit echt gehandeld**: Testing = papertrading met nepgeld, Live Mode logt alleen signalen (er is bewust geen broker-koppeling).

## Databronnen

| Bron | Gebruikt voor | Key nodig? |
| --- | --- | --- |
| Binance public API | Crypto + goud (PAXG-proxy) | Nee |
| Frankfurter.dev (ECB) | Forex | Nee |
| Twelve Data | Aandelen, ETF's, indices | Ja — gratis key via [twelvedata.com](https://twelvedata.com), invullen bij Instellingen |

Zonder Twelve Data-key draaien aandelen/ETF's/indices op een ingebakken snapshot + simulatie en staan ze gemarkeerd als "SIM".

## Starten

```bash
npm install
npm run dev
```

Open daarna de getoonde lokale URL in je browser. Demo-wachtwoord: `sneeuw123`.

## Structuur

- `src/SnowyTracks.jsx` — de volledige app (componenten, marktstore, indicatoren, CSS)
- `src/main.jsx` — entrypoint dat de app mount
