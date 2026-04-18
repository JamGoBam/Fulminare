"""Recommendation endpoints: transfers and ranked alerts."""
from __future__ import annotations

import math
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

_PROCESSED = Path("data/processed")


def _parquet(name: str) -> pd.DataFrame:
    try:
        return pd.read_parquet(_PROCESSED / name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"Data not ready: {exc}") from exc


def _nullify(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame to records, replacing NaN/NaT/inf with None for JSON safety."""
    records = df.to_dict(orient="records")
    return [
        {k: (None if (isinstance(v, float) and (math.isnan(v) or math.isinf(v))) else v)
         for k, v in row.items()}
        for row in records
    ]


class TransferOut(BaseModel):
    sku: str
    product_name: str
    dest_dc: str
    action: str
    origin_dc: Optional[str] = None
    qty: Optional[int] = None
    transfer_cost: Optional[float] = None
    inbound_po_id: Optional[str] = None
    inbound_eta: Optional[str] = None
    inbound_qty: Optional[int] = None
    days_to_stockout: Optional[float] = None
    penalty_avoided: float
    net_saving: float
    reason: str


class AlertOut(BaseModel):
    rank: int
    sku: str
    dc: str
    priority_score: float
    action: Optional[str] = None
    reason: str
    days_to_stockout: Optional[float] = None
    exposure_dollars: float


@router.get("/recommendations/transfers", response_model=list[TransferOut])
def get_transfer_recommendations() -> list[dict]:
    df = _parquet("transfers_computed.parquet")
    return _nullify(df)


@router.get("/recommendations/alerts", response_model=list[AlertOut])
def get_alerts(limit: int = Query(default=10, ge=1, le=100)) -> list[dict]:
    df = _parquet("alerts.parquet")
    return _nullify(df.head(limit))
