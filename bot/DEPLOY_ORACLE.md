# 🆓 Bot 24/7 online — op een GRATIS Oracle-server

Hiermee draait je bot echt 24/7 door, ook als je je MacBook dichtklapt en
meeneemt. Kosten: **€0** (Oracle's "Always Free"-servers).

**Tijd:** ~45 minuten, waarvan het meeste wachten.
**Wat je nodig hebt:** een e-mailadres en een creditcard (alleen ter
verificatie — Always Free wordt niet afgeschreven).

> **Eerlijke waarschuwing vooraf**
> - Oracle vráágt een creditcard. Ze zeggen dat "Always Free" gratis blijft,
>   maar **controleer dat zelf tijdens het aanmelden** — voorwaarden kunnen
>   veranderen. Zet géén upgrade naar een betaald account aan.
> - De gratis ARM-servers zijn populair. Krijg je **"Out of capacity"**? Dat is
>   normaal. Zie *Problemen* onderaan.
> - Dit maakt je bot **betrouwbaar, niet winstgevender**. Hij stopt alleen niet
>   meer met je Mac.

---

## Deel 1 — Account + server aanmaken (jouw klikwerk)

### 1.1 Account

1. Ga naar **oracle.com/cloud/free** → *Start for free*.
2. Kies bij **Country/Territory**: `Netherlands`.
3. Kies je **Home Region**: **`Netherlands Northwest (Amsterdam)`** of
   `Germany Central (Frankfurt)`.
   ⚠️ Dit kun je **later niet meer wijzigen**. Kies dus nu goed.
4. Verifieer met je creditcard. Wacht tot je account klaar is (kan 10–15 min
   duren; je krijgt een mail).

### 1.2 Server aanmaken

1. Log in op **cloud.oracle.com**.
2. Menu (☰) → **Compute** → **Instances** → **Create instance**.
3. Vul in:
   - **Name:** `tradingbot`
   - **Image:** klik *Change image* → **Canonical Ubuntu 24.04** → Select
   - **Shape:** klik *Change shape* → tab **Ampere** →
     `VM.Standard.A1.Flex` → zet **OCPU op 1** en **Memory op 6 GB**
     → *Select shape*

   > Krijg je later "Out of capacity"? Kies dan bij *Change shape* de tab
   > **AMD** → `VM.Standard.E2.1.Micro`. Die is bijna altijd beschikbaar en
   > ruim genoeg voor deze bot.

   Let op: bij beide shapes moet **"Always Free eligible"** in beeld staan.

4. Bij **Add SSH keys** → kies *Paste public keys* → plak **exact deze regel**:

   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAHBHxrHBchEScU2up6zuEbYZ/9MLA2FCnFRIBS6l9Rp tradingbot-oracle
   ```

5. Klik **Create**. Wacht tot de status **RUNNING** is (~1 min).
6. Noteer het **Public IP address** dat op de pagina verschijnt.

> Je hoeft **geen** poorten open te zetten. De bot maakt alleen verbindingen
> naar buiten (beurs, nieuws, Telegram) en luistert nergens op. Dat is veilig
> en scheelt gedoe.

---

## Deel 2 — Server klaarmaken

Vervang hieronder `JOUW_IP` door het IP uit stap 1.2.6.

### 2.1 Inloggen

Op je Mac in de Terminal:

```bash
ssh ubuntu@JOUW_IP
```

Eerste keer vraagt hij *"Are you sure you want to continue connecting?"* →
typ `yes`. Je ziet nu `ubuntu@tradingbot:~$` — je bent op de server.

### 2.2 Docker installeren

Plak dit op de **server** (alles in één keer mag):

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
```

Log uit en weer in, zodat je Docker zonder `sudo` mag gebruiken:

```bash
exit
```
```bash
ssh ubuntu@JOUW_IP
docker --version      # moet een versienummer tonen
```

---

## Deel 3 — Bot naar de server

### 3.1 Code kopiëren (doe dit op je MAC, niet op de server)

Open een **nieuwe** Terminal op je Mac:

```bash
cd ~/tradingbot
rsync -av --exclude venv --exclude .git --exclude __pycache__ \
      --exclude '*.png' ./ ubuntu@JOUW_IP:~/tradingbot/
```

Dit stuurt je code **en je `.env`** (met je Telegram-sleutels) veilig via SSH
naar je eigen server. Je bot-stand gaat niet mee — die zetten we hieronder
apart neer.

### 3.2 Je huidige portefeuille meenemen (aanrader!)

Wil je verder met je huidige stand (~10.259 USDT en al je historie) in plaats
van vers beginnen? Doe dit op je **Mac**:

```bash
cd ~/tradingbot
ssh ubuntu@JOUW_IP "mkdir -p ~/botdata"
rsync -av portfolio_state.json baseline.json equity_history.jsonl \
      ubuntu@JOUW_IP:~/botdata/
```

Sla je dit over, dan start de bot online netjes met een verse portefeuille
(10 munten × 1000 USDT) — ook prima, maar dan begint je meetperiode opnieuw.

### 3.3 Bot bouwen en starten (op de SERVER)

```bash
ssh ubuntu@JOUW_IP
cd ~/tradingbot
mkdir -p ~/botdata
docker build -t tradingbot .
```

Het bouwen duurt ~3–5 minuten (hij haalt Python en de pakketten op). Daarna:

```bash
docker run -d \
  --name tradingbot \
  --restart unless-stopped \
  --env-file .env \
  -v ~/botdata:/data \
  tradingbot
```

Wat die regels doen:
- `-d` — draait op de achtergrond
- `--restart unless-stopped` — start vanzelf opnieuw na een crash **of een
  herstart van de server**
- `--env-file .env` — je Telegram-sleutels
- `-v ~/botdata:/data` — **de blijvende opslag**: je portefeuille overleeft
  elke update. Dit is de belangrijkste regel.

---

## Deel 4 — Controleren

```bash
docker logs -f tradingbot
```

Je hoort binnen een minuut te zien:

```
BOT GESTART — 10 munten | paper trading (NEPGELD)
Interval: 3600s | nieuwsfilter: True (keyword) | nieuwswaker: elke 5 min
[BTC/USDT] WACHT (uit markt) | koers ...
Ronde 1 klaar | totale waarde: 10,259.53 USDT over 10/10 munten
```

Zie je je oude bedrag terug? Dan is je stand goed meegekomen. 🎉
Stoppen met meekijken: `Ctrl+C` (de bot blijft gewoon draaien).

Je krijgt ook een Telegram-bericht dat de bot (her)start is.

---

## Deel 5 — Zet je Mac-bot uit

Anders draaien er **twee** bots die allebei handelen en melden. Op je **Mac**:

```bash
cd ~/tradingbot
./bot.sh stop
./install_schedule.sh remove
```

Vanaf nu doet de server alles: handelen, de nieuwswaker, én de 4 dagelijkse
taken (analyse 08:00, hertune 09:00, rapport 20:00, beoordeling maandag 09:30)
in de Nederlandse tijdzone.

---

## Dagelijks gebruik

| Wat wil je? | Commando (op de server) |
|---|---|
| Kijken wat hij doet | `docker logs -f tradingbot` |
| Draait hij nog? | `docker ps` |
| Bot herstarten | `docker restart tradingbot` |
| Bot stoppen | `docker stop tradingbot` |
| Je stand bekijken | `cat ~/botdata/portfolio_state.json` |

### Code bijwerken na een wijziging

Op je **Mac**:
```bash
cd ~/tradingbot
rsync -av --exclude venv --exclude .git --exclude __pycache__ \
      --exclude '*.png' ./ ubuntu@JOUW_IP:~/tradingbot/
```
Op de **server**:
```bash
cd ~/tradingbot
docker build -t tradingbot . && docker restart tradingbot
```
Je bot-stand in `~/botdata` blijft hierbij gewoon staan.

### Later Claude-AI aanzetten

Op de **server**, voeg twee regels toe aan `~/tradingbot/.env`:
```
ANTHROPIC_API_KEY=sk-...
SENTIMENT_METHOD=claude
```
Daarna: `docker restart tradingbot`.

---

## Problemen?

**"Out of host capacity" bij het aanmaken**
De gratis ARM-servers zijn druk bezet. Opties:
1. Kies de **AMD**-shape `VM.Standard.E2.1.Micro` (bijna altijd vrij, prima
   voor deze bot).
2. Of probeer de ARM later opnieuw — capaciteit komt en gaat.

**`ssh: connect to host ... Connection refused`**
De server is nog aan het opstarten. Wacht 2 minuten en probeer opnieuw.

**`Permission denied (publickey)`**
Je hebt bij het aanmaken een andere sleutel geplakt. Controleer op je Mac:
`cat ~/.ssh/id_ed25519.pub` en vergelijk met wat er in Oracle staat.

**Bot-stand staat steeds op 10.000**
Het volume ontbreekt. Controleer dat `-v ~/botdata:/data` in je `docker run`
stond, en dat `~/botdata` bestaat op de server.

**Geen Telegram-berichten**
`.env` is niet meegekomen. Check op de server: `cat ~/tradingbot/.env` — daar
horen `TELEGRAM_TOKEN` en `TELEGRAM_CHAT_ID` in te staan.

**Alles testen vóór je begint**
Op je Mac: `python test_bot.py` → hoort "0 gefaald" te zeggen.
