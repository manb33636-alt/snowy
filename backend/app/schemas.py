from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    password: str


class TradeRequest(BaseModel):
    symbol: str
    qty: float
    side: str  # "buy" | "sell"


class DepositRequest(BaseModel):
    amount: float


class QuoteOut(BaseModel):
    symbol: str
    price: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    volume: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    previous_close: Optional[float] = None
    percent_change: Optional[float] = None
    is_market_open: Optional[bool] = None
    last_updated: Optional[str] = None
    status: str = "ok"          # "ok" | "unavailable"
    message: Optional[str] = None


class IndicatorsOut(BaseModel):
    symbol: str
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    ema: Optional[float] = None
    sma: Optional[float] = None
    bbands_upper: Optional[float] = None
    bbands_lower: Optional[float] = None
    atr: Optional[float] = None
    status: str = "ok"
    message: Optional[str] = None


class AdviceOut(BaseModel):
    symbol: str
    advice: Optional[str] = None      # "MOGELIJK KOPEN" | "HOUDEN" | "MOGELIJK VERKOPEN"
    confidence: Optional[float] = None
    risk: Optional[str] = None
    reasons: List[str] = []
    quote: Optional[QuoteOut] = None
    indicators: Optional[IndicatorsOut] = None
    status: str = "ok"
    message: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    type: str
    symbol: str
    qty: float
    price: float
    realized_pnl: Optional[float] = None
    realized_pnl_pct: Optional[float] = None
    reason: Optional[str] = None
    confidence: Optional[float] = None
    risk: Optional[str] = None
    origin: str
    timestamp: datetime

    class Config:
        from_attributes = True


class PositionOut(BaseModel):
    symbol: str
    qty: float
    avg_price: float
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_pct: Optional[float] = None


class PortfolioOut(BaseModel):
    cash: float
    starting_capital: float
    holdings_value: float
    total_value: float
    pnl: float
    pnl_pct: float
    ai_active: bool
    positions: List[PositionOut]
