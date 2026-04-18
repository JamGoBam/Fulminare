#!/usr/bin/env bash
# Cold-start: ingest (if needed), spin up API + frontend, print ready URL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f "data/processed/inventory.parquet" ]; then
  echo "→ Parquets missing — ingesting seed data..."
  PYTHONPATH="$ROOT" python3 -m data.ingest --seed
fi

echo "→ Starting API on :8000..."
PYTHONPATH="$ROOT" uvicorn web.api.main:app --port 8000 &
API_PID=$!

echo "→ Starting frontend on :3000..."
npx -y pnpm --dir web/frontend dev &
FE_PID=$!

# Wait until API is accepting connections (max 15s)
for i in $(seq 1 15); do
  curl -sf http://localhost:8000/healthz > /dev/null 2>&1 && break
  sleep 1
done

echo ""
echo "✓ POP dashboard ready: http://localhost:3000"
echo "  API:      http://localhost:8000/docs"
echo "  Stop:     kill $API_PID $FE_PID"
