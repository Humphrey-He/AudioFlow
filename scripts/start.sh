#!/bin/bash

# AudioFlow Start Script
# Usage: ./scripts/start.sh [frontend|backend|all]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

function start_frontend() {
    echo "Starting AudioFlow Frontend (Vite)..."
    cd "$PROJECT_ROOT/src/AudioFlow.Client"
    npm run dev
}

function start_backend() {
    echo "Starting AudioFlow Backend (ASP.NET)..."
    cd "$PROJECT_ROOT/src/AudioFlow.Server"
    dotnet run
}

case "${1:-all}" in
    frontend)
        start_frontend
        ;;
    backend)
        start_backend
        ;;
    all)
        echo "Starting AudioFlow (Frontend + Backend)..."
        echo "This will run both in background..."

        # Start backend in background
        (cd "$PROJECT_ROOT/src/AudioFlow.Server" && dotnet run) &
        BACKEND_PID=$!

        # Wait a moment for backend to start
        sleep 3

        # Start frontend
        cd "$PROJECT_ROOT/src/AudioFlow.Client" && npm run dev

        # Cleanup on exit
        trap "kill $BACKEND_PID 2>/dev/null" EXIT
        ;;
    *)
        echo "Usage: $0 [frontend|backend|all]"
        echo "  frontend - Start only the Vite dev server (port 3000)"
        echo "  backend  - Start only the ASP.NET backend (port 5000)"
        echo "  all      - Start both frontend and backend (default)"
        exit 1
        ;;
esac
