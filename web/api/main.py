"""FastAPI app root. Entry: `uvicorn web.api.main:app --reload --port 8000`."""
from __future__ import annotations

from fastapi import FastAPI

app = FastAPI(title="POP Inventory & Fulfillment", version="0.1.0")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


# TODO(CLAUDE.md Blocks 5 & 7): mount routers once endpoints land.
# from web.api.routes import inventory, chargebacks, recommendations
# app.include_router(inventory.router, prefix="/api")
# app.include_router(chargebacks.router, prefix="/api")
# app.include_router(recommendations.router, prefix="/api")
