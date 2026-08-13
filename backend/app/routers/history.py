from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import Literal
from app.database import get_db
from app.routers.auth_router import require_session
from app.models import Transaction
from app.schemas import TransactionOut

router = APIRouter(prefix="/history", tags=["history"], dependencies=[Depends(require_session)])


@router.get("", response_model=list[TransactionOut])
def get_history(
    filter: Literal["all", "buy", "sell", "today", "week", "month"] = Query("all"),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction).filter(Transaction.type.in_(["buy", "sell"]))

    if filter == "buy":
        query = query.filter(Transaction.type == "buy")
    elif filter == "sell":
        query = query.filter(Transaction.type == "sell")
    elif filter == "today":
        since = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Transaction.timestamp >= since)
    elif filter == "week":
        since = datetime.utcnow() - timedelta(days=7)
        query = query.filter(Transaction.timestamp >= since)
    elif filter == "month":
        since = datetime.utcnow() - timedelta(days=30)
        query = query.filter(Transaction.timestamp >= since)

    return query.order_by(desc(Transaction.timestamp)).limit(500).all()
