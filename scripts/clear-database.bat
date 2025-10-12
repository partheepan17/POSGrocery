@echo off
echo Clearing POS Database (Preserving Users and Login Data)
echo =====================================================

cd /d "%~dp0.."

echo.
echo This will clear all data except:
echo - User accounts and login data
echo - App settings
echo - Categories and Suppliers
echo - Default system data
echo.

set /p confirm="Are you sure you want to continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Clearing database...
npx ts-node scripts/clear-database.ts

echo.
echo Database clear completed!
pause


