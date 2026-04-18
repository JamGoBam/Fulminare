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

- **U1 complete** — Removed TopBar search; wired FilterBar search to `?q=`; moved URGENT inline; wired 4 cosmetic dropdowns to URL params; ActionQueue consumes risk/rec/sort. Zero errors.
- **U2 complete** — Bell popover live: `useState` dropdown in `TopBar.tsx`, reuses `["action-items"]` TanStack Query cache, lists top-3 URGENT rows (name · SKU · DC · days · penalty), clicking a row navigates to `/?selected=`, red dot hides when count=0.
- **U3 complete** — #5: `recommended` prop on both comparison cards; Transfer card blue when Transfer Now is recommended, slate when not (and vice versa for Inbound card). #6: `ActionStatusProvider` + `useActionStatus` context with sessionStorage persistence; 4 action buttons update shared state; confirmation banner in panel; status chip + opacity + sink-to-bottom in ActionQueue. #7: "Explain in chat ↗" button under reasoning bullets calls `openChatbot()` with prefilled message. Zero console errors verified on fresh server start.
- **U4 complete** — Draggable non-modal chatbot panel: replaced `<Sheet>` with fixed-position `div bottom-6 right-6`, pointer-event drag with viewport clamping, minimize/maximize via `ChevronDown`/`ChevronUp`, `X` close, FAB hidden when open. All SSE streaming logic intact.
- **U5 complete** — Analytics page inline rec panel: `?selected=` URL state, `RecommendationPanel` embedded in 2-column layout alongside heatmap + top-risk SKUs; clicking a row in the top-risk table sets `?selected=`.
- **U6 complete** — InventoryMatrix: 3 saved-view presets (My morning triage / East DC watchlist / Overstock candidates) in left filter rail, active state highlighted blue when filters match. Every table row is clickable — routes to `/?selected=<id>` when action item exists, else `/sku/<sku>`. Action-cell stopPropagation preserved.
- **U7 complete** — Chargebacks page: filter bar (channel + DC selects, URL state, clear link); heatmap upgraded with `channel`/`dc` props for client-side filtering + plain-language cause labels (SHORT_SHIP → "Short shipment" etc.) + DC column headers localised; top-10 customers table added below heatmap (`getTopCustomers` fetcher in `lib/api.ts`). Zero console errors.
- **U8 complete** — SKU detail page full redesign: 3-DC status cards (Critical/Watch/Healthy/Overstock chip, days of cover, available units, demand rate); PO timeline using `<PoTimeline>` (today + 3-day transfer ETA + open PO arrivals with delay flag); transfer recommendation card (route, qty, freight cost, net saving, reason, "Review in Dashboard" link); chargeback history summary card (total exposure + incident count). `getSkuDetail` + full TypeScript types added to `lib/api.ts`. Zero console errors.

The project is shippable. To start the full stack:
```bash
uvicorn web.api.main:app --reload --port 8000   # backend
pnpm --dir web/frontend dev                      # frontend → http://localhost:3000
ollama serve && ollama pull qwen2.5:7b-instruct  # chatbot (optional)
```

---

## NEXT TASK

**U9 — End-to-end smoke test + any remaining gaps**

U1–U8 are all complete. Run a manual walkthrough of all 5 success-criteria tasks from PLAN.md section 6 (with backend running) and note any gaps. If none are found, declare the polish sprint done and update prompt.md accordingly.

The 5 tasks:
1. Land on `/` — read action queue row #1, understand $ risk and options in <30s.
2. Search "SKU-001" in top bar — land on SKU detail, read recommendation.
3. Navigate to `/inventory` — filter Status=Critical, DC=DC East — verify filtered list.
4. Navigate to `/chargebacks` — filter, read top-customers list.
5. Open chatbot FAB — ask "What should I do first today?" — verify response arrives.

If gaps are found, fix them inline (small) or document as a new U10 task.

Commit: `[META] prompt: mark U8 complete, define U9 smoke-test task`
Then run `scripts/handoff.sh`.

## FILES IN PLAY (U9)

- No code changes expected — this is a verification pass.

## LOCKED / DO NOT TOUCH

- `PLAN.md` — approved spec
- `scripts/handoff.sh` — handoff mechanism

## BLOCKERS

- None. Backend on :8000, frontend on :3000.

## QUICK-RESUME PROMPT

```
Read CLAUDE.md then prompt.md (FIGMA spec is embedded there now — skip FIGMA_PROMPT.md).
Note: U1–U8 are complete. Execute NEXT TASK (U9 — smoke test + gap fix) per the spec in prompt.md.
Follow the Context budget & handoff protocol from CLAUDE.md.
When U9 is done, update prompt.md and run scripts/handoff.sh.
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
| F7 | Reports + Settings stubs | ✅ Done | Reports quick-action cards + available reports list; Settings preferences/DC-labels/integrations cards |
| F8 | Filter + search behavior | ✅ Done | Wire FilterBar pills + dropdowns to Action Queue; URL-state filters; global search debounced 200ms |
| F9 | Polish pass | ✅ Done | Active-nav aria-labels, keyboard nav, colorblind-safe chips, MetricTooltip 25 terms, OnboardingTour banner. |

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
