# 🤖 Trading Bot (paper trading)

Een crypto trading bot die beslissingen neemt op basis van **technische indicatoren + nieuws/AI-analyse**.
Draait volledig met **nepgeld** (paper trading) — er gaat nooit echt geld om.

## Snel starten

```bash
cd ~/tradingbot
source venv/bin/activate      # virtuele omgeving aanzetten
```

## ▶️ Wat draait er nu automatisch?

De bot is getuned (MA 10/50 + MACD-bevestiging) en **draait live** met nepgeld,
over **10 markten tegelijk** (BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, LINK, LTC —
pas aan in `config.py` via `SYMBOLS`). Elke munt heeft zijn eigen paper-portefeuille
van €1000, zodat je per markt-type (large-cap, betalingen, DeFi, meme) ziet waar de
strategie het beste werkt. (De bot handelt alleen crypto via Binance-koersdata;
aandelen/forex zijn een ander soort systeem en zitten hier bewust niet in.)

- **De live bot** draait via macOS **launchd**: start automatisch bij inloggen,
  **herstart zichzelf na een crash**, en overleeft een herstart van je Mac. Elke ronde
  checkt hij álle munten. Je krijgt een Telegram-seintje per trade en bij elke (her)start.
  Bedien 'm met: `./bot.sh status` · `./bot.sh stop` · `./bot.sh start` · `./bot.sh restart`.
  Volgen: `tail -f trades.log`.
Vier automatische taken draaien via macOS launchd (Telegram waar aangegeven):
- **Marktanalyse** — elke ochtend 08:00 → Telegram (Claude Fable 5 als je sleutel er staat, anders statistisch). Analyseert 1 munt (`SYMBOL`, standaard BTC).
- **Hertunen** — elke dag 09:00 → `retune_report.txt` (+ Telegram alleen bij een échte verbetering). Test op **alle** munten; adviseert alleen als het op de meerderheid beter is én de kandidaat zich **3 dagen op rij** bewijst (voorkomt vals alarm op toevallige dag-ruis).
- **Voortgangsrapport** — elke avond 20:00 → Telegram (totaal + per munt, na kosten).
- **Beoordeling (go/no-go)** — elke maandag 09:30 → Telegram (`evaluate.py`: kan het voor echt?).

Aan/uit (alle vier): `./install_schedule.sh` of `./install_schedule.sh remove`.

### Wat als mijn Mac slaapt? (eerlijk)

De bot handelt op **afgesloten 1-uurs candles**. Tijdens slaap draait er niets, dus
de bot kan **niet in real-time** in- of uitstappen terwijl de Mac dicht is — dat is een
echte beperking. Wél doet de bot bij het wakker worden een **inhaalslag**: hij checkt
alle candles die hij tijdens de slaap heeft gemist alsnog op stop-loss / take-profit /
trailing-stop (op basis van de laagste/hoogste koers van die candles). Zo mist een stop
niet stilletjes, maar hij vuurt wél **later** (bij het ontwaken) dan in het echt zou kunnen.

Kortom: voor serieus draaien wil je de Mac **aan** houden (niet volledig in slaapstand);
even slapen en weer wakker worden vangt de bot netjes op, maar is niet gelijk aan 24/7 wakker.

## 📰 Hoe de bot het nieuws volgt

Elke ronde haalt de bot crypto-nieuws op (7 bronnen), scoort het van −1 tot +1, en
**houdt er rekening mee** bij elke beslissing:

- **Veto op kopen** — koopt niet bij te negatief nieuws (`SENTIMENT_BLOCK_BUY`, −0.3).
- **Nieuws-uitstap** — verkoopt als je ín de markt zit én het nieuws zéér negatief wordt
  (`SENTIMENT_FORCE_SELL`, −0.6), ook zonder technisch signaal. Aan/uit: `USE_NEWS_EXIT`.
- **Sterk-positief instappen** — mag kopen bij uitgesproken positief nieuws (`SENTIMENT_STRONG_BUY`).

**Sentiment per munt.** Elke munt krijgt zijn EIGEN score: koppen die de munt
expliciet noemen (bijv. "Bitcoin…" voor BTC) wegen mee bovenop het algemene
marktsentiment. Zo reageert BTC sterker op Bitcoin-nieuws dan DOGE, en kopen/
verkopen niet alle 10 munten meer blind tegelijk op hetzelfde bericht. Met de
Claude-AI aan (zie onder) scoort Claude het nieuws **per munt in één aanroep**.

**Correlatie-limiet.** De bot houdt hooguit `MAX_OPEN_POSITIONS` (standaard 5)
munten tegelijk in bezit. Crypto beweegt sterk samen; met een limiet zit je nooit
in álle 10 tegelijk, zodat een marktbrede dip niet je hele portefeuille raakt.

