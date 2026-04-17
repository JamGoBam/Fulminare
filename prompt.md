# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Ship **Transfer-vs-Wait decision engine + AI chatbot for non-technical ops managers**. Keep the J-72402 demo narrative intact. Full roadmap in `shared/roadmap.md` (Phase 0 → 5).

## LAST SESSION SUMMARY
- Shipped Phase 3 (AI Chatbot): `chat_prompts.py` (system prompt + ephemeral cache_control), `chat_tools.py` (7 read-only tools: get_dashboard_summary, get_sku_status, list_critical_skus, get_transfer_recommendation, get_chargeback_breakdown, explain_metric, get_open_pos), `routes/chat.py` (POST /api/chat SSE with tool-use loop, 20-turn cap), `Chatbot.tsx` (FAB + Sheet + streaming + quick suggestions), layout.tsx updated with TooltipProvider + Chatbot.
- Build clean, 59/59 tests. FAB verified rendering bottom-right in browser with no console errors. End-to-end chat requires ANTHROPIC_API_KEY — not verified yet (key not in this shell).
- `.claude/launch.json` updated with correct macOS pnpm config (was stale Windows paths).

## NEXT TASK
**Phase 4 — Accessibility layer** per `shared/roadmap.md` § "Phase 4". One commit.

Acceptance criteria:
1. `components/MetricTooltip.tsx` — shadcn Tooltip wrapper with `metric` prop; reads from a `GLOSSARY` const seeded from `shared/metrics.md`. Wrap every column header in ImbalanceTable, TransferCard, ChargebackHeatmap.
2. `components/ActionQueue.tsx` — renders `/api/recommendations/alerts`. Each row: rank badge, plain-English reason, **Explain** button that opens chatbot with prefilled prompt. Renders above the imbalance table on the dashboard home page.
3. `TransferCard.tsx` — add TRANSFER/WAIT colored badge, hover-reveal reason, inline **Ask** button that pipes the row's reason into the chatbot.
4. `SavingsBanner.tsx` — rewrite to use new `/api/summary` fields: *"Manual process: $X lost annually. POP Assistant: $Y avoidable. **N% reduction.**"*
5. `pnpm build` clean, no TypeScript errors.
6. Browser: hover a column header → tooltip shows metric definition. Dashboard shows ActionQueue above imbalance table.

Commit message: `[FRONTEND] accessibility: MetricTooltip, ActionQueue, badge + Ask on TransferCard, banner copy`

Then Phase 5: update handoff docs (this file + CLAUDE.md if any locked assumptions changed).

## FILES IN PLAY
- `web/frontend/components/MetricTooltip.tsx` — NEW
- `web/frontend/components/ActionQueue.tsx` — NEW
- `web/frontend/components/TransferCard.tsx` — add badge + Ask button
- `web/frontend/components/SavingsBanner.tsx` — rewrite copy to manual-vs-system
- `web/frontend/components/ImbalanceTable.tsx` — wrap headers with MetricTooltip
- `web/frontend/components/ChargebackHeatmap.tsx` — wrap headers with MetricTooltip
- `web/frontend/app/page.tsx` — add ActionQueue above ImbalanceTable

## LOCKED / DO NOT TOUCH
- Hero SKU **J-72402** and its demo numbers
- `demo/scenario.md` narrative
- All Phase 0–3 backend work
- All entries in `CLAUDE.md` § "Do not re-derive" (14 items)

## BLOCKERS
- End-to-end chatbot test requires `ANTHROPIC_API_KEY` in environment.
- Phase 3 is otherwise complete.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then read shared/roadmap.md for the full phase breakdown. Implement the NEXT TASK (Phase 4) exactly as specified. Follow the Context budget & handoff protocol from CLAUDE.md — commit small, push often, hand off when context hits 25%.
```
