from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth_router import require_session
from app.schemas import TradeRequest, DepositRequest, PortfolioOut
from app.cache import get_symbol_data
from app import testing_engine

router = APIRouter(prefix="/testing", tags=["testing"], dependencies=[Depends(require_session)])


@router.get("/portfolio", response_model=PortfolioOut)
def portfolio(db: Session = Depends(get_db)):
    return testing_engine.build_portfolio_summary(db)


@router.post("/deposit")
def deposit(payload: DepositRequest, db: Session = Depends(get_db)):
    try:
        testing_engine.deposit(db, payload.amount)
    except testing_engine.TradeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return testing_engine.build_portfolio_summary(db)


@router.post("/trade")
def trade(payload: TradeRequest, db: Session = Depends(get_db)):
    cached = get_symbol_data(payload.symbol)
    if not cached or cached["quote"].get("status") != "ok":
        raise HTTPException(
            status_code=503,
            detail="Live prijs voor dit symbool is momenteel niet beschikbaar. Transactie geweigerd — "
                   "we handelen nooit op verzonnen data.",
        )
    price = cached["quote"]["price"]
    try:
        tx = testing_engine.execute_trade(
            db, payload.symbol, payload.qty, payload.side, price, origin="manual"
        )
    except testing_engine.TradeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "ok", "transaction_id": tx.id, "price_used": price}


@router.post("/ai/toggle")
def toggle_ai(active: bool, db: Session = Depends(get_db)):
    state = testing_engine.set_ai_active(db, active)
    return {"ai_active": state.ai_active}
