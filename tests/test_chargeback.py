"""Tests for analytics.chargeback — TPR exclusion, aggregation shapes, penalty_rate fallback."""
from __future__ import annotations

import pandas as pd
import pytest

from analytics.chargeback import (
    by_dc,
    chargeback_summary,
    monthly_trend,
    penalty_rate,
    top_causes,
    top_channels,
    top_customers,
)


def _make_df(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


@pytest.fixture()
def sample_df() -> pd.DataFrame:
    """10 rows: 4 TPR (should be filtered), 6 penalty events across 2 customers/channels/DCs."""
    return _make_df([
        # TPR — must be excluded everywhere
        {"date": "2025-01-10", "cause_code": "TPR", "channel": "RETAIL", "dc": "DC_EAST",
         "customer_id": "C1", "amount": 500.0, "order_id": "O01"},
        {"date": "2025-01-11", "cause_code": "TPR", "channel": "RETAIL", "dc": "DC_EAST",
         "customer_id": "C1", "amount": 300.0, "order_id": "O02"},
        {"date": "2025-02-01", "cause_code": "TPR", "channel": "ECOM",   "dc": "DC_WEST",
         "customer_id": "C2", "amount": 200.0, "order_id": "O03"},
        {"date": "2025-02-15", "cause_code": "TPR", "channel": "ECOM",   "dc": "DC_WEST",
         "customer_id": "C2", "amount": 150.0, "order_id": "O04"},
        # Penalty rows — kept
        {"date": "2025-01-05", "cause_code": "SHORT_SHIP",    "channel": "RETAIL", "dc": "DC_EAST",
         "customer_id": "C1", "amount": 100.0, "order_id": "O05"},
        {"date": "2025-01-20", "cause_code": "SHORT_SHIP",    "channel": "RETAIL", "dc": "DC_EAST",
         "customer_id": "C1", "amount": 200.0, "order_id": "O06"},
        {"date": "2025-01-25", "cause_code": "SHORT_SHIP",    "channel": "RETAIL", "dc": "DC_EAST",
         "customer_id": "C1", "amount": 150.0, "order_id": "O07"},
        {"date": "2025-02-03", "cause_code": "LATE_DELIVERY", "channel": "ECOM",   "dc": "DC_WEST",
         "customer_id": "C2", "amount": 80.0,  "order_id": "O08"},
        {"date": "2025-02-10", "cause_code": "DAMAGE",        "channel": "ECOM",   "dc": "DC_WEST",
         "customer_id": "C2", "amount": 60.0,  "order_id": "O09"},
        {"date": "2025-03-01", "cause_code": "MISSED_WINDOW", "channel": "RETAIL", "dc": "DC_CENTRAL",
         "customer_id": "C3", "amount": 40.0,  "order_id": "O10"},
    ])


# ── TPR exclusion ──────────────────────────────────────────────────────────────

def test_chargeback_summary_excludes_tpr(sample_df):
    result = chargeback_summary(sample_df)
    assert "TPR" not in result["cause_code"].values


def test_top_causes_excludes_tpr(sample_df):
    result = top_causes(sample_df)
    assert "TPR" not in result["cause_code"].values


def test_top_customers_excludes_tpr(sample_df):
    # TPR rows are for C1 and C2; without them C1's total is 450, not 1050
    result = top_customers(sample_df)
    c1_row = result[result["customer_id"] == "C1"]
    assert float(c1_row["total_amount"].iloc[0]) == pytest.approx(450.0)


# ── Shape / column checks ──────────────────────────────────────────────────────

def test_top_causes_columns_and_pct(sample_df):
    result = top_causes(sample_df, n=3)
    assert list(result.columns) == ["cause_code", "total_amount", "count", "pct_of_total"]
    assert len(result) <= 3
    assert result["pct_of_total"].sum() == pytest.approx(100.0, abs=0.2)


def test_top_customers_columns(sample_df):
    result = top_customers(sample_df, n=5)
    assert list(result.columns) == ["customer_id", "total_amount", "count"]
    assert len(result) <= 5


def test_top_channels_columns(sample_df):
    result = top_channels(sample_df, n=2)
    assert list(result.columns) == ["channel", "total_amount"]
    assert len(result) <= 2


def test_by_dc_columns(sample_df):
    result = by_dc(sample_df)
    assert list(result.columns) == ["dc", "total_amount"]
    assert set(result["dc"]) <= {"DC_EAST", "DC_WEST", "DC_CENTRAL"}


def test_monthly_trend_columns_and_format(sample_df):
    result = monthly_trend(sample_df)
    assert list(result.columns) == ["month", "total_amount"]
    # All months must match YYYY-MM
    import re
    assert all(re.match(r"^\d{4}-\d{2}$", m) for m in result["month"])
    # Should be in ascending order
    assert list(result["month"]) == sorted(result["month"])


def test_top_causes_n_respected(sample_df):
    assert len(top_causes(sample_df, n=2)) == 2


def test_top_customers_n_respected(sample_df):
    assert len(top_customers(sample_df, n=1)) == 1


# ── penalty_rate fallback chain ────────────────────────────────────────────────

def test_penalty_rate_exact_match(sample_df):
    # C1 / RETAIL / DC_EAST has 3 rows: 100, 200, 150 → mean 150
    rate = penalty_rate(sample_df, "C1", "RETAIL", "DC_EAST")
    assert rate == pytest.approx(150.0)


def test_penalty_rate_channel_dc_fallback(sample_df):
    # C_UNKNOWN has no rows for RETAIL/DC_EAST but channel+dc has 3 rows (C1's rows)
    rate = penalty_rate(sample_df, "C_UNKNOWN", "RETAIL", "DC_EAST")
    assert rate == pytest.approx(150.0)


def test_penalty_rate_dc_fallback(sample_df):
    # Use a channel that exists nowhere → falls back to DC_EAST only (3 rows, mean 150)
    rate = penalty_rate(sample_df, "C_UNKNOWN", "NO_CHANNEL", "DC_EAST")
    assert rate == pytest.approx(150.0)


def test_penalty_rate_global_fallback(sample_df):
    # DC_UNKNOWN has 0 rows → falls to global (6 non-TPR rows: 100+200+150+80+60+40 / 6 = 105)
    rate = penalty_rate(sample_df, "C_UNKNOWN", "NO_CHANNEL", "DC_UNKNOWN")
    assert rate == pytest.approx(105.0)


def test_penalty_rate_tpr_not_included_in_global(sample_df):
    # TPR rows have high amounts (500+300+200+150); global must not include them
    rate = penalty_rate(sample_df, "C_UNKNOWN", "NO_CHANNEL", "DC_UNKNOWN")
    # If TPR were included: (100+200+150+80+60+40+500+300+200+150)/10 = 178
    assert rate != pytest.approx(178.0)
    assert rate == pytest.approx(105.0)
