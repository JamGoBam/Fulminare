"""Chargeback endpoints: /api/chargebacks (heatmap data + top-cause aggregates).

TODO(CLAUDE.md Block 7): wire to analytics.chargeback.
"""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()
