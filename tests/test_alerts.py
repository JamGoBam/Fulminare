"""Tests for analytics.alerts.rank_alerts."""
from __future__ import annotations

import pandas as pd
import pytest

from analytics.alerts import rank_alerts


def _imbalance_row(sku: str, dc: str, dos: float, imbalance: float,
                   status: str = "critical") -> dict:
    return {
        "sku": sku, "dc": dc, "dos": dos,
        "imbalance_score": imbalance, "status": status,
        "demand_rate": 10.0,
    }


def _transfer_row(
    sku: str, dc: str, action: str = "TRANSFER", *,
    origin_dc: str | None = "DC_WEST",
    qty: int | None = 200,
    days_to_stockout: float = 5.0,
    penalty_avoided: float = 5000.0,
    net_saving: float = 4800.0,
    inbound_po_id: str | None = None,
    inbound_eta: str | None = None,
    inbound_qty: int | None = None,
) -> dict:
    return {
        "sku": sku, "dest_dc": dc, "action": action,
        "origin_dc": origin_dc, "qty": qty,
        "transfer_cost": 200.0, "inbound_po_id": inbound_po_id,
        "inbound_eta": inbound_eta, "inbound_qty": inbound_qty,
        "days_to_stockout": days_to_stockout,
        "penalty_avoided": penalty_avoided, "net_saving": net_saving,
        "reason": "technical reason",
    }


@pytest.fixture()
def two_alert_dfs():
    """Critical SKU-A (TRANSFER) and warning SKU-B (WAIT with inbound)."""
    imbalance = pd.DataFrame([
        _imbalance_row("SKU-A", "DC_EAST", dos=5.0, imbalance=8.0, status="critical"),
        _imbalance_row("SKU-B", "DC_WEST", dos=20.0, imbalance=4.0, status="warning"),
    ])
    transfer = pd.DataFrame([
        _transfer_row("SKU-A", "DC_EAST", action="TRANSFER",
                      days_to_stockout=5.0, penalty_avoided=5000.0, net_saving=4800.0),
        _transfer_row("SKU-B", "DC_WEST", action="WAIT",
                      origin_dc=None, qty=None,
                      days_to_stockout=20.0, penalty_avoided=2000.0, net_saving=2000.0,
                      inbound_po_id="PO-001", inbound_eta="2026-02-01", inbound_qty=300),
    ])
    chargebacks = pd.DataFrame(columns=["date", "channel", "customer_id", "dc",
                                        "cause_code", "amount", "order_id"])
    return imbalance, transfer, chargebacks


# ── Output shape ───────────────────────────────────────────────────────────────

def test_output_columns(two_alert_dfs):
    imb, trf, cbs = two_alert_dfs
    result = rank_alerts(imb, trf, cbs)
    assert list(result.columns) == [
        "rank", "sku", "dc", "priority_score", "action",
        "reason", "days_to_stockout", "exposure_dollars",
    ]


def test_n_respected(two_alert_dfs):
    imb, trf, cbs = two_alert_dfs
    result = rank_alerts(imb, trf, cbs, n=1)
    assert len(result) == 1


def test_empty_when_no_deficit():
    imb = pd.DataFrame([
        _imbalance_row("SKU-OK", "DC_EAST", dos=60.0, imbalance=0.5, status="ok"),
    ])
    trf = pd.DataFrame(columns=[
        "sku", "dest_dc", "action", "origin_dc", "qty", "transfer_cost",
        "inbound_po_id", "inbound_eta", "inbound_qty",
        "days_to_stockout", "penalty_avoided", "net_saving", "reason",
    ])
    cbs = pd.DataFrame(columns=["date", "channel", "customer_id", "dc",
                                 "cause_code", "amount", "order_id"])
    result = rank_alerts(imb, trf, cbs)
    assert len(result) == 0


# ── Ranking order ──────────────────────────────────────────────────────────────

def test_ranking_descending_by_priority(two_alert_dfs):
    """Rows must be in descending priority_score order."""
    imb, trf, cbs = two_alert_dfs
    result = rank_alerts(imb, trf, cbs)
    scores = result["priority_score"].tolist()
    assert scores == sorted(scores, reverse=True)


def test_rank_column_is_1_based(two_alert_dfs):
    imb, trf, cbs = two_alert_dfs
    result = rank_alerts(imb, trf, cbs)
    assert list(result["rank"]) == list(range(1, len(result) + 1))


# ── WAIT-with-inbound-relief ranks lower ──────────────────────────────────────

def test_wait_inbound_ranks_lower_than_transfer(two_alert_dfs):
    """SKU-A (TRANSFER) should rank above SKU-B (WAIT with inbound PO)."""
    imb, trf, cbs = two_alert_dfs
    result = rank_alerts(imb, trf, cbs)
    transfer_rank = result[result["sku"] == "SKU-A"]["rank"].iloc[0]
    wait_rank = result[result["sku"] == "SKU-B"]["rank"].iloc[0]
    assert transfer_rank < wait_rank


def test_equal_priority_wait_inbound_demoted():
    """Two rows with equal raw scores — WAIT-with-inbound must score lower after demotion."""
    imbalance = pd.DataFrame([
        _imbalance_row("SKU-X", "DC_EAST", dos=10.0, imbalance=5.0, status="critical"),
        _imbalance_row("SKU-Y", "DC_EAST", dos=10.0, imbalance=5.0, status="critical"),
    ])
    transfer = pd.DataFrame([
        # Both have identical raw scores; SKU-Y has inbound PO → demoted
        _transfer_row("SKU-X", "DC_EAST", action="TRANSFER",
                      days_to_stockout=10.0, penalty_avoided=3000.0, net_saving=2800.0),
        _transfer_row("SKU-Y", "DC_EAST", action="WAIT",
                      origin_dc=None, qty=None,
                      days_to_stockout=10.0, penalty_avoided=3000.0, net_saving=3000.0,
                      inbound_po_id="PO-Z", inbound_eta="2026-02-10", inbound_qty=250),
    ])
    cbs = pd.DataFrame(columns=["date", "channel", "customer_id", "dc",
                                 "cause_code", "amount", "order_id"])
    result = rank_alerts(imbalance, transfer, cbs)
    x_score = result[result["sku"] == "SKU-X"]["priority_score"].iloc[0]
    y_score = result[result["sku"] == "SKU-Y"]["priority_score"].iloc[0]
    assert x_score > y_score


# ── Reason quality ─────────────────────────────────────────────────────────────

def test_reason_non_empty(two_alert_dfs):
    imb, trf, cbs = two_alert_dfs
    result = rank_alerts(imb, trf, cbs)
    assert result["reason"].notna().all()
    assert (result["reason"].str.strip() != "").all()


def test_reason_no_dev_jargon(two_alert_dfs):
    """Reason should mention plain concepts, not internal field names."""
    imb, trf, cbs = two_alert_dfs
    result = rank_alerts(imb, trf, cbs)
    for reason in result["reason"]:
        assert "dest_dc" not in reason
        assert "penalty_avoided" not in reason
        assert "net_saving" not in reason
