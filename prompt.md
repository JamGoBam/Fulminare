# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Build the Next.js 14 frontend dashboard: 3-DC imbalance table (home page) consuming the live `/api/inventory/imbalance` endpoint, with status badges and shadcn/ui styling.

## LAST SESSION SUMMARY
- Implemented `analytics/imbalance.py`: `compute_imbalance_table` (demand_rate + DoS + imbalance_score per SKU×DC, status from CLAUDE.md thresholds) and `get_top_imbalanced` (top-n by score)
- Implemented FastAPI: CORS middleware, lifespan startup auto-ingest, `GET /api/inventory/imbalance` endpoint in `web/api/routes/inventory.py`
- End-to-end smoke test passed: `curl http://localhost:8000/api/inventory/imbalance` returns JSON with sku, product_name, dc, dos, imbalance_score, status
- Commit: `[LOGIC] imbalance: implement detector, FastAPI /api/inventory/imbalance endpoint` (hash: TBD)

## NEXT TASK
Bootstrap Next.js 14 frontend and implement the dashboard home page (3-DC imbalance table).

**Step 1 — Bootstrap (if `web/frontend/package.json` does not exist):**
```bash
cd web && pnpm create next-app frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd frontend && pnpm add @tanstack/react-query axios
pnpm dlx shadcn@latest init -d   # defaults: New York style, zinc base
pnpm dlx shadcn@latest add table badge card button
```

**Step 2 — Implement `web/frontend/app/page.tsx` (dashboard home):**

Layout:
- Full-width header: "Prince of Peace — Inventory Dashboard" + today's date
- Alert banner: "⚠ {N} SKUs with critical imbalance" (count where status=critical, hidden if 0)
- `<ImbalanceTable>` component

`<ImbalanceTable>` component (`web/frontend/components/ImbalanceTable.tsx`):
- Fetch from `http://localhost:8000/api/inventory/imbalance?top=20` via TanStack Query
- Columns: SKU | Product | DC | Demand/day | Days of Supply | Imbalance Score | Status
- Status cell: shadcn `<Badge>` — `destructive` for critical, `secondary` for warning, `outline` for ok
- `dos = null` displays as "—"
- Sort rows by `imbalance_score` descending (client-side, static — no interactive sort needed)
- Loading state: skeleton rows; error state: red "Failed to load data"

**Acceptance criteria:**
- `pnpm --dir web/frontend dev` starts without TypeScript errors
- Dashboard page renders the imbalance table with real data from the running API
- Status badges show correct color for critical/warning/ok
- `null` dos renders as "—" not "null"

## FILES IN PLAY
- `web/frontend/` (bootstrap + implement)
- `web/frontend/app/page.tsx` (home dashboard)
- `web/frontend/components/ImbalanceTable.tsx` (new component)

## LOCKED / DO NOT TOUCH
- `data/**` — ingest is green; do not touch
- `analytics/**` — metrics + imbalance locked
- `web/api/**` — backend is working; do not touch
- `tests/**` — all tests passing; do not touch

## BLOCKERS
- Real POP CSVs still not received. No blocker — synthetic seed data is sufficient.
- API must be running on port 8000 for the frontend to fetch data during dev.

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
