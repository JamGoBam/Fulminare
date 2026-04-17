"""Tests for analytics.transfer.transfer_recommendations — 5 acceptance scenarios."""
from __future__ import annotations

import pandas as pd
import pytest

from analytics.transfer import transfer_recommendations

# ── Shared reference date ──────────────────────────────────────────────────────
TODAY = "2026-01-10"  # snapshot_date; open_po ETAs are relative to this


# ── Fixture helpers ────────────────────────────────────────────────────────────

def _inv(sku: str, dc: str, available: int) -> dict:
    return {
        "sku": sku, "dc": dc, "on_hand": available, "allocated": 0,
        "available": available, "unit_cost": 5.0, "snapshot_date": TODAY,
    }


def _sale(sku: str, dc: str, qty: int, date: str = "2026-01-09",
          customer: str = "CUST-A", channel: str = "Mass") -> dict:
    return {
        "date": pd.Timestamp(date), "sku": sku, "qty": qty, "unit_price": 5.0,
        "customer_id": customer, "channel": channel, "ship_from_dc": dc,
    }


def _po(po_id: str, sku: str, dc: str, qty: int, eta: str,
        delay_flag: bool = False) -> dict:
    return {
        "po_id": po_id, "sku": sku, "qty": qty,
        "expected_arrival": pd.Timestamp(eta),
        "dc": dc, "ship_method": "OCEAN", "delay_flag": delay_flag,
    }


def _cb(dc: str, amount: float, customer: str = "CUST-A",
        channel: str = "Mass") -> dict:
    return {
        "date": pd.Timestamp("2025-12-01"), "channel": channel,
        "customer_id": customer, "dc": dc, "cause_code": "SHORT_SHIP",
        "amount": amount, "order_id": "ORD-X",
    }


def _freight(origin: str, dest: str, cost: float = 200.0) -> dict:
    return {"origin": origin, "destination": dest, "cost_per_pallet": cost}


def _sku(sku: str, name: str = "Test Product", upc: int = 10) -> dict:
    return {
        "sku": sku, "product_name": name, "brand": "Brand", "category": "Cat",
        "pack_size": "10pk", "units_per_case": upc, "shelf_life_days": 365,
        "supplier_id": "SUP-1",
    }


