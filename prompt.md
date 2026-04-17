# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Ship **Transfer-vs-Wait decision engine + AI chatbot for non-technical ops managers**. Keep the J-72402 demo narrative intact. Full roadmap in `shared/roadmap.md` (Phase 0 → 5).

## LAST SESSION SUMMARY
- Shipped Phase 4 (Accessibility layer): `MetricTooltip.tsx` (GLOSSARY from metrics.md, `render` prop for base-ui compatibility), `ActionQueue.tsx` (ranked alerts, rank badge, Explain→chatbot via `chat:prefill` window event), `TransferCard.tsx` rewrite (TRANSFER/WAIT badge, hover-reveal reason Tooltip, Ask button, updated interface to new API shape), `SavingsBanner.tsx` rewrite (manual-vs-system copy using `{manual_annual_penalty, system_avoidable_annual, pct_reduction}`).
- Wrapped column headers in ImbalanceTable (demand_rate, dos, imbalance), ChargebackHeatmap (cause_code), TransferCard (dos, transfer_cost, net_saving) with MetricTooltip.
- `Chatbot.tsx` updated: `chat:prefill` window event listener opens sheet + pipes prefilled message via sendMessageRef pattern. `pnpm build` clean, no TypeScript errors.

## NEXT TASK
**Phase 5 — Handoff docs** per `shared/roadmap.md` § "Phase 5". One commit.

Acceptance criteria:
1. Review `CLAUDE.md` — update if any locked assumption changed (none changed in Phase 4; confirm and note).
2. This file (`prompt.md`) already reflects Phase 4 completion (done above).
3. Run `bash scripts/handoff.sh "[FRONTEND] accessibility: MetricTooltip, ActionQueue, badge + Ask on TransferCard, banner copy"` and push.
4. Verify `cat prompt.md` reflects Phase 4 in LAST SESSION SUMMARY.

After Phase 5: the sprint goal is complete. Demo is ready. Next work would be end-to-end chatbot verification with `ANTHROPIC_API_KEY` set.

## FILES IN PLAY
- `prompt.md` — updated this session
- `scripts/handoff.sh` — run to commit + push

## LOCKED / DO NOT TOUCH
- Hero SKU **J-72402** and its demo numbers
- `demo/scenario.md` narrative
- All Phase 0–4 backend + frontend work
- All entries in `CLAUDE.md` § "Do not re-derive" (14 items)

## BLOCKERS
- End-to-end chatbot test requires `ANTHROPIC_API_KEY` in environment.
- All other features are complete and build-verified.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then read shared/roadmap.md for the full phase breakdown. Implement the NEXT TASK (Phase 5) exactly as specified. Follow the Context budget & handoff protocol from CLAUDE.md — commit small, push often, hand off when context hits 25%.
```
