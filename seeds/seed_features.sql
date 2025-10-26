-- Feature Catalog Seed Data
-- 50 comprehensive features for POS system with dependencies and permissions

-- Core Features (is_core = 1)
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('auth.login', 'User Login', 'Basic user authentication and login functionality', 1, '[]'),
('auth.logout', 'User Logout', 'User logout and session termination', 1, '["auth.login"]'),
('auth.profile', 'User Profile', 'View and edit user profile information', 1, '["auth.login"]'),
('auth.change_password', 'Change Password', 'Change user password functionality', 1, '["auth.login"]'),
('dashboard.view', 'Dashboard View', 'View main dashboard with key metrics', 1, '["auth.login"]'),
('system.health', 'System Health', 'View system health and status information', 1, '["auth.login"]'),
('settings.basic', 'Basic Settings', 'Access to basic system settings', 1, '["auth.login"]');

-- Sales Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('sales.view', 'View Sales', 'View sales transactions and history', 0, '["auth.login"]'),
('sales.create', 'Create Sale', 'Create new sales transactions', 0, '["auth.login", "products.view"]'),
('sales.edit', 'Edit Sale', 'Edit existing sales transactions', 0, '["sales.view"]'),
('sales.void', 'Void Sale', 'Void or cancel sales transactions', 0, '["sales.view"]'),
('sales.return', 'Process Return', 'Process product returns and refunds', 0, '["sales.view"]'),
('sales.reprint', 'Reprint Receipt', 'Reprint sales receipts', 0, '["sales.view"]'),
('sales.hold', 'Hold Sale', 'Hold and resume sales transactions', 0, '["sales.create"]'),
('sales.resume', 'Resume Sale', 'Resume held sales transactions', 0, '["sales.hold"]'),
('sales.discount', 'Apply Discount', 'Apply discounts to sales transactions', 0, '["sales.create"]'),
('sales.payment', 'Process Payment', 'Process various payment methods', 0, '["sales.create"]'),
('sales.quick', 'Quick Sale', 'Quick sale functionality for fast transactions', 0, '["sales.create"]'),
('sales.bulk', 'Bulk Operations', 'Bulk sales operations and batch processing', 0, '["sales.view"]');

-- Product Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('products.view', 'View Products', 'View product catalog and details', 0, '["auth.login"]'),
('products.create', 'Create Product', 'Create new products in catalog', 0, '["auth.login", "categories.view"]'),
('products.edit', 'Edit Product', 'Edit existing product information', 0, '["products.view"]'),
('products.delete', 'Delete Product', 'Delete products from catalog', 0, '["products.view"]'),
('products.bulk', 'Bulk Product Operations', 'Bulk product import/export operations', 0, '["products.view"]'),
('products.barcode', 'Barcode Management', 'Manage product barcodes and scanning', 0, '["products.view"]'),
('products.pricing', 'Pricing Management', 'Manage product pricing and price tiers', 0, '["products.view"]'),
('products.categories', 'Category Management', 'Manage product categories', 0, '["products.view"]');

-- Inventory Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('inventory.view', 'View Inventory', 'View current inventory levels and stock', 0, '["auth.login"]'),
('inventory.adjust', 'Adjust Inventory', 'Adjust inventory quantities and levels', 0, '["inventory.view"]'),
('inventory.receive', 'Receive Stock', 'Receive new stock and update inventory', 0, '["inventory.view", "suppliers.view"]'),
('inventory.transfer', 'Transfer Stock', 'Transfer stock between locations', 0, '["inventory.view"]'),
('inventory.count', 'Stock Count', 'Perform physical stock counting', 0, '["inventory.view"]'),
('inventory.reports', 'Inventory Reports', 'Generate inventory reports and analytics', 0, '["inventory.view"]'),
('inventory.alerts', 'Stock Alerts', 'View and manage low stock alerts', 0, '["inventory.view"]'),
('inventory.lots', 'Lot Management', 'Manage product lots and batch tracking', 0, '["inventory.view"]');

