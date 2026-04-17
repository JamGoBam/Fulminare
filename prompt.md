# prompt.md — Session Handoff (updated every session)

## CURRENT SPRINT GOAL
Demo ready — heatmap color-coded, all checks green.

## LAST SESSION SUMMARY
- Fixed chargeback heatmap: replaced dynamic Tailwind opacity classes (invisible at runtime) with inline `style` using `rgba(220,38,38, alpha)` — cells now show red gradient proportional to dollar value
- Highest cell (MISSED_WINDOW / DC_WEST $1.8M) is dark red with white text; blank cells are white
- `pytest -q` 29/29 ✓, no console errors, home page unaffected — commit `TBD`

## NEXT TASK
**Demo is shippable.** No code changes required.

Final pre-presentation checklist for the presenter (human):
1. Open PowerShell/CMD, run:
   ```
   .venv\Scripts\python.exe -m data.ingest
   .venv\Scripts\uvicorn.exe web.api.main:app --port 8000 --reload
   pnpm --dir web/frontend dev
   ```
2. Open `http://localhost:3000` in a browser, verify the green banner shows `$13,680 / year`
3. Walk `demo/scenario.md` one final time — target ≤8 min

If anything looks wrong, check:
- API port 8000 is running (`curl http://localhost:8000/healthz`)
- Frontend fetches from `http://localhost:8000` (hardcoded in components)

## FILES IN PLAY
- None — demo is ready

## LOCKED / DO NOT TOUCH
- Everything

## BLOCKERS
- None

## QUICK-RESUME PROMPT (paste as first message)
```
Read CLAUDE.md and prompt.md. Then implement NEXT TASK exactly as specified. Follow the Context budget & handoff protocol from CLAUDE.md.
```
