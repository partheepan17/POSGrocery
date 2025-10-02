# Grocery POS System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Core Features](#core-features)
5. [Pages and Components](#pages-and-components)
6. [Services and APIs](#services-and-apis)
7. [Settings System](#settings-system)
8. [Receipt Printing System](#receipt-printing-system)
9. [CSV Import/Export](#csv-importexport)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Development Setup](#development-setup)
12. [API Reference](#api-reference)

## System Overview

The Grocery POS System is a comprehensive point-of-sale application built with React, TypeScript, and modern web technologies. It provides a complete solution for grocery store operations including sales management, inventory tracking, pricing control, customer management, and reporting.

### Key Technologies
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **State Management**: Zustand with persistence
- **Routing**: React Router DOM
- **Database**: SQLite with custom migration system
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── CSV/            # CSV handling components
│   ├── Discounts/      # Discount management components
│   ├── Layout/         # Layout and navigation components
│   ├── Pricing/        # Price management components
│   ├── Products/       # Product management components
│   └── Settings/       # Settings page components
├── pages/              # Main application pages
├── services/           # Business logic and API services
├── store/              # State management (Zustand)
├── types/              # TypeScript type definitions
├── database/           # Database migrations and seeds
├── adapters/           # External service adapters
└── i18n/              # Internationalization
```

### State Management
The application uses Zustand for state management with the following stores:
- `appStore`: Global app state (theme, language, settings)
- `salesStore`: Sales and cart management
- `settingsStore`: Application settings with persistence

## Database Schema

### Core Tables

#### Categories
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Suppliers
```sql
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  tax_id TEXT,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Products
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  alias_barcodes TEXT, -- JSON array of alternative barcodes
  name_en TEXT NOT NULL,
  name_si TEXT,
  name_ta TEXT,
  unit TEXT NOT NULL CHECK (unit IN ('pc', 'kg')),
  category_id INTEGER,
  price_retail DECIMAL(10,2) DEFAULT 0,
  price_wholesale DECIMAL(10,2) DEFAULT 0,
  price_credit DECIMAL(10,2) DEFAULT 0,
  price_other DECIMAL(10,2) DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0,
  tax_code TEXT,
  shelf_location TEXT,
  reorder_level INTEGER DEFAULT 0,
  preferred_supplier_id INTEGER,
  is_scale_item BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (preferred_supplier_id) REFERENCES suppliers(id)
);
```

#### Sales
```sql
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
  terminal_name TEXT NOT NULL,
  cashier_id TEXT NOT NULL,
  customer_id INTEGER,
  price_tier TEXT NOT NULL CHECK (price_tier IN ('Retail', 'Wholesale', 'Credit', 'Other')),
  gross DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  net DECIMAL(10,2) NOT NULL DEFAULT 0,
  pay_cash DECIMAL(10,2) DEFAULT 0,
  pay_card DECIMAL(10,2) DEFAULT 0,
  pay_wallet DECIMAL(10,2) DEFAULT 0,
  language TEXT DEFAULT 'EN',
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

#### Sale Lines
```sql
CREATE TABLE sale_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  qty DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

#### Discount Rules
```sql
CREATE TABLE discount_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('PRODUCT', 'CATEGORY')),
  target_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PERCENT', 'AMOUNT')),
  value DECIMAL(10,2) NOT NULL,
  max_qty_or_weight DECIMAL(10,3),
  active_from DATETIME DEFAULT CURRENT_TIMESTAMP,
  active_to DATETIME,
  priority INTEGER DEFAULT 1,
  reason_required BOOLEAN DEFAULT 0,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Core Features

### 1. Sales (POS) System

#### Sales Page (`/`)
The main point-of-sale interface with three-panel layout:

**Left Panel - Controls:**
- Barcode scanning and product search
- Customer selection dropdown
- Price tier selection (Retail/Wholesale/Credit/Other)
- Held sales management

**Middle Panel - Cart:**
- Real-time cart display
- Quantity adjustment (+/- buttons)
- Line item discounts
- Item removal
- Visual cart status (empty state)

**Right Panel - Summary & Payment:**
- Real-time totals calculation
- Multiple payment methods (Cash/Card/Wallet/Split)
- Quick tender buttons
- Print and reprint functionality
- Online/offline status indicator

#### Key Features:
- **Barcode Scanning**: Supports primary and alias barcodes
- **Scale Integration**: Handles weight-embedded and price-embedded barcodes
- **Tiered Pricing**: Automatic price selection based on customer tier
- **Discount Management**: Line-level discounts with cap enforcement
- **Sale Holding**: Ability to hold and resume sales
- **Receipt Printing**: Integrated thermal and A4 receipt printing
- **Keyboard Shortcuts**: Full keyboard navigation support

#### Keyboard Shortcuts:
- `/` - Focus search/scan input
- `F2` - Access held sales
- `F7` - Cash payment
- `F8` - Card payment
- `F9` - Wallet/QR payment
- `F10` - Split payment
- `Ctrl+P` - Print receipt
- `F4` - Reprint last receipt

### 2. Products Management

#### Products Page (`/products`)
Comprehensive product management with inline editing and bulk operations.

**Header Actions:**
- Add new product
- Import CSV
- Export CSV
- Refresh data

**Filters:**
- Search (SKU/barcode/name)
- Category dropdown
- Scale items toggle
- Active status (All/Active/Inactive)

**Grid Columns:**
- SKU (frozen)
- Barcode
- Name (EN/SI/TA)
- Unit (pc/kg)
- Category
- Price tiers (Retail/Wholesale/Credit/Other)
- Tax Code
- Reorder Level
- Preferred Supplier
- Scale Item checkbox
- Active checkbox
- Updated timestamp

**Inline Editing:**
- Single-cell editing on Enter
- Auto-save on blur/Enter
- Esc to cancel
- Dropdown editors for Unit/Category/Supplier
- Number validation for prices

**Row Actions:**
- Edit product
- Duplicate product
- Activate/Deactivate

**CSV Import/Export:**
- Exact headers: `sku,barcode,alias_barcodes,name_en,name_si,name_ta,unit,category,price_retail,price_wholesale,price_credit,price_other,tax_code,shelf_location,reorder_level,preferred_supplier,is_scale_item,is_active`
- Validation with preview
- Auto-create categories/suppliers
- Upsert by SKU

### 3. Price Management

#### Pricing Page (`/pricing`)
Dedicated interface for managing tier prices at scale.

**Features:**
- **Filters**: Search, category, missing price status
- **Inline Editing**: Direct price cell editing
- **Bulk Actions**: Copy, adjust, uniform set, rounding
- **CSV Import/Export**: Price-only operations
- **Missing Price Policy**: Warn or block based on settings

**Bulk Operations:**
- **Copy**: Copy Retail → Wholesale/Credit/Other
- **Adjust**: Apply percentage or amount adjustments
- **Uniform Set**: Set specific tier for all filtered items
- **Rounding**: Apply rounding rules (1.00, 0.50, 0.10)

**CSV Format:**
```csv
sku,price_retail,price_wholesale,price_credit,price_other
RICE5,100.00,95.00,105.00,100.00
```

### 4. Discount Management

#### Discounts Page (`/discounts`)
Rule-based discount system with real-time POS enforcement.

**Rule Types:**
- **Product-specific**: Apply to individual SKUs
- **Category-based**: Apply to entire product categories

**Discount Types:**
- **Percentage**: e.g., 10% off
- **Amount**: e.g., Rs. 10 off per unit

**Rule Parameters:**
- Name and description
- Target (Product SKU or Category)
- Type (Percent/Amount)
- Value
- Max quantity/weight cap
- Active date range
- Priority (execution order)
- Reason required flag
- Active status

**CSV Import/Export:**
```csv
name,applies_to_type,applies_to_value,type,value,max_qty_or_weight,active_from,active_to,priority,reason_required,active
Sugar Cap,product,SUGAR1,amount,10,3.000,,,,1,false,true
```

**POS Integration:**
- Real-time rule evaluation
- Cap enforcement
- Priority-based execution
- Remaining eligible quantity display

### 5. Settings Hub

#### Settings Page (`/settings`)
Comprehensive configuration management with immediate application.

**Store Info Section:**
- Store name and address
- Tax/VAT ID
- Logo upload/URL
- Default receipt language (EN/SI/TA)

**Devices Section:**
- Receipt paper size (58mm/80mm/A4)
- Cash drawer settings
- Barcode input mode
- Scale integration mode

**Language & Formatting:**
- Display language
- LKR rounding mode (Nearest 1.00/0.50/0.10)
- Weight decimal places (2-3)

**Pricing Policies:**
- Missing price policy (Warn & fallback / Block & require manager)
- Required tiers selection
- Auto-create on CSV import toggles

**Receipt Options:**
- Footer text per language
- QR code toggle
- Barcode toggle
- Tier badge display

**Backups:**
- Provider selection (Google Drive/OneDrive/S3/Backblaze/Local)
- Schedule configuration
- Retention policies
- Manual backup/restore

### 6. Other Pages

#### Customers (`/customers`)
- Customer database management
- Contact information
- Purchase history
- Loyalty program integration

#### Suppliers (`/suppliers`)
- Supplier contact management
- Purchase order tracking
- Performance metrics

#### Inventory (`/inventory`)
- Stock level monitoring
- Movement tracking
- Reorder alerts
- Cost analysis

#### Reports (`/reports`)
- Sales analytics
- Product performance
- Customer insights
- Financial summaries

## Services and APIs

### DataService (`src/services/dataService.ts`)
Core data access layer with CRUD operations for all entities.

**Product Operations:**
```typescript
async getProducts(filters?: ProductFilters): Promise<Product[]>
async getProductById(id: number): Promise<Product | null>
async createProduct(product: Omit<Product, 'id'>): Promise<Product>
async updateProduct(id: number, updates: Partial<Product>): Promise<Product | null>
async deleteProduct(id: number): Promise<boolean>
```

**Category Operations:**
```typescript
async getCategories(): Promise<Category[]>
async createCategory(category: Omit<Category, 'id'>): Promise<Category>
```

**Supplier Operations:**
```typescript
async getSuppliers(): Promise<Supplier[]>
async createSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier>
```

**Discount Rule Operations:**
```typescript
async getDiscountRules(activeOnly?: boolean): Promise<DiscountRule[]>
async getEffectiveDiscountRules(productIds: number[], categoryIds: number[]): Promise<DiscountRule[]>
async createDiscountRule(rule: Omit<DiscountRule, 'id'>): Promise<DiscountRule>
```

### POSService (`src/services/posService.ts`)
Point-of-sale business logic and operations.

**Sale Management:**
```typescript
async startSale(request: StartSaleRequest): Promise<POSSale>
async addLine(saleId: string, line: AddLineRequest): Promise<void>
async updateLineQty(lineId: number, qty: number): Promise<void>
async removeLine(lineId: number): Promise<void>
async finalizeSale(saleId: string, payments: PaymentSplit): Promise<POSSale>
```

**Discount Operations:**
```typescript
async applyLineDiscount(lineId: number, amount: number, isPercent: boolean): Promise<void>
async applyRuleCaps(saleId: string): Promise<void>
```

**Sale Holding:**
```typescript
async holdSale(saleId: string): Promise<void>
async resumeSale(heldSaleId: number): Promise<POSSale>
async getHeldSales(): Promise<POSHeldSale[]>
```

**Barcode Processing:**
```typescript
parseScaleBarcode(barcode: string): ScaleBarcodeResult | null
```

**Export:**
```typescript
async exportTodayCsv(): Promise<string>
```

### CSVService (`src/services/csvService.ts`)
CSV import/export functionality with validation.

**Generic Operations:**
```typescript
async exportData(data: any[], filename: string, options?: CSVExportOptions): Promise<void>
async parseFile(file: File): Promise<any[]>
```

**Product CSV:**
```typescript
async exportProducts(options?: CSVExportOptions): Promise<string>
async importProducts(file: File, options?: CSVImportOptions): Promise<CSVImportResult>
```

### Settings Services

#### SettingsValidationService (`src/services/settingsValidation.ts`)
Validates settings changes before application.

```typescript
class SettingsValidationService {
  static validateAllSettings(settings: AppSettings): ValidationResult
  static validateStoreInfo(storeInfo: StoreInfo): ValidationResult
  static validateDevices(devices: DeviceSettings): ValidationResult
  static validateBackupSettings(backup: BackupSettings): ValidationResult
}
```

#### SettingsIntegration (`src/services/settingsIntegration.ts`)
Applies settings changes to running application.

```typescript
class SettingsIntegration {
  updateSettings(settings: AppSettings): void
  updateRoundingMode(mode: RoundingMode): void
  updateReceiptSettings(receipt: ReceiptOptions): void
  updateBackupSettings(backup: BackupSettings): void
}
```

## Settings System

### AppSettings Interface
```typescript
interface AppSettings {
  storeInfo: {
    name: string;
    address: string;
    taxId: string;
    logoUrl?: string;
    defaultReceiptLanguage: 'EN' | 'SI' | 'TA';
  };
  devices: {
    receiptPaper: '58mm' | '80mm' | 'A4';
    cashDrawerOpenOnCash: boolean;
    barcodeInputMode: 'keyboard_wedge';
    scaleMode: 'weight_embedded' | 'price_embedded' | 'off';
  };
  languageFormatting: {
    displayLanguage: 'EN' | 'SI' | 'TA';
    roundingMode: 'NEAREST_1' | 'NEAREST_0_50' | 'NEAREST_0_10';
    kgDecimals: number;
  };
  pricingPolicies: {
    missingPricePolicy: 'warn_fallback' | 'block_manager';
    requiredTiers: ('retail' | 'wholesale' | 'credit' | 'other')[];
    autoCreateCategories: boolean;
    autoCreateSuppliers: boolean;
  };
  receiptOptions: {
    footerTextEN: string;
    footerTextSI: string;
    footerTextTA: string;
    showQRCode: boolean;
    showBarcode: boolean;
    showTierBadge: boolean;
  };
  backupSettings: {
    provider: 'google_drive' | 'onedrive' | 's3' | 'backblaze' | 'local';
    schedule: {
      dailyTime: string;
      onSettingsChange: boolean;
    };
    retention: {
      keepDaily: number;
      keepConfigChange: number;
    };
    credentials?: { [key: string]: string };
  };
}
```

### Settings Persistence
- Automatic persistence using Zustand middleware
- Local storage backup
- Migration support for settings schema changes
- Export/import functionality for configuration backup

## Receipt Printing System

### Receipt Adapters
Three specialized adapters for different paper sizes:

#### Thermal58Adapter
- Optimized for 58mm thermal printers
- Compact layout with essential information
- Monospace font rendering
- Line wrapping for long product names

#### Thermal80Adapter
- Standard 80mm thermal receipt format
- Balanced information density
- Professional appearance
- QR code and barcode support

#### A4PreviewAdapter
- Full-page invoice format
- Detailed layout with all information
- Print-friendly design
- Suitable for customer records

### ReceiptPayload Interface
```typescript
type ReceiptPayload = {
  store: { 
    name: string; 
    address?: string; 
    taxId?: string; 
    logoUrl?: string 
  };
  terminalName: string;
  invoice: {
    id: string;
    datetime: string;
    language: 'EN'|'SI'|'TA';
    priceTier: 'Retail'|'Wholesale'|'Credit'|'Other';
    isReprint?: boolean;
    items: Array<{
      sku: string;
      name_en: string; 
      name_si?: string; 
      name_ta?: string;
      unit: 'pc'|'kg';
      qty: number;
      unitPrice: number;
      lineDiscount: number;
      tax: number;
      total: number;
    }>;
    totals: { gross: number; discount: number; tax: number; net: number };
    payments: { cash: number; card: number; wallet: number; change: number };
  };
  options: {
    paper: '58mm'|'80mm'|'A4';
    showQRCode?: boolean;
    showBarcode?: boolean;
    openCashDrawerOnCash?: boolean;
    roundingMode: 'NEAREST_1'|'NEAREST_0_50'|'NEAREST_0_10';
    decimalPlacesKg?: number;
    footerText: { EN?: string; SI?: string; TA?: string };
  };
}
```

### Receipt Features
- **Multilingual Support**: English, Sinhala, Tamil
- **Dynamic Content**: Product names in selected language
- **QR Codes**: Invoice number and store information
- **Barcodes**: Code128 format for invoice numbers
- **Reprint Watermark**: Clear indication of reprint status
- **Cash Drawer Control**: Automatic drawer opening on cash payments
- **Weight Formatting**: Configurable decimal places for kg items

## CSV Import/Export

### Export Features
- **Filtered Export**: Export only filtered/selected items
- **Exact Headers**: Maintains consistent CSV format
- **Data Validation**: Ensures data integrity before export
- **Progress Feedback**: Visual progress indicators for large exports

### Import Features
- **Validation Pipeline**: Multi-stage validation with detailed error reporting
- **Preview Mode**: Show changes before applying
- **Auto-creation**: Automatically create missing categories/suppliers
- **Conflict Resolution**: Handle duplicate entries gracefully
- **Batch Processing**: Efficient handling of large files

### Supported CSV Formats

#### Products CSV
```csv
sku,barcode,alias_barcodes,name_en,name_si,name_ta,unit,category,price_retail,price_wholesale,price_credit,price_other,tax_code,shelf_location,reorder_level,preferred_supplier,is_scale_item,is_active
RICE5,4791234567890,"4791234567891,4791234567892",Rice 5kg,බත් 5කි,அரிசி 5கி,kg,Grains,100.00,95.00,105.00,100.00,VAT,A1-01,10,Rice Supplier,false,true
```

#### Pricing CSV
```csv
sku,price_retail,price_wholesale,price_credit,price_other
RICE5,100.00,95.00,105.00,100.00
```

#### Discount Rules CSV
```csv
name,applies_to_type,applies_to_value,type,value,max_qty_or_weight,active_from,active_to,priority,reason_required,active
Sugar Cap,product,SUGAR1,amount,10,3.000,,,,1,false,true
```

## Keyboard Shortcuts

### Global Shortcuts
- `/` - Focus search input (any page)
- `Ctrl+S` - Save current form
- `Esc` - Cancel current operation
- `Ctrl+P` - Print receipt (Sales page)

### Sales Page
- `F2` - Access held sales
- `F7` - Cash payment
- `F8` - Card payment
- `F9` - Wallet/QR payment
- `F10` - Split payment
- `F4` - Reprint last receipt
- `Alt+1` - Exact tender
- `Alt+2` - Rs. 500 tender
- `Alt+3` - Rs. 1000 tender

### Products Page
- `Ctrl+N` - Add new product
- `Ctrl+I` - Import CSV
- `Ctrl+E` - Export CSV
- `F5` - Refresh data

### Pricing Page
- `Ctrl+B` - Open bulk actions
- `Ctrl+I` - Import pricing CSV
- `Ctrl+E` - Export pricing CSV

### Settings Page
- `Ctrl+S` - Save settings
- `Ctrl+R` - Reset to defaults
- `Ctrl+E` - Export configuration
- `Ctrl+I` - Import configuration

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation
```bash
# Clone repository
git clone <repository-url>
cd grocery-pos

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

### Environment Configuration
The application uses environment variables for configuration:

```env
VITE_APP_TITLE=Grocery POS
VITE_API_BASE_URL=http://localhost:3000
VITE_DATABASE_PATH=./data/pos.db
```

### Database Setup
The application automatically initializes the database on first run:
1. Creates SQLite database file
2. Runs migration scripts
3. Seeds initial data
4. Sets up indexes and views

### Development Guidelines
- Use TypeScript for all new code
- Follow ESLint configuration
- Write component tests for complex logic
- Use semantic commit messages
- Document new features in this file

## API Reference

### Database Service Methods

#### Products
```typescript
// Get products with optional filters
getProducts(filters?: {
  search?: string;
  category?: string;
  scaleItemsOnly?: boolean;
  activeOnly?: boolean;
}): Promise<Product[]>

// Get single product by ID
getProductById(id: number): Promise<Product | null>

// Create new product
createProduct(product: {
  sku: string;
  barcode?: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: 'pc' | 'kg';
  category_id: number;
  price_retail: number;
  // ... other fields
}): Promise<Product>

// Update existing product
updateProduct(id: number, updates: Partial<Product>): Promise<Product | null>

// Delete product (soft delete)
deleteProduct(id: number): Promise<boolean>
```

#### Categories
```typescript
getCategories(): Promise<Category[]>
createCategory(category: { name: string; description?: string }): Promise<Category>
```

#### Suppliers
```typescript
getSuppliers(): Promise<Supplier[]>
createSupplier(supplier: {
  supplier_name: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  tax_id?: string;
}): Promise<Supplier>
```

#### Discount Rules
```typescript
getDiscountRules(activeOnly?: boolean): Promise<DiscountRule[]>
getEffectiveDiscountRules(productIds: number[], categoryIds: number[]): Promise<DiscountRule[]>
createDiscountRule(rule: {
  name: string;
  applies_to: 'PRODUCT' | 'CATEGORY';
  target_id: number;
  type: 'PERCENT' | 'AMOUNT';
  value: number;
  max_qty_or_weight?: number;
  priority?: number;
  reason_required?: boolean;
}): Promise<DiscountRule>
```

### POS Service Methods

#### Sale Operations
```typescript
// Start new sale
startSale(request: {
  cashier_id: number;
  terminal_name: string;
  customer_id?: number;
  price_tier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  language: 'EN' | 'SI' | 'TA';
}): Promise<POSSale>

// Add item to sale
addLine(saleId: string, line: {
  product_id: number;
  qty: number;
  unit_price: number;
}): Promise<void>

// Update line quantity
updateLineQty(lineId: number, qty: number): Promise<void>

// Remove line from sale
removeLine(lineId: number): Promise<void>

// Apply discount to line
applyLineDiscount(lineId: number, amount: number, isPercent: boolean): Promise<void>

// Finalize sale
finalizeSale(saleId: string, payments: {
  cash: number;
  card: number;
  wallet: number;
}): Promise<POSSale>
```

#### Sale Management
```typescript
// Hold current sale
holdSale(saleId: string): Promise<void>

// Resume held sale
resumeSale(heldSaleId: number): Promise<POSSale>

// Get all held sales
getHeldSales(): Promise<POSHeldSale[]>

// Export today's sales to CSV
exportTodayCsv(): Promise<string>
```

### CSV Service Methods

#### Generic CSV Operations
```typescript
// Export data to CSV
exportData<T>(
  data: T[], 
  filename: string, 
  options?: {
    delimiter?: string;
    includeHeaders?: boolean;
    encoding?: string;
  }
): Promise<void>

// Parse CSV file
parseFile(file: File): Promise<any[]>
```

#### Product CSV
```typescript
// Export products to CSV
exportProducts(options?: CSVExportOptions): Promise<string>

// Import products from CSV
importProducts(
  file: File, 
  options?: {
    autoCreateCategories?: boolean;
    autoCreateSuppliers?: boolean;
    updateExisting?: boolean;
  }
): Promise<{
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
  warnings: string[];
}>
```

### Settings Service Methods

#### Validation
```typescript
// Validate all settings
SettingsValidationService.validateAllSettings(settings: AppSettings): {
  isValid: boolean;
  errors: Array<{ section: string; message: string }>;
  warnings: Array<{ section: string; message: string }>;
}

// Validate specific sections
SettingsValidationService.validateStoreInfo(storeInfo: StoreInfo): ValidationResult
SettingsValidationService.validateDevices(devices: DeviceSettings): ValidationResult
```

#### Integration
```typescript
// Apply settings changes
settingsIntegration.updateSettings(settings: AppSettings): void

// Update specific settings
settingsIntegration.updateRoundingMode(mode: RoundingMode): void
settingsIntegration.updateReceiptSettings(receipt: ReceiptOptions): void
```

## Conclusion

The Grocery POS System provides a comprehensive solution for modern grocery store operations. With its modular architecture, extensive feature set, and focus on usability, it addresses the needs of both small and large grocery operations.

Key strengths include:
- **Complete Feature Set**: From basic POS to advanced inventory management
- **Modern Architecture**: Built with current web technologies
- **Extensible Design**: Easy to add new features and integrations
- **User-Friendly Interface**: Keyboard-first design for efficiency
- **Robust Data Management**: Comprehensive CSV import/export
- **Flexible Configuration**: Extensive settings system
- **Multilingual Support**: English, Sinhala, and Tamil languages
- **Receipt Printing**: Multiple paper size support with thermal printers

The system is designed to grow with business needs while maintaining simplicity and reliability for daily operations.




