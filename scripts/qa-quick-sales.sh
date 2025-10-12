#!/bin/bash

# Quick Sales QA Script - Confidence Without QA Cycle
# Run this script to verify all Quick Sales functionality

echo "🎯 Quick Sales QA - Confidence Without QA Cycle"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Run the comprehensive QA test
echo "Running comprehensive Quick Sales tests..."
echo ""

npx tsx scripts/qa-quick-sales-final.ts

echo ""
echo "✅ QA Test Complete!"
echo "   Run this script anytime to verify Quick Sales functionality"
echo "   All acceptance criteria are automatically validated"


