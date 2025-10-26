/**
 * Access Control Policy Engine
 * Evaluates user permissions and feature access based on roles and tenant settings
 */

import { getDatabase } from '../../db';
import { featureCache } from './FeatureCache';

export interface User {
  id: number;
  username: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

export interface PolicyCheck {
  tenantId: string;
  user: User;
  feature?: string;
  permission?: string;
}

export interface PolicyError {
  status: number;
  reason: string;
  code: string;
  details?: any;
}

export class AccessPolicyError extends Error {
  public status: number;
  public code: string;
  public details?: any;

  constructor(status: number, reason: string, code: string, details?: any) {
    super(reason);
    this.name = 'AccessPolicyError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class AccessPolicy {
  private db = getDatabase();

  /**
   * Check if a feature is enabled for a user in a tenant
   */
  async isFeatureEnabled(tenantId: string, user: User, featureCode: string): Promise<boolean> {
    try {
      // Check if user is active
      if (!user.isActive) {
        return false;
      }

      // Get feature dependencies
      const featureDeps = await featureCache.getFeatureDependencies(tenantId, featureCode);
      if (!featureDeps) {
        // Feature doesn't exist
        return false;
      }

      // Check if it's a core feature (always enabled)
      if (featureDeps.isCore) {
        return true;
      }

      // Check tenant-level feature flag
      const tenantEnabled = await featureCache.isTenantFeatureEnabled(tenantId, featureCode);
      if (!tenantEnabled) {
        return false;
      }

      // Check role-level feature override
      const roleId = await this.getRoleId(user.role);
      if (roleId) {
        const roleEnabled = await featureCache.isRoleFeatureEnabled(tenantId, roleId, featureCode);
        if (!roleEnabled) {
          return false;
        }
      }

      // Check feature dependencies
      for (const dependency of featureDeps.dependsOn) {
        const dependencyEnabled = await this.isFeatureEnabled(tenantId, user, dependency);
        if (!dependencyEnabled) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(user: User, permissionCode: string): Promise<boolean> {
    try {
      // Check if user is active
      if (!user.isActive) {
        return false;
      }

      // Admin users have all permissions
      if (user.role === 'admin') {
        return true;
      }

      // Check if user has the permission directly
      if (user.permissions.includes(permissionCode)) {
        return true;
      }

      // Check if user has the permission through their role
      const roleId = await this.getRoleId(user.role);
      if (!roleId) {
        return false;
      }

      const hasRolePermission = await this.checkRolePermission(roleId, permissionCode);
      return hasRolePermission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Comprehensive policy check for feature and permission access
   */
  async checkPolicy(policy: PolicyCheck): Promise<void> {
    const { tenantId, user, feature, permission } = policy;

    // Validate user
    if (!user || !user.isActive) {
      throw new AccessPolicyError(403, 'User is not active or does not exist', 'USER_INACTIVE');
    }

    // Check feature access if specified
    if (feature) {
      const featureEnabled = await this.isFeatureEnabled(tenantId, user, feature);
      if (!featureEnabled) {
        throw new AccessPolicyError(403, `Feature '${feature}' is not enabled for user`, 'FEATURE_DISABLED', {
          feature,
          tenantId,
          userId: user.id
        });
      }
    }

    // Check permission if specified
    if (permission) {
      const hasPermission = await this.hasPermission(user, permission);
      if (!hasPermission) {
        throw new AccessPolicyError(403, `User does not have permission '${permission}'`, 'PERMISSION_DENIED', {
          permission,
          userId: user.id,
          userRole: user.role
        });
      }
    }
  }

  /**
   * Get user permissions including role-based permissions
   */
  async getUserPermissions(user: User): Promise<string[]> {
    try {
      const permissions = new Set<string>();

      // Add direct user permissions
      user.permissions.forEach(perm => permissions.add(perm));

      // Add role-based permissions
      const roleId = await this.getRoleId(user.role);
      if (roleId) {
        const rolePermissions = await this.getRolePermissions(roleId);
        rolePermissions.forEach(perm => permissions.add(perm));
      }

      return Array.from(permissions);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return user.permissions; // Fallback to direct permissions
    }
  }

  /**
   * Get all enabled features for a user in a tenant
   */
  async getUserFeatures(tenantId: string, user: User): Promise<string[]> {
    try {
      const allFeatures = await featureCache.getAllFeatures(tenantId);
      const enabledFeatures: string[] = [];

      for (const feature of allFeatures) {
        const isEnabled = await this.isFeatureEnabled(tenantId, user, feature.featureCode);
        if (isEnabled) {
          enabledFeatures.push(feature.featureCode);
        }
      }

      return enabledFeatures;
    } catch (error) {
      console.error('Error getting user features:', error);
      return [];
    }
  }

  /**
   * Check if user can perform an action (combination of feature and permission)
   */
  async canPerformAction(tenantId: string, user: User, featureCode: string, permissionCode: string): Promise<boolean> {
    try {
      const featureEnabled = await this.isFeatureEnabled(tenantId, user, featureCode);
      if (!featureEnabled) {
        return false;
      }

      const hasPermission = await this.hasPermission(user, permissionCode);
      return hasPermission;
    } catch (error) {
      console.error('Error checking action permission:', error);
      return false;
    }
  }

  /**
   * Get role ID by role code
   */
  private async getRoleId(roleCode: string): Promise<number | null> {
    try {
      const result = this.db.prepare(`
        SELECT id FROM roles WHERE code = ? AND is_active = 1     
      `).get(roleCode) as { id: number } | null;

      return result ? result.id : null;
    } catch (error) {
      console.error('Error getting role ID:', error);
      return null;
    }
  }

  /**
   * Check if a role has a specific permission
   */
  private async checkRolePermission(roleId: number, permissionCode: string): Promise<boolean> {
    try {
      const result = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.code = ?
      `).get(roleId, permissionCode) as { count: number } | null;

      return result ? result.count > 0 : false;
    } catch (error) {
      console.error('Error checking role permission:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a role
   */
  private async getRolePermissions(roleId: number): Promise<string[]> {
    try {
      const results = this.db.prepare(`
        SELECT p.code
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ?
      `).all(roleId) as Array<{ code: string }>;

      return results.map(r => r.code);
    } catch (error) {
      console.error('Error getting role permissions:', error);
      return [];
    }
  }

  /**
   * Validate user session and return user object
   */
  async validateUserSession(userId: number): Promise<User | null> {
    try {
      const user = this.db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.role,
          u.is_active,
          GROUP_CONCAT(p.code) as permissions
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN role_permissions rp ON ur.role_id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = ? AND u.is_active = 1
        GROUP BY u.id, u.username, u.role, u.is_active
      `).get(userId) as {
        id: number;
        username: string;
        role: string;
        is_active: boolean;
        permissions: string | null;
      } | null;

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions ? user.permissions.split(',') : [],
        isActive: Boolean(user.is_active)
      };
    } catch (error) {
      console.error('Error validating user session:', error);
      return null;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(user: User, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(user, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(user: User, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(user, permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get access summary for a user in a tenant
   */
  async getAccessSummary(tenantId: string, user: User): Promise<{
    features: string[];
    permissions: string[];
    role: string;
    isActive: boolean;
  }> {
    const [features, permissions] = await Promise.all([
      this.getUserFeatures(tenantId, user),
      this.getUserPermissions(user)
    ]);

    return {
      features,
      permissions,
      role: user.role,
      isActive: user.isActive
    };
  }
}

// Export singleton instance
export const accessPolicy = new AccessPolicy();

// Export error class for external use
// AccessPolicyError is already exported above

