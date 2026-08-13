import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.scheduler import start_scheduler
from app.routers import auth_router, market, analyse, testing, history

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Snowy_Tracks API", version="0.1.0")

# Alleen nodig als je frontend op een ander adres/poort draait (bv. Next.js op :3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(market.router)
app.include_router(analyse.router)
app.include_router(testing.router)
app.include_router(history.router)


@app.on_event("startup")
async def on_startup():
    start_scheduler()


@app.get("/")
def root():
    return {"app": "Snowy_Tracks API", "status": "running"}
