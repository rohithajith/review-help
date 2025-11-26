#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# start-server.sh - Start Review App Backend for Production/GCP
# =============================================================================
# This script starts the backend server connecting to Supabase.
# No Docker required - just Node.js and the ADMIN_DATABASE_URL env var.
#
# Usage:
#   ./start-server.sh
#
# Prerequisites:
#   - Node.js 18+
#   - ADMIN_DATABASE_URL set in environment or backend/.env file
# =============================================================================

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"

echo "Review App Backend - Starting..."
echo "================================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed"
    exit 1
fi
echo "✓ Node.js $(node --version)"

# Install dependencies if needed
if [ ! -d "$BACKEND/node_modules" ]; then
    echo "Installing backend dependencies..."
    npm --prefix "$BACKEND" install --production
fi
echo "✓ Dependencies ready"

# Check for .env or ADMIN_DATABASE_URL
if [ -z "${ADMIN_DATABASE_URL:-}" ]; then
    if [ -f "$BACKEND/.env" ]; then
        echo "✓ Loading environment from backend/.env"
        export $(grep -v '^#' "$BACKEND/.env" | xargs)
    else
        echo "Warning: ADMIN_DATABASE_URL not set and no .env file found"
        echo "Create backend/.env from backend/.env.example"
    fi
else
    echo "✓ ADMIN_DATABASE_URL is set"
fi

# Start the server
echo ""
echo "Starting backend server..."
cd "$BACKEND"
exec node index.js
