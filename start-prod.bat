@echo off
echo ========================================
echo   🏭 Starting POS Production Server
echo ========================================
echo.
echo Building and starting production servers...
echo Server: http://localhost:8250
echo Frontend: http://localhost:8080
echo.
echo Press Ctrl+C to stop both services
echo.

REM Check if .env exists
if not exist "server\.env" (
    echo ⚠️  Creating server environment file...
    copy "server\env.example" "server\.env"
)

REM Build and start production servers
npm run build:all
npm run start:all:prod

pause




