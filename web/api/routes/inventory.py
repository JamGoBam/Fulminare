"""Inventory endpoints: /api/imbalances, /api/sku/{sku}.

TODO(CLAUDE.md Block 5): implement endpoints reading from /data/processed/pop.duckdb.
"""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()
