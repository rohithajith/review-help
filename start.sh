#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# start.sh - One-click startup for Review App on GCP
# =============================================================================
# This script starts both backend and frontend servers.
# Run this after starting your GCP instance.
#
# Usage:
#   ./start.sh
#
# What it does:
#   1. Loads environment from backend/.env
#   2. Starts the backend API server (default port 4000)
#   3. Starts the React dev server (default port 3004)
#   4. Opens admin and template pages in browser (if available)
# =============================================================================

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
CLIENT="$ROOT/client"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Startup tuning (can be overridden via env)
STARTUP_SLEEP_SECONDS="${STARTUP_SLEEP_SECONDS:-2}"
BACKEND_READY_RETRIES="${BACKEND_READY_RETRIES:-45}"
FRONTEND_READY_RETRIES="${FRONTEND_READY_RETRIES:-120}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Review App - Starting Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Error: Node.js is required but not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node --version)"

# Load environment from backend/.env
if [ -f "$BACKEND/.env" ]; then
    echo -e "${GREEN}✓${NC} Loading environment from backend/.env"
    set -a
    source "$BACKEND/.env"
    set +a
else
    echo -e "${YELLOW}Warning: No backend/.env file found${NC}"
fi

# Install dependencies if needed
if [ ! -d "$BACKEND/node_modules" ]; then
    echo "Installing backend dependencies..."
    npm --prefix "$BACKEND" install
fi
echo -e "${GREEN}✓${NC} Backend dependencies ready"

if [ ! -d "$CLIENT/node_modules" ]; then
    echo "Installing client dependencies..."
    npm --prefix "$CLIENT" install
fi
echo -e "${GREEN}✓${NC} Client dependencies ready"

# Kill any existing processes on our ports
echo ""
echo "Checking for existing processes..."
pkill -f "node.*backend.*index.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
sleep 2

# Start backend
echo ""
# Ensure backend uses PORT from backend/.env, default to 4000
BACKEND_PORT=${PORT:-4000}
# If desired backend port is busy, choose next free port
for p in $(seq $BACKEND_PORT $((BACKEND_PORT + 10))); do
    if lsof -iTCP:${p} -sTCP:LISTEN >/dev/null 2>&1; then
        echo "Backend port ${p} is in use, trying next..."
        continue
    else
        BACKEND_PORT=${p}
        break
    fi
done
echo -e "${BLUE}Starting backend server on port ${BACKEND_PORT}...${NC}"
cd "$BACKEND"
PORT=${BACKEND_PORT} nohup node index.js > /tmp/review-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/review-backend.pid
echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"
sleep "$STARTUP_SLEEP_SECONDS"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for ((i=1; i<=BACKEND_READY_RETRIES; i++)); do
    if curl -s "http://localhost:${BACKEND_PORT}/" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend is ready"
        break
    fi
    sleep 1
    if [ $i -eq "$BACKEND_READY_RETRIES" ]; then
        echo -e "${YELLOW}Warning: Backend may not be fully ready${NC}"
    fi
done

# Start frontend
echo ""
echo -e "${BLUE}Starting frontend server...${NC}"
cd "$CLIENT"
# Choose frontend port; prefer 3004 but fall back if in use
FRONTEND_PORT=${FRONTEND_PORT:-3004}
for p in $(seq $FRONTEND_PORT $((FRONTEND_PORT + 10))); do
    if lsof -iTCP:${p} -sTCP:LISTEN >/dev/null 2>&1; then
        echo "Port ${p} is in use, trying next..."
        continue
    else
        FRONTEND_PORT=${p}
        break
    fi
done
echo -e "${BLUE}Using frontend port ${FRONTEND_PORT}${NC}"
PORT=${FRONTEND_PORT} REACT_APP_API_URL="http://localhost:${BACKEND_PORT}/api" BROWSER=none nohup npm start > /tmp/review-client.log 2>&1 &
CLIENT_PID=$!
echo $CLIENT_PID > /tmp/review-client.pid
echo -e "${GREEN}✓${NC} Frontend starting (PID: $CLIENT_PID)"
sleep "$STARTUP_SLEEP_SECONDS"

# Wait for frontend to be ready
echo "Waiting for frontend to be ready (this may take 30-60 seconds)..."
# Wait for frontend to be ready on the chosen port
for ((i=1; i<=FRONTEND_READY_RETRIES; i++)); do
    if curl -s "http://localhost:${FRONTEND_PORT}/" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend is ready"
        break
    fi
    sleep 1
    if [ $i -eq "$FRONTEND_READY_RETRIES" ]; then
        echo -e "${YELLOW}Warning: Frontend may still be compiling. Check /tmp/review-client.log${NC}"
    fi
done

# Print summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   Review App is running!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "  ${GREEN}Frontend Login:${NC} http://localhost:${FRONTEND_PORT}/#/login"
echo -e "  ${GREEN}Admin:${NC}         http://localhost:${FRONTEND_PORT}/#/admin"
echo -e "  ${GREEN}Backend API:${NC}   http://localhost:${BACKEND_PORT}/api"
echo ""
echo -e "  ${YELLOW}Logs:${NC}"
echo "    Backend:  tail -f /tmp/review-backend.log"
echo "    Frontend: tail -f /tmp/review-client.log"
echo ""
echo -e "  ${YELLOW}To stop:${NC}"
echo "    ./stop.sh  (or kill \$(cat /tmp/review-backend.pid) \$(cat /tmp/review-client.pid))"
echo ""

# Try to open browser (works on systems with xdg-open or open)
if command -v xdg-open &> /dev/null; then
    echo "Opening browser..."
    sleep 2
    xdg-open "http://localhost:${FRONTEND_PORT}/#/login" 2>/dev/null || true
elif command -v open &> /dev/null; then
    echo "Opening browser..."
    sleep 2
    open "http://localhost:${FRONTEND_PORT}/#/login" 2>/dev/null || true
else
    echo -e "${YELLOW}Note: Open the login URL above manually in your browser${NC}"
fi

echo -e "${GREEN}Done!${NC}"