**Markt-regime filter (BTC als marktleider).** Alt-coins stijgen meestal alleen
mee als Bitcoin zélf omhoog gaat. Staat `USE_BTC_REGIME_FILTER` aan (standaard),
dan koopt de bot **niets** zolang BTC in een dalende trend zit (snel gemiddelde
onder traag) — je stapt dus niet tegen de hele markt in. Verkopen, stop-loss,
take-profit en de nieuws-uitstap blijven altijd werken; het filter raakt alleen
nieuwe aankopen. Faalt de BTC-check door een netwerkstoring, dan wordt het filter
die ronde overgeslagen (liever niet alles blokkeren op een glitch).

**De snelle nieuwswaker (elke 5 minuten).** Tussen de uur-rondes door checkt de
bot het nieuws elke `NEWS_WATCH_INTERVAL_SECONDS` (standaard 5 min). Wordt het
nieuws voor een munt zéér negatief terwijl je erin zit, dan verkoopt hij DIRECT —
niet pas bij de volgende uur-ronde. Kopen doet de waker bewust NIET: instappen
blijft alleen op afgesloten uur-candles (discipline, geen impulsaankopen op één kop).
De woord-analyse herkent ook sterke zinnen ("all-time high", "SEC sues"),
crisis-woorden die dubbel tellen (hack, bankruptcy) en ontkenningen ("not bullish").

Je ziet precies wat de bot las en hoe hij het woog in **`news_log.txt`**:
```bash
tail -f news_log.txt
```
Wil je dat het nieuws écht slim wordt geanalyseerd (i.p.v. simpele woordtelling)?
Zet dan de Claude-AI aan — zie hieronder.

## De commando's

| Commando | Wat het doet |
|---|---|
| `./bot.sh start/stop/status` | **De 24/7-bot bedienen** (via launchd; handelt alle `SYMBOLS`). |
| `python advisor.py`   | Eenmalig advies voor 1 munt (`SYMBOL`, standaard BTC): techniek + nieuws. |
| `python backtest.py`  | Test de strategie op echte historische koersen (1 munt: `SYMBOL`). |
| `python optimize.py`  | Test veel instellingen tegelijk + maakt een heatmap. `symbols` = vergelijk munten. |
| `python walkforward.py` | **Eerlijkste test**: tunet op verleden, handelt op onbekende periodes (1 munt). |
| `python dashboard_api.py` | **Snowy Tracks dashboard**: open http://localhost:8000 (wachtwoord `sneeuw123`) — je echte bot-stand in beeld. |
| `python validate_coins.py` | **Walk-forward per munt**: op welke munten is de strategie robuust en op welke zwak? |
| `python compare.py`   | Krachtmeting tussen twee instellingen, alle munten, ~4 mnd historie. |
| `python evaluate.py`  | **Go/no-go**: kan de bot na een tijd draaien voor echt geld? (streng, na kosten) |
| `python analyze.py`   | Marktanalyse van nu, voor 1 munt (`SYMBOL`); de 08:00-taak stuurt deze. |
| `python predict.py`   | ML-koersvoorspeller (1 munt) + eerlijke walk-forward-nauwkeurigheid. |
| `python plot.py`      | Maakt grafieken van een backtest (vermogenscurve + koers met markeringen). |
| `python test_ai.py`   | Test of de slimme Claude-AI-analyse werkt (zodra je een sleutel hebt). |
| `python notify.py`    | Test je Telegram-meldingen (of toont de fallback). |
| `python telegram_setup.py` | Koppelt Telegram (vindt je chat-id automatisch). |
| `python report.py`    | Stuurt nu een voortgangsrapport naar je Telegram. |
| `python data.py`      | Test of koersdata ophalen werkt. |
| `python news.py`      | Toon de laatste crypto-krantenkoppen. |
| `python sentiment.py` | Haal nieuws op en geef er een sentiment-score aan. |

### De bot live laten draaien

De echte 24/7-bot draait via launchd — bedien 'm met `./bot.sh` (zie boven).
Handmatig testen kan óók, maar **zet dan eerst de launchd-bot uit** (`./bot.sh stop`),
anders draaien er twee bots door elkaar:

```bash
./bot.sh stop
python live.py 3 5        # 3 testrondes, elke 5 seconden
./bot.sh start
```

De bot bewaart zijn stand in `portfolio_state.json` en logt alles in `trades.log`.
Je mag 'm stoppen en later weer starten — hij gaat verder waar hij was.

## De bestanden

