# Deployment Buttons Guide

## Overview

This guide provides comprehensive instructions for using the deployment "buttons" - scripts, VS Code tasks, and OS launchers - for zero-friction development and production starts.

## 🎯 Available Deployment Options

### 1. OS Launchers (Double-Click to Run)

#### Windows (.bat files)
- **`tools/launchers/setup-project.bat`** - Complete project setup
- **`tools/launchers/start-dev-all.bat`** - Full development mode
- **`tools/launchers/start-dev-fast.bat`** - Fast development mode
- **`tools/launchers/start-prod.bat`** - Production mode
- **`tools/launchers/check-health.bat`** - Health check

#### macOS/Linux (.command files)
- **`tools/launchers/setup-project.command`** - Complete project setup
- **`tools/launchers/start-dev-all.command`** - Full development mode
- **`tools/launchers/start-dev-fast.command`** - Fast development mode
- **`tools/launchers/start-prod.command`** - Production mode
- **`tools/launchers/check-health.command`** - Health check

### 2. VS Code Tasks (Ctrl+Shift+P → "Tasks: Run Task")

#### Development Tasks
- 🚀 **Start Dev (All)** - Full development environment
- ⚡ **Start Dev (Fast)** - Fast development with skipped migrations
- 🔧 **Start Server Only** - Backend only
- ⚡ **Start Server (Fast)** - Fast backend only
- 🎨 **Start Client Only** - Frontend only

#### Production Tasks
- 🏗️ **Build All** - Build both frontend and backend
- 🏗️ **Build Server** - Build backend only
- 🏗️ **Build Client** - Build frontend only
- 🚀 **Start Production** - Production deployment

#### Health & Testing Tasks
- 🔍 **Check Health** - Basic health check
- 🔍 **Check Ready** - Readiness check
- 🔍 **Check Integrity** - Database integrity check
- 🔍 **Check All** - All health checks
- 🔍 **Check Full** - Complete health verification
- 🧪 **Run Tests** - Run test suite
- 🧪 **Run Tests (UI)** - Run tests with UI
- 🧪 **Run E2E Tests** - Run end-to-end tests

#### Utility Tasks
- ⚙️ **Setup Project** - Complete project setup
- 🔄 **Reset Project** - Reset project data
- 🔍 **Lint & Fix** - Lint and fix code
- 🎨 **Format Code** - Format code with Prettier

#### Docker Tasks
- 🐳 **Docker Build** - Build Docker image
- 🐳 **Docker Run** - Run Docker container
- 🐳 **Docker Compose Up** - Start with Docker Compose
- 🐳 **Docker Compose Down** - Stop Docker Compose
- 🐳 **Docker Compose Logs** - View Docker logs

#### Quick Tasks
- ⚡ **Quick Start** - Quick development start
- ⚡ **Quick Build** - Quick build
- ⚡ **Quick Check** - Quick health check
- 🚀 **Deploy Dev** - Deploy development
- 🚀 **Deploy Prod** - Deploy production
- 🔍 **Deploy Check** - Deploy health check
- 🔄 **Deploy Reset** - Deploy reset

### 3. Command Line Scripts

#### Development Scripts
```bash
npm run dev:all              # Start both frontend and backend
npm run dev:all:fast         # Fast development mode
npm run dev:server           # Backend only
npm run dev:server:fast      # Fast backend only
npm run dev:client           # Frontend only
```

#### Production Scripts
```bash
npm run build:all            # Build everything
npm run build:prod           # Build frontend for production
npm run start:prod           # Start production server
npm run start:all:prod       # Start production mode
npm run serve:prod           # Serve production frontend
```

#### Health Check Scripts
```bash
npm run check:health         # Basic health check
npm run check:ready          # Readiness check
npm run check:integrity      # Database integrity check
npm run check:all            # All health checks
npm run check:full           # Complete health verification
```

#### Utility Scripts
```bash
npm run setup                # Complete project setup
npm run reset                # Reset project data
npm run quick:start          # Quick development start
npm run quick:build          # Quick build
npm run quick:check          # Quick health check
```

#### Deployment Scripts
```bash
npm run deploy:dev           # Deploy development
npm run deploy:prod          # Deploy production
npm run deploy:check         # Deploy health check
npm run deploy:reset         # Deploy reset
```

## 🚀 New Teammate Onboarding

### Step 1: Clone and Setup
```bash
# Clone repository
git clone <repository-url>
cd pos-grocery

# Copy environment file
cp .env.example .env
```

### Step 2: One-Click Start

