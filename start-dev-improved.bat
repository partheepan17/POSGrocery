@echo off
echo Starting POS Grocery System (Improved)...
echo.

REM Kill any existing Node.js processes
echo Cleaning up existing processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 3 >nul

REM Check if ports are available
echo Checking port availability...
netstat -an | find "8250" >nul
if %errorlevel% == 0 (
    echo Port 8250 is still in use. Waiting...
    timeout /t 5 >nul
)

netstat -an | find "8103" >nul
if %errorlevel% == 0 (
    echo Port 8103 is still in use. Waiting...
    timeout /t 5 >nul
)

REM Start backend server
echo Starting backend server...
cd server
start "Backend Server" cmd /k "npm run dev:fast"
cd ..

REM Wait for backend to start
echo Waiting for backend to initialize...
timeout /t 8 >nul

REM Test backend connection with retries
echo Testing backend connection...
set retry=0
:test_backend
set /a retry+=1
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8250/api/health' -Method GET -TimeoutSec 10; Write-Host 'Backend is running!' } catch { Write-Host 'Backend not ready yet... (attempt %retry%)' }"
if %retry% lss 3 (
    timeout /t 3 >nul
    goto test_backend
)

REM Start frontend
echo Starting frontend...
set VITE_API_BASE_URL=http://localhost:8250
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers should be starting...
echo Backend: http://localhost:8250
echo Frontend: http://localhost:8103 (or next available port)
echo.
echo If you see HMR errors, they should be resolved with the new configuration.
echo.
echo Press any key to exit...
pause >nul
