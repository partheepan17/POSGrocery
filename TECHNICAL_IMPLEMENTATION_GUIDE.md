# POS System - Technical Implementation Guide

## Overview

This guide provides comprehensive technical documentation for the viRtual POS system, covering architecture, implementation patterns, and development guidelines for developers and technical stakeholders.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (React)                   │
├─────────────────────────────────────────────────────────────┤
│  Pages        │  Components    │  Services    │  Utils      │
│  - Sales      │  - UI          │  - POS       │  - Currency │
│  - Products   │  - Layout      │  - Data      │  - Keyboard │
│  - Inventory  │  - Forms       │  - Auth      │  - CN       │
│  - Reports    │  - Charts      │  - Print     │  - Telemetry│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer (TypeScript)                │
├─────────────────────────────────────────────────────────────┤
│  Business Logic  │  Data Access  │  External Integration   │
│  - POS Service   │  - DataService│  - Print Adapters       │
│  - Auth Service  │  - Database   │  - Barcode Service      │
│  - Report Service│  - Migrations │  - CSV Service          │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (SQLite)                      │
├─────────────────────────────────────────────────────────────┤
│  Tables         │  Views        │  Indexes     │  Migrations│
│  - Products     │  - Sales View │  - Performance│  - Schema  │
│  - Sales        │  - Inventory  │  - Lookups   │  - Seeds   │
│  - Customers    │  - Reports    │  - Foreign Keys│  - Updates│
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **React 18**: Modern UI framework with hooks and concurrent features
- **TypeScript**: Type-safe development with comprehensive type definitions
- **Vite**: Fast build tool with HMR and optimized bundling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Zustand**: Lightweight state management
- **React Router v6**: Client-side routing with nested routes
- **Lucide React**: Modern icon library
- **React Hot Toast**: User notification system

#### Backend Services
- **SQLite**: Embedded database with SQL.js for browser compatibility
- **Service Layer Pattern**: Clean separation of business logic
- **Adapter Pattern**: External system integration (printing, barcode)
- **Repository Pattern**: Data access abstraction

#### Development Tools
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing
- **Docker**: Containerization for deployment

## Core Service Architecture

### 1. POS Service (`posService.ts`)

**Purpose**: Core business logic for point-of-sale operations

**Key Responsibilities**:
- Sale lifecycle management (start, add lines, finalize)
- Price tier handling (Retail, Wholesale, Credit, Other)
- Discount application and rule processing
- Scale item handling for weight-based products
- Sale hold/resume functionality
- Payment processing

**Key Methods**:
```typescript
class POSService {
  async startSale(request: POSSaleRequest): Promise<Sale>
  async addLine(request: POSLineRequest): Promise<SaleLine>
  async applyLineDiscount(request: POSDiscountRequest): Promise<SaleLine>
  async finalizeSale(request: POSPaymentRequest): Promise<Sale>
  async holdSale(saleId: number): Promise<boolean>
  async resumeSale(saleId: number): Promise<POSHeldSale>
  parseScaleBarcode(barcode: string): ScaleBarcodeResult
}
```

**Implementation Patterns**:
- **Singleton Pattern**: Single instance for state management
- **State Management**: Current sale and lines tracking
- **Error Handling**: Comprehensive error validation
- **Business Rules**: Price tier logic and discount application

### 2. Data Service (`dataService.ts`)

**Purpose**: Centralized data access layer

**Key Responsibilities**:
- Database operations (CRUD)
- Data validation and sanitization
- Transaction management
- Query optimization
- Data relationships

**Key Methods**:
```typescript
class DataService {
  // Products
  async getProducts(filters?: ProductFilters): Promise<Product[]>
  async getProductById(id: number): Promise<Product | null>
  async createProduct(product: CreateProductRequest): Promise<Product>
  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product>
  
  // Sales
  async startSale(request: SaleRequest): Promise<Sale>
  async getSaleLines(saleId: number): Promise<SaleLine[]>
  async finalizeSale(saleId: number, payments: PaymentRequest): Promise<Sale>
  
  // Inventory
  async getInventoryLevels(): Promise<InventoryLevel[]>
  async updateStock(productId: number, quantity: number): Promise<void>
}
```

### 3. Authentication Service (`authService.ts`)

**Purpose**: User authentication and authorization

**Key Features**:
- PIN-based authentication
- Role-based access control
- Session management
- Security audit logging
- Password policy enforcement

### 4. Print Service Architecture

**Purpose**: Receipt and label printing

