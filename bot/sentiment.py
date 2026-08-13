# sentiment.py
# ----------------------------------------------------------------------
# Beoordeelt crypto-nieuwskoppen en geeft een "sentiment-score":
#     -1.0 = zeer negatief   0.0 = neutraal   +1.0 = zeer positief
#
# Twee methodes (instelbaar in config.py via SENTIMENT_METHOD):
#   "keyword" -> gratis, simpele woordenlijst. Werkt direct.
#   "claude"  -> slimme AI-analyse via Claude. Vereist een API-sleutel.
# ----------------------------------------------------------------------

import json
import os
import config

# --- Methode 1: gratis woord-analyse -----------------------------------

# Woorden die op goed of slecht nieuws wijzen, MET gewicht: gewone woorden
# tellen 1x, zeer sterke woorden (hack, faillissement, all-time high) 2x.
POSITIVE_WORDS = {
    # gewicht 1 — gewone positieve signalen
    "surge": 1, "surges": 1, "rally": 1, "rallies": 1, "soar": 1, "soars": 1,
    "gain": 1, "gains": 1, "bull": 1, "bullish": 1, "boom": 1, "high": 1,
    "adopt": 1, "adoption": 1, "approval": 1, "approved": 1, "breakout": 1,
    "record": 1, "rise": 1, "rises": 1, "jump": 1, "jumps": 1, "support": 1,
    "buy": 1, "buys": 1, "upgrade": 1, "partnership": 1, "win": 1, "wins": 1,
    "climb": 1, "climbs": 1, "recover": 1, "recovers": 1, "recovery": 1,
    "rebound": 1, "rebounds": 1, "inflows": 1, "milestone": 1, "growth": 1,
    "accumulate": 1, "accumulation": 1, "launch": 1, "launches": 1,
    # gewicht 2 — uitzonderlijk sterk goed nieuws
    "skyrocket": 2, "skyrockets": 2,
}
NEGATIVE_WORDS = {
    # gewicht 1 — gewone negatieve signalen
    "plunge": 1, "plunges": 1, "drop": 1, "drops": 1, "fall": 1, "falls": 1,
    "bear": 1, "bearish": 1, "ban": 1, "banned": 1, "lawsuit": 1, "sell": 1,
    "sells": 1, "selloff": 1, "dump": 1, "dumps": 1, "fear": 1, "warning": 1,
    "decline": 1, "declines": 1, "loss": 1, "losses": 1, "down": 1,
    "slump": 1, "slumps": 1, "risk": 1, "tumble": 1, "tumbles": 1,
    "sink": 1, "sinks": 1, "outflows": 1, "crackdown": 1, "sues": 1,
    "sued": 1, "halts": 1, "halted": 1, "suspends": 1, "suspended": 1,
    "delist": 1, "delisted": 1, "liquidation": 1, "liquidations": 1,
    "liquidated": 1, "layoffs": 1,
    # gewicht 2 — uitzonderlijk sterk slecht nieuws (crisis-woorden)
    "crash": 2, "crashes": 2, "hack": 2, "hacked": 2, "scam": 2, "fraud": 2,
    "collapse": 2, "collapses": 2, "bankrupt": 2, "bankruptcy": 2,
    "insolvent": 2, "insolvency": 2, "exploit": 2, "exploited": 2,
    "theft": 2, "stolen": 2, "breach": 2,
}

# Vaste ZINNEN die sterker zijn dan losse woorden. Worden eerst gematcht (en
# uit de kop gehaald, zodat de losse woorden erin niet dubbel tellen).
POSITIVE_PHRASES = {
    "all-time high": 2, "all time high": 2, "record high": 2,
    "etf approval": 2, "etf approved": 2, "institutional adoption": 2,
}
NEGATIVE_PHRASES = {
    "sec sues": 2, "sec lawsuit": 2, "etf rejected": 2, "exchange hack": 2,
    "security breach": 2, "rug pull": 2, "bank run": 2, "exit scam": 2,
}

