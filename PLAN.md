# POP Inventory — Plan: data cleanup, frontend reorganization, in-house chatbot

## Context

Prince of Peace ships ~800 SKUs through 3 DCs to 100k+ retail outlets. The current app was built as a 72-hour hackathon demo (HTC 2026): 3 routes, 4 seed SKUs, jargon-heavy UI, and an Anthropic-hosted chatbot gated on `ANTHROPIC_API_KEY`. The user has now pivoted it toward real users — non-technical, entry-level supply managers who live in spreadsheets and need to make $5K freight calls under time pressure without engineering help.

This plan covers three linked workstreams:

1. **Clean the data** so every number surfaced to the user is defensible and the silent-failure modes in the analytics pipeline stop masking real problems.
2. **Reorganize the frontend** around jobs-to-be-done, not tables — replacing the 3-route demo with a triage-first IA, searchable inventory, plain-language labels, and inline next-action CTAs.
3. **Rebuild the chatbot to run in-house** with zero external API key, swap the Anthropic SDK for a local inference server (Ollama), and add grounding guardrails so the model cannot hallucinate inventory numbers.

Nothing in this plan is code. It's an executable blueprint: every phase is sized to fit one Claude Code task, references specific files, and names the existing utilities to reuse.

---

## Key assumptions & open decisions

Based on the planning Q&A:
- **Real-user pivot confirmed.** The 14 "Do not re-derive" locks in CLAUDE.md are no longer binding. J-72402 is no longer sacred; thresholds become configurable; the demo narrative stops governing decisions.
- **Hardware for local inference = lowest-friction path.** Plan targets Ollama + Qwen2.5-7B-Instruct running on an M-series Mac / modest CPU box (≥16GB RAM). A one-line config switch lets ops upgrade to a 14B/32B on better hardware later.
- **Full IA rewrite for the frontend.** New nav: `Today` / `Inventory` / `Transfers` / `Chargebacks` / `Ask`. The old `/`, `/sku/[sku]`, `/chargebacks` routes get absorbed or redirected.

Open assumptions that future tasks may need to revisit:
- We keep `DC_EAST` / `DC_WEST` / `DC_CENTRAL` as the internal canonical codes but render user-facing labels ("East DC", "West DC", "Central DC") — real POP site names can be swapped in via a single `DC_LABELS` map.
- Seed data stays synthetic for now but is regenerated with ~25 SKUs showing varied patterns (healthy / watch / critical / overstock / stuck-in-transit). If real POP XLSX is available, `data/ingest_real.py` is the preferred entry point.
- Chatbot is still read-only (v1). Mutation tools are explicitly out of scope; if the model recommends an action, the UI surfaces it as copy, not a button that executes.
- "Entry-level supply manager" is the primary persona; everything else (senior ops manager, buyer, finance) is a secondary consumer.

---

## 1. User & UX foundation

### Personas

**Primary — Sam, Entry-Level Supply Coordinator (1–2 yrs experience)**
- Lives in Excel, Outlook, and the WMS. No SQL, no Python.
- Starts the day asking "what's about to break?" and ends it logging what they did.
- Gets blamed for chargebacks they couldn't see coming; blames the system for not warning them.
- Time pressure: on a good day, 15 minutes in the morning to triage; reactive the rest of the day.
- Vocabulary: "stock", "running low", "split shipment", "chargeback". Not: "DoS", "OTIF", "imbalance score".

**Secondary — Dana, Ops Manager / Buyer's Planner (5–10 yrs)**
- Reviews Sam's transfer calls, defends the freight budget to finance.
- Needs defensible rationale ("why did we spend $5K on a transfer?") and before/after framing.
- Power user — will use filters and saved views, will want to export.

**Tertiary — Finance / Leadership**
- Consumes the "save $X annually" banner and the chargeback trend chart. Rarely clicks in.

### Top jobs-to-be-done, ranked by frequency × stakes

1. **"Is anything going to stock out this week?"** — Daily, high stakes. Answered by the Today screen in <10 seconds.
2. **"Should I transfer X from one DC to another, or wait for the PO?"** — Daily, $-denominated. Answered by the Transfers page + per-SKU rationale card.
3. **"Which chargebacks are hurting me most, and why?"** — Weekly, high stakes. Answered by the Chargebacks page with filters on customer, channel, DC.
4. **"What should I work on this morning?"** — Daily, triage. Answered by the Today screen's ranked action queue.
5. **"Show me everything critical in DC_EAST"** — Daily, filtering task. Answered by Inventory browser filters.
6. **"Explain this recommendation to my boss"** — Weekly. Answered by the rationale card + Ask (chatbot) with citations.
7. **"What's my total exposure if I do nothing?"** — Monthly, budget-defense. Answered by the savings banner + drill-down.

### Design principles (binding on every screen we build)

