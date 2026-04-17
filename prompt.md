# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Ship **Transfer-vs-Wait decision engine + AI chatbot for non-technical ops managers**. Keep the J-72402 demo narrative intact. Full roadmap in `shared/roadmap.md` (Phase 0 → 5).

## LAST SESSION SUMMARY
- Shipped Phase 1c + 1d: `analytics/alerts.py` implements `rank_alerts` (priority = normalize(imbalance) + normalize(annual_exposure) + normalize(urgency); WAIT-with-inbound demoted ×0.5; plain-English reasons). `analytics/pipeline.py` orchestrates ingest→imbalance→chargeback-aggregates→transfer→alerts and writes all derived parquets. `web/api/main.py` lifespan now calls `pipeline.run()` after ingest if `alerts.parquet` is missing.
- Pipeline verified end-to-end against seed data (SKU-004 alerts with real dollar figures).
- `tests/test_alerts.py`: 9 tests covering output shape, ranking order, WAIT-inbound demotion, reason quality. Full suite: 59/59 passing.

## NEXT TASK
**Phase 2 — API surface** per `shared/roadmap.md` § "Phase 2". One commit per logical group (routes, then summary).

Acceptance criteria (all additive, typed pydantic response models):
1. `GET /api/recommendations/transfers` — updated shape matching Phase 1b output columns (`action, origin_dc, qty, transfer_cost, inbound_po_id, inbound_eta, inbound_qty, days_to_stockout, penalty_avoided, net_saving, reason`). Read from `transfers_computed.parquet`.
2. `GET /api/recommendations/alerts?limit=10` — new. Read from `alerts.parquet`.
3. `GET /api/chargebacks/top-causes?n=5` — new. Read from `cb_top_causes.parquet`.
4. `GET /api/chargebacks/top-customers?n=10` — new. Read from `cb_top_customers.parquet`.
5. `GET /api/chargebacks/by-channel` — new. Read from `cb_top_channels.parquet` (top_channels output).
6. `GET /api/chargebacks/trend` — new. Read from `cb_monthly_trend.parquet`.
7. `GET /api/inventory/sku/{sku}` — new. Returns `{sku, product_name, dcs: [{dc, dos, status, demand_rate}], open_pos: [...], recommendation: {action,...}, chargeback_history_summary: {total_amount, count}}`. Computed on the fly from parquets.
8. `GET /api/summary` rewritten to **manual-vs-system**: `{manual_annual_penalty, system_avoidable_annual, delta, pct_reduction}`. `manual` = last-12-months chargebacks annualized; `system` = sum of TRANSFER rows' `net_saving × 12`.
9. `curl localhost:8000/api/recommendations/alerts | jq '.[0]'` returns a ranked alert.
10. `curl localhost:8000/api/inventory/sku/J-72402` (or SKU-004 on seed) returns per-DC shape.
11. `curl localhost:8000/api/summary` returns `{manual_annual_penalty, system_avoidable_annual, delta, pct_reduction}`.
12. `pytest -q` still 59/59+ (no new Python tests required for Phase 2, but no regressions).

Commit messages: `[BACKEND] api: add alerts, chargeback, sku endpoints` then `[BACKEND] api: rewrite summary to manual-vs-system`

## FILES IN PLAY
- `web/api/routes/recommendations.py` — update transfers shape, add alerts endpoint
- `web/api/routes/chargebacks.py` — add top-causes, top-customers, by-channel, trend endpoints
- `web/api/routes/inventory.py` — add `/sku/{sku}` endpoint
- `web/api/main.py` — already updated (lifespan); no further changes needed unless summary moves here
- `web/api/routes/` — may add a new `summary.py` route for the rewritten `/api/summary`

## LOCKED / DO NOT TOUCH
- Hero SKU **J-72402** and its demo numbers
- `demo/scenario.md` narrative
- All `analytics/` modules (Phase 1 work — read-only for Phase 2)
- All entries in `CLAUDE.md` § "Do not re-derive" (14 items)

## BLOCKERS
- Phase 0–2 have none.
- Phase 3 (chatbot) requires `ANTHROPIC_API_KEY` in environment before end-to-end verification.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then read shared/roadmap.md for the full phase breakdown. Implement the NEXT TASK (Phase 2) exactly as specified. Follow the Context budget & handoff protocol from CLAUDE.md — commit small, push often, hand off when context hits 25%.
```
