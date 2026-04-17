# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Implement `analytics/imbalance.py` (site-level imbalance detection) and wire up a minimal FastAPI backend with an `/api/inventory/imbalance` endpoint, so the frontend can start rendering the 3-DC imbalance table.

## LAST SESSION SUMMARY
- Implemented `analytics/forecast.py` (`demand_rate`): trailing-window avg units/day, returns 0.0 on no sales
- Implemented `analytics/metrics.py` (`days_of_supply`, `imbalance_score`, `transfer_cost`): all formulas mirror CLAUDE.md exactly, inf-safe, pallet rounding via `math.ceil`
- 18/18 `pytest tests/test_imbalance.py -q` tests pass; imports verified clean
- Commit: `[LOGIC] metrics: implement demand_rate, days_of_supply, imbalance_score, transfer_cost` (hash: TBD — fill in after handoff)

## NEXT TASK
Implement `analytics/imbalance.py` + minimal FastAPI backend + `/api/inventory/imbalance` endpoint.

**Functions to implement in `analytics/imbalance.py`:**

1. `compute_imbalance_table(inventory_df, sales_df, skus_df) -> pd.DataFrame`
   - For each SKU across all 3 DCs, compute: `demand_rate` (from `analytics.forecast`), `days_of_supply` (from `analytics.metrics`), `imbalance_score` (from `analytics.metrics`)
   - Output columns: `sku`, `product_name`, `dc`, `on_hand`, `available`, `demand_rate`, `dos`, `imbalance_score`, `status`
   - `status` = `"critical"` if dos < 14, `"warning"` if dos < 30, `"ok"` otherwise (use CLAUDE.md thresholds)
   - Row per SKU×DC combination

2. `get_top_imbalanced(imbalance_df, n=20) -> pd.DataFrame`
   - Return top-n rows sorted by `imbalance_score` descending

**FastAPI in `web/api/main.py` + `web/api/routes/inventory.py`:**

- `GET /api/inventory/imbalance` — returns JSON list from `compute_imbalance_table` via `get_top_imbalanced`
- Load data from parquet files in `data/processed/` (use `pd.read_parquet`)
- App startup: check if parquets exist; if not, run `data.ingest.run(SEED, PROCESSED, DB_PATH)` to generate them
- Include CORS middleware (origins=["*"] for local dev)

**Acceptance criteria:**
- `pytest tests/test_imbalance.py -q` still all pass
- `uvicorn web.api.main:app --port 8000` starts without error
- `curl http://localhost:8000/api/inventory/imbalance` returns a JSON array with keys: `sku`, `product_name`, `dc`, `dos`, `imbalance_score`, `status`
- `from analytics.imbalance import compute_imbalance_table, get_top_imbalanced` works without error

## FILES IN PLAY
- `analytics/imbalance.py` (implement: compute_imbalance_table, get_top_imbalanced)
- `web/api/main.py` (FastAPI app + CORS + startup)
- `web/api/routes/inventory.py` (GET /api/inventory/imbalance endpoint)
- `tests/test_imbalance.py` (may add tests for imbalance table — optional, existing tests must stay green)

## LOCKED / DO NOT TOUCH
- `data/**` — ingest is green; do not touch
- `analytics/metrics.py`, `analytics/forecast.py` — metrics are locked
- `analytics/alerts.py`, `analytics/transfer.py`, `analytics/chargeback.py` — Block 7 work
- `web/frontend/**` — not started

## BLOCKERS
- Real POP CSVs still not received. No blocker — synthetic seed data is sufficient.

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
