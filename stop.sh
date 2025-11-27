#!/usr/bin/env bash
# =============================================================================
# stop.sh - Stop all Review App services
# =============================================================================

echo "Stopping Review App services..."

# Kill backend
if [ -f /tmp/review-backend.pid ]; then
    kill $(cat /tmp/review-backend.pid) 2>/dev/null && echo "✓ Backend stopped" || echo "Backend was not running"
    rm -f /tmp/review-backend.pid
fi

# Kill frontend
if [ -f /tmp/review-client.pid ]; then
    kill $(cat /tmp/review-client.pid) 2>/dev/null && echo "✓ Frontend stopped" || echo "Frontend was not running"
    rm -f /tmp/review-client.pid
fi

# Also kill any remaining processes
pkill -f "node.*backend.*index.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

echo "Done!"
