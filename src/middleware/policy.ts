/**
 * Policy Middleware
 * Gates sensitive API endpoints with feature and permission checks
 */

import { Request, Response, NextFunction } from 'express';
import { accessPolicy, AccessPolicyError, User } from '../lib/access';
import { createContextLogger } from '../utils/logger';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      tenant?: string;
      user?: User;
      requestId?: string;
    }
  }
}

export interface PolicyOptions {
  feature?: string;
  permission?: string;
  requireBoth?: boolean; // If true, both feature and permission must be satisfied
}

export interface PolicyErrorResponse {
  reason: string;
  feature?: string;
  permission?: string;
  code: string;
  details?: any;
}

/**
 * Policy middleware factory
 * Creates middleware that enforces feature and/or permission requirements
 */
export function requirePolicy(options: PolicyOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = createContextLogger({ 
      operation: 'policy_middleware'
    });

    try {
      // Extract tenant ID from various sources
      const tenantId = extractTenantId(req);
      if (!tenantId) {
        logger.warn('No tenant ID found in request');
        res.status(400).json({
          reason: 'Tenant ID is required',
          code: 'MISSING_TENANT_ID'
        });
        return;
      }

      // Extract user from request (should be set by auth middleware)
      const user = req.user;
      if (!user) {
        logger.warn('No user found in request');
        res.status(401).json({
          reason: 'Authentication required',
          code: 'MISSING_USER'
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        logger.warn('Inactive user attempted access', { userId: user.id });
        res.status(403).json({
          reason: 'User account is inactive',
          code: 'USER_INACTIVE'
        });
        return;
      }

      // Validate policy requirements
      const { feature, permission, requireBoth = false } = options;

      if (!feature && !permission) {
        logger.error('Policy middleware requires at least one of feature or permission');
        res.status(500).json({
          reason: 'Invalid policy configuration',
          code: 'INVALID_POLICY_CONFIG'
        });
        return;
      }

      // Check feature access if required
      if (feature) {
        const hasFeatureAccess = await accessPolicy.isFeatureEnabled(tenantId, user, feature);
        if (!hasFeatureAccess) {
          logger.warn('Feature access denied', { 
            userId: user.id, 
            feature, 
            tenantId 
          });
          res.status(403).json({
            reason: `Feature '${feature}' is not enabled`,
            feature,
            code: 'FEATURE_DISABLED'
          });
          return;
        }
      }

      // Check permission if required
      if (permission) {
        const hasPermission = await accessPolicy.hasPermission(user, permission);
        if (!hasPermission) {
          logger.warn('Permission denied', { 
            userId: user.id, 
            permission, 
            tenantId 
          });
          res.status(403).json({
            reason: `Permission '${permission}' is required`,
            permission,
            code: 'PERMISSION_DENIED'
          });
          return;
        }
      }

      // If requireBoth is true, ensure both conditions are met
      if (requireBoth && feature && permission) {
        const hasFeatureAccess = await accessPolicy.isFeatureEnabled(tenantId, user, feature);
        const hasPermission = await accessPolicy.hasPermission(user, permission);
        
        if (!hasFeatureAccess || !hasPermission) {
          logger.warn('Both feature and permission required', { 
            userId: user.id, 
            feature, 
            permission, 
            tenantId,
            hasFeatureAccess,
            hasPermission
          });
          res.status(403).json({
            reason: `Both feature '${feature}' and permission '${permission}' are required`,
            feature,
            permission,
            code: 'BOTH_REQUIRED'
          });
          return;
        }
      }

      // All checks passed
      logger.debug('Policy check passed', { 
        userId: user.id, 
        feature, 
        permission, 
        tenantId 
      });

      next();
    } catch (error) {
      logger.error('Policy middleware error', { 
        error: error instanceof Error ? error.message : String(error), 
        feature: options.feature, 
        permission: options.permission 
      });

      if (error instanceof AccessPolicyError) {
        res.status(403).json({
          reason: error.message,
          feature: options.feature,
          permission: options.permission,
          code: error.code,
          details: error.details
        });
        return;
      }

      res.status(500).json({
        reason: 'Internal server error during policy check',
        code: 'POLICY_ERROR'
      });
      return;
    }
  };
}

/**
 * Extract tenant ID from request
 * Checks multiple sources in order of preference
 */
function extractTenantId(req: Request): string | null {
  // 1. Check req.tenant (set by previous middleware)
  if (req.tenant) {
    return req.tenant;
  }

  // 2. Check X-Tenant-ID header
  const tenantHeader = req.headers['x-tenant-id'] as string;
  if (tenantHeader) {
    return tenantHeader;
  }

  // 3. Check Authorization header for tenant info
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In a real implementation, you might decode the JWT to get tenant info
    // For now, we'll use a default tenant
    return 'default';
  }

  // 4. Check query parameter
  const tenantQuery = req.query.tenant as string;
  if (tenantQuery) {
    return tenantQuery;
  }

  // 5. Use default tenant from config
  return (globalThis as any).process?.env?.DEFAULT_TENANT_ID || 'default';
}

