# POS Grocery System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Core Features](#core-features)
5. [GRN System (Goods Received Note)](#grn-system)
6. [User Interface](#user-interface)
7. [API Services](#api-services)
8. [Printing System](#printing-system)
9. [Internationalization](#internationalization)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Configuration](#configuration)

## System Overview

The POS Grocery System is a comprehensive point-of-sale application designed for grocery stores and retail businesses. It provides complete inventory management, sales processing, customer management, and reporting capabilities.

### Key Features
- **Sales Management**: Complete POS functionality with barcode scanning
- **Inventory Management**: Stock tracking, receiving, adjustments, and stocktaking
- **Customer Management**: Customer database and loyalty tracking
- **Supplier Management**: Supplier database and purchase order management
- **GRN System**: Goods Received Note system for inventory receiving
- **Returns Management**: Product returns and refund processing
- **Reporting**: Comprehensive sales, inventory, and financial reports
- **Multi-language Support**: English, Sinhala, and Tamil
- **Printing**: Receipt printing, label printing, and document generation
- **User Management**: Role-based access control and user authentication

## Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand
- **UI Components**: Custom component library with Tailwind CSS
- **Database**: SQLite with custom database service
- **Routing**: React Router v6
- **Internationalization**: Custom i18n system
- **Testing**: Vitest + Playwright
- **Build Tool**: Vite

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── Layout/         # Layout components
│   ├── Products/       # Product-related components
│   ├── Customers/      # Customer-related components
│   ├── Suppliers/      # Supplier-related components
│   ├── Inventory/      # Inventory management components
│   ├── Labels/         # Label printing components
│   ├── Discounts/      # Discount management components
│   ├── Hold/           # Hold sales components
│   ├── Security/       # Security and authentication components
│   └── Users/          # User management components
├── pages/              # Main application pages
├── services/           # Business logic and API services
├── store/              # State management (Zustand stores)
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── i18n/               # Internationalization
├── database/           # Database migrations and initialization
├── adapters/           # External service adapters
└── test/               # Test files
```

## Database Schema

### Core Tables

#### Products
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
    tax_code VARCHAR(50),
    price_retail DECIMAL(10,2) NOT NULL,
    price_wholesale DECIMAL(10,2) NOT NULL,
    price_credit DECIMAL(10,2) NOT NULL,
    price_other DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    reorder_level INTEGER,
    preferred_supplier_id INTEGER REFERENCES suppliers(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);
```

#### Sales
```sql
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    datetime TIMESTAMP DEFAULT now(),
    customer_id INTEGER REFERENCES customers(id),
    customer_name VARCHAR(255),
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100),
    cashier_id INTEGER REFERENCES users(id),
    cashier_name VARCHAR(255),
    terminal_id INTEGER REFERENCES terminals(id),
    terminal_name VARCHAR(100),
    language VARCHAR(10) DEFAULT 'EN',
    created_at TIMESTAMP DEFAULT now()
);
```

#### GRN (Goods Received Note)
```sql
CREATE TABLE grn (
    id INTEGER PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    grn_no TEXT UNIQUE,
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_by INTEGER REFERENCES users(id),
    note TEXT,
    status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN','POSTED','VOID')),
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    other DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE grn_lines (
    id INTEGER PRIMARY KEY,
    grn_id INTEGER NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty DECIMAL(10,3) NOT NULL CHECK(qty>0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK(unit_cost>=0),
    mrp DECIMAL(10,2) NULL,
    batch_no TEXT NULL,
    expiry_date DATE NULL,
    line_total DECIMAL(10,2) NOT NULL
);
```

## Core Features

### 1. Sales Management
- **Point of Sale**: Complete POS interface with barcode scanning
- **Product Search**: Search by SKU, barcode, or name
- **Quantity Management**: Add/remove items with quantity controls
- **Pricing**: Multiple price levels (retail, wholesale, credit, other)
- **Discounts**: Line-level and transaction-level discounts
- **Payment Processing**: Cash, card, wallet, and store credit
- **Receipt Printing**: Thermal receipt printing
- **Hold Sales**: Save and resume incomplete sales

### 2. Inventory Management
- **Stock Tracking**: Real-time stock levels
- **Receiving**: GRN system for inventory receiving
- **Adjustments**: Stock adjustment with reasons
- **Stocktaking**: Physical inventory counting
- **Reorder Management**: Automatic reorder level alerts
- **Batch Tracking**: Batch number and expiry date management

### 3. Customer Management
- **Customer Database**: Complete customer information
- **Loyalty Tracking**: Customer purchase history
- **Credit Management**: Store credit and payment terms
- **Customer Search**: Search by name, phone, or email

### 4. Supplier Management
- **Supplier Database**: Complete supplier information
- **Purchase Orders**: Create and manage purchase orders
- **GRN Processing**: Goods received note processing
- **Supplier Performance**: Track supplier delivery and quality

## GRN System (Goods Received Note)

The GRN system is a comprehensive inventory receiving solution that allows stores to:

### Features
- **Create GRNs**: Create new Goods Received Notes for suppliers
- **Add Products**: Add products to GRN with quantities and costs
- **Batch Tracking**: Track batch numbers and expiry dates
- **Cost Management**: Update product costs based on received items
- **Status Management**: Track GRN status (OPEN, POSTED, VOID)
- **Printing**: Print GRN slips and labels
- **CSV Import/Export**: Import/export GRN data

### GRN Workflow
1. **Create GRN**: Select supplier and create new GRN
2. **Add Items**: Search and add products with quantities
3. **Set Details**: Add batch numbers, expiry dates, and costs
4. **Review**: Review GRN details and totals
5. **Post**: Post GRN to update inventory and costs
6. **Print**: Print GRN slip and labels

### GRN Settings
- **Auto Numbering**: Automatic GRN number generation
- **Cost Update Policy**: How to update product costs
- **Expiry Reminders**: Days before expiry to show warnings
- **Default Tax**: Default tax percentage for GRNs

## User Interface

### Main Navigation
- **Sales**: Point of sale interface
- **Products**: Product management
- **Customers**: Customer management
- **Suppliers**: Supplier management
- **Inventory**: Inventory management
- **GRN**: Goods Received Note system
- **Returns**: Product returns
- **Reports**: Reporting and analytics
- **Settings**: System configuration
- **Users**: User management

### Key UI Components
- **Search Bar**: Global search functionality
- **Data Tables**: Sortable and filterable data tables
- **Modals**: Form modals for data entry
- **Dropdowns**: Custom dropdown components
- **Buttons**: Consistent button styling
- **Forms**: Form components with validation
- **Cards**: Information display cards
- **Badges**: Status and priority indicators

## API Services

### Core Services
- **dataService**: Database operations and data management
- **posService**: Point of sale operations
- **inventoryService**: Inventory management
- **grnService**: GRN system operations
- **customerService**: Customer management
- **supplierService**: Supplier management
- **reportService**: Reporting and analytics
- **userService**: User management
- **authService**: Authentication and authorization

### Service Features
- **CRUD Operations**: Create, read, update, delete operations
- **Data Validation**: Input validation and error handling
- **Transaction Management**: Database transaction support
- **Error Handling**: Comprehensive error handling
- **Logging**: Service-level logging

## Printing System

### Print Adapters
- **ReceiptPrintAdapter**: Thermal receipt printing
- **GRNPrintAdapter**: A4 GRN slip printing
- **LabelPrintAdapter**: Label printing for products
- **ReportPrintAdapter**: Report printing

### Print Features
- **Multiple Formats**: Support for different paper sizes
- **Custom Templates**: Customizable print templates
- **Multi-language**: Print in different languages
- **Batch Printing**: Print multiple items at once

## Internationalization

### Supported Languages
- **English (EN)**: Primary language
- **Sinhala (SI)**: Sinhala language support
- **Tamil (TA)**: Tamil language support

### Translation Features
- **Dynamic Language Switching**: Change language on the fly
- **Context-aware Translations**: Translations based on context
- **Currency Formatting**: Localized currency formatting
- **Date Formatting**: Localized date formatting

## Testing

### Test Types
- **Unit Tests**: Vitest unit tests for services
- **Integration Tests**: Database integration tests
- **E2E Tests**: Playwright end-to-end tests
- **Component Tests**: React component tests

### Test Coverage
- **Service Layer**: All service methods tested
- **UI Components**: Key UI components tested
- **User Flows**: Complete user workflows tested
- **Error Handling**: Error scenarios tested

## Deployment

### Development
- **Local Development**: Vite dev server
- **Hot Reload**: Automatic reload on changes
- **Debug Mode**: Development debugging tools

### Production
- **Build Process**: Vite production build
- **Static Assets**: Optimized static assets
- **Database**: SQLite database file
- **Configuration**: Environment-based configuration

## Configuration

### Settings Store
- **Store Information**: Store name, address, tax ID
- **Device Settings**: Receipt printer, cash drawer, barcode scanner
- **Pricing Settings**: Price levels and tax settings
- **GRN Settings**: GRN-specific configuration
- **User Settings**: User preferences and permissions

### Environment Variables
- **Database Path**: SQLite database file location
- **API Endpoints**: External API endpoints
- **Feature Flags**: Enable/disable features
- **Debug Mode**: Development vs production mode

## Security

### Authentication
- **User Login**: Username/password authentication
- **Session Management**: Secure session handling
- **Password Security**: Password hashing and validation

### Authorization
- **Role-based Access**: Different access levels
- **Permission System**: Granular permissions
- **Route Protection**: Protected routes and components

### Data Security
- **Input Validation**: All inputs validated
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Cross-site scripting prevention

## Performance

### Optimization
- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Optimized JavaScript bundles
- **Database Indexing**: Optimized database queries
- **Caching**: Strategic caching of data

### Monitoring
- **Error Tracking**: Error logging and tracking
- **Performance Metrics**: Performance monitoring
- **User Analytics**: User behavior tracking

## Maintenance

### Database Maintenance
- **Migrations**: Database schema migrations
- **Backups**: Regular database backups
- **Cleanup**: Data cleanup and archiving

### Code Maintenance
- **Code Quality**: ESLint and Prettier
- **Type Safety**: TypeScript type checking
- **Documentation**: Comprehensive code documentation

## Support

### Troubleshooting
- **Error Messages**: Clear error messages
- **Logging**: Comprehensive logging system
- **Debug Tools**: Development debugging tools

### Updates
- **Version Control**: Git version control
- **Release Notes**: Detailed release notes
- **Migration Guides**: Update migration guides

---

This documentation provides a comprehensive overview of the POS Grocery System. For specific implementation details, refer to the source code and individual component documentation.


