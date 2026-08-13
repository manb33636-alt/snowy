# config.py
# ----------------------------------------------------------------------
# Alle instellingen van de bot op EEN plek. Pas hier dingen aan,
# dan hoef je de rest van de code niet aan te raken.
# ----------------------------------------------------------------------

import os


def _load_env_file(path=".env"):
    """
    Lees geheime sleutels uit een '.env'-bestand (regels in de vorm KEY=waarde)
    en zet ze als omgevingsvariabelen. Zo hoef je sleutels NIET in de code te
    zetten. Bestaat het bestand niet, dan gebeurt er niets.
    Een echte (geëxporteerde) omgevingsvariabele wint altijd van het bestand.
    """
    if not os.path.exists(path):
        return
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    except Exception as e:
        print(f"  (waarschuwing: .env niet leesbaar: {e})")


_load_env_file()

# Welke beurs gebruiken we voor KOERSDATA (niet voor echt handelen).
# 'binance' heeft gratis, betrouwbare historische data.
EXCHANGE = "binance"

# Welk handelspaar gebruiken de losse tools (backtest, analyse, voorspeller)?
# 'BTC/USDT' = Bitcoin geprijsd in dollars (USDT = een dollar-stablecoin).
SYMBOL = "BTC/USDT"

# Welke munten volgt/verhandelt de LIVE bot allemaal? Elke munt krijgt zijn
# EIGEN paper-portefeuille van START_CASH (een los experiment per munt, zodat je
# makkelijk kunt vergelijken waar de strategie het beste werkt). Meer munten =
# tragere rondes (elke munt is een aparte data-aanvraag). Voeg gerust toe/weg.
# 10 grote, liquide markten: large-caps + betalingen + DeFi + meme — zo zie je
# op welk TYPE markt de strategie het beste werkt.
SYMBOLS = [
    "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT",
    "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "LINK/USDT", "LTC/USDT",
]

# Tijdsinterval per "candle" (koersblokje).
# '1h' = elke candle is 1 uur. Opties: '15m', '1h', '4h', '1d'.
TIMEFRAME = "1h"

# Met hoeveel NEPgeld beginnen we? (in USDT)
START_CASH = 1000.0

# --- Strategie-instellingen (technische indicatoren) ---

# Twee voortschrijdende gemiddelden (moving averages).
# Als het SNELLE gemiddelde boven het TRAGE uitkomt -> koopsignaal.
# Als het er onder zakt -> verkoopsignaal. (Klassieke "crossover".)
FAST_MA = 10    # snel gemiddelde over 10 candles (getuned 30-6: robuuster dan 20)
SLOW_MA = 50    # traag gemiddelde over 50 candles

# RSI = "Relative Strength Index", meet of iets over- of onderverkocht is.
# Waarde tussen 0 en 100.
RSI_PERIOD = 14
RSI_OVERBOUGHT = 70   # boven 70 = duur/overgekocht -> niet kopen (wordt gebruikt)
# RSI_OVERSOLD wordt gebruikt door analyze.py (RSI-zone + marktbeeld in de
# dagelijkse analyse). De handels-strategie zelf gebruikt hem nog niet.
RSI_OVERSOLD = 30     # onder 30 = goedkoop/oververkocht

# --- Risicobeheer ---

# Hoeveel % van je geld zet je per trade in? 1.0 = alles, 0.5 = helft.
POSITION_SIZE = 1.0

# Correlatie-limiet: hoeveel munten mag de bot MAXIMAAL tegelijk in bezit
# hebben? Crypto-munten bewegen sterk samen; als de bot alle 10 tegelijk koopt,
# dalen ze ook samen (dat was precies de zwakte van eerder). Met een limiet
# spreid je het risico: hooguit dit aantal posities tegelijk. De munten worden
# in SYMBOLS-volgorde bediend, dus wie het eerst een koopsignaal geeft, wint.
# Zet op len(SYMBOLS) om de limiet uit te schakelen.
MAX_OPEN_POSITIONS = 5

# --- Markt-regime filter (Bitcoin als marktleider) ---
# Alt-coins stijgen meestal alleen mee als Bitcoin zélf in een opgaande trend
# zit. Staat dit AAN, dan koopt de bot GEEN enkele munt zolang BTC in een
# dalende trend zit (BTC's snelle gemiddelde onder het trage, op de 1-uurs
# candles). Zo stap je niet tegen de hele markt in. Verkopen en risicobeheer
# (stop-loss/take-profit/nieuws-uitstap) blijven ALTIJD werken — dit filtert
# alleen nieuwe aankopen. Faalt de BTC-check (netwerk), dan wordt het filter
# die ronde overgeslagen (liever niet alles blokkeren op een storing).
USE_BTC_REGIME_FILTER = True
BTC_REGIME_SYMBOL = "BTC/USDT"

