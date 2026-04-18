# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Pivot from HTC 2026 demo to a real-user POP Inventory tool for entry-level supply managers. Three linked workstreams:
1. **Data cleanup** — validator, richer seed, enriched derived table (single source of truth)
2. **Frontend IA rewrite** — `Today` / `Inventory` / `Transfers` / `Chargebacks` / `Ask`, plain-language labels, next-action CTAs
3. **In-house chatbot** — swap Anthropic for **Ollama** (local, free, no API key); `qwen2.5:7b-instruct` by default

Full execution blueprint is in **`PLAN.md`** at the repo root (17 phases, P0→P16, each sized to one Claude Code task). Treat PLAN.md as the approved spec.

## LAST SESSION SUMMARY
- Produced `PLAN.md` — approved executable plan covering data cleanup, frontend reorganization, and in-house Ollama chatbot rebuild.
- User confirmed: real-user pivot (demo locks relaxed), lowest-friction local inference (Ollama + Qwen2.5-7B), full IA rewrite.
- `CLAUDE.md` and `prompt.md` updated: assumption #14 now points to Ollama, no `ANTHROPIC_API_KEY` anywhere, PLAN.md added to session-start read list.

## NEXT TASK
**P0 — Data validator** (first phase per PLAN.md §5).

Acceptance criteria:
1. New file `data/validate.py` implements the referential-integrity checks listed in PLAN.md §2.2.
2. Wire as the last step of `data/ingest.py` so the pipeline aborts on validation failure.
3. Writes `data/processed/validation_report.json` with pass/fail per check + total error count.
4. Running `python -m data.ingest` on current seed CSVs succeeds with 0 errors; deliberately break one seed CSV once to confirm it aborts loudly.
5. No new `test_*.py` file — rely on pipeline-abort behavior as the test (per PLAN.md §6 Verification).

## FILES IN PLAY
- `data/validate.py` (new)
- `data/ingest.py` (add validator call at end)
- `PLAN.md` — reference, do not edit without user signoff

## LOCKED / DO NOT TOUCH
- `PLAN.md` — approved spec; any structural changes require user confirmation
- `scripts/handoff.sh` — handoff mechanism
- Demo-era assumptions in CLAUDE.md § "Do not re-derive" are **advisory now**; PLAN.md supersedes. Still leave J-72402 in the regenerated seed (P1) so existing docs/tests keep working.

## BLOCKERS
- None. (Ollama setup is only needed for P11+; P0 is pure Python/pandas work.)

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md, then PLAN.md, then prompt.md. Execute NEXT TASK (P0 — Data validator) per PLAN.md §2.2. Follow the Context budget & handoff protocol from CLAUDE.md.
```
