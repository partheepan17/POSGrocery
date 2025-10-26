/**
 * Feature Catalog
 * Programmatic representation of the POS system feature catalog
 * Mirrors the database structure for type safety and IDE support
 */

export interface Feature {
  code: string;
  name: string;
  description: string;
  isCore: boolean;
  dependsOn: string[];
  category?: string;
}

export interface Permission {
  code: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  code: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface FeaturePermission {
  featureCode: string;
  permissionCode: string;
}

/**
 * Complete feature catalog with 50 features
 */
export const FEATURES: Feature[] = [
  // Core Features
  {
    code: 'auth.login',
    name: 'User Login',
    description: 'Basic user authentication and login functionality',
    isCore: true,
    dependsOn: [],
    category: 'authentication'
  },
  {
    code: 'auth.logout',
    name: 'User Logout',
    description: 'User logout and session termination',
    isCore: true,
    dependsOn: ['auth.login'],
    category: 'authentication'
  },
  {
    code: 'auth.profile',
    name: 'User Profile',
    description: 'View and edit user profile information',
    isCore: true,
    dependsOn: ['auth.login'],
    category: 'authentication'
  },
  {
    code: 'auth.change_password',
    name: 'Change Password',
    description: 'Change user password functionality',
    isCore: true,
    dependsOn: ['auth.login'],
    category: 'authentication'
  },
  {
    code: 'dashboard.view',
    name: 'Dashboard View',
    description: 'View main dashboard with key metrics',
    isCore: true,
    dependsOn: ['auth.login'],
    category: 'dashboard'
  },
  {
    code: 'system.health',
    name: 'System Health',
    description: 'View system health and status information',
    isCore: true,
    dependsOn: ['auth.login'],
    category: 'system'
  },
  {
    code: 'settings.basic',
    name: 'Basic Settings',
    description: 'Access to basic system settings',
    isCore: true,
    dependsOn: ['auth.login'],
    category: 'settings'
  },

  // Sales Features
  {
    code: 'sales.view',
    name: 'View Sales',
    description: 'View sales transactions and history',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'sales'
  },
  {
    code: 'sales.create',
    name: 'Create Sale',
    description: 'Create new sales transactions',
    isCore: false,
    dependsOn: ['auth.login', 'products.view'],
    category: 'sales'
  },
  {
    code: 'sales.edit',
    name: 'Edit Sale',
    description: 'Edit existing sales transactions',
    isCore: false,
    dependsOn: ['sales.view'],
    category: 'sales'
  },
  {
    code: 'sales.void',
    name: 'Void Sale',
    description: 'Void or cancel sales transactions',
    isCore: false,
    dependsOn: ['sales.view'],
    category: 'sales'
  },
  {
    code: 'sales.return',
    name: 'Process Return',
    description: 'Process product returns and refunds',
    isCore: false,
    dependsOn: ['sales.view'],
    category: 'sales'
  },
  {
    code: 'sales.reprint',
    name: 'Reprint Receipt',
    description: 'Reprint sales receipts',
    isCore: false,
    dependsOn: ['sales.view'],
    category: 'sales'
  },
  {
    code: 'sales.hold',
    name: 'Hold Sale',
    description: 'Hold and resume sales transactions',
    isCore: false,
    dependsOn: ['sales.create'],
    category: 'sales'
  },
  {
    code: 'sales.resume',
    name: 'Resume Sale',
    description: 'Resume held sales transactions',
    isCore: false,
    dependsOn: ['sales.hold'],
    category: 'sales'
  },
  {
    code: 'sales.discount',
    name: 'Apply Discount',
    description: 'Apply discounts to sales transactions',
    isCore: false,
    dependsOn: ['sales.create'],
    category: 'sales'
  },
  {
    code: 'sales.payment',
    name: 'Process Payment',
    description: 'Process various payment methods',
    isCore: false,
    dependsOn: ['sales.create'],
    category: 'sales'
  },
  {
    code: 'sales.quick',
    name: 'Quick Sale',
    description: 'Quick sale functionality for fast transactions',
    isCore: false,
    dependsOn: ['sales.create'],
    category: 'sales'
  },
  {
    code: 'sales.bulk',
    name: 'Bulk Operations',
    description: 'Bulk sales operations and batch processing',
    isCore: false,
    dependsOn: ['sales.view'],
    category: 'sales'
  },

  // Product Features
  {
    code: 'products.view',
    name: 'View Products',
    description: 'View product catalog and details',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'products'
  },
  {
    code: 'products.create',
    name: 'Create Product',
    description: 'Create new products in catalog',
    isCore: false,
    dependsOn: ['auth.login', 'categories.view'],
    category: 'products'
  },
  {
    code: 'products.edit',
    name: 'Edit Product',
    description: 'Edit existing product information',
    isCore: false,
    dependsOn: ['products.view'],
    category: 'products'
  },
  {
    code: 'products.delete',
    name: 'Delete Product',
    description: 'Delete products from catalog',
    isCore: false,
    dependsOn: ['products.view'],
    category: 'products'
  },
  {
    code: 'products.bulk',
    name: 'Bulk Product Operations',
    description: 'Bulk product import/export operations',
    isCore: false,
    dependsOn: ['products.view'],
    category: 'products'
  },
  {
    code: 'products.barcode',
    name: 'Barcode Management',
    description: 'Manage product barcodes and scanning',
    isCore: false,
    dependsOn: ['products.view'],
    category: 'products'
  },
  {
    code: 'products.pricing',
    name: 'Pricing Management',
    description: 'Manage product pricing and price tiers',
    isCore: false,
    dependsOn: ['products.view'],
    category: 'products'
  },
  {
    code: 'products.categories',
    name: 'Category Management',
    description: 'Manage product categories',
    isCore: false,
    dependsOn: ['products.view'],
    category: 'products'
  },

  // Inventory Features
  {
    code: 'inventory.view',
    name: 'View Inventory',
    description: 'View current inventory levels and stock',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'inventory'
  },
  {
    code: 'inventory.adjust',
    name: 'Adjust Inventory',
    description: 'Adjust inventory quantities and levels',
    isCore: false,
    dependsOn: ['inventory.view'],
    category: 'inventory'
  },
  {
    code: 'inventory.receive',
    name: 'Receive Stock',
    description: 'Receive new stock and update inventory',
    isCore: false,
    dependsOn: ['inventory.view', 'suppliers.view'],
    category: 'inventory'
  },
  {
    code: 'inventory.transfer',
    name: 'Transfer Stock',
    description: 'Transfer stock between locations',
    isCore: false,
    dependsOn: ['inventory.view'],
    category: 'inventory'
  },
  {
    code: 'inventory.count',
    name: 'Stock Count',
    description: 'Perform physical stock counting',
    isCore: false,
    dependsOn: ['inventory.view'],
    category: 'inventory'
  },
  {
    code: 'inventory.reports',
    name: 'Inventory Reports',
    description: 'Generate inventory reports and analytics',
    isCore: false,
    dependsOn: ['inventory.view'],
    category: 'inventory'
  },
  {
    code: 'inventory.alerts',
    name: 'Stock Alerts',
    description: 'View and manage low stock alerts',
    isCore: false,
    dependsOn: ['inventory.view'],
    category: 'inventory'
  },
  {
    code: 'inventory.lots',
    name: 'Lot Management',
    description: 'Manage product lots and batch tracking',
    isCore: false,
    dependsOn: ['inventory.view'],
    category: 'inventory'
  },

  // Customer Features
  {
    code: 'customers.view',
    name: 'View Customers',
    description: 'View customer information and history',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'customers'
  },
  {
    code: 'customers.create',
    name: 'Create Customer',
    description: 'Create new customer records',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'customers'
  },
  {
    code: 'customers.edit',
    name: 'Edit Customer',
    description: 'Edit existing customer information',
    isCore: false,
    dependsOn: ['customers.view'],
    category: 'customers'
  },
  {
    code: 'customers.delete',
    name: 'Delete Customer',
    description: 'Delete customer records',
    isCore: false,
    dependsOn: ['customers.view'],
    category: 'customers'
  },
  {
    code: 'customers.loyalty',
    name: 'Loyalty Program',
    description: 'Manage customer loyalty programs',
    isCore: false,
    dependsOn: ['customers.view'],
    category: 'customers'
  },
  {
    code: 'customers.credit',
    name: 'Credit Management',
    description: 'Manage customer credit accounts',
    isCore: false,
    dependsOn: ['customers.view'],
    category: 'customers'
  },

  // Reporting Features
  {
    code: 'reports.sales',
    name: 'Sales Reports',
    description: 'Generate sales reports and analytics',
    isCore: false,
    dependsOn: ['auth.login', 'sales.view'],
    category: 'reports'
  },
  {
    code: 'reports.inventory',
    name: 'Inventory Reports',
    description: 'Generate inventory reports and analytics',
    isCore: false,
    dependsOn: ['auth.login', 'inventory.view'],
    category: 'reports'
  },
  {
    code: 'reports.financial',
    name: 'Financial Reports',
    description: 'Generate financial reports and P&L',
    isCore: false,
    dependsOn: ['auth.login', 'sales.view'],
    category: 'reports'
  },
  {
    code: 'reports.customers',
    name: 'Customer Reports',
    description: 'Generate customer analytics reports',
    isCore: false,
    dependsOn: ['auth.login', 'customers.view'],
    category: 'reports'
  },
  {
    code: 'reports.performance',
    name: 'Performance Reports',
    description: 'Generate performance and KPI reports',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'reports'
  },
  {
    code: 'reports.export',
    name: 'Export Reports',
    description: 'Export reports to various formats',
    isCore: false,
    dependsOn: ['reports.sales'],
    category: 'reports'
  },
  {
    code: 'reports.scheduled',
    name: 'Scheduled Reports',
    description: 'Schedule and automate report generation',
    isCore: false,
    dependsOn: ['reports.sales'],
    category: 'reports'
  },

  // Administration Features
  {
    code: 'admin.users',
    name: 'User Management',
    description: 'Manage system users and accounts',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'admin'
  },
  {
    code: 'admin.roles',
    name: 'Role Management',
    description: 'Manage user roles and permissions',
    isCore: false,
    dependsOn: ['admin.users'],
    category: 'admin'
  },
  {
    code: 'admin.settings',
    name: 'System Settings',
    description: 'Configure system-wide settings',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'admin'
  },
  {
    code: 'admin.backup',
    name: 'Backup Management',
    description: 'Manage system backups and restore',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'admin'
  },
  {
    code: 'admin.audit',
    name: 'Audit Logs',
    description: 'View system audit logs and activity',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'admin'
  },
  {
    code: 'admin.features',
    name: 'Feature Management',
    description: 'Enable/disable system features',
    isCore: false,
    dependsOn: ['admin.settings'],
    category: 'admin'
  },
  {
    code: 'admin.tenants',
    name: 'Tenant Management',
    description: 'Manage multi-tenant configurations',
    isCore: false,
    dependsOn: ['admin.settings'],
    category: 'admin'
  },

  // Hardware Features
  {
    code: 'hardware.printer',
    name: 'Printer Management',
    description: 'Manage receipt and label printers',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'hardware'
  },
  {
    code: 'hardware.scanner',
    name: 'Scanner Management',
    description: 'Manage barcode scanners',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'hardware'
  },
  {
    code: 'hardware.cash_drawer',
    name: 'Cash Drawer',
    description: 'Manage cash drawer operations',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'hardware'
  },
  {
    code: 'hardware.display',
    name: 'Customer Display',
    description: 'Manage customer display screens',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'hardware'
  },

  // Integration Features
  {
    code: 'integration.accounting',
    name: 'Accounting Integration',
    description: 'Integrate with accounting systems',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'integration'
  },
  {
    code: 'integration.ecommerce',
    name: 'E-commerce Integration',
    description: 'Integrate with e-commerce platforms',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'integration'
  },
  {
    code: 'integration.api',
    name: 'API Access',
    description: 'Access to system APIs',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'integration'
  },
  {
    code: 'integration.webhooks',
    name: 'Webhook Management',
    description: 'Manage webhook integrations',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'integration'
  },

  // Security Features
  {
    code: 'security.2fa',
    name: 'Two-Factor Authentication',
    description: 'Enable 2FA for enhanced security',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'security'
  },
  {
    code: 'security.sessions',
    name: 'Session Management',
    description: 'Manage user sessions and security',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'security'
  },
  {
    code: 'security.encryption',
    name: 'Data Encryption',
    description: 'Manage data encryption settings',
    isCore: false,
    dependsOn: ['admin.settings'],
    category: 'security'
  },

  // Supplier Features
  {
    code: 'suppliers.view',
    name: 'View Suppliers',
    description: 'View supplier information',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'suppliers'
  },
  {
    code: 'suppliers.create',
    name: 'Create Supplier',
    description: 'Create new supplier records',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'suppliers'
  },
  {
    code: 'suppliers.edit',
    name: 'Edit Supplier',
    description: 'Edit supplier information',
    isCore: false,
    dependsOn: ['suppliers.view'],
    category: 'suppliers'
  },
  {
    code: 'suppliers.purchase_orders',
    name: 'Purchase Orders',
    description: 'Manage purchase orders',
    isCore: false,
    dependsOn: ['suppliers.view'],
    category: 'suppliers'
  },

  // Categories
  {
    code: 'categories.view',
    name: 'View Categories',
    description: 'View product categories',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'categories'
  },
  {
    code: 'categories.create',
    name: 'Create Category',
    description: 'Create new product categories',
    isCore: false,
    dependsOn: ['auth.login'],
    category: 'categories'
  },
  {
    code: 'categories.edit',
    name: 'Edit Category',
    description: 'Edit product categories',
    isCore: false,
    dependsOn: ['categories.view'],
    category: 'categories'
  },
  {
    code: 'categories.delete',
    name: 'Delete Category',
    description: 'Delete product categories',
    isCore: false,
    dependsOn: ['categories.view'],
    category: 'categories'
  }
];

/**
 * Permission definitions
 */
export const PERMISSIONS: Permission[] = [
  // Authentication & Profile
  { code: 'auth.login', name: 'Login', description: 'User login capability', category: 'auth' },
  { code: 'auth.logout', name: 'Logout', description: 'User logout capability', category: 'auth' },
  { code: 'auth.profile.view', name: 'View Profile', description: 'View own profile information', category: 'auth' },
  { code: 'auth.profile.edit', name: 'Edit Profile', description: 'Edit own profile information', category: 'auth' },
  { code: 'auth.password.change', name: 'Change Password', description: 'Change own password', category: 'auth' },

  // Sales Operations
  { code: 'sales.view', name: 'View Sales', description: 'View sales transactions', category: 'sales' },
  { code: 'sales.create', name: 'Create Sale', description: 'Create new sales', category: 'sales' },
  { code: 'sales.edit', name: 'Edit Sale', description: 'Edit existing sales', category: 'sales' },
  { code: 'sales.void', name: 'Void Sale', description: 'Void sales transactions', category: 'sales' },
  { code: 'sales.return', name: 'Process Return', description: 'Process returns and refunds', category: 'sales' },
  { code: 'sales.reprint', name: 'Reprint Receipt', description: 'Reprint sales receipts', category: 'sales' },
  { code: 'sales.hold', name: 'Hold Sale', description: 'Hold sales transactions', category: 'sales' },
  { code: 'sales.resume', name: 'Resume Sale', description: 'Resume held sales', category: 'sales' },
  { code: 'sales.discount.apply', name: 'Apply Discount', description: 'Apply discounts to sales', category: 'sales' },
  { code: 'sales.payment.process', name: 'Process Payment', description: 'Process payment methods', category: 'sales' },
  { code: 'sales.quick', name: 'Quick Sale', description: 'Quick sale operations', category: 'sales' },
  { code: 'sales.bulk', name: 'Bulk Sales', description: 'Bulk sales operations', category: 'sales' },

  // Product Management
  { code: 'products.view', name: 'View Products', description: 'View product catalog', category: 'products' },
  { code: 'products.create', name: 'Create Product', description: 'Create new products', category: 'products' },
  { code: 'products.edit', name: 'Edit Product', description: 'Edit product information', category: 'products' },
  { code: 'products.delete', name: 'Delete Product', description: 'Delete products', category: 'products' },
  { code: 'products.bulk', name: 'Bulk Products', description: 'Bulk product operations', category: 'products' },
  { code: 'products.barcode.manage', name: 'Manage Barcodes', description: 'Manage product barcodes', category: 'products' },
  { code: 'products.pricing.manage', name: 'Manage Pricing', description: 'Manage product pricing', category: 'products' },

  // Inventory Management
  { code: 'inventory.view', name: 'View Inventory', description: 'View inventory levels', category: 'inventory' },
  { code: 'inventory.adjust', name: 'Adjust Inventory', description: 'Adjust inventory quantities', category: 'inventory' },
  { code: 'inventory.receive', name: 'Receive Stock', description: 'Receive new stock', category: 'inventory' },
  { code: 'inventory.transfer', name: 'Transfer Stock', description: 'Transfer stock between locations', category: 'inventory' },
  { code: 'inventory.count', name: 'Stock Count', description: 'Perform stock counting', category: 'inventory' },
  { code: 'inventory.reports', name: 'Inventory Reports', description: 'Generate inventory reports', category: 'inventory' },
  { code: 'inventory.alerts', name: 'Stock Alerts', description: 'Manage stock alerts', category: 'inventory' },
  { code: 'inventory.lots', name: 'Lot Management', description: 'Manage product lots', category: 'inventory' },

  // Customer Management
  { code: 'customers.view', name: 'View Customers', description: 'View customer information', category: 'customers' },
  { code: 'customers.create', name: 'Create Customer', description: 'Create new customers', category: 'customers' },
  { code: 'customers.edit', name: 'Edit Customer', description: 'Edit customer information', category: 'customers' },
  { code: 'customers.delete', name: 'Delete Customer', description: 'Delete customers', category: 'customers' },
  { code: 'customers.loyalty', name: 'Loyalty Program', description: 'Manage loyalty programs', category: 'customers' },
  { code: 'customers.credit', name: 'Credit Management', description: 'Manage customer credit', category: 'customers' },

  // Reporting
  { code: 'reports.view', name: 'View Reports', description: 'View all reports', category: 'reports' },
  { code: 'reports.sales', name: 'Sales Reports', description: 'Generate sales reports', category: 'reports' },
  { code: 'reports.inventory', name: 'Inventory Reports', description: 'Generate inventory reports', category: 'reports' },
  { code: 'reports.financial', name: 'Financial Reports', description: 'Generate financial reports', category: 'reports' },
  { code: 'reports.customers', name: 'Customer Reports', description: 'Generate customer reports', category: 'reports' },
  { code: 'reports.performance', name: 'Performance Reports', description: 'Generate performance reports', category: 'reports' },
  { code: 'reports.export', name: 'Export Reports', description: 'Export reports to files', category: 'reports' },
  { code: 'reports.scheduled', name: 'Scheduled Reports', description: 'Manage scheduled reports', category: 'reports' },

  // Administration
  { code: 'admin.users.view', name: 'View Users', description: 'View system users', category: 'admin' },
  { code: 'admin.users.create', name: 'Create Users', description: 'Create new users', category: 'admin' },
  { code: 'admin.users.edit', name: 'Edit Users', description: 'Edit user accounts', category: 'admin' },
  { code: 'admin.users.delete', name: 'Delete Users', description: 'Delete user accounts', category: 'admin' },
  { code: 'admin.roles.view', name: 'View Roles', description: 'View user roles', category: 'admin' },
  { code: 'admin.roles.create', name: 'Create Roles', description: 'Create new roles', category: 'admin' },
  { code: 'admin.roles.edit', name: 'Edit Roles', description: 'Edit roles and permissions', category: 'admin' },
  { code: 'admin.roles.delete', name: 'Delete Roles', description: 'Delete roles', category: 'admin' },
  { code: 'admin.settings.view', name: 'View Settings', description: 'View system settings', category: 'admin' },
  { code: 'admin.settings.edit', name: 'Edit Settings', description: 'Edit system settings', category: 'admin' },
  { code: 'admin.backup.create', name: 'Create Backup', description: 'Create system backups', category: 'admin' },
  { code: 'admin.backup.restore', name: 'Restore Backup', description: 'Restore from backups', category: 'admin' },
  { code: 'admin.audit.view', name: 'View Audit Logs', description: 'View audit logs', category: 'admin' },
  { code: 'admin.features.toggle', name: 'Toggle Features', description: 'Enable/disable features', category: 'admin' },
  { code: 'admin.tenants.manage', name: 'Manage Tenants', description: 'Manage multi-tenant settings', category: 'admin' },

  // Hardware Management
  { code: 'hardware.printer.test', name: 'Test Printer', description: 'Test printer functionality', category: 'hardware' },
  { code: 'hardware.printer.manage', name: 'Manage Printers', description: 'Manage printer settings', category: 'hardware' },
  { code: 'hardware.scanner.manage', name: 'Manage Scanners', description: 'Manage scanner settings', category: 'hardware' },
  { code: 'hardware.cash_drawer.manage', name: 'Manage Cash Drawer', description: 'Manage cash drawer', category: 'hardware' },
  { code: 'hardware.display.manage', name: 'Manage Display', description: 'Manage customer display', category: 'hardware' },

  // Integration
  { code: 'integration.accounting.manage', name: 'Manage Accounting', description: 'Manage accounting integration', category: 'integration' },
  { code: 'integration.ecommerce.manage', name: 'Manage E-commerce', description: 'Manage e-commerce integration', category: 'integration' },
  { code: 'integration.api.manage', name: 'Manage API', description: 'Manage API access', category: 'integration' },
  { code: 'integration.webhooks.manage', name: 'Manage Webhooks', description: 'Manage webhook integrations', category: 'integration' },

  // Security
  { code: 'security.2fa.manage', name: 'Manage 2FA', description: 'Manage two-factor authentication', category: 'security' },
  { code: 'security.sessions.manage', name: 'Manage Sessions', description: 'Manage user sessions', category: 'security' },
  { code: 'security.encryption.manage', name: 'Manage Encryption', description: 'Manage data encryption', category: 'security' },

  // Suppliers
  { code: 'suppliers.view', name: 'View Suppliers', description: 'View supplier information', category: 'suppliers' },
  { code: 'suppliers.create', name: 'Create Supplier', description: 'Create new suppliers', category: 'suppliers' },
  { code: 'suppliers.edit', name: 'Edit Supplier', description: 'Edit supplier information', category: 'suppliers' },
  { code: 'suppliers.delete', name: 'Delete Supplier', description: 'Delete suppliers', category: 'suppliers' },
  { code: 'suppliers.purchase_orders', name: 'Purchase Orders', description: 'Manage purchase orders', category: 'suppliers' },

  // Categories
  { code: 'categories.view', name: 'View Categories', description: 'View product categories', category: 'categories' },
  { code: 'categories.create', name: 'Create Category', description: 'Create new categories', category: 'categories' },
  { code: 'categories.edit', name: 'Edit Category', description: 'Edit categories', category: 'categories' },
  { code: 'categories.delete', name: 'Delete Category', description: 'Delete categories', category: 'categories' }
];

/**
 * Role definitions with their permissions
 */
export const ROLES: Role[] = [
  {
    code: 'admin',
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: PERMISSIONS.map(p => p.code) // All permissions
  },
  {
    code: 'supervisor',
    name: 'Supervisor',
    description: 'Management access with most permissions except critical admin functions',
    permissions: PERMISSIONS
      .filter(p => ![
        'admin.users.delete',
        'admin.roles.delete',
        'admin.backup.restore',
        'admin.features.toggle',
        'admin.tenants.manage',
        'security.encryption.manage'
      ].includes(p.code))
      .map(p => p.code)
  },
  {
    code: 'cashier',
    name: 'Cashier',
    description: 'Basic POS operations and customer service',
    permissions: [
      'auth.login',
      'auth.logout',
      'auth.profile.view',
      'auth.profile.edit',
      'auth.password.change',
      'sales.view',
      'sales.create',
      'sales.edit',
      'sales.void',
      'sales.return',
      'sales.reprint',
      'sales.hold',
      'sales.resume',
      'sales.discount.apply',
      'sales.payment.process',
      'sales.quick',
      'products.view',
      'customers.view',
      'customers.create',
      'customers.edit',
      'hardware.printer.test',
      'categories.view'
    ]
  }
];

/**
 * Feature-Permission mappings
 */
export const FEATURE_PERMISSIONS: FeaturePermission[] = [
  // Authentication features
  { featureCode: 'auth.login', permissionCode: 'auth.login' },
  { featureCode: 'auth.logout', permissionCode: 'auth.logout' },
  { featureCode: 'auth.profile', permissionCode: 'auth.profile.view' },
  { featureCode: 'auth.profile', permissionCode: 'auth.profile.edit' },
  { featureCode: 'auth.change_password', permissionCode: 'auth.password.change' },

  // Sales features
  { featureCode: 'sales.view', permissionCode: 'sales.view' },
  { featureCode: 'sales.create', permissionCode: 'sales.create' },
  { featureCode: 'sales.create', permissionCode: 'sales.payment.process' },
  { featureCode: 'sales.edit', permissionCode: 'sales.edit' },
  { featureCode: 'sales.void', permissionCode: 'sales.void' },
  { featureCode: 'sales.return', permissionCode: 'sales.return' },
  { featureCode: 'sales.reprint', permissionCode: 'sales.reprint' },
  { featureCode: 'sales.hold', permissionCode: 'sales.hold' },
  { featureCode: 'sales.resume', permissionCode: 'sales.resume' },
  { featureCode: 'sales.discount', permissionCode: 'sales.discount.apply' },
  { featureCode: 'sales.quick', permissionCode: 'sales.quick' },
  { featureCode: 'sales.bulk', permissionCode: 'sales.bulk' },

  // Product features
  { featureCode: 'products.view', permissionCode: 'products.view' },
  { featureCode: 'products.create', permissionCode: 'products.create' },
  { featureCode: 'products.create', permissionCode: 'categories.view' },
  { featureCode: 'products.edit', permissionCode: 'products.edit' },
  { featureCode: 'products.delete', permissionCode: 'products.delete' },
  { featureCode: 'products.bulk', permissionCode: 'products.bulk' },
  { featureCode: 'products.barcode', permissionCode: 'products.barcode.manage' },
  { featureCode: 'products.pricing', permissionCode: 'products.pricing.manage' },
  { featureCode: 'products.categories', permissionCode: 'categories.view' },
  { featureCode: 'products.categories', permissionCode: 'categories.create' },
  { featureCode: 'products.categories', permissionCode: 'categories.edit' },
  { featureCode: 'products.categories', permissionCode: 'categories.delete' },

  // Inventory features
  { featureCode: 'inventory.view', permissionCode: 'inventory.view' },
  { featureCode: 'inventory.adjust', permissionCode: 'inventory.adjust' },
  { featureCode: 'inventory.receive', permissionCode: 'inventory.receive' },
  { featureCode: 'inventory.receive', permissionCode: 'suppliers.view' },
  { featureCode: 'inventory.transfer', permissionCode: 'inventory.transfer' },
  { featureCode: 'inventory.count', permissionCode: 'inventory.count' },
  { featureCode: 'inventory.reports', permissionCode: 'inventory.reports' },
  { featureCode: 'inventory.alerts', permissionCode: 'inventory.alerts' },
  { featureCode: 'inventory.lots', permissionCode: 'inventory.lots' },

  // Customer features
  { featureCode: 'customers.view', permissionCode: 'customers.view' },
  { featureCode: 'customers.create', permissionCode: 'customers.create' },
  { featureCode: 'customers.edit', permissionCode: 'customers.edit' },
  { featureCode: 'customers.delete', permissionCode: 'customers.delete' },
  { featureCode: 'customers.loyalty', permissionCode: 'customers.loyalty' },
  { featureCode: 'customers.credit', permissionCode: 'customers.credit' },

  // Reporting features
  { featureCode: 'reports.sales', permissionCode: 'reports.sales' },
  { featureCode: 'reports.inventory', permissionCode: 'reports.inventory' },
  { featureCode: 'reports.financial', permissionCode: 'reports.financial' },
  { featureCode: 'reports.customers', permissionCode: 'reports.customers' },
  { featureCode: 'reports.performance', permissionCode: 'reports.performance' },
  { featureCode: 'reports.export', permissionCode: 'reports.export' },
  { featureCode: 'reports.scheduled', permissionCode: 'reports.scheduled' },

  // Admin features
  { featureCode: 'admin.users', permissionCode: 'admin.users.view' },
  { featureCode: 'admin.users', permissionCode: 'admin.users.create' },
  { featureCode: 'admin.users', permissionCode: 'admin.users.edit' },
  { featureCode: 'admin.users', permissionCode: 'admin.users.delete' },
  { featureCode: 'admin.roles', permissionCode: 'admin.roles.view' },
  { featureCode: 'admin.roles', permissionCode: 'admin.roles.create' },
  { featureCode: 'admin.roles', permissionCode: 'admin.roles.edit' },
  { featureCode: 'admin.roles', permissionCode: 'admin.roles.delete' },
  { featureCode: 'admin.settings', permissionCode: 'admin.settings.view' },
  { featureCode: 'admin.settings', permissionCode: 'admin.settings.edit' },
  { featureCode: 'admin.backup', permissionCode: 'admin.backup.create' },
  { featureCode: 'admin.backup', permissionCode: 'admin.backup.restore' },
  { featureCode: 'admin.audit', permissionCode: 'admin.audit.view' },
  { featureCode: 'admin.features', permissionCode: 'admin.features.toggle' },
  { featureCode: 'admin.tenants', permissionCode: 'admin.tenants.manage' },

  // Hardware features
  { featureCode: 'hardware.printer', permissionCode: 'hardware.printer.test' },
  { featureCode: 'hardware.printer', permissionCode: 'hardware.printer.manage' },
  { featureCode: 'hardware.scanner', permissionCode: 'hardware.scanner.manage' },
  { featureCode: 'hardware.cash_drawer', permissionCode: 'hardware.cash_drawer.manage' },
  { featureCode: 'hardware.display', permissionCode: 'hardware.display.manage' },

  // Integration features
  { featureCode: 'integration.accounting', permissionCode: 'integration.accounting.manage' },
  { featureCode: 'integration.ecommerce', permissionCode: 'integration.ecommerce.manage' },
  { featureCode: 'integration.api', permissionCode: 'integration.api.manage' },
  { featureCode: 'integration.webhooks', permissionCode: 'integration.webhooks.manage' },

  // Security features
  { featureCode: 'security.2fa', permissionCode: 'security.2fa.manage' },
  { featureCode: 'security.sessions', permissionCode: 'security.sessions.manage' },
  { featureCode: 'security.encryption', permissionCode: 'security.encryption.manage' },

  // Supplier features
  { featureCode: 'suppliers.view', permissionCode: 'suppliers.view' },
  { featureCode: 'suppliers.create', permissionCode: 'suppliers.create' },
  { featureCode: 'suppliers.edit', permissionCode: 'suppliers.edit' },
  { featureCode: 'suppliers.purchase_orders', permissionCode: 'suppliers.purchase_orders' },

  // Category features
  { featureCode: 'categories.view', permissionCode: 'categories.view' },
  { featureCode: 'categories.create', permissionCode: 'categories.create' },
  { featureCode: 'categories.edit', permissionCode: 'categories.edit' },
  { featureCode: 'categories.delete', permissionCode: 'categories.delete' }
];

/**
 * Utility functions for working with the feature catalog
 */
export class FeatureCatalog {
  /**
   * Get all features by category
   */
  static getFeaturesByCategory(category: string): Feature[] {
    return FEATURES.filter(f => f.category === category);
  }

