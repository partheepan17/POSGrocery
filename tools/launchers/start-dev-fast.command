#!/bin/bash
# Start Dev (Fast) - macOS/Linux Launcher
# Starts both frontend and backend in fast development mode

echo "========================================"
echo "  POS Grocery - Start Dev (Fast)"
echo "========================================"
echo

echo "Starting fast development environment..."
echo "- Frontend: http://localhost:5173"
echo "- Backend:  http://localhost:8250"
echo "- Fast mode: Skips migrations and hardware checks"
echo

npm run dev:all:fast




