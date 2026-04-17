# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Expand the dashboard: add a critical-alert banner, the chargeback heatmap page, and beef up seed data so critical/warning badges actually fire in the demo.

## LAST SESSION SUMMARY
- Bootstrapped Next.js 16 (App Router, Tailwind v4, shadcn/ui New York), added TanStack Query + axios, shadcn table/badge/card components
- Implemented `QueryProvider`, `ImbalanceTable` component (skeleton loading, error state, status badges, "—" for null DoS), and dashboard home `app/page.tsx`
- End-to-end verified: `GET /api/inventory/imbalance` → 200, all 7 columns render with live data, null DoS → "—", sort by imbalance_score descending
- Commit: `[FRONTEND] dashboard: bootstrap Next.js, imbalance table with live API data` (hash: TBD)

## NEXT TASK
Two parallel improvements to make the demo compelling:

**1 — Seed data: add critical/warning SKUs** (`data/seed/inventory.csv`, `data/seed/sales.csv`)
Add rows so at least 1 SKU has DoS < 14 ("critical") at one DC and DoS > 30 at another, and at least 1 SKU has DoS 14–30 ("warning"). This makes the status badges fire in the live demo.
- Keep existing SKU-001/002/003 rows unchanged
- Add SKU-004 rows (3 DCs in inventory.csv): one DC with available=50, another with available=5, third with available=300
- Add SKU-004 to skus.csv (1 row)
- Add sales for SKU-004 in sales.csv: ~5 units/day at DC_EAST to push that DC to critical (DoS ~1), ~0.5/day at DC_WEST (DoS ~10), 0 at DC_CENTRAL

**2 — Alert banner** (`web/frontend/components/ImbalanceTable.tsx` or new `AlertBanner.tsx`)
Above the table, show a yellow/red banner: "⚠ {N} SKU-DC pairs at critical levels" when any rows have `status === "critical"`. Hide when N = 0.
- Add it inside `ImbalanceTable` or as a separate component imported by `page.tsx`
- Use shadcn `Card` with `bg-destructive/10 border-destructive/30` styling

**Acceptance criteria:**
- `pytest tests/test_imbalance.py -q` still passes (18/18)
- `python3 -m data.ingest --seed` runs clean with new rows
- Dashboard shows at least 1 red "Critical" badge and 1 yellow "Warning" badge
- Alert banner appears above the table when critical rows exist
- `pnpm --dir web/frontend dev` starts clean (no TS errors)

## FILES IN PLAY
- `data/seed/inventory.csv` (add SKU-004 rows)
- `data/seed/sales.csv` (add SKU-004 sales with asymmetric demand)
- `data/seed/skus.csv` (add SKU-004 product row)
- `web/frontend/components/ImbalanceTable.tsx` (add alert banner)
- `web/frontend/app/page.tsx` (if banner is a separate component)

## LOCKED / DO NOT TOUCH
- `analytics/**` — metrics + imbalance locked
- `web/api/**` — backend working; do not touch
- `tests/test_imbalance.py` — must stay green
- `data/seed/` files other than inventory.csv, sales.csv, skus.csv

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
