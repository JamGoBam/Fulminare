# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Final demo polish — runtime verification + rehearsal dry-run.

## LAST SESSION SUMMARY
- Fixed `chargebacks/page.tsx`: `/api/chargebacks/summary` returns a **list** of `{cause_code, channel, dc, total_amount, count}` records (not a single object); now reduces the array to compute totals — `totalAmount` and `totalCount`
- Reviewed `demo/scenario.md`: all 5 steps have corresponding UI features; scenario numbers ($900 net save, $970 SHORT_SHIP, $10,800/yr) come from seed data and need on-screen verification
- Commit: `[FRONTEND] chargebacks: fix summary field types (list→reduce)`

## NEXT TASK
Boot the app in a **Windows terminal** (PowerShell/CMD), verify UI, run tests, do rehearsal walkthrough.

**1 — Boot and verify (Windows terminal only — not Git Bash):**
```bash
bash scripts/start.sh
# waits for API :8000 and frontend :3000
```
Check each item:
- [ ] Home: stat bar shows "N SKUs tracked | 1 Critical | 1 Warning | $10,800 est. savings / year"
- [ ] Home: green savings banner appears below stat bar
- [ ] Home: scroll down — SKU-004 is visible in the imbalance table with Critical badge
- [ ] Home: Transfer Recommendations card shows "108 units DC_CENTRAL → DC_EAST: $600 freight. Net save $900."
- [ ] Chargebacks: exposure line appears — "Total chargeback exposure (excl. TPR): $X across N incidents"
- [ ] Chargebacks: SHORT_SHIP row shows DC_EAST ≈ $970, DC_WEST ≈ $680
- [ ] Click a SKU in the imbalance table → `/sku/[sku]` drill-down loads
- [ ] `pytest -q` passes 18/18

**2 — If any scenario number mismatches:**
Run `python -m analytics.pipeline` to re-derive processed data, then reload. If numbers still don't match `demo/scenario.md`, check `data/seed/` CSV values against the expected figures — do NOT edit analytics or seed data without understanding the root cause first.

**3 — Rehearsal walkthrough:**
Follow `demo/scenario.md` step-by-step, speaking aloud. ≤8 minutes total. Note any awkward moments.

**Acceptance criteria:**
- All 8 runtime checks above pass
- `pytest -q` 18/18
- Rehearsal walkthrough completes in ≤8 min without errors

## FILES IN PLAY
- None expected — this is a verification-only task. If number mismatches are found, only `data/seed/*.csv` may need updating (unlock individually if needed).
- `demo/scenario.md` — read-only reference

## LOCKED / DO NOT TOUCH
- `analytics/**` — all locked
- `web/api/**` — all locked
- `web/frontend/**` — all locked (code is done)
- `tests/**` — must stay green
- `data/seed/**` — locked unless a specific number mismatch is root-caused here
- `scripts/**` — locked

## BLOCKERS
- None — but boot requires a Windows terminal (PowerShell/CMD). Git Bash cannot run pnpm or Python on this machine.

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
