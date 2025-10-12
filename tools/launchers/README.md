# POS Grocery Launchers

This directory contains OS-specific launchers for easy deployment and development.

## Windows Launchers (.bat)

### Development
- **`start-dev-all.bat`** - Start both frontend and backend in development mode
- **`start-dev-fast.bat`** - Start in fast development mode (skips migrations)

### Production
- **`start-prod.bat`** - Build and start in production mode

### Utilities
- **`check-health.bat`** - Check health status of all services
- **`setup-project.bat`** - Set up project for development

## macOS/Linux Launchers (.command)

### Development
- **`start-dev-all.command`** - Start both frontend and backend in development mode
- **`start-dev-fast.command`** - Start in fast development mode (skips migrations)

### Production
- **`start-prod.command`** - Build and start in production mode

### Utilities
- **`check-health.command`** - Check health status of all services
- **`setup-project.command`** - Set up project for development

## Usage

### Windows
1. Double-click any `.bat` file to run
2. Or run from command prompt: `tools\launchers\start-dev-all.bat`

### macOS/Linux
1. Make executable: `chmod +x tools/launchers/*.command`
2. Double-click any `.command` file to run
3. Or run from terminal: `./tools/launchers/start-dev-all.command`

## Quick Start for New Teammates

1. **Clone the repository**
2. **Copy environment file**: `cp .env.example .env`
3. **Run setup**: Double-click `setup-project.bat` (Windows) or `setup-project.command` (macOS/Linux)
4. **Start development**: Double-click `start-dev-all.bat` (Windows) or `start-dev-all.command` (macOS/Linux)

## Available Scripts

| Launcher | Description | Frontend | Backend |
|----------|-------------|----------|---------|
| `start-dev-all` | Full development mode | http://localhost:5173 | http://localhost:8250 |
| `start-dev-fast` | Fast development mode | http://localhost:5173 | http://localhost:8250 |
| `start-prod` | Production mode | http://localhost:8080 | http://localhost:8250 |
| `check-health` | Health check | - | http://localhost:8250 |
| `setup-project` | Project setup | - | - |

## Troubleshooting

### Windows
- If launchers don't work, try running from Command Prompt as Administrator
- Ensure Node.js and npm are installed and in PATH

### macOS/Linux
- If launchers don't work, make them executable: `chmod +x tools/launchers/*.command`
- Ensure Node.js and npm are installed

### Common Issues
- **Port already in use**: Stop other services or change ports in configuration
- **Permission denied**: Run with appropriate permissions
- **Node not found**: Install Node.js and ensure it's in PATH