# Ontkenningen: "not bullish" is NIET bullish. Staat zo'n woord vlak vóór een
# signaalwoord (max 2 woorden ervoor), dan draait de betekenis om.
NEGATION_WORDS = {"not", "no", "without", "denies", "denied", "deny",
                  "isn't", "isnt", "won't", "wont", "never", "unlikely"}


def _clean_words(title):
    """Kop -> lijst schone kleine-letter woorden (leestekens eraf)."""
    return [w.strip(".,!?:;\"'()[]") for w in title.lower().split()]


def _score_headline(title):
    """
    Geef (positief_gewicht, negatief_gewicht) voor ÉÉN kop, met zinnen,
    gewichten en ontkenning-detectie.
    """
    pos, neg = 0, 0
    lower = title.lower()

    # 1. Vaste zinnen eerst (en daarna uit de tekst halen tegen dubbeltellen).
    # Vervang door een uniek placeholder-WOORD (geen kale spatie) zodat de zin
    # een eigen slot in de words-lijst hieronder blijft innemen. Zonder dit
    # plakken de woorden voor en na de zin aan elkaar vast (spaties worden
    # weggegooid door .split()), waardoor een ontkenning die grammaticaal
    # alleen bij de zin hoorde (bv. "no bank run") per ongeluk een verderop
    # signaalwoord omdraait (negation-scope bug).
    PHRASE_PLACEHOLDER = "xphrasex"
    for phrase, w in POSITIVE_PHRASES.items():
        if phrase in lower:
            pos += w
            lower = lower.replace(phrase, f" {PHRASE_PLACEHOLDER} ")
    for phrase, w in NEGATIVE_PHRASES.items():
        if phrase in lower:
            neg += w
            lower = lower.replace(phrase, f" {PHRASE_PLACEHOLDER} ")

    # 2. Losse woorden, met ontkenning-check (max 2 woorden terugkijken).
    words = [w.strip(".,!?:;\"'()[]") for w in lower.split()]
    for i, w in enumerate(words):
        weight = POSITIVE_WORDS.get(w)
        polarity = 1
        if weight is None:
            weight = NEGATIVE_WORDS.get(w)
            polarity = -1
        if weight is None:
            continue
        negated = any(x in NEGATION_WORDS for x in words[max(0, i - 2):i])
        if negated:
            polarity = -polarity
        if polarity > 0:
            pos += weight
        else:
            neg += weight
    return pos, neg


def keyword_sentiment(headlines):
    """Weeg positieve en negatieve signalen en maak er een score van."""
    pos, neg = 0, 0
    for title in headlines:
        p, n = _score_headline(title)
        pos += p
        neg += n

    total = pos + neg
    if total == 0:
        return 0.0, "Geen duidelijk positieve of negatieve woorden gevonden."
    # Demp op bewijs: extreme scores (±1.0) vereisen genoeg signaalwoorden.
    # Zo koopt/verkoopt de bot niet massaal op basis van 1-2 losse woorden.
    confidence = min(1.0, total / config.SENTIMENT_MIN_WORDS)
    score = (pos - neg) / total * confidence
    reason = (f"{pos} positieve vs {neg} negatieve signaalpunten "
              f"(vertrouwen {confidence:.0%}).")
    return score, reason


# --- Per-munt sentiment -------------------------------------------------

def coin_specific_headlines(headlines, symbol):
    """Alleen de koppen die deze munt expliciet noemen (via COIN_KEYWORDS)."""
    keys = config.COIN_KEYWORDS.get(symbol, [])
    if not keys:
        return []
    result = []
    for title in headlines:
        words = set(_clean_words(title))
        if any(k in words for k in keys):
            result.append(title)
    return result


def _keyword_per_coin(headlines, symbols):
    """Per-munt sentiment met de gratis woord-analyse (de terugval-methode)."""
    global_score, uitleg = get_sentiment(headlines)
    per_coin = {}
    for sym in symbols:
        specific = coin_specific_headlines(headlines, sym)
        if specific:
            spec_score, _ = keyword_sentiment(specific)
            per_coin[sym] = (global_score + spec_score) / 2
        else:
            per_coin[sym] = global_score
    return global_score, uitleg, per_coin