1. **Every number has a "so what"** — no raw count or score appears without a dollar impact or action next to it.
2. **Every alert has a recommended next step** — never surface a problem without a CTA ("Transfer from West", "Wait for PO arriving Fri", "Escalate to buyer").
3. **No jargon without a tooltip and an inline plain-language equivalent** — "Days of supply (cover)", not "DoS 12".
4. **Traffic lights, not just colors** — severity encoded by icon + text + color, for colorblind users.
5. **Explain before you recommend** — show the $ tradeoff ($ risk of waiting vs $ of transferring) inline, not buried two clicks deep.
6. **Scannable in <10 seconds** — assume the user is between meetings. Primary action goes top-left; secondary goes right.
7. **Fail gracefully, speak plainly** — error copy is "we couldn't load today's data, try again in a moment", never "API 500" or "is port 8000 running?".
8. **Empty states are informative, not ambiguous** — "All SKUs balanced — no action needed ✓ (last checked 2 min ago)" beats a blank card.

---

## 2. Data cleanup

### What's wrong today

From [`analytics/pipeline.py`](analytics/pipeline.py), [`data/ingest.py`](data/ingest.py), and the seed CSVs in [`data/seed/`](data/seed/):

| Problem | Where | Impact |
|---|---|---|
| Seed covers only 4 SKUs (SKU-001..004); J-72402 referenced in demo/docs isn't in seed | `data/seed/*.csv` | App ships with an empty-looking UI; `[SKU-based scenarios](demo/scenario.md)` broken |
| SKU-004 missing from `po_history.csv` and `open_po.csv` | `data/seed/po_history.csv`, `open_po.csv` | [`analytics/transfer.py:69`](analytics/transfer.py) silently drops SKU-004 |
| Date windows misaligned — sales cover ~18 days, chargebacks are 10+ months older | `data/seed/sales.csv`, `chargebacks.csv` | 30-day demand window returns 0 for some SKU-DC pairs → DoS = infinity → masked critical SKUs |
| No referential integrity checks between files | pipeline has no validator | sales.sku not in skus.csv, inventory rows missing DC coverage, unknown supplier refs all pass silently |
| `analytics/imbalance.py:32` assumes every SKU has rows in all 3 DCs | `analytics/imbalance.py` | `.iloc[0]` without bounds check — crashes or silently uses wrong DC row |
| `analytics/transfer.py:116` divides by `rate_dest` without zero-check | `analytics/transfer.py` | Zero-division when destination DC has no demand history |
| `penalty_rate()` returns 0 with `qty_needed = 0` without explanation; WAIT action demoted silently | `analytics/transfer.py:85` | User sees "WAIT" without seeing that it's because there's no demand at destination |
| DC labels hardcoded as `DC_EAST/WEST/CENTRAL` in every UI surface | `web/frontend/components/*.tsx` | No way to surface user-friendly site names without a codebase-wide search/replace |
| No "plain-language status" column on any derived table | `data/processed/*.parquet` | Frontend has to recompute thresholds client-side; chatbot has no single source of truth |
| Chargebacks have `cause_code` enums (SHORT_SHIP, LATE_DELIVERY, DAMAGE, MISSED_WINDOW, TPR) shown raw in UI | heatmap + tooltips | Sam doesn't know what TPR is without hovering every cell |

### Specific transformations

#### 2.1 Seed regeneration — `data/seed/generate.py` (new)
- 25 SKUs across 3 DCs (75 inventory rows) with deliberate patterns:
  - 3 critical (one per DC) — DoS < 14
  - 6 warning (mixed DCs) — 14 ≤ DoS < 30
  - 12 healthy — 30 ≤ DoS < 90
  - 3 overstock — DoS > 180 (surfaces transfer-out opportunities)
  - 1 stuck-in-transit — delayed open PO with `delay_flag=True`
- 180 days of sales history (not 18) so trailing-30-day always has samples.
- Chargebacks aligned to sales dates; 4 cause codes (TPR filtered), 3 customers, 3 channels.
- J-72402 kept as one of the 25 SKUs (so existing docs/tests keep working) but no longer privileged — demo can walk through any of the 3 critical SKUs.
- All synthetic; script is deterministic (`seed=42`) so CI and teammates see identical data.

#### 2.2 Referential-integrity validator — `data/validate.py` (new)
Run as the last step of [`data/ingest.py`](data/ingest.py). Checks and fails loudly:
- Every `sales.sku` ∈ `skus.sku`
- Every `sales.ship_from_dc` ∈ `{DC_EAST, DC_WEST, DC_CENTRAL}`
- Every SKU × DC in `inventory.csv` (75 rows for 25 SKUs)
- Every `po_history.po_id` unique; every `open_po.sku` in `skus.sku`
- Every supplier referenced in `skus` exists in `suppliers`
- Every freight lane `origin → destination` present for every DC pair used in `transfers` or computed transfer recs
- Every chargeback date within the last 365 days of the snapshot
- Output: `data/processed/validation_report.json` with pass/fail per check and a total error count. Pipeline aborts on fail.

