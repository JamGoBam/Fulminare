"""Recommendation endpoints: GET /api/recommendations/transfers."""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

from analytics.transfer import transfer_recommendations

router = APIRouter()

_PROCESSED = Path("data/processed")


@router.get("/recommendations/transfers")
def get_transfer_recommendations() -> list[dict]:
    try:
        inventory = pd.read_parquet(_PROCESSED / "inventory.parquet")
        sales = pd.read_parquet(_PROCESSED / "sales.parquet")
        skus = pd.read_parquet(_PROCESSED / "skus.parquet")
        freight = pd.read_parquet(_PROCESSED / "freight.parquet")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"Data not ready: {exc}") from exc
    sales["date"] = pd.to_datetime(sales["date"])
    return transfer_recommendations(inventory, sales, skus, freight).to_dict(orient="records")
