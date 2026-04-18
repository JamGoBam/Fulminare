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

- Completed **F5** — `InventoryMatrix.tsx` (left-rail filters with status checkboxes + DC selector + debounced search, URL-serialized filter state, paginated table 25 rows/page, status chips, Days-of-cover with MetricTooltip, At-risk $ + Recommendation CTA joined from action-items cache). `app/inventory/page.tsx` rebuilt with 4 KPI cards + matrix. `GET /api/inventory/summary` endpoint added to `inventory.py` (falls back imbalance→enriched). `getInventorySummary` + `getInventoryImbalance` added to `lib/api.ts`. Zero TypeScript errors, verified in preview.
- Completed **F6** — `app/analytics/page.tsx` rebuilt: 4 KPI tiles (Annual Chargeback Exposure, System-Avoidable Savings, % Reduction, Top Cause) from `/api/summary` + `/api/chargebacks/top-causes`. CSS-only `CauseBarChart` (Recharts removed — SSR crash in Next.js 16). Reused `ChargebackHeatmap`. Top-risk SKUs table (top 5 by `potentialPenalty` from action-items cache). `getTopCauses()` added to `lib/api.ts`. Key fix: removed `<Suspense>` wrapper (AnalyticsContent doesn't use `useSearchParams()` — wrapper caused permanent fallback state). Zero TypeScript errors, verified in preview.
- Backend still has pre-existing P11 blocker (`chat.py` imports `anthropic`); all frontend work is unaffected.

---

## NEXT TASK

**F7 — Reports + Settings stubs** — `/reports` and `/settings` routes with real content cards (not empty stubs).

### What to build

#### Reports page (`app/reports/page.tsx`)

1. **Quick-action cards** (2–3 cards, horizontal row):
   - "Export Chargeback Report" — icon `FileText`, subtitle "CSV · last 90 days", button "Download"
   - "Transfer Summary" — icon `ArrowRight`, subtitle "Pending transfers this week", button "View"
   - "OTIF Scorecard" — icon `TrendingUp`, subtitle "On-time in-full by DC", button "View"
   - Buttons are stubs — log to console, optionally show a toast "Feature coming soon"

2. **Available Reports list** — a card containing a simple table or list:
   - Columns: Report Name · Frequency · Last Generated · Format · Action (Download button)
   - 4–6 hardcoded rows (no API calls needed; this is purely a UI stub):
     - Chargeback Detail · Weekly · Apr 14, 2026 · CSV
     - Inventory Imbalance · Daily · Apr 18, 2026 · CSV
     - Transfer Log · Weekly · Apr 14, 2026 · XLSX
     - OTIF Scorecard · Monthly · Apr 1, 2026 · PDF
     - Supplier Lead Time · Monthly · Apr 1, 2026 · PDF
   - All Download buttons log to console

#### Settings page (`app/settings/page.tsx`)

3 cards in a single-column layout:

1. **Preferences** card — toggle rows (all stubs, no state needed):
   - "Email alerts for critical SKUs" — default on
   - "Daily digest at 8am" — default off
   - "Show dollar values in dashboard" — default on

2. **DC Labels** card — 3 read-only rows mapping code → display name:
   - DC_EAST → DC East
   - DC_WEST → DC West
   - DC_CENTRAL → DC Central
   - Note: "DC label editing not yet supported" in small muted text

3. **Integrations** card — 3 integration rows with status badge:
   - WMS (Warehouse Management) · Connected · `bg-green-100 text-green-700`
   - ERP (SAP) · Connected · green
   - EDI (SPS Commerce) · Pending setup · `bg-amber-100 text-amber-700`

### Backend
No new endpoints needed — both pages are pure UI stubs.

### Acceptance criteria
1. `/reports` loads with quick-action cards + available reports list.
2. `/settings` loads with 3 cards (Preferences / DC Labels / Integrations).
3. Both pages use KpiCard-style card shell (`bg-white rounded-xl border border-slate-200 shadow-sm`).
4. Zero TypeScript errors, zero console errors.
5. Sidebar "Reports" and "Settings" nav links correctly highlight as active.

---

## FILES IN PLAY

- `web/frontend/app/reports/page.tsx` (replace stub)
- `web/frontend/app/settings/page.tsx` (replace stub)

## LOCKED / DO NOT TOUCH

- `PLAN.md` — approved spec; structural changes require user signoff
- `scripts/handoff.sh` — handoff mechanism
- `components/Sidebar.tsx`, `components/TopBar.tsx`, `app/layout.tsx` — F1 deliverables
- `components/KpiCard.tsx`, `components/FilterBar.tsx` — F2 deliverables
- `components/ActionQueue.tsx`, `web/api/routes/action_items.py` — F3 deliverables
- `components/RecommendationPanel.tsx`, `components/ActionComparisonCard.tsx`, `components/PoTimeline.tsx` — F4 deliverables
- `components/InventoryMatrix.tsx`, `app/inventory/page.tsx` — F5 deliverables
- `app/analytics/page.tsx` — F6 deliverable

## BLOCKERS

- None. All parquet files exist in `data/processed/` (seed ingest + pipeline ran this session). Backend requires `pip install openai fastapi uvicorn pandas pyarrow duckdb pydantic` — `anthropic` dep in `chat.py` still needs P11 migration before backend fully starts.

## QUICK-RESUME PROMPT

```
Read CLAUDE.md then prompt.md (FIGMA spec is embedded there now — skip FIGMA_PROMPT.md).
Execute NEXT TASK (F7 — Reports + Settings stubs) per the spec in prompt.md.
Follow the Context budget & handoff protocol from CLAUDE.md.
When F7 is done, update prompt.md NEXT TASK to F8, then run scripts/handoff.sh.
```

---

## FIGMA EXECUTION PHASES — STATUS TRACKER

> Authoritative visual source: `web/frontend/design/figma-source.tsx.txt` (~1617 lines). When tokens conflict with summaries below, the source file wins.

| # | Phase | Status | Key deliverables |
|---|---|---|---|
| F1 | App shell + sidebar + top bar + routes | ✅ Done | `Sidebar.tsx`, `TopBar.tsx`, layout shell, `/inventory` `/analytics` `/reports` `/settings` stubs, `lib/types.ts` |
| F2 | Dashboard shell + KPI cards + filter bar | ✅ Done | `KpiCard.tsx`, `FilterBar.tsx`, 2-column placeholder layout, live KPI data from `/api/summary` + `/api/recommendations/alerts` |
| F3 | Action Queue live | ✅ Done | `/api/action-items` endpoint, refactored `ActionQueue.tsx`, URGENT badges, URL-state selection, accent borders |
| F4 | Recommendation Panel live | ✅ Done | `RecommendationPanel.tsx`, `ActionComparisonCard.tsx`, `PoTimeline.tsx`, driven by `?selected` param |
| F5 | Inventory matrix | ✅ Done | `InventoryMatrix.tsx`, `/inventory` page, `GET /api/inventory/summary`, filter rail + URL state + pagination |
| F6 | Analytics | ✅ Done | `app/analytics/page.tsx` — 4 KPI tiles + `ChargebackHeatmap` + CSS bar chart + top-risk SKUs table |
| F7 | Reports + Settings stubs | 🔲 Next | Reports quick-action cards + available reports list; Settings preferences/DC-labels/integrations cards |
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
