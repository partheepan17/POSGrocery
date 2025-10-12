@echo off
echo ========================================
echo   🧪 Testing POS Launchers
echo ========================================
echo.

echo Testing health check...
call npm run check:health
echo.

echo Testing setup script...
echo (This will install dependencies and build)
call npm run setup
echo.

echo Testing fast dev mode...
echo (Starting servers in background for 10 seconds)
start /B npm run dev:all:fast
timeout 10
call npm run check:all
echo.

echo Testing production build...
call npm run build:all
echo.

echo ✅ All launcher tests completed!
echo.
pause




