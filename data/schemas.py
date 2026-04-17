"""Pydantic v2 row schemas per CSV. Column names match CLAUDE.md schema table exactly."""
from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel

from data.constants import CauseCode, DC


class InventoryRow(BaseModel):
    sku: str
    dc: DC
    on_hand: int
    allocated: int
    available: int
    unit_cost: float
    snapshot_date: date


class SalesRow(BaseModel):
    date: date
    sku: str
    qty: int
    unit_price: float
    customer_id: str
    channel: str
    ship_from_dc: DC


class POHistoryRow(BaseModel):
    po_id: str
    sku: str
    supplier_id: str
    qty: int
    unit_cost: float
    order_date: date
    ship_date: Optional[date] = None
    receipt_date: Optional[date] = None
    port: Optional[str] = None
    dc: DC


class OpenPORow(BaseModel):
    po_id: str
    sku: str
    qty: int
    expected_arrival: date
    dc: DC
    ship_method: str
    delay_flag: bool


class SupplierRow(BaseModel):
    supplier_id: str
    country: str
    moq: int
    lead_time_days: int
    payment_terms: str
    port: str


class ChargebackRow(BaseModel):
    date: date
    channel: str
    customer_id: str
    dc: DC
    cause_code: CauseCode
    amount: float
    order_id: str


class SKURow(BaseModel):
    sku: str
    product_name: str
    brand: str
    category: str
    pack_size: str
    units_per_case: int
    shelf_life_days: int
    supplier_id: str


class TransferRow(BaseModel):
    date: date
    sku: str
    qty: int
    origin_dc: DC
    dest_dc: DC
    freight_cost: float
    reason: str


class FreightRow(BaseModel):
    origin: DC
    destination: DC
    cost_per_pallet: float
