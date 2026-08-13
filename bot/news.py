# news.py
# ----------------------------------------------------------------------
# Haalt actuele crypto-krantenkoppen op via gratis RSS-feeds.
# RSS = een soort nieuws-stroom die websites publiceren; geen account of
# API-sleutel nodig.
# ----------------------------------------------------------------------

import socket

import feedparser

# Bekende, gratis crypto-nieuwsbronnen (RSS-feeds). Meer bronnen = bredere dekking.
NEWS_FEEDS = [
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cointelegraph.com/rss",
    "https://bitcoinmagazine.com/feed",
    "https://decrypt.co/feed",
    "https://cryptoslate.com/feed/",
    "https://news.bitcoin.com/feed/",
    "https://www.theblock.co/rss.xml",
]


def fetch_headlines(limit=15):
    """
    Haal de meest recente krantenkoppen op uit alle feeds.
    Geeft een lijst met losse titels (strings) terug.
    """
    headlines = []
    # Tijdelijk een netwerk-time-out instellen, zodat een trage of hangende feed
    # de bot niet eindeloos laat wachten. Achteraf netjes terugzetten.
    old_timeout = socket.getdefaulttimeout()
    socket.setdefaulttimeout(15)
    try:
        for url in NEWS_FEEDS:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries:
                    title = entry.get("title", "").strip()
                    if title:
                        headlines.append(title)
            except Exception as e:
                # Eén kapotte feed mag de rest niet tegenhouden.
                print(f"  (waarschuwing: feed niet bereikbaar: {url} -> {e})")
    finally:
        socket.setdefaulttimeout(old_timeout)

    # Dubbele koppen eruit, en afkappen op `limit` stuks.
    unique = list(dict.fromkeys(headlines))
    return unique[:limit]


if __name__ == "__main__":
    # Snel testen: `python news.py`
    koppen = fetch_headlines(limit=10)
    print(f"{len(koppen)} recente crypto-koppen:\n")
    for i, k in enumerate(koppen, 1):
        print(f"  {i}. {k}")
