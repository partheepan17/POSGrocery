@echo off
REM Check Health - Windows Launcher
REM Checks the health status of all services

echo ========================================
echo   POS Grocery - Health Check
echo ========================================
echo.

echo Checking service health...
echo.

npm run check:full

echo.
echo Health check completed.
pause




