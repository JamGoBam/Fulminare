"""Demand rate forecast — trailing-30-day average, per SKU per DC. No ML (locked)."""
from __future__ import annotations

import pandas as pd


def demand_rate(sales_df: pd.DataFrame, sku: str, dc: str, window_days: int = 30) -> float:
    """Return average units/day for a SKU+DC over the trailing window. Returns 0.0 if no sales."""
    if sales_df.empty:
        return 0.0
    cutoff = sales_df["date"].max() - pd.Timedelta(days=window_days)
    mask = (
        (sales_df["sku"] == sku)
        & (sales_df["ship_from_dc"] == dc)
        & (sales_df["date"] > cutoff)
    )
    total_qty = sales_df.loc[mask, "qty"].sum()
    return float(total_qty) / window_days
