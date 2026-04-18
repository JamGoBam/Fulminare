"""Chargeback pattern analysis — heatmap data + root-cause aggregates.

TPR is a planned promo credit, not a penalty — always filtered out (CLAUDE.md locked rule).
"""
from __future__ import annotations

import pandas as pd

from data.constants import CauseCode


def chargeback_summary(chargebacks_df: pd.DataFrame) -> pd.DataFrame:
    """Group by cause_code × channel × dc, excluding TPR. Returns total_amount and count."""
    df = chargebacks_df[chargebacks_df["cause_code"] != CauseCode.TPR].copy()
    summary = (
        df.groupby(["cause_code", "channel", "dc"], as_index=False)
        .agg(total_amount=("amount", "sum"), count=("amount", "size"))
    )
    return summary.sort_values("total_amount", ascending=False).reset_index(drop=True)
