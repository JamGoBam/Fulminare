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

The project is shippable. To start the full stack:
```bash
uvicorn web.api.main:app --reload --port 8000   # backend
pnpm --dir web/frontend dev                      # frontend → http://localhost:3000
ollama serve && ollama pull qwen2.5:7b-instruct  # chatbot (optional)
```

If additional work is needed, candidates from PLAN.md:
- **P8** — Transfers dedicated page (`/transfers`) with per-decision cards
- **P9** — SKU detail page redesign (`/sku/[sku]`) with 3-DC cards + PO timeline
- **P10** — Chargebacks drill-down with filters + top-10 offender list
- Richer seed data (P1/P2) — 25 SKUs with varied patterns for more compelling demo

---

---

## NEXT TASK

**U3 — Rec panel polish: conditional blue, action-button state, Explain button**

Three sub-tasks, all in `web/frontend/components/`:

**#5 — Conditional card color (`ActionComparisonCard.tsx`)**
- `TransferComparisonCard` always shows `bg-blue-600` badge + `bg-blue-50/30` border even when the recommendation is Wait. Fix: add `recommended: boolean` prop. When `recommended=true`: keep current `border-blue-200 bg-blue-50/30` + `bg-blue-600` badge + `bg-blue-500` confidence bar. When `recommended=false`: use `border-slate-200 bg-slate-50/30` + `bg-slate-600` badge + `bg-slate-400` confidence bar.
- In `RecommendationPanel.tsx`, pass `recommended={item.recommendation === "Transfer Now"}` to `TransferComparisonCard` and `recommended={item.recommendation === "Wait"}` to `InboundComparisonCard`. `InboundComparisonCard` needs the same `recommended` prop wired to its border/badge colors.

**#6 — Action-button client state (`RecommendationPanel.tsx`)**
- Replace the 4 `console.log` buttons with real client state. Use a `Map<string, "approved"|"waiting"|"escalated"|"assigned">` stored in React context or `sessionStorage` (key: `"pop:actions"`). On button click: (a) save the status, (b) show a `<div>` confirmation banner inside the panel ("Marked for WMS review ✓"), (c) add a status chip on the matching Action Queue row (pass via context or use a `CustomEvent` dispatched to a listener in ActionQueue). The row moves to the bottom of the queue when it has a status. No backend call.
- For the context approach: create `web/frontend/lib/action-status-context.tsx` exporting `ActionStatusProvider` and `useActionStatus()` hook. Wrap the layout in it. ActionQueue reads the map to sort resolved items to bottom and show a small chip.

**#7 — "Explain in chat" button (`RecommendationPanel.tsx`)**
- Under the "Why This Recommendation" bullet list, add a small ghost button: `<button onClick={...}>Explain in chat ↗</button>`. On click: call `openChatbot()` (imported from `ActionQueue.tsx`) with message: `` `Explain why ${item.sku} at ${item.atRiskDC} should ${item.recommendation}. Walk me through the reasoning bullets.` ``

Commit: `[FRONTEND] polish: U3 — conditional card color, action-button state, Explain in chat`
Then update prompt.md NEXT TASK → U4 and run `scripts/handoff.sh`.

---

## NEXT TASK

**U4 — Draggable chatbot panel (replace Sheet)**

Replace the `<Sheet>` in `web/frontend/components/Chatbot.tsx` with a draggable, non-modal fixed-position panel. Keep all SSE streaming logic intact.

Acceptance criteria:
1. **No overlay / no blur** — remove `<Sheet>`, `<SheetContent>`, `<SheetHeader>`, `<SheetTitle>` entirely. No backdrop, no darkening of the dashboard.
2. **Fixed panel** — `fixed bottom-6 right-6 w-96 h-[32rem] bg-white rounded-xl border border-slate-200 shadow-xl z-40 flex flex-col`. Hidden when `open=false` (use `display:none` or conditional render).
3. **Drag handle** — the panel header (title bar) is draggable. Use `onPointerDown`/`onPointerMove`/`onPointerUp` on the header div. Translate the panel with `transform: translate(dx, dy)` state. Clamp so panel stays fully inside the viewport: `dx` in `[-(window.innerWidth - panelWidth - right), 0]`, `dy` in `[-(window.innerHeight - panelHeight - bottom), 0]` (adjust for starting position bottom-right). Reset drag offset to `{x:0, y:0}` when panel closes.
4. **Minimize button** — a `ChevronDown` icon button in the header that sets `minimized=true`, collapsing panel to just the title bar (height `~48px`). Clicking the FAB or `ChevronUp` un-minimizes.
5. **Close button** — `X` icon button in the header that closes (sets `open=false`). FAB still reopens.
6. **FAB unchanged** — `fixed bottom-6 right-6 z-40` blue circle. When panel is open, FAB should be hidden (or overlap is fine since panel is bottom-right — just hide FAB when open to avoid visual clutter).
7. **Keep all existing logic** — SSE streaming, `chat:prefill` event listener, suggestion chips, `unverified` footnote, tool-call pills.

Files: `web/frontend/components/Chatbot.tsx` only. Remove the shadcn Sheet imports; keep Button and Input imports.

Commit: `[FRONTEND] polish: U4 — draggable non-modal chatbot panel, no overlay`
Then update prompt.md NEXT TASK → U5 and run `scripts/handoff.sh`.

## FILES IN PLAY (U4)

- `web/frontend/components/Chatbot.tsx` — replace Sheet with draggable fixed panel

## LOCKED / DO NOT TOUCH

- `PLAN.md` — approved spec; structural changes require user signoff
- `scripts/handoff.sh` — handoff mechanism
- `web/api/chat_validator.py`, `web/api/routes/chat.py` — P12 deliverables
- `web/frontend/components/Chatbot.tsx` — will change in U4; skip for now

## BLOCKERS

- None. Backend on :8000, frontend on :3000, 59 pytest passing.

## QUICK-RESUME PROMPT

```
Read CLAUDE.md then prompt.md (FIGMA spec is embedded there now — skip FIGMA_PROMPT.md).
Execute NEXT TASK (P16 — end-to-end verification) per the spec in prompt.md.
Follow the Context budget & handoff protocol from CLAUDE.md.
When P16 is done, update prompt.md and run scripts/handoff.sh.
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
