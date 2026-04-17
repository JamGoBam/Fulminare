"""Inventory endpoints: GET /api/inventory/imbalance."""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

from analytics.imbalance import compute_imbalance_table, get_top_imbalanced

router = APIRouter()

_PROCESSED = Path("data/processed")


def _load() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    try:
        inventory = pd.read_parquet(_PROCESSED / "inventory.parquet")
        sales = pd.read_parquet(_PROCESSED / "sales.parquet")
        skus = pd.read_parquet(_PROCESSED / "skus.parquet")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"Data not ready: {exc}") from exc
    sales["date"] = pd.to_datetime(sales["date"])
    return inventory, sales, skus


@router.get("/inventory/imbalance")
def get_imbalance(top: int = 20) -> list[dict]:
    inventory, sales, skus = _load()
    table = compute_imbalance_table(inventory, sales, skus)
    result = get_top_imbalanced(table, n=top)
    return result.to_dict(orient="records")
