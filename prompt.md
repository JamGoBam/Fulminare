# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Build the demo scenario walkthrough and "Save $X annually" projection banner — the final two judging-criterion features before polish and rehearsal.

## LAST SESSION SUMMARY
- Implemented `analytics/transfer.py` (`transfer_recommendations`): surplus→deficit pairs, freight lookup, $15/unit chargeback proxy, net_saving filter; correctly generates DC_CENTRAL→DC_EAST for SKU-004 ($900 net saving)
- Implemented `GET /api/recommendations/transfers`, mounted router; `TransferCard` component on home page with green net saving column
- Verified in browser: "Transfer Recommendations" card renders SKU-004/Reishi row; 18/18 tests still green
- Commit: `[LOGIC+FRONTEND] transfer: recommendation engine, API endpoint, TransferCard` (hash: TBD)

## NEXT TASK
Add the "Save $X annually" projection banner to the dashboard and finish the `demo/scenario.md` walkthrough script.

**1 — Annual savings banner (`web/frontend/components/SavingsBanner.tsx` + `app/page.tsx`):**

- Fetch `GET /api/recommendations/transfers`
- Sum all `net_saving` values, annualize: `annual = sum_net_saving * 12` (monthly proxy for demo)
- Show a green banner above the imbalance card (below the header):
  `"Proactive transfers could save POP an estimated $X,XXX / year in chargeback penalties"`
- Hide if total = 0 or still loading
- Style: `bg-green-50 border border-green-200 text-green-800` with a dollar sign icon

**2 — Add `GET /api/summary` endpoint (`web/api/routes/inventory.py`):**

- Returns a single JSON object:
  ```json
  { "total_skus": N, "critical_count": N, "warning_count": N, "annual_savings_estimate": X }
  ```
- `critical_count` / `warning_count` from imbalance table (status field)
- `annual_savings_estimate` = sum of all transfer `net_saving` × 12

**3 — Update `demo/scenario.md`:**

- Write a 5-step walkthrough script for the live demo using SKU-004 (Reishi Mushroom Capsules):
  1. Open dashboard → alert banner + critical row visible
  2. Point to imbalance score 10.0 on SKU-004/DC_EAST
  3. Point to Transfer Recommendation card: DC_CENTRAL → DC_EAST, 108 units, $900 net saving
  4. Navigate to /chargebacks → SHORT_SHIP is top cause at DC_EAST ($970)
  5. Point to annual savings banner: "POP could avoid ~$X/year with proactive transfers"
- Keep it terse — bullet points, no paragraphs

**Acceptance criteria:**
- Banner appears on home page showing a dollar amount > 0
- `GET /api/summary` returns valid JSON with all 4 keys
- `demo/scenario.md` has 5 steps covering SKU-004 walkthrough
- `pnpm --dir web/frontend dev` starts clean (no TS errors)
- `pytest tests/test_imbalance.py -q` still 18/18

## FILES IN PLAY
- `web/frontend/components/SavingsBanner.tsx` (new)
- `web/frontend/app/page.tsx` (add SavingsBanner above imbalance card)
- `web/api/routes/inventory.py` (add GET /api/summary)
- `demo/scenario.md` (write walkthrough)

## LOCKED / DO NOT TOUCH
- `analytics/**` — all locked
- `web/api/routes/chargebacks.py`, `web/api/routes/recommendations.py` — locked
- `web/frontend/components/ImbalanceTable.tsx`, `TransferCard.tsx`, `ChargebackHeatmap.tsx` — locked
- `tests/**` — must stay green
- `data/seed/**` — locked

## BLOCKERS
- None. All data is in place.

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then implement NEXT TASK exactly as specified. Do not read or open any file not in FILES IN PLAY. Follow the Context budget & handoff protocol from CLAUDE.md — if context drops to ~25% or you finish the task, run `bash scripts/handoff.sh "<commit message>"` and stop. Do not squeeze in extra work before the handoff.
```

---

## End-of-session update template
At session end, rewrite this file top-to-bottom:
1. Update **CURRENT SPRINT GOAL** if it shifted.
2. Rewrite **LAST SESSION SUMMARY** — 3 bullets + commit hash.
3. Rewrite **NEXT TASK** — one concrete block, ≤3h, with crisp acceptance criteria.
4. Update **FILES IN PLAY** and **LOCKED** for the next driver.
5. Update **BLOCKERS** (add or clear).
6. Regenerate **QUICK-RESUME PROMPT** if task shape changed.
7. Run `bash scripts/handoff.sh "[META] prompt: handoff <topic>"` — commits, pushes, prints resume hint.
