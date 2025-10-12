#!/bin/bash

echo "========================================"
echo "  ⚡ Starting POS Development (Fast)"
echo "========================================"
echo ""
echo "Starting both server and frontend in fast mode..."
echo "Server: http://localhost:8250"
echo "Frontend: http://localhost:5173"
echo ""
echo "Fast mode features:"
echo "- Skips migrations"
echo "- Reduced logging"
echo "- Optimized database settings"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Creating server environment file..."
    cp "server/env.example" "server/.env"
fi

# Start development servers in fast mode
npm run dev:all:fast




