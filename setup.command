#!/bin/bash

echo "========================================"
echo "  ⚙️  Setting up POS Project"
echo "========================================"
echo ""
echo "This will:"
echo "1. Install all dependencies"
echo "2. Build the project"
echo "3. Set up environment files"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
npm --prefix server install

# Create environment files
echo "🔧 Setting up environment files..."
if [ ! -f "server/.env" ]; then
    echo "Creating server environment file..."
    cp "server/env.example" "server/.env"
fi

# Build the project
echo "🏗️  Building project..."
npm run build:all

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Double-click start-dev.command to start development"
echo "2. Or run: npm run dev:all"
echo ""


















