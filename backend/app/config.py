"""
Snowy_Tracks — configuratie
Alle gevoelige waarden komen uit een lokaal .env bestand (nooit in code of git).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Marktdata provider ---
    TWELVEDATA_API_KEY: str = ""
    # Optioneel: alleen nodig als je later nieuws/sentiment via Alpha Vantage toevoegt
    ALPHAVANTAGE_API_KEY: str = ""

    # --- Database ---
    # Standaard SQLite (0-config, werkt meteen). Voor PostgreSQL later:
    # DATABASE_URL=postgresql+psycopg2://gebruiker:wachtwoord@localhost:5432/snowy_tracks
    DATABASE_URL: str = "sqlite:///./snowy_tracks.db"

    # --- App wachtwoord (login) ---
    # Sla hier NOOIT het platte wachtwoord op — dit is de bcrypt-hash ervan.
    # Genereer een hash met: python -m app.tools.hash_password
    APP_PASSWORD_HASH: str = ""

    # --- Sessies ---
    SESSION_SECRET: str = "verander-dit-in-een-lange-willekeurige-string"
    SESSION_TTL_MINUTES: int = 30

    # --- Watchlist die de achtergrond-scheduler live ververst ---
    WATCHLIST: str = "NVDA,AAPL,TSLA,ASML,MSFT,BTC/USD"

    # --- Rate limiting richting Twelve Data (gratis tier: beperkt aantal credits/min) ---
    REFRESH_INTERVAL_SECONDS: int = 60


settings = Settings()
