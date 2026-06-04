#!/bin/bash
# PK1 local dev starter — run from the repo root: ./start.sh
ROOT="$(cd "$(dirname "$0")" && pwd)"
TSX="$ROOT/node_modules/.bin/tsx"
VITE="$ROOT/node_modules/.bin/vite"

# Load env vars from backend .env (strip quotes and comments)
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  value="${value%%#*}"    # strip inline comments
  value="${value%"${value##*[![:space:]]}"}"  # trim trailing whitespace
  export "$key=$value"
done < "$ROOT/packages/backend/.env"

echo "=== PK1 Dev Servers ==="
echo "  Backend  → http://localhost:3001"
echo "  Frontend → http://localhost:5173"
echo "Press Ctrl+C to stop both."
echo ""

"$TSX" "$ROOT/packages/backend/src/index.ts" &
BE_PID=$!

"$VITE" "$ROOT/packages/frontend" &
FE_PID=$!

trap "kill $BE_PID $FE_PID 2>/dev/null; exit 0" INT TERM
wait
