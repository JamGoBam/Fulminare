# prompt.md — Session Handoff (single source of truth — read this instead of FIGMA_PROMPT.md)

**Read CLAUDE.md first, then this file. FIGMA_PROMPT.md is now superseded by the spec embedded below.**

---

## CURRENT SPRINT GOAL

Three linked workstreams for the real-user POP Inventory tool:
1. **Data cleanup** — validator, richer seed, enriched derived table (P0–P4, see PLAN.md)
2. **Frontend IA** — Figma "Operations Hub": Dashboard / Inventory / Analytics / Reports / Settings (F1–F9 below)
3. **In-house chatbot** — Ollama + `qwen2.5:7b-instruct`, no external API key (P11–P13, see PLAN.md)

---

## LAST SESSION SUMMARY

- Completed **F1** — `Sidebar.tsx`, `TopBar.tsx`, root layout shell, route stubs (`/inventory`, `/analytics`, `/reports`, `/settings`), `lib/types.ts` with `ActionItem` shape.
- Completed **F2** — `KpiCard.tsx`, `FilterBar.tsx` (toggling quick-filter pills), 4-KPI-card + filter bar + 2-column Dashboard shell. "Urgent Actions" and "Total Chargeback Risk" live from `/api/summary` + `/api/recommendations/alerts`; others show `—` until P3 enriched data.
- Completed **F3** — `GET /api/action-items` backend endpoint (joins `transfers_computed` + `skus` + `open_po` + `inventory`; returns `ActionItem[]`); refactored `ActionQueue.tsx` (URGENT badge on top-3 High rows, row accent border by `daysUntilStockout`, URL-state selection via `?selected=<id>`, graceful error/empty states). Backend endpoint verified directly with Python. Frontend renders skeleton + graceful error when backend offline.
- Merged `FIGMA_PROMPT.md` into this file; ran seed ingest + pipeline to generate all parquet files in `data/processed/`.

---

## NEXT TASK

**F4 — Recommendation Panel live** — driven by `?selected=<id>` URL param; full 2-card decision comparison + reasoning + Evidence & Timeline.

### What to build

New component `components/RecommendationPanel.tsx`:
1. Reads `?selected` from `useSearchParams()`. If absent → empty state: "Select an item from the Action Queue to see the recommendation."
2. Finds the selected `ActionItem` from the already-loaded `["action-items"]` query (no extra fetch).
3. **Header**: item name, SKU, at-risk DC.
4. **Summary sentence** (verbatim):
   - Transfer Now → `Execute immediate transfer to prevent {daysUntilStockout}-day stockout and avoid {potentialPenalty} in penalties.`
   - Wait → `Monitor inbound shipment. Current trajectory shows arrival before stockout with minimal risk exposure.`
   - Escalate → `Critical situation requiring executive decision. No standard transfer options available.`
5. **2-card comparison** (`ActionComparisonCard.tsx`, new):
   - Option A — Transfer Now: `sourceDC`, `unitsAvailable`, `leadTime`, `estimatedArrival`, `cost`, `postTransferHealth`, confidence bar (`bg-blue-500` fill at `{confidence}%`).
   - Option B — Wait for Inbound: `poEta`, `delayRisk`, `complianceFlags`, `stockoutWindow`, `penaltyRisk`, confidence bar.
   - Confidence bar: `w-full bg-slate-200 rounded-full h-2` with colored fill.
   - Escalate edge case: `sourceDC === "None available"` / `unitsAvailable === 0` must not crash — show "No transfer source available"; confidence 0% not empty.
6. **"Why This Recommendation"** — `reasoning[]` as bullet list.
7. **Evidence & Timeline** (`PoTimeline.tsx`, new) — simple horizontal flex timeline: past-PO blocks → today marker → open-PO ETA block. CSS-only (no Recharts needed for this). Reused in `/sku/[sku]` (F9).
8. **Action buttons** (stubs — log only, no mutation):
   - "Approve Transfer", "Wait and Monitor", "Escalate", "Assign Owner" → `console.log("Marked for WMS review:", item.id)`.

