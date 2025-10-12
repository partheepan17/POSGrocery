@echo off
REM Startup Monitoring Script for Windows
REM Monitors startup SLA compliance and performance metrics

setlocal enabledelayedexpansion

REM Configuration
set "SERVICE_URL=http://localhost:8250"
set "STARTUP_ENDPOINT=%SERVICE_URL%/api/health/startup"
set "READY_ENDPOINT=%SERVICE_URL%/api/health/ready"
set "HEALTH_ENDPOINT=%SERVICE_URL%/api/health"
set "SLA_THRESHOLD_MS=300"
set "WARNING_THRESHOLD_MS=200"
set "CHECK_INTERVAL=5"
set "LOG_FILE=C:\temp\startup-monitor.log"

echo ========================================
echo   POS Grocery Startup Monitor
echo ========================================
echo.

REM Check if service is running
echo Checking if service is running...
curl -s "%HEALTH_ENDPOINT%" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Service is not running at %SERVICE_URL%
    exit /b 1
)
echo SUCCESS: Service is running
echo.

REM Get startup metrics
echo Getting startup metrics...
curl -s "%STARTUP_ENDPOINT%" > temp_metrics.json 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Failed to get startup metrics
    exit /b 1
)

REM Parse metrics (simplified for Windows)
echo.
echo === Startup Metrics ===
type temp_metrics.json
echo.

REM Check SLA compliance
echo === SLA Compliance Check ===
for /f "tokens=2 delims=:" %%a in ('findstr "totalStartupTime" temp_metrics.json') do (
    set "startup_time=%%a"
    set "startup_time=!startup_time: =!"
    set "startup_time=!startup_time:,=!"
    set "startup_time=!startup_time:}=!"
)

for /f "tokens=2 delims=:" %%a in ('findstr "meetsSLA" temp_metrics.json') do (
    set "meets_sla=%%a"
    set "meets_sla=!meets_sla: =!"
    set "meets_sla=!meets_sla:,=!"
    set "meets_sla=!meets_sla:}=!"
)

echo Startup Time: !startup_time!ms
echo SLA Threshold: %SLA_THRESHOLD_MS%ms
echo Meets SLA: !meets_sla!

if "!meets_sla!"=="true" (
    echo SUCCESS: Startup meets SLA requirements
) else (
    echo WARNING: Startup SLA violation detected
)

echo.

REM Check readiness
echo === Readiness Check ===
curl -s -o nul -w "%%{http_code}" "%READY_ENDPOINT%" > temp_status.txt 2>nul
set /p "status_code=" < temp_status.txt

if "!status_code!"=="200" (
    echo SUCCESS: Service is ready
) else if "!status_code!"=="503" (
    echo WARNING: Service is not ready (503)
) else (
    echo ERROR: Readiness check failed with status code: !status_code!
)

echo.

REM Check performance score
echo === Performance Analysis ===
for /f "tokens=2 delims=:" %%a in ('findstr "score" temp_metrics.json') do (
    set "score=%%a"
    set "score=!score: =!"
    set "score=!score:,=!"
    set "score=!score:}=!"
)

for /f "tokens=2 delims=:" %%a in ('findstr "status" temp_metrics.json') do (
    set "perf_status=%%a"
    set "perf_status=!perf_status: =!"
    set "perf_status=!perf_status:,=!"
    set "perf_status=!perf_status:}=!"
)

echo Performance Score: !score!/100
echo Performance Status: !perf_status!

if !score! geq 90 (
    echo SUCCESS: Excellent performance
) else if !score! geq 75 (
    echo INFO: Good performance
) else if !score! geq 60 (
    echo WARNING: Performance warning
) else (
    echo WARNING: Performance critical
)

echo.

REM Overall status
if "!meets_sla!"=="true" if "!status_code!"=="200" (
    echo SUCCESS: All checks passed - Service is healthy
) else (
    echo WARNING: Some checks failed - Service may be degraded
)

echo.

REM Cleanup
del temp_metrics.json 2>nul
del temp_status.txt 2>nul

echo Monitoring completed.
pause




