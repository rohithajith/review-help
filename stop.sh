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
pkill -9 -f "node.*review-help" 2>/dev/null || true

# Give processes time to die
sleep 1

# Verify ports are free
if netstat -tlnp 2>/dev/null | grep -qE ':3000|:3001'; then
    echo "⚠ Warning: Ports may still be in use"
    netstat -tlnp 2>/dev/null | grep -E ':3000|:3001'
else
    echo "✓ Ports 3000 and 3001 are free"
fi

echo "Done!"
