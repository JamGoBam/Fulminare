"""User-facing labels for the 3 DCs. Single source of truth.

Canonical codes (DC_EAST/WEST/CENTRAL) stay in the DB, analytics, URLs,
and the chatbot tool interface. Only the human labels shown to users
live here. Change a city? Edit this dict and the frontend's dc-labels.ts.
"""
from __future__ import annotations

DC_LABELS: dict[str, str] = {
    "DC_WEST": "DC SF",       # San Francisco
    "DC_CENTRAL": "DC LA",    # Los Angeles
    "DC_EAST": "DC NJ",       # New Jersey
}


def dc_label(code: str) -> str:
    """Return the user-facing label for a DC code, or the code itself if unknown."""
    return DC_LABELS.get(code, code)
