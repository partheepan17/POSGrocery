# Grocery POS System

A lightweight, keyboard-first Point of Sale (POS) application designed for Grocery/FMCG businesses with support for up to 4 clients, multi-language receipts, and comprehensive inventory management.

## Features

### Core Functionality
- **Sales Management**: Complete POS with cart, payment processing, and receipt printing
- **Product Catalog**: Manage products with barcode support, SKU tracking, and categories
- **Price Management**: Tiered pricing with bulk discounts and customer group pricing
- **Inventory Control**: Real-time stock tracking with low-stock alerts
- **Customer & Supplier Management**: Complete CRM functionality
- **Discount System**: Flexible promotional discounts and loyalty programs
- **Reporting**: Comprehensive sales, inventory, and profit reports
- **Backup & Sync**: Automated cloud backups with restore functionality

### Technical Features
- **Multi-language Support**: English, Sinhala, and Tamil receipts
- **Keyboard-first UX**: Full keyboard navigation and shortcuts
- **Dark/Light Mode**: Adaptive theme with system preference detection
- **Currency Formatting**: LKR support with flexible rounding options
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Responsive Design**: Works on desktop and tablet devices
- **Fast Performance**: Optimized for quick startup and low memory usage

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom POS theme
- **State Management**: Zustand with persistence
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 🚀 Quick Start

### One-Click Start (Recommended)

**Windows:**
1. Double-click `tools/launchers/setup-project.bat` to install dependencies and build the project
2. Double-click `tools/launchers/start-dev-all.bat` to start development servers
3. Open http://localhost:5173 in your browser

**macOS/Linux:**
1. Double-click `tools/launchers/setup-project.command` to install dependencies and build the project
2. Double-click `tools/launchers/start-dev-all.command` to start development servers
3. Open http://localhost:5173 in your browser

## 🎯 Deployment Buttons

### Available Launchers

| Button | Description | Frontend | Backend | Use Case |
|--------|-------------|----------|---------|----------|
| **Start Dev (All)** | Full development mode | http://localhost:5173 | http://localhost:8250 | Daily development |
| **Start Dev (Fast)** | Fast development mode | http://localhost:5173 | http://localhost:8250 | Quick iteration |
| **Start Production** | Production mode | http://localhost:8080 | http://localhost:8250 | Production testing |
| **Check Health** | Health check | - | http://localhost:8250 | Service monitoring |
| **Setup Project** | Project setup | - | - | First-time setup |

### VS Code Tasks

Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) and type "Tasks: Run Task" to access:

- 🚀 **Start Dev (All)** - Full development environment
- ⚡ **Start Dev (Fast)** - Fast development with skipped migrations
- 🏗️ **Build All** - Build both frontend and backend
- 🚀 **Start Production** - Production deployment
- 🔍 **Check Health** - Service health verification
- ⚙️ **Setup Project** - Complete project setup

### Command Line Scripts

```bash
# Development
npm run dev:all              # Start both frontend and backend
npm run dev:all:fast         # Fast development mode
npm run dev:server           # Backend only
npm run dev:client           # Frontend only

# Production
npm run build:all            # Build everything
npm run start:all:prod       # Start production mode
npm run deploy:prod          # Build and start production

# Health Checks
npm run check:health         # Basic health check
npm run check:ready          # Readiness check
npm run check:integrity      # Database integrity check
npm run check:full           # Complete health verification

# Utilities
npm run setup                # Complete project setup
npm run reset                # Reset project data
npm run quick:start          # Quick development start
npm run quick:build          # Quick build
npm run quick:check          # Quick health check
```

### New Teammate Onboarding

**Step 1: Clone and Setup**
```bash
git clone <repository-url>
cd pos-grocery
cp .env.example .env
```

**Step 2: One-Click Start**
- **Windows**: Double-click `tools/launchers/setup-project.bat` then `tools/launchers/start-dev-all.bat`
- **macOS/Linux**: Double-click `tools/launchers/setup-project.command` then `tools/launchers/start-dev-all.command`
- **VS Code**: Press `Ctrl+Shift+P` → "Tasks: Run Task" → "Setup Project" → "Start Dev (All)"

**Step 3: Verify**
- Frontend: http://localhost:5173
- Backend: http://localhost:8250
- Health: Run "Check Health" task or launcher

### VS Code Users
1. Open the project in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Tasks: Run Task"
4. Select "🚀 Start Dev (All)" from the list

### Command Line
```bash
# Setup (first time only)
npm run setup

# Start development
npm run dev:all

# Start fast development (skips migrations, reduced logging)
npm run dev:all:fast

# Start production
npm run start:all:prod
```

## 📋 Available Launchers

### Windows Launchers
| File | Description |
|------|-------------|
| `setup.bat` | First-time setup (installs deps, builds project) |
| `start-dev.bat` | Start development servers (normal mode) |
| `start-dev-fast.bat` | Start development servers (fast mode) |
| `start-prod.bat` | Build and start production servers |

