#!/usr/bin/env bash
# Quick start — runs setup if needed, then starts the server
set -e
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    bash setup.sh
fi

source venv/bin/activate
echo ""
echo "Starting AI Receptionist on http://localhost:8000"
echo "Chat UI:  http://localhost:8000/chat/ui"
echo "Health:   http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""
python -m uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload
