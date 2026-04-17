# Fulminare — POP Inventory & Fulfillment (HTC 2026)

Hackathon project for Hack the Coast 2026, Prompt 3: Prince of Peace Inventory & Fulfillment Execution.

**Read [`CLAUDE.md`](./CLAUDE.md) first.** Then [`prompt.md`](./prompt.md). Everything else follows from those two.

## Quick start

```bash
uv pip install -e .
python -m data.ingest
uvicorn web.api.main:app --reload --port 8000
pnpm --dir web/frontend dev
```

## Status

See [`prompt.md`](./prompt.md) for current sprint goal and next task.

## 2-day plan

See the milestone table in the approved plan file. Hard feature-cutoff: Day 2 14:00.