#### 2.3 Defensive guards in analytics
- `analytics/imbalance.py:32` — replace `.iloc[0]` with a safe lookup that logs a warning and skips SKUs with <3 DC rows.
- `analytics/transfer.py:116` — guard against `rate_dest == 0`, return `float("inf")` for `dos_after`.
- `analytics/transfer.py:85` — when `penalty_avoided == 0` AND `qty_needed == 0`, emit reason="no demand at destination" on the WAIT action so the UI can render "no action needed" instead of the current ambiguous WAIT.
- All silent failures become log entries in a pipeline run log (`data/processed/pipeline_run.log`).

#### 2.4 Enriched derived columns — `analytics/enrich.py` (new)
After the existing pipeline, one more pass writes `data/processed/enriched.parquet`:
- `status_plain` — one of `Critical` / `Watch` / `Healthy` / `Overstock` (using locked thresholds but configurable via `analytics/constants.py`)
- `status_reason` — a one-sentence English rationale ("Will stock out in 9 days at current demand", "Inbound PO arrives before stockout", etc.)
- `dollar_exposure` — `unit_cost × projected_shortfall_units` for the next 14 days. Zero for healthy SKUs.
- `days_until_stockout` — integer (or `null` for infinite), pre-computed so the frontend never has to divide.
- `recommended_action` — one of `TRANSFER` / `WAIT` / `ESCALATE` / `NONE` — linked to transfers_computed row when TRANSFER.
- `next_po_eta` — date of next inbound PO (accounting for `delay_flag → +7d` shift), or `null`.

This table is the single source of truth. Both the frontend and the chatbot read from it.

#### 2.5 User-facing DC labels
New file `data/dc_labels.py` exporting `DC_LABELS = {"DC_EAST": "East DC", "DC_WEST": "West DC", "DC_CENTRAL": "Central DC"}`. Every UI surface imports this; the chatbot system prompt is updated to use the labels in generated text. Swapping to real POP site names ("Carlisle", "Reno", "Memphis") is one file edit.

### Mapping: cleaned data → UI surfaces

| Derived column / table | Home / Today | Inventory | Transfers | Chargebacks | SKU detail | Chatbot |
|---|---|---|---|---|---|---|
| `enriched.status_plain` | severity chips | list filter | — | — | DC cards | `get_sku_status` |
| `enriched.status_reason` | action queue copy | row subtitle | rationale | — | headline | in every answer |
| `enriched.dollar_exposure` | triage ranking | sort key | savings math | — | card | `list_critical_skus` |
| `enriched.days_until_stockout` | alert copy | column | urgency | — | card | `get_sku_status` |
| `enriched.recommended_action` | CTA | row CTA | row | — | CTA | `get_transfer_recommendation` |
| `enriched.next_po_eta` | action copy | tooltip | rationale | — | timeline | `get_open_pos` |
| `transfers_computed` | — | — | full table | — | rec table | existing |
| `cb_top_causes/customers/channels/dc` | — | — | — | heatmap + drill-down | — | `get_chargeback_breakdown` |
| `DC_LABELS` | everywhere | everywhere | everywhere | everywhere | everywhere | system prompt |

---

## 3. Frontend reorganization

### 3.1 Information architecture

**New primary nav** (left sidebar, collapsible on mobile):

| Route | Purpose | Replaces |
|---|---|---|
| `/` → `/today` | Triage-first landing page; "what must I do right now?" | old `/` |
| `/inventory` | Browsable table of all ~800 SKUs with filters and saved views | (new) |
| `/transfers` | Queue of transfer-vs-wait decisions with $ tradeoffs | part of old `/` |
| `/chargebacks` | Heatmap + list + drill-down by customer/channel/DC | old `/chargebacks` |
| `/sku/[sku]` | Deep dive: 3-DC cards, PO timeline, transfer options, chargeback history | old `/sku/[sku]` (expanded) |
| `/ask` | Full-screen chat (mirror of the FAB Sheet) | (new) |

**Persistent top bar**: global search (SKU code or product name), "Today is April 17, 2026" date chip, user menu (stub).

**Persistent right-side FAB**: chatbot Sheet (existing `Chatbot.tsx`), now with a "Open in full screen" link that jumps to `/ask`.

### 3.2 Key screens — wireframe-level descriptions

#### 3.2.1 `/today` — Triage-first home
```
┌─ Top bar: Search ────────────────────── Apr 17  🔔3  Sam ▾ ─┐
├─ Hero strip (1 line of copy, 1 dollar number) ─────────────┤
│  "Today you have 3 critical SKUs — $42,800 at risk."       │
├─ 3-up severity counters (click → filtered Inventory) ──────┤
│  [🔴 3 Critical] [🟡 12 Watch] [🟢 785 Healthy]              │
├─ Action queue (top 5, ranked by $ + urgency) ──────────────┤
│  1. J-72402 in East DC — stock out in 4 days, $12.4K risk  │
│     [Transfer from West ($840)] [Wait for PO (due Fri)]    │
│  2. ...                                                    │
├─ Savings banner (before/after) ────────────────────────────┤
│  Manual process cost you $680K last 12 mo.                 │
│  System avoided $520K (76%). [See how →]                   │
├─ Recently resolved (last 7 days) — 2 lines, collapsed ─────┤
└─────────────────────────────────────────────────────────────┘
```
Every row in the action queue has two CTAs (primary + secondary) and a plain-language reason.

