# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Ship **Transfer-vs-Wait decision engine + AI chatbot for non-technical ops managers**. Keep the J-72402 demo narrative intact. Full roadmap in `shared/roadmap.md` (Phase 0 → 5).

## LAST SESSION SUMMARY
- Shipped Phase 0 — Foundation: `anthropic>=0.40` added to `pyproject.toml`; shadcn `sheet`, `tooltip`, `dialog`, `scroll-area`, `input` installed; `web/frontend/lib/api.ts` created exporting `API_BASE` + `apiGet<T>`; all 7 hardcoded `http://localhost:8000` strings replaced; `web/frontend/.env*.local` added to `.gitignore`.
- 29/29 pytest passing; `pnpm build` succeeded (Next.js 16.2.4, TypeScript clean, 5 pages).
- All acceptance criteria from Phase 0 verified.

## NEXT TASK
**Phase 1a — Expand `analytics/chargeback.py`** per `shared/roadmap.md` § "Phase 1 → 1a". One commit.

Acceptance criteria:
1. New exports (all TPR-filtered):
   - `top_causes(df, n=5)` → DataFrame `[cause_code, total_amount, count, pct_of_total]`
   - `top_customers(df, n=10)` → DataFrame `[customer_id, total_amount, count]`
   - `top_channels(df, n=5)` → DataFrame `[channel, total_amount]`
   - `by_dc(df)` → DataFrame `[dc, total_amount]`
   - `monthly_trend(df)` → DataFrame `[month (YYYY-MM), total_amount]`
   - `penalty_rate(df, customer_id, channel, dc) -> float` — mean $ per event; fallback (customer+channel+dc) → channel+dc → dc → global when <3 samples.
2. Existing `chargeback_summary` unchanged (heatmap still uses it).
3. `TPR` filtered from all new functions (see `constants.py` filter).
4. `tests/test_chargeback.py` extended: TPR filter, top-N shapes, `penalty_rate` fallback chain (≥4 new test cases).
5. `pytest -q` → 29 + new tests all passing.

Commit message: `[LOGIC] chargeback: add top-N, by_dc, monthly_trend, penalty_rate exports`

Then continue with Phase 1b (rewrite `analytics/transfer.py`) in the same session if context permits.

## FILES IN PLAY
- `analytics/chargeback.py` — add new exports
- `tests/test_chargeback.py` — extend with new test cases
- `data/constants.py` — read TPR filter and cause code constants

## LOCKED / DO NOT TOUCH
- Hero SKU **J-72402** and its demo numbers (48/6094/480 across East/West/Central; $13,680 annual banner)
- `demo/scenario.md` narrative and the 5-step walkthrough
- Existing heatmap color logic in `ChargebackHeatmap.tsx`
- `web/frontend/lib/api.ts` newly created (do not revert)
- All entries in `CLAUDE.md` § "Do not re-derive" (14 items)

## BLOCKERS
- Phase 0–2 have none.
- Phase 3 (chatbot) requires `ANTHROPIC_API_KEY` in environment before end-to-end verification.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then read shared/roadmap.md for the full phase breakdown. Implement the NEXT TASK (Phase 1a) exactly as specified. Follow the Context budget & handoff protocol from CLAUDE.md — commit small, push often, hand off when context hits 25%.
```
