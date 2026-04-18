# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Final demo polish: "Save $X" banner on the chargeback page, README quick-start, and rehearsal dry-run verification.

## LAST SESSION SUMMARY
- Wrote `scripts/start.sh`: auto-ingest if parquets missing, boot API + frontend, wait for healthz, print ready URL; executable
- Built `/sku/[sku]` drill-down page: 3 DoS stat cards (DC_EAST=10/Critical, DC_WEST=20/Warning, DC_CENTRAL=—/OK) + transfer table with green $900 net saving; fully verified in browser
- Added `<Link href={/sku/${sku}}>` on SKU cell in ImbalanceTable — clicks navigate to drill-down
- Commit: `[FRONTEND] cold-start script, SKU drill-down page, table SKU links` (hash: TBD)

## NEXT TASK
Final polish pass before rehearsal.

**1 — Summary stat bar on home page (`web/frontend/app/page.tsx`):**
Fetch `/api/summary` (already exists). Add a horizontal stat bar between the header and the savings banner:
```
4 SKUs tracked   |   1 Critical   |   1 Warning   |   $10,800 est. savings / year
```
Use `<SavingsBanner>` data — just add a top stat row using the same `useQuery(["summary"])`. Put it in `SavingsBanner.tsx` (already fetches this data) or a new `StatsBar.tsx` — whichever is cleaner.

**2 — Chargebacks page: total exposure callout (`web/frontend/app/chargebacks/page.tsx`):**
Below the heatmap card, add a plain text line:
`"Total chargeback exposure (excl. TPR): $X,XXX across N incidents"`
Compute from the `/api/chargebacks/summary` response on the client.

**3 — `README.md` quick-start section:**
Append a `## Quick Start` section to the existing `README.md`:
```
## Quick Start
bash scripts/start.sh          # boots API (:8000) + frontend (:3000)
open http://localhost:3000     # dashboard
pytest -q                      # 18 tests
```
No other changes to README.

**Acceptance criteria:**
- Home page shows the 4-stat bar with live data
- Chargebacks page shows total exposure line below the heatmap
- `README.md` has Quick Start section
- `pnpm --dir web/frontend dev` starts clean (no TS errors)
- `pytest tests/test_imbalance.py -q` still 18/18

## FILES IN PLAY
- `web/frontend/components/SavingsBanner.tsx` (extend with stat bar, or create `StatsBar.tsx`)
- `web/frontend/app/page.tsx` (add StatsBar/stat row)
- `web/frontend/app/chargebacks/page.tsx` (add total exposure line)
- `README.md` (append Quick Start)

## LOCKED / DO NOT TOUCH
- `analytics/**` — all locked
- `web/api/**` — all locked
- `web/frontend/app/sku/**`, `web/frontend/components/ImbalanceTable.tsx`, `TransferCard.tsx`, `ChargebackHeatmap.tsx` — locked
- `tests/**` — must stay green
- `data/seed/**` — locked
- `scripts/start.sh`, `scripts/handoff.sh` — locked

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
