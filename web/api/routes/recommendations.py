"""Recommendation endpoints: /api/recommend/transfers, /api/alerts.

TODO(CLAUDE.md Block 7): wire to analytics.transfer + analytics.alerts.
"""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()
