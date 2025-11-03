#!/usr/bin/env zsh
set -euo pipefail

# start-all.sh
# Installs deps (if missing), starts backend and client, seeds DB, waits for readiness,
# and opens the frontend and admin pages in the browser (macOS `open`).

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
CLIENT="$ROOT/client"
BACKEND_PORT=5002
CLIENT_PORT=3002
BACKEND_LOG="/tmp/review-backend.log"
CLIENT_LOG="/tmp/review-client.log"
BACKEND_PID_FILE="/tmp/review-backend.pid"
CLIENT_PID_FILE="/tmp/review-client.pid"

ensure_deps() {
  dir=$1
  if [ ! -d "$dir/node_modules" ]; then
    echo "Installing npm deps in $dir..."
    npm --prefix "$dir" install
  else
    echo "Deps already installed in $dir (skipping)"
  fi
}

is_listening() {
  port=$1
  lsof -nP -iTCP -sTCP:LISTEN | grep -q ":$port " || return 1
}

wait_for_url() {
  url=$1
  timeout=${2:-30}
  echo "Waiting for $url (timeout ${timeout}s) ..."
  for i in $(seq 1 $timeout); do
    if curl -sS "$url" >/dev/null 2>&1; then
      echo "OK: $url is responding"
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $url"
  return 1
}

echo "Root: $ROOT"

echo "\n=== Backend setup ==="
ensure_deps "$BACKEND"

if is_listening $BACKEND_PORT; then
  echo "Backend already listening on port $BACKEND_PORT (skipping start)"
else
  echo "Starting backend (node $BACKEND/index.js) -> $BACKEND_LOG"
  nohup node "$BACKEND/index.js" >"$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
fi

wait_for_url "http://localhost:$BACKEND_PORT/" 30

echo "Seeding DB (will skip if already seeded)"
if command -v node >/dev/null 2>&1; then
  node "$BACKEND/seedTemplates.js" || true
else
  echo "node not found; please seed manually: node $BACKEND/seedTemplates.js"
fi

echo "\n=== Client setup ==="
ensure_deps "$CLIENT"

if is_listening $CLIENT_PORT; then
  echo "Client already listening on port $CLIENT_PORT (skipping start)"
else
  echo "Starting react dev server (PORT=$CLIENT_PORT) -> $CLIENT_LOG"
  PORT=$CLIENT_PORT BROWSER=none npm --prefix "$CLIENT" start >"$CLIENT_LOG" 2>&1 &
  echo $! > "$CLIENT_PID_FILE"
fi

wait_for_url "http://localhost:$CLIENT_PORT/" 60

echo "Opening frontend and admin pages in default browser..."
open "http://localhost:$CLIENT_PORT/"
open "http://localhost:$CLIENT_PORT/admin"

echo "\nStarted."
if [ -f "$BACKEND_PID_FILE" ]; then
  echo "Backend PID: $(cat $BACKEND_PID_FILE)  (log: $BACKEND_LOG)"
fi
if [ -f "$CLIENT_PID_FILE" ]; then
  echo "Client PID: $(cat $CLIENT_PID_FILE)  (log: $CLIENT_LOG)"
fi

echo "To stop the processes you can run (if you started them with this script):"
echo "  kill \\$(cat $BACKEND_PID_FILE) \\$(cat $CLIENT_PID_FILE) || true"

echo "Logs: $BACKEND_LOG and $CLIENT_LOG"
