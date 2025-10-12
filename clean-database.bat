@echo off
echo 🧹 Starting Database Cleanup...

REM Check if database file exists
if not exist "server\db\pos_grocery.db" (
    echo ❌ Database file not found at: server\db\pos_grocery.db
    echo Please make sure the backend server has been started at least once to create the database.
    pause
    exit /b 1
)

REM Create backup
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "backup_name=pos_grocery_backup_%YYYY%%MM%%DD%_%HH%%Min%%Sec%.db"

echo 📦 Creating backup at: server\db\%backup_name%
copy "server\db\pos_grocery.db" "server\db\%backup_name%"

REM Check if sqlite3 is available
sqlite3 --version >nul 2>&1
if errorlevel 1 (
    echo ❌ SQLite3 not found. Please install SQLite3 or add it to your PATH.
    echo You can download SQLite3 from: https://www.sqlite.org/download.html
    pause
    exit /b 1
)

echo ✅ SQLite3 found

REM Run the cleanup script
echo 🔧 Running database cleanup...
sqlite3 "server\db\pos_grocery.db" < clean-database.sql
if errorlevel 1 (
    echo ❌ Error running database cleanup
    pause
    exit /b 1
)

echo ✅ Database cleanup completed successfully!

REM Verify the cleanup
echo 🔍 Verifying cleanup...
echo 📋 Remaining tables:
sqlite3 "server\db\pos_grocery.db" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo.
echo 👥 Users in database:
sqlite3 "server\db\pos_grocery.db" "SELECT COUNT(*) FROM users;"

echo.
echo 🎉 Database cleanup completed!
echo 📦 Backup saved at: server\db\%backup_name%
echo.
echo Default users created:
echo   - admin (PIN: 9999) - Administrator
echo   - manager (PIN: 9999) - Manager  
echo   - cashier1 (PIN: 1234) - Cashier
echo   - cashier2 (PIN: 5678) - Cashier
echo.
echo ⚠️  Note: All test data has been removed. Only user authentication and system configuration remain.
echo.
pause
