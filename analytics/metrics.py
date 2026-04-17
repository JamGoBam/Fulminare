"""Shared metric primitives: days_of_supply, imbalance_score, transfer_cost.

Formulas mirror CLAUDE.md 'Core metrics' exactly — do not deviate.
"""
from __future__ import annotations

import math


def days_of_supply(available: float, rate: float) -> float:
    """Return available / rate. Returns inf if rate == 0."""
    if rate == 0:
        return float("inf")
    return available / rate


def imbalance_score(dos_values: list[float]) -> float:
    """Return (max - min) / mean clamped to [0, 10]. Returns 0.0 for <2 DCs or zero mean."""
    if len(dos_values) < 2:
        return 0.0
    if all(math.isinf(v) for v in dos_values):
        return 0.0
    finite = [v for v in dos_values if not math.isinf(v)]
    mean_val = sum(finite) / len(finite)
    if mean_val == 0:
        return 0.0
    # Any inf means one DC has no demand while another does — max imbalance
    if any(math.isinf(v) for v in dos_values):
        return 10.0
    score = (max(dos_values) - min(dos_values)) / mean_val
    return min(float(score), 10.0)


def transfer_cost(qty: float, units_per_case: int, cost_per_pallet: float, cases_per_pallet: int = 40) -> float:
    """Return freight cost for transferring qty units. Partial pallets round UP."""
    pallets = math.ceil(qty / (units_per_case * cases_per_pallet))
    return cost_per_pallet * pallets
