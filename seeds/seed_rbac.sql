-- RBAC Seed Data
-- Roles, Permissions, and Mappings for POS System

-- Insert Roles
INSERT INTO roles (code, name, description) VALUES
('admin', 'Administrator', 'Full system access with all permissions'),
('supervisor', 'Supervisor', 'Management access with most permissions except critical admin functions'),
('cashier', 'Cashier', 'Basic POS operations and customer service');

-- Insert Permissions
INSERT INTO permissions (code, name, description, category) VALUES
-- Authentication & Profile
('auth.login', 'Login', 'User login capability', 'auth'),
('auth.logout', 'Logout', 'User logout capability', 'auth'),
('auth.profile.view', 'View Profile', 'View own profile information', 'auth'),
('auth.profile.edit', 'Edit Profile', 'Edit own profile information', 'auth'),
('auth.password.change', 'Change Password', 'Change own password', 'auth'),

-- Sales Operations
('sales.view', 'View Sales', 'View sales transactions', 'sales'),
('sales.create', 'Create Sale', 'Create new sales', 'sales'),
('sales.edit', 'Edit Sale', 'Edit existing sales', 'sales'),
('sales.void', 'Void Sale', 'Void sales transactions', 'sales'),
('sales.return', 'Process Return', 'Process returns and refunds', 'sales'),
('sales.reprint', 'Reprint Receipt', 'Reprint sales receipts', 'sales'),
('sales.hold', 'Hold Sale', 'Hold sales transactions', 'sales'),
('sales.resume', 'Resume Sale', 'Resume held sales', 'sales'),
('sales.discount.apply', 'Apply Discount', 'Apply discounts to sales', 'sales'),
('sales.payment.process', 'Process Payment', 'Process payment methods', 'sales'),
('sales.quick', 'Quick Sale', 'Quick sale operations', 'sales'),
('sales.bulk', 'Bulk Sales', 'Bulk sales operations', 'sales'),

-- Product Management
('products.view', 'View Products', 'View product catalog', 'products'),
('products.create', 'Create Product', 'Create new products', 'products'),
('products.edit', 'Edit Product', 'Edit product information', 'products'),
('products.delete', 'Delete Product', 'Delete products', 'products'),
('products.bulk', 'Bulk Products', 'Bulk product operations', 'products'),
('products.barcode.manage', 'Manage Barcodes', 'Manage product barcodes', 'products'),
('products.pricing.manage', 'Manage Pricing', 'Manage product pricing', 'products'),

-- Inventory Management
('inventory.view', 'View Inventory', 'View inventory levels', 'inventory'),
('inventory.adjust', 'Adjust Inventory', 'Adjust inventory quantities', 'inventory'),
('inventory.receive', 'Receive Stock', 'Receive new stock', 'inventory'),
('inventory.transfer', 'Transfer Stock', 'Transfer stock between locations', 'inventory'),
('inventory.count', 'Stock Count', 'Perform stock counting', 'inventory'),
('inventory.reports', 'Inventory Reports', 'Generate inventory reports', 'inventory'),
('inventory.alerts', 'Stock Alerts', 'Manage stock alerts', 'inventory'),
('inventory.lots', 'Lot Management', 'Manage product lots', 'inventory'),

-- Customer Management
('customers.view', 'View Customers', 'View customer information', 'customers'),
('customers.create', 'Create Customer', 'Create new customers', 'customers'),
('customers.edit', 'Edit Customer', 'Edit customer information', 'customers'),
('customers.delete', 'Delete Customer', 'Delete customers', 'customers'),
('customers.loyalty', 'Loyalty Program', 'Manage loyalty programs', 'customers'),
('customers.credit', 'Credit Management', 'Manage customer credit', 'customers'),

-- Reporting
('reports.view', 'View Reports', 'View all reports', 'reports'),
('reports.sales', 'Sales Reports', 'Generate sales reports', 'reports'),
('reports.inventory', 'Inventory Reports', 'Generate inventory reports', 'reports'),
('reports.financial', 'Financial Reports', 'Generate financial reports', 'reports'),
('reports.customers', 'Customer Reports', 'Generate customer reports', 'reports'),
('reports.performance', 'Performance Reports', 'Generate performance reports', 'reports'),
('reports.export', 'Export Reports', 'Export reports to files', 'reports'),
('reports.scheduled', 'Scheduled Reports', 'Manage scheduled reports', 'reports'),

