# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Ship **Transfer-vs-Wait decision engine + AI chatbot for non-technical ops managers**. Keep the J-72402 demo narrative intact. Full roadmap in `shared/roadmap.md` (Phase 0 → 5).

## LAST SESSION SUMMARY
- Shipped Phase 2 (API surface): 8 new/updated endpoints — `/api/recommendations/transfers` (new schema from Phase 1b), `/api/recommendations/alerts`, `/api/chargebacks/top-causes`, `/api/chargebacks/top-customers`, `/api/chargebacks/by-channel`, `/api/chargebacks/trend`, `/api/inventory/sku/{sku}` (full per-SKU detail), `/api/summary` (rewritten to manual-vs-system). All return typed pydantic response models. All read pre-computed parquets.
- Smoke-tested all endpoints against seed data — all return correct JSON. `pytest -q` 59/59.
- Note: seed data produces `system_avoidable_annual >> manual_annual_penalty` in `/api/summary` — this is a seed-data artifact (penalty_rate × units >> small seed chargebacks). With real POP data the ratio will normalize.

## NEXT TASK
**Phase 3 — AI Chatbot** per `shared/roadmap.md` § "Phase 3". Requires `ANTHROPIC_API_KEY` in environment.

### 3a. `web/api/chat_prompts.py` (NEW)
- System prompt: POP Inventory Assistant role, 6-metric glossary, locked assumptions (DC names, cause codes, thresholds), hero SKU J-72402 context, tone guide (plain English, cite $ impact, suggest 1 next action).
- `cache_control: {"type": "ephemeral"}` on system prompt per CLAUDE.md locked assumption #14.

### 3b. `web/api/chat_tools.py` (NEW)
Read-only tools (all read parquet/duckdb, no mutation):
1. `get_dashboard_summary()` → banner numbers from `/api/summary` data
2. `get_sku_status(sku)` → same shape as `GET /api/inventory/sku/{sku}`
3. `list_critical_skus(dc?, limit=10)` → from `imbalance.parquet`
4. `get_transfer_recommendation(sku, dest_dc?)` → from `transfers_computed.parquet`
5. `get_chargeback_breakdown(by: cause|customer|channel|dc|trend, limit=10)` → from matching parquet
6. `explain_metric(metric: dos|imbalance|transfer_cost|chargeback_risk|otif)` → returns glossary text
7. `get_open_pos(sku?, dc?)` → from `open_po.parquet`

### 3c. `web/api/routes/chat.py` (NEW)
- `POST /api/chat` — SSE stream
- Body: `{messages: [...], page_context?: {path, sku?}}`
- Tool-use loop: stream → if `tool_use`, execute tool → append `tool_result` → re-invoke
- Event types: `token`, `tool_start`, `tool_end`, `done`, `error`
- Cap messages at 20 per session
- Register in `web/api/main.py`

### 3d. `web/frontend/components/Chatbot.tsx` (NEW)
- Fixed FAB bottom-right (`lucide-react` MessageSquare icon)
- Opens shadcn `<Sheet side="right">`
- Fetch SSE via `ReadableStream.getReader()`, parse on `\n\n`
- Bubbles: user right, assistant left, tool-call as gray pill
- Page context injected on first message
- Quick suggestions by page (3 per page)
- Mount in `app/layout.tsx`

Acceptance criteria: (see roadmap Phase 3 verification section)

Commit messages: `[BACKEND] chat: add chat_prompts, chat_tools, chat route` then `[FRONTEND] chat: add Chatbot component + FAB`

## FILES IN PLAY
- `web/api/chat_prompts.py` — NEW
- `web/api/chat_tools.py` — NEW
- `web/api/routes/chat.py` — NEW
- `web/api/main.py` — add chat router
- `web/frontend/components/Chatbot.tsx` — NEW
- `web/frontend/app/layout.tsx` — mount Chatbot + TooltipProvider

## LOCKED / DO NOT TOUCH
- Hero SKU **J-72402** and its demo numbers
- `demo/scenario.md` narrative
- All Phase 0–2 work (API routes, analytics, lib/api.ts)
- CLAUDE.md locked assumption #13: chatbot is read-only in v1
- CLAUDE.md locked assumption #14: model = `claude-sonnet-4-6`, cache system prompt

## BLOCKERS
- Phase 3 requires `ANTHROPIC_API_KEY` in environment for end-to-end verification.
- The `anthropic>=0.40` package is already installed (Phase 0 dep).

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then read shared/roadmap.md for the full phase breakdown. Implement the NEXT TASK (Phase 3) exactly as specified. Follow the Context budget & handoff protocol from CLAUDE.md — commit small, push often, hand off when context hits 25%.
```
