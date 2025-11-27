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
#   2. Starts the backend API server (port 3001)
#   3. Starts the React dev server (port 3000)
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
echo -e "${BLUE}Starting backend server on port ${PORT:-3001}...${NC}"
cd "$BACKEND"
nohup node index.js > /tmp/review-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/review-backend.pid
echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s "http://localhost:${PORT:-3001}/" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend is ready"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}Warning: Backend may not be fully ready${NC}"
    fi
done

# Start frontend
echo ""
echo -e "${BLUE}Starting frontend server on port 3000...${NC}"
cd "$CLIENT"
PORT=3000 BROWSER=none nohup npm start > /tmp/review-client.log 2>&1 &
CLIENT_PID=$!
echo $CLIENT_PID > /tmp/review-client.pid
echo -e "${GREEN}✓${NC} Frontend starting (PID: $CLIENT_PID)"

# Wait for frontend to be ready
echo "Waiting for frontend to be ready (this may take 30-60 seconds)..."
for i in {1..90}; do
    if curl -s "http://localhost:3000/" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend is ready"
        break
    fi
    sleep 1
    if [ $i -eq 90 ]; then
        echo -e "${YELLOW}Warning: Frontend may still be compiling. Check /tmp/review-client.log${NC}"
    fi
done

# Print summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   Review App is running!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "  ${GREEN}Frontend:${NC}     http://localhost:3000/"
echo -e "  ${GREEN}Admin:${NC}        http://localhost:3000/#/admin"
echo -e "  ${GREEN}Backend API:${NC}  http://localhost:${PORT:-3001}/api"
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
    xdg-open "http://localhost:3000/#/admin" 2>/dev/null || true
    xdg-open "http://localhost:3000/" 2>/dev/null || true
elif command -v open &> /dev/null; then
    echo "Opening browser..."
    sleep 2
    open "http://localhost:3000/#/admin" 2>/dev/null || true
    open "http://localhost:3000/" 2>/dev/null || true
else
    echo -e "${YELLOW}Note: Open the URLs above manually in your browser${NC}"
fi

echo -e "${GREEN}Done!${NC}"
