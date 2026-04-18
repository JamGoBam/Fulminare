# FIGMA_PROMPT.md — Frontend UI/UX alignment to "Operations Hub" Figma

Paste this file (or the QUICK-PASTE block at the bottom) as your first message in a new Claude Code session to drive the frontend reorganization.

This prompt supersedes PLAN.md §3 (the original "Today / Inventory / Transfers / Chargebacks / Ask" IA). All other PLAN.md workstreams — data cleanup (P0–P4), in-house Ollama chatbot (P11–P13), accessibility polish (P14) — are unchanged.

---

## 0. Before you touch any code

1. Read `CLAUDE.md` (conventions + handoff protocol).
2. Read `PLAN.md` (approved execution blueprint — data, chatbot, and polish phases still apply).
3. Read `prompt.md` (current NEXT TASK; may or may not be this one).
4. Read `web/frontend/AGENTS.md` (Next.js 16 has breaking changes vs. training data — consult `web/frontend/node_modules/next/dist/docs/` before writing frontend code).
5. **Read [`web/frontend/design/figma-source.tsx.txt`](web/frontend/design/figma-source.tsx.txt) in chunks** — this is the authoritative visual source (~1617 lines; verbatim TSX from Figma's code export). Every exact Tailwind class, color token, icon, and string comes from here. When in doubt, match this file. §2 below summarizes; when they conflict, the source file wins.
6. Explore the existing `web/frontend/` for ~10 minutes. Identify components to **refactor** vs **replace**. Do NOT rebuild from scratch.
7. Update PLAN.md §3 in place to match this Figma IA (don't leave the old "Today / Transfers / Ask" structure documented — it's now stale).

---

## 1. Product intent (do not lose sight of this)

This is NOT a generic analytics dashboard. It is an **operational decision-support tool** for inventory imbalance across 3 DCs. The user is an entry-level supply manager making $5K freight calls under time pressure. Priority order of screens:

1. **Action Queue** (hero)
2. **Recommendation Panel** (selected-item detail)
3. **Inventory**
4. **Analytics**
5. **Reports**

Tone: enterprise/SaaS, neutral, operational. Not playful. DC names are **"DC West / DC Central / DC East"** (neutral labels; drop the underscore codes from all user-facing strings — keep `DC_WEST/CENTRAL/EAST` only in the database and analytics layer).

---

## 2. Authoritative UI spec

The Figma TSX export at [`web/frontend/design/figma-source.tsx.txt`](web/frontend/design/figma-source.tsx.txt) is the source of truth. The summary below is a navigation aid — **do not paraphrase from this summary when a decision requires exact styling; read the source**.

### 2.0 Visual tokens (lifted from the source — match these exactly)

**Shell chrome**
- Sidebar: `w-64 bg-slate-900`, border `border-slate-800`, padding `p-6`/`p-4`.
- Logo tile: `w-8 h-8 bg-blue-500 rounded-lg` wrapping a `Package` icon, white.
- Branding strings: `"Prince of Peace"` (semibold white) over `"Operations Hub"` (`text-slate-400 text-xs`).
- Nav item (inactive): `text-slate-300 hover:bg-slate-800 hover:text-white`.
- Nav item (active): `bg-blue-600 text-white`.
- User chip (bottom of sidebar): circle avatar `bg-slate-700 rounded-full`, two lines of text. **Leave as "John Davis / Ops Manager" stub in v1** — real auth is out of scope.
- Top bar: `h-16 bg-white border-b border-slate-200 px-8`.
- Page body background: `bg-slate-50`.
- Cards: `bg-white rounded-xl border border-slate-200 shadow-sm`.

**Status / severity palette** (used consistently across every screen)
- Critical / High risk: `bg-red-100 text-red-700 border-red-200` (chips), `text-red-600` (values).
- Low / Medium / Watch / delayed: `bg-amber-100 text-amber-700 border-amber-200` / `text-amber-600`.
- Healthy: `bg-green-100 text-green-700 border-green-200` / `text-green-600`.
- Overstock / informational: `bg-blue-100 text-blue-700 border-blue-200` / `text-blue-600`.
- Recommendation badge colors: Transfer Now → `bg-blue-600 text-white`; Wait → `bg-slate-600 text-white`; Escalate → `bg-purple-600 text-white`.
- URGENT tag (top 3 High rows): `bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded` positioned top-right of the row; the row also gets `border-l-4 border-l-red-500 bg-red-50/30`.
- Selected row: `bg-blue-50 border-l-4 border-l-blue-600`.

**Icons — lucide-react only** (already a transitive dep; add direct import if needed)
- Sidebar: `LayoutDashboard`, `Package`, `TrendingUp`, `FileText`, `Settings`.
- Header: `Search`, `Bell`.
- KPI cards: `AlertTriangle`, `DollarSign`, `Clock`, `Package`.
- FilterBar pills: `AlertTriangle`, `FileWarning`, `Truck`, `CheckSquare`.
- Action Queue urgency: `AlertCircle` (≤1d), `Clock` (≤3d), `CheckCircle` (else).
- Recommendation Panel: `ArrowRight`, `CheckCircle2`, `XCircle`, `AlertTriangle`, `TrendingUp`, `Clock`, `DollarSign`, `Package`, `MapPin`.
- Inventory: `AlertTriangle`, `TrendingUp`, `TrendingDown`, `Package`, `Clock`, `ArrowRight`.
- Analytics: `DollarSign`, `TrendingDown`, `AlertTriangle`, `Package`, `BarChart3`.
- Reports: `FileText`, `Download`, `Calendar`, `TrendingUp`, `CheckCircle`.

**Typography**
- Page title: `text-2xl font-semibold text-slate-900`.
- Section title: `text-lg font-semibold text-slate-900` or `text-xl` inside a panel header.
- Card label (muted): `text-slate-500 text-sm`.
- KPI value: `text-3xl font-semibold`.
- Body: default Tailwind; muted copy `text-slate-600`.

**Recommendation summary sentences** (use these verbatim in RecommendationPanel):
- Transfer Now → `Execute immediate transfer to prevent {daysUntilStockout}-day stockout and avoid {potentialPenalty} in penalties.`
- Wait → `Monitor inbound shipment. Current trajectory shows arrival before stockout with minimal risk exposure.`
- Escalate → `Critical situation requiring executive decision. No standard transfer options available.`

**Hero example IDs** (useful when you need a seed row for preview screenshots — not required for wiring):
- `POP-GT-1001` Ginger Honey Crystals 30ct, Transfer Now, DC West, 2d, $124K penalty.
- `POP-RG-2045` Red Panax Ginseng, Transfer Now, DC East, 1d, $89K, FDA hold on inbound.
- `POP-GI-6115` Ginger Chews Original, Escalate, DC West, 3d, $213K, `sourceDC: "None available"`, `unitsAvailable: 0`.

**Escalate case** — RecommendationPanel must render gracefully when `transferDetails.sourceDC === "None available"` / `unitsAvailable === 0` / `leadTime === "N/A"`. Don't crash on zero-width confidence bars; treat 0 as 0%, not empty.

### 2.1 App shell
- React + TypeScript, Next.js 16 App Router (already in repo).
- Dark vertical sidebar on the left. Branding: **"Prince of Peace / Operations Hub"**.
- Sidebar nav items (active view highlighted):
  - Dashboard
  - Inventory
  - Analytics
  - Reports
  - Settings
- Persistent top bar:
  - Search input placeholder: `"Search SKUs, DCs, or PO numbers..."`
  - Notification bell
  - Date display
- App state:
  - `currentView` — drive from Next.js route; no store needed.
  - `selectedItemId` — URL query param (`?selected=<sku-or-id>`) so links are shareable. CLAUDE.md tech stack forbids Zustand; use URL state + TanStack Query only.

### 2.2 Dashboard (route: `/`)
2-column layout below the header:
- Header strip: **4 KPI cards** — "Urgent Actions", "Total Chargeback Risk", "Delayed Inbounds", "Overstocked DCs".
- Filter bar:
  - Search by SKU / item / DC
  - DC filter: DC West / DC Central / DC East
  - Risk level filter (High / Medium / Low)
  - Recommendation filter (Transfer Now / Wait / Escalate)
  - Channel filter
  - Sort filter
  - Quick-filter pills: **High Risk Only**, **FDA Holds**, **Split Ship Risk**, **Needs Approval**
- Main 2-column:
  - **Left — Action Queue** (hero; see §2.3)
  - **Right — Recommendation Panel** (see §2.4)

### 2.3 Action Queue (left column of Dashboard)

Prioritized list of inventory imbalance decisions. Each row renders:
- `itemName`, `sku`, `category`
- `atRiskDC`
- `companyWideInventory`
- `daysUntilStockout`
- `potentialPenalty`
- Recommendation badge (Transfer Now / Wait / Escalate)
- Risk badge (High / Medium / Low)
- Confidence %
- One-line `reason`
- `updatedAt` (relative timestamp, e.g. "2m ago")

Behavior:
- Clicking a row sets `selectedItemId` (updates URL + Recommendation Panel).
- Selected row visually highlighted.
- Top 3 high-risk rows show an additional **URGENT** badge.
- Row accent color scales with `daysUntilStockout` (shorter = redder).

### 2.4 Recommendation Panel (right column of Dashboard)

**Empty state**: prompt the user to select an Action Queue row. No mocked item preview.

**When an item is selected**, show:
- Header: **"Recommended Action"** + item name, SKU, at-risk DC.
- Summary sentence derived from `recommendation` + `reasoning[0]`.
- **Decision comparison** — 2 cards side-by-side:
  - **Option A — Transfer Now**: `sourceDC`, `unitsAvailable`, `leadTime`, `estimatedArrival`, `cost`, `postTransferHealth`, `confidence`.
  - **Option B — Wait for Inbound**: `poEta`, `delayRisk`, `complianceFlags`, `stockoutWindow`, `penaltyRisk`, `confidence`.
- **"Why This Recommendation"** — bullet list from `reasoning[]`.
- **"Evidence & Timeline"** — a compact horizontal timeline showing past POs, today, and open PO ETA (reuse the `PoTimeline.tsx` already planned in PLAN.md P9).
- Action buttons (all **read-only stubs in v1** per PLAN.md locked assumption #13 — they log / toast "Marked for WMS review" but do not mutate):
  - Approve Transfer
  - Wait and Monitor
  - Escalate
  - Assign Owner

### 2.5 Inventory (route: `/inventory`)

Summary cards (top): **Critical SKUs**, **Severe Imbalances**, **Overstocked**, **Inbound POs**.

Inventory matrix table. Each row:
- `sku`, `itemName`, `category`
- `dcWest { dos, onHand, status }`
- `dcCentral { dos, onHand, status }`
- `dcEast { dos, onHand, status }`
- `imbalance` score
- `inboundPO` (count + next ETA)
- **Review** button (navigates to Dashboard with `?selected=<sku>`)

Status enum: `healthy` | `low` | `critical` | `overstock`. Traffic-light colors + icon (colorblind-safe).

### 2.6 Analytics (route: `/analytics`)

Summary KPIs (top): **Total Chargebacks**, **Avg OTIF Score**, **Late Shipments**, **Split Shipments**.

Sections below (reuse existing components where possible):
- **Chargebacks by Cause** — reuses / extends [`ChargebackHeatmap.tsx`](web/frontend/components/ChargebackHeatmap.tsx).
- **Penalty Exposure by Channel** — bar chart (Recharts).
- **Penalty Exposure by DC** — bar chart.
- **Highest-Risk SKUs** — top-10 list with drill-through to Dashboard.

### 2.7 Reports (route: `/reports`)

Quick-action cards (top): **Quick Export**, **Performance Summary**, **Scheduled Reports**.

Lists:
- **Available Reports** — templates user can run (stub list in v1).
- **Recent Exports** — history (stub; empty state OK for v1).

v1 scope: UI only; no real export. Buttons log/toast. Wire to backend in a later phase.

### 2.8 Settings (route: `/settings`)

Stub page. Single-column sections (each is a placeholder card in v1):
- **Preferences** (density, default DC filter)
- **DC Labels** (allows renaming "DC West" → "Carlisle", etc. — but wiring to `data/dc_labels.py` is out of scope for v1; just render the inputs)
- **Integrations** (Ollama URL / model — display current values from `web/api/config.py`, read-only in v1)

---

## 3. Data model (TypeScript)

Normalize backend responses to this `ActionItem` shape. Put the type in `web/frontend/lib/types.ts` (new file or extend existing).

```ts
export type Recommendation = 'Transfer Now' | 'Wait' | 'Escalate';
export type RiskLevel = 'High' | 'Medium' | 'Low';
export type DcStatus = 'healthy' | 'low' | 'critical' | 'overstock';

export interface TransferDetails {
  sourceDC: string;           // "DC West" etc.
  unitsAvailable: number;
  leadTime: string;           // e.g. "3 days"
  estimatedArrival: string;   // ISO date
  cost: number;               // freight $
  postTransferHealth: string; // e.g. "DC East 18d cover"
  confidence: number;         // 0–100
}

export interface InboundDetails {
  poEta: string;              // ISO date (already +7d if delay_flag)
  delayRisk: string;          // "Low" | "Medium" | "High"
  complianceFlags: string[];  // e.g. ["FDA hold"]
  stockoutWindow: string;     // e.g. "4 days short"
  penaltyRisk: number;        // $
  confidence: number;
}

export interface ActionItem {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  brand: string;
  atRiskDC: string;           // "DC East" etc.
  daysUntilStockout: number;  // integer; null-coerced to Infinity
  companyWideInventory: number;
  recommendation: Recommendation;
  riskLevel: RiskLevel;
  potentialPenalty: number;
  reason: string;
  confidence: number;
  updatedAt: string;          // ISO timestamp
  transferDetails: TransferDetails;
  inboundDetails: InboundDetails;
  reasoning: string[];
}
```

### 3.1 Backend mapping (new endpoint `GET /api/action-items`)

Source parquet files (all produced by `analytics/pipeline.py`, extended by PLAN.md P3 `analytics/enrich.py`):
- `data/processed/enriched.parquet` — `status_plain`, `status_reason`, `dollar_exposure`, `days_until_stockout`, `recommended_action`, `next_po_eta`.
- `data/processed/transfers_computed.parquet` — per-SKU-DC-deficit: `action`, `cost`, `qty_needed`, `origin_dc`, `penalty_avoided`, `net_saving`.
- `data/processed/open_po.parquet` — `expected_arrival`, `delay_flag`, `qty`.
- `data/processed/skus.parquet` — `product_name`, `category`, `brand`.

Join on `(sku, atRiskDC)`. Map:
- `recommendation` ← Figma string from backend `recommended_action` enum (`"TRANSFER"`→`"Transfer Now"`, `"WAIT"`→`"Wait"`, `"ESCALATE"`→`"Escalate"`).
- `riskLevel` ← bucket `days_until_stockout` (`<14`→`"High"`, `<30`→`"Medium"`, else `"Low"`).
- `confidence` ← a deterministic function of data completeness (e.g. `100 - missing_fields*10`). Keep simple in v1.
- `reasoning[]` ← synthesize from `status_reason` + `next_po_eta` + `delay_flag` (3 bullets).
- `updatedAt` ← pipeline run timestamp.

PLAN.md **P3 needs an amendment**: add the ActionItem-shaped output view to the pipeline. Update it inline when you start that phase.

---

## 4. Execution sub-phases

This is too big for one Claude Code task. Break into the following; run `scripts/handoff.sh` after each phase per CLAUDE.md.

| # | Phase | Scope | Depends on |
|---|---|---|---|
| F1 | App shell + sidebar + top bar + routes | Create `components/Sidebar.tsx`, `components/TopBar.tsx`. Add routes `/` (Dashboard), `/inventory`, `/analytics`, `/reports`, `/settings`. Remove or redirect old `/today`, `/transfers`, `/ask` if already stubbed. Every route renders a placeholder so nav is fully wired. | PLAN.md P0–P4 (data foundation) |
| F2 | Dashboard 2-column shell + KPI cards + filter bar | Layout only. Action Queue + Recommendation Panel render placeholder cards. KPI cards read from `/api/summary`. Filter bar renders all 4 quick pills but they don't wire yet. | F1 |
| F3 | Action Queue live | Fetch from new `/api/action-items` endpoint. Row click writes `?selected=<sku>`. URGENT badge on top 3 High-risk rows. Accent color scales with `daysUntilStockout`. | F2 + backend endpoint |
| F4 | Recommendation Panel live | Driven by `?selected` URL param. Full 2-card comparison + reasoning bullets + Evidence & Timeline (use/extend `PoTimeline.tsx`). Action buttons as log-only stubs. | F3 |
| F5 | Inventory matrix | Summary cards + table. Reuses `ImbalanceTable.tsx` refactored to the new columns. | F3 |
| F6 | Analytics | 4 KPI tiles + 4 sections. Reuses `ChargebackHeatmap.tsx`. | F3 |
| F7 | Reports + Settings stubs | Cards + lists. No backend wiring in v1. | F1 |
| F8 | Filter + search behavior | Wire quick-filter pills, DC filter, risk level, recommendation, channel, sort. URL-state the filters (`/?dc=DC_WEST&risk=High`). Global search debounced 200ms. | F3–F6 |
| F9 | Polish pass | Active-nav highlight, accessibility (aria-labels, keyboard nav), colorblind-safe chips, empty states with plain-language copy per PLAN.md §3.4. Merge with PLAN.md P14. | F2–F8 |

**Backend endpoint** (`GET /api/action-items`) goes in `web/api/routes/` alongside the existing routes. Build it during F3 (not as a separate phase). It reads the three parquet files listed in §3.1 and returns `ActionItem[]` ready for the frontend. No new backend tests.

---

## 5. Reuse / replace map

Reuse (refactor in place):
- [`ActionQueue.tsx`](web/frontend/components/ActionQueue.tsx) — swap to `ActionItem` shape; add selection state via URL param; add URGENT badge.
- [`TransferCard.tsx`](web/frontend/components/TransferCard.tsx) — absorbed into `RecommendationPanel`'s "Option A — Transfer Now" card.
- [`StatsBar.tsx`](web/frontend/components/StatsBar.tsx), [`SavingsBanner.tsx`](web/frontend/components/SavingsBanner.tsx) — refactor into the 4 Dashboard KPI cards.
- [`ChargebackHeatmap.tsx`](web/frontend/components/ChargebackHeatmap.tsx) — reuse inside `/analytics` "Chargebacks by Cause".
- [`MetricTooltip.tsx`](web/frontend/components/MetricTooltip.tsx) — expand glossary per PLAN.md P14.
- [`Chatbot.tsx`](web/frontend/components/Chatbot.tsx) — **keep the FAB on every route**. Figma spec doesn't mention it; it's complementary.
- [`lib/api.ts`](web/frontend/lib/api.ts) — add typed fetcher `getActionItems(): Promise<ActionItem[]>`.

Replace (delete or redirect):
- Old `app/page.tsx` dashboard layout — replaced by new 2-column Dashboard.
- Old `app/sku/[sku]/page.tsx` — replaced by URL-selected RecommendationPanel (no dedicated SKU route needed in Figma IA). Add a redirect if any links still point to `/sku/[sku]`.

New:
- `components/Sidebar.tsx`, `components/TopBar.tsx`, `components/RecommendationPanel.tsx`, `components/ActionComparisonCard.tsx`, `components/FilterBar.tsx`, `components/KpiCard.tsx`, `components/InventoryMatrix.tsx`, `components/PoTimeline.tsx` (also in PLAN.md P9).
- `app/inventory/page.tsx`, `app/analytics/page.tsx`, `app/reports/page.tsx`, `app/settings/page.tsx`.
- `lib/types.ts` for the `ActionItem` shape.

---

## 6. What NOT to do

- **Do not rebuild from scratch.** Refactor existing components where they map.
- **Do not introduce Zustand, Redux, or any new state library.** URL query params + React context (only if strictly needed) + TanStack Query is enough (per CLAUDE.md tech stack).
- **Do not drop the Ollama chatbot FAB.** It remains accessible on every screen.
- **Do not wire Approve / Wait and Monitor / Escalate / Assign Owner buttons to real mutations.** Stub them — log to console, optionally show a toast. PLAN.md locked assumption #13 (read-only in v1) survives the Figma pivot.
- **Do not invent new colors, fonts, or spacing tokens.** Use existing Tailwind + shadcn/ui tokens already in the repo.
- **Do not add new `test_*.py` or `*.test.tsx` files.** Per PLAN.md §6 verification: smoke-test via `preview_*` MCP tools only. Existing `pytest -q` must still pass.
- **Do not rename `DC_EAST/WEST/CENTRAL` in the database or analytics.** Only the UI layer uses "DC West / DC Central / DC East".

---

## 7. Acceptance criteria

A reviewer should be able to verify each:

1. Sidebar renders 5 nav items in correct order, dark theme, "Prince of Peace / Operations Hub" branding. Active route highlighted.
2. Top bar: search input with placeholder `"Search SKUs, DCs, or PO numbers..."`, notification bell icon, date display.
3. Dashboard `/` shows: 4 KPI cards → filter bar → 2-column ActionQueue + RecommendationPanel.
4. Clicking any Action Queue row updates the URL (`?selected=<sku>`) and the RecommendationPanel renders the 2-card decision comparison + reasoning + Evidence & Timeline + 4 action buttons.
5. Top 3 high-risk (riskLevel="High") rows show URGENT badge.
6. Row accent color visibly varies with `daysUntilStockout`.
7. `/inventory` renders 4 summary cards + the matrix table with per-DC status pills.
8. `/analytics` renders 4 KPI tiles + 4 sections (Chargebacks by Cause, Penalty by Channel, Penalty by DC, Highest-Risk SKUs).
9. `/reports` and `/settings` render their stub content without errors.
10. Chatbot FAB still opens on every route.
11. Quick-filter pills (High Risk Only, FDA Holds, Split Ship Risk, Needs Approval) toggle visibly and update the Action Queue.
12. `pnpm --dir web/frontend dev` runs with zero console errors on every route.
13. Existing `pytest -q` passes.
14. PLAN.md §3 has been updated in place to describe the Figma IA (not the old Today/Transfers/Ask structure).
15. Visual-fidelity spot check: sidebar is `bg-slate-900` with `bg-blue-500` logo tile and `bg-blue-600` active state; cards are `rounded-xl` with `shadow-sm`; status chips match the palette in §2.0. Any deliberate divergence from [`web/frontend/design/figma-source.tsx.txt`](web/frontend/design/figma-source.tsx.txt) is noted in the handoff commit message.

---

## 8. Verification (smoke only — no new test files)

Use the `preview_*` MCP tools:
1. Boot backend (`uvicorn web.api.main:app --reload --port 8000`) and frontend (`pnpm --dir web/frontend dev`).
2. `preview_start` → navigate to `/`.
3. `preview_snapshot` each route: `/`, `/inventory`, `/analytics`, `/reports`, `/settings`.
4. `preview_click` the first Action Queue row; `preview_snapshot` to confirm RecommendationPanel populated and URL has `?selected=`.
5. `preview_click` a quick-filter pill; `preview_snapshot` to confirm Action Queue filtered.
6. `preview_console_logs` must be empty of errors on every route.
7. `preview_screenshot` Dashboard + Inventory for the handoff commit.

---

## 9. Handoff

After each phase (F1–F9):
1. Rewrite `prompt.md` — new `LAST SESSION SUMMARY`, next `NEXT TASK` = the subsequent phase.
2. Run `bash scripts/handoff.sh "[FRONTEND] figma: <what you did this phase>"`.
3. Tell the user the short commit hash. Stop.

---

## QUICK-PASTE (copy this as your first message in a new session)

```
Read CLAUDE.md, then PLAN.md, then FIGMA_PROMPT.md, then prompt.md. Execute phase F1 (App shell + sidebar + top bar + routes) from FIGMA_PROMPT.md §4. Follow the Context budget & handoff protocol from CLAUDE.md. When F1 is done, update prompt.md so NEXT TASK is F2, then run scripts/handoff.sh.
```