/**
 * Convenience functions for common policy patterns
 */

// Require only feature access
export function requireFeature(feature: string) {
  return requirePolicy({ feature });
}

// Require only permission
export function requirePermission(permission: string) {
  return requirePolicy({ permission });
}

// Require both feature and permission
export function requireFeatureAndPermission(feature: string, permission: string) {
  return requirePolicy({ feature, permission, requireBoth: true });
}

// Require either feature or permission (at least one)
export function requireFeatureOrPermission(feature: string, permission: string) {
  return requirePolicy({ feature, permission });
}

/**
 * Admin-only access
 */
export function requireAdmin() {
  return requirePermission('admin.users.view');
}

/**
 * Manager or Admin access
 */
export function requireManager() {
  return requirePermission('reports.view');
}

/**
 * Sales access
 */
export function requireSalesAccess() {
  return requireFeatureAndPermission('sales.view', 'sales.view');
}

/**
 * Inventory access
 */
export function requireInventoryAccess() {
  return requireFeatureAndPermission('inventory.view', 'inventory.view');
}

/**
 * Financial access
 */
export function requireFinancialAccess() {
  return requireFeatureAndPermission('reports.financial', 'reports.financial');
}

/**
 * Customer access
 */
export function requireCustomerAccess() {
  return requireFeatureAndPermission('customers.view', 'customers.view');
}

/**
 * Product access
 */
export function requireProductAccess() {
  return requireFeatureAndPermission('products.view', 'products.view');
}

/**
 * Reporting access
 */
export function requireReportingAccess() {
  return requireFeatureAndPermission('reports.view', 'reports.view');
}

/**
 * Settings access
 */
export function requireSettingsAccess() {
  return requireFeatureAndPermission('admin.settings', 'admin.settings.view');
}

/**
 * Audit access
 */
export function requireAuditAccess() {
  return requireFeatureAndPermission('admin.audit', 'admin.audit.view');
}

/**
 * Backup access
 */
export function requireBackupAccess() {
  return requireFeatureAndPermission('admin.backup', 'admin.backup.create');
}

/**
 * Feature management access
 */
export function requireFeatureManagementAccess() {
  return requireFeatureAndPermission('admin.features', 'admin.features.toggle');
}

/**
 * User management access
 */
export function requireUserManagementAccess() {
  return requireFeatureAndPermission('admin.users', 'admin.users.view');
}

/**
 * Role management access
 */
export function requireRoleManagementAccess() {
  return requireFeatureAndPermission('admin.roles', 'admin.roles.view');
}

/**
 * Tenant management access
 */
export function requireTenantManagementAccess() {
  return requireFeatureAndPermission('admin.tenants', 'admin.tenants.manage');
}

/**
 * Hardware management access
 */
export function requireHardwareAccess() {
  return requireFeatureAndPermission('hardware.printer', 'hardware.printer.manage');
}

/**
 * Integration access
 */
export function requireIntegrationAccess() {
  return requireFeatureAndPermission('integration.api', 'integration.api.manage');
}

/**
 * Security access
 */
export function requireSecurityAccess() {
  return requireFeatureAndPermission('security.2fa', 'security.2fa.manage');
}

/**
 * Supplier access
 */
export function requireSupplierAccess() {
  return requireFeatureAndPermission('suppliers.view', 'suppliers.view');
}

/**
 * Category access
 */
export function requireCategoryAccess() {
  return requireFeatureAndPermission('categories.view', 'categories.view');
}

/**
 * Middleware to set tenant ID from various sources
 */
export function extractTenant(req: Request, res: Response, next: NextFunction): void {
  const tenantId = extractTenantId(req);
  if (tenantId) {
    req.tenant = tenantId;
  }
  next();
}

/**
 * Middleware to validate tenant access
 */
export function validateTenant(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.tenant;
  if (!tenantId) {
    res.status(400).json({
      reason: 'Tenant ID is required',
      code: 'MISSING_TENANT_ID'
    });
    return;
  }

  // In a real implementation, you might validate that the user has access to this tenant
  // For now, we'll just ensure the tenant ID exists
  next();
}

/**
 * Error handler for policy violations
 */
export function policyErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof AccessPolicyError) {
    res.status(403).json({
      reason: error.message,
      code: error.code,
      details: error.details
    });
    return;
  }

  next(error);
}

