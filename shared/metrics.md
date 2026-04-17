# Metric definitions (human-readable mirror of CLAUDE.md)

For frontend copy, tooltips, and the deck. Formulas live in `analytics/metrics.py`; this file is for language, not computation.

## Demand rate
Units per day, per SKU per DC. Computed from the trailing 30 days of sales.
**UI label**: "Daily demand"

## Days of supply (DoS)
How many days the on-hand inventory lasts at the current demand rate. Infinite if demand is zero.

Thresholds:
- **Critical** — less than 14 days. Red.
- **Warning** — less than 30 days. Amber.
- **Target** — around 90 days. Green.

**UI label**: "Days of supply" / "DoS"

## Imbalance score
How uneven a SKU is across the 3 DCs. A SKU split evenly is ~0; one stranded at a single DC is near 10.
**UI label**: "Imbalance"

## Transfer cost
Dollar cost of moving stock between DCs. Based on pallets × freight rate. Assumes 40 cases per pallet.
**UI label**: "Move cost"

## Chargeback risk score
Expected dollar penalty if we do nothing — probability of stockout × historical penalty for that customer/channel/DC.
**UI label**: "Risk ($)"

## OTIF risk
Probability of missing On-Time-In-Full on the next order for this SKU/channel. 0 = perfectly reliable, 1 = certain miss.
**UI label**: "OTIF risk"
