import { Database } from 'better-sqlite3';

export interface Feature {
  id: number;
  name: string;
  description?: string;
  category?: string;
  is_core: boolean;
  is_enabled_by_default: boolean;
}

export interface TenantFeatureFlag {
  id: number;
  tenant_id: string;
  feature_id: number;
  is_enabled: boolean;
  enabled_at: string;
  enabled_by?: number;
}

export interface RoleFeatureOverride {
  id: number;
  role_id: number;
  feature_id: number;
  is_enabled: boolean;
  created_at: string;
  created_by?: number;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface PolicyCheck {
  feature?: string;
  permission?: string;
  resource?: string;
  action?: string;
}

export class PolicyService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async isFeatureEnabled(featureName: string, userId?: number, tenantId: string = 'default'): Promise<boolean> {
    try {
      // Get feature
      const feature = this.db.prepare(`
        SELECT id, is_core, is_enabled_by_default
        FROM features 
        WHERE name = ?
      `).get(featureName) as any;

      if (!feature) {
        return false;
      }

      // Core features are always enabled
      if (feature.is_core) {
        return true;
      }

      // Check tenant-level feature flag
      const tenantFlag = this.db.prepare(`
        SELECT is_enabled
        FROM tenant_feature_flags 
        WHERE tenant_id = ? AND feature_id = ?
      `).get(tenantId, feature.id) as any;

      let isEnabled = tenantFlag ? tenantFlag.is_enabled : feature.is_enabled_by_default;

      // If user is provided, check role overrides
      if (userId) {
        const roleOverrides = this.db.prepare(`
          SELECT rfo.is_enabled
          FROM role_feature_overrides rfo
          JOIN user_roles ur ON rfo.role_id = ur.role_id
          WHERE ur.user_id = ? AND rfo.feature_id = ?
          ORDER BY rfo.created_at DESC
          LIMIT 1
        `).get(userId, feature.id) as any;

        if (roleOverrides) {
          isEnabled = roleOverrides.is_enabled;
        }
      }

      return isEnabled;
    } catch (error) {
      console.error('Feature check error:', error);
      return false;
    }
  }