**Adapters**:
- `ReceiptPrintAdapter`: Sales receipt printing
- `LabelPrintAdapter`: Product label printing
- `HoldSlipAdapter`: Hold slip printing
- `ShiftPrintAdapter`: X/Z report printing

## Database Schema

### Core Tables

#### Products Table
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    name_en VARCHAR(255) NOT NULL,
    name_si VARCHAR(255),
    name_ta VARCHAR(255),
    unit VARCHAR(10) CHECK (unit IN ('pc', 'kg')) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    is_scale_item BOOLEAN DEFAULT false,
    price_retail DECIMAL(10,2) NOT NULL,
    price_wholesale DECIMAL(10,2) NOT NULL,
    price_credit DECIMAL(10,2) NOT NULL,
    price_other DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    reorder_level INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);
```

#### Sales Table
```sql
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    datetime TIMESTAMP DEFAULT now(),
    cashier_id INTEGER REFERENCES users(id),
    customer_id INTEGER REFERENCES customers(id),
    price_tier VARCHAR(20) CHECK (price_tier IN ('Retail', 'Wholesale', 'Credit', 'Other')),
    gross DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    net DECIMAL(10,2) NOT NULL,
    pay_cash DECIMAL(10,2) DEFAULT 0,
    pay_card DECIMAL(10,2) DEFAULT 0,
    pay_wallet DECIMAL(10,2) DEFAULT 0,
    language VARCHAR(2) CHECK (language IN ('EN', 'SI', 'TA')) DEFAULT 'EN',
    terminal_name VARCHAR(255)
);
```

### Indexing Strategy

**Performance Indexes**:
- `idx_products_sku`: Fast SKU lookups
- `idx_products_barcode`: Barcode scanning performance
- `idx_sales_datetime`: Time-based queries
- `idx_sales_cashier_id`: Cashier-specific reports

## Component Architecture

### Page Components

#### Sales Page (`Sales.tsx`)
**Purpose**: Main POS interface

**Key Features**:
- Product search and selection
- Shopping cart management
- Customer selection
- Payment processing
- Receipt printing

**State Management**:
```typescript
interface SalesState {
  searchTerm: string;
  selectedCustomer: Customer | null;
  priceTier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  cartLines: CartLine[];
  currentSale: Sale | null;
}
```

#### Products Page (`Products.tsx`)
**Purpose**: Product catalog management

**Key Features**:
- Product listing with filters
- Add/Edit product forms
- CSV import/export
- Bulk operations
- Category management

### UI Component Library

#### Layout Components
- `Layout.tsx`: Main application layout
- `Sidebar.tsx`: Navigation sidebar
- `Header.tsx`: Top navigation bar

#### Form Components
- `AddProductModal.tsx`: Product creation form
- `CSVImportModal.tsx`: File import interface
- `SettingsForm.tsx`: Configuration forms

#### Data Display Components
- `ProductTable.tsx`: Product listing table
- `SalesChart.tsx`: Sales analytics charts
- `InventoryLevels.tsx`: Stock level display

## State Management

### Global State (Zustand)

```typescript
interface AppStore {
  // User state
  currentUser: User | null;
  currentSession: Session | null;
  
  // UI state
  theme: 'light' | 'dark' | 'auto';
  sidebarOpen: boolean;
  
  // Settings
  settings: AppSettings;
  holdsSettings: HoldSettings;
  
  // Actions
  setTheme: (theme: Theme) => void;
  setCurrentUser: (user: User | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}
```

### Local State Management

**React Hooks Pattern**:
```typescript
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(false);
const [filters, setFilters] = useState<FilterState>({});
```

## Error Handling Strategy

### Service Layer Error Handling

```typescript
try {
  const result = await dataService.getProductById(id);
  if (!result) {
    throw new Error('Product not found');
  }
  return result;
} catch (error) {
  console.error('Failed to get product:', error);
  toast.error('Failed to load product');
  throw error;
}
```

### Component Error Boundaries

```typescript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
}
```

## Performance Optimization

### Database Optimization

1. **Indexing Strategy**:
   - Primary key indexes
   - Foreign key indexes
   - Search field indexes
   - Composite indexes for complex queries

2. **Query Optimization**:
   - Prepared statements
   - Query result caching
   - Pagination for large datasets
   - Lazy loading for related data

### Frontend Optimization

1. **React Optimization**:
   - `React.memo` for expensive components
   - `useMemo` for computed values
   - `useCallback` for event handlers
   - Code splitting with dynamic imports

2. **Bundle Optimization**:
   - Tree shaking for unused code
   - Dynamic imports for route-based splitting
   - Asset optimization and compression

## Security Implementation

### Authentication & Authorization

```typescript
// Role-based permissions
const PERMISSIONS = {
  VIEW_SALES: 'VIEW_SALES',
  CREATE_SALES: 'CREATE_SALES',
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_USERS: 'MANAGE_USERS',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN'
} as const;