**Uses existing components** (refactored): [`web/frontend/components/ActionQueue.tsx`](web/frontend/components/ActionQueue.tsx), [`StatsBar.tsx`](web/frontend/components/StatsBar.tsx), [`SavingsBanner.tsx`](web/frontend/components/SavingsBanner.tsx).

#### 3.2.2 `/inventory` — Browsable SKU table
```
┌─ Filters (sticky left rail) ──────────┬─ Results (785 shown) ─┐
│ Status: ☑ Critical ☑ Watch ☐ Healthy  │ [Table with:         │
│ DC:     ☑ East ☐ West ☑ Central        │   SKU • Name • DC •  │
│ $ risk: [ 0 ]—[100K]                   │   Status chip •      │
│ Search: [J-72…]                        │   Days left •        │
│                                        │   $ at risk •        │
│ Saved views:                           │   Action CTA ]       │
│ ⭐ My morning triage                    │                      │
│ ⭐ East DC watchlist                    │ [Pagination or        │
│ ⭐ Overstock candidates                 │  virtualize]          │
│ [ + New saved view ]                   │                      │
└────────────────────────────────────────┴──────────────────────┘
```
- Search hits SKU code and product name, debounced 200ms.
- Saved views stored in `localStorage` (no backend auth in v1).
- Each row's CTA is `recommended_action` from enriched parquet; clicking opens `/sku/[sku]`.
- Empty state: "No SKUs match these filters. Try removing Status filter." (actionable, not "No results.")

#### 3.2.3 `/transfers` — Transfer-vs-wait queue
```
┌─ Top: 3 pending decisions · $2.4K freight · $18.7K saved ───┐
├─ Card per decision:                                          │
│  J-72402: Transfer 120 units West → East                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Transfer                  Wait                        │    │
│  │ • $840 freight           • $12.4K chargeback risk     │    │
│  │ • Arrives in 3 days      • PO due Fri (may slip +7d)  │    │
│  │ • Covers 18 days demand  • Destination runs out in 4d │    │
│  │ Net saving: $11,560       Net saving: — $12,400       │    │
│  │ [Approve transfer]        [Snooze 24h]  [Ask]         │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```
- "Approve" is a stub in v1 (logs to console; copy says "Marked for review in WMS"). Locked assumption #13 (read-only) survives the pivot: no actual mutation.
- Each card has an "Ask" button that prefills the chatbot with "Explain the tradeoff for J-72402 transfer West → East."

Reuses [`web/frontend/components/TransferCard.tsx`](web/frontend/components/TransferCard.tsx), restyled as a full card not a table row.

#### 3.2.4 `/chargebacks` — heatmap + filters + drill-down
```
┌─ Filters: Customer ▾  Channel ▾  DC ▾  Date [Jan–Apr] ──────┐
├─ Heatmap: rows = cause codes (plain language)                │
│           cols = DCs                                         │
│           cell intensity = $ exposure                        │
├─ Below heatmap: top 10 offending (customer, channel) pairs   │
│   with $ and trend sparkline                                 │
├─ Click a cell → slide-over with:                             │
│   - list of underlying incidents                             │
│   - recommended preventive action                            │
│   - "Ask" button prefilled with context                      │
└──────────────────────────────────────────────────────────────┘
```
Plain-language cause-code labels: "Short shipment" (not SHORT_SHIP), "Late delivery", "Damaged goods", "Missed delivery window". TPR filtered out per locked assumption #2 (still valid — TPR is planned promo, not a penalty).

Reuses [`ChargebackHeatmap.tsx`](web/frontend/components/ChargebackHeatmap.tsx) extended with filters + drill-down.

#### 3.2.5 `/sku/[sku]` — Deep dive
```
┌─ Back  •  J-72402 — Ginseng Root Extract, 60ct ──────────────┐
├─ 3 DC cards (stacked on mobile):                             │
│  East: 🔴 Critical — 4 days left, $12.4K risk                 │
│  West: 🟢 Healthy  — 38 days left, overstocked                │
│  Central: 🟡 Watch — 22 days left                             │
├─ PO Timeline (Gantt-style row):                              │
│  [ past POs ]◼◼◼ [ today ] ▶ [ open PO due Fri ] [delayed?]   │
├─ Recommended action panel:                                   │
│  ▶ Transfer 120 units West → East  (net saving $11,560)      │
│  (same card structure as /transfers)                         │
├─ Recent chargebacks for this SKU (last 90d) — 2 rows         │
└──────────────────────────────────────────────────────────────┘
```
Adds PO timeline (the biggest UX gap today). Component: `components/PoTimeline.tsx` (new), rendered with Recharts horizontal bar.

### 3.3 Filter and search UX