# Stop-loss: verkoop automatisch als de koers X% onder je aankoop zakt.
# 0.05 = 5% verlies -> uitstappen om grote klappen te voorkomen.
STOP_LOSS = 0.03

# Take-profit: verkoop automatisch bij X% winst. 0.10 = 10%.
TAKE_PROFIT = 0.08

# Trailing stop-loss: de stop schuift MEE omhoog als de koers stijgt, zodat
# winst wordt vastgezet. Verkoopt als de koers TRAILING_STOP onder de hoogste
# stand sinds aankoop zakt. Werkt naast de vaste stop-loss/take-profit; wie het
# eerst raakt, wint.
USE_TRAILING_STOP = True
TRAILING_STOP = 0.05   # 5% onder de piek sinds aankoop

# Handelskosten per transactie (beurzen rekenen ~0.1%). Realistisch meenemen.
FEE = 0.001

# Slippage/spread: in het echt koop je net iets DUURDER en verkoop je iets
# GOEDKOPER dan de koers (verschil bied/laat + marktimpact). We rekenen dit mee
# zodat de paper-resultaten realistisch zijn voor als je ooit echt gaat handelen.
# Een heen-en-terug trade kost dan ~ 2×FEE + 2×SLIPPAGE ≈ 0,3%.
SLIPPAGE = 0.0005   # 0.05% per transactie

# --- Nieuws & AI-laag ---

# Zet de nieuws/AI-filter aan of uit. Met False werkt de bot puur op techniek.
USE_NEWS_FILTER = True

# Welke methode gebruiken we om het nieuws te beoordelen?
#   "keyword" = gratis, simpele woord-analyse (werkt direct, geen account nodig)
#   "claude"  = slimme AI-analyse via Claude (vereist een API-sleutel, kost geld)
SENTIMENT_METHOD = "keyword"

# Welk Claude-model gebruiken we als SENTIMENT_METHOD = "claude"?
# 'claude-opus-4-8' is het slimst. Voor het simpel inschatten van krantenkoppen
# (wat we hier doen) is 'claude-haiku-4-5' veel goedkoper en meestal prima --
# wil je kosten besparen, zet dan deze regel op "claude-haiku-4-5".
CLAUDE_MODEL = "claude-opus-4-8"

# Model voor de dagelijkse MARKTANALYSE (analyze.py). Draait maar 1x per dag,
# dus hier mag het beste model:
#   'claude-fable-5'   = meest capabele model (beste analyse, ~2x duurder)
#   'claude-opus-4-8'  = uitstekend en de helft goedkoper
#   'claude-haiku-4-5' = goedkoopst, prima voor een korte samenvatting
ANALYSIS_MODEL = "claude-fable-5"

# Drempels voor de sentiment-score (loopt van -1 = zeer negatief tot +1 = zeer positief):
#   - Onder deze waarde blokkeert de AI een koopsignaal ("veto").
SENTIMENT_BLOCK_BUY = -0.3
#   - Boven deze waarde mag de bot zelfs zónder technisch signaal kopen (optioneel, uit by default).
SENTIMENT_STRONG_BUY = 0.6

# Nieuws-gedreven uitstap: zit je IN de markt en wordt het nieuws ZÉÉR negatief,
# dan verkoopt de bot om kapitaal te beschermen — ook zonder technisch signaal.
USE_NEWS_EXIT = True
SENTIMENT_FORCE_SELL = -0.6   # onder deze score -> uitstappen op het nieuws

# Minimaal aantal signaalwoorden voor een VOLLE score (±1.0). Met minder woorden
# wordt de score gedempt, zodat de bot niet massaal koopt/verkoopt op 1-2 woorden.
# (5 = pas bij 5+ eensgezinde woorden een extreme score.)
SENTIMENT_MIN_WORDS = 5

# Hoeveel koppen halen we per nieuwscheck op? Meer koppen = breder bewijs
# (en de demping hierboven werkt dan beter).
NEWS_HEADLINES_LIMIT = 25

# --- Snelle nieuwswaker (tussen de uur-rondes door) ---
# De bot checkt het nieuws elke NEWS_WATCH_INTERVAL_SECONDS (i.p.v. alleen 1x
# per uur). Wordt het nieuws ZÉÉR negatief terwijl we in de markt zitten, dan
# verkoopt hij DIRECT (kapitaalbescherming). Kopen blijft bewust alleen op
# afgesloten uur-candles gebeuren — discipline, geen impulsaankopen op nieuws.
NEWS_WATCH_INTERVAL_SECONDS = 300   # elke 5 minuten

