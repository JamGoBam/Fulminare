"""Action items endpoint — unified ActionItem shape for the Dashboard."""
from __future__ import annotations

import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from data.dc_labels import DC_LABELS as _DC_LABELS

router = APIRouter()

_PROCESSED = Path("data/processed")
_TRANSIT_DAYS = 3  # locked flat per CLAUDE.md
_LARGE_DOS = 9999  # used when days_to_stockout is None/NaN (no stockout risk)


def _parquet(name: str) -> pd.DataFrame:
    try:
        return pd.read_parquet(_PROCESSED / name)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Data not ready — run analytics pipeline first: {exc}",
        ) from exc


def _label(dc: object) -> str:
    if dc is None or (isinstance(dc, float) and math.isnan(dc)):
        return "None available"
    return _DC_LABELS.get(str(dc), str(dc))


def _safe_float(v: object) -> Optional[float]:
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    return float(v)


def _safe_int(v: object) -> int:
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return 0
    return int(v)


def _risk_level(days: Optional[float]) -> str:
    if days is None or days >= _LARGE_DOS:
        return "Low"
    if days < 14:
        return "High"
    if days < 30:
        return "Medium"
    return "Low"


def _recommendation(action: str) -> str:
    return {"TRANSFER": "Transfer Now", "WAIT": "Wait", "ESCALATE": "Escalate"}.get(
        action, "Wait"
    )


def _is_null(v: object) -> bool:
    if v is None:
        return True
    if isinstance(v, float) and math.isnan(v):
        return True
    return False


def _confidence(row: pd.Series) -> int:
    null_fields = sum(
        1 for f in ["origin_dc", "qty", "transfer_cost", "inbound_eta"] if _is_null(row.get(f))
    )
    return max(60, 100 - null_fields * 10)


# ── Pydantic models ─────────────────────────────────────────────────────────────

class TransferDetails(BaseModel):
    sourceDC: str
    unitsAvailable: int
    leadTime: str
    estimatedArrival: str
    cost: float
    postTransferHealth: str
    confidence: int


class InboundDetails(BaseModel):
    poEta: str
    delayRisk: str
    complianceFlags: list[str]
    stockoutWindow: str
    penaltyRisk: float
    confidence: int


class ActionItemOut(BaseModel):
    id: str
    sku: str
    itemName: str
    category: str
    brand: str
    atRiskDC: str
    daysUntilStockout: float
    companyWideInventory: int
    recommendation: str
    riskLevel: str
    potentialPenalty: float
    reason: str
    confidence: int
    updatedAt: str
    transferDetails: TransferDetails
    inboundDetails: InboundDetails
    reasoning: list[str]


# ── Endpoint ────────────────────────────────────────────────────────────────────

@router.get("/action-items", response_model=list[ActionItemOut])
def get_action_items() -> list[dict]:
    transfers = _parquet("transfers_computed.parquet")
    skus = _parquet("skus.parquet")
    open_po = _parquet("open_po.parquet")
    inventory = _parquet("inventory.parquet")

    # Company-wide available inventory per SKU (sum across all DCs)
    inv_totals = (
        inventory.groupby("sku")["available"].sum().rename("company_wide").reset_index()
    )

    df = transfers.merge(
        skus[["sku", "category", "brand"]], on="sku", how="left"
    ).merge(inv_totals, on="sku", how="left")

    now_iso = datetime.utcnow().isoformat()
    arrive_date = (datetime.utcnow() + timedelta(days=_TRANSIT_DAYS)).strftime("%Y-%m-%d")

    results: list[dict] = []

    for _, row in df.iterrows():
        sku = str(row["sku"])
        dest_dc = str(row["dest_dc"])
        action = str(row["action"])
        days_raw = _safe_float(row.get("days_to_stockout"))
        days = days_raw if days_raw is not None else float(_LARGE_DOS)
        penalty = _safe_float(row.get("penalty_avoided")) or 0.0
        net_saving = _safe_float(row.get("net_saving")) or 0.0
        transfer_cost = _safe_float(row.get("transfer_cost")) or 0.0
        qty = _safe_int(row.get("qty"))
        origin_dc = row.get("origin_dc")
        conf = _confidence(row)

        # Best inbound PO for this SKU at the at-risk DC
        po_rows = open_po[(open_po["sku"] == sku) & (open_po["dc"] == dest_dc)]
        if not po_rows.empty:
            best_po = po_rows.iloc[0]
            po_eta = str(best_po["expected_arrival"])
            delay_flag = bool(best_po.get("delay_flag", False))
            delay_risk = "High" if delay_flag else "Low"
            compliance_flags = ["Delayed +7d"] if delay_flag else []
            inbound_conf = 60 if delay_flag else 80
        else:
            po_eta = "None scheduled"
            delay_risk = "Low"
            compliance_flags = []
            inbound_conf = 40

        # Reasoning bullets
        days_str = f"{days:.0f}" if days < _LARGE_DOS else "unknown"
        r1 = (
            f"Running low at {_label(dest_dc)} — {days_str} days of stock remain."
            if days < _LARGE_DOS
            else f"Stock at {_label(dest_dc)} is adequate but imbalanced."
        )
        r2 = (
            f"Inbound PO due {po_eta}{' (delayed, +7d risk)' if delay_flag else ''}."
            if po_eta != "None scheduled"
            else f"No inbound PO scheduled for {_label(dest_dc)}."
        )
        r3 = (
            f"Transfer {qty} units from {_label(origin_dc)} costs ${transfer_cost:,.0f} "
            f"and avoids ${penalty:,.0f} in chargebacks (net ${net_saving:,.0f} saved)."
            if action == "TRANSFER"
            else f"Waiting for inbound PO. Potential penalty if delayed: ${penalty:,.0f}."
        )

        results.append(
            ActionItemOut(
                id=f"{sku}_{dest_dc}",
                sku=sku,
                itemName=str(row.get("product_name", sku)),
                category=str(row.get("category", "")),
                brand=str(row.get("brand", "")),
                atRiskDC=_label(dest_dc),
                daysUntilStockout=days,
                companyWideInventory=_safe_int(row.get("company_wide")),
                recommendation=_recommendation(action),
                riskLevel=_risk_level(days_raw),
                potentialPenalty=penalty,
                reason=str(row["reason"]),
                confidence=conf,
                updatedAt=now_iso,
                transferDetails=TransferDetails(
                    sourceDC=_label(origin_dc),
                    unitsAvailable=qty,
                    leadTime=f"{_TRANSIT_DAYS} days",
                    estimatedArrival=arrive_date,
                    cost=transfer_cost,
                    postTransferHealth=(
                        f"{_label(dest_dc)}: +{days_str}d cover after transfer"
                        if days < _LARGE_DOS
                        else "Balanced"
                    ),
                    confidence=conf if action == "TRANSFER" else max(conf - 20, 40),
                ),
                inboundDetails=InboundDetails(
                    poEta=po_eta,
                    delayRisk=delay_risk,
                    complianceFlags=compliance_flags,
                    stockoutWindow=f"{days_str} days",
                    penaltyRisk=penalty,
                    confidence=inbound_conf,
                ),
                reasoning=[r1, r2, r3],
            ).model_dump()
        )

    # Sort: High risk first (ascending days), then Medium, then Low
    results.sort(key=lambda x: x["daysUntilStockout"])
    return results
