# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Polish and demo prep: wire up the full stack for a clean cold-start, add a SKU drill-down route, and run a complete end-to-end rehearsal pass.

## LAST SESSION SUMMARY
- Implemented `GET /api/summary` (total_skus, critical_count, warning_count, annual_savings_estimate=$10,800)
- Built `SavingsBanner` component: green banner showing "$10,800 / year" above imbalance table; hidden when 0
- Wrote `demo/scenario.md`: 5-step SKU-004 walkthrough with exact numbers ($600 freight, $1,500 avoided, $900 net, $10,800 annual)
- Commit: `[FRONTEND+DEMO] savings banner, /api/summary, scenario walkthrough` (hash: TBD)

## NEXT TASK
Cold-start reliability + SKU drill-down page.

**1 — Cold-start reliability (`scripts/start.sh`):**
Write a shell script that:
- Runs `PYTHONPATH=. python3 -m data.ingest --seed` if `data/processed/inventory.parquet` is missing
- Starts `PYTHONPATH=. uvicorn web.api.main:app --port 8000 &`
- Starts `npx -y pnpm --dir web/frontend dev &`
- Prints "POP dashboard ready: http://localhost:3000"
- Make executable (`chmod +x`)

**2 — SKU drill-down page (`web/frontend/app/sku/[sku]/page.tsx`):**
- Route: `http://localhost:3000/sku/SKU-004`
- Link from imbalance table rows: wrap the SKU cell in `<Link href={/sku/${row.sku}}>` (update `ImbalanceTable.tsx`)
- Page shows:
  - Header: product name + SKU
  - 3 stat cards side by side: DC_EAST DoS | DC_WEST DoS | DC_CENTRAL DoS (show "—" for null)
  - Transfer recommendation for this SKU only (filter TransferCard data client-side by sku param)
- Fetch data from existing endpoints: `/api/inventory/imbalance` (filter by sku) + `/api/recommendations/transfers` (filter by sku)

**Acceptance criteria:**
- `bash scripts/start.sh` boots both servers from a clean state
- `http://localhost:3000/sku/SKU-004` renders with 3 DoS stat cards and transfer rec row
- Clicking an SKU in the imbalance table navigates to the drill-down
- `pnpm --dir web/frontend dev` clean (no TS errors)
- `pytest tests/test_imbalance.py -q` still 18/18

## FILES IN PLAY
- `scripts/start.sh` (new)
- `web/frontend/app/sku/[sku]/page.tsx` (new)
- `web/frontend/components/ImbalanceTable.tsx` (add link on SKU cell)

## LOCKED / DO NOT TOUCH
- `analytics/**` — all locked
- `web/api/**` — all locked
- `web/frontend/components/SavingsBanner.tsx`, `TransferCard.tsx`, `ChargebackHeatmap.tsx` — locked
- `tests/**` — must stay green
- `data/seed/**` — locked

## BLOCKERS
- None.

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
