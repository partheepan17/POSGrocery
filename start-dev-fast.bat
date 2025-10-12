@echo off
echo ========================================
echo   ⚡ Starting POS Development (Fast)
echo ========================================
echo.
echo Starting both server and frontend in fast mode...
echo Server: http://localhost:8250
echo Frontend: http://localhost:5173
echo.
echo Fast mode features:
echo - Skips migrations
echo - Reduced logging
echo - Optimized database settings
echo.
echo Press Ctrl+C to stop both services
echo.

REM Check if .env exists
if not exist "server\.env" (
    echo ⚠️  Creating server environment file...
    copy "server\env.example" "server\.env"
)

REM Start development servers in fast mode
npm run dev:all:fast

pause