- **Defaults**: `/inventory` opens filtered to `Status ∈ {Critical, Watch}` — what Sam cares about 90% of the time.
- **Saved views**: 3 shipped defaults (`My morning triage` = critical + watch, all DCs; `East DC only`; `Overstock candidates` = days left > 180). User can add more (localStorage, no auth in v1).
- **URL state**: all filters serialize to query params so links are shareable (`/inventory?status=Critical&dc=DC_EAST`).
- **Global search** (top bar): fuzzy match on SKU + product name; keyboard shortcut `⌘K` / `Ctrl+K` opens a command palette (stretch goal; can ship as `Cmd-F`-style filter first).

### 3.4 Plain-language labeling, empty states, onboarding

**Labels**: rebuild [`MetricTooltip.tsx`](web/frontend/components/MetricTooltip.tsx) glossary to cover every domain term that appears on any screen (expand from 9 entries to ~25). Dotted underline on first appearance of each term.

Column headers — before / after:
- "DoS" → "Days of cover" (tooltip: "How many days of demand today's stock will cover")
- "Imbalance Score" → "Spread across DCs" (tooltip: "How unevenly stock sits across East/West/Central")
- "OTIF" → "On-time & in-full %" (tooltip: "How often we ship what's promised, when promised")
- "Exposure" → "At-risk dollars" (tooltip: "$ in chargebacks we'd face if nothing is done in the next 14 days")
- "Cause code TPR" → filtered out; never shown
- "Cause code SHORT_SHIP" → "Short shipment" (tooltip: "Partial delivery — we shipped fewer units than ordered")

**Empty states**: every list has a positive-phrased empty state tied to the current filter state.
- No critical SKUs → "All clear — no critical stockouts today ✓"
- No transfers queued → "No transfer decisions pending. Inventory is balanced across DCs."
- No chargebacks in filter range → "No chargebacks in this range ✓"
- API error → "We can't reach the data service right now. Try again in a moment, or ping #pop-ops on Slack." (No port numbers.)

**Onboarding**: first-visit tour (4 steps, dismissible, powered by `localStorage.seenTour`):
1. "Your Today screen — start your day here. The top 5 things needing attention."
2. "Every recommendation has a reason. Hover the 📖 icon to see definitions."
3. "Use Inventory to search across all ~800 SKUs, or save your favorite view."
4. "Ask me anything — the chatbot is always in the bottom-right or on the Ask page."

### 3.5 Key user flows, walked end-to-end

**Monday morning triage (Sam, 7:45 AM)**
1. Lands on `/today`. Hero says "3 critical, $42,800 at risk."
2. Reads action queue, sees #1 is J-72402 in East DC.
3. Clicks "Transfer from West ($840)" → opens `/transfers` filtered to J-72402.
4. Reads the tradeoff card — sees PO may slip +7d; $12.4K risk if waits.
5. Clicks "Approve transfer" → console log; copy confirms "marked for WMS review."
6. Back to `/today`; item moves into "Resolved" strip.

**Deciding a transfer (Sam, mid-morning, ambiguous case)**
1. Alert for SKU-114 in Central DC — says "Watch, 22 days cover, PO due in 18 days."
2. Opens `/sku/SKU-114`. PO timeline shows open PO on track, no delay flag.
3. Clicks "Ask" → chatbot opens prefilled with "Should I transfer SKU-114 or wait?"
4. Chatbot calls `get_sku_status` + `get_open_pos`, responds: "Wait. PO is on track to arrive 4 days before stockout. Transferring would cost $520 and save nothing."
5. Sam closes. No action taken.

**Explaining last week's chargebacks to the boss (Dana, Friday)**
1. `/chargebacks`, filters to last 7 days, customer = ACME.
2. Heatmap shows "Late delivery" in East DC is 70% of exposure.
3. Clicks the cell → drill-down shows 3 incidents, all on the same route, all due to a delayed inbound PO.
4. Clicks "Ask" prefilled "What preventive action would have avoided these ACME late deliveries?"
5. Chatbot responds with 2-step recommendation, citing the delayed PO.
6. Dana screenshots the answer for the next buyer meeting.

---

## 4. In-house AI chatbot rebuild

### 4.1 Remove external-API dependency