  async hasPermission(permissionName: string, userId: number): Promise<boolean> {
    try {
      const permission = this.db.prepare(`
        SELECT p.id
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ? AND p.name = ? AND rp.granted = 1
      `).get(userId, permissionName) as any;

      return !!permission;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  async checkPolicy(policy: PolicyCheck, userId?: number, tenantId: string = 'default'): Promise<boolean> {
    try {
      // Check feature if specified
      if (policy.feature) {
        const featureEnabled = await this.isFeatureEnabled(policy.feature, userId, tenantId);
        if (!featureEnabled) {
          return false;
        }
      }

      // Check permission if specified
      if (policy.permission && userId) {
        const hasPermission = await this.hasPermission(policy.permission, userId);
        if (!hasPermission) {
          return false;
        }
      }

      // Check resource/action if specified
      if (policy.resource && policy.action && userId) {
        const permissionName = `${policy.resource}.${policy.action}`;
        const hasPermission = await this.hasPermission(permissionName, userId);
        if (!hasPermission) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Policy check error:', error);
      return false;
    }
  }

  async getEffectiveFeatures(userId?: number, tenantId: string = 'default'): Promise<Feature[]> {
    try {
      const features = this.db.prepare(`
        SELECT f.id, f.name, f.description, f.category, f.is_core, f.is_enabled_by_default
        FROM features f
        ORDER BY f.category, f.name
      `).all() as Feature[];

      const effectiveFeatures = [];

      for (const feature of features) {
        const isEnabled = await this.isFeatureEnabled(feature.name, userId, tenantId);
        effectiveFeatures.push({
          ...feature,
          is_enabled: isEnabled
        });
      }

      return effectiveFeatures;
    } catch (error) {
      console.error('Get effective features error:', error);
      return [];
    }
  }

  async getEffectivePermissions(userId: number): Promise<Permission[]> {
    try {
      const permissions = this.db.prepare(`
        SELECT DISTINCT p.id, p.name, p.description, p.resource, p.action
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ? AND rp.granted = 1
        ORDER BY p.resource, p.action
      `).all(userId) as Permission[];

      return permissions;
    } catch (error) {
      console.error('Get effective permissions error:', error);
      return [];
    }
  }

  async toggleFeature(featureName: string, enabled: boolean, userId: number, tenantId: string = 'default'): Promise<boolean> {
    try {
      // Get feature
      const feature = this.db.prepare(`
        SELECT id
        FROM features 
        WHERE name = ?
      `).get(featureName) as any;

      if (!feature) {
        return false;
      }

      // Update or insert tenant feature flag
      this.db.prepare(`
        INSERT OR REPLACE INTO tenant_feature_flags (tenant_id, feature_id, is_enabled, enabled_at, enabled_by)
        VALUES (?, ?, ?, datetime('now'), ?)
      `).run(tenantId, feature.id, enabled ? 1 : 0, userId);

      return true;
    } catch (error) {
      console.error('Toggle feature error:', error);
      return false;
    }
  }

  async overrideFeatureForRole(featureName: string, roleId: number, enabled: boolean, userId: number): Promise<boolean> {
    try {
      // Get feature
      const feature = this.db.prepare(`
        SELECT id
        FROM features 
        WHERE name = ?
      `).get(featureName) as any;

      if (!feature) {
        return false;
      }

      // Update or insert role feature override
      this.db.prepare(`
        INSERT OR REPLACE INTO role_feature_overrides (role_id, feature_id, is_enabled, created_at, created_by)
        VALUES (?, ?, ?, datetime('now'), ?)
      `).run(roleId, feature.id, enabled ? 1 : 0, userId);

      return true;
    } catch (error) {
      console.error('Override feature for role error:', error);
      return false;
    }
  }

  // Seed initial features
  async seedFeatures(): Promise<void> {
    try {
      const features = [
        // Core features (always enabled)
        { name: 'sales', description: 'Sales Management', category: 'core', is_core: true, is_enabled_by_default: true },
        { name: 'inventory', description: 'Inventory Management', category: 'core', is_core: true, is_enabled_by_default: true },
        { name: 'reports', description: 'Reports and Analytics', category: 'core', is_core: true, is_enabled_by_default: true },
        { name: 'settings', description: 'System Settings', category: 'core', is_core: true, is_enabled_by_default: true },
        
        // Optional features
        { name: 'advanced_reports', description: 'Advanced Reporting', category: 'reports', is_core: false, is_enabled_by_default: true },
        { name: 'multi_location', description: 'Multi-Location Support', category: 'inventory', is_core: false, is_enabled_by_default: false },
        { name: 'barcode_scanning', description: 'Barcode Scanning', category: 'sales', is_core: false, is_enabled_by_default: true },
        { name: 'customer_management', description: 'Customer Management', category: 'sales', is_core: false, is_enabled_by_default: true },
        { name: 'supplier_management', description: 'Supplier Management', category: 'inventory', is_core: false, is_enabled_by_default: true },
        { name: 'price_management', description: 'Price Management', category: 'inventory', is_core: false, is_enabled_by_default: true },
        { name: 'discount_management', description: 'Discount Management', category: 'sales', is_core: false, is_enabled_by_default: true },
        { name: 'return_management', description: 'Return Management', category: 'sales', is_core: false, is_enabled_by_default: true },
        { name: 'stocktake', description: 'Stock Take', category: 'inventory', is_core: false, is_enabled_by_default: true },
        { name: 'grn', description: 'Goods Received Note', category: 'inventory', is_core: false, is_enabled_by_default: true },
        { name: 'audit_trail', description: 'Audit Trail', category: 'system', is_core: false, is_enabled_by_default: true },
        { name: 'backup_restore', description: 'Backup & Restore', category: 'system', is_core: false, is_enabled_by_default: true }
      ];

      for (const feature of features) {
        this.db.prepare(`
          INSERT OR IGNORE INTO features (name, description, category, is_core, is_enabled_by_default)
          VALUES (?, ?, ?, ?, ?)
        `).run(feature.name, feature.description, feature.category, feature.is_core ? 1 : 0, feature.is_enabled_by_default ? 1 : 0);
      }

      console.log('✅ Features seeded successfully');
    } catch (error) {
      console.error('Error seeding features:', error);
    }
  }
}