-- Administration
('admin.users.view', 'View Users', 'View system users', 'admin'),
('admin.users.create', 'Create Users', 'Create new users', 'admin'),
('admin.users.edit', 'Edit Users', 'Edit user accounts', 'admin'),
('admin.users.delete', 'Delete Users', 'Delete user accounts', 'admin'),
('admin.roles.view', 'View Roles', 'View user roles', 'admin'),
('admin.roles.create', 'Create Roles', 'Create new roles', 'admin'),
('admin.roles.edit', 'Edit Roles', 'Edit roles and permissions', 'admin'),
('admin.roles.delete', 'Delete Roles', 'Delete roles', 'admin'),
('admin.settings.view', 'View Settings', 'View system settings', 'admin'),
('admin.settings.edit', 'Edit Settings', 'Edit system settings', 'admin'),
('admin.backup.create', 'Create Backup', 'Create system backups', 'admin'),
('admin.backup.restore', 'Restore Backup', 'Restore from backups', 'admin'),
('admin.audit.view', 'View Audit Logs', 'View audit logs', 'admin'),
('admin.features.toggle', 'Toggle Features', 'Enable/disable features', 'admin'),
('admin.tenants.manage', 'Manage Tenants', 'Manage multi-tenant settings', 'admin'),

-- Hardware Management
('hardware.printer.test', 'Test Printer', 'Test printer functionality', 'hardware'),
('hardware.printer.manage', 'Manage Printers', 'Manage printer settings', 'hardware'),
('hardware.scanner.manage', 'Manage Scanners', 'Manage scanner settings', 'hardware'),
('hardware.cash_drawer.manage', 'Manage Cash Drawer', 'Manage cash drawer', 'hardware'),
('hardware.display.manage', 'Manage Display', 'Manage customer display', 'hardware'),

-- Integration
('integration.accounting.manage', 'Manage Accounting', 'Manage accounting integration', 'integration'),
('integration.ecommerce.manage', 'Manage E-commerce', 'Manage e-commerce integration', 'integration'),
('integration.api.manage', 'Manage API', 'Manage API access', 'integration'),
('integration.webhooks.manage', 'Manage Webhooks', 'Manage webhook integrations', 'integration'),

-- Security
('security.2fa.manage', 'Manage 2FA', 'Manage two-factor authentication', 'security'),
('security.sessions.manage', 'Manage Sessions', 'Manage user sessions', 'security'),
('security.encryption.manage', 'Manage Encryption', 'Manage data encryption', 'security'),

-- Suppliers
('suppliers.view', 'View Suppliers', 'View supplier information', 'suppliers'),
('suppliers.create', 'Create Supplier', 'Create new suppliers', 'suppliers'),
('suppliers.edit', 'Edit Supplier', 'Edit supplier information', 'suppliers'),
('suppliers.delete', 'Delete Supplier', 'Delete suppliers', 'suppliers'),
('suppliers.purchase_orders', 'Purchase Orders', 'Manage purchase orders', 'suppliers'),

-- Categories
('categories.view', 'View Categories', 'View product categories', 'categories'),
('categories.create', 'Create Category', 'Create new categories', 'categories'),
('categories.edit', 'Edit Category', 'Edit categories', 'categories'),
('categories.delete', 'Delete Category', 'Delete categories', 'categories');

-- Map Features to Permissions
INSERT INTO feature_permissions (feature_code, permission_code) VALUES
-- Authentication features
('auth.login', 'auth.login'),
('auth.logout', 'auth.logout'),
('auth.profile', 'auth.profile.view'),
('auth.profile', 'auth.profile.edit'),
('auth.change_password', 'auth.password.change'),

-- Sales features
('sales.view', 'sales.view'),
('sales.create', 'sales.create'),
('sales.create', 'sales.payment.process'),
('sales.edit', 'sales.edit'),
('sales.void', 'sales.void'),
('sales.return', 'sales.return'),
('sales.reprint', 'sales.reprint'),
('sales.hold', 'sales.hold'),
('sales.resume', 'sales.resume'),
('sales.discount', 'sales.discount.apply'),
('sales.quick', 'sales.quick'),
('sales.bulk', 'sales.bulk'),

