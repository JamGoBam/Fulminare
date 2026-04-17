# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Final demo polish — runtime verification complete, scenario updated for real data.

## LAST SESSION SUMMARY
- Booted API (:8000) + frontend (:3000), ran `data.ingest` — real POP data loaded (73 SKUs, 2 Critical, 1 Warning, $13,680/yr savings)
- `demo/scenario.md` rewritten for real data: hero SKU is now **J-72402** (Totole Chicken Bouillon 2.2 lbs), transfer is **72 units DC_WEST → DC_EAST / $420 freight / $660 net save**, chargeback focus is **MISSED_WINDOW DC_EAST $910K / DC_WEST $1.8M**
- All 8 UI checks pass; `pytest -q` passes **29/29**; no console errors

## NEXT TASK
Rehearsal dry-run — do a live walkthrough of the demo, speaking aloud, ≤8 minutes.

**Pre-flight checklist (before walking):**
```bash
# Terminal 1 (PowerShell/CMD — use venv Python):
.venv\Scripts\python.exe -m data.ingest          # refresh processed data
.venv\Scripts\uvicorn.exe web.api.main:app --port 8000 --reload

# Terminal 2:
pnpm --dir web/frontend dev
```

**Walkthrough — follow `demo/scenario.md` verbatim:**
1. Dashboard opens — call out stat bar + banner numbers ($13,680 / yr)
2. Imbalance table — scroll to J-72402, call out DC_EAST 12 days / Critical badge
3. Transfer card — read the DC_WEST → DC_EAST row verbatim ($420 freight, $660 net save)
4. Chargeback Analysis — MISSED_WINDOW row: DC_EAST $910K, DC_WEST $1.8M
5. Back to dashboard — close with the $700K+ scale story

**Acceptance criteria:**
- Walkthrough completes in ≤8 min without errors
- All numbers on-screen match `demo/scenario.md`
- No chart load failures; SKU link to `/sku/J-72402` works

## FILES IN PLAY
- `demo/scenario.md` — read-only reference during rehearsal

## LOCKED / DO NOT TOUCH
- `analytics/**` — all locked
- `web/api/**` — all locked
- `web/frontend/**` — all locked
- `tests/**` — must stay green
- `data/seed/**` — locked
- `scripts/**` — locked

## BLOCKERS
- Boot requires **PowerShell/CMD** (not Git Bash) for `pnpm` and `.venv\Scripts\python.exe` on this machine.
- `analytics/pipeline.py` raises `NotImplementedError` — not needed; skip `python -m analytics.pipeline` and use `python -m data.ingest` instead.

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