Wire into `app/page.tsx` — replace Recommendation Panel placeholder with `<RecommendationPanel />`.

### Acceptance criteria

1. Clicking an Action Queue row populates the panel with correct item data.
2. All 3 recommendation types render the correct summary sentence.
3. Both comparison cards render with confidence bars.
4. Reasoning bullets display.
5. Evidence & Timeline renders (even simple CSS layout).
6. Buttons log to console, no mutations.
7. Zero console errors.

---

## FILES IN PLAY

- `web/frontend/components/RecommendationPanel.tsx` (new)
- `web/frontend/components/ActionComparisonCard.tsx` (new)
- `web/frontend/components/PoTimeline.tsx` (new)
- `web/frontend/app/page.tsx` (replace Recommendation Panel placeholder)

## LOCKED / DO NOT TOUCH

- `PLAN.md` — approved spec; structural changes require user signoff
- `scripts/handoff.sh` — handoff mechanism
- `components/Sidebar.tsx`, `components/TopBar.tsx`, `app/layout.tsx` — F1 deliverables
- `components/KpiCard.tsx`, `components/FilterBar.tsx` — F2 deliverables
- `components/ActionQueue.tsx`, `web/api/routes/action_items.py` — F3 deliverables

## BLOCKERS

- None. All parquet files exist in `data/processed/` (seed ingest + pipeline ran this session). Backend requires `pip install openai fastapi uvicorn pandas pyarrow duckdb pydantic` — `anthropic` dep in `chat.py` still needs P11 migration before backend fully starts.

## QUICK-RESUME PROMPT

```
Read CLAUDE.md then prompt.md (FIGMA spec is embedded there now — skip FIGMA_PROMPT.md).
Execute NEXT TASK (F4 — Recommendation Panel live) per the spec in prompt.md.
Follow the Context budget & handoff protocol from CLAUDE.md.
When F4 is done, update prompt.md NEXT TASK to F5, then run scripts/handoff.sh.
```

---

## FIGMA EXECUTION PHASES — STATUS TRACKER

> Authoritative visual source: `web/frontend/design/figma-source.tsx.txt` (~1617 lines). When tokens conflict with summaries below, the source file wins.

| # | Phase | Status | Key deliverables |
|---|---|---|---|
| F1 | App shell + sidebar + top bar + routes | ✅ Done | `Sidebar.tsx`, `TopBar.tsx`, layout shell, `/inventory` `/analytics` `/reports` `/settings` stubs, `lib/types.ts` |
| F2 | Dashboard shell + KPI cards + filter bar | ✅ Done | `KpiCard.tsx`, `FilterBar.tsx`, 2-column placeholder layout, live KPI data from `/api/summary` + `/api/recommendations/alerts` |
| F3 | Action Queue live | ✅ Done | `/api/action-items` endpoint, refactored `ActionQueue.tsx`, URGENT badges, URL-state selection, accent borders |
| F4 | Recommendation Panel live | 🔲 Next | `RecommendationPanel.tsx`, `ActionComparisonCard.tsx`, `PoTimeline.tsx`, driven by `?selected` param |
| F5 | Inventory matrix | 🔲 | `/inventory` — 4 summary cards + matrix table, refactor `ImbalanceTable.tsx` to new columns |
| F6 | Analytics | 🔲 | `/analytics` — 4 KPI tiles + chargebacks heatmap + penalty charts + top-risk SKUs |
| F7 | Reports + Settings stubs | 🔲 | Reports quick-action cards + available reports list; Settings preferences/DC-labels/integrations cards |
| F8 | Filter + search behavior | 🔲 | Wire FilterBar pills + dropdowns to Action Queue; URL-state filters; global search debounced 200ms |
| F9 | Polish pass | 🔲 | Active-nav aria-labels, keyboard nav, colorblind-safe chips, empty states. Merges with PLAN.md P14. |

