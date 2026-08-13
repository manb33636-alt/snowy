# Trading bot — overdrachtsdocument

> **Voor Claude:** dit bestand bevat alles wat je moet weten om aan dit project
> te werken. Lees het helemaal voordat je iets wijzigt. De sectie *Werkwijze* en
> *Valkuilen* zijn het belangrijkst — daar zitten de dingen die je niet uit de
> code kunt aflezen.
>
> **Voor Tim:** dit bestand wordt automatisch ingelezen door Claude Code. Zet je
> het project op een ander account, dan weet Claude direct waar we staan.

---

## 1. Wat dit is

Een **crypto paper-trading bot** in Python. Draait 24/7, volgt 10 munten, leest
nieuws, en handelt met **nepgeld**. Doel: na ~3 maanden eerlijk vaststellen of
deze strategie ooit met echt geld gebruikt zou kúnnen worden.

### Harde regels (nooit overtreden)

1. **PAPER TRADING ONLY.** Er gaat nooit echt geld om. Geen echte orders, geen
   beursaccount met handelsrechten. Alleen publieke koersdata via `ccxt`.
2. **Nederlands.** Tim is Nederlandstalig en beginner in programmeren. Schrijf
   uitleg in gewone taal, geen jargon zonder uitleg. Code-commentaar ook in het
   Nederlands (de hele codebase is zo).
3. **Geen overfitting.** Zie hieronder — dit is de kern van het project.
4. **Eerlijkheid boven mooie cijfers.** Als iets niet werkt, zeg dat. Tim wil
   een eerlijk go/no-go-oordeel, geen bemoedigend verhaal.

---

## 2. Werkwijze (LEES DIT)

### De anti-overfitting-regel

**Draai nooit aan een knop op basis van één gebeurtenis of een paar dagen.**
Dit is de belangrijkste afspraak in het project. Concreet:

- Verlies over 2 dagen? Dat is ruis, geen bewijs. Niet de stop-loss aanpassen.
- Een instelling die op 3 folds beter lijkt? Te weinig. Niet overstappen.
- Elke wijziging moet **structureel** te beargumenteren zijn (een echte
  ontwerpfout, een bekend marktmechanisme) of **statistisch** onderbouwd
  (`compare.py` met bootstrap-interval, `validate_coins.py` walk-forward).

In het verleden zijn ~14 ideeën bewust **afgewezen** als overfitting of
cosmetisch: Sharpe-ratio's, per-munt nieuwsfeeds, meer munten "omdat het kan",
Monte Carlo, log-rotatie, Telegram-retry, `POSITION_SIZE` < 1, en het tunen van
TP/trailing. Wees net zo streng.

### Wat een goede wijziging kenmerkt

- Lost een **echte fout** op (crash, verkeerde meting, ontwerpfout), óf
- Is een **risico-overlay** met een bekend mechanisme (correlatie-limiet,
  BTC-regime), óf
- Maakt de **meting eerlijker** (drawdown, netto per trade, benchmark).

### Testen is verplicht

`python test_bot.py` moet **0 gefaald** geven vóór en ná elke wijziging.
Raak nooit de echte bestanden aan in tests (`portfolio_state.json`, `.env`,
`baseline.json`) — de testsuite gebruikt een tijdelijke map.

---

## 3. Hoe de bot werkt

### Handelsstrategie (techniek)

- **Kern:** MA-crossover. Snel gemiddelde (10) kruist boven traag (50) → koop.
  Kruist eronder → verkoop.
- **Bevestiging:** MACD moet positief zijn (`USE_MACD_CONFIRM = True`).
- **Filter:** niet kopen als RSI ≥ 70 (overgekocht).
- **Basis:** 1-uurs candles, altijd de laatste **AFGESLOTEN** candle
  (`df.iloc[-2]`, want `iloc[-1]` loopt nog). Dit voorkomt vooruitkijken.

### Risicobeheer

- Stop-loss 5%, take-profit 10%, trailing-stop 5% onder de piek.
- Wordt getoetst op de **hele candle** (low/high), niet alleen de slotkoers.
- Trailing kijkt **niet vooruit**: toetst tegen de piek van vóór deze candle.
- **Inhaalslag:** sliep de Mac? Bij het wakker worden checkt de bot alle gemiste
  candles alsnog op stops (via `pf.last_ts`).

### Nieuwslaag

- 7 gratis RSS-feeds, 25 koppen per check.
- **Score per munt**: koppen die een munt noemen (`COIN_KEYWORDS`) wegen mee
  bovenop het algemene marktsentiment (50/50-gemiddelde). Zonder eigen nieuws
  geldt het algemene sentiment.
