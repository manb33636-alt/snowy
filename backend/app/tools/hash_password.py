"""
Genereer een bcrypt-hash van je Snowy_Tracks-wachtwoord.

Gebruik:
    python -m app.tools.hash_password

Plak de output achter APP_PASSWORD_HASH= in je .env bestand.
Het platte wachtwoord wordt nergens opgeslagen, ook niet in deze terminal-history
als je oplet: gebruik getpass zodat het niet op het scherm verschijnt.
"""
import getpass
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

if __name__ == "__main__":
    pw1 = getpass.getpass("Nieuw Snowy_Tracks wachtwoord: ")
    pw2 = getpass.getpass("Herhaal wachtwoord: ")
    if pw1 != pw2:
        print("Wachtwoorden komen niet overeen. Probeer opnieuw.")
    else:
        print("\nZet deze regel in je .env bestand:\n")
        print(f"APP_PASSWORD_HASH={pwd_context.hash(pw1)}")