-- Customer Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('customers.view', 'View Customers', 'View customer information and history', 0, '["auth.login"]'),
('customers.create', 'Create Customer', 'Create new customer records', 0, '["auth.login"]'),
('customers.edit', 'Edit Customer', 'Edit existing customer information', 0, '["customers.view"]'),
('customers.delete', 'Delete Customer', 'Delete customer records', 0, '["customers.view"]'),
('customers.loyalty', 'Loyalty Program', 'Manage customer loyalty programs', 0, '["customers.view"]'),
('customers.credit', 'Credit Management', 'Manage customer credit accounts', 0, '["customers.view"]');

-- Reporting Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('reports.sales', 'Sales Reports', 'Generate sales reports and analytics', 0, '["auth.login", "sales.view"]'),
('reports.inventory', 'Inventory Reports', 'Generate inventory reports and analytics', 0, '["auth.login", "inventory.view"]'),
('reports.financial', 'Financial Reports', 'Generate financial reports and P&L', 0, '["auth.login", "sales.view"]'),
('reports.customers', 'Customer Reports', 'Generate customer analytics reports', 0, '["auth.login", "customers.view"]'),
('reports.performance', 'Performance Reports', 'Generate performance and KPI reports', 0, '["auth.login"]'),
('reports.export', 'Export Reports', 'Export reports to various formats', 0, '["reports.sales"]'),
('reports.scheduled', 'Scheduled Reports', 'Schedule and automate report generation', 0, '["reports.sales"]');

-- Administration Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('admin.users', 'User Management', 'Manage system users and accounts', 0, '["auth.login"]'),
('admin.roles', 'Role Management', 'Manage user roles and permissions', 0, '["admin.users"]'),
('admin.settings', 'System Settings', 'Configure system-wide settings', 0, '["auth.login"]'),
('admin.backup', 'Backup Management', 'Manage system backups and restore', 0, '["auth.login"]'),
('admin.audit', 'Audit Logs', 'View system audit logs and activity', 0, '["auth.login"]'),
('admin.features', 'Feature Management', 'Enable/disable system features', 0, '["admin.settings"]'),
('admin.tenants', 'Tenant Management', 'Manage multi-tenant configurations', 0, '["admin.settings"]');

-- Hardware Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('hardware.printer', 'Printer Management', 'Manage receipt and label printers', 0, '["auth.login"]'),
('hardware.scanner', 'Scanner Management', 'Manage barcode scanners', 0, '["auth.login"]'),
('hardware.cash_drawer', 'Cash Drawer', 'Manage cash drawer operations', 0, '["auth.login"]'),
('hardware.display', 'Customer Display', 'Manage customer display screens', 0, '["auth.login"]');

-- Integration Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('integration.accounting', 'Accounting Integration', 'Integrate with accounting systems', 0, '["auth.login"]'),
('integration.ecommerce', 'E-commerce Integration', 'Integrate with e-commerce platforms', 0, '["auth.login"]'),
('integration.api', 'API Access', 'Access to system APIs', 0, '["auth.login"]'),
('integration.webhooks', 'Webhook Management', 'Manage webhook integrations', 0, '["auth.login"]');

-- Security Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('security.2fa', 'Two-Factor Authentication', 'Enable 2FA for enhanced security', 0, '["auth.login"]'),
('security.sessions', 'Session Management', 'Manage user sessions and security', 0, '["auth.login"]'),
('security.encryption', 'Data Encryption', 'Manage data encryption settings', 0, '["admin.settings"]');

-- Supplier Features
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('suppliers.view', 'View Suppliers', 'View supplier information', 0, '["auth.login"]'),
('suppliers.create', 'Create Supplier', 'Create new supplier records', 0, '["auth.login"]'),
('suppliers.edit', 'Edit Supplier', 'Edit supplier information', 0, '["suppliers.view"]'),
('suppliers.purchase_orders', 'Purchase Orders', 'Manage purchase orders', 0, '["suppliers.view"]');

-- Categories (for products)
INSERT INTO features (code, name, description, is_core, depends_on) VALUES
('categories.view', 'View Categories', 'View product categories', 0, '["auth.login"]'),
('categories.create', 'Create Category', 'Create new product categories', 0, '["auth.login"]'),
('categories.edit', 'Edit Category', 'Edit product categories', 0, '["categories.view"]'),
('categories.delete', 'Delete Category', 'Delete product categories', 0, '["categories.view"]');










