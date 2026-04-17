"""Ranked alert queue for the ops-manager dashboard.

Priority = normalize(imbalance_score) + normalize(annual_exposure) + normalize(urgency).
WAIT-with-inbound-relief is demoted (score × 0.5) — the gap is already covered.
"""
from __future__ import annotations

import pandas as pd

_OUT_COLS = [
    "rank", "sku", "dc", "priority_score", "action",
    "reason", "days_to_stockout", "exposure_dollars",
]


def _safe_norm(s: pd.Series) -> pd.Series:
    mx = float(s.max())
    return s / mx if mx > 0 else pd.Series(0.0, index=s.index)


def _make_reason(row: pd.Series) -> str:
    action = row.get("action")
    if not isinstance(action, str):
        dos = row.get("days_to_stockout", 9999)
        dos_str = f" ({dos:.0f}-day supply left)" if dos < 9999 else ""
        return f"Stock below safety level{dos_str}. Review replenishment options."

    if action == "TRANSFER":
        origin = row.get("origin_dc") or "another DC"
        qty = row.get("qty")
        net = row.get("net_saving") or 0
        qty_str = f" ({int(qty)} units)" if pd.notna(qty) else ""
        return (
            f"Transfer stock from {origin}{qty_str}. "
            f"Avoids ~${net:,.0f} in chargeback exposure."
        )

    # action == "WAIT"
    po_id = row.get("inbound_po_id")
    if pd.notna(po_id):
        eta = row.get("inbound_eta") or "soon"
        qty = row.get("inbound_qty")
        qty_str = f" ({int(qty)} units)" if pd.notna(qty) else ""
        return f"Inbound PO {po_id} arriving {eta}{qty_str} will cover the gap — hold."

    return "No spare stock at other DCs. Escalate to supply planner."


def rank_alerts(
    imbalance_df: pd.DataFrame,
    transfer_df: pd.DataFrame,
    chargebacks_df: pd.DataFrame,
    n: int = 10,
) -> pd.DataFrame:
    """Return top-n ranked alerts. One row per (sku, dc) in deficit, sorted by priority desc."""
    deficit = imbalance_df[
        imbalance_df["status"].isin(["critical", "warning"])
    ][["sku", "dc", "dos", "imbalance_score"]].copy()

    if deficit.empty:
        return pd.DataFrame(columns=_OUT_COLS)

    if not transfer_df.empty:
        t = transfer_df[[
            "sku", "dest_dc", "action", "origin_dc", "qty",
            "inbound_po_id", "inbound_eta", "inbound_qty",
            "days_to_stockout", "penalty_avoided", "net_saving",
        ]].rename(columns={
            "dest_dc": "dc",
            "days_to_stockout": "t_days",
        })
        deficit = deficit.merge(t, on=["sku", "dc"], how="left")
    else:
        for col in [
            "action", "origin_dc", "qty", "inbound_po_id", "inbound_eta",
            "inbound_qty", "t_days", "penalty_avoided", "net_saving",
        ]:
            deficit[col] = None

    deficit["days_to_stockout"] = (
        deficit["t_days"].fillna(deficit["dos"]).fillna(9999)
    )
    deficit["exposure_dollars"] = deficit["penalty_avoided"].fillna(0.0) * 12

    urgency_raw = 1.0 / deficit["days_to_stockout"].clip(lower=1)
    deficit["priority_score"] = (
        _safe_norm(deficit["imbalance_score"])
        + _safe_norm(deficit["exposure_dollars"])
        + _safe_norm(urgency_raw)
    )

    # Demote WAIT rows that already have inbound relief
    wait_inbound = (deficit["action"] == "WAIT") & (deficit["inbound_po_id"].notna())
    deficit.loc[wait_inbound, "priority_score"] *= 0.5

    deficit["reason"] = deficit.apply(_make_reason, axis=1)

    result = (
        deficit.sort_values("priority_score", ascending=False)
        .head(n)
        .reset_index(drop=True)
    )
    result["rank"] = range(1, len(result) + 1)
    result["priority_score"] = result["priority_score"].round(4)

    return result[_OUT_COLS]
