"""FastAPI app root. Entry: `uvicorn web.api.main:app --reload --port 8000`."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from web.api.routes import inventory, chargebacks, recommendations, chat

_SEED = Path("data/seed")
_PROCESSED = Path("data/processed")
_DB = _PROCESSED / "pop.duckdb"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not (_PROCESSED / "inventory.parquet").exists():
        from data.ingest import run as ingest_run
        print("Parquets not found — running ingest from seed data...")
        ingest_run(_SEED, _PROCESSED, _DB)
        print("Ingest complete.")
    if not (_PROCESSED / "alerts.parquet").exists():
        from analytics.pipeline import run as pipeline_run
        print("Derived tables not found — running analytics pipeline...")
        pipeline_run(_PROCESSED)
        print("Pipeline complete.")
    yield


app = FastAPI(title="POP Inventory & Fulfillment", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router, prefix="/api")
app.include_router(chargebacks.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
