# CLAUDE.md — Prince of Peace Inventory & Fulfillment (HTC 2026)

**Read this file once per session. Then read `prompt.md`. Then start working.** This file is stable; `prompt.md` is the living handoff.

## Context budget & handoff protocol (READ FIRST)

Sessions die when context fills up. Uncommitted work dies with them. **Commit small, push often, and hand off early.**

**Handoff triggers — any of these:**
1. Claude Code status line shows ≤25% context remaining.
2. User types `/handoff` or `handoff now`.
3. NEXT TASK from `prompt.md` is complete (normal end-of-session).
4. You hit an unresolved blocker and can't make forward progress.

**Handoff steps (in order, always):**
1. **Stop coding immediately**, even mid-diff. Do not start a new tool call chain.
2. Rewrite `prompt.md`: new `LAST SESSION SUMMARY` (3 bullets, including anything in-flight), new `NEXT TASK` with crisp acceptance criteria, updated `FILES IN PLAY` / `LOCKED` / `BLOCKERS`.
3. Run `bash scripts/handoff.sh "[<TRACK>] <area>: <imperative>"` — one call: stages, commits, pushes, prints the resume hint.
4. Tell the user the short commit hash and stop. Do not keep coding.

**Do NOT** try to squeeze in "one more thing" before handoff — that's how sessions die with work uncommitted. The script is idempotent; running it early is always safe.

## Problem (150 words)

Prince of Peace (POP) distributes ~800 active SKUs across 3 U.S. distribution centers, serving 100,000+ retail outlets across 9 channels. Company-level inventory looks healthy — a SKU might show 3 months of supply — but that masks site-level imbalance: all 3 months may sit at one DC while the other two are empty. When an order hits an empty DC, POP splits it across two DCs: two picks, two shipments, double freight, a short-ship chargeback on the partial, and a late-delivery chargeback on the delayed half. A single $100 order can trigger $300+ in combined penalties. Annual chargeback exposure ≈ $700K; shipment/delivery penalties are in the low six figures. We build a system that detects site-level imbalance early, recommends transfer-vs-wait with a dollar tradeoff, analyzes chargeback root cause, and presents all of it to an ops manager with a visible before/after against today's manual process.

## Tech stack (committed)

- **Python 3.11 + pandas** — fastest CSV-to-insight path; team knows it. *Technology*.
- **DuckDB** — SQL over parquet/CSV with zero server; pandas interop; fast aggregations for chargeback heatmaps. *Technology*.
- **FastAPI + uvicorn + pydantic v2** — async, auto OpenAPI, zero boilerplate. *Technology*.
- **Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui** — shadcn aesthetic ships the Design score out of the box. *Design, Presentation*.
- **Recharts** — line/bar/heatmap with shadcn theming. *Design*.
- **TanStack Query** — server state only; no Zustand. *Technology*.
- **uv / pnpm / ruff** — fast tooling, low install time.

## Directory

```
/data          ingestion, schemas, constants, seed CSVs, parquet outputs, duckdb
/analytics     metrics, imbalance, transfer, chargeback, alerts, forecast, pipeline
/web/api       FastAPI backend (routes split: inventory, chargebacks, recommendations)
/web/frontend  Next.js 14 app (dashboard home, /sku/[sku], /chargebacks)
/shared        cross-cutting docs (metrics.md)
/demo          scenario.md (SKU walkthrough script), rehearsal.md, assets/, deck.pdf
/scripts       handoff.sh (commit + push + print resume hint — see handoff protocol above)
/tests         pytest
```

## Data schema (one line per file)

| File | Key columns |
|---|---|
| `inventory.csv` | sku, dc, on_hand, allocated, available, unit_cost, snapshot_date |
| `sales.csv` | date, sku, qty, unit_price, customer_id, channel, ship_from_dc |
| `po_history.csv` | po_id, sku, supplier_id, qty, unit_cost, order_date, ship_date, receipt_date, port, dc |
| `open_po.csv` | po_id, sku, qty, expected_arrival, dc, ship_method, delay_flag |
| `suppliers.csv` | supplier_id, country, moq, lead_time_days, payment_terms, port |
| `chargebacks.csv` | date, channel, customer_id, dc, cause_code, amount, order_id |
| `skus.csv` | sku, product_name, brand, category, pack_size, units_per_case, shelf_life_days, supplier_id |
| `transfers.csv` | date, sku, qty, origin_dc, dest_dc, freight_cost, reason |
| `freight.csv` | origin, destination, cost_per_pallet |