-- Product features
('products.view', 'products.view'),
('products.create', 'products.create'),
('products.create', 'categories.view'),
('products.edit', 'products.edit'),
('products.delete', 'products.delete'),
('products.bulk', 'products.bulk'),
('products.barcode', 'products.barcode.manage'),
('products.pricing', 'products.pricing.manage'),
('products.categories', 'categories.view'),
('products.categories', 'categories.create'),
('products.categories', 'categories.edit'),
('products.categories', 'categories.delete'),

-- Inventory features
('inventory.view', 'inventory.view'),
('inventory.adjust', 'inventory.adjust'),
('inventory.receive', 'inventory.receive'),
('inventory.receive', 'suppliers.view'),
('inventory.transfer', 'inventory.transfer'),
('inventory.count', 'inventory.count'),
('inventory.reports', 'inventory.reports'),
('inventory.alerts', 'inventory.alerts'),
('inventory.lots', 'inventory.lots'),

-- Customer features
('customers.view', 'customers.view'),
('customers.create', 'customers.create'),
('customers.edit', 'customers.edit'),
('customers.delete', 'customers.delete'),
('customers.loyalty', 'customers.loyalty'),
('customers.credit', 'customers.credit'),

-- Reporting features
('reports.sales', 'reports.sales'),
('reports.inventory', 'reports.inventory'),
('reports.financial', 'reports.financial'),
('reports.customers', 'reports.customers'),
('reports.performance', 'reports.performance'),
('reports.export', 'reports.export'),
('reports.scheduled', 'reports.scheduled'),

-- Admin features
('admin.users', 'admin.users.view'),
('admin.users', 'admin.users.create'),
('admin.users', 'admin.users.edit'),
('admin.users', 'admin.users.delete'),
('admin.roles', 'admin.roles.view'),
('admin.roles', 'admin.roles.create'),
('admin.roles', 'admin.roles.edit'),
('admin.roles', 'admin.roles.delete'),
('admin.settings', 'admin.settings.view'),
('admin.settings', 'admin.settings.edit'),
('admin.backup', 'admin.backup.create'),
('admin.backup', 'admin.backup.restore'),
('admin.audit', 'admin.audit.view'),
('admin.features', 'admin.features.toggle'),
('admin.tenants', 'admin.tenants.manage'),

-- Hardware features
('hardware.printer', 'hardware.printer.test'),
('hardware.printer', 'hardware.printer.manage'),
('hardware.scanner', 'hardware.scanner.manage'),
('hardware.cash_drawer', 'hardware.cash_drawer.manage'),
('hardware.display', 'hardware.display.manage'),

-- Integration features
('integration.accounting', 'integration.accounting.manage'),
('integration.ecommerce', 'integration.ecommerce.manage'),
('integration.api', 'integration.api.manage'),
('integration.webhooks', 'integration.webhooks.manage'),

-- Security features
('security.2fa', 'security.2fa.manage'),
('security.sessions', 'security.sessions.manage'),
('security.encryption', 'security.encryption.manage'),

-- Supplier features
('suppliers.view', 'suppliers.view'),
('suppliers.create', 'suppliers.create'),
('suppliers.edit', 'suppliers.edit'),
('suppliers.purchase_orders', 'suppliers.purchase_orders'),

-- Category features
('categories.view', 'categories.view'),
('categories.create', 'categories.create'),
('categories.edit', 'categories.edit'),
('categories.delete', 'categories.delete');

-- Map Roles to Permissions
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'admin';

-- Supervisor gets most permissions except critical admin functions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'supervisor'
  AND p.code NOT IN (
    'admin.users.delete',
    'admin.roles.delete',
    'admin.backup.restore',
    'admin.features.toggle',
    'admin.tenants.manage',
    'security.encryption.manage'
  );

-- Cashier gets basic POS permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'cashier'
  AND p.code IN (
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
  );

-- Create default admin user role assignment (if admin user exists)
INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, 'system'
FROM users u, roles r
WHERE u.username = 'admin' AND r.code = 'admin';

-- Log RBAC setup completion
INSERT INTO audit_logs (actor_id, action, resource_type, payload_json)
VALUES ('system', 'rbac.initialized', 'system', '{"roles_created": 3, "permissions_created": 65, "features_created": 50}');










