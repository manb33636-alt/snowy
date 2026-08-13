# 🚀 De bot online zetten (24/7, zonder je Mac)

**Waarom?** Op je Mac valt de bot stil zodra de Mac gaat slapen. Online draait
hij écht 24/7. Let op: online zetten maakt de bot **betrouwbaarder**, niet
winstgevender. Het lost alleen het stilvallen op.

Alles is al voorbereid. Je hoeft alleen de stappen hieronder te volgen.

---

## ⚠️ Lees dit eerst: je bot-stand kan gewist worden

De bot bewaart zijn portefeuille, historie en baseline in **bestanden**. Bij de
meeste hosts is de schijf **tijdelijk**: bij elke update begint alles bij nul en
ben je je hele testperiode kwijt.

**Daarom is stap 3 (het volume) niet optioneel.** Sla die niet over.

---

## Wat je nodig hebt

- Een **GitHub**-account (gratis) — om je code online te krijgen.
- Een **Railway**-account (~€5/maand voor iets dat 24/7 draait).
  Alternatieven die net zo goed werken: Fly.io, Render, of een eigen VPS.

---

## Stap 1 — Code naar GitHub

✅ **Dit is al voor je gedaan**: de map `tradingbot` is al een git-repo met
alles erin vastgelegd (en gecontroleerd dat je `.env` en bot-stand er niet in
zitten). Er is nog **niets verstuurd** — dat doe jij hieronder.

Maak op github.com een **privé** repo aan (bijv. `tradingbot`), en koppel 'm:

```bash
cd ~/tradingbot
git remote add origin https://github.com/JOUW-NAAM/tradingbot.git
git branch -M main
git push -u origin main
```

Wil je vóór het pushen zelf zien dat er niets geheims meegaat? Dan hoort dit
**niets** te tonen:

```bash
git ls-files | grep -E "^\.env$|portfolio_state|baseline\.json"
```

> Je `.env` en je bot-stand staan in `.gitignore` en gaan dus nooit mee. Houd de
> repo toch **privé**.

## Stap 2 — Railway koppelen

1. Ga naar railway.app → **New Project** → **Deploy from GitHub repo**.
2. Kies je `tradingbot`-repo.
3. Railway ziet de `Dockerfile` vanzelf en bouwt de bot.

## Stap 3 — Blijvende schijf (NIET overslaan!)

1. In je Railway-project: **New** → **Volume**.
2. Koppel het volume aan je service met **Mount path: `/data`**.

Klaar. De `Dockerfile` zet `DATA_DIR=/data` al voor je, dus de bot schrijft zijn
stand automatisch naar die blijvende schijf.

## Stap 4 — Geheimen instellen

In Railway → je service → **Variables**, voeg toe:

| Variabele | Waarde | Nodig? |
|---|---|---|
| `TELEGRAM_TOKEN` | (uit je `.env`) | voor meldingen |
| `TELEGRAM_CHAT_ID` | (uit je `.env`) | voor meldingen |
| `ANTHROPIC_API_KEY` | je Claude-sleutel | alleen als je Claude-AI wilt |
| `SENTIMENT_METHOD` | `claude` | alleen als je Claude-AI wilt |

`DATA_DIR`, `RUN_SCHEDULER` en `TZ` staan al goed in de `Dockerfile`.

## Stap 5 — Neem je huidige stand mee (optioneel)

Wil je online **verder** met je huidige portefeuille (i.p.v. vers beginnen)?
Kopieer dan je stand naar het volume:

```bash
railway run cp portfolio_state.json baseline.json equity_history.jsonl /data/
```

Doe je dit niet, dan start de bot online netjes met een verse portefeuille
(10 munten × 1000 USDT). Ook prima — maar dan begint je meetperiode opnieuw.

## Stap 6 — Controleren

In Railway → **Logs**. Je hoort binnen een minuut te zien:

```
BOT GESTART — 10 munten | paper trading (NEPGELD)
Interval: 3600s | nieuwsfilter: True (keyword) | nieuwswaker: elke 5 min
Ronde 1 klaar | totale waarde: ...
```

Je krijgt ook een Telegram-bericht dat de bot (her)start is.

---

## Daarna: zet je Mac-bot uit

Anders draaien er **twee** bots die allebei melden en allebei handelen:

```bash
./bot.sh stop
./install_schedule.sh remove
```

---

## Wat er online anders is

| | Op je Mac | Online |
|---|---|---|
| Dagelijkse taken | macOS `launchd` | **ingebouwde planner** (`RUN_SCHEDULER=1`) |
| Opslag | de projectmap | het **volume** op `/data` |
| Slaapt hij? | ja, met je Mac | **nee — dat is de hele winst** |

De 4 taken (analyse 08:00, hertune 09:00, rapport 20:00, beoordeling maandag
09:30) draait de bot online zelf, in de tijdzone Europe/Amsterdam.

---

## Problemen?

- **Bot-stand steeds terug op 10.000?** → Het volume ontbreekt of staat niet op
  `/data` (stap 3).
- **Geen Telegram?** → `TELEGRAM_TOKEN` / `TELEGRAM_CHAT_ID` ontbreken (stap 4).
- **Taken draaien niet?** → Controleer dat `RUN_SCHEDULER=1` aanstaat.
- **Alles testen vóór je deployt?** → `python test_bot.py` (hoort 0 gefaald).
