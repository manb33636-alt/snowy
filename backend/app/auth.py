from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc
import bcrypt
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from app.config import settings
from app.models import LoginAttempt

serializer = URLSafeTimedSerializer(settings.SESSION_SECRET)

LOCK_MINUTES = [15, 30, 45, 60]  # escaleert, gemaximeerd op 60


def password_bytes(plain: str) -> bytes:
    """
    bcrypt kijkt alleen naar de eerste 72 bytes van een wachtwoord en geeft een
    fout bij meer. Afkappen op precies dat punt, zodat een lang wachtwoord geen
    crash oplevert.
    """
    return plain.encode("utf-8")[:72]


def verify_password(plain: str) -> bool:
    if not settings.APP_PASSWORD_HASH:
        raise RuntimeError(
            "APP_PASSWORD_HASH is niet ingesteld in .env. "
            "Genereer er een met: python -m app.tools.hash_password"
        )
    try:
        return bcrypt.checkpw(password_bytes(plain), settings.APP_PASSWORD_HASH.encode("utf-8"))
    except ValueError as exc:
        raise RuntimeError(
            "APP_PASSWORD_HASH in .env is geen geldige bcrypt-hash. "
            "Maak een nieuwe met: python -m app.tools.hash_password"
        ) from exc


def record_attempt(db: Session, success: bool, ip_address: str = None):
    db.add(LoginAttempt(success=success, ip_address=ip_address))
    db.commit()


def get_lockout_status(db: Session) -> dict:
    """
    Kijkt naar de meest recente inlogpogingen sinds de laatste succesvolle login
    (of sinds het begin) en bepaalt of er nu een blokkade actief is, en hoe lang.
    """
    recent = (
        db.query(LoginAttempt)
        .order_by(desc(LoginAttempt.timestamp))
        .limit(50)
        .all()
    )

    consecutive_fails = 0
    lockout_cycles = 0
    for attempt in recent:
        if attempt.success:
            break
        consecutive_fails += 1

    if consecutive_fails == 0:
        return {"locked": False, "attempts_this_cycle": 0}

    # Elke keer dat er een blok van 3 fouten voorbij is, telt als een "lockout cycle"
    lockout_cycles = (consecutive_fails - 1) // 3
    attempts_this_cycle = (consecutive_fails - 1) % 3 + 1

    if attempts_this_cycle < 3:
        return {"locked": False, "attempts_this_cycle": attempts_this_cycle}

    # 3de fout in deze cyclus: blokkade actief. Bepaal sinds wanneer en hoelang.
    third_fail_time = recent[0].timestamp  # meest recente = de fout die de blokkade triggerde
    lock_minutes = LOCK_MINUTES[min(lockout_cycles, len(LOCK_MINUTES) - 1)]
    unlock_time = third_fail_time + timedelta(minutes=lock_minutes)
    now = datetime.utcnow()

    if now < unlock_time:
        return {
            "locked": True,
            "lock_minutes": lock_minutes,
            "seconds_remaining": int((unlock_time - now).total_seconds()),
        }
    return {"locked": False, "attempts_this_cycle": 0}


def create_session_token() -> str:
    return serializer.dumps({"authenticated": True})


def verify_session_token(token: str) -> bool:
    try:
        data = serializer.loads(token, max_age=settings.SESSION_TTL_MINUTES * 60)
        return bool(data.get("authenticated"))
    except (BadSignature, SignatureExpired):
        return False
