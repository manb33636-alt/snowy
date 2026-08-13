# notify.py
# ----------------------------------------------------------------------
# Stuurt een seintje als de bot iets doet (bv. een trade).
# Heb je een Telegram-bot ingesteld (TELEGRAM_TOKEN + TELEGRAM_CHAT_ID in je
# .env-bestand)? Dan komt het bericht op Telegram binnen. Zo niet, dan wordt
# het gewoon gelogd -- nooit een fout, de bot draait altijd door.
# ----------------------------------------------------------------------

import requests
import config


def telegram_enabled():
    """Is Telegram ingesteld?"""
    return bool(config.TELEGRAM_TOKEN and config.TELEGRAM_CHAT_ID)


def send(message):
    """
    Verstuur een melding. Geeft True terug als het via Telegram gelukt is,
    anders False (en valt terug op de console).
    """
    if not telegram_enabled():
        print(f"  [melding] {message}  (Telegram niet ingesteld -> alleen gelogd)")
        return False

    url = f"https://api.telegram.org/bot{config.TELEGRAM_TOKEN}/sendMessage"
    try:
        resp = requests.post(
            url,
            data={"chat_id": config.TELEGRAM_CHAT_ID, "text": message},
            timeout=10,  # nooit eindeloos wachten
        )
        if resp.status_code == 200:
            return True
        print(f"  [melding] Telegram-fout {resp.status_code}: {resp.text[:120]}")
        return False
    except Exception as e:
        # Een mislukte melding mag de bot nooit stoppen.
        print(f"  [melding] kon Telegram niet bereiken: {e}")
        return False


if __name__ == "__main__":
    # Test: `python notify.py`
    if telegram_enabled():
        print("Telegram is ingesteld. Testbericht versturen...")
        ok = send("✅ Testbericht van je trading bot — Telegram werkt!")
        print("Verstuurd!" if ok else "Versturen mislukt (check token/chat_id).")
    else:
        print("Telegram is NIET ingesteld.")
        print("Vul TELEGRAM_TOKEN en TELEGRAM_CHAT_ID in je .env-bestand in.")
        print("Test-fallback:")
        send("Dit zou een melding zijn.")