---

## PRODUCT INTENT (do not lose sight of this)

**Operational decision-support tool** for inventory imbalance across 3 DCs. User = entry-level supply manager making $5K freight calls under time pressure. Priority order of screens:
1. Action Queue (hero)
2. Recommendation Panel (selected-item detail)
3. Inventory
4. Analytics
5. Reports

Tone: enterprise/SaaS, neutral, operational. DC names in UI: **"DC West / DC Central / DC East"** — keep `DC_WEST/CENTRAL/EAST` only in DB and analytics layer.

---

## KEY VISUAL TOKENS (match exactly — source: `figma-source.tsx.txt`)

**Shell chrome**
- Sidebar: `w-64 bg-slate-900 border-slate-800 p-6/p-4`
- Logo tile: `w-8 h-8 bg-blue-500 rounded-lg` + white `Package` icon
- Branding: `"Prince of Peace"` semibold white / `"Operations Hub"` `text-slate-400 text-xs`
- Nav inactive: `text-slate-300 hover:bg-slate-800 hover:text-white`
- Nav active: `bg-blue-600 text-white`
- User chip: `bg-slate-700 rounded-full` — stub as "John Davis / Ops Manager"
- Top bar: `h-16 bg-white border-b border-slate-200 px-8`
- Page body: `bg-slate-50`
- Cards: `bg-white rounded-xl border border-slate-200 shadow-sm`

**Status / severity palette**
- Critical/High: `bg-red-100 text-red-700 border-red-200` chips; `text-red-600` values
- Watch/Medium/delayed: `bg-amber-100 text-amber-700 border-amber-200` / `text-amber-600`
- Healthy: `bg-green-100 text-green-700 border-green-200` / `text-green-600`
- Overstock/info: `bg-blue-100 text-blue-700 border-blue-200` / `text-blue-600`
- Recommendation badges: Transfer Now → `bg-blue-600 text-white`; Wait → `bg-slate-600 text-white`; Escalate → `bg-purple-600 text-white`
- URGENT tag: `bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded` top-right; row gets `border-l-4 border-l-red-500 bg-red-50/30`
- Selected row: `bg-blue-50 border-l-4 border-l-blue-600`

**Typography**
- Page title: `text-2xl font-semibold text-slate-900`
- Section title: `text-lg font-semibold text-slate-900`
- Card label: `text-slate-500 text-sm`
- KPI value: `text-3xl font-semibold`
- Body muted: `text-slate-600`

**Icons** — lucide-react only
- Sidebar: `LayoutDashboard`, `Package`, `TrendingUp`, `FileText`, `Settings`
- Header: `Search`, `Bell`
- KPI cards: `AlertTriangle`, `DollarSign`, `Clock`, `Package`
- FilterBar pills: `AlertTriangle`, `FileWarning`, `Truck`, `CheckSquare`
- Action Queue urgency: `AlertCircle` (≤1d), `Clock` (≤3d), `CheckCircle` (else)
- Recommendation Panel: `ArrowRight`, `CheckCircle2`, `XCircle`, `AlertTriangle`, `TrendingUp`, `Clock`, `DollarSign`, `Package`, `MapPin`

**Recommendation summary sentences** (use verbatim in RecommendationPanel):
- Transfer Now → `Execute immediate transfer to prevent {daysUntilStockout}-day stockout and avoid {potentialPenalty} in penalties.`
- Wait → `Monitor inbound shipment. Current trajectory shows arrival before stockout with minimal risk exposure.`
- Escalate → `Critical situation requiring executive decision. No standard transfer options available.`

**Escalate edge case**: `RecommendationPanel` must render gracefully when `transferDetails.sourceDC === "None available"` / `unitsAvailable === 0` / `leadTime === "N/A"`. Treat confidence 0 as 0%, not empty.

---

## DATA MODEL (TypeScript — canonical in `lib/types.ts`)

