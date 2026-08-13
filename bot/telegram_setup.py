# telegram_setup.py
# ----------------------------------------------------------------------
# Maakt het koppelen van Telegram makkelijk: zoekt automatisch je "chat-id"
# op, slaat die op in .env, en stuurt een testbericht.
#
# Vooraf (in de Telegram-app):
#   1. Maak een bot via @BotFather (stuur /newbot) -> je krijgt een TOKEN.
#   2. Zet die token in je .env-bestand achter  TELEGRAM_TOKEN=
#   3. Stuur je nieuwe bot zelf een berichtje (druk Start, typ "hoi").
#
# Daarna:  python telegram_setup.py
# ----------------------------------------------------------------------

import os

import requests

import config

ENV_FILE = ".env"


def _set_env_value(key, value):
    """Schrijf of werk KEY=value bij in het .env-bestand (robuust: negeert
    commentaar en spaties rond de sleutel, voorkomt dubbele regels)."""
    lines = []
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE) as f:
            lines = f.read().splitlines()
    found = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        existing_key = stripped.split("=", 1)[0].strip()
        if existing_key == key:
            lines[i] = f"{key}={value}"
            found = True
            break
    if not found:
        lines.append(f"{key}={value}")
    with open(ENV_FILE, "w") as f:
        f.write("\n".join(lines) + "\n")


def main():
    token = os.environ.get("TELEGRAM_TOKEN", "").strip()
    if not token:
        print("Geen TELEGRAM_TOKEN gevonden in .env.\n")
        print("Doe eerst dit:")
        print("  1. Maak een bot via @BotFather in Telegram (stuur /newbot).")
        print("  2. cp .env.example .env      (als je nog geen .env hebt)")
        print("  3. Zet je token in .env achter  TELEGRAM_TOKEN=")
        print("  4. Stuur je bot zelf een berichtje (druk Start, typ 'hoi').")
        print("  5. Draai dit script opnieuw:  python telegram_setup.py")
        return

    print("Token gevonden. Je chat-id ophalen via Telegram...")
    try:
        resp = requests.get(
            f"https://api.telegram.org/bot{token}/getUpdates", timeout=15
        )
        data = resp.json()
    except Exception as e:
        print(f"Kon Telegram niet bereiken: {e}")
        return

    if not data.get("ok"):
        print(f"Telegram gaf een fout terug: {data}")
        print("-> Klopt je token wel? Kopieer 'm exact van @BotFather.")
        return

    # Zoek de chat-id in de laatste berichten.
    chat_id = None
    for update in reversed(data.get("result", [])):
        msg = update.get("message") or update.get("edited_message") or {}
        chat = msg.get("chat") or {}
        if chat.get("id"):
            chat_id = chat["id"]
            break

    if not chat_id:
        print("Nog geen bericht van jou gevonden.")
        print("-> Stuur je bot eerst een berichtje in Telegram (zoek je bot op,")
        print("   druk op Start, typ 'hoi'), en draai dit script daarna opnieuw.")
        return

    _set_env_value("TELEGRAM_CHAT_ID", str(chat_id))
    print(f"✅ Chat-id gevonden ({chat_id}) en opgeslagen in .env.\n")

    # Testbericht sturen (config in geheugen even bijwerken).
    config.TELEGRAM_TOKEN = token
    config.TELEGRAM_CHAT_ID = str(chat_id)
    import notify
    print("Testbericht versturen...")
    if notify.send("✅ Je trading bot is gekoppeld aan Telegram! Je krijgt nu een "
                   "seintje zodra de bot koopt of verkoopt."):
        print("Verstuurd! Check je Telegram-app. 🎉")
        print("\nLaatste stap: herstart de live bot zodat hij Telegram gaat gebruiken:")
        print("  ./bot.sh restart")
    else:
        print("Versturen mislukte — controleer je token en probeer opnieuw.")


if __name__ == "__main__":
    main()
