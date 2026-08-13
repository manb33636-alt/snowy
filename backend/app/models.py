from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from app.database import Base


class PortfolioState(Base):
    """Eén rij: de virtuele portefeuille voor Testing Mode (persoonlijk gebruik, geen multi-user)."""
    __tablename__ = "portfolio_state"

    id = Column(Integer, primary_key=True, default=1)
    cash = Column(Float, default=10000.0)
    starting_capital = Column(Float, default=10000.0)
    ai_active = Column(Boolean, default=True)


class Position(Base):
    """Open posities in Testing Mode. Verdwijnt zodra volledig verkocht."""
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, unique=True, index=True)
    qty = Column(Float)
    avg_price = Column(Float)
    opened_at = Column(DateTime, default=datetime.utcnow)


class Transaction(Base):
    """Volledige, onveranderlijke transactiegeschiedenis — koop én verkoop apart gelogd."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String)          # "buy" | "sell" | "deposit"
    symbol = Column(String)
    qty = Column(Float)
    price = Column(Float)          # koop- of verkoopprijs op moment van transactie
    realized_pnl = Column(Float, nullable=True)      # alleen ingevuld bij "sell"
    realized_pnl_pct = Column(Float, nullable=True)  # alleen ingevuld bij "sell"
    reason = Column(String, nullable=True)           # AI-redenering
    confidence = Column(Float, nullable=True)        # AI-betrouwbaarheidsscore
    risk = Column(String, nullable=True)
    origin = Column(String, default="manual")        # "ai" | "manual"
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class LoginAttempt(Base):
    """Log van elke inlogpoging — voor de beveiligingseisen (verdachte pogingen tonen)."""
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    success = Column(Boolean)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    ip_address = Column(String, nullable=True)