// Permission checking
const hasPermission = (user: User, permission: Permission): boolean => {
  return user.role.permissions.includes(permission);
};
```

### Data Validation

```typescript
// Input validation
const validateProduct = (product: CreateProductRequest): ValidationResult => {
  const errors: string[] = [];
  
  if (!product.sku || product.sku.length < 3) {
    errors.push('SKU must be at least 3 characters');
  }
  
  if (product.price_retail <= 0) {
    errors.push('Retail price must be greater than 0');
  }
  
  return { valid: errors.length === 0, errors };
};
```

## Testing Strategy

### Unit Testing (Vitest)

```typescript
describe('POSService', () => {
  test('should start a new sale', async () => {
    const request: POSSaleRequest = {
      cashier_id: 1,
      price_tier: 'Retail'
    };
    
    const sale = await posService.startSale(request);
    expect(sale).toBeDefined();
    expect(sale.price_tier).toBe('Retail');
  });
});
```

### Integration Testing

```typescript
describe('Sales Flow', () => {
  test('should complete a full sale transaction', async () => {
    // Start sale
    const sale = await posService.startSale(saleRequest);
    
    // Add product
    const line = await posService.addLine(lineRequest);
    
    // Finalize sale
    const finalizedSale = await posService.finalizeSale(paymentRequest);
    
    expect(finalizedSale.status).toBe('completed');
  });
});
```

### End-to-End Testing (Playwright)

```typescript
test('should process a complete sale', async ({ page }) => {
  await page.goto('/');
  
  // Search for product
  await page.fill('[data-testid="product-search"]', 'RICE');
  await page.click('[data-testid="product-item"]');
  
  // Add to cart
  await page.click('[data-testid="add-to-cart"]');
  
  // Process payment
  await page.click('[data-testid="process-payment"]');
  
  // Verify receipt
  await expect(page.locator('[data-testid="receipt"]')).toBeVisible();
});
```

## Deployment Architecture

### Development Environment

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run E2E tests
npm run e2e
```

### Production Build

```bash
# Build for production
npm run build:prod

# Preview production build
npm run preview

# Serve production build
npm run serve:prod
```

### Docker Deployment

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Monitoring & Maintenance

### Health Checks

```typescript
class HealthService {
  async runHealthChecks(): Promise<HealthReport> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkDiskSpace(),
      this.checkMemoryUsage(),
      this.checkNetworkConnectivity()
    ]);
    
    return {
      status: checks.every(c => c.status === 'OK') ? 'OK' : 'WARN',
      checks
    };
  }
}
```

### Logging Strategy

```typescript
// Structured logging
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
  },
  audit: (action: string, user: User, details?: any) => {
    console.log(`[AUDIT] ${action} by ${user.name}`, details);
  }
};
```

## Development Guidelines

### Code Style

1. **TypeScript**: Strict mode enabled, comprehensive type definitions
2. **ESLint**: Enforce consistent code style
3. **Prettier**: Automatic code formatting
4. **Naming Conventions**: camelCase for variables, PascalCase for components

### Git Workflow

1. **Feature Branches**: Create feature branches from main
2. **Commit Messages**: Use conventional commit format
3. **Pull Requests**: Required for all changes
4. **Code Review**: All changes must be reviewed

### Documentation

1. **Code Comments**: Document complex business logic
2. **API Documentation**: Document all service methods
3. **Component Documentation**: Document component props and usage
4. **README Files**: Keep project documentation updated

## Troubleshooting Guide

### Common Issues

1. **Database Connection**: Check SQLite file permissions
2. **Print Issues**: Verify printer configuration
3. **Performance**: Check database indexes and query optimization
4. **Memory Leaks**: Monitor component unmounting and cleanup

### Debug Tools

1. **React DevTools**: Component state inspection
2. **Redux DevTools**: State management debugging
3. **Network Tab**: API call monitoring
4. **Console Logs**: Application logging

## Conclusion

This technical implementation guide provides a comprehensive overview of the POS system's architecture, implementation patterns, and development guidelines. The system is built with modern technologies and follows industry best practices for maintainability, scalability, and performance.

The modular architecture allows for easy extension and customization, while the comprehensive testing strategy ensures reliability and quality. The documentation serves as a reference for developers working on the system and provides guidance for future enhancements and maintenance.