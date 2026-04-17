# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Ship **Transfer-vs-Wait decision engine + AI chatbot for non-technical ops managers**. Keep the J-72402 demo narrative intact. Full roadmap in `shared/roadmap.md` (Phase 0 → 5).

## LAST SESSION SUMMARY
- Shipped Phase 1a: `analytics/chargeback.py` now exports `top_causes`, `top_customers`, `top_channels`, `by_dc`, `monthly_trend`, `penalty_rate` — all TPR-filtered. `penalty_rate` implements the 4-level fallback chain (customer+channel+dc → channel+dc → dc → global).
- `tests/test_chargeback.py` extended: 15 new test cases (TPR exclusion, column shapes, n-respected, fallback chain incl. TPR-not-in-global). Full suite: 44/44 passing.
- Existing `chargeback_summary` unchanged; `_no_tpr` helper extracted to avoid duplication.

## NEXT TASK
**Phase 1b — Rewrite `analytics/transfer.py`** per `shared/roadmap.md` § "Phase 1 → 1b". One commit.

Acceptance criteria:
1. Function signature:
   ```python
   def transfer_recommendations(
       inventory_df, sales_df, skus_df, freight_df,
       open_po_df, chargebacks_df,
   ) -> pd.DataFrame
   ```
2. Output columns: `sku, product_name, dest_dc, action, origin_dc, qty, transfer_cost, inbound_po_id, inbound_eta, inbound_qty, days_to_stockout, penalty_avoided, net_saving, reason`. `action ∈ {"TRANSFER", "WAIT"}`.
3. **WAIT** when inbound PO arrives before stockout AND lifts DoS ≥ `DOS_WARNING` (30). Apply `delay_flag +7d` shift.
4. **TRANSFER** when no qualifying PO: best origin where DoS_after_transfer ≥ `DOS_WARNING` (origin-protection). Prefer largest cushion, tie-break by freight cost.
5. **WAIT** with escalation reason when no protected origin available.
6. `penalty_avoided = penalty_rate(dominant_customer, dominant_channel, dest_dc) × expected_shortfall_units`. Dominant = last 90 days of sales.
7. `net_saving = penalty_avoided - transfer_cost` (0 for WAIT). Emit only if net > 0 OR action=WAIT.
8. Exactly one row per `(sku, dest_dc)`.
9. `tests/test_transfer.py` covers 5 cases: (i) WAIT when inbound in time, (ii) TRANSFER when no inbound, (iii) origin-protection rejects, (iv) `delay_flag` flips WAIT→TRANSFER, (v) one row per (sku, dest_dc).
10. `pytest -q` → 44 + new tests all passing.

Commit message: `[LOGIC] transfer: rewrite with open_po, delay_flag, origin-protection, penalty_rate`

Then continue with Phase 1c (`analytics/alerts.py`) if context permits.

## FILES IN PLAY
- `analytics/transfer.py` — full rewrite
- `tests/test_transfer.py` — add 5 test cases
- `analytics/chargeback.py` — already has `penalty_rate` (read-only)
- `analytics/forecast.py` — has `demand_rate` (read-only)
- `analytics/metrics.py` — has `days_of_supply`, `transfer_cost` (read-only)
- `data/constants.py` — has `DOS_WARNING`, `INTER_DC_TRANSIT_DAYS`, `CASES_PER_PALLET` (read-only)

## LOCKED / DO NOT TOUCH
- Hero SKU **J-72402** and its demo numbers (48/6094/480 across East/West/Central; $13,680 annual banner)
- `demo/scenario.md` narrative and the 5-step walkthrough
- Existing `chargeback_summary` in `analytics/chargeback.py`
- `web/frontend/lib/api.ts` (Phase 0 work)
- All entries in `CLAUDE.md` § "Do not re-derive" (14 items, incl. delay_flag +7d = locked assumption #11)

## BLOCKERS
- Phase 0–2 have none.
- Phase 3 (chatbot) requires `ANTHROPIC_API_KEY` in environment before end-to-end verification.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then read shared/roadmap.md for the full phase breakdown. Implement the NEXT TASK (Phase 1b) exactly as specified. Follow the Context budget & handoff protocol from CLAUDE.md — commit small, push often, hand off when context hits 25%.
```
