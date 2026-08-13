"""
Eenmalige instelhulp voor de Snowy_Tracks-backend.

Maakt het .env-bestand aan en vult in:
  • APP_PASSWORD_HASH  — de bcrypt-hash van je inlogwachtwoord
  • SESSION_SECRET     — een lange willekeurige sleutel voor je sessies
  • TWELVEDATA_API_KEY — je (gratis) marktdata-sleutel, optioneel

Je platte wachtwoord wordt nergens opgeslagen: alleen de hash gaat het bestand in.
Opnieuw draaien mag altijd; je mag dan per vraag op Enter drukken om te houden
wat er al staat.

Gebruik:  python eerste-keer-instellen.py
"""
import getpass
import re
import secrets
import sys
from pathlib import Path

import bcrypt

HIER = Path(__file__).parent
ENV = HIER / ".env"
VOORBEELD = HIER / ".env.example"


def lees_waarde(tekst: str, sleutel: str) -> str:
    gevonden = re.search(rf"^{sleutel}=(.*)$", tekst, flags=re.M)
    return gevonden.group(1).strip() if gevonden else ""


def zet_waarde(tekst: str, sleutel: str, waarde: str) -> str:
    regel = f"{sleutel}={waarde}"
    if re.search(rf"^{sleutel}=.*$", tekst, flags=re.M):
        return re.sub(rf"^{sleutel}=.*$", regel, tekst, flags=re.M)
    return tekst.rstrip("\n") + f"\n{regel}\n"


def main() -> int:
    if not ENV.exists():
        if not VOORBEELD.exists():
            print("Kan .env.example niet vinden. Staat dit bestand wel in de map backend?")
            return 1
        ENV.write_text(VOORBEELD.read_text(encoding="utf-8"), encoding="utf-8")
        print("Nieuw .env-bestand aangemaakt.\n")

    tekst = ENV.read_text(encoding="utf-8")

    print("=" * 60)
    print("  Snowy_Tracks backend instellen")
    print("=" * 60)
    print()

    # 1. Wachtwoord
    huidige_hash = lees_waarde(tekst, "APP_PASSWORD_HASH")
    if huidige_hash:
        print("Er staat al een wachtwoord ingesteld.")
        antwoord = input("Wil je een nieuw wachtwoord kiezen? (j/N): ").strip().lower()
        wijzigen = antwoord in ("j", "ja", "y", "yes")
    else:
        print("Kies het wachtwoord waarmee je straks inlogt.")
        wijzigen = True

    while wijzigen:
        pw1 = getpass.getpass("Wachtwoord (je typt onzichtbaar): ")
        if not pw1:
            print("  Leeg wachtwoord kan niet. Probeer opnieuw.")
            continue
        pw2 = getpass.getpass("Herhaal wachtwoord: ")
        if pw1 != pw2:
            print("  De twee wachtwoorden zijn niet gelijk. Probeer opnieuw.")
            continue
        hash_waarde = bcrypt.hashpw(pw1.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")
        tekst = zet_waarde(tekst, "APP_PASSWORD_HASH", hash_waarde)
        print("  Wachtwoord opgeslagen (alleen de versleutelde vorm).")
        break

    # 2. Sessiesleutel
    print()
    huidig_secret = lees_waarde(tekst, "SESSION_SECRET")
    if not huidig_secret or huidig_secret.startswith("verander-dit"):
        tekst = zet_waarde(tekst, "SESSION_SECRET", secrets.token_hex(32))
        print("Sessiesleutel aangemaakt.")
    else:
        print("Sessiesleutel stond al goed.")

    # 3. Marktdata-sleutel
    print()
    huidige_key = lees_waarde(tekst, "TWELVEDATA_API_KEY")
    if huidige_key:
        print(f"Twelve Data-sleutel staat al ingevuld ({huidige_key[:4]}...).")
        nieuwe = input("Nieuwe sleutel invullen? Enter = houden zoals het is: ").strip()
    else:
        print("Voor aandelen- en ETF-koersen heb je een gratis sleutel nodig van")
        print("https://twelvedata.com — account maken, sleutel kopieren, hier plakken.")
        print("Nog geen sleutel? Druk gewoon op Enter; je kunt dit later doen.")
        nieuwe = input("Twelve Data-sleutel: ").strip()
    if nieuwe:
        tekst = zet_waarde(tekst, "TWELVEDATA_API_KEY", nieuwe)
        print("  Sleutel opgeslagen.")

    ENV.write_text(tekst, encoding="utf-8")

    print()
    print("=" * 60)
    print("  Klaar. Alles staat in het bestand .env")
    print("  Deel dat bestand nooit met iemand.")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
