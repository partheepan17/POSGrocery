@echo off
echo Starting POS Grocery System...
echo.

REM Kill any existing Node.js processes
echo Cleaning up existing processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

REM Start backend server
echo Starting backend server...
cd server
start "Backend Server" cmd /k "npm run dev:fast"
cd ..

REM Wait for backend to start
echo Waiting for backend to initialize...
timeout /t 5 >nul

REM Test backend connection
echo Testing backend connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8250/api/health' -Method GET -TimeoutSec 5; Write-Host 'Backend is running!' } catch { Write-Host 'Backend not ready yet...' }"

REM Start frontend
echo Starting frontend...
set VITE_API_BASE_URL=http://localhost:8250
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers should be starting...
echo Backend: http://localhost:8250
echo Frontend: http://localhost:8103 (or next available port)
echo.
echo Press any key to exit...
pause >nul


