# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Implement `analytics/metrics.py` primitives (demand_rate, days_of_supply, imbalance_score, transfer_cost) so Block 5 (imbalance detector + FastAPI) can build on stable, tested math.

## LAST SESSION SUMMARY
- Implemented `data/ingest.py` (load_table, run, main), `data/schemas.py` (9 pydantic v2 models), `data/constants.py` (DC_MAP populated with short + canonical labels)
- Created 9 seed CSVs in `data/seed/` (3–18 rows each); all DC labels normalize to canonical on ingest
- 11/11 pytest tests pass; `python -m data.ingest --seed` runs clean; DuckDB `SELECT COUNT(*) FROM inventory` returns 9
- Commit: `[DATA] ingest: implement loaders, schemas, seed CSVs, tests` (hash TBD — fill in after handoff commit)

## NEXT TASK
Implement `analytics/metrics.py` + `analytics/forecast.py` + tests.

**Functions to implement** (formulas are in CLAUDE.md Core metrics — copy them exactly, do not deviate):

1. `demand_rate(sales_df, sku, dc, window_days=30) -> float` — trailing-window avg units/day. Return 0.0 if no sales.
2. `days_of_supply(available, rate) -> float` — `available / rate`. Return `float('inf')` if rate == 0.
3. `imbalance_score(dos_values: list[float]) -> float` — `(max - min) / mean`, clamped to [0, 10]. Return 0.0 if mean == 0 or fewer than 2 DCs.
4. `transfer_cost(qty, units_per_case, cost_per_pallet, cases_per_pallet=40) -> float` — `cost_per_pallet * ceil(qty / (units_per_case * cases_per_pallet))`.

Put `demand_rate` in `analytics/forecast.py`; the other three in `analytics/metrics.py`. Import `demand_rate` from `analytics.forecast` where needed.

**Acceptance criteria:**
- `pytest tests/test_imbalance.py -q` — at least 2 tests per function, all pass
- Edge cases covered: zero demand (DoS = inf), zero available (DoS = 0), single-DC imbalance_score (returns 0), partial pallet rounds UP
- `from analytics.metrics import days_of_supply, imbalance_score, transfer_cost` works without error

## FILES IN PLAY
- `analytics/metrics.py` (implement: days_of_supply, imbalance_score, transfer_cost)
- `analytics/forecast.py` (implement: demand_rate)
- `tests/test_imbalance.py` (implement tests — use hard-coded DataFrames, NOT data/processed parquets)

## LOCKED / DO NOT TOUCH
- `data/**` — ingest is green; do not touch
- `web/**` — frontend not started
- `analytics/imbalance.py`, `analytics/alerts.py`, `analytics/transfer.py`, `analytics/chargeback.py` — Block 5/7 work

## BLOCKERS
- Real POP CSVs still not received. No blocker for this block — pure math, no real data needed.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then implement NEXT TASK exactly as specified. Do not read or open any file not in FILES IN PLAY. Follow the Context budget & handoff protocol from CLAUDE.md — if context drops to ~25% or you finish the task, run `bash scripts/handoff.sh "<commit message>"` and stop. Do not squeeze in extra work before the handoff.
```

---

## End-of-session update template
At session end, rewrite this file top-to-bottom:
1. Update **CURRENT SPRINT GOAL** if it shifted.
2. Rewrite **LAST SESSION SUMMARY** — 3 bullets + commit hash.
3. Rewrite **NEXT TASK** — one concrete block, ≤3h, with crisp acceptance criteria.
4. Update **FILES IN PLAY** and **LOCKED** for the next driver.
5. Update **BLOCKERS** (add or clear).
6. Regenerate **QUICK-RESUME PROMPT** if task shape changed.
7. Run `bash scripts/handoff.sh "[META] prompt: handoff <topic>"` — commits, pushes, prints resume hint.
