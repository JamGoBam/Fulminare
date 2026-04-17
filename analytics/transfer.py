"""Transfer-vs-wait decision with explicit dollar tradeoff.

One row per (sku, dest_dc) where DoS < DOS_WARNING.
action="WAIT"     — inbound PO covers the gap, or no spare stock anywhere.
action="TRANSFER" — profitable move from a protected origin DC.
"""
from __future__ import annotations

import math

import pandas as pd

from analytics.chargeback import penalty_rate
from analytics.forecast import demand_rate
from analytics.metrics import days_of_supply, transfer_cost
from data.constants import (
    DC,
    DEMAND_WINDOW_DAYS,
    DOS_WARNING,
    INTER_DC_TRANSIT_DAYS,
)

_ALL_DCS = [str(DC.EAST), str(DC.WEST), str(DC.CENTRAL)]
_DEFAULT_COST_PER_PALLET = 300.0
_DOMINANT_WINDOW_DAYS = 90

_OUTPUT_COLS = [
    "sku", "product_name", "dest_dc", "action", "origin_dc", "qty",
    "transfer_cost", "inbound_po_id", "inbound_eta", "inbound_qty",
    "days_to_stockout", "penalty_avoided", "net_saving", "reason",
]


def _dominant_customer_channel(
    sales_df: pd.DataFrame, sku: str, dc: str, today: pd.Timestamp
) -> tuple[str, str]:
    cutoff = today - pd.Timedelta(days=_DOMINANT_WINDOW_DAYS)
    dates = pd.to_datetime(sales_df["date"])
    mask = (sales_df["sku"] == sku) & (sales_df["ship_from_dc"] == dc) & (dates >= cutoff)
    recent = sales_df[mask]
    if recent.empty:
        return ("UNKNOWN", "UNKNOWN")
    customer = str(recent.groupby("customer_id")["qty"].sum().idxmax())
    channel = str(recent.groupby("channel")["qty"].sum().idxmax())
    return customer, channel