**Files to change**:
- [`web/api/routes/chat.py`](web/api/routes/chat.py) — replace `anthropic` SDK calls with the OpenAI SDK pointed at `http://localhost:11434/v1` (Ollama's OpenAI-compatible endpoint). Drop `ANTHROPIC_API_KEY` check. Drop `cache_control: ephemeral` (unsupported locally — Ollama caches prompts internally anyway).
- [`web/api/chat_prompts.py`](web/api/chat_prompts.py) — system prompt text stays; `cache_control` dict removed; add "only state numbers that appear in a tool result this turn" sentence.
- [`pyproject.toml`](pyproject.toml) — remove `anthropic>=0.40`, add `openai>=1.40` (for the OpenAI-compatible client — smallest lift), keep everything else.
- [`web/api/config.py`](web/api/config.py) (new) — centralize model config: `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT`. Read from env with sensible defaults so zero-config runs out of the box.
- `web/frontend/components/Chatbot.tsx` — **no change**. SSE parsing is model-agnostic.
- [`web/api/chat_tools.py`](web/api/chat_tools.py) — no logic change; one small tweak: every tool now also reads from `enriched.parquet` for plain-language status.

**CLAUDE.md update**: assumption #14 rewritten to "Model for `/api/chat` = local Ollama server (default `qwen2.5:7b-instruct`). Configurable via `OLLAMA_MODEL` env var. No external API key required."

### 4.2 Local inference options — comparison

| Option | Install friction | Runs on laptop CPU? | Tool-use quality (7B class) | Streaming SSE | Fit |
|---|---|---|---|---|---|
| **Ollama** (recommended) | `curl install.sh` + `ollama pull` | ✅ M-series Mac, decent Intel, 8GB+ RAM | Good with Qwen2.5 / Llama 3.1 | Native via OpenAI-compat API | Lowest friction, largest community, trivial upgrade path |
| llama.cpp / `llama-cpp-python` | `pip install`, download GGUF | ✅ Any CPU | Varies — need careful prompt engineering for tools | Yes but custom | Tighter embed (no daemon), slower prompt eval |
| vLLM | Python + CUDA; requires GPU | ❌ (GPU-only) | Excellent with 14B+ | Yes via OpenAI-compat | Best quality when GPU exists; overkill for demo laptop |
| `transformers` + `accelerate` | `pip install`, manual model management | ✅ but slow | OK for small models | Manual impl | Most control; highest maintenance |

**Recommended**: **Ollama + Qwen2.5-7B-Instruct** (or 3B for <8GB RAM machines).

Reasons:
- `ollama pull qwen2.5:7b-instruct` is one command. No CUDA, no compile-from-source.
- Qwen2.5's tool-use is the strongest in its class (confirmed in public benchmarks and well-documented in Ollama's modelfile).
- Ollama exposes an OpenAI-compatible `/v1/chat/completions` endpoint with full streaming support — we swap `anthropic.client` for `openai.OpenAI(base_url="http://localhost:11434/v1", api_key="unused")` and the tool-use schema translates 1:1 (both use `{type:"function", function:{name,parameters}}`).
- Upgrade path: drop `qwen2.5:14b-instruct` (24GB RAM) or `qwen2.5:32b-instruct` (GPU recommended) by changing the env var — no code changes.
- Fallback for weakest hardware: `qwen2.5:3b-instruct` — still serviceable for our 7 tools, ~2GB RAM.

Sample boot sequence (goes in a `README.md` block for ops):
```
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &                 # daemon on :11434
ollama pull qwen2.5:7b-instruct
uvicorn web.api.main:app --reload --port 8000
pnpm --dir web/frontend dev
```

No `ANTHROPIC_API_KEY`, no internet for inference, no cloud.

### 4.3 Integration with cleaned data

**Tool inventory** (existing 7 tools in [`web/api/chat_tools.py`](web/api/chat_tools.py)):
- `get_dashboard_summary`, `get_sku_status`, `list_critical_skus`, `get_transfer_recommendation`, `get_chargeback_breakdown`, `explain_metric`, `get_open_pos`.

All read from `data/processed/*.parquet` via pandas. Zero mutations. After data cleanup:
- `get_sku_status` reads `enriched.parquet` first (for `status_plain`, `status_reason`, `dollar_exposure`, `days_until_stockout`) — no more on-the-fly computation.
- `list_critical_skus` sorts by `enriched.dollar_exposure desc`, then `days_until_stockout asc`.
- One new tool: `get_savings_snapshot()` — returns the manual vs system comparison used in the banner, so the chatbot can cite the right number when asked "how much did we save?".

**No RAG / vector search in v1.** Structured data + tool-use is deterministic and audit-friendly. A RAG layer would be justified only if we were answering free-form questions about unstructured policy docs — not our use case.

### 4.4 Grounding & guardrails

**System prompt changes**:
- Add: "Only state numeric facts (dollars, days, percentages) that appear in a tool result from this conversation. If you need a number and don't have one, call a tool. Never guess inventory, chargeback, or freight numbers."
- Add: "Use the DC labels from DC_LABELS ('East DC', 'West DC', 'Central DC'), not internal codes."
- Add: "Read-only: you can analyze and advise but never execute. If the user asks to take an action, reply with the exact text they should use in the WMS."

**Numeric-citation validator** (`web/api/chat_validator.py`, new):
- After the model stops streaming, the server post-processes the final assistant message.
- Regex-extract every `$N` and `Nd` (days) and `N%` (percent) figure.
- Compare against numbers present in the tool-result JSON from this turn.
- Any figure not found → append a footnote to the SSE stream: `[⚠ one number in this answer is unverified — double-check in the Inventory page]`.
- Frontend renders this as a yellow banner below the message; does not block the response.

