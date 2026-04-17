"""Chargeback endpoints: GET /api/chargebacks/summary."""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

from analytics.chargeback import chargeback_summary

router = APIRouter()

_PROCESSED = Path("data/processed")


@router.get("/chargebacks/summary")
def get_chargeback_summary() -> list[dict]:
    try:
        chargebacks = pd.read_parquet(_PROCESSED / "chargebacks.parquet")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"Data not ready: {exc}") from exc
    return chargeback_summary(chargebacks).to_dict(orient="records")
