# POS Grocery System - Installation Script for Windows
# This script installs all dependencies and sets up the application

param(
    [string]$InstallPath = "C:\pos-grocery",
    [string]$ServiceName = "pos-grocery-backend",
    [switch]$SkipNodeInstall,
    [switch]$SkipNginxInstall
)

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-ColorOutput "🚀 Starting POS Grocery System Installation for Windows" $InfoColor

# Check if running as administrator
if (-not (Test-Administrator)) {
    Write-ColorOutput "❌ Please run PowerShell as Administrator" $ErrorColor
    exit 1
}

# Create application directory
Write-ColorOutput "📁 Creating application directory..." $WarningColor
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force
}

# Install Node.js if not skipped
if (-not $SkipNodeInstall) {
    Write-ColorOutput "📦 Installing Node.js..." $WarningColor
    
    # Check if Node.js is already installed
    try {
        $nodeVersion = node --version
        Write-ColorOutput "✅ Node.js is already installed: $nodeVersion" $SuccessColor
    }
    catch {
        Write-ColorOutput "📥 Downloading Node.js installer..." $InfoColor
        $nodeInstaller = "$env:TEMP\nodejs-installer.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi" -OutFile $nodeInstaller
        
        Write-ColorOutput "🔧 Installing Node.js..." $InfoColor
        Start-Process msiexec.exe -Wait -ArgumentList "/i $nodeInstaller /quiet /norestart"
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        # Clean up installer
        Remove-Item $nodeInstaller -Force
    }
}

# Install PM2 globally
Write-ColorOutput "📦 Installing PM2..." $WarningColor
npm install -g pm2
npm install -g pm2-windows-startup

# Install Nginx if not skipped
if (-not $SkipNginxInstall) {
    Write-ColorOutput "📦 Installing Nginx..." $WarningColor
    
    $nginxPath = "C:\nginx"
    if (-not (Test-Path $nginxPath)) {
        Write-ColorOutput "📥 Downloading Nginx..." $InfoColor
        $nginxZip = "$env:TEMP\nginx.zip"
        Invoke-WebRequest -Uri "http://nginx.org/download/nginx-1.24.0.zip" -OutFile $nginxZip
        
        Write-ColorOutput "📦 Extracting Nginx..." $InfoColor
        Expand-Archive -Path $nginxZip -DestinationPath "C:\" -Force
        Rename-Item "C:\nginx-1.24.0" "C:\nginx"
        
        # Clean up
        Remove-Item $nginxZip -Force
    }
}

# Copy application files
Write-ColorOutput "📋 Copying application files..." $WarningColor
Copy-Item -Path ".\*" -Destination $InstallPath -Recurse -Force -Exclude "node_modules", ".git"

# Install application dependencies
Write-ColorOutput "📦 Installing application dependencies..." $WarningColor
Set-Location $InstallPath
npm install

Set-Location "$InstallPath\server"
npm install

# Build the application
Write-ColorOutput "🔨 Building application..." $WarningColor
Set-Location $InstallPath
npm run build:all

# Configure Nginx
Write-ColorOutput "🌐 Configuring Nginx..." $WarningColor
$nginxConfig = Get-Content "$InstallPath\deploy\nginx.conf" -Raw
$nginxConfig = $nginxConfig -replace '/var/www/pos-grocery/dist', "$InstallPath\dist"
$nginxConfig = $nginxConfig -replace 'http://localhost:8250', 'http://127.0.0.1:8250'
$nginxConfig | Out-File -FilePath "C:\nginx\conf\nginx.conf" -Encoding UTF8

# Configure PM2
Write-ColorOutput "⚙️ Configuring PM2..." $WarningColor
Copy-Item "$InstallPath\deploy\ecosystem.config.js" "$InstallPath\server\"

# Update PM2 ecosystem config for Windows
$ecosystemConfig = Get-Content "$InstallPath\server\ecosystem.config.js" -Raw
$ecosystemConfig = $ecosystemConfig -replace '/var/www/pos-grocery', $InstallPath
$ecosystemConfig = $ecosystemConfig -replace '/var/log/pos-grocery', "$InstallPath\logs"
$ecosystemConfig | Out-File -FilePath "$InstallPath\server\ecosystem.config.js" -Encoding UTF8

# Create logs directory
New-Item -ItemType Directory -Path "$InstallPath\logs" -Force

# Install PM2 as Windows Service
Write-ColorOutput "🔧 Installing PM2 as Windows Service..." $WarningColor
Set-Location "$InstallPath\server"
pm2 start ecosystem.config.js --env production
pm2 save
pm2-startup install