- **Woord-analyse** (gratis, standaard): gewogen woorden (crisiswoorden als
  `hack`/`fraud` tellen dubbel), vaste zinnen (`all-time high`, `SEC sues`),
  ontkenning-detectie (`not bullish` → negatief), en **demping**: een extreme
  score vereist ≥5 signaalwoorden. Die demping is er niet voor niets — zonder
  kocht/verkocht de bot massaal op 1–2 losse woorden.
- **Claude-AI** (optioneel, uit): scoort in één API-aanroep het algemene
  sentiment + per munt. Aanzetten = `ANTHROPIC_API_KEY` in `.env` +
  `SENTIMENT_METHOD=claude`. Valt veilig terug op woord-analyse bij fouten.

### Beslisregels (`advisor.decide`)

Volgorde is bewust:
1. Technisch verkoopsignaal → **VERKOOP** (kapitaal beschermen gaat voor).
2. In de markt + sentiment ≤ −0.6 → **VERKOOP** (nieuws-uitstap).
3. Koopsignaal + sentiment < −0.3 → **HOLD** (veto).
4. Koopsignaal + nieuws oké → **KOOP**.
5. Geen technisch signaal + sentiment ≥ +0.6 **én trend niet omlaag** → KOOP.

Geeft `(actie, uitleg, tag)`. De **tag** (`TECH` / `NEWS` / `TECH+NEWS` /
`RISK`) legt vast wáárom er gehandeld werd, zodat we kunnen meten of de
nieuwslaag zijn plek verdient.

### Twee risico-overlays (alleen live, niet in de backtest)

