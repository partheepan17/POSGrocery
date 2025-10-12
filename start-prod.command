#!/bin/bash

echo "========================================"
echo "  🏭 Starting POS Production Server"
echo "========================================"
echo ""
echo "Building and starting production servers..."
echo "Server: http://localhost:8250"
echo "Frontend: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Creating server environment file..."
    cp "server/env.example" "server/.env"
fi

# Build and start production servers
npm run build:all
npm run start:all:prod




