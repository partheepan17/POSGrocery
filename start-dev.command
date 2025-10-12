#!/bin/bash

echo "========================================"
echo "  🚀 Starting POS Development Server"
echo "========================================"
echo ""
echo "Starting both server and frontend..."
echo "Server: http://localhost:8250"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Creating server environment file..."
    cp "server/env.example" "server/.env"
fi

# Start development servers
npm run dev:all