def transfer_recommendations(
    inventory_df: pd.DataFrame,
    sales_df: pd.DataFrame,
    skus_df: pd.DataFrame,
    freight_df: pd.DataFrame,
    open_po_df: pd.DataFrame,
    chargebacks_df: pd.DataFrame,
) -> pd.DataFrame:
    """Return one row per (sku, dest_dc) with DoS < DOS_WARNING, sorted by net_saving desc."""
    today = pd.Timestamp(pd.to_datetime(inventory_df["snapshot_date"]).max())

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
        product_name = str(sku_info[sku]["product_name"])

        inv_sku = inventory_df[inventory_df["sku"] == sku]
        dc_data: dict[str, dict] = {}
        for dc in _ALL_DCS:
            dc_inv = inv_sku[inv_sku["dc"] == dc]
            available = float(dc_inv["available"].iloc[0]) if not dc_inv.empty else 0.0
            rate = demand_rate(sales_df, sku, dc, DEMAND_WINDOW_DAYS)
            dos = days_of_supply(available, rate)
            dc_data[dc] = {"available": available, "rate": rate, "dos": dos}

        for dest_dc in _ALL_DCS:
            dos_dest = dc_data[dest_dc]["dos"]
            if math.isinf(dos_dest) or dos_dest >= DOS_WARNING:
                continue
            rate_dest = dc_data[dest_dc]["rate"]
            if rate_dest == 0:
                continue
            available_dest = dc_data[dest_dc]["available"]
            days_to_stockout = dos_dest  # available / rate

            # Units needed to lift dest to DOS_WARNING
            qty_needed = math.ceil(
                max(0.0, DOS_WARNING * rate_dest - available_dest) / units_per_case
            ) * units_per_case

            dom_customer, dom_channel = _dominant_customer_channel(
                sales_df, sku, dest_dc, today
            )
            p_rate = penalty_rate(chargebacks_df, dom_customer, dom_channel, dest_dc)
            penalty_avoided = p_rate * qty_needed

            # ── Check for qualifying inbound PO ───────────────────────────────
            inbound = open_po_df[
                (open_po_df["sku"] == sku) & (open_po_df["dc"] == dest_dc)
            ].copy()

            best_po = None
            if not inbound.empty:
                inbound["eta_adj"] = pd.to_datetime(inbound["expected_arrival"]) + (
                    inbound["delay_flag"].apply(
                        lambda x: pd.Timedelta(days=7) if x else pd.Timedelta(0)
                    )
                )
                inbound["days_until"] = (inbound["eta_adj"] - today).dt.days
                inbound["dos_after"] = (available_dest + inbound["qty"]) / rate_dest
                qualifying = inbound[
                    (inbound["days_until"] <= days_to_stockout + INTER_DC_TRANSIT_DAYS)
                    & (inbound["dos_after"] >= DOS_WARNING)
                ].sort_values("days_until")
                if not qualifying.empty:
                    best_po = qualifying.iloc[0]

            if best_po is not None:
                n_days = int(best_po["days_until"])
                rows.append({
                    "sku": sku,
                    "product_name": product_name,
                    "dest_dc": dest_dc,
                    "action": "WAIT",
                    "origin_dc": None,
                    "qty": None,
                    "transfer_cost": None,
                    "inbound_po_id": str(best_po["po_id"]),
                    "inbound_eta": str(best_po["eta_adj"].date()),
                    "inbound_qty": int(best_po["qty"]),
                    "days_to_stockout": round(days_to_stockout, 1),
                    "penalty_avoided": round(penalty_avoided, 2),
                    "net_saving": round(penalty_avoided, 2),
                    "reason": (
                        f"Inbound PO {best_po['po_id']} arrives in {n_days} day(s) "
                        f"with {int(best_po['qty'])} units"
                    ),
                })
                continue

            # ── Find best protected origin for TRANSFER ───────────────────────
            best_origin: str | None = None
            best_cushion = -1.0
            best_cost = float("inf")

            for origin_dc in _ALL_DCS:
                if origin_dc == dest_dc:
                    continue
                avail_o = dc_data[origin_dc]["available"]
                rate_o = dc_data[origin_dc]["rate"]
                if avail_o < qty_needed:
                    continue
                dos_o_after = days_of_supply(avail_o - qty_needed, rate_o)
                if not math.isinf(dos_o_after) and dos_o_after < DOS_WARNING:
                    continue  # origin-protection: would drop origin below WARNING
                cushion = 9999.0 if math.isinf(dos_o_after) else dos_o_after
                cost_pp = freight_lookup.get((origin_dc, dest_dc), _DEFAULT_COST_PER_PALLET)
                cost = transfer_cost(qty_needed, units_per_case, cost_pp)
                if cushion > best_cushion or (cushion == best_cushion and cost < best_cost):
                    best_origin = origin_dc
                    best_cushion = cushion
                    best_cost = cost

            if best_origin is None:
                rows.append({
                    "sku": sku,
                    "product_name": product_name,
                    "dest_dc": dest_dc,
                    "action": "WAIT",
                    "origin_dc": None,
                    "qty": None,
                    "transfer_cost": None,
                    "inbound_po_id": None,
                    "inbound_eta": None,
                    "inbound_qty": None,
                    "days_to_stockout": round(days_to_stockout, 1),
                    "penalty_avoided": 0.0,
                    "net_saving": 0.0,
                    "reason": "No DC has spare inventory; escalate to planner",
                })
                continue

            net = penalty_avoided - best_cost
            if net <= 0:
                continue  # Not profitable; skip per spec

            reason = f"Transfer {int(qty_needed)} units from {best_origin}"
            if days_to_stockout < INTER_DC_TRANSIT_DAYS:
                reason += (
                    f"; NOTE: stockout in {round(days_to_stockout, 1)}d, "
                    f"before {INTER_DC_TRANSIT_DAYS}d transit completes"
                )

            rows.append({
                "sku": sku,
                "product_name": product_name,
                "dest_dc": dest_dc,
                "action": "TRANSFER",
                "origin_dc": best_origin,
                "qty": int(qty_needed),
                "transfer_cost": round(best_cost, 2),
                "inbound_po_id": None,
                "inbound_eta": None,
                "inbound_qty": None,
                "days_to_stockout": round(days_to_stockout, 1),
                "penalty_avoided": round(penalty_avoided, 2),
                "net_saving": round(net, 2),
                "reason": reason,
            })

    if not rows:
        return pd.DataFrame(columns=_OUTPUT_COLS)
    return (
        pd.DataFrame(rows)
        .sort_values("net_saving", ascending=False)
        .reset_index(drop=True)
    )