- **Correlatie-limiet** (`MAX_OPEN_POSITIONS = 5`): hooguit 5 van de 10 munten
  tegelijk in bezit. Crypto beweegt sterk samen; anders koopt de bot alles
  tegelijk en daalt alles tegelijk. Kandidaten worden **gerangschikt op
  sentiment** — de sterkste krijgen de vrije plekken (niet "wie het eerst in
  `SYMBOLS` staat").
- **BTC-regime-filter** (`USE_BTC_REGIME_FILTER = True`): geen enkele aankoop
  zolang BTC's snelle gemiddelde onder het trage staat. Alts volgen BTC.
  **Fail-open**: mislukt de BTC-check, dan filtert hij niet (liever niet alles
  blokkeren op een storing). Verkopen/stops blijven altijd actief.

### Snelle nieuwswaker

Tussen de uur-rondes checkt de bot elke 5 minuten het nieuws
(`wait_with_news_watch` knipt de slaap op). Wordt het nieuws voor een munt die
je bezit zéér negatief → **directe verkoop** (`NEWS-EXIT`), niet pas over een
uur. **Koopt bewust NOOIT** — instappen blijft op afgesloten uur-candles
(discipline; geen impulsaankopen op één kop).

---

## 3b. Het dashboard (Snowy Tracks)

Een webdashboard dat de ECHTE stand van de bot toont. Tims broertje maakte het
oorspronkelijke ontwerp in React (`snowy_tracks_original.jsx`) — mooi, maar met
**verzonnen data** en het draaide niet zonder een heel React-project eromheen.

**Wat er nu staat (en werkt):** een lichtere, zelfstandige versie die Tims
sneeuw-stijl behoudt maar de **echte bot-data** toont, en die met **één commando
draait** (geen npm/build — belangrijk voor een beginner):

```bash
python dashboard_api.py        # -> http://localhost:8000  (wachtwoord: sneeuw123)
```

- **`dashboard_api.py`** — een webserver op **alleen Python-stdlib** (`http.server`,
  geen Flask/extra installatie). Endpoint `/api/state` bouwt één JSON-momentopname
  door de BESTAANDE, geteste bot-code te HERGEBRUIKEN (`report.aggregate_winrate`,
  `report.trigger_breakdown`, `evaluate.max_drawdown/entry_events`, `portfolios`).
  Zo kloppen de dashboard-cijfers exact met de rapporten. **Leest alleen bestanden,
  handelt niets** — veilig naast de live-bot.
  - Koersen komen uit `trades.log` (de bot logt elke ronde `koers X`), dus **geen
    internet nodig** en altijd snel. Let op: getallen in de log hebben komma's als
    duizendtal (`66,000.00`) — die worden gestript (`.replace(",", "")`).
- **`dashboard.html`** — één zelfstandig bestand (vanilla JS + inline-SVG grafiek,
  geen React/recharts/lucide). Login-gate (`sneeuw123`), ververst elke 30s via
  `fetch('/api/state')`. Toont: totale waarde/PnL, bot-vs-markt, BTC-benchmark,
  drawdown, go/no-go-oordeel, vermogensgrafiek, per markt-type, munten-tabel,
  laatste transacties, nieuws-sentiment + TECH-vs-NEWS.

**Waarom niet de React-versie van het broertje "gewoon draaien"?** Die is losse
JSX zonder project (geen `package.json`/build) en toont mock-data. Voor "eerst
werkend + betrouwbaar voor een beginner" is de stdlib-geserveerde variant veel
robuuster. Het origineel is bewaard; wil een volgende Claude de volledige
React-versie live koppelen, dan is `/api/state` daar precies de databron voor
(zie sectie 8, openstaand punt).

**Getest** in `test_bot.py` (build_snapshot: secties, prijs-parsing incl.
komma's, go/no-go, trades-volgorde) én in de browser bevestigd met echte data.

---

## 4. Bestanden

### Kern (live-bot)
| Bestand | Rol |
|---|---|
| `config.py` | **Alle** instellingen + alle bestandspaden op één plek |
| `live.py` | De 24/7-loop: rondes, nieuwswaker, regime, planner |
| `strategy.py` | Indicatoren + koop/verkoop-signaal per candle |
| `portfolio.py` | Eén nep-portemonnee (kosten, slippage, stops) |
| `portfolios.py` | Alle portemonnees samen in `portfolio_state.json` |
| `advisor.py` | Techniek + nieuws → één beslissing (+ tag) |
| `sentiment.py` | Nieuws scoren (woord-analyse of Claude), per munt |
| `news.py` | RSS-koppen ophalen (7 bronnen) |
| `data.py` | Koersdata via ccxt (`fetch_candles`, `fetch_price`) |
| `notify.py` | Telegram-meldingen |

### Meten & valideren
| Bestand | Rol |
|---|---|
| `test_bot.py` | **De testsuite. Moet 0 gefaald geven.** |
| `report.py` | Avondrapport: totaal, per munt, per markt-type, benchmark |
| `evaluate.py` | Wekelijks go/no-go-oordeel (streng, na kosten) |
| `validate_coins.py` | Walk-forward per munt: waar werkt de strategie? |
| `walkforward.py` | Walk-forward voor 1 munt |
| `compare.py` | 2 instellingen vergelijken + bootstrap-betrouwbaarheid |
| `backtest.py` | Backtest op historie |
| `tune.py` / `optimize.py` | Instellingen zoeken (train/test) |
| `retune.py` | Dagelijks hertunen; seint pas na **3 dagen** bevestiging |
| `analyze.py` | Dagelijkse marktanalyse (+ Claude als er een sleutel is) |
| `predict.py` | ML-voorspeller (los experiment, niet in de handel) |

### Dashboard (Snowy Tracks)
| Bestand | Rol |
|---|---|
| `dashboard_api.py` | Ingebouwde webserver (alleen Python-stdlib): serveert de echte bot-stand als JSON + de HTML-pagina. Leest alleen, handelt niet |
| `dashboard.html` | Het dashboard zelf (sneeuw-thema, vanilla JS, login `sneeuw123`). Toont echte data via `/api/state` |
| `snowy_tracks_original.jsx` | Het ORIGINELE React-dashboard van Tims broertje (mock-data, draait niet los). Bewaard als referentie/design |

### Bedienen & online
| Bestand | Rol |
|---|---|
| `bot.sh` | `start` / `stop` / `restart` / `status` (via launchd) |
| `install_schedule.sh` | De 4 dagelijkse taken in-/uitschakelen |
| `Dockerfile` | Voor online draaien (lichte server-versie) |
| `requirements-server.txt` | Alleen wat de live-bot nodig heeft |
| `DEPLOY_ORACLE.md` | Gratis 24/7 server (Oracle) — stap voor stap |
| `DEPLOY.md` | Railway-variant (betaald) |
| `README.md` | Uitleg voor Tim |

### Gegevens (staan in `.gitignore`, nooit committen)
`portfolio_state.json` (de stand), `baseline.json` (meetpunt bot-vs-markt),
`equity_history.jsonl` (dagwaarde → drawdown), `trades.log`, `news_log.txt`,
`.env` (**geheimen**).

---

## 5. Instellingen (`config.py`)

```
SYMBOLS      10 munten: BTC ETH SOL BNB XRP ADA DOGE AVAX LINK LTC
TIMEFRAME    1h          START_CASH   1000 per munt (los experiment)
FAST_MA 10   SLOW_MA 50  USE_MACD_CONFIRM True   RSI_OVERBOUGHT 70
STOP_LOSS 5% TAKE_PROFIT 10%  TRAILING_STOP 5%   POSITION_SIZE 1.0
FEE 0.1%     SLIPPAGE 0.05%   (heen-en-terug ≈ 0,3%)
MAX_OPEN_POSITIONS 5          USE_BTC_REGIME_FILTER True
SENTIMENT_METHOD "keyword"    SENTIMENT_MIN_WORDS 5
  BLOCK_BUY -0.3   STRONG_BUY +0.6   FORCE_SELL -0.6
CHECK_INTERVAL 3600s          NEWS_WATCH_INTERVAL 300s
EVAL_MIN_MARGIN 2.0pp         EVAL_MAX_DRAWDOWN 15%
DATA_DIR = $DATA_DIR of "."   (online: een blijvend volume!)
```

---

## 6. Huidige stand (16 juli 2026)

- **Draait live** op Tims Mac via launchd. Meet sinds **1 juli 2026**.
- ~**24 transacties**, waarvan **11 afgeronde trades**: win ~64%, gem. **+1,9%
  netto** per trade. (Schommelt; de bot handelt door.)
- Totale waarde ~**10.210 USDT** (start 10 × 1000).
- **Dashboard werkt**: `python dashboard_api.py` → echte data in de sneeuw-stijl.
- Testsuite: **45/45 groen**. Git: lokaal, **niet gepusht**.

⚠️ **Nog te weinig om iets te bewijzen.** `evaluate.py` eist ≥20 afgeronde
trades én ≥10 onafhankelijke instapmomenten. We zitten op ~11 trades / ~5
instapmomenten. Elk oordeel nu is ruis — het dashboard zegt terecht "TE VROEG".

### Validatie per munt (`validate_coins.py`, walk-forward, 3 folds)

| Robuust (7) | Zwak (3) |
|---|---|
| BTC, ETH, BNB, XRP, DOGE, LINK, LTC | **SOL, ADA, AVAX** |

**Bewust niet weggehaald**: 3 folds is te weinig om een munt te schrappen (dat
zou zelf overfitting zijn), het is papiergeld, en we leren juist van ze.
Herhaal deze validatie na meer live data.

---

## 7. Beslissingen + waarom

| Beslissing | Waarom |
|---|---|
| Elke munt een eigen €1000 | Los experiment per munt → je ziet wáár de strategie werkt |
| Nieuwswaker verkoopt wel, koopt nooit | Bescherming mag snel; instappen vereist discipline |
| Sentiment-demping (≥5 woorden) | Zonder: massale gecorreleerde trades op 1–2 woorden. Bewezen op echte logs |
| Correlatie-limiet | Munten bewegen samen → anders alles tegelijk in de min |
| Kandidaten op sentiment rangschikken | Anders bepaalt de volgorde in `SYMBOLS` wie er in mag (willekeurig) |
| Regime-filter fail-open | Een netwerkstoring mag niet álle handel stilleggen |
| Win-rate → informatief | Misleidend: vaak klein winnen + soms hard verliezen ziet er goed uit. Nu telt **netto per trade** |
| "Winstgevende munten X/10" → informatief | Munten zijn gecorreleerd; zwak bewijs |
| Drawdown-criterium | Rendement zonder risico zegt niets |
| Retune-debounce (3 dagen) | Eén dag "beter" is meestal toeval |
| Overlays niet in de backtest | Het zijn live risico-regels, geen gefitte parameters. Meet ze via de rapporten |

---

## 8. Openstaande punten

1. **Draaien tot ~oktober 2026**, dan `evaluate.py` het oordeel laten vellen.
   Niet eerder conclusies trekken.
2. **Online zetten** — alles staat klaar (`DEPLOY_ORACLE.md`, gratis Oracle).
   Reden: Tims Mac slaapt → bot valt stil. Op stroom slaapt de Mac níét
   (`pmset sleep 0`), op accu al na 1 minuut.
3. **Claude-AI nieuws** — code klaar en getest, wacht op Tims API-sleutel.
   "Hou het even in de gaten" was zijn woord.
4. **Nieuws-gedreven kopen** — Tim vroeg of de bot elke 5 min op nieuws kan
   kopen. Kan, maar alleen gedisciplineerd: sterk munt-specifiek positief
   nieuws **+** BTC-regime omhoog **+** eigen trend oké **+** onder de limiet.
   Nog niet gebouwd. Eerlijk blijven over het risico (nieuws is vaak al
   ingeprijsd; nieuwshandel is moeilijk).
5. **Validatie herhalen** als er meer live data is.
6. **Dashboard volledig in React (optioneel)** — nu draait de lichte
   HTML-versie (`dashboard.html`). Wil Tim de exacte React-app van zijn broertje
   (`snowy_tracks_original.jsx`) live: zet een Vite-project op (node/npm zijn
   aanwezig), vervang de mock-data-engine door `fetch('/api/state')` van
   `dashboard_api.py`, en houd mock-data voor de niet-bot-assets (aandelen/ETF's
   die de bot niet verhandelt). Groter project, meerdere bestanden.

---

## 9. Praktisch

```bash
cd ~/tradingbot
./venv/bin/python test_bot.py         # ALTIJD draaien na een wijziging (0 gefaald)
./bot.sh status                       # draait hij? + laatste log
./bot.sh restart                      # na een codewijziging
tail -f trades.log                    # meekijken
./venv/bin/python dashboard_api.py    # dashboard -> http://localhost:8000 (sneeuw123)
./venv/bin/python validate_coins.py   # walk-forward per munt (traag)
```

- **Gebruik `./venv/bin/python`**, niet de systeem-Python (`ccxt` zit alleen in
  de venv). Python 3.9.6.
- Start **nooit** handmatig een tweede `live.py` naast de launchd-bot: twee bots
  schrijven door elkaar in dezelfde stand.

---

## 10. Valkuilen (bespaart je uren)

1. **Trades zijn 5-tuples**: `(tijd, actie, prijs, waarde, tag)`. Oude staat
   heeft nog 4-tuples. Alle lezers moeten **lengte-tolerant** zijn
   (`t[4] if len(t) > 4 else None`). Dit heeft al één crash veroorzaakt in
   `backtest.py`.
2. **`report.aggregate_winrate` geeft 3 waarden terug**: `(win%, n, gem_netto)`.
   `evaluate.py` brak hier eerder op.
3. **`round_trips` ziet elke niet-BUY als positiesluiting** en categoriseert op
   de **instap**-tag, niet de uitstap-tag.
4. **Altijd `df.iloc[-2]`** (laatste afgesloten candle). `iloc[-1]` loopt nog →
   vooruitkijken.
5. **Paden komen uit `config`** (`config.STATE_FILE`, `config.BASELINE_FILE`…),
   nooit hardcoderen — anders breekt online draaien met `DATA_DIR`.
6. **`portfolios.load_all` bewaart onbekende munten** (`_extra_state`). Haal je
   een munt uit `SYMBOLS`, dan blijft de historie staan.
7. **Sentiment heeft een cache** op `(methode, koppen)`. Reset in tests met
   `sentiment._pc_last_key = None`.
8. **De nieuwswaker slaat werk over** als de koppen én de open posities niet
   veranderd zijn (`_seen_news_key`).
9. **Planner staat lokaal uit**: alleen actief met `RUN_SCHEDULER=1` (online).
   Op de Mac doet launchd dat, anders draait alles dubbel.
10. **De 5 min-waker en de uur-ronde delen dezelfde `ports`-objecten** in het
    geheugen — geen threads, alles sequentieel. Geen race, maar besef dat de
    waker de stand tussentijds wijzigt en opslaat.
11. **`report.trigger_breakdown` geeft per tag ≥4 waarden** terug (aantal, gem%,
    win%, ticker-geprijsd, …). Pak alleen wat je nodig hebt lengte-tolerant
    (`vals[0], vals[1], vals[2]`) — dit brak `dashboard_api.py` al eens.
12. **Het dashboard leest `trades.log` voor koersen** (geen live API). Draait de
    bot niet, dan zijn de koersen leeg/oud. `dashboard_api.py` handelt nooit —
    puur lezen; veilig naast de live-bot.

---

## 11. Toon

Tim is enthousiast en wil vaak "alles verbeteren". De waardevolste bijdrage is
vaak **nee zeggen** tegen een idee dat leuk klinkt maar overfitting is — met
uitleg waarom. Hij waardeert eerlijkheid: toen de bot "verlies" leek te draaien
bleek het een normale marktdip, en dat eerlijk benoemen was nuttiger dan snel
iets "fixen".
