"""Tests for data/ingest.py — one test per CSV loader + DC normalization + full pipeline."""
from __future__ import annotations

from pathlib import Path

import duckdb
import pytest

from data.constants import DC
from data.ingest import load_table, run

SEED = Path("data/seed")
_DC_CANONICAL = {dc.value for dc in DC}  # {"DC_EAST", "DC_WEST", "DC_CENTRAL"}


def test_load_inventory():
    df = load_table("inventory", SEED)
    assert len(df) > 0
    assert "dc" in df.columns


def test_load_sales():
    df = load_table("sales", SEED)
    assert len(df) > 0
    assert "ship_from_dc" in df.columns


def test_load_po_history():
    """Optional date fields (ship_date, receipt_date) may be None — must not crash."""
    df = load_table("po_history", SEED)
    assert len(df) > 0
    assert "ship_date" in df.columns


def test_load_open_po():
    df = load_table("open_po", SEED)
    assert len(df) > 0
    assert df["delay_flag"].isin([True, False]).all()


def test_load_suppliers():
    df = load_table("suppliers", SEED)
    assert len(df) > 0
    assert "lead_time_days" in df.columns


def test_load_chargebacks():
    df = load_table("chargebacks", SEED)
    assert len(df) > 0
    assert "cause_code" in df.columns


def test_load_skus():
    df = load_table("skus", SEED)
    assert len(df) > 0
    assert "units_per_case" in df.columns


def test_load_transfers():
    df = load_table("transfers", SEED)
    assert len(df) > 0
    assert {"origin_dc", "dest_dc"}.issubset(df.columns)


def test_load_freight():
    df = load_table("freight", SEED)
    assert len(df) > 0
    assert "cost_per_pallet" in df.columns


def test_dc_normalization():
    """Seed CSVs use short labels (EAST/WEST/CENTRAL); output must be canonical DC values."""
    checks = [
        ("inventory", "dc"),
        ("sales", "ship_from_dc"),
        ("transfers", "origin_dc"),
        ("transfers", "dest_dc"),
    ]
    for table, col in checks:
        df = load_table(table, SEED)
        bad = set(df[col].astype(str).unique()) - _DC_CANONICAL
        assert not bad, f"{table}.{col} has non-canonical values: {bad}"


def test_run_produces_parquets_and_duckdb(tmp_path):
    """Full pipeline: all 9 parquets exist and DuckDB inventory view is queryable."""
    run(SEED, tmp_path, tmp_path / "pop.duckdb")

    for name in ["inventory", "sales", "po_history", "open_po", "suppliers",
                 "chargebacks", "skus", "transfers", "freight"]:
        assert (tmp_path / f"{name}.parquet").exists(), f"Missing: {name}.parquet"

    conn = duckdb.connect(str(tmp_path / "pop.duckdb"))
    count = conn.execute("SELECT COUNT(*) FROM inventory").fetchone()[0]
    conn.close()
    assert count > 0
