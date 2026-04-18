# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Ship **Transfer-vs-Wait decision engine + AI chatbot for non-technical ops managers**. Keep the J-72402 demo narrative intact. Full roadmap in `shared/roadmap.md` (Phase 0 → 5).

## LAST SESSION SUMMARY
- Completed Phase 5 (Handoff docs): reviewed CLAUDE.md — no locked assumptions changed in Phase 4; confirmed 14 items intact.
- Sprint goal fully shipped: Phases 0–5 complete. Transfer-vs-Wait engine, AI chatbot, accessibility layer, and handoff docs all committed and pushed.
- Only remaining work: end-to-end chatbot smoke test with live `ANTHROPIC_API_KEY` (blocked on key in env).

## NEXT TASK
**E2E chatbot verification** — smoke-test the chatbot with a live `ANTHROPIC_API_KEY`.

Acceptance criteria:
1. Boot backend with `ANTHROPIC_API_KEY` set: `uvicorn web.api.main:app --reload --port 8000`.
2. Boot frontend: `pnpm --dir web/frontend dev`.
3. Open browser, open chat FAB, ask *"Why is J-72402 flagged critical?"* — expect `get_sku_status` tool call + reply citing ≤14-day DoS + $ exposure.
4. On `/sku/J-72402`: ask *"Should we transfer or wait?"* — expect TRANSFER rec with freight cost.
5. On `/chargebacks`: ask *"What's the top chargeback cause?"* — expect `get_chargeback_breakdown(by="cause")` + $.
6. Confirm no browser console errors, no 500s in backend log.

## FILES IN PLAY
- None — all code is complete. This is a runtime verification task only.

## LOCKED / DO NOT TOUCH
- Hero SKU **J-72402** and its demo numbers
- `demo/scenario.md` narrative
- All Phase 0–5 backend + frontend work
- All entries in `CLAUDE.md` § "Do not re-derive" (14 items)

## BLOCKERS
- End-to-end chatbot test requires `ANTHROPIC_API_KEY` in environment (never committed).

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Run the E2E chatbot verification: boot backend + frontend, smoke-test the chatbot with ANTHROPIC_API_KEY set. Follow the Context budget & handoff protocol from CLAUDE.md.
```
