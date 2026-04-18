# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Pivot from HTC 2026 demo to a real-user POP Inventory tool for entry-level supply managers. Three linked workstreams:
1. **Data cleanup** — validator, richer seed, enriched derived table (single source of truth)
2. **Frontend IA rewrite** — Figma "Operations Hub" IA: Dashboard / Inventory / Analytics / Reports / Settings
3. **In-house chatbot** — swap Anthropic for **Ollama** (local, free, no API key); `qwen2.5:7b-instruct` by default

Full execution blueprint is in **`PLAN.md`** (17 phases P0→P16) and **`FIGMA_PROMPT.md`** (9 sub-phases F1→F9). Treat both as the approved spec. FIGMA_PROMPT.md §3 supersedes PLAN.md §3 for the frontend IA.

## LAST SESSION SUMMARY
- Completed **F1 — App shell + sidebar + top bar + routes**.
- Created `components/Sidebar.tsx` (dark slate-900, blue-500 logo, active blue-600 highlight, `usePathname` routing) and `components/TopBar.tsx` (search, bell, date).
- Updated `app/layout.tsx` to wrap every route in the persistent sidebar+topbar shell with `Chatbot` FAB at root.
- Replaced `app/page.tsx` with a Dashboard placeholder; added stub pages for `/inventory`, `/analytics`, `/reports`, `/settings`.
- Created `lib/types.ts` with the full `ActionItem` / `TransferDetails` / `InboundDetails` TypeScript shape from FIGMA_PROMPT.md §3.
- Smoke-tested all 5 routes in preview — zero console errors, active nav state correctly highlights on each route.

## NEXT TASK
**F2 — Dashboard 2-column shell + KPI cards + filter bar** (FIGMA_PROMPT.md §4).

Acceptance criteria:
1. `/` renders a 2-column layout: left `col-span-2` Action Queue placeholder, right `col-span-1` Recommendation Panel placeholder.
2. **4 KPI cards** above the columns: "Urgent Actions", "Total Chargeback Risk", "Delayed Inbounds", "Overstocked DCs" — reading real values from `GET /api/summary` via TanStack Query (fall back to static numbers if API is down).
3. **Filter bar** below KPI cards: search input, DC dropdown, Risk Level dropdown, Recommendation dropdown, Channel dropdown, Sort dropdown, and 4 quick-filter pills (High Risk Only / FDA Holds / Split Ship Risk / Needs Approval). Pills render and toggle visually; no backend wiring yet.
4. Action Queue and Recommendation Panel render as clearly-labeled placeholder cards (not blank — copy like "Action Queue — wired in F3").
5. All visual tokens match FIGMA_PROMPT.md §2.0: `rounded-xl`, `shadow-sm`, `border-slate-200`, KPI icon backgrounds per color spec.
6. Zero console errors. Existing `pytest -q` still passes.

## FILES IN PLAY
- `web/frontend/app/page.tsx` — replace placeholder with F2 layout
- `web/frontend/components/KpiCard.tsx` (new)
- `web/frontend/components/FilterBar.tsx` (new)
- `web/frontend/lib/api.ts` — add `getSummary()` fetcher if not present
- `web/api/routes/` — `GET /api/summary` may already exist (check before adding)

## LOCKED / DO NOT TOUCH
- `PLAN.md` — approved spec; any structural changes require user signoff
- `FIGMA_PROMPT.md` — Figma source of truth for all visual decisions
- `scripts/handoff.sh` — handoff mechanism
- `components/Sidebar.tsx`, `components/TopBar.tsx`, `app/layout.tsx` — F1 deliverables; do not regress

## BLOCKERS
- None. Backend `/api/summary` may need to be created — check existing routes first.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md, then PLAN.md, then FIGMA_PROMPT.md, then prompt.md. Execute NEXT TASK (F2 — Dashboard 2-column shell + KPI cards + filter bar) from FIGMA_PROMPT.md §4. Follow the Context budget & handoff protocol from CLAUDE.md. When F2 is done, update prompt.md so NEXT TASK is F3, then run scripts/handoff.sh.
```
