<<<<<<< HEAD
# POSGrocery
=======
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