# Create Windows Service using NSSM (if available)
Write-ColorOutput "🔧 Creating Windows Service..." $WarningColor
$nssmPath = "$InstallPath\tools\nssm.exe"
if (Test-Path $nssmPath) {
    & $nssmPath install $ServiceName node "$InstallPath\server\dist\index.js"
    & $nssmPath set $ServiceName AppDirectory "$InstallPath\server"
    & $nssmPath set $ServiceName DisplayName "POS Grocery Backend Service"
    & $nssmPath set $ServiceName Description "Node.js backend service for POS Grocery System"
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START
    & $nssmPath set $ServiceName AppStdout "$InstallPath\logs\service.log"
    & $nssmPath set $ServiceName AppStderr "$InstallPath\logs\service-error.log"
    
    # Set environment variables
    & $nssmPath set $ServiceName AppEnvironmentExtra "NODE_ENV=production" "PORT=8250" "DB_PATH=$InstallPath\data\pos-grocery.db"
    
    # Start the service
    Start-Service $ServiceName
}

# Create backup script
Write-ColorOutput "💾 Creating backup script..." $WarningColor
$backupScript = @"
@echo off
REM Backup script for POS Grocery System

set APP_DIR=$InstallPath
set BACKUP_DIR=$InstallPath\backups
set DB_PATH=$InstallPath\data\pos-grocery.db
set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=%DATE: =0%

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Create database backup
if exist "%DB_PATH%" (
    copy "%DB_PATH%" "%BACKUP_DIR%\pos-grocery_%DATE%.db"
    echo Database backup created: pos-grocery_%DATE%.db
)

REM Create application backup
powershell -Command "Compress-Archive -Path '$InstallPath\*' -DestinationPath '$InstallPath\backups\pos-grocery-app_%DATE%.zip' -Exclude 'node_modules', 'data', 'backups'"
echo Application backup created: pos-grocery-app_%DATE%.zip

echo Backup completed successfully
"@

$backupScript | Out-File -FilePath "$InstallPath\backup.bat" -Encoding ASCII

# Create scheduled task for backups
Write-ColorOutput "⏰ Creating backup scheduled task..." $WarningColor
$action = New-ScheduledTaskAction -Execute "$InstallPath\backup.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -TaskName "POS Grocery Backup" -Description "Daily backup of POS Grocery System"

# Start Nginx
Write-ColorOutput "🚀 Starting Nginx..." $WarningColor
if (Test-Path "C:\nginx\nginx.exe") {
    Start-Process "C:\nginx\nginx.exe" -WindowStyle Hidden
}

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*"} | Select-Object -First 1).IPAddress

# Display installation summary
Write-ColorOutput "✅ Installation completed successfully!" $SuccessColor
Write-ColorOutput "📋 Installation Summary:" $InfoColor
Write-ColorOutput "   • Application directory: $InstallPath" $InfoColor
Write-ColorOutput "   • Log directory: $InstallPath\logs" $InfoColor
Write-ColorOutput "   • Data directory: $InstallPath\data" $InfoColor
Write-ColorOutput "   • Backup directory: $InstallPath\backups" $InfoColor
Write-ColorOutput "   • Nginx configuration: C:\nginx\conf\nginx.conf" $InfoColor
Write-ColorOutput "   • PM2 configuration: $InstallPath\server\ecosystem.config.js" $InfoColor
Write-ColorOutput "   • Windows Service: $ServiceName" $InfoColor
Write-ColorOutput ""
Write-ColorOutput "🌐 Access your application at:" $WarningColor
Write-ColorOutput "   • HTTP: http://$localIP/" $InfoColor
Write-ColorOutput "   • API: http://$localIP/api/" $InfoColor
Write-ColorOutput ""
Write-ColorOutput "🔧 Useful commands:" $WarningColor
Write-ColorOutput "   • Check PM2 status: pm2 status" $InfoColor
Write-ColorOutput "   • View logs: pm2 logs" $InfoColor
Write-ColorOutput "   • Restart app: pm2 restart pos-grocery-backend" $InfoColor
Write-ColorOutput "   • Check Windows Service: Get-Service $ServiceName" $InfoColor
Write-ColorOutput "   • Start Nginx: C:\nginx\nginx.exe" $InfoColor
Write-ColorOutput "   • Stop Nginx: C:\nginx\nginx.exe -s stop" $InfoColor
Write-ColorOutput ""
Write-ColorOutput "⚠️  Important:" $ErrorColor
Write-ColorOutput "   • Update JWT_SECRET in production" $ErrorColor
Write-ColorOutput "   • Configure SSL certificate for HTTPS" $ErrorColor
Write-ColorOutput "   • Update CORS_ORIGINS for your domain" $ErrorColor
Write-ColorOutput "   • Test the application thoroughly" $ErrorColor
Write-ColorOutput ""
Write-ColorOutput "🎉 POS Grocery System is now running!" $SuccessColor