  /**
   * Get core features only
   */
  static getCoreFeatures(): Feature[] {
    return FEATURES.filter(f => f.isCore);
  }

  /**
   * Get non-core features only
   */
  static getOptionalFeatures(): Feature[] {
    return FEATURES.filter(f => !f.isCore);
  }

  /**
   * Get feature by code
   */
  static getFeature(code: string): Feature | undefined {
    return FEATURES.find(f => f.code === code);
  }

  /**
   * Get permissions for a feature
   */
  static getFeaturePermissions(featureCode: string): string[] {
    return FEATURE_PERMISSIONS
      .filter(fp => fp.featureCode === featureCode)
      .map(fp => fp.permissionCode);
  }

  /**
   * Get features that depend on a given feature
   */
  static getDependentFeatures(featureCode: string): Feature[] {
    return FEATURES.filter(f => f.dependsOn.includes(featureCode));
  }

  /**
   * Get all features that a feature depends on (recursive)
   */
  static getFeatureDependencies(featureCode: string): string[] {
    const feature = this.getFeature(featureCode);
    if (!feature) return [];

    const dependencies = new Set<string>();
    const addDependencies = (code: string) => {
      const f = this.getFeature(code);
      if (f) {
        f.dependsOn.forEach(dep => {
          if (!dependencies.has(dep)) {
            dependencies.add(dep);
            addDependencies(dep);
          }
        });
      }
    };

    addDependencies(featureCode);
    return Array.from(dependencies);
  }

  /**
   * Check if a feature can be enabled (all dependencies satisfied)
   */
  static canEnableFeature(featureCode: string, enabledFeatures: string[]): boolean {
    const dependencies = this.getFeatureDependencies(featureCode);
    return dependencies.every(dep => enabledFeatures.includes(dep));
  }

  /**
   * Get role by code
   */
  static getRole(code: string): Role | undefined {
    return ROLES.find(r => r.code === code);
  }

  /**
   * Get permission by code
   */
  static getPermission(code: string): Permission | undefined {
    return PERMISSIONS.find(p => p.code === code);
  }

  /**
   * Get all categories
   */
  static getCategories(): string[] {
    const categories = new Set<string>();
    FEATURES.forEach(f => {
      if (f.category) categories.add(f.category);
    });
    return Array.from(categories).sort();
  }
}










