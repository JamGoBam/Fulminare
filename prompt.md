# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Build the chargeback heatmap page (`/chargebacks`) + transfer-vs-wait recommendation card, so the demo covers the Business and Design judging criteria.

## LAST SESSION SUMMARY
- Added SKU-004 (Reishi Mushroom Capsules) to seed CSVs: DC_EAST critical (DoS=10, demand=5/day), DC_WEST warning (DoS=20, demand=0.5/day), DC_CENTRAL ok (DoS=null, no demand)
- Added critical alert banner in `ImbalanceTable.tsx`: red card above table, counts critical SKU-DC pairs, hidden when 0
- Verified in browser: "⚠ 1 SKU-DC pair at critical inventory levels", Critical/Warning/OK badges all fire; 18/18 tests still green
- Commit: `[DATA+FRONTEND] seed: add SKU-004 critical/warning rows; dashboard: alert banner` (hash: TBD)

## NEXT TASK
Implement the chargeback analytics page + backend endpoint.

**Backend — `analytics/chargeback.py` + `web/api/routes/chargebacks.py`:**

1. `chargeback_summary(chargebacks_df) -> pd.DataFrame`
   - Filter out `TPR` cause code (CLAUDE.md locked rule)
   - Group by `cause_code × channel × dc`, sum `amount`
   - Output columns: `cause_code`, `channel`, `dc`, `total_amount`, `count`

2. `GET /api/chargebacks/summary` — returns JSON list from `chargeback_summary`
   - Mount router in `web/api/main.py` under `/api`

**Frontend — `web/frontend/app/chargebacks/page.tsx` + `web/frontend/components/ChargebackHeatmap.tsx`:**

- Route: `http://localhost:3000/chargebacks`
- Page header: "Chargeback Analysis" + today's date
- `<ChargebackHeatmap>` component:
  - Fetch from `GET /api/chargebacks/summary` via TanStack Query
  - Render a simple grouped table: rows = cause codes, columns = DCs (DC_EAST / DC_WEST / DC_CENTRAL)
  - Each cell: total `$amount` formatted as `$X,XXX` (no decimals), grey/empty for zero
  - Below table: totals row
  - Loading: skeleton; Error: red error message
- Nav link from home page (`app/page.tsx`): add "Chargeback Analysis →" link in header

**Acceptance criteria:**
- `uvicorn web.api.main:app --port 8000` → `GET /api/chargebacks/summary` returns JSON with `cause_code`, `channel`, `dc`, `total_amount`, `count`
- `http://localhost:3000/chargebacks` renders the heatmap table with real data
- TPR rows are absent from results
- `pnpm --dir web/frontend dev` starts clean (no TS errors)

## FILES IN PLAY
- `analytics/chargeback.py` (implement: chargeback_summary)
- `web/api/routes/chargebacks.py` (implement: GET /api/chargebacks/summary)
- `web/api/main.py` (mount chargebacks router)
- `web/frontend/app/chargebacks/page.tsx` (new page)
- `web/frontend/components/ChargebackHeatmap.tsx` (new component)
- `web/frontend/app/page.tsx` (add nav link)

## LOCKED / DO NOT TOUCH
- `analytics/metrics.py`, `analytics/forecast.py`, `analytics/imbalance.py` — locked
- `web/api/routes/inventory.py` — working; do not touch
- `tests/test_imbalance.py` — must stay green
- `data/seed/**` — seed data complete; do not touch

## BLOCKERS
- Real POP CSVs still not received. No blocker — seed chargebacks.csv has 15 rows sufficient for demo.

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
