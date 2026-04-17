"""Transfer-vs-wait decision with explicit dollar tradeoff."""
from __future__ import annotations

import math

import pandas as pd

from analytics.forecast import demand_rate
from analytics.metrics import days_of_supply, transfer_cost
from data.constants import DC, DEMAND_WINDOW_DAYS, DOS_TARGET, DOS_WARNING

_ALL_DCS = [str(DC.EAST), str(DC.WEST), str(DC.CENTRAL)]
_DEFAULT_COST_PER_PALLET = 300.0
_PENALTY_PER_UNIT = 15.0  # proxy chargeback penalty for demo (no real model yet)


def transfer_recommendations(
    inventory_df: pd.DataFrame,
    sales_df: pd.DataFrame,
    skus_df: pd.DataFrame,
    freight_df: pd.DataFrame,
) -> pd.DataFrame:
    """Return profitable SKU transfers: surplus DC → deficit DC, sorted by net_saving desc."""
    sku_info = skus_df.set_index("sku")[["product_name", "units_per_case"]].to_dict("index")

    freight_lookup: dict[tuple[str, str], float] = {
        (str(r["origin"]), str(r["destination"])): float(r["cost_per_pallet"])
        for _, r in freight_df.iterrows()
    }

    rows: list[dict] = []

    for sku in inventory_df["sku"].unique():
        if sku not in sku_info:
            continue
        units_per_case = int(sku_info[sku]["units_per_case"])
        product_name = sku_info[sku]["product_name"]

        inv_sku = inventory_df[inventory_df["sku"] == sku]

        dc_data: dict[str, dict] = {}
        for dc in _ALL_DCS:
            dc_inv = inv_sku[inv_sku["dc"] == dc]
            available = float(dc_inv["available"].iloc[0]) if not dc_inv.empty else 0.0
            rate = demand_rate(sales_df, sku, dc, DEMAND_WINDOW_DAYS)
            dos = days_of_supply(available, rate)
            dc_data[dc] = {"available": available, "rate": rate, "dos": dos}

        # Surplus: DoS > 90, or inf with stock on hand
        surplus = [
            dc for dc, d in dc_data.items()
            if d["available"] > 0 and (math.isinf(d["dos"]) or d["dos"] > DOS_TARGET)
        ]
        # Deficit: DoS < 30 (critical or warning), finite
        deficit = [
            dc for dc, d in dc_data.items()
            if not math.isinf(d["dos"]) and d["dos"] < DOS_WARNING
        ]

        for dest_dc in deficit:
            for origin_dc in surplus:
                if origin_dc == dest_dc:
                    continue

                rate_dest = dc_data[dest_dc]["rate"]
                available_dest = dc_data[dest_dc]["available"]
                dos_dest = dc_data[dest_dc]["dos"]
                dos_origin = dc_data[origin_dc]["dos"]

                # Qty to bring dest to 30-day supply, rounded up to nearest case
                raw_qty = max(0.0, DOS_WARNING * rate_dest - available_dest)
                if raw_qty <= 0:
                    continue
                qty = math.ceil(raw_qty / units_per_case) * units_per_case

                cost_per_pallet = freight_lookup.get((origin_dc, dest_dc), _DEFAULT_COST_PER_PALLET)
                cost = transfer_cost(qty, units_per_case, cost_per_pallet)

                risk_avoided = (DOS_WARNING - dos_dest) * rate_dest * _PENALTY_PER_UNIT
                net = risk_avoided - cost

                if net <= 0:
                    continue

                rows.append({
                    "sku": sku,
                    "product_name": product_name,
                    "origin_dc": origin_dc,
                    "dest_dc": dest_dc,
                    "dos_origin": None if math.isinf(dos_origin) else round(dos_origin, 1),
                    "dos_dest": round(dos_dest, 1),
                    "qty_to_transfer": int(qty),
                    "transfer_cost": round(cost, 2),
                    "chargeback_risk_avoided": round(risk_avoided, 2),
                    "net_saving": round(net, 2),
                })

    if not rows:
        return pd.DataFrame(columns=[
            "sku", "product_name", "origin_dc", "dest_dc",
            "dos_origin", "dos_dest", "qty_to_transfer",
            "transfer_cost", "chargeback_risk_avoided", "net_saving",
        ])

    return pd.DataFrame(rows).sort_values("net_saving", ascending=False).reset_index(drop=True)
