from fastapi import APIRouter, Depends, Request, Response, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import LoginRequest
from app import auth

router = APIRouter(prefix="/auth", tags=["auth"])
SESSION_COOKIE = "snowy_session"


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    status = auth.get_lockout_status(db)
    if status["locked"]:
        raise HTTPException(
            status_code=429,
            detail=f"Probeer over {status['lock_minutes']} minuten opnieuw.",
            headers={"Retry-After": str(status["seconds_remaining"])},
        )

    ok = auth.verify_password(payload.password)
    auth.record_attempt(db, success=ok, ip_address=request.client.host if request.client else None)

    if not ok:
        new_status = auth.get_lockout_status(db)
        if new_status["locked"]:
            raise HTTPException(status_code=429, detail=f"Probeer over {new_status['lock_minutes']} minuten opnieuw.")
        attempts = new_status.get("attempts_this_cycle", 0)
        if attempts == 1:
            raise HTTPException(status_code=401, detail="Onjuist wachtwoord. Probeer opnieuw.")
        else:
            raise HTTPException(status_code=401, detail="Onjuist wachtwoord. Nog 1 fout tot 15 minuten wachten.")

    token = auth.create_session_token()
    response.set_cookie(
        key=SESSION_COOKIE, value=token, httponly=True, samesite="lax",
        max_age=1800,  # moet matchen met SESSION_TTL_MINUTES in .env
    )
    return {"status": "ok"}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"status": "ok"}


@router.get("/session")
def check_session(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    if token and auth.verify_session_token(token):
        return {"authenticated": True}
    return {"authenticated": False}


def require_session(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    if not token or not auth.verify_session_token(token):
        raise HTTPException(status_code=401, detail="Sessie verlopen. Log opnieuw in.")
    return True
