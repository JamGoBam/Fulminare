"""Tests for analytics.metrics and analytics.forecast primitives."""
import math
import pandas as pd
import pytest

from analytics.metrics import days_of_supply, imbalance_score, transfer_cost
from analytics.forecast import demand_rate


# --- demand_rate ---

def _make_sales(rows: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    return df


def test_demand_rate_basic():
    sales = _make_sales([
        {"date": "2026-04-15", "sku": "SKU-001", "ship_from_dc": "DC_EAST", "qty": 30},
        {"date": "2026-04-14", "sku": "SKU-001", "ship_from_dc": "DC_EAST", "qty": 60},
    ])
    rate = demand_rate(sales, "SKU-001", "DC_EAST", window_days=30)
    assert rate == pytest.approx(90 / 30)


def test_demand_rate_zero_when_no_sales():
    sales = _make_sales([
        {"date": "2026-04-15", "sku": "SKU-001", "ship_from_dc": "DC_EAST", "qty": 30},
    ])
    rate = demand_rate(sales, "SKU-999", "DC_EAST", window_days=30)
    assert rate == 0.0


def test_demand_rate_excludes_other_dc():
    sales = _make_sales([
        {"date": "2026-04-15", "sku": "SKU-001", "ship_from_dc": "DC_WEST", "qty": 300},
        {"date": "2026-04-14", "sku": "SKU-001", "ship_from_dc": "DC_EAST", "qty": 30},
    ])
    rate = demand_rate(sales, "SKU-001", "DC_EAST", window_days=30)
    assert rate == pytest.approx(30 / 30)


def test_demand_rate_empty_df():
    sales = pd.DataFrame(columns=["date", "sku", "ship_from_dc", "qty"])
    assert demand_rate(sales, "SKU-001", "DC_EAST") == 0.0


# --- days_of_supply ---

def test_dos_normal():
    assert days_of_supply(90.0, 3.0) == pytest.approx(30.0)


def test_dos_zero_available():
    assert days_of_supply(0.0, 5.0) == pytest.approx(0.0)


def test_dos_zero_rate_returns_inf():
    assert math.isinf(days_of_supply(100.0, 0.0))


def test_dos_both_zero_returns_inf():
    assert math.isinf(days_of_supply(0.0, 0.0))


# --- imbalance_score ---

def test_imbalance_balanced():
    score = imbalance_score([30.0, 30.0, 30.0])
    assert score == pytest.approx(0.0)


def test_imbalance_single_dc_returns_zero():
    assert imbalance_score([45.0]) == 0.0


def test_imbalance_critical():
    # DC_EAST=2, DC_WEST=100, DC_CENTRAL=50; mean=50.67, max-min=98 → score≈1.93
    score = imbalance_score([2.0, 100.0, 50.0])
    expected = (100.0 - 2.0) / (152.0 / 3)
    assert score == pytest.approx(expected, rel=1e-4)


def test_imbalance_clamps_to_10():
    score = imbalance_score([0.1, 1000.0, 500.0])
    assert score <= 10.0


def test_imbalance_one_dc_inf_returns_10():
    score = imbalance_score([float("inf"), 30.0, 15.0])
    assert score == 10.0


def test_imbalance_all_inf_returns_zero():
    score = imbalance_score([float("inf"), float("inf"), float("inf")])
    assert score == 0.0


# --- transfer_cost ---

def test_transfer_cost_exact_pallet():
    # 400 units, 10 units/case, 40 cases/pallet → 1 pallet exactly
    cost = transfer_cost(qty=400, units_per_case=10, cost_per_pallet=250.0)
    assert cost == pytest.approx(250.0)


def test_transfer_cost_partial_pallet_rounds_up():
    # 401 units → needs 2 pallets
    cost = transfer_cost(qty=401, units_per_case=10, cost_per_pallet=250.0)
    assert cost == pytest.approx(500.0)


def test_transfer_cost_small_qty():
    # 1 unit → still 1 pallet
    cost = transfer_cost(qty=1, units_per_case=12, cost_per_pallet=200.0)
    assert cost == pytest.approx(200.0)


def test_transfer_cost_custom_cases_per_pallet():
    # 100 units, 5 units/case → 20 cases; at 10 cases/pallet → 2 pallets
    cost = transfer_cost(qty=100, units_per_case=5, cost_per_pallet=300.0, cases_per_pallet=10)
    assert cost == pytest.approx(600.0)
