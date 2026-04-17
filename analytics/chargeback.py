"""Chargeback pattern analysis — heatmap data + root-cause aggregates.

TPR is a planned promo credit, not a penalty — always filtered out (CLAUDE.md locked rule).
"""
from __future__ import annotations

import pandas as pd

from data.constants import CauseCode


def _no_tpr(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["cause_code"] != CauseCode.TPR]


def chargeback_summary(chargebacks_df: pd.DataFrame) -> pd.DataFrame:
    """Group by cause_code × channel × dc, excluding TPR. Returns total_amount and count."""
    df = _no_tpr(chargebacks_df)
    summary = (
        df.groupby(["cause_code", "channel", "dc"], as_index=False)
        .agg(total_amount=("amount", "sum"), count=("amount", "size"))
    )
    return summary.sort_values("total_amount", ascending=False).reset_index(drop=True)


def top_causes(df: pd.DataFrame, n: int = 5) -> pd.DataFrame:
    """Top n cause codes by total amount. Columns: cause_code, total_amount, count, pct_of_total."""
    df = _no_tpr(df)
    agg = (
        df.groupby("cause_code", as_index=False)
        .agg(total_amount=("amount", "sum"), count=("amount", "size"))
        .sort_values("total_amount", ascending=False)
        .head(n)
        .reset_index(drop=True)
    )
    total = agg["total_amount"].sum()
    agg["pct_of_total"] = (agg["total_amount"] / total * 100).round(1) if total > 0 else 0.0
    return agg


def top_customers(df: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """Top n customers by total chargeback amount. Columns: customer_id, total_amount, count."""
    df = _no_tpr(df)
    return (
        df.groupby("customer_id", as_index=False)
        .agg(total_amount=("amount", "sum"), count=("amount", "size"))
        .sort_values("total_amount", ascending=False)
        .head(n)
        .reset_index(drop=True)
    )


def top_channels(df: pd.DataFrame, n: int = 5) -> pd.DataFrame:
    """Top n channels by total chargeback amount. Columns: channel, total_amount."""
    df = _no_tpr(df)
    return (
        df.groupby("channel", as_index=False)
        .agg(total_amount=("amount", "sum"))
        .sort_values("total_amount", ascending=False)
        .head(n)
        .reset_index(drop=True)
    )


def by_dc(df: pd.DataFrame) -> pd.DataFrame:
    """Total chargeback amount per DC. Columns: dc, total_amount."""
    df = _no_tpr(df)
    return (
        df.groupby("dc", as_index=False)
        .agg(total_amount=("amount", "sum"))
        .sort_values("total_amount", ascending=False)
        .reset_index(drop=True)
    )


def monthly_trend(df: pd.DataFrame) -> pd.DataFrame:
    """Monthly chargeback totals. Columns: month (YYYY-MM), total_amount."""
    df = _no_tpr(df).copy()
    df["month"] = pd.to_datetime(df["date"]).dt.to_period("M").astype(str)
    return (
        df.groupby("month", as_index=False)
        .agg(total_amount=("amount", "sum"))
        .sort_values("month")
        .reset_index(drop=True)
    )


def penalty_rate(df: pd.DataFrame, customer_id: str, channel: str, dc: str) -> float:
    """Mean chargeback $ per event for (customer, channel, dc).

    Fallback when fewer than 3 samples: (customer+channel+dc) → channel+dc → dc → global.
    Returns 0.0 if the full DataFrame has no rows after TPR filter.
    """
    df = _no_tpr(df)
    filters = [
        (df["customer_id"] == customer_id) & (df["channel"] == channel) & (df["dc"] == dc),
        (df["channel"] == channel) & (df["dc"] == dc),
        df["dc"] == dc,
        pd.Series(True, index=df.index),
    ]
    for mask in filters:
        subset = df[mask]
        if len(subset) >= 3:
            return float(subset["amount"].mean())
    return 0.0
