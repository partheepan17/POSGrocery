@echo off
echo ========================================
echo   🚀 Starting POS Development Server
echo ========================================
echo.
echo Starting both server and frontend...
echo Server: http://localhost:8250
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop both services
echo.

REM Check if .env exists
if not exist "server\.env" (
    echo ⚠️  Creating server environment file...
    copy "server\env.example" "server\.env"
)

REM Start development servers
npm run dev:all

pause




