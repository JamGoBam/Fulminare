"""Chargeback endpoints: summary heatmap + aggregated breakdowns."""
from __future__ import annotations

from pathlib import Path

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


class CauseSummary(BaseModel):
    cause_code: str
    total_amount: float
    count: int
    pct_of_total: float


class CustomerSummary(BaseModel):
    customer_id: str
    total_amount: float
    count: int


class ChannelSummary(BaseModel):
    channel: str
    total_amount: float


class DcSummary(BaseModel):
    dc: str
    total_amount: float


class MonthTrend(BaseModel):
    month: str
    total_amount: float


@router.get("/chargebacks/summary")
def get_chargeback_summary() -> list[dict]:
    from analytics.chargeback import chargeback_summary
    df = _parquet("chargebacks.parquet")
    return chargeback_summary(df).to_dict(orient="records")


@router.get("/chargebacks/top-causes", response_model=list[CauseSummary])
def get_top_causes(n: int = Query(default=5, ge=1, le=20)) -> list[dict]:
    df = _parquet("cb_top_causes.parquet")
    return df.head(n).to_dict(orient="records")


@router.get("/chargebacks/top-customers", response_model=list[CustomerSummary])
def get_top_customers(n: int = Query(default=10, ge=1, le=50)) -> list[dict]:
    df = _parquet("cb_top_customers.parquet")
    return df.head(n).to_dict(orient="records")


@router.get("/chargebacks/by-channel", response_model=list[ChannelSummary])
def get_by_channel() -> list[dict]:
    df = _parquet("cb_top_channels.parquet")
    return df.to_dict(orient="records")


@router.get("/chargebacks/trend", response_model=list[MonthTrend])
def get_trend() -> list[dict]:
    df = _parquet("cb_monthly_trend.parquet")
    return df.to_dict(orient="records")
