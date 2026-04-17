# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Ship **Transfer-vs-Wait decision engine + AI chatbot for non-technical ops managers**. Keep the J-72402 demo narrative intact. Full roadmap in `shared/roadmap.md` (Phase 0 → 5).

## LAST SESSION SUMMARY
- Shipped the heatmap-polish demo (commit `89f86b1`) — last session froze the visuals as "demo is shippable" on the hero SKU J-72402.
- Authored `shared/roadmap.md`: 6-phase plan closing the 8 engine gaps the prior Claude flagged (transfer-vs-wait w/ open_po + delay_flag, chargeback top-N + penalty_rate, alerts, pipeline, per-SKU API, centralized frontend config, manual-vs-system savings, tests) PLUS a read-only Claude-API chatbot (floating Sheet) PLUS an accessibility layer (glossary tooltips, ActionQueue, TRANSFER/WAIT badge).
- Updated `CLAUDE.md`: corrected Next.js 14 → 16.2.4, added Anthropic SDK + `ANTHROPIC_API_KEY` to stack/commands/gitignore, documented 4 new locked assumptions (delay_flag +7d, dominant-customer 90d, chatbot read-only, chat model = sonnet-4-6).

## NEXT TASK
**Phase 0 — Foundation** per `shared/roadmap.md` § "Phase 0". One commit.

Acceptance criteria:
1. `anthropic>=0.40` listed in `pyproject.toml` dependencies; `uv pip install -e .` succeeds.
2. shadcn components `sheet`, `tooltip`, `dialog`, `scroll-area`, `input` installed under `web/frontend/components/ui/`. **Before running `shadcn add`, read `web/frontend/node_modules/next/dist/docs/` for Next.js 16 guidance** (per `web/frontend/AGENTS.md`).
3. `web/frontend/lib/api.ts` exists and exports `API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"` plus a typed `apiGet<T>(path)` helper.
4. Zero hardcoded `http://localhost:8000` strings remain in `web/frontend/**` (verify with `grep -r "localhost:8000" web/frontend/app web/frontend/components`). The 7 known sites:
   - `components/ChargebackHeatmap.tsx:16`
   - `components/ImbalanceTable.tsx:16`
   - `components/SavingsBanner.tsx:6`
   - `components/StatsBar.tsx:6`
   - `components/TransferCard.tsx:15`
   - `app/chargebacks/page.tsx:9`
   - `app/sku/[sku]/page.tsx:76` (and :82)
5. `.env`, `.env.local`, `web/frontend/.env*.local` in `.gitignore`.
6. `pytest -q` still 29/29. Frontend `pnpm --dir web/frontend build` succeeds.

Commit message: `[META] foundation: centralize api base, add anthropic + shadcn ui deps`

Then hand off to Phase 1a (expand `analytics/chargeback.py`) — see roadmap.

## FILES IN PLAY
- `pyproject.toml` — add `anthropic>=0.40`
- `web/frontend/package.json` — gains shadcn ui additions
- `web/frontend/lib/api.ts` — NEW
- `.gitignore` — add env entries
- Existing components listed in acceptance criterion #4 — swap hardcoded URL for `API_BASE`

## LOCKED / DO NOT TOUCH
- Hero SKU **J-72402** and its demo numbers (48/6094/480 across East/West/Central; $13,680 annual banner)
- `demo/scenario.md` narrative and the 5-step walkthrough
- Existing heatmap color logic in `ChargebackHeatmap.tsx` (last session's work; rgba inline styles)
- All entries in `CLAUDE.md` § "Do not re-derive" (now 14 items, including delay_flag +7d, chatbot read-only, model = sonnet-4-6)

## BLOCKERS
- Phase 0–2 have none.
- Phase 3 (chatbot) requires `ANTHROPIC_API_KEY` in environment before end-to-end verification. Not needed for Phase 0.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then read shared/roadmap.md for the full phase breakdown. Implement the NEXT TASK (Phase 0) exactly as specified. Follow the Context budget & handoff protocol from CLAUDE.md — commit small, push often, hand off when context hits 25%.
```
