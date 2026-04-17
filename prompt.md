# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Final demo polish — rehearsal dry-run verification.

## LAST SESSION SUMMARY
- Created `web/frontend/components/StatsBar.tsx`: live 4-stat bar (SKUs tracked | Critical | Warning | est. savings/yr) rendered between header and savings banner on home page; uses same `["summary"]` query key as SavingsBanner so TanStack deduplicates the request
- Added chargeback exposure callout to `chargebacks/page.tsx`: converted to `"use client"`, fetches `/api/chargebacks/summary`, renders "Total chargeback exposure (excl. TPR): $X across N incidents" below heatmap card; assumes fields `total_amount` + `incident_count` — **verify these match the actual API response** on first boot
- Updated `README.md`: replaced old `## Quick start` block with new `## Quick Start` using `scripts/start.sh`
- Commit: `[FRONTEND] polish: stats bar, chargeback exposure, README quick-start`

## NEXT TASK
Boot the app, verify all acceptance criteria, and walk the rehearsal script.

**1 — Runtime verification (Windows terminal, not Git Bash):**
```bash
bash scripts/start.sh
```
Check each of these:
- Home page: stat bar shows "N SKUs tracked | N Critical | N Warning | $X est. savings / year"
- Home page: savings banner appears below stat bar
- Chargebacks page: exposure line appears below heatmap card
- Click a SKU in the imbalance table → `/sku/[sku]` page loads correctly
- `pytest -q` passes 18/18

**2 — Fix chargebacks summary field names if needed:**
Open `web/api/` to find the actual response shape of `/api/chargebacks/summary`. If the fields differ from `total_amount` / `incident_count`, update `web/frontend/app/chargebacks/page.tsx` (`ChargebackSummary` interface + usages on lines 12–13 and 57–58).

**3 — Rehearsal walkthrough:**
Read `demo/scenario.md` and walk through the full script once end-to-end. Note any awkward moments or broken steps.

**Acceptance criteria:**
- All 5 runtime checks above pass
- `pytest -q` 18/18
- Scenario walkthrough completes without errors or broken states

## FILES IN PLAY
- `web/frontend/app/chargebacks/page.tsx` (may need field name fix — see NEXT TASK step 2)
- `web/frontend/components/StatsBar.tsx` (verify renders correctly)
- `demo/scenario.md` (read-only for rehearsal walkthrough)

## LOCKED / DO NOT TOUCH
- `analytics/**` — all locked
- `web/api/**` — all locked (READ-ONLY to check chargebacks summary fields if needed)
- `web/frontend/app/sku/**`, `web/frontend/components/ImbalanceTable.tsx`, `TransferCard.tsx`, `ChargebackHeatmap.tsx`, `SavingsBanner.tsx` — locked
- `web/frontend/app/page.tsx` — locked (stat bar is in)
- `tests/**` — must stay green
- `data/seed/**` — locked
- `scripts/start.sh`, `scripts/handoff.sh` — locked

## BLOCKERS
- Runtime verification incomplete — pnpm/Python not accessible in Git Bash; run `scripts/start.sh` in a native Windows terminal (PowerShell/CMD) to verify.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then implement NEXT TASK exactly as specified. Do not read or open any file not in FILES IN PLAY. Follow the Context budget & handoff protocol from CLAUDE.md — if context drops to ~25%, you are nearing the 5-hour usage limit and cannot complete NEXT TASK fully within the remaining time, or you finish the task, run `bash scripts/handoff.sh "<commit message>"` and stop. Do not squeeze in extra work before the handoff.
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
