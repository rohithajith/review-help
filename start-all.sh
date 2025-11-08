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
DOCKER_COMPOSE_FILE="$ROOT/docker-compose.yml"
DC_CMD=""
POSTGRES_HOST=localhost
POSTGRES_PORT=${POSTGRES_PORT:-5433}
POSTGRES_USER=${POSTGRES_USER:-appuser}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-password}
POSTGRES_DB=${POSTGRES_DB:-admin_db}
# allow overriding via env; default maps to host:5433 to avoid local Postgres conflicts
ADMIN_DATABASE_URL="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
# Client API base used by the React app (create-react-app reads REACT_APP_* at compile time)
# Default to backend API path; can be overridden by setting REACT_APP_API_URL in the environment
REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:5002/api}
# Control whether tenant seeding runs when starting locally (defaults to true for dev)
SEED_TENANTS=${SEED_TENANTS:-true}


ensure_deps() {
  dir=$1
  if [ ! -d "$dir/node_modules" ]; then
    echo "Installing npm deps in $dir..."
    npm --prefix "$dir" install
  else
    echo "Deps already installed in $dir (skipping)"
  fi
}

start_docker() {
  # prefer docker-compose (legacy) but support `docker compose`
  if command -v docker-compose >/dev/null 2>&1; then
    DC_CMD="docker-compose"
  elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DC_CMD="docker compose"
  else
    echo "docker-compose or docker compose is required to start Postgres. Skipping docker startup."
    return 1
  fi

  if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo "No docker-compose.yml found at $DOCKER_COMPOSE_FILE; skipping docker start"
    return 1
  fi

  echo "Starting docker services (via $DC_CMD) -> docker logs available via $DC_CMD logs"
  $DC_CMD -f "$DOCKER_COMPOSE_FILE" up -d

  # wait for postgres health: check docker-compose ps output for "healthy" or fallback to port check
  echo "Waiting for Postgres to become healthy on $POSTGRES_HOST:$POSTGRES_PORT ..."
  for i in $(seq 1 60); do
    # try docker compose ps healthy indicator
    if $DC_CMD -f "$DOCKER_COMPOSE_FILE" ps | grep -i postgres >/dev/null 2>&1; then
      if $DC_CMD -f "$DOCKER_COMPOSE_FILE" ps | grep -i postgres | grep -i healthy >/dev/null 2>&1; then
        echo "Postgres container is healthy"
        break
      fi
    fi

    # fallback: check port
    if nc -z "$POSTGRES_HOST" "$POSTGRES_PORT" >/dev/null 2>&1; then
      echo "Postgres TCP port $POSTGRES_PORT is open"
      break
    fi

    sleep 1
    if [ $i -eq 60 ]; then
      echo "Timeout waiting for Postgres to become ready"
      return 2
    fi
  done

  echo "Postgres ready"
  return 0
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

# Start docker/postgres (if docker present)
if start_docker; then
  echo "Exporting ADMIN_DATABASE_URL for backend: $ADMIN_DATABASE_URL"
  export ADMIN_DATABASE_URL
else
  echo "Docker/Postgres startup skipped or failed; ensure ADMIN_DATABASE_URL is set in your environment if you rely on Postgres-backed features"
fi

if is_listening $BACKEND_PORT; then
  echo "Backend already listening on port $BACKEND_PORT (skipping start)"
else
  echo "Starting backend (ADMIN_DATABASE_URL=$ADMIN_DATABASE_URL node $BACKEND/index.js) -> $BACKEND_LOG"
  nohup env ADMIN_DATABASE_URL="$ADMIN_DATABASE_URL" node "$BACKEND/index.js" >"$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
fi

wait_for_url "http://localhost:$BACKEND_PORT/" 30

echo "Seeding DB (will skip if already seeded)"
if command -v node >/dev/null 2>&1; then
  node "$BACKEND/seedTemplates.js" || true
else
  echo "node not found; please seed manually: node $BACKEND/seedTemplates.js"
fi

# Seed tenant Postgres databases (idempotent). This will create/migrate tenant
# DBs and seed templates if the script exists. It's safe to run even if already
# seeded.
if command -v node >/dev/null 2>&1; then
  if [ "$SEED_TENANTS" = "true" ]; then
    if [ -f "$ROOT/scripts/seedTenantTemplates.js" ]; then
      echo "Seeding tenant templates (Postgres)"
      # run but don't fail the whole script if it errors
      node "$ROOT/scripts/seedTenantTemplates.js" || true
    else
      echo "No tenant seeder script found at $ROOT/scripts/seedTenantTemplates.js (skipping)"
    fi
  else
    echo "SEED_TENANTS is not true; skipping tenant seeding (set SEED_TENANTS=true to enable)"
  fi
else
  echo "node not found; to seed tenant DBs run: node $ROOT/scripts/seedTenantTemplates.js"
fi

echo "\n=== Client setup ==="
ensure_deps "$CLIENT"

if is_listening $CLIENT_PORT; then
  echo "Client already listening on port $CLIENT_PORT (skipping start)"
else
  echo "Starting react dev server (PORT=$CLIENT_PORT) -> $CLIENT_LOG"
  REACT_APP_API_URL="$REACT_APP_API_URL" PORT=$CLIENT_PORT BROWSER=none npm --prefix "$CLIENT" start >"$CLIENT_LOG" 2>&1 &
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
