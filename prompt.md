# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Demo ready — rehearsal complete, all 5 steps verified clean in ≤5 min.

## LAST SESSION SUMMARY
- Rehearsal dry-run completed: all 5 scenario steps verified via live preview (no errors, no chart failures)
- SKU drill-down `/sku/J-72402` confirmed working from imbalance table link
- Total walkthrough time ~4.5 min — well under 8-min limit

## NEXT TASK
**Pre-demo hardening** — fix one known gap before the live presentation:

The chargeback heatmap renders as a plain HTML table; the `demo/scenario.md` implies a visual heatmap (colors by severity). Add a simple color-coded background to the heatmap cells proportional to their dollar value so the "Design" criterion is served.

**Acceptance criteria:**
- Chargebacks page heatmap cells have background color intensity proportional to amount (red scale or similar)
- Highest cell (MISSED_WINDOW / DC_WEST $1.8M) is darkest; blank/zero cells are white
- `pytest -q` still passes
- No other UI regressions on home or SKU pages

**Files to change:**
- `web/frontend/app/chargebacks/page.tsx` — only file to touch

## FILES IN PLAY
- `web/frontend/app/chargebacks/page.tsx`

## LOCKED / DO NOT TOUCH
- `analytics/**`
- `web/api/**`
- `web/frontend/app/page.tsx`, `web/frontend/app/sku/**` — locked
- `tests/**`
- `data/**`, `scripts/**`

## BLOCKERS
- Boot requires **PowerShell/CMD** (not Git Bash) for `pnpm` and `.venv\Scripts\python.exe`.
- `analytics/pipeline.py` raises `NotImplementedError` — skip it; use `python -m data.ingest` only.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then implement NEXT TASK exactly as specified. Do not read or open any file not in FILES IN PLAY. Follow the Context budget & handoff protocol from CLAUDE.md — if context drops to ~25%, run bash scripts/handoff.sh "<commit message>" and stop.
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
