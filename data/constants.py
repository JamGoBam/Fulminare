"""Locked constants — see CLAUDE.md 'Do not re-derive'. Edit here only, never inline."""
from __future__ import annotations

from enum import StrEnum


class DC(StrEnum):
    EAST = "DC_EAST"
    WEST = "DC_WEST"
    CENTRAL = "DC_CENTRAL"


# Map source-data DC labels to canonical codes.
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
    # Real POP location codes: 1=San Francisco, 2=New Jersey, 3=Los Angeles
    "1": DC.WEST,
    "2": DC.EAST,
    "3": DC.CENTRAL,
    "sf": DC.WEST,
    "SF": DC.WEST,
    "nj": DC.EAST,
    "NJ": DC.EAST,
    "la": DC.CENTRAL,
    "LA": DC.CENTRAL,
}

# Maps real POP chargeback cause codes -> canonical CauseCode values.
REAL_CAUSE_CODE_MAP: dict[str, str] = {
    # TPR / Promotional (planned, filtered from risk)
    "CRED01": "TPR", "CRED02": "TPR", "CRED03": "TPR", "CRED04": "TPR",
    "CRED05": "TPR", "CRED06": "TPR", "CRED07": "TPR", "CRED10-D": "TPR",
    "CRED17": "TPR", "CRED19": "TPR", "CRED20": "TPR",
    "CRED-COM": "TPR", "CRED-DIS": "TPR", "CRED-PRO": "TPR",
    # DAMAGE
    "CRED08": "DAMAGE", "CRED-DMG": "DAMAGE", "CRED-SDT": "DAMAGE",
    "CRED15": "DAMAGE", "CRED16": "DAMAGE",
    # SHORT_SHIP (fulfillment failures)
    "CRED-FUL": "SHORT_SHIP", "CRED21": "SHORT_SHIP",
    # LATE_DELIVERY (shipping/logistics penalties)
    "CRED11-F": "LATE_DELIVERY", "CRED18": "LATE_DELIVERY",
    "CRED13": "LATE_DELIVERY", "CRED-TRF": "LATE_DELIVERY",
    # MISSED_WINDOW (compliance, audits, misc penalties)
    "CRED11-O": "MISSED_WINDOW", "CRED12": "MISSED_WINDOW",
    "CRED09": "MISSED_WINDOW", "CRED10": "MISSED_WINDOW",
    "CRED14": "MISSED_WINDOW", "CRED99": "MISSED_WINDOW",
    "CRED-OTH": "MISSED_WINDOW", "CRED-STO": "MISSED_WINDOW",
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
