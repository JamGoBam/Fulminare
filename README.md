# Fulminare

**Inventory & fulfillment intelligence for Prince of Peace — Hack the Coast 2026**

POP distributes ~800 active SKUs across 3 U.S. distribution centers serving 100,000+ retail outlets. Company-level inventory can look healthy while one DC holds all the stock and the others are empty — triggering split shipments, short-ship chargebacks, and late-delivery penalties. A single $100 order can generate $300+ in combined penalties. Annual chargeback exposure: ~$700K.

Fulminare detects site-level imbalance early, recommends transfer-vs-wait with an explicit dollar tradeoff, surfaces chargeback root cause, and gives ops managers a clear before/after against today's manual process.

---

## Quick start

```bash
# Install dependencies (one-time)
uv pip install -e .
pnpm --dir web/frontend install

# Start everything
bash scripts/start.sh

# Open the dashboard
open http://localhost:3000
```

Backend runs on `:8000`, frontend on `:3000`.

> **Chatbot (optional):** requires [Ollama](https://ollama.com) running locally.
> ```bash
> ollama serve &
> ollama pull qwen2.5:7b-instruct
> ```

---

## Stack

| Layer | Tech |
|---|---|
| Data & analytics | Python 3.11, pandas, DuckDB |
| API | FastAPI, uvicorn, pydantic v2 |
| Frontend | Next.js 16, TypeScript, Tailwind, shadcn/ui, Recharts |
| Server state | TanStack Query |
| AI assistant | Ollama (`qwen2.5:7b-instruct`) — fully local, no API key |
| Tooling | uv, pnpm, ruff |

---

## Project structure

```
/data          Ingestion, seed CSVs, parquet outputs, DuckDB
/analytics     Metrics, imbalance scoring, transfer engine, chargeback analysis
/web/api       FastAPI routes — inventory, chargebacks, recommendations, chat
/web/frontend  Next.js app — dashboard, /inventory, /chargebacks, /sku/[sku]
/tests         pytest suite
/scripts       start.sh, handoff.sh
/demo          Walkthrough script, rehearsal notes, deck
```

---

## Key features

- **3-DC imbalance table** — days of supply per SKU per DC, flagged by severity
- **Transfer-vs-wait card** — side-by-side cost comparison with confidence score
- **Chargeback heatmap** — cause × channel × DC breakdown
- **Days-to-stockout projection** — per SKU/DC with open-PO arrivals factored in
- **Ranked alert queue** — proactive actions sorted by penalty exposure
- **AI assistant** — local chatbot with tool access to all analytics

---

## Tests

```bash
pytest -q
```