def claude_sentiment_per_coin(headlines, symbols):
    """
    Laat Claude in ÉÉN aanroep zowel het algemene marktsentiment als een score
    per munt teruggeven. Veel slimmer dan woorden tellen (Claude snapt bijv. dat
    "SEC drops case against Ripple" positief is, ook al bevat het 'drops').
    """
    import anthropic
    client = anthropic.Anthropic()

    koppen_tekst = "\n".join(f"- {h}" for h in headlines)
    namen = {s: (config.COIN_KEYWORDS.get(s) or [s.split("/")[0]])[0] for s in symbols}
    coin_lijst = ", ".join(f"{s.split('/')[0]} ({namen[s]})" for s in symbols)
    prompt = (
        "Hieronder staan recente crypto-nieuwskoppen. Beoordeel het sentiment "
        "voor de cryptomarkt op korte termijn.\n\n"
        f"{koppen_tekst}\n\n"
        "Geef: (1) een ALGEMENE marktscore tussen -1.0 (zeer negatief) en 1.0 "
        "(zeer positief), (2) een korte uitleg in het Nederlands, en (3) een "
        f"score per munt voor: {coin_lijst}. Wordt een munt niet specifiek "
        "genoemd, geef dan de algemene marktscore voor die munt."
    )
    response = client.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=1024,
        output_config={"format": {"type": "json_schema", "schema": {
            "type": "object",
            "properties": {
                "global": {"type": "number"},
                "reason": {"type": "string"},
                "coins": {"type": "array", "items": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string"},
                        "score": {"type": "number"},
                    },
                    "required": ["symbol", "score"],
                    "additionalProperties": False,
                }},
            },
            "required": ["global", "reason", "coins"],
            "additionalProperties": False,
        }}},
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    data = json.loads(text)

    def clamp(x):
        return max(-1.0, min(1.0, float(x)))

    g = clamp(data["global"])
    by_short = {c["symbol"].upper().split("/")[0]: clamp(c["score"])
                for c in data.get("coins", [])}
    per_coin = {s: by_short.get(s.split("/")[0].upper(), g) for s in symbols}
    return g, data["reason"], per_coin


# Aparte 1-item cache voor de per-munt uitkomst (de nieuwswaker en de uur-ronde
# vragen vaak exact dezelfde koppen op — dan niet opnieuw rekenen/betalen).
_pc_last_key = None
_pc_last_result = None


def get_sentiment_per_coin(headlines, symbols):
    """
    Geef (algemene_score, uitleg, {munt: score}).

    Met SENTIMENT_METHOD="claude" (+ API-sleutel) leest Claude het nieuws en
    scoort hij per munt. Anders de gratis woord-analyse: noemen koppen een munt
    expliciet, dan is de munt-score het gemiddelde van het algemene marktsentiment
    en het munt-specifieke sentiment; anders het algemene sentiment. Zo weegt
    Bitcoin-nieuws zwaarder voor BTC dan voor DOGE, en trekken 10 munten niet
    meer allemaal tegelijk aan één touw.
    """
    global _pc_last_key, _pc_last_result
    if not headlines:
        return 0.0, "Geen koppen om te beoordelen.", {s: 0.0 for s in symbols}

    key = (config.SENTIMENT_METHOD, tuple(headlines), tuple(symbols))
    if key == _pc_last_key:
        return _pc_last_result

    if config.SENTIMENT_METHOD == "claude" and os.environ.get("ANTHROPIC_API_KEY"):
        try:
            result = claude_sentiment_per_coin(headlines, symbols)
            _pc_last_key, _pc_last_result = key, result
            return result
        except Exception as e:
            print(f"  (Claude per-munt fout: {e} -> val terug op woord-analyse)")
            # Fallback-resultaat NIET cachen onder de "claude"-key: anders blijft
            # een volgende aanroep met dezelfde koppen (bv. de nieuwswaker) voor
            # altijd de woord-analyse teruggeven, ook als Claude intussen weer
            # werkt (rate limit/timeout was tijdelijk). Zo proberen we Claude
            # bij elke nieuwe aanroep opnieuw, tot het weer lukt.
            return _keyword_per_coin(headlines, symbols)

    result = _keyword_per_coin(headlines, symbols)
    _pc_last_key, _pc_last_result = key, result
    return result


