#!/bin/bash

echo "Clearing POS Database (Preserving Users and Login Data)"
echo "====================================================="

cd "$(dirname "$0")/.."

echo ""
echo "This will clear all data except:"
echo "- User accounts and login data"
echo "- App settings"
echo "- Categories and Suppliers"
echo "- Default system data"
echo ""

read -p "Are you sure you want to continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo ""
echo "Clearing database..."
npx ts-node scripts/clear-database.ts

echo ""
echo "Database clear completed!"


