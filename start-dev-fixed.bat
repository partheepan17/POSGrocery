@echo off
echo Starting POS Grocery Development Environment...

echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd server && npm run dev:fast"

echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "set VITE_API_BASE_URL=http://localhost:8250 && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8250
echo Frontend: http://localhost:8103
echo.
echo Press any key to exit this window...
pause > nul