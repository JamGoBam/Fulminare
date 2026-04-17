# Roadmap — Transfer-vs-Wait + Accessibility + AI Chatbot

> Authored 2026-04-17 as the handoff from the heatmap-polish session. Execute in order: Phase 0 → 1 → 2 → 3 → 4 → 5. Commit at every phase boundary. See `prompt.md` for the live NEXT TASK.

## Why

Prior sessions shipped the demo visuals against hero SKU J-72402. Under the hood, the decision engine is thin and the app assumes a technical audience:

1. **Transfer engine doesn't evaluate "wait."** `analytics/transfer.py` never reads `open_po`, uses a flat `$15/unit` chargeback proxy (line 14), and emits multiple mutually-exclusive rows per destination DC. This directly contradicts the hackathon brief's headline requirement.
2. **Ops managers can't self-serve.** UI shows raw numbers (DoS 12.0, imbalance 7.2) with no in-app explanation. `analytics/alerts.py` is a stub, so there's no "what should I do first" queue.
3. **Handoff docs were stale** until this commit.

This roadmap closes the Transfer-vs-Wait gaps, adds a Claude-API-powered in-app assistant + lightweight accessibility scaffolding.

## Scope

**In scope**
- 8 gaps from the prior session: transfer engine, chargeback analysis, alerts, pipeline, API shapes, centralized frontend config, per-SKU endpoint, tests.
- Accessibility: metric tooltips, plain-English action queue, contextual help copy.
- AI chatbot: backend `/api/chat` with Claude tool-use over existing analytics; frontend floating Sheet UI.

**Out of scope**
- New data sources, forecast models, or ML.
- Mobile layout, auth, multi-user state.
- Any deviation from CLAUDE.md §"Do not re-derive" locks.

## Critical files

Existing (modify): `analytics/transfer.py`, `analytics/chargeback.py`, `analytics/alerts.py`, `analytics/pipeline.py`, `web/api/main.py`, `web/api/routes/{inventory,chargebacks,recommendations}.py`, `web/frontend/components/{TransferCard,SavingsBanner,StatsBar}.tsx`, `web/frontend/app/sku/[sku]/page.tsx`, `web/frontend/app/chargebacks/page.tsx`, `pyproject.toml`, `web/frontend/package.json`, `tests/test_transfer.py`, `tests/test_chargeback.py`.

New: `web/api/routes/chat.py`, `web/api/chat_tools.py`, `web/api/chat_prompts.py`, `web/frontend/lib/api.ts`, `web/frontend/components/{Chatbot,MetricTooltip,ActionQueue}.tsx`, `tests/test_alerts.py`.

## Phase 0 — Foundation (one commit)

1. Add `anthropic>=0.40` to `pyproject.toml`; `uv pip install -e .`
2. Add shadcn: `pnpm --dir web/frontend dlx shadcn@latest add sheet tooltip dialog scroll-area input`. **Before** writing any frontend code, read `web/frontend/node_modules/next/dist/docs/` per `web/frontend/AGENTS.md` (Next.js 16 has breaking changes vs. training data).
3. Create `web/frontend/lib/api.ts` exporting `API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"` plus a typed `apiGet<T>(path)`. Replace the 7 hardcoded `http://localhost:8000` sites: `components/ChargebackHeatmap.tsx:16`, `components/ImbalanceTable.tsx:16`, `components/SavingsBanner.tsx:6`, `components/StatsBar.tsx:6`, `components/TransferCard.tsx:15`, `app/chargebacks/page.tsx:9`, `app/sku/[sku]/page.tsx:76`.
4. Document `ANTHROPIC_API_KEY` as a required runtime env var for Phase 3. Ensure `.env.local` is gitignored.

Commit: `[META] foundation: centralize api base, add anthropic + shadcn ui deps`

## Phase 1 — Transfer-vs-Wait engine (Python)

Reuse `forecast.demand_rate`, `metrics.days_of_supply`, `metrics.transfer_cost`, `DC_MAP`/thresholds from `data/constants.py`.

### 1a. Expand `analytics/chargeback.py`

New exports (all TPR-filtered per `constants.py:70`):
- `top_causes(df, n=5)` → `[cause_code, total_amount, count, pct_of_total]`
- `top_customers(df, n=10)` → `[customer_id, total_amount, count]`
- `top_channels(df, n=5)` → `[channel, total_amount]`
- `by_dc(df)` → `[dc, total_amount]`
- `monthly_trend(df)` → `[month(YYYY-MM), total_amount]`
- `penalty_rate(df, customer_id, channel, dc) → float` — mean $ per event for that (customer, channel, dc) tuple; fall back channel → DC → global when <3 samples.

Keep existing `chargeback_summary` (heatmap still uses it).

### 1b. Rewrite `analytics/transfer.py`

```python
def transfer_recommendations(
    inventory_df, sales_df, skus_df, freight_df,
    open_po_df, chargebacks_df,
) -> pd.DataFrame: ...
```