### macOS/Linux Launchers
| File | Description |
|------|-------------|
| `setup.command` | First-time setup (installs deps, builds project) |
| `start-dev.command` | Start development servers (normal mode) |
| `start-dev-fast.command` | Start development servers (fast mode) |
| `start-prod.command` | Build and start production servers |

### VS Code Tasks
Press `Ctrl+Shift+P` → "Tasks: Run Task" to access:
- 🚀 **Start Dev (All)** - Normal development mode
- ⚡ **Start Dev (Fast)** - Fast development mode
- 🏗️ **Build All** - Build both server and client
- 🚀 **Start Production** - Production mode
- 🔍 **Check Health** - Health check endpoints
- ⚙️ **Setup Project** - First-time setup
- 🧪 **Run Tests** - Run test suite
- 🔧 **Lint & Fix** - Code linting and fixing

### NPM Scripts Reference
```bash
# Development
npm run dev:all              # Start both server and client
npm run dev:all:fast         # Start in fast mode
npm run dev:server           # Start server only
npm run dev:server:fast      # Start server in fast mode
npm run dev:client           # Start client only

# Production
npm run build:all            # Build both server and client
npm run start:prod           # Start production server
npm run start:all:prod       # Start both in production mode
npm run serve:prod           # Serve built frontend

# Health & Status
npm run check:health         # Check server health
npm run check:all            # Check all services

# Setup & Maintenance
npm run setup                # Complete project setup
npm run reset                # Reset database
npm run lint:fix             # Fix linting issues
npm run format               # Format code
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd grocery-pos
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8103`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Keyboard Shortcuts

### Navigation
- `Ctrl + 1` - Sales
- `Ctrl + 2` - Products  
- `Ctrl + 3` - Price Management
- `Ctrl + 4` - Suppliers
- `Ctrl + 5` - Customers
- `Ctrl + 6` - Discounts
- `Ctrl + 7` - Inventory
- `Ctrl + 8` - Reports
- `Ctrl + 9` - Settings
- `Ctrl + 0` - Backups

### Sales Operations
- `F1` - New Sale
- `F2` - Add Product to Sale
- `F3` - Apply Discount
- `F4` - Process Payment
- `F5` - Print Receipt
- `F6` - Void Sale
- `F7` - Hold Sale
- `F8` - Recall Sale

### General
- `F9` - Toggle Theme
- `F10` - Toggle Fullscreen
- `F11` - Focus Search
- `F12` - Open Dev Tools
- `Ctrl + N` - New Item
- `Ctrl + S` - Save
- `Ctrl + F` - Search
- `Ctrl + P` - Print
- `Ctrl + E` - Export
- `Ctrl + I` - Import

## Currency & Localization

### Supported Currencies
- Sri Lankan Rupee (LKR) - Primary
- US Dollar (USD)
- Euro (EUR)

### Rounding Options
- Nearest: Round to nearest value
- Up: Always round up
- Down: Always round down

### Rounding Values
- රු 1.00
- රු 0.50
- රු 0.10
- රු 0.05
- රු 0.01

### Receipt Languages
- English (en)
- Sinhala (si)
- Tamil (ta)

## Configuration

### Settings
- Currency and symbol configuration
- Tax rate settings
- Rounding preferences
- Theme selection (light/dark/auto)
- Receipt language
- Barcode scanner integration
- Scale integration
- Printer configuration
- Auto-backup settings

### Data Management
- CSV import/export for all modules
- Automated daily cloud backups
- Manual backup creation
- Data restore functionality

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout/         # Layout components (Sidebar, Header)
│   └── ErrorBoundary.tsx
├── pages/              # Page components
│   ├── Sales.tsx
│   ├── Products.tsx
│   ├── Pricing.tsx
│   ├── Suppliers.tsx
│   ├── Customers.tsx
│   ├── Discounts.tsx
│   ├── Inventory.tsx
│   ├── Reports.tsx
│   ├── Settings.tsx
│   └── Backups.tsx
├── store/              # State management
│   ├── appStore.ts
│   └── salesStore.ts
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── currency.ts
│   ├── keyboard.ts
│   └── cn.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run unit tests with Vitest
- `npm run test:ui` - Run tests with UI
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report
- `npm run e2e` - Run end-to-end tests with Playwright
- `npm run e2e:ui` - Run e2e tests with UI
- `npm run e2e:install` - Install Playwright browsers

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Tailwind CSS for styling
- EditorConfig for consistent formatting

### Testing
- Vitest for unit testing
- Playwright for end-to-end testing
- React Testing Library for component testing
- Coverage reports with v8

### Additional Features
- Service Worker for offline support
- Telemetry logging system
- Health monitoring endpoint
- Print adapter for receipts
- Barcode/Scale integration adapters
- CSV import/export functionality
- Internationalization (i18n) support
- Protected routes and error boundaries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
>>>>>>> 522722f (Initial commit)
