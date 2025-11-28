#!/usr/bin/env bash
# =============================================================================
# stop.sh - Stop all Review App services
# =============================================================================

echo "Stopping Review App services..."

# Kill backend
if [ -f /tmp/review-backend.pid ]; then
    kill -9 $(cat /tmp/review-backend.pid) 2>/dev/null && echo "✓ Backend stopped (PID file)" || true
    rm -f /tmp/review-backend.pid
fi

# Kill frontend
if [ -f /tmp/review-client.pid ]; then
    kill -9 $(cat /tmp/review-client.pid) 2>/dev/null && echo "✓ Frontend stopped (PID file)" || true
    rm -f /tmp/review-client.pid
fi

# Force kill any remaining node processes related to this project
pkill -9 -f "node.*index.js" 2>/dev/null && echo "✓ Killed backend processes" || true
pkill -9 -f "react-scripts" 2>/dev/null && echo "✓ Killed react-scripts processes" || true
pkill -9 -f "node.*review" 2>/dev/null || true

# Give processes time to die
sleep 1

# Verify ports are free (works on both Linux and macOS)
check_port() {
    if command -v lsof &> /dev/null; then
        lsof -i :$1 2>/dev/null | grep LISTEN
    elif command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep ":$1"
    fi
}

PORTS_IN_USE=false
if check_port 3000 &>/dev/null || check_port 3001 &>/dev/null; then
    echo "⚠ Warning: Ports may still be in use"
    check_port 3000 2>/dev/null || true
    check_port 3001 2>/dev/null || true
    PORTS_IN_USE=true
fi

if [ "$PORTS_IN_USE" = false ]; then
    echo "✓ Ports 3000 and 3001 are free"
fi

echo "Done!"
