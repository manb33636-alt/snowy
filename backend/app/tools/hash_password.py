"""
Genereer een bcrypt-hash van je Snowy_Tracks-wachtwoord.

Gebruik:
    python -m app.tools.hash_password

Plak de output achter APP_PASSWORD_HASH= in je .env bestand.
Het platte wachtwoord wordt nergens opgeslagen: getpass zorgt dat het niet op
het scherm verschijnt en dus ook niet in je terminal-geschiedenis blijft staan.
"""
import getpass
import bcrypt

from app.auth import password_bytes

if __name__ == "__main__":
    pw1 = getpass.getpass("Nieuw Snowy_Tracks wachtwoord: ")
    pw2 = getpass.getpass("Herhaal wachtwoord: ")
    if pw1 != pw2:
        print("Wachtwoorden komen niet overeen. Probeer opnieuw.")
    elif not pw1:
        print("Leeg wachtwoord kan niet. Probeer opnieuw.")
    else:
        hashed = bcrypt.hashpw(password_bytes(pw1), bcrypt.gensalt()).decode("utf-8")
        print("\nZet deze regel in je .env bestand:\n")
        print(f"APP_PASSWORD_HASH={hashed}")