#### Option A: OS Launchers
**Windows:**
1. Double-click `tools/launchers/setup-project.bat`
2. Double-click `tools/launchers/start-dev-all.bat`

**macOS/Linux:**
1. Make launchers executable: `chmod +x tools/launchers/*.command`
2. Double-click `tools/launchers/setup-project.command`
3. Double-click `tools/launchers/start-dev-all.command`

#### Option B: VS Code Tasks
1. Open project in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Tasks: Run Task" → "Setup Project"
4. Type "Tasks: Run Task" → "Start Dev (All)"

#### Option C: Command Line
```bash
npm run setup
npm run dev:all
```

### Step 3: Verify Setup
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8250
- **Health Check**: Run "Check Health" task or launcher

## 📋 Usage Scenarios

### Daily Development
1. **Start**: Use "Start Dev (All)" launcher or task
2. **Code**: Make changes to frontend/backend
3. **Test**: Use "Check Health" to verify changes
4. **Stop**: Close terminal or press Ctrl+C

### Quick Iteration
1. **Start**: Use "Start Dev (Fast)" for faster startup
2. **Code**: Make quick changes
3. **Test**: Use "Quick Check" for fast verification
4. **Repeat**: Iterate quickly

### Production Testing
1. **Build**: Use "Build All" task or `npm run build:all`
2. **Start**: Use "Start Production" task or `npm run start:all:prod`
3. **Test**: Use "Check Full" for comprehensive testing
4. **Stop**: Close terminal or press Ctrl+C

### Health Monitoring
1. **Check**: Use "Check Health" for basic status
2. **Deep Check**: Use "Check Full" for comprehensive verification
3. **Integrity**: Use "Check Integrity" for database validation

### Project Reset
1. **Reset**: Use "Reset Project" task or `npm run reset`
2. **Setup**: Use "Setup Project" to reinitialize
3. **Start**: Use "Start Dev (All)" to begin fresh

## 🔧 Troubleshooting

### Common Issues

#### Launchers Don't Work
**Windows:**
- Run Command Prompt as Administrator
- Ensure Node.js is installed and in PATH
- Check file associations for .bat files

**macOS/Linux:**
- Make launchers executable: `chmod +x tools/launchers/*.command`
- Ensure Node.js is installed and in PATH
- Check file permissions

#### VS Code Tasks Don't Appear
- Ensure VS Code is opened in the project root
- Check that `.vscode/tasks.json` exists
- Restart VS Code if tasks don't appear

#### Scripts Fail
- Check Node.js and npm versions
- Ensure all dependencies are installed: `npm install`
- Check environment variables in `.env` file
- Verify ports are not in use

#### Port Already in Use
- Stop other services using the ports
- Change ports in configuration files
- Use `netstat` to find processes using ports

### Debug Commands

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check installed packages
npm list

# Check running processes
netstat -an | findstr :5173  # Windows
netstat -an | findstr :8250  # Windows
lsof -i :5173                # macOS/Linux
lsof -i :8250                # macOS/Linux

# Check environment variables
echo $NODE_ENV               # macOS/Linux
echo %NODE_ENV%              # Windows
```

## 📊 Performance Comparison

| Method | Startup Time | Memory Usage | Use Case |
|--------|-------------|--------------|----------|
| **Start Dev (All)** | ~10-15s | ~200MB | Daily development |
| **Start Dev (Fast)** | ~5-8s | ~150MB | Quick iteration |
| **Start Production** | ~3-5s | ~100MB | Production testing |
| **Quick Start** | ~8-12s | ~180MB | Quick development |

## 🎯 Best Practices

### Development Workflow
1. **Start**: Use "Start Dev (All)" for full development
2. **Iterate**: Use "Start Dev (Fast)" for quick changes
3. **Test**: Use "Check Health" regularly
4. **Build**: Use "Build All" before commits
5. **Reset**: Use "Reset Project" when needed

### Production Workflow
1. **Build**: Use "Build All" for production build
2. **Test**: Use "Check Full" for comprehensive testing
3. **Deploy**: Use "Start Production" for production mode
4. **Monitor**: Use "Check Health" for ongoing monitoring

### Team Collaboration
1. **Onboard**: Use launchers for new team members
2. **Standardize**: Use VS Code tasks for consistency
3. **Document**: Update scripts and tasks as needed
4. **Test**: Verify all deployment methods regularly

This comprehensive deployment system ensures zero-friction starts for both development and production environments, making it easy for new teammates to get productive in minutes!