If real POP data diverges from the above, the **first teammate to see real data updates this table, then commits `[DATA] schema: reconcile real column names`** BEFORE any other code is written against it.

## Commands

```bash
# one-time
uv pip install -e .                               # from repo root
pnpm --dir web/frontend install                   # after `pnpm create next-app` in block 2

# ingest raw CSVs -> parquet + duckdb
python -m data.ingest

# analytics pipeline (writes derived tables to /data/processed)
python -m analytics.pipeline

# backend (:8000)
uvicorn web.api.main:app --reload --port 8000

# frontend (:3000)
pnpm --dir web/frontend dev

# tests
pytest -q
pnpm --dir web/frontend test
```

## Core metrics (6)

1. **Demand rate (units/day)** = trailing-30-day sales qty / 30, per SKU per DC.
2. **Days of supply (DoS)** = `available` / demand_rate, per SKU per DC. Infinity if demand_rate = 0.
3. **Imbalance score** = `(max_DoS − min_DoS) / mean_DoS` across the 3 DCs per SKU. Higher = worse. Clamp to [0, 10].
4. **Transfer cost** = `freight[origin→dest].cost_per_pallet × ceil(qty / (units_per_case × 40))` (40 cases/pallet).
5. **Chargeback risk score** = `P(stockout in next lead_time) × historical_mean_chargeback(customer, channel, DC)`. P(stockout) from trailing demand + open-PO arrivals.
6. **OTIF risk** = `1 − P(on_time) × P(in_full)`; P's estimated from historical fulfillment at similar DoS bands.

## Feature → judging criterion map

| Feature | Primary | Secondary |
|---|---|---|
| 3-DC imbalance table (dashboard home) | Technology | Design |
| Transfer-vs-wait card with explicit $ tradeoff | Business | Presentation |
| Chargeback heatmap (cause × channel × DC) | Design | Business |
| Days-to-stockout projection per SKU/DC | Technology | Business |
| Before/after scenario walkthrough | Presentation | Business |
| Proactive ranked alert queue | Design | Technology |
| "Save $X annually" projection banner | Inspiration | Business |
| SKU drill-down with PO timeline | Technology | Design |

Anything not mapping to at least one criterion: **cut it.**

## Conventions

- Python snake_case, React PascalCase, route paths kebab-case.
- Commits: `[DATA|LOGIC|FRONTEND|DEMO|META] <area>: <imperative>` — e.g. `[LOGIC] transfer: fix DoS infinity edge case`.
- Trunk-based on `main`. Commit after every green block. No long-lived branches.
- `.gitignore`: `/data/raw/**`, `.venv/`, `node_modules/`, `.next/`, `/data/processed/*.parquet`, `/data/processed/pop.duckdb`.
- **Committed**: `/data/seed/*.csv` (20 rows each, synthetic) so CI and cold starts work.
- No secrets, no `.env` (not needed for this scope).

## Do not re-derive (locked assumptions)

1. DCs are **`DC_EAST` / `DC_WEST` / `DC_CENTRAL`** in all code and UI. Map source labels in `data/ingest.py`; do not re-infer.
2. Cause codes: **`SHORT_SHIP`, `LATE_DELIVERY`, `DAMAGE`, `MISSED_WINDOW`, `TPR`**. **Filter out `TPR`** from chargeback risk — it's planned promo, not a penalty.
3. **Demand rate = trailing 30 days.** Do not A/B 7/60/90 windows. Locked for demo consistency.
4. Thresholds: `critical < 14` DoS, `warning < 30` DoS, `target = 90` DoS.
5. **40 cases per pallet** unless the SKU master row overrides. Do not model partial-pallet LTL.
6. **Inter-DC transit = 3 days** (flat). Do not model transit variance.
7. Chargeback exposure banner is annualized from historical mean; do not add forecast adjustments.
8. Demo SKU is selected at the end of Day 1 Block 8 from loaded data; once chosen, **never change**.
9. The company in all copy is "Prince of Peace" or "POP" — do not abbreviate as "PoP" (docx used both; we pick "POP").
10. **Before/after baseline** = the current manual process (per POP PDF: reactive, post-audit 8–12 months lag). Do not invent alternative baselines.