# Welke woorden in een krantenkop horen bij welke munt? Hiermee krijgt elke
# munt een EIGEN sentiment (Bitcoin-nieuws weegt zwaarder voor BTC dan voor
# DOGE). Kop zonder munt-match telt alleen mee voor het algemene marktsentiment.
# Let op: bewust GEEN 'link' voor Chainlink ('link' is een te algemeen woord).
COIN_KEYWORDS = {
    "BTC/USDT": ["bitcoin", "btc"],
    "ETH/USDT": ["ethereum", "ether", "eth"],
    "SOL/USDT": ["solana", "sol"],
    "BNB/USDT": ["bnb", "binance"],
    "XRP/USDT": ["xrp", "ripple"],
    "ADA/USDT": ["cardano", "ada"],
    "DOGE/USDT": ["dogecoin", "doge"],
    "AVAX/USDT": ["avalanche", "avax"],
    "LINK/USDT": ["chainlink"],
    "LTC/USDT": ["litecoin", "ltc"],
}

# --- Live paper-trading loop ---

# Hoe vaak controleert de bot de markt? In seconden.
# 3600 = elk uur (past mooi bij de 1-uurs candles). Voor testen: zet lager.
CHECK_INTERVAL_SECONDS = 3600

# --- Waar bewaart de bot zijn gegevens? ---
# Lokaal (op je Mac): gewoon in de projectmap — je hoeft niets te doen.
# Draait de bot ONLINE, zet DATA_DIR dan op een BLIJVENDE schijf (een "volume"),
# bijvoorbeeld /data. Doe je dat niet, dan is bij elke update je hele bot-stand
# weg (portefeuille, historie, baseline) en begint je test weer bij nul!
DATA_DIR = os.environ.get("DATA_DIR", ".")


def data_path(name):
    """Pad naar een gegevensbestand, in DATA_DIR."""
    return os.path.join(DATA_DIR, name)


# Bestanden waarin de bot zijn stand en logboek bewaart.
STATE_FILE = data_path("portfolio_state.json")      # huidige nep-portemonnee
LOG_FILE = data_path("trades.log")                  # logboek van alle beslissingen
NEWS_LOG_FILE = data_path("news_log.txt")           # gevolgd nieuws + sentiment
EQUITY_FILE = data_path("equity_history.jsonl")     # dagwaarde (voor drawdown)
BASELINE_FILE = data_path("baseline.json")          # meetpunt bot-vs-markt
REPORT_LOG = data_path("report_log.txt")            # historie van de rapporten
RETUNE_REPORT = data_path("retune_report.txt")      # historie van het hertunen
NOMINATION_FILE = data_path("retune_nominations.json")  # hertune-teller
SCHEDULE_STATE = data_path("scheduler_state.json")  # wat draaide de planner al

# --- Strenge criteria voor de go/no-go beoordeling (evaluate.py) ---
EVAL_MIN_MARGIN = 2.0     # bot moet de markt met minstens 2 procentpunt verslaan
EVAL_MAX_DRAWDOWN = 15.0  # grootste dip in totale waarde mag niet groter zijn dan 15%

# Indeling van de munten in markt-types, zodat het rapport laat zien op welk
# TYPE markt de strategie het beste werkt (i.p.v. alleen per losse munt).
MARKET_TYPES = {
    "BTC/USDT": "large-cap", "ETH/USDT": "large-cap", "BNB/USDT": "large-cap",
    "SOL/USDT": "smart-contract", "ADA/USDT": "smart-contract",
    "AVAX/USDT": "smart-contract", "LINK/USDT": "smart-contract",
    "XRP/USDT": "betaling", "LTC/USDT": "betaling",
    "DOGE/USDT": "meme",
}

# --- Extra indicatoren (voor scherpere signalen) ---

# MACD: meet de momentum/richting. Als dit AAN staat, koopt de bot alleen als
# óók de MACD positief is (extra bevestiging).
# AANgezet na tuning (30-6): verbeterde het out-of-sample resultaat duidelijk.
USE_MACD_CONFIRM = True
MACD_FAST = 12     # snelle EMA
MACD_SLOW = 26     # trage EMA
MACD_SIGNAL = 9    # signaallijn

# Bollinger Bands: meet hoe ver de koers van het gemiddelde af staat.
# Als dit AAN staat, koopt de bot niet als de koers al boven de bovenband zit
# (te ver doorgeschoten). Standaard uit.
USE_BOLLINGER_CONFIRM = False
BOLLINGER_PERIOD = 20
BOLLINGER_STD = 2.0   # aantal standaarddeviaties voor de boven-/onderband

# --- Meldingen (Telegram) ---

# Wil je een seintje op Telegram als de bot een trade doet?
# Vul TELEGRAM_TOKEN en TELEGRAM_CHAT_ID in je .env-bestand in (zie .env.example).
# Staat er geen token, dan logt de bot de melding gewoon (geen fout).
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