| Bestand | Rol |
|---|---|
| `config.py`     | Alle instellingen op één plek. Hier pas je dingen aan. |
| `data.py`       | Haalt gratis koersdata op (via Binance). |
| `strategy.py`   | De technische strategie (gemiddelden + RSI + MACD + Bollinger). |
| `portfolio.py`  | Eén nep-portemonnee (kosten, stop-loss/take-profit/trailing). |
| `portfolios.py` | Beheert de portemonnees per munt in `portfolio_state.json` (laden/opslaan). |
| `live.py`       | De 24/7 loop die automatisch alle munten checkt en "handelt". |
| `news.py`       | Haalt crypto-nieuws op via gratis RSS-feeds. |
| `sentiment.py`  | Scoort het nieuws van −1 (negatief) tot +1 (positief). |
| `advisor.py`    | Combineert techniek + nieuws tot één beslissing. |
| `backtest.py`   | Test de strategie op het verleden. |
| `validate_coins.py` | Walk-forward per munt: waar is de strategie robuust, waar zwak? |
| `optimize.py`   | Test veel instellingen + munten, maakt een heatmap. |
| `walkforward.py`| Walk-forward validatie — het eerlijkste bewijs. |
| `evaluate.py`   | Streng go/no-go-oordeel voor echt geld (na kosten, vs markt). |
| `analyze.py`    | Marktanalyse van dit moment (beschrijving, geen voorspelling). |
| `predict.py`    | ML-koersvoorspeller mét eerlijke nauwkeurigheidstest. |
| `plot.py`       | Maakt de grafieken (PNG). |
| `notify.py`     | Stuurt meldingen (Telegram, of logt ze). |
| `test_ai.py`    | Test de Claude-AI-analyse. |
| `tune.py`       | Zoekt de beste robuuste instellingen (train/test, geen overfitting). |
| `retune.py`     | Hertunet automatisch + bekijkt de live-bot + geeft een seintje bij verbetering. |
| `bot.sh`        | Bedien de live bot (start/stop/status/restart, via launchd). |
| `install_schedule.sh` | Zet de vier automatische taken (analyse/hertune/rapport/beoordeling) aan/uit. |
| `.env.example`  | Sjabloon voor je geheime sleutels (kopieer naar `.env`). |
| `mpl_safe.py`   | Kleine technische fix zodat de grafieken op macOS werken. |

## Geheime sleutels: het `.env`-bestand

Sleutels (Claude, Telegram) zet je NIET in de code, maar in een `.env`-bestand:

```bash
cp .env.example .env     # maak je eigen .env aan
# open .env en vul je sleutels in
```

De bot leest `.env` automatisch in. **Deel dit bestand nooit en zet het niet online.**

## 1) De slimme AI-laag aanzetten (Claude)

Standaard gebruikt de bot een **gratis** woord-analyse. Voor de écht slimme analyse:

1. Maak een sleutel aan op https://console.anthropic.com (kost een paar cent per analyse).
2. Zet hem in je `.env`:  `ANTHROPIC_API_KEY=sk-ant-...`
3. Test:  `python test_ai.py`  (zegt of het werkt)
4. Zet in `config.py`:  `SENTIMENT_METHOD = "claude"`
5. Kosten besparen? Zet `CLAUDE_MODEL = "claude-haiku-4-5"` (goedkoper, prima voor koppen).

## 2) Strategie tunen (optimizer + grafieken)

```bash
python optimize.py           # test veel MA-instellingen -> tabel + optimize_heatmap.png
python optimize.py symbols   # vergelijk de strategie op meerdere munten
python plot.py               # backtest_equity.png + backtest_price.png
```

⚠️ "Beste op het verleden" is **niet** automatisch het beste in de toekomst (overfitting).
Gebruik het als richting, niet als garantie.

## 3) Extra indicatoren (scherpere signalen)

In `config.py` kun je extra koop-bevestigingen aan- of uitzetten:

- `USE_MACD_CONFIRM` → koopt alleen bij positief momentum (MACD).
  **Staat sinds de tuning standaard AAN.**
- `USE_BOLLINGER_CONFIRM` → koopt niet als de koers al te ver is doorgeschoten.
  Staat standaard uit.

Test het effect altijd eerst met `python backtest.py` / `python optimize.py`.

## 4) Meldingen via Telegram

Wil je een seintje als de bot handelt?

1. Maak een Telegram-bot via **@BotFather** → je krijgt een token.
2. Zet `TELEGRAM_TOKEN` en `TELEGRAM_CHAT_ID` in je `.env`.
3. Test:  `python notify.py`

Geen token? Dan logt de bot de meldingen gewoon — nooit een fout.

## Tips: 's nachts laten doordraaien

De bot draait al dag en nacht via launchd — je hoeft niets te doen. Bedienen:

```bash
./bot.sh status    # draait hij?
./bot.sh stop      # stoppen
./bot.sh start     # weer aanzetten (ook automatisch bij inloggen)
```

- Volg wat hij doet:  `tail -f trades.log`
- ⚠️ Start **niet** handmatig een tweede `python live.py` naast de launchd-bot:
  dan draaien er twee bots die elkaars stand overschrijven en dubbele
  Telegram-meldingen sturen. (`pkill` werkt ook niet: launchd start 'm
  binnen 30 seconden opnieuw — gebruik `./bot.sh stop`.)

(Je Mac mag niet volledig in slaapstand blijven; even slapen en wakker worden is oké.)

## ⚠️ Belangrijk

- Dit is een **leerproject**. De meeste trading bots verliezen geld.
- Begin **nooit** met echt geld voordat de bot maandenlang bewezen winstgevend is op paper trading.
- Eén goede backtest bewijst niets — test meerdere periodes en munten.
