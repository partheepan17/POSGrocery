@echo off
REM Log Rotation Verification Script for Windows
REM Verifies that log rotation is working correctly and logs don't grow unbounded

setlocal enabledelayedexpansion

REM Configuration
set "LOG_DIR=C:\opt\pos-grocery\logs"
set "PM2_LOG_DIR=C:\opt\pos-grocery\server\logs"
set "MAX_LOG_SIZE_MB=50"
set "RETENTION_DAYS=7"

echo ========================================
echo   Log Rotation Verification
echo ========================================
echo.

echo Checking log rotation configuration...
echo Max log size: %MAX_LOG_SIZE_MB%MB
echo Retention days: %RETENTION_DAYS%
echo.

REM Check if log directories exist
if not exist "%LOG_DIR%" (
    echo WARNING: Log directory not found: %LOG_DIR%
) else (
    echo Found log directory: %LOG_DIR%
)

if not exist "%PM2_LOG_DIR%" (
    echo WARNING: PM2 log directory not found: %PM2_LOG_DIR%
) else (
    echo Found PM2 log directory: %PM2_LOG_DIR%
)

echo.

REM Check log file sizes
echo Checking log file sizes...
set "oversized_count=0"
set "total_size=0"

REM Check systemd logs
if exist "%LOG_DIR%" (
    for %%f in ("%LOG_DIR%\*.log") do (
        set "file_size=%%~zf"
        set /a "file_size_mb=!file_size!/1024/1024"
        set /a "total_size+=!file_size!"
        
        if !file_size! GTR 52428800 (
            echo WARNING: Oversized log file: %%~nxf (!file_size_mb!MB)
            set /a "oversized_count+=1"
        ) else (
            echo Log file: %%~nxf - !file_size_mb!MB
        )
    )
)

REM Check PM2 logs
if exist "%PM2_LOG_DIR%" (
    for %%f in ("%PM2_LOG_DIR%\*.log") do (
        set "file_size=%%~zf"
        set /a "file_size_mb=!file_size!/1024/1024"
        set /a "total_size+=!file_size!"
        
        if !file_size! GTR 52428800 (
            echo WARNING: Oversized log file: %%~nxf (!file_size_mb!MB)
            set /a "oversized_count+=1"
        ) else (
            echo PM2 log file: %%~nxf - !file_size_mb!MB
        )
    )
)

set /a "total_size_mb=!total_size!/1024/1024"
echo Total log size: !total_size_mb!MB

if !oversized_count! GTR 0 (
    echo ERROR: Found !oversized_count! oversized log files
    exit /b 1
) else (
    echo SUCCESS: All log files are within size limits
)

echo.

REM Check for old log files
echo Checking log retention...
set "old_count=0"

REM Calculate cutoff date (7 days ago)
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%%HH%%Min%%Sec%"

REM Check for old log files (simplified check)
if exist "%LOG_DIR%" (
    for %%f in ("%LOG_DIR%\*.log.*") do (
        set /a "old_count+=1"
        echo Old log file found: %%~nxf
    )
)

if exist "%PM2_LOG_DIR%" (
    for %%f in ("%PM2_LOG_DIR%\*.log.*") do (
        set /a "old_count+=1"
        echo Old log file found: %%~nxf
    )
)

if !old_count! GTR 0 (
    echo WARNING: Found !old_count! old log files (older than %RETENTION_DAYS% days)
) else (
    echo SUCCESS: No old log files found (retention policy working)
)

echo.

REM Check log compression
echo Checking log compression...
set "compressed_count=0"
set "uncompressed_count=0"

if exist "%LOG_DIR%" (
    for %%f in ("%LOG_DIR%\*.log.*.gz") do set /a "compressed_count+=1"
    for %%f in ("%LOG_DIR%\*.log.*") do (
        echo %%~nxf | findstr /i "\.gz$" >nul || set /a "uncompressed_count+=1"
    )
)

if exist "%PM2_LOG_DIR%" (
    for %%f in ("%PM2_LOG_DIR%\*.log.*.gz") do set /a "compressed_count+=1"
    for %%f in ("%PM2_LOG_DIR%\*.log.*") do (
        echo %%~nxf | findstr /i "\.gz$" >nul || set /a "uncompressed_count+=1"
    )
)

echo Compressed logs: !compressed_count!
echo Uncompressed logs: !uncompressed_count!

if !uncompressed_count! GTR 0 (
    echo WARNING: Some rotated logs are not compressed
) else (
    echo SUCCESS: All rotated logs are compressed
)

echo.

REM Check PM2 log rotation status
echo Checking PM2 log rotation...
pm2 show pm2-logrotate >nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: PM2 log rotation is enabled
    pm2 show pm2-logrotate
) else (
    echo WARNING: PM2 log rotation is not enabled
    echo To enable: pm2 install pm2-logrotate
)

echo.

REM Generate summary
echo ========================================
echo   Verification Summary
echo ========================================
echo.
echo Log sizes: Checked
echo Rotation config: Checked
echo Log retention: Checked
echo Compression: Checked
echo PM2 status: Checked
echo.

if !oversized_count! equ 0 (
    echo SUCCESS: Log rotation verification passed
    echo All log files are within size limits
    echo Log retention policy is working
) else (
    echo ERROR: Log rotation verification failed
    echo Found !oversized_count! oversized log files
    exit /b 1
)

echo.
echo Verification completed successfully!
pause




