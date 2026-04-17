"""Inventory endpoints: imbalance table, per-SKU detail, and manual-vs-system summary."""
from __future__ import annotations

from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from analytics.imbalance import compute_imbalance_table, get_top_imbalanced

router = APIRouter()

_PROCESSED = Path("data/processed")


def _parquet(name: str) -> pd.DataFrame:
    try:
        return pd.read_parquet(_PROCESSED / name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"Data not ready: {exc}") from exc


def _load_base() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    inventory = _parquet("inventory.parquet")
    sales = _parquet("sales.parquet")
    skus = _parquet("skus.parquet")
    sales["date"] = pd.to_datetime(sales["date"])
    return inventory, sales, skus


# ── Pydantic models ────────────────────────────────────────────────────────────

class DcDetail(BaseModel):
    dc: str
    available: float
    demand_rate: float
    dos: Optional[float] = None
    status: str


class OpenPODetail(BaseModel):
    po_id: str
    qty: int
    expected_arrival: str
    delay_flag: bool


class SkuRecommendation(BaseModel):
    action: str
    dest_dc: str
    origin_dc: Optional[str] = None
    qty: Optional[int] = None
    transfer_cost: Optional[float] = None
    inbound_po_id: Optional[str] = None
    inbound_eta: Optional[str] = None
    days_to_stockout: Optional[float] = None
    net_saving: Optional[float] = None
    reason: str


class ChargebackSummary(BaseModel):
    total_amount: float
    count: int


class SkuDetail(BaseModel):
    sku: str
    product_name: str
    dcs: list[DcDetail]
    open_pos: list[OpenPODetail]
    recommendation: Optional[SkuRecommendation] = None
    chargeback_history_summary: ChargebackSummary


class ManualVsSystem(BaseModel):
    manual_annual_penalty: float
    system_avoidable_annual: float
    delta: float
    pct_reduction: float


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/inventory/imbalance")
def get_imbalance(top: int = 20) -> list[dict]:
    inventory, sales, skus = _load_base()
    table = compute_imbalance_table(inventory, sales, skus)
    result = get_top_imbalanced(table, n=top)
    return result.to_dict(orient="records")


@router.get("/inventory/sku/{sku}", response_model=SkuDetail)
def get_sku_detail(sku: str) -> dict:
    inventory, sales, skus_df = _load_base()

    sku_meta = skus_df[skus_df["sku"] == sku]
    if sku_meta.empty:
        raise HTTPException(status_code=404, detail=f"SKU '{sku}' not found")
    product_name = str(sku_meta.iloc[0]["product_name"])

    # Per-DC details from imbalance table
    imbalance_df = _parquet("imbalance.parquet")
    sku_rows = imbalance_df[imbalance_df["sku"] == sku]
    dcs = [
        DcDetail(
            dc=str(r["dc"]),
            available=float(r.get("available", 0)),
            demand_rate=float(r["demand_rate"]),
            dos=(None if r["dos"] is None or (isinstance(r["dos"], float) and pd.isna(r["dos"]))
                 else float(r["dos"])),
            status=str(r["status"]),
        )
        for _, r in sku_rows.iterrows()
    ]

    # Open POs for this SKU
    open_po_df = _parquet("open_po.parquet")
    sku_pos = open_po_df[open_po_df["sku"] == sku]
    open_pos = [
        OpenPODetail(
            po_id=str(r["po_id"]),
            qty=int(r["qty"]),
            expected_arrival=str(r["expected_arrival"]),
            delay_flag=bool(r["delay_flag"]),
        )
        for _, r in sku_pos.iterrows()
    ]

    # Best recommendation from pre-computed transfers
    transfers_df = _parquet("transfers_computed.parquet")
    sku_transfers = transfers_df[transfers_df["sku"] == sku]
    recommendation: Optional[SkuRecommendation] = None
    if not sku_transfers.empty:
        # Prefer TRANSFER rows; among those pick highest net_saving
        transfer_rows = sku_transfers[sku_transfers["action"] == "TRANSFER"]
        best = (
            transfer_rows.sort_values("net_saving", ascending=False).iloc[0]
            if not transfer_rows.empty
            else sku_transfers.iloc[0]
        )

        def _opt_str(v: object) -> Optional[str]:
            return None if pd.isna(v) else str(v)  # type: ignore[arg-type]

        def _opt_float(v: object) -> Optional[float]:
            return None if pd.isna(v) else float(v)  # type: ignore[arg-type]

        def _opt_int(v: object) -> Optional[int]:
            return None if pd.isna(v) else int(v)  # type: ignore[arg-type]

        recommendation = SkuRecommendation(
            action=str(best["action"]),
            dest_dc=str(best["dest_dc"]),
            origin_dc=_opt_str(best["origin_dc"]),
            qty=_opt_int(best["qty"]),
            transfer_cost=_opt_float(best["transfer_cost"]),
            inbound_po_id=_opt_str(best["inbound_po_id"]),
            inbound_eta=_opt_str(best["inbound_eta"]),
            days_to_stockout=_opt_float(best["days_to_stockout"]),
            net_saving=_opt_float(best["net_saving"]),
            reason=str(best["reason"]),
        )

    # Chargeback summary across the DCs where this SKU is stocked
    chargebacks_df = _parquet("chargebacks.parquet")
    sku_dcs = set(sku_rows["dc"].unique()) if not sku_rows.empty else set()
    from data.constants import CauseCode
    cb_filtered = chargebacks_df[
        (chargebacks_df["dc"].isin(sku_dcs))
        & (chargebacks_df["cause_code"] != CauseCode.TPR)
    ]
    cb_summary = ChargebackSummary(
        total_amount=round(float(cb_filtered["amount"].sum()), 2),
        count=int(len(cb_filtered)),
    )

    return SkuDetail(
        sku=sku,
        product_name=product_name,
        dcs=dcs,
        open_pos=open_pos,
        recommendation=recommendation,
        chargeback_history_summary=cb_summary,
    ).model_dump()


@router.get("/summary", response_model=ManualVsSystem)
def get_summary() -> dict:
    chargebacks_df = _parquet("chargebacks.parquet")
    transfers_df = _parquet("transfers_computed.parquet")

    from data.constants import CauseCode
    cb_penalty = chargebacks_df[chargebacks_df["cause_code"] != CauseCode.TPR]

    # Annualize: determine months of data, scale to 12
    if not cb_penalty.empty:
        dates = pd.to_datetime(cb_penalty["date"])
        months_span = max(
            1.0,
            (dates.max() - dates.min()).days / 30.0,
        )
        scale = 12.0 / months_span
        manual_annual = round(float(cb_penalty["amount"].sum()) * scale, 2)
    else:
        manual_annual = 0.0

    transfer_rows = transfers_df[transfers_df["action"] == "TRANSFER"] if not transfers_df.empty else pd.DataFrame()
    system_avoidable = round(
        float(transfer_rows["net_saving"].sum()) * 12 if not transfer_rows.empty else 0.0,
        2,
    )

    delta = round(manual_annual - system_avoidable, 2)
    pct = round((system_avoidable / manual_annual * 100) if manual_annual > 0 else 0.0, 1)

    return ManualVsSystem(
        manual_annual_penalty=manual_annual,
        system_avoidable_annual=system_avoidable,
        delta=delta,
        pct_reduction=pct,
    ).model_dump()
