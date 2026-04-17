# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Build the transfer-vs-wait recommendation card and the SKU drill-down page, then wire up the "Save $X annually" banner on the dashboard home.

## LAST SESSION SUMMARY
- Implemented `analytics/chargeback.py` (`chargeback_summary`): groups by cause×channel×dc, TPR filtered out
- Implemented `GET /api/chargebacks/summary` and mounted in FastAPI; `GET /api/inventory/imbalance` still working
- Built `/chargebacks` page + `ChargebackHeatmap` component: pivot table cause×DC, empty cells for zero, totals row, `← Dashboard` back nav; verified in browser with real data
- Commit: `[LOGIC+FRONTEND] chargebacks: heatmap endpoint + page` (hash: TBD)

## NEXT TASK
Implement the transfer recommendation engine + API endpoint, then surface it as a card on the dashboard.

**Backend — `analytics/transfer.py` + `web/api/routes/recommendations.py`:**

1. `transfer_recommendations(inventory_df, sales_df, skus_df, freight_df) -> pd.DataFrame`
   - For each SKU, find DCs with critical/warning DoS (< 30) AND another DC with surplus (DoS > 90)
   - For each such pair, compute:
     - `qty_to_transfer`: bring dest DC to 30-day DoS — `max(0, (30 * rate_dest) - available_dest)`, rounded up to nearest case
     - `transfer_cost`: use `analytics.metrics.transfer_cost` (units_per_case from skus_df, freight from freight_df)
     - `chargeback_risk_avoided`: estimated as `(30 - dos_dest) * rate_dest * 15.0` (flat $15/unit penalty proxy for demo — no real chargeback model yet)
     - `net_saving`: `chargeback_risk_avoided - transfer_cost`
   - Output columns: `sku`, `product_name`, `origin_dc`, `dest_dc`, `dos_origin`, `dos_dest`, `qty_to_transfer`, `transfer_cost`, `chargeback_risk_avoided`, `net_saving`
   - Only include rows where `net_saving > 0` and `qty_to_transfer > 0`
   - Sort by `net_saving` descending

2. `GET /api/recommendations/transfers` — returns JSON list from `transfer_recommendations`
   - Mount router in `web/api/main.py` under `/api`

**Frontend — `web/frontend/components/TransferCard.tsx` + update `app/page.tsx`:**

- `<TransferCard>` fetches `GET /api/recommendations/transfers`
- Renders a Card below the imbalance table on the home page
- Card title: "Transfer Recommendations"
- For each recommendation row show: SKU | Product | Origin DC → Dest DC | Qty | Est. Saving ($)
- Highlight `net_saving` in green (`text-green-600`)
- Empty state: "No transfers recommended — inventory is balanced."

**Acceptance criteria:**
- `GET /api/recommendations/transfers` returns JSON (may be empty array if no profitable transfers)
- With current seed data (SKU-004 DC_EAST critical, DC_CENTRAL surplus), at least 1 recommendation appears
- Card renders on home page with green net saving amount
- `pnpm --dir web/frontend dev` starts clean (no TS errors)
- `pytest tests/test_imbalance.py -q` still 18/18 green

## FILES IN PLAY
- `analytics/transfer.py` (implement: transfer_recommendations)
- `web/api/routes/recommendations.py` (implement: GET /api/recommendations/transfers)
- `web/api/main.py` (mount recommendations router)
- `web/frontend/components/TransferCard.tsx` (new component)
- `web/frontend/app/page.tsx` (add TransferCard below imbalance table)

## LOCKED / DO NOT TOUCH
- `analytics/metrics.py`, `analytics/forecast.py`, `analytics/imbalance.py`, `analytics/chargeback.py` — locked
- `web/api/routes/inventory.py`, `web/api/routes/chargebacks.py` — locked
- `web/frontend/app/chargebacks/**`, `web/frontend/components/ChargebackHeatmap.tsx` — locked
- `tests/test_imbalance.py` — must stay green
- `data/seed/**` — locked

## BLOCKERS
- Real freight rates not in seed data. Use `freight.csv` (origin/destination/cost_per_pallet). If a pair is missing, default cost_per_pallet = 300.0.

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
