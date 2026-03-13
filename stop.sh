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

# Verify common project ports are free (works on both Linux and macOS)
check_port() {
    if command -v lsof &> /dev/null; then
        lsof -i :$1 2>/dev/null | grep LISTEN
    elif command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep ":$1"
    fi
}

PORTS_IN_USE=false
PORTS_TO_CHECK="3000 3001 3004 4000 4001 4002 4003 4004 4005"
for p in $PORTS_TO_CHECK; do
    if check_port "$p" &>/dev/null; then
        PORTS_IN_USE=true
        break
    fi
done

if [ "$PORTS_IN_USE" = true ]; then
    echo "⚠ Warning: Ports may still be in use"
    for p in $PORTS_TO_CHECK; do
        check_port "$p" 2>/dev/null || true
    done
fi

if [ "$PORTS_IN_USE" = false ]; then
    echo "✓ Common project ports are free (3004/4000 and legacy ports)"
fi

echo "Done!"
