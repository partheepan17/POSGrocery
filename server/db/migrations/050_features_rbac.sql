-- Migration: 050_features_rbac.sql
-- Implements comprehensive RBAC system with features, roles, permissions, and audit logging

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Features table - defines all available features in the system
CREATE TABLE IF NOT EXISTS features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_core BOOLEAN DEFAULT 0,
    depends_on TEXT NOT NULL DEFAULT '[]', -- JSON array of feature codes this feature depends on
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Roles table - defines user roles
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Permissions table - defines granular permissions
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- e.g., 'sales', 'inventory', 'reports', 'admin'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Role-Permission mapping table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Feature-Permission mapping table
CREATE TABLE IF NOT EXISTS feature_permissions (
    feature_code TEXT NOT NULL,
    permission_code TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (feature_code, permission_code),
    FOREIGN KEY (feature_code) REFERENCES features(code) ON DELETE CASCADE,
    FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE
);

-- Tenant feature flags - allows enabling/disabling features per tenant
CREATE TABLE IF NOT EXISTS tenant_feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    feature_code TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT 1,
    updated_by TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, feature_code),
    FOREIGN KEY (feature_code) REFERENCES features(code) ON DELETE CASCADE
);

-- Role feature overrides - allows enabling/disabling features per role per tenant
CREATE TABLE IF NOT EXISTS role_feature_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    feature_code TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT 1,
    updated_by TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, role_id, feature_code),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_code) REFERENCES features(code) ON DELETE CASCADE
);

-- User roles mapping - maps users to roles
CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    assigned_by TEXT,
    assigned_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT, -- Optional expiration date
    is_active BOOLEAN DEFAULT 1,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Audit logs table - tracks all system actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT NOT NULL, -- User ID who performed the action
    action TEXT NOT NULL, -- Action performed (e.g., 'user.login', 'sale.create', 'inventory.update')
    resource_type TEXT, -- Type of resource affected (e.g., 'user', 'sale', 'inventory')
    resource_id TEXT, -- ID of the resource affected
    payload_json TEXT, -- JSON payload with additional details
    ip_address TEXT,
    user_agent TEXT,
    tenant_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_features_code ON features(code);
CREATE INDEX IF NOT EXISTS idx_features_is_core ON features(is_core);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_feature_permissions_feature_code ON feature_permissions(feature_code);
CREATE INDEX IF NOT EXISTS idx_feature_permissions_permission_code ON feature_permissions(permission_code);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_tenant_id ON tenant_feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_feature_code ON tenant_feature_flags(feature_code);
CREATE INDEX IF NOT EXISTS idx_role_feature_overrides_tenant_id ON role_feature_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_feature_overrides_role_id ON role_feature_overrides(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);

-- Create views for easier querying
CREATE VIEW IF NOT EXISTS v_user_permissions AS
SELECT 
    ur.user_id,
    r.code as role_code,
    r.name as role_name,
    p.code as permission_code,
    p.name as permission_name,
    p.category as permission_category
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.is_active = 1 AND r.is_active = 1;

CREATE VIEW IF NOT EXISTS v_user_features AS
SELECT 
    ur.user_id,
    f.code as feature_code,
    f.name as feature_name,
    f.is_core,
    COALESCE(tff.is_enabled, 1) as tenant_enabled,
    COALESCE(rfo.is_enabled, 1) as role_enabled,
    CASE 
        WHEN f.is_core = 1 THEN 1
        WHEN COALESCE(tff.is_enabled, 1) = 0 THEN 0
        WHEN COALESCE(rfo.is_enabled, 1) = 0 THEN 0
        ELSE 1
    END as is_enabled
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN feature_permissions fp ON p.code = fp.permission_code
JOIN features f ON fp.feature_code = f.code
LEFT JOIN tenant_feature_flags tff ON f.code = tff.feature_code AND tff.tenant_id = 'default'
LEFT JOIN role_feature_overrides rfo ON r.id = rfo.role_id AND f.code = rfo.feature_code AND rfo.tenant_id = 'default'
WHERE ur.is_active = 1 AND r.is_active = 1;

-- Create triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS tr_features_updated_at
    AFTER UPDATE ON features
    FOR EACH ROW
    BEGIN
        UPDATE features SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS tr_roles_updated_at
    AFTER UPDATE ON roles
    FOR EACH ROW
    BEGIN
        UPDATE roles SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS tr_permissions_updated_at
    AFTER UPDATE ON permissions
    FOR EACH ROW
    BEGIN
        UPDATE permissions SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

-- Insert default tenant for single-tenant systems
INSERT OR IGNORE INTO tenant_feature_flags (tenant_id, feature_code, is_enabled, updated_by)
SELECT 'default', code, 1, 'system'
FROM features;

-- Log migration completion
INSERT INTO audit_logs (actor_id, action, resource_type, payload_json)
VALUES ('system', 'migration.completed', 'database', '{"migration": "050_features_rbac", "tables_created": 9, "views_created": 2}');