```ts
export type Recommendation = 'Transfer Now' | 'Wait' | 'Escalate'
export type RiskLevel = 'High' | 'Medium' | 'Low'
export type DcStatus = 'healthy' | 'low' | 'critical' | 'overstock'

export interface TransferDetails {
  sourceDC: string; unitsAvailable: number; leadTime: string
  estimatedArrival: string; cost: number; postTransferHealth: string; confidence: number
}
export interface InboundDetails {
  poEta: string; delayRisk: string; complianceFlags: string[]
  stockoutWindow: string; penaltyRisk: number; confidence: number
}
export interface ActionItem {
  id: string; sku: string; itemName: string; category: string; brand: string
  atRiskDC: string; daysUntilStockout: number; companyWideInventory: number
  recommendation: Recommendation; riskLevel: RiskLevel
  potentialPenalty: number; reason: string; confidence: number
  updatedAt: string; transferDetails: TransferDetails
  inboundDetails: InboundDetails; reasoning: string[]
}
```

---

## REUSE / REPLACE MAP

**Refactor in place:**
- `ActionQueue.tsx` → swap to `ActionItem` shape + URL-state selection + URGENT badge
- `TransferCard.tsx` → absorbed into `RecommendationPanel`'s "Option A" card
- `StatsBar.tsx`, `SavingsBanner.tsx` → refactored into the 4 KPI cards (F2 ✅)
- `ChargebackHeatmap.tsx` → reuse inside `/analytics`
- `MetricTooltip.tsx` → expand glossary to ~25 terms (F9)
- `Chatbot.tsx` → keep FAB on every route; keep unchanged

**Replace / redirect:**
- Old `app/page.tsx` dashboard layout → replaced by new 2-column Dashboard (F2 ✅)
- `app/sku/[sku]/page.tsx` → replaced by URL-selected `RecommendationPanel`; add redirect

**New components still to create:**
- `RecommendationPanel.tsx`, `ActionComparisonCard.tsx` (F4)
- `PoTimeline.tsx` (F4)
- `InventoryMatrix.tsx` (F5)
- `OnboardingTour.tsx` (F9 / PLAN.md P15)

---

## CONSTRAINTS (do not violate)

- **No Zustand / Redux / new state libraries.** URL query params + TanStack Query only.
- **No new test files.** Smoke-test via `preview_*` MCP tools. `pytest -q` must pass after every phase.
- **No real mutations.** Approve / Wait / Escalate / Assign buttons are stubs — log to console, optionally toast "Marked for WMS review".
- **No new colors / fonts / spacing tokens.** Existing Tailwind + shadcn only.
- **Keep Chatbot FAB** on every route (it's not in the Figma spec, but it's complementary per user direction).
- **DC codes in DB only.** Only the UI layer renders "DC West / DC Central / DC East".

---

## BACKEND ENDPOINTS (existing — check before adding new ones)

| Endpoint | Returns |
|---|---|
| `GET /api/summary` | `{manual_annual_penalty, system_avoidable_annual, delta, pct_reduction}` |
| `GET /api/inventory/imbalance` | top-N imbalanced SKUs |
| `GET /api/inventory/sku/{sku}` | `SkuDetail` with DCs, open POs, recommendation, chargeback history |
| `GET /api/recommendations/transfers` | `TransferOut[]` |
| `GET /api/recommendations/alerts?limit=N` | `AlertOut[]` ranked by priority |
| `GET /api/chargebacks/summary` | raw records |
| `GET /api/chargebacks/top-causes?n=N` | top cause codes by $ |
| `GET /api/chargebacks/top-customers?n=N` | top customers by $ |
| `GET /api/chargebacks/by-channel` | by channel |
| `GET /api/chargebacks/trend` | monthly trend |
| `POST /api/chat` | SSE streaming (Ollama via OpenAI-compat client) |
| `GET /healthz` | health check |
| `GET /api/action-items` | **TO BUILD in F3** — `ActionItem[]` |
