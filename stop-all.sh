#!/usr/bin/env zsh
set -euo pipefail

# stop-all.sh
# Stops services started by start-all.sh:
# - kills PIDs recorded in /tmp/review-backend.pid and /tmp/review-client.pid (if present)
# - attempts to kill any process listening on ports 5002 and 3002
# - removes pid files

PID_BACKEND=/tmp/review-backend.pid
PID_CLIENT=/tmp/review-client.pid
BACKEND_PORT=5002
CLIENT_PORT=3002

echo "Stopping Review App services..."

kill_pidfile() {
  local pidfile=$1
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile" 2>/dev/null || echo "")
    if [ -n "$pid" ]; then
      if kill -0 "$pid" >/dev/null 2>&1; then
        echo "Killing PID $pid from $pidfile..."
        kill "$pid" && echo "Killed $pid"
      else
        echo "Process $pid (from $pidfile) not running"
      fi
    fi
    rm -f "$pidfile"
  else
    echo "No pidfile: $pidfile"
  fi
}

kill_by_port() {
  local port=$1
  pids=$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Killing processes listening on port $port: $pids"
    kill $pids || true
  else
    echo "No processes listening on port $port"
  fi
}

kill_pidfile "$PID_BACKEND" || true
kill_pidfile "$PID_CLIENT" || true

kill_by_port "$BACKEND_PORT" || true
kill_by_port "$CLIENT_PORT" || true

echo "Stopped. If any processes remain, check /tmp/review-backend.log and /tmp/review-client.log for details."

echo "You can also inspect listening processes with:"
echo "  lsof -nP -iTCP -sTCP:LISTEN | egrep '$BACKEND_PORT|$CLIENT_PORT'"
