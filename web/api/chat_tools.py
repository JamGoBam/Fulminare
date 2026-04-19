"""Read-only tool implementations for the POP chatbot.

All tools read from data/processed/*.parquet — no mutations, no recompute.
Latency target: <200ms per call.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from data.constants import CauseCode

_P = Path("data/processed")


def _read(name: str) -> pd.DataFrame:
    return pd.read_parquet(_P / name)


def _nullify(df: pd.DataFrame) -> list[dict]:
    return df.where(pd.notna(df), other=None).to_dict(orient="records")


# ── Tool implementations ───────────────────────────────────────────────────────

def get_dashboard_summary() -> dict:
    """Banner numbers: manual vs system savings, alert counts."""
    chargebacks = _read("chargebacks.parquet")
    transfers = _read("transfers_computed.parquet")
    imbalance = _read("imbalance.parquet")

    cb = chargebacks[chargebacks["cause_code"] != CauseCode.TPR]
    if not cb.empty:
        dates = pd.to_datetime(cb["date"])
        months = max(1.0, (dates.max() - dates.min()).days / 30.0)
        manual = round(float(cb["amount"].sum()) * 12.0 / months, 2)
    else:
        manual = 0.0

    tr = transfers[transfers["action"] == "TRANSFER"] if not transfers.empty else pd.DataFrame()
    system_avoidable = round(float(tr["net_saving"].sum()) * 12 if not tr.empty else 0.0, 2)

    return {
        "manual_annual_penalty": manual,
        "system_avoidable_annual": system_avoidable,
        "delta": round(system_avoidable - manual, 2),
        "critical_skus": int((imbalance["status"] == "critical").sum()),
        "warning_skus": int((imbalance["status"] == "warning").sum()),
        "total_skus": int(imbalance["sku"].nunique()),
    }


def get_sku_status(sku: str) -> dict:
    """Full per-SKU detail: DC breakdown, open POs, best recommendation."""
    imbalance = _read("imbalance.parquet")
    transfers = _read("transfers_computed.parquet")
    open_po = _read("open_po.parquet")
    chargebacks = _read("chargebacks.parquet")
    skus_df = _read("skus.parquet")

    sku_meta = skus_df[skus_df["sku"] == sku]
    if sku_meta.empty:
        return {"error": f"SKU '{sku}' not found"}

    product_name = str(sku_meta.iloc[0]["product_name"])
    sku_rows = imbalance[imbalance["sku"] == sku]
    dcs = _nullify(sku_rows[["dc", "available", "demand_rate", "dos", "status"]])

    sku_pos = _nullify(
        open_po[open_po["sku"] == sku][["po_id", "qty", "expected_arrival", "delay_flag"]]
    )

    sku_transfers = transfers[transfers["sku"] == sku]
    recommendation = None
    if not sku_transfers.empty:
        tr_rows = sku_transfers[sku_transfers["action"] == "TRANSFER"]
        best = tr_rows.sort_values("net_saving", ascending=False).iloc[0] if not tr_rows.empty \
            else sku_transfers.iloc[0]
        recommendation = {k: (None if pd.isna(v) else v) for k, v in best.items()}

    sku_dcs = set(sku_rows["dc"].unique())
    cb = chargebacks[
        (chargebacks["dc"].isin(sku_dcs)) & (chargebacks["cause_code"] != CauseCode.TPR)
    ]
    cb_summary = {"total_amount": round(float(cb["amount"].sum()), 2), "count": len(cb)}

    return {
        "sku": sku,
        "product_name": product_name,
        "dcs": dcs,
        "open_pos": sku_pos,
        "recommendation": recommendation,
        "chargeback_history_summary": cb_summary,
    }


def list_critical_skus(dc: str | None = None, limit: int = 10) -> list[dict]:
    """List SKUs with critical or warning DoS, optionally filtered by DC."""
    imbalance = _read("imbalance.parquet")
    df = imbalance[imbalance["status"].isin(["critical", "warning"])].copy()
    if dc:
        df = df[df["dc"] == dc]
    df = df.sort_values("dos", ascending=True, na_position="last").head(limit)
    return _nullify(df[["sku", "dc", "dos", "status", "demand_rate"]])


def get_transfer_recommendation(sku: str, dest_dc: str | None = None) -> list[dict]:
    """Transfer/wait recommendation for a SKU, optionally filtered to a dest DC."""
    transfers = _read("transfers_computed.parquet")
    df = transfers[transfers["sku"] == sku]
    if dest_dc:
        df = df[df["dest_dc"] == dest_dc]
    if df.empty:
        return [{"message": f"No recommendation found for SKU '{sku}'"}]
    return _nullify(df[["sku", "dest_dc", "action", "origin_dc", "qty", "transfer_cost",
                         "days_to_stockout", "penalty_avoided", "net_saving", "reason"]])


def get_chargeback_breakdown(by: str, limit: int = 10) -> list[dict]:
    """Chargeback breakdown by cause|customer|channel|dc|trend."""
    mapping = {
        "cause":    ("cb_top_causes.parquet",     limit),
        "customer": ("cb_top_customers.parquet",  limit),
        "channel":  ("cb_top_channels.parquet",   limit),
        "dc":       ("cb_by_dc.parquet",          limit),
        "trend":    ("cb_monthly_trend.parquet",  0),
    }
    if by not in mapping:
        return [{"error": f"Unknown breakdown '{by}'. Use: cause, customer, channel, dc, trend"}]
    filename, n = mapping[by]
    df = _read(filename)
    return df.head(n).to_dict(orient="records") if n else df.to_dict(orient="records")


def explain_metric(metric: str) -> dict:
    """Plain-English explanation of a POP metric."""
    glossary = {
        "dos": {
            "name": "Days of Supply (DoS)",
            "definition": "How many days the current on-hand inventory will last at the "
                          "current daily demand rate. Critical < 14 days; Warning < 30 days; "
                          "Target ~90 days.",
            "formula": "available_units ÷ demand_rate (units/day)",
        },
        "imbalance": {
            "name": "Imbalance Score",
            "definition": "How unevenly a SKU is distributed across the 3 DCs. "
                          "Near 0 = evenly spread; near 10 = all stock stranded at one DC. "
                          "High imbalance means one DC stocks out while another sits idle.",
            "formula": "(max_DoS − min_DoS) ÷ mean_DoS, clamped to [0, 10]",
        },
        "transfer_cost": {
            "name": "Transfer Cost",
            "definition": "Dollar cost to move inventory between two DCs. "
                          "Based on pallets required × freight rate per pallet. "
                          "Partial pallets round up. Assumes 40 cases per pallet.",
            "formula": "ceil(qty ÷ (units_per_case × 40)) × cost_per_pallet",
        },
        "chargeback_risk": {
            "name": "Chargeback Risk",
            "definition": "Expected dollar penalty if we do nothing — probability of stockout "
                          "multiplied by the historical average chargeback dollar amount for "
                          "the dominant customer/channel/DC combination.",
            "formula": "P(stockout) × historical_mean_chargeback(customer, channel, DC)",
        },
        "otif": {
            "name": "OTIF Risk",
            "definition": "Probability of missing On-Time-In-Full on the next order. "
                          "0 = certain to fulfill on time; 1 = certain to miss.",
            "formula": "1 − P(on_time) × P(in_full)",
        },
    }
    if metric not in glossary:
        return {"error": f"Unknown metric '{metric}'. Use: dos, imbalance, transfer_cost, "
                         "chargeback_risk, otif"}
    return glossary[metric]


def get_open_pos(sku: str | None = None, dc: str | None = None) -> list[dict]:
    """Open purchase orders, optionally filtered by SKU and/or DC."""
    df = _read("open_po.parquet")
    if sku:
        df = df[df["sku"] == sku]
    if dc:
        df = df[df["dc"] == dc]
    return _nullify(df[["po_id", "sku", "dc", "qty", "expected_arrival",
                         "ship_method", "delay_flag"]])


# ── Tool schemas for OpenAI-compatible API (Ollama) ───────────────────────────

def _tool(name: str, description: str, parameters: dict) -> dict:
    return {"type": "function", "function": {"name": name, "description": description, "parameters": parameters}}


TOOL_SCHEMAS: list[dict] = [
    _tool(
        "get_dashboard_summary",
        "Get overall dashboard numbers: manual annual chargeback penalty, system-avoidable savings, SKU alert counts.",
        {"type": "object", "properties": {}, "required": []},
    ),
    _tool(
        "get_sku_status",
        "Get full status for a specific SKU: per-DC days of supply, open POs, transfer/wait recommendation, chargeback history.",
        {
            "type": "object",
            "properties": {"sku": {"type": "string", "description": "SKU code, e.g. J-72402"}},
            "required": ["sku"],
        },
    ),
    _tool(
        "list_critical_skus",
        "List SKUs at critical or warning days-of-supply, sorted most urgent first.",
        {
            "type": "object",
            "properties": {
                "dc": {"type": "string", "description": "Optional DC filter. Use internal codes: DC_WEST (DC SF / San Francisco), DC_CENTRAL (DC LA / Los Angeles), DC_EAST (DC NJ / New Jersey)."},
                "limit": {"type": "integer", "description": "Max results (default 10)"},
            },
            "required": [],
        },
    ),
    _tool(
        "get_transfer_recommendation",
        "Get the TRANSFER or WAIT recommendation for a SKU with dollar tradeoff.",
        {
            "type": "object",
            "properties": {
                "sku": {"type": "string", "description": "SKU code"},
                "dest_dc": {"type": "string", "description": "Optional destination DC filter"},
            },
            "required": ["sku"],
        },
    ),
    _tool(
        "get_chargeback_breakdown",
        "Get chargeback data broken down by cause, customer, channel, DC, or monthly trend.",
        {
            "type": "object",
            "properties": {
                "by": {
                    "type": "string",
                    "enum": ["cause", "customer", "channel", "dc", "trend"],
                    "description": "Dimension to break down by",
                },
                "limit": {"type": "integer", "description": "Max rows (default 10)"},
            },
            "required": ["by"],
        },
    ),
    _tool(
        "explain_metric",
        "Get a plain-English definition and formula for a POP metric.",
        {
            "type": "object",
            "properties": {
                "metric": {
                    "type": "string",
                    "enum": ["dos", "imbalance", "transfer_cost", "chargeback_risk", "otif"],
                },
            },
            "required": ["metric"],
        },
    ),
    _tool(
        "get_open_pos",
        "Get open purchase orders, optionally filtered by SKU and/or DC.",
        {
            "type": "object",
            "properties": {
                "sku": {"type": "string", "description": "Optional SKU filter"},
                "dc": {"type": "string", "description": "Optional DC filter"},
            },
            "required": [],
        },
    ),
]


def execute_tool(name: str, inputs: dict[str, Any]) -> Any:
    """Dispatch a tool call by name. Called from the chat route."""
    print(f"[chat tool] {name}({json.dumps(inputs, default=str)})")  # rehearsal verification
    dispatch = {
        "get_dashboard_summary": lambda: get_dashboard_summary(),
        "get_sku_status": lambda: get_sku_status(inputs["sku"]),
        "list_critical_skus": lambda: list_critical_skus(
            dc=inputs.get("dc"), limit=int(inputs.get("limit", 10))
        ),
        "get_transfer_recommendation": lambda: get_transfer_recommendation(
            sku=inputs["sku"], dest_dc=inputs.get("dest_dc")
        ),
        "get_chargeback_breakdown": lambda: get_chargeback_breakdown(
            by=inputs["by"], limit=int(inputs.get("limit", 10))
        ),
        "explain_metric": lambda: explain_metric(inputs["metric"]),
        "get_open_pos": lambda: get_open_pos(
            sku=inputs.get("sku"), dc=inputs.get("dc")
        ),
    }
    fn = dispatch.get(name)
    if fn is None:
        return {"error": f"Unknown tool: {name}"}
    return fn()