Output columns:
```
sku, product_name, dest_dc, action, origin_dc, qty, transfer_cost,
inbound_po_id, inbound_eta, inbound_qty, days_to_stockout,
penalty_avoided, net_saving, reason
```
`action ∈ {"TRANSFER", "WAIT"}`. Null `origin_dc`/`transfer_cost` for WAIT; null `inbound_*` for TRANSFER.

Per `(sku, dest_dc)` with DoS < `DOS_WARNING`:
1. `days_to_stockout = available / rate`.
2. Find inbound POs for (sku, dest_dc) where `expected_arrival` is within `days_to_stockout + 3`. Shift arrival by +7 days if `delay_flag` truthy.
3. If PO lands before stockout AND lifts DoS ≥ WARNING: emit **WAIT** with `reason = "Inbound PO {po_id} arrives in {n} days with {qty} units"`.
4. Else find best origin: `(dos_origin_after_transfer) ≥ DOS_WARNING` (origin-protection). Prefer largest cushion, tie-break by freight cost.
5. No protected origin → **WAIT** with `reason = "No DC has spare inventory; escalate to planner"`, `penalty_avoided = 0`.
6. Transit = `INTER_DC_TRANSIT_DAYS` (3d locked). If `days_to_stockout < 3`, reason notes risk days.
7. Penalty: `penalty_rate(dominant_customer, dominant_channel, dest_dc) × expected_shortfall_units`. Dominant = last 90 days of sales.
8. `net_saving = penalty_avoided - transfer_cost` (or `- 0` for WAIT). Emit only if net > 0 OR action=WAIT.
9. **Exactly one row per (sku, dest_dc).**

### 1c. Implement `analytics/alerts.py`

`rank_alerts(imbalance_df, transfer_df, chargebacks_df, n=10)` →
`[rank, sku, dc, priority_score, action, reason, days_to_stockout, exposure_dollars]`.

- Priority = `normalize(imbalance) + normalize(annual_exposure) + urgency(1/max(days_to_stockout, 1))`.
- WAIT-with-inbound-relief ranks lower.
- `reason` is ops-manager prose, not dev jargon.

### 1d. Wire `analytics/pipeline.py`

`run(processed_dir=Path("data/processed"))`:
- Read all parquets (ingest pre-run).
- Orchestrate imbalance → chargeback.{top_causes, top_customers, monthly_trend, by_dc} → transfer → alerts.
- Write each output as `data/processed/{name}.parquet`.
- `python -m analytics.pipeline` as CLI entry.
- Call from `web/api/main.py` lifespan after `ingest_run`.

### 1e. Tests

- `tests/test_transfer.py`: (i) WAIT when inbound in time, (ii) TRANSFER when no inbound, (iii) origin-protection rejects, (iv) `delay_flag` flips WAIT→TRANSFER, (v) one row per (sku, dest_dc).
- `tests/test_chargeback.py`: TPR filter, top-N shapes, `penalty_rate` fallback chain.
- `tests/test_alerts.py` (new): ranking order, inbound relief lowers rank, reason non-empty.

Commit after each sub-phase (1a, 1b, 1c, 1d, 1e).

## Phase 2 — API surface

All additive. Typed pydantic response models.

- `GET /api/recommendations/transfers` — updated shape (1b).
- `GET /api/recommendations/alerts?limit=10` — new.
- `GET /api/chargebacks/top-causes?n=5` — new.
- `GET /api/chargebacks/top-customers?n=10` — new.
- `GET /api/chargebacks/by-channel` — new.
- `GET /api/chargebacks/trend` — new.
- `GET /api/inventory/sku/{sku}` — new. Returns `{sku, product_name, dcs: [...], open_pos: [...], recommendation: {...}, chargeback_history_summary: {...}}`.
- `GET /api/summary` — rewrite to **manual-vs-system**:
  - `manual_annual_penalty` = observed chargebacks (last 12 mo annualized).
  - `system_avoidable_annual` = sum(alerts where action=TRANSFER, net_saving) × 12.
  - Return `{manual, system, delta, pct_reduction}`.

## Phase 3 — AI Chatbot

### Architecture

```
Browser ─ POST /api/chat (SSE) ─► FastAPI ─► Anthropic SDK (tool-use loop)
                                    │
                                    └─ tool calls ─► analytics/*, data/processed/*.parquet
```

- Backend owns LLM calls (no key in browser).
- **Tool use, not RAG.** Model: `claude-sonnet-4-6` for demo speed.
- Prompt caching on system prompt + tool schemas.

### 3a. `web/api/chat_prompts.py`

System prompt contains:
- Role: *"POP Inventory Assistant — helps ops managers understand imbalances, evaluate transfer-vs-wait, read chargeback data."*
- 6-metric glossary (copy from `shared/metrics.md`).
- Locked assumptions (DC names, cause codes, thresholds) so the model never invents alternates.
- Hero SKU J-72402 context for demo reliability.
- Tone: plain English, cite $ impact, suggest 1 next action.
- `cache_control: {"type": "ephemeral"}` on the system prompt.

