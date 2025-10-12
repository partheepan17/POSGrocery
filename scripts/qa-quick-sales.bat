@echo off
REM Quick Sales QA Script - Confidence Without QA Cycle
REM Run this script to verify all Quick Sales functionality

echo 🎯 Quick Sales QA - Confidence Without QA Cycle
echo ================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the project root directory
    exit /b 1
)

REM Run the comprehensive QA test
echo Running comprehensive Quick Sales tests...
echo.

npx tsx scripts/qa-quick-sales-final.ts

echo.
echo ✅ QA Test Complete!
echo    Run this script anytime to verify Quick Sales functionality
echo    All acceptance criteria are automatically validated


