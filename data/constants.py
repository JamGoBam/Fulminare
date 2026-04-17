"""Locked constants — see CLAUDE.md 'Do not re-derive'. Edit here only, never inline."""
from __future__ import annotations

from enum import StrEnum


class DC(StrEnum):
    EAST = "DC_EAST"
    WEST = "DC_WEST"
    CENTRAL = "DC_CENTRAL"


# Map source-data DC labels to canonical codes.
# Canonical names are included as pass-through so freight.csv (which already uses DC_EAST etc.)
# round-trips cleanly. Add real POP source labels here when raw CSVs arrive (Block 4).
DC_MAP: dict[str, DC] = {
    # Canonical pass-through
    "DC_EAST": DC.EAST,
    "DC_WEST": DC.WEST,
    "DC_CENTRAL": DC.CENTRAL,
    # Short labels used in seed data
    "EAST": DC.EAST,
    "WEST": DC.WEST,
    "CENTRAL": DC.CENTRAL,
    # Mixed-case variants (defensive)
    "East": DC.EAST,
    "West": DC.WEST,
    "Central": DC.CENTRAL,
    # TODO(Block 4): add real POP DC codes here, e.g. "ATL": DC.EAST
}


class CauseCode(StrEnum):
    SHORT_SHIP = "SHORT_SHIP"
    LATE_DELIVERY = "LATE_DELIVERY"
    DAMAGE = "DAMAGE"
    MISSED_WINDOW = "MISSED_WINDOW"
    TPR = "TPR"  # trade promo — planned, NOT a penalty; filtered from risk analysis


RISK_CAUSE_CODES: frozenset[CauseCode] = frozenset(
    {CauseCode.SHORT_SHIP, CauseCode.LATE_DELIVERY, CauseCode.DAMAGE, CauseCode.MISSED_WINDOW}
)

DOS_CRITICAL = 14
DOS_WARNING = 30
DOS_TARGET = 90

CASES_PER_PALLET = 40
INTER_DC_TRANSIT_DAYS = 3

DEMAND_WINDOW_DAYS = 30
