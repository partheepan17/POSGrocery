@echo off
echo ========================================
echo   ⚙️  Setting up POS Project
echo ========================================
echo.
echo This will:
echo 1. Install all dependencies
echo 2. Build the project
echo 3. Set up environment files
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
call npm --prefix server install

REM Create environment files
echo 🔧 Setting up environment files...
if not exist "server\.env" (
    echo Creating server environment file...
    copy "server\env.example" "server\.env"
)

REM Build the project
echo 🏗️  Building project...
call npm run build:all

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Double-click start-dev.bat to start development
echo 2. Or run: npm run dev:all
echo.
pause