def _base_dfs(
    *,
    east_avail: int = 100,
    west_avail: int = 600,
    central_avail: int = 0,
    east_sales_qty: int = 300,  # 300 units in 30-day window → 10/day → DoS = east_avail/10
    west_sales_qty: int = 300,
    central_sales_qty: int = 0,
    chargebacks: list[dict] | None = None,
    open_pos: list[dict] | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Build minimal DataFrames for SKU-A with one critical deficit DC (DC_EAST by default)."""
    sku = "SKU-A"

    inventory = pd.DataFrame([
        _inv(sku, "DC_EAST", east_avail),
        _inv(sku, "DC_WEST", west_avail),
        _inv(sku, "DC_CENTRAL", central_avail),
    ])

    sales_rows = []
    if east_sales_qty:
        sales_rows.append(_sale(sku, "DC_EAST", east_sales_qty))
    if west_sales_qty:
        sales_rows.append(_sale(sku, "DC_WEST", west_sales_qty))
    if central_sales_qty:
        sales_rows.append(_sale(sku, "DC_CENTRAL", central_sales_qty))
    sales = pd.DataFrame(sales_rows) if sales_rows else pd.DataFrame(
        columns=["date", "sku", "qty", "unit_price", "customer_id", "channel", "ship_from_dc"]
    )

    skus = pd.DataFrame([_sku(sku)])

    freight = pd.DataFrame([
        _freight("DC_WEST", "DC_EAST"),
        _freight("DC_CENTRAL", "DC_EAST"),
        _freight("DC_EAST", "DC_WEST"),
        _freight("DC_EAST", "DC_CENTRAL"),
        _freight("DC_WEST", "DC_CENTRAL"),
        _freight("DC_CENTRAL", "DC_WEST"),
    ])

    # 3 chargebacks for DC_EAST so penalty_rate uses exact match (mean=$100)
    default_cbs = [_cb("DC_EAST", 100.0), _cb("DC_EAST", 100.0), _cb("DC_EAST", 100.0)]
    cb_rows = chargebacks if chargebacks is not None else default_cbs
    chargebacks_df = pd.DataFrame(cb_rows) if cb_rows else pd.DataFrame(
        columns=["date", "channel", "customer_id", "dc", "cause_code", "amount", "order_id"]
    )

    po_rows = open_pos if open_pos is not None else []
    open_po_df = pd.DataFrame(po_rows) if po_rows else pd.DataFrame(
        columns=["po_id", "sku", "qty", "expected_arrival", "dc", "ship_method", "delay_flag"]
    )

    return inventory, sales, skus, freight, open_po_df, chargebacks_df


# ── Test (i): WAIT when inbound PO arrives in time ────────────────────────────

def test_wait_when_inbound_po_in_time():
    """PO arrives within days_to_stockout + 3 and lifts DoS >= 30 → WAIT."""
    # DC_EAST: avail=100, rate=10/day, DoS=10; PO arrives day 5 with 300 units
    # dos_after = (100+300)/10 = 40 >= 30 ✓; days_until=5 <= 10+3=13 ✓
    pos = [_po("PO-001", "SKU-A", "DC_EAST", 300, "2026-01-15")]
    inv, sales, skus, freight, open_po, cbs = _base_dfs(open_pos=pos)
    result = transfer_recommendations(inv, sales, skus, freight, open_po, cbs)

    east_row = result[result["dest_dc"] == "DC_EAST"]
    assert not east_row.empty
    assert east_row.iloc[0]["action"] == "WAIT"
    assert east_row.iloc[0]["inbound_po_id"] == "PO-001"
    assert east_row.iloc[0]["inbound_qty"] == 300
    assert east_row.iloc[0]["origin_dc"] is None


# ── Test (ii): TRANSFER when no qualifying inbound PO ─────────────────────────

def test_transfer_when_no_inbound_po():
    """No open PO → TRANSFER from DC_WEST (protected origin, net_saving > 0)."""
    # DC_EAST: avail=100, rate=10, DoS=10; qty_needed=200; cost=1 pallet × $200
    # DC_WEST: avail=600, rate=10, DoS=60; after transfer: 400 units, DoS=40 >= 30 ✓
    # penalty = $100/unit × 200 units = $20,000; net = 20000 - 200 = 19800 > 0
    inv, sales, skus, freight, open_po, cbs = _base_dfs(open_pos=[])
    result = transfer_recommendations(inv, sales, skus, freight, open_po, cbs)

    east_row = result[result["dest_dc"] == "DC_EAST"]
    assert not east_row.empty
    row = east_row.iloc[0]
    assert row["action"] == "TRANSFER"
    assert row["origin_dc"] == "DC_WEST"
    assert row["qty"] == 200
    assert row["net_saving"] > 0


# ── Test (iii): origin-protection blocks transfer → escalation WAIT ───────────

def test_wait_when_origin_protection_blocks():
    """All potential origins would drop below DoS_WARNING → WAIT with escalation reason."""
    # DC_WEST: avail=280, rate=10/day → DoS=28; after transfer (200 units): DoS=8 < 30 ✗
    # DC_CENTRAL: avail=280, rate=10/day → DoS=28; same issue ✗
    # No protected origin → WAIT
    inv, sales, skus, freight, open_po, cbs = _base_dfs(
        west_avail=280,
        central_avail=280,
        central_sales_qty=300,  # give DC_CENTRAL demand so its DoS can be computed
        open_pos=[],
    )
    result = transfer_recommendations(inv, sales, skus, freight, open_po, cbs)

    east_row = result[result["dest_dc"] == "DC_EAST"]
    assert not east_row.empty
    row = east_row.iloc[0]
    assert row["action"] == "WAIT"
    assert row["origin_dc"] is None
    assert "escalate" in row["reason"].lower()
    assert row["net_saving"] == 0.0


# ── Test (iv): delay_flag shifts ETA past window → TRANSFER instead of WAIT ───

def test_delay_flag_flips_wait_to_transfer():
    """PO would qualify without delay; delay_flag=True shifts ETA +7d past the window → TRANSFER."""
    # DC_EAST: DoS=10, window = 10+3=13
    # PO ETA 2026-01-20 = 10 days from today → without delay: 10 <= 13 → WAIT
    # With delay_flag=True: ETA = 2026-01-20 + 7 = 2026-01-27 = 17 days → 17 > 13 → NOT qualifying
    pos = [_po("PO-002", "SKU-A", "DC_EAST", 300, "2026-01-20", delay_flag=True)]
    inv, sales, skus, freight, open_po, cbs = _base_dfs(open_pos=pos)
    result = transfer_recommendations(inv, sales, skus, freight, open_po, cbs)

    east_row = result[result["dest_dc"] == "DC_EAST"]
    assert not east_row.empty
    row = east_row.iloc[0]
    assert row["action"] == "TRANSFER"
    assert row["inbound_po_id"] is None  # PO was not used


def test_no_delay_flag_yields_wait():
    """Same PO without delay_flag → ETA 10 days → qualifies → WAIT (control for test iv)."""
    pos = [_po("PO-002", "SKU-A", "DC_EAST", 300, "2026-01-20", delay_flag=False)]
    inv, sales, skus, freight, open_po, cbs = _base_dfs(open_pos=pos)
    result = transfer_recommendations(inv, sales, skus, freight, open_po, cbs)

    east_row = result[result["dest_dc"] == "DC_EAST"]
    assert not east_row.empty
    assert east_row.iloc[0]["action"] == "WAIT"


# ── Test (v): exactly one row per (sku, dest_dc) ──────────────────────────────

def test_one_row_per_sku_dest_dc():
    """Two deficit DCs (East and West) → exactly 2 rows, one per DC."""
    # DC_EAST: avail=100, rate=10, DoS=10 (critical)
    # DC_WEST: avail=200, rate=10, DoS=20 (warning)
    # DC_CENTRAL: avail=3000, rate=10, DoS=300 (surplus, can be origin for both)
    sku = "SKU-A"
    inventory = pd.DataFrame([
        _inv(sku, "DC_EAST", 100),
        _inv(sku, "DC_WEST", 200),
        _inv(sku, "DC_CENTRAL", 3000),
    ])
    sales = pd.DataFrame([
        _sale(sku, "DC_EAST", 300),
        _sale(sku, "DC_WEST", 300),
        _sale(sku, "DC_CENTRAL", 300),
    ])
    skus = pd.DataFrame([_sku(sku)])
    freight = pd.DataFrame([
        _freight("DC_CENTRAL", "DC_EAST"),
        _freight("DC_CENTRAL", "DC_WEST"),
        _freight("DC_EAST", "DC_WEST"),
        _freight("DC_WEST", "DC_EAST"),
        _freight("DC_EAST", "DC_CENTRAL"),
        _freight("DC_WEST", "DC_CENTRAL"),
    ])
    # Enough chargebacks for both DCs so penalty_rate > 0
    cbs = pd.DataFrame([
        _cb("DC_EAST", 100.0), _cb("DC_EAST", 100.0), _cb("DC_EAST", 100.0),
        _cb("DC_WEST", 100.0), _cb("DC_WEST", 100.0), _cb("DC_WEST", 100.0),
    ])
    open_po = pd.DataFrame(
        columns=["po_id", "sku", "qty", "expected_arrival", "dc", "ship_method", "delay_flag"]
    )

    result = transfer_recommendations(inventory, sales, skus, freight, open_po, cbs)

    sku_rows = result[result["sku"] == sku]
    assert len(sku_rows) == 2
    assert set(sku_rows["dest_dc"]) == {"DC_EAST", "DC_WEST"}
    # No duplicates
    assert sku_rows[["sku", "dest_dc"]].duplicated().sum() == 0