# --- Methode 2: slimme AI-analyse via Claude ---------------------------

def claude_sentiment(headlines):
    """
    Laat Claude (AI) de koppen lezen en een sentiment-score teruggeven.
    Vereist dat de omgevingsvariabele ANTHROPIC_API_KEY is ingesteld.
    """
    import anthropic  # pas importeren als we het echt gebruiken

    client = anthropic.Anthropic()  # leest automatisch ANTHROPIC_API_KEY

    koppen_tekst = "\n".join(f"- {h}" for h in headlines)
    prompt = (
        "Hieronder staan recente crypto-nieuwskoppen. Beoordeel het algemene "
        "sentiment voor de cryptomarkt op korte termijn.\n\n"
        f"{koppen_tekst}\n\n"
        "Geef een score tussen -1.0 (zeer negatief) en 1.0 (zeer positief), "
        "en een korte uitleg in het Nederlands."
    )

    # We dwingen een vast JSON-antwoord af, zodat we het betrouwbaar kunnen uitlezen.
    response = client.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=1024,
        output_config={
            "format": {
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "reason": {"type": "string"},
                    },
                    "required": ["score", "reason"],
                    "additionalProperties": False,
                },
            }
        },
        messages=[{"role": "user", "content": prompt}],
    )

    text = next(b.text for b in response.content if b.type == "text")
    data = json.loads(text)
    # Veiligheidshalve binnen [-1, 1] houden.
    score = max(-1.0, min(1.0, float(data["score"])))
    return score, data["reason"]


# --- Slimme keuze tussen de twee methodes ------------------------------

# Onthoud het laatste resultaat: de snelle nieuwswaker en de uur-ronde zien
# vaak exact dezelfde koppen — dan hoeven we niet opnieuw te rekenen (en bij
# de Claude-methode niet opnieuw te betalen).
_last_key = None
_last_result = None


def get_sentiment(headlines):
    """
    Kies automatisch de juiste methode op basis van config.
    Geeft (score, uitleg) terug. Valt veilig terug op "keyword" als er
    geen API-sleutel is of Claude een fout geeft.
    """
    global _last_key, _last_result
    if not headlines:
        return 0.0, "Geen koppen om te beoordelen."

    key = (config.SENTIMENT_METHOD, tuple(headlines))
    if key == _last_key:
        return _last_result

    if config.SENTIMENT_METHOD == "claude" and os.environ.get("ANTHROPIC_API_KEY"):
        try:
            result = claude_sentiment(headlines)
            _last_key, _last_result = key, result
            return result
        except Exception as e:
            print(f"  (Claude-fout: {e} -> val terug op gratis woord-analyse)")
            # Niet cachen onder de "claude"-key (zie get_sentiment_per_coin
            # hierboven): anders blijft een latere aanroep met dezelfde koppen
            # de woord-analyse hergebruiken, ook nadat een tijdelijke Claude-
            # storing (rate limit/timeout) allang voorbij is.
            return keyword_sentiment(headlines)
    elif config.SENTIMENT_METHOD == "claude":
        print("  (geen ANTHROPIC_API_KEY gevonden -> val terug op gratis woord-analyse)")

    result = keyword_sentiment(headlines)
    _last_key, _last_result = key, result
    return result


if __name__ == "__main__":
    # Snel testen: haalt echt nieuws op en scoort het.
    import news
    koppen = news.fetch_headlines(limit=15)
    score, uitleg = get_sentiment(koppen)
    print(f"\nMethode: {config.SENTIMENT_METHOD}")
    print(f"Sentiment-score: {score:+.2f}")
    print(f"Uitleg: {uitleg}")
