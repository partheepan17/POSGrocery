# Database Cleanup Script
# This script cleans the database and keeps only user-related tables

Write-Host "🧹 Starting Database Cleanup..." -ForegroundColor Yellow

# Check if database file exists
$dbPath = "server/db/pos_grocery.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database file not found at: $dbPath" -ForegroundColor Red
    Write-Host "Please make sure the backend server has been started at least once to create the database." -ForegroundColor Yellow
    exit 1
}

# Backup the current database
$backupPath = "server/db/pos_grocery_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
Write-Host "📦 Creating backup at: $backupPath" -ForegroundColor Cyan
Copy-Item $dbPath $backupPath

# Check if sqlite3 is available
$sqlitePath = "sqlite3"
try {
    $null = Get-Command $sqlitePath -ErrorAction Stop
    Write-Host "✅ SQLite3 found" -ForegroundColor Green
} catch {
    Write-Host "❌ SQLite3 not found. Please install SQLite3 or add it to your PATH." -ForegroundColor Red
    Write-Host "You can download SQLite3 from: https://www.sqlite.org/download.html" -ForegroundColor Yellow
    exit 1
}

# Run the cleanup script
Write-Host "🔧 Running database cleanup..." -ForegroundColor Cyan
try {
    sqlite3 $dbPath < clean-database.sql
    Write-Host "✅ Database cleanup completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error running database cleanup: $_" -ForegroundColor Red
    exit 1
}

# Verify the cleanup
Write-Host "🔍 Verifying cleanup..." -ForegroundColor Cyan
$tables = sqlite3 $dbPath "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
Write-Host "📋 Remaining tables:" -ForegroundColor Yellow
$tables | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }

$userCount = sqlite3 $dbPath "SELECT COUNT(*) FROM users;"
Write-Host "👥 Users in database: $userCount" -ForegroundColor Yellow

Write-Host "`n🎉 Database cleanup completed!" -ForegroundColor Green
Write-Host "📦 Backup saved at: $backupPath" -ForegroundColor Cyan
Write-Host "`nDefault users created:" -ForegroundColor Yellow
Write-Host "  - admin (PIN: 9999) - Administrator" -ForegroundColor White
Write-Host "  - manager (PIN: 9999) - Manager" -ForegroundColor White
Write-Host "  - cashier1 (PIN: 1234) - Cashier" -ForegroundColor White
Write-Host "  - cashier2 (PIN: 5678) - Cashier" -ForegroundColor White

Write-Host "`n⚠️  Note: All test data has been removed. Only user authentication and system configuration remain." -ForegroundColor Yellow














