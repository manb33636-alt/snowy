from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import PortfolioState, Position, Transaction
from app.cache import get_symbol_data


class TradeError(Exception):
    pass


def get_or_create_portfolio(db: Session) -> PortfolioState:
    state = db.query(PortfolioState).filter(PortfolioState.id == 1).first()
    if not state:
        state = PortfolioState(id=1, cash=10000.0, starting_capital=10000.0, ai_active=True)
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def deposit(db: Session, amount: float):
    if amount <= 0:
        raise TradeError("Stortbedrag moet positief zijn.")
    state = get_or_create_portfolio(db)
    state.cash += amount
    state.starting_capital += amount  # stortingen tellen niet mee als "winst"
    db.add(Transaction(type="deposit", symbol="—", qty=1, price=amount, origin="manual"))
    db.commit()
    return state


def execute_trade(db: Session, symbol: str, qty: float, side: str, price: float,
                   reason: str = None, confidence: float = None, risk: str = None,
                   origin: str = "manual") -> Transaction:
    if price is None:
        raise TradeError("Geen live prijs beschikbaar voor dit symbool — transactie geweigerd.")
    if qty <= 0:
        raise TradeError("Aantal moet groter dan 0 zijn.")

    state = get_or_create_portfolio(db)
    position = db.query(Position).filter(Position.symbol == symbol).first()

    if side == "buy":
        cost = qty * price
        if cost > state.cash:
            raise TradeError("Onvoldoende nep geld voor deze aankoop.")
        state.cash -= cost
        if position:
            new_qty = position.qty + qty
            position.avg_price = (position.avg_price * position.qty + cost) / new_qty
            position.qty = new_qty
        else:
            position = Position(symbol=symbol, qty=qty, avg_price=price)
            db.add(position)

        tx = Transaction(
            type="buy", symbol=symbol, qty=qty, price=price,
            reason=reason, confidence=confidence, risk=risk, origin=origin,
        )

    elif side == "sell":
        if not position or position.qty < qty:
            raise TradeError("Onvoldoende positie om te verkopen.")
        proceeds = qty * price
        realized_pnl = (price - position.avg_price) * qty
        realized_pnl_pct = ((price - position.avg_price) / position.avg_price) * 100 if position.avg_price else 0

        state.cash += proceeds
        position.qty -= qty
        if position.qty <= 0.0000001:
            db.delete(position)

        tx = Transaction(
            type="sell", symbol=symbol, qty=qty, price=price,
            realized_pnl=realized_pnl, realized_pnl_pct=realized_pnl_pct,
            reason=reason, confidence=confidence, risk=risk, origin=origin,
        )
    else:
        raise TradeError("Onbekend type transactie.")

    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def build_portfolio_summary(db: Session) -> dict:
    state = get_or_create_portfolio(db)
    positions = db.query(Position).all()

    holdings_value = 0.0
    position_rows = []
    for p in positions:
        cached = get_symbol_data(p.symbol)
        current_price = None
        if cached and cached["quote"].get("status") == "ok":
            current_price = cached["quote"].get("price")
        value = (current_price or p.avg_price) * p.qty
        holdings_value += value
        unrealized = ((current_price or p.avg_price) - p.avg_price) * p.qty
        unrealized_pct = (((current_price or p.avg_price) - p.avg_price) / p.avg_price * 100) if p.avg_price else 0
        position_rows.append({
            "symbol": p.symbol, "qty": p.qty, "avg_price": p.avg_price,
            "current_price": current_price,
            "unrealized_pnl": unrealized, "unrealized_pnl_pct": unrealized_pct,
        })

    total_value = state.cash + holdings_value
    pnl = total_value - state.starting_capital
    pnl_pct = (pnl / state.starting_capital * 100) if state.starting_capital else 0

    return {
        "cash": state.cash,
        "starting_capital": state.starting_capital,
        "holdings_value": holdings_value,
        "total_value": total_value,
        "pnl": pnl,
        "pnl_pct": pnl_pct,
        "ai_active": state.ai_active,
        "positions": position_rows,
    }


def set_ai_active(db: Session, active: bool):
    state = get_or_create_portfolio(db)
    state.ai_active = active
    db.commit()
    return state


# ---------- Autonome AI-handel (aangeroepen door de scheduler na elke live-update) ----------

async def maybe_autotrade(symbol: str, quote: dict, advice: dict):
    db = SessionLocal()
    try:
        state = get_or_create_portfolio(db)
        if not state.ai_active:
            return
        if quote.get("status") != "ok" or advice.get("status") != "ok":
            return  # nooit handelen op onvolledige/verzonnen data

        price = quote.get("price")
        position = db.query(Position).filter(Position.symbol == symbol).first()
        reason = "; ".join(advice.get("reasons", []))

        if advice["advice"] == "MOGELIJK KOPEN" and not position:
            budget = state.cash * 0.12  # AI risicospreiding: max ~12% vrij geld per nieuwe positie
            qty = int(budget // price) if price else 0
            if qty >= 1:
                execute_trade(db, symbol, qty, "buy", price,
                              reason=reason, confidence=advice.get("confidence"),
                              risk=advice.get("risk"), origin="ai")

        elif advice["advice"] == "MOGELIJK VERKOPEN" and position:
            execute_trade(db, symbol, position.qty, "sell", price,
                          reason=reason, confidence=advice.get("confidence"),
                          risk=advice.get("risk"), origin="ai")
    except TradeError:
        pass  # bv. onvoldoende cash — AI slaat deze kans dan simpelweg over
    finally:
        db.close()