**Length & turn limits** (already present, keep):
- `max_tokens = 2048`, `max_turns = 20`.
- Add per-request timeout (60s) so a slow local model doesn't hang the UI.

**Failure modes**:
- Ollama not running → chat endpoint returns `{error: "Assistant is offline. Start the local model with 'ollama serve'."}`. Frontend renders this verbatim in the chat panel; no stack traces.
- Model times out → "I'm thinking too long on this one. Try a simpler question, or check Inventory directly."

### 4.5 Scope — in and out

**In scope for v1 chatbot**:
- "Why is SKU X critical?" (inventory status + reason)
- "Should I transfer or wait for SKU X?" (transfer-vs-wait rec)
- "What's my top chargeback cause?" (breakdown)
- "Explain Days of cover / At-risk dollars / PO timeline" (glossary)
- "What should I do first today?" (ranked top 3)
- Any drill-down that maps to an existing tool result

**Out of scope for v1**:
- Creating / approving POs or transfers (read-only locked assumption #13 survives the pivot)
- Forecasting beyond the 30-day trailing window
- Price, margin, or cost-of-goods questions (no data in seed)
- Legal / compliance / supplier-negotiation questions
- "Summarize this PDF / policy doc" (no RAG in v1)

The system prompt explicitly tells the model to decline out-of-scope requests with "That's outside what I can help with — try asking Sam's manager."

---

## 5. Execution order

Each phase is a single Claude Code task. Dependencies noted in the Depends column.

| # | Phase | Scope | Depends on | Est. size |
|---|---|---|---|---|
| P0 | Data validator | `data/validate.py` + wire into `data/ingest.py`; pipeline aborts on fail | — | S |
| P1 | Seed regeneration | `data/seed/generate.py` (25 SKUs, 180d sales); run once, commit outputs | P0 | M |
| P2 | Defensive guards | Fix `imbalance.py:32`, `transfer.py:116`, `transfer.py:85`; add pipeline run log | P0 | S |
| P3 | Enriched derived columns | `analytics/enrich.py` + `data/processed/enriched.parquet` + pipeline wire-up | P1, P2 | M |
| P4 | DC label indirection | `data/dc_labels.py`; replace hardcoded `DC_EAST/WEST/CENTRAL` literals in frontend with `DC_LABELS[code]` | P3 | S |
| P5 | IA shell + nav | New left sidebar, top bar with search, route stubs for `/today`, `/inventory`, `/transfers`, `/ask`; redirect `/` → `/today` | P4 | M |
| P6 | Today screen | Build `/today` from enriched data (hero strip, 3-up counters, action queue, savings banner); reuse ActionQueue, StatsBar, SavingsBanner | P3, P5 | M |
| P7 | Inventory browser | `/inventory` with left-rail filters, saved views in localStorage, URL state, pagination or virtualization | P3, P5 | L |
| P8 | Transfers page | `/transfers` with per-decision cards (tradeoff, CTAs, "Ask" prefill); stub Approve action | P3, P5 | M |
| P9 | SKU detail redesign | `/sku/[sku]` with 3-DC cards, new `PoTimeline.tsx`, inline transfer rec card, chargeback history | P3, P5 | L |
| P10 | Chargebacks drill-down | `/chargebacks` extend with filters, top-10 offender list, cell → slide-over, "Ask" prefill | P3, P5 | M |
| P11 | Chatbot local-inference swap | Swap anthropic → openai-compat client for Ollama; add `web/api/config.py`; add Ollama-offline error path | P3 | M |
| P12 | Chatbot grounding validator | `web/api/chat_validator.py`; post-stream numeric check; frontend renders `⚠ unverified` footnote | P11 | S |
| P13 | `/ask` full-screen page | Mirror of FAB Sheet at full width; deep-linkable initial prompt via query param | P11 | S |
| P14 | Plain-language polish + accessibility | Expand MetricTooltip glossary to ~25 terms; replace jargon headers; empty-state copy pass; aria-labels, keyboard nav, colorblind-safe severity chips | P6–P10 | M |
| P15 | Onboarding tour | 4-step `localStorage`-gated tour on first visit to `/today`; dismissible | P14 | S |
| P16 | End-to-end verification | Run the 5 success-criteria tasks; fix any gaps found | P6–P15 | M |

Parallel tracks: P11–P12 (chatbot) can run in parallel with P5–P10 (frontend) once P3 (enriched) lands.

---

## 6. Success criteria

An entry-level supply manager should be able to complete these 5 tasks unaided. Each is a scripted usability test; we time and observe.

| # | Task | Target | Verification |
|---|---|---|---|
| 1 | **"You just arrived at your desk. What's the most urgent thing and why?"** | User lands on `/today`, reads action queue row #1, explains the $ risk and the two options in plain English — all within 30 seconds. | Observer timing + user paraphrase. Pass if the paraphrase mentions the $ figure and at least one action. |
| 2 | **"Find J-72402 and tell me whether to transfer or wait."** | User types "J-72402" in top-bar search, lands on SKU detail, reads recommendation, decides. Chatbot optional but allowed. | Observer timing (<2 min), correct decision (matches enriched.recommended_action). |
| 3 | **"Show me everything critical in East DC."** | User navigates to `/inventory`, filters Status=Critical and DC=East, sees the filtered list. Bonus: saves the view. | Observer checks filter state in URL; pass if filters match. |
| 4 | **"Which customer had the highest chargebacks last week, and what was the main cause?"** | User navigates to `/chargebacks`, filters to last 7 days, reads top-10 list, identifies customer + cause. | Observer checks the user's stated answer matches the data. |
| 5 | **"Ask the assistant why SKU X (any critical SKU) is flagged."** | User opens FAB or `/ask`, types the question, gets a grounded answer that cites a $ figure and a day count matching the enriched table. No API key required. | Observer verifies: (a) answer arrived in <15s on the test hardware, (b) numbers in the answer appear in `enriched.parquet`, (c) no `⚠ unverified` footnote on factual claims. |

**Aggregate gate**: 4 of 5 tasks completed unaided within the target time by 3 different testers. If fewer, that's the next task list — not a handoff.

### Verification during/after implementation (dev-side)

**Minimize new test files to keep session token usage down.** Use smoke tests, not per-module unit tests.

- **Existing suite**: `pytest -q` must still pass after each phase. Do NOT add new `test_*.py` files per phase unless a real regression needs a regression test.
- **Pipeline smoke** (covers P0–P3): `python -m analytics.pipeline` exits 0 and writes `pipeline_run.log` with 0 warnings + `validation_report.json` with 0 errors. Deliberately break one seed CSV once to confirm it aborts.
- **Chatbot smoke** (covers P11–P13): with `ollama serve` running + model pulled, hit `POST /api/chat` with one critical-SKU prompt; confirm tool call fires, answer cites numbers from the tool result, no API key in env.
- **Browser smoke** (covers P5–P10, P14–P15): boot `pnpm dev`, walk the 5 success-criteria flows once via `preview_*` MCP tools, capture screenshots for the handoff doc.

---

## Critical files referenced in this plan

**Data / analytics**:
- [data/seed/](data/seed/) — all 9 CSVs regenerated by P1
- [data/ingest.py](data/ingest.py) — P0 adds validator hook
- [data/validate.py](data/validate.py) (new, P0)
- [data/dc_labels.py](data/dc_labels.py) (new, P4)
- [analytics/pipeline.py](analytics/pipeline.py) — P3 adds enrich step
- [analytics/enrich.py](analytics/enrich.py) (new, P3)
- [analytics/imbalance.py:32](analytics/imbalance.py) — P2 guard
- [analytics/transfer.py:85](analytics/transfer.py), [:116](analytics/transfer.py) — P2 guards

**Backend / chat**:
- [web/api/routes/chat.py](web/api/routes/chat.py) — P11 swap to OpenAI-compat client
- [web/api/chat_prompts.py](web/api/chat_prompts.py) — P11 remove `cache_control`, add grounding rules
- [web/api/chat_tools.py](web/api/chat_tools.py) — P11 small tweak to read from `enriched.parquet`
- [web/api/config.py](web/api/config.py) (new, P11)
- [web/api/chat_validator.py](web/api/chat_validator.py) (new, P12)
- [pyproject.toml](pyproject.toml) — P11 swap `anthropic` → `openai`

**Frontend**:
- [web/frontend/app/page.tsx](web/frontend/app/page.tsx) — P5 redirect to `/today`
- `web/frontend/app/today/page.tsx` (new, P6)
- `web/frontend/app/inventory/page.tsx` (new, P7)
- `web/frontend/app/transfers/page.tsx` (new, P8)
- [web/frontend/app/sku/[sku]/page.tsx](web/frontend/app/sku/[sku]/page.tsx) — P9 redesign
- [web/frontend/app/chargebacks/page.tsx](web/frontend/app/chargebacks/page.tsx) — P10 extend
- `web/frontend/app/ask/page.tsx` (new, P13)
- `web/frontend/components/Sidebar.tsx` (new, P5)
- `web/frontend/components/TopBar.tsx` (new, P5)
- `web/frontend/components/PoTimeline.tsx` (new, P9)
- `web/frontend/components/SavedViews.tsx` (new, P7)
- `web/frontend/components/OnboardingTour.tsx` (new, P15)
- [web/frontend/components/MetricTooltip.tsx](web/frontend/components/MetricTooltip.tsx) — P14 glossary expansion
- [web/frontend/components/Chatbot.tsx](web/frontend/components/Chatbot.tsx) — P12 renders `⚠ unverified` footnote
- [web/frontend/lib/api.ts](web/frontend/lib/api.ts) — P6–P10 new typed fetchers for enriched

**Docs**:
- [CLAUDE.md](CLAUDE.md) — update assumption #14 (model), #8 (hero SKU no longer sacred), add the pivot context
- [prompt.md](prompt.md) — NEXT TASK rewritten to P0 after this plan is approved