### 3b. `web/api/chat_tools.py` (read-only v1)

1. `get_dashboard_summary()` → banner numbers.
2. `get_sku_status(sku)` → same shape as `GET /api/inventory/sku/{sku}`.
3. `list_critical_skus(dc?, limit=10)`.
4. `get_transfer_recommendation(sku, dest_dc?)`.
5. `get_chargeback_breakdown(by: cause|customer|channel|dc|trend, limit=10)`.
6. `explain_metric(metric: dos|imbalance|transfer_cost|chargeback_risk|otif)`.
7. `get_open_pos(sku?, dc?)`.

All read parquet/duckdb (no recompute). Keep latency <200ms.

### 3c. `web/api/routes/chat.py`

```
POST /api/chat
body: { messages: [...], page_context?: {path, sku?} }
returns: text/event-stream (SSE)
```

Loop: send messages+tools → stream → if `tool_use`, execute, append `tool_result`, re-invoke; else stream tokens as SSE `data:` events.

Event types: `token`, `tool_start`, `tool_end`, `done`, `error`. Cap messages at 20 per session.

### 3d. Frontend `components/Chatbot.tsx`

- Fixed FAB bottom-right (`lucide-react` MessageSquare icon).
- Opens shadcn `<Sheet side="right">` with messages + input.
- Stream with `fetch` + `ReadableStream.getReader()`, parse SSE on `\n\n`.
- Bubbles: user right, assistant left, tool-call as gray collapsed pill.
- Inject page context on first message: `{path: pathname, sku: params.sku ?? null}`.
- Quick suggestions by page:
  - `/` → "What's my #1 action today?" · "How much could we save?"
  - `/sku/[sku]` → "Why is this flagged?" · "Transfer or wait?"
  - `/chargebacks` → "Top customer?" · "Top cause?"
- Mount in `app/layout.tsx`.
- Error toast for missing key / rate limit.

### 3e. Guardrails

- Tools never mutate. If LLM hallucinates an action, no code path executes it.
- System prompt: *"Any specific dollar figure requires a tool call first."*
- Log every tool call to stdout for rehearsal verification.

## Phase 4 — Accessibility layer

1. `components/MetricTooltip.tsx`: shadcn Tooltip wrapper with a `metric` prop; reads from a shared `GLOSSARY` const seeded from `shared/metrics.md`. Wrap every column header in ImbalanceTable, TransferCard, ChargebackHeatmap.
2. `components/ActionQueue.tsx`: renders `/api/recommendations/alerts`. Each row: rank badge, plain-English reason, **Explain** button that opens the chatbot with prefilled prompt. Goes above the imbalance table.
3. `TransferCard.tsx`: add TRANSFER/WAIT colored badge, hover-reveal reason, inline **Ask** button pipes row into chatbot.
4. `SavingsBanner.tsx`: render as *"Manual process: $X lost annually. POP Assistant: $Y avoidable. **N% reduction.**"* using new `/api/summary` fields.

## Phase 5 — Handoff docs (update after each phase)

Each phase must update `prompt.md` with the new LAST SESSION SUMMARY + NEXT TASK before calling `scripts/handoff.sh`. CLAUDE.md gets updated only when a locked assumption changes (Phase 1b adds delay_flag +7d shift; Phase 3 adds ANTHROPIC_API_KEY requirement).

## Verification

**Phase 1:** `pytest -q` → 29 + ~12 new. `python -m analytics.pipeline` writes all parquets.

**Phase 2:** `curl localhost:8000/api/recommendations/alerts | jq '.[0]'` returns a ranked alert. `curl .../api/inventory/sku/J-72402` returns per-DC shape. `curl .../api/summary` returns `{manual, system, delta, pct_reduction}`.

**Phase 3 (e2e):**
- Boot with `ANTHROPIC_API_KEY` set.
- Browser: open chat, ask *"Why is J-72402 flagged critical?"* → expect `get_sku_status` tool call + reply citing 12-day DoS + $660.
- On `/sku/J-72402`: *"Should we transfer or wait?"* → TRANSFER rec with freight cost.
- Dashboard: *"What's the top chargeback cause?"* → `get_chargeback_breakdown(by="cause")` + $.
- Use `preview_*` tools for headless verification + screenshot for handoff proof.

**Phase 4:** Hover column header → tooltip. Dashboard shows ActionQueue above imbalance table. Banner reads manual-vs-system copy.

**Phase 5:** `cat prompt.md` reflects latest phase. `grep -n "Next.js 14" CLAUDE.md` returns nothing.

## Confirmed decisions

1. **Chatbot UI** = floating Sheet via bottom-right FAB. Auto-injects page context.
2. **Chatbot scope** = read-only Q&A in v1. No write tools.
3. **Phasing** = 0 → 1 → 2 → 3 → 4 → 5. Transfer-vs-Wait is the demo headline; chatbot augments it.
