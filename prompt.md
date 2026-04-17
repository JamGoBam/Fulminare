# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Ship **Transfer-vs-Wait decision engine + AI chatbot for non-technical ops managers**. Keep the J-72402 demo narrative intact. Full roadmap in `shared/roadmap.md` (Phase 0 → 5).

## LAST SESSION SUMMARY
- Shipped Phase 1b: `analytics/transfer.py` fully rewritten — new signature includes `open_po_df` and `chargebacks_df`; one row per `(sku, dest_dc)`; WAIT for qualifying inbound PO (with `delay_flag +7d` shift); TRANSFER with origin-protection (`dos_origin_after >= DOS_WARNING`); WAIT-escalation when no protected origin; `penalty_rate` replaces flat `$15/unit` proxy.
- `tests/test_transfer.py`: 6 tests covering all 5 acceptance criteria (WAIT on inbound, TRANSFER on no inbound, origin-protection rejection, delay_flag flip, one-row guarantee). Full suite: 50/50 passing.
- Old flat `_PENALTY_PER_UNIT = 15.0` removed; `chargeback.penalty_rate` used throughout.

## NEXT TASK
**Phase 1c — Implement `analytics/alerts.py`** per `shared/roadmap.md` § "Phase 1 → 1c". One commit.

Acceptance criteria:
1. Function:
   ```python
   def rank_alerts(imbalance_df, transfer_df, chargebacks_df, n=10) -> pd.DataFrame
   ```
   Output columns: `rank, sku, dc, priority_score, action, reason, days_to_stockout, exposure_dollars`
2. Priority formula: `normalize(imbalance) + normalize(annual_exposure) + urgency(1/max(days_to_stockout, 1))`. All 3 components normalized to [0,1] within the result set.
3. WAIT-with-inbound-relief rows rank lower than TRANSFER rows with same score.
4. `reason` is plain-English ops-manager prose (not dev jargon).
5. `tests/test_alerts.py` (new): ranking order is descending by priority, inbound-relief row ranks lower, reason non-empty.
6. `pytest -q` → 50 + new tests all passing.

**Also wire `analytics/pipeline.py`** per Phase 1d (same commit or next):
- `run(processed_dir)` reads all parquets, orchestrates imbalance → chargeback functions → transfer → alerts, writes output parquets.
- CLI entry: `python -m analytics.pipeline`.

Commit message: `[LOGIC] alerts: rank_alerts + pipeline orchestration`

Then hand off to Phase 1e (tests) or Phase 2 (API surface) if 1c/1d are done in the same session.

## FILES IN PLAY
- `analytics/alerts.py` — implement `rank_alerts`
- `analytics/pipeline.py` — wire orchestration
- `tests/test_alerts.py` — new, 3+ tests
- `analytics/imbalance.py` — read `compute_imbalance` signature (read-only)

## LOCKED / DO NOT TOUCH
- Hero SKU **J-72402** and its demo numbers
- `demo/scenario.md` narrative and the 5-step walkthrough
- `analytics/transfer.py` (just rewritten — do not change)
- `analytics/chargeback.py` (Phase 1a — do not change)
- All entries in `CLAUDE.md` § "Do not re-derive" (14 items)

## BLOCKERS
- Phase 0–2 have none.
- Phase 3 (chatbot) requires `ANTHROPIC_API_KEY` in environment before end-to-end verification.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then read shared/roadmap.md for the full phase breakdown. Implement the NEXT TASK (Phase 1c) exactly as specified. Follow the Context budget & handoff protocol from CLAUDE.md — commit small, push often, hand off when context hits 25%.
```
