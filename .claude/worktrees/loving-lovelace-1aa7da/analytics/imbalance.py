"""Per-SKU 3-DC imbalance detector."""
from __future__ import annotations

import math

import pandas as pd

from analytics.forecast import demand_rate
from analytics.metrics import days_of_supply, imbalance_score
from data.constants import DC, DEMAND_WINDOW_DAYS, DOS_CRITICAL, DOS_WARNING

_ALL_DCS = [str(DC.EAST), str(DC.WEST), str(DC.CENTRAL)]


def compute_imbalance_table(
    inventory_df: pd.DataFrame,
    sales_df: pd.DataFrame,
    skus_df: pd.DataFrame,
) -> pd.DataFrame:
    """Return one row per SKU×DC with demand_rate, dos, imbalance_score, and status."""
    sku_names: dict[str, str] = skus_df.set_index("sku")["product_name"].to_dict()

    rows: list[dict] = []
    for sku in inventory_df["sku"].unique():
        inv_sku = inventory_df[inventory_df["sku"] == sku]

        dc_data: dict[str, dict] = {}
        for dc in _ALL_DCS:
            dc_inv = inv_sku[inv_sku["dc"] == dc]
            available = float(dc_inv["available"].iloc[0]) if not dc_inv.empty else 0.0
            on_hand = float(dc_inv["on_hand"].iloc[0]) if not dc_inv.empty else 0.0
            rate = demand_rate(sales_df, sku, dc, DEMAND_WINDOW_DAYS)
            dos = days_of_supply(available, rate)
            dc_data[dc] = {"on_hand": on_hand, "available": available, "demand_rate": rate, "dos": dos}

        dos_values = [dc_data[dc]["dos"] for dc in _ALL_DCS]
        score = imbalance_score(dos_values)

        for dc, d in dc_data.items():
            dos_val = d["dos"]
            if math.isinf(dos_val):
                status = "ok"
            elif dos_val < DOS_CRITICAL:
                status = "critical"
            elif dos_val < DOS_WARNING:
                status = "warning"
            else:
                status = "ok"

            rows.append({
                "sku": sku,
                "product_name": sku_names.get(sku, sku),
                "dc": dc,
                "on_hand": d["on_hand"],
                "available": d["available"],
                "demand_rate": round(d["demand_rate"], 4),
                "dos": None if math.isinf(dos_val) else round(dos_val, 1),
                "imbalance_score": round(score, 3),
                "status": status,
            })

    return pd.DataFrame(rows)


def get_top_imbalanced(imbalance_df: pd.DataFrame, n: int = 20) -> pd.DataFrame:
    """Return top-n unique SKUs by imbalance_score descending, all their DC rows included."""
    top_skus = (
        imbalance_df[["sku", "imbalance_score"]]
        .drop_duplicates("sku")
        .nlargest(n, "imbalance_score")["sku"]
    )
    return imbalance_df[imbalance_df["sku"].isin(top_skus)].copy()
