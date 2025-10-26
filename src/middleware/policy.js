"use strict";
/**
 * Policy Middleware
 * Gates sensitive API endpoints with feature and permission checks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePolicy = requirePolicy;
exports.requireFeature = requireFeature;
exports.requirePermission = requirePermission;
exports.requireFeatureAndPermission = requireFeatureAndPermission;
exports.requireFeatureOrPermission = requireFeatureOrPermission;
exports.requireAdmin = requireAdmin;
exports.requireManager = requireManager;
exports.requireSalesAccess = requireSalesAccess;
exports.requireInventoryAccess = requireInventoryAccess;
exports.requireFinancialAccess = requireFinancialAccess;
exports.requireCustomerAccess = requireCustomerAccess;
exports.requireProductAccess = requireProductAccess;
exports.requireReportingAccess = requireReportingAccess;
exports.requireSettingsAccess = requireSettingsAccess;
exports.requireAuditAccess = requireAuditAccess;
exports.requireBackupAccess = requireBackupAccess;
exports.requireFeatureManagementAccess = requireFeatureManagementAccess;
exports.requireUserManagementAccess = requireUserManagementAccess;
exports.requireRoleManagementAccess = requireRoleManagementAccess;
exports.requireTenantManagementAccess = requireTenantManagementAccess;
exports.requireHardwareAccess = requireHardwareAccess;
exports.requireIntegrationAccess = requireIntegrationAccess;
exports.requireSecurityAccess = requireSecurityAccess;
exports.requireSupplierAccess = requireSupplierAccess;
exports.requireCategoryAccess = requireCategoryAccess;
exports.extractTenant = extractTenant;
exports.validateTenant = validateTenant;
exports.policyErrorHandler = policyErrorHandler;
const access_1 = require("../lib/access");
const logger_1 = require("../utils/logger");
/**
 * Policy middleware factory
 * Creates middleware that enforces feature and/or permission requirements
 */
function requirePolicy(options) {
    return async (req, res, next) => {
        const logger = (0, logger_1.createContextLogger)({
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
                const hasFeatureAccess = await access_1.accessPolicy.isFeatureEnabled(tenantId, user, feature);
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
                const hasPermission = await access_1.accessPolicy.hasPermission(user, permission);
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
                const hasFeatureAccess = await access_1.accessPolicy.isFeatureEnabled(tenantId, user, feature);
                const hasPermission = await access_1.accessPolicy.hasPermission(user, permission);
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
        }
        catch (error) {
            logger.error('Policy middleware error', {
                error: error instanceof Error ? error.message : String(error),
                feature: options.feature,
                permission: options.permission
            });
            if (error instanceof access_1.AccessPolicyError) {
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
function extractTenantId(req) {
    // 1. Check req.tenant (set by previous middleware)
    if (req.tenant) {
        return req.tenant;
    }
    // 2. Check X-Tenant-ID header
    const tenantHeader = req.headers['x-tenant-id'];
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
    const tenantQuery = req.query.tenant;
    if (tenantQuery) {
        return tenantQuery;
    }
    // 5. Use default tenant from config
    return globalThis.process?.env?.DEFAULT_TENANT_ID || 'default';
}
/**
 * Convenience functions for common policy patterns
 */
// Require only feature access
function requireFeature(feature) {
    return requirePolicy({ feature });
}
// Require only permission
function requirePermission(permission) {
    return requirePolicy({ permission });
}
// Require both feature and permission
function requireFeatureAndPermission(feature, permission) {
    return requirePolicy({ feature, permission, requireBoth: true });
}
// Require either feature or permission (at least one)
function requireFeatureOrPermission(feature, permission) {
    return requirePolicy({ feature, permission });
}
/**
 * Admin-only access
 */
function requireAdmin() {
    return requirePermission('admin.users.view');
}
/**
 * Manager or Admin access
 */
function requireManager() {
    return requirePermission('reports.view');
}
/**
 * Sales access
 */
function requireSalesAccess() {
    return requireFeatureAndPermission('sales.view', 'sales.view');
}
/**
 * Inventory access
 */
function requireInventoryAccess() {
    return requireFeatureAndPermission('inventory.view', 'inventory.view');
}
/**
 * Financial access
 */
function requireFinancialAccess() {
    return requireFeatureAndPermission('reports.financial', 'reports.financial');
}
/**
 * Customer access
 */
function requireCustomerAccess() {
    return requireFeatureAndPermission('customers.view', 'customers.view');
}
/**
 * Product access
 */
function requireProductAccess() {
    return requireFeatureAndPermission('products.view', 'products.view');
}
/**
 * Reporting access
 */
function requireReportingAccess() {
    return requireFeatureAndPermission('reports.view', 'reports.view');
}
/**
 * Settings access
 */
function requireSettingsAccess() {
    return requireFeatureAndPermission('admin.settings', 'admin.settings.view');
}
/**
 * Audit access
 */
function requireAuditAccess() {
    return requireFeatureAndPermission('admin.audit', 'admin.audit.view');
}
/**
 * Backup access
 */
function requireBackupAccess() {
    return requireFeatureAndPermission('admin.backup', 'admin.backup.create');
}
/**
 * Feature management access
 */
function requireFeatureManagementAccess() {
    return requireFeatureAndPermission('admin.features', 'admin.features.toggle');
}
/**
 * User management access
 */
function requireUserManagementAccess() {
    return requireFeatureAndPermission('admin.users', 'admin.users.view');
}
/**
 * Role management access
 */
function requireRoleManagementAccess() {
    return requireFeatureAndPermission('admin.roles', 'admin.roles.view');
}
/**
 * Tenant management access
 */
function requireTenantManagementAccess() {
    return requireFeatureAndPermission('admin.tenants', 'admin.tenants.manage');
}
/**
 * Hardware management access
 */
function requireHardwareAccess() {
    return requireFeatureAndPermission('hardware.printer', 'hardware.printer.manage');
}
/**
 * Integration access
 */
function requireIntegrationAccess() {
    return requireFeatureAndPermission('integration.api', 'integration.api.manage');
}
/**
 * Security access
 */
function requireSecurityAccess() {
    return requireFeatureAndPermission('security.2fa', 'security.2fa.manage');
}
/**
 * Supplier access
 */
function requireSupplierAccess() {
    return requireFeatureAndPermission('suppliers.view', 'suppliers.view');
}
/**
 * Category access
 */
function requireCategoryAccess() {
    return requireFeatureAndPermission('categories.view', 'categories.view');
}
/**
 * Middleware to set tenant ID from various sources
 */
function extractTenant(req, res, next) {
    const tenantId = extractTenantId(req);
    if (tenantId) {
        req.tenant = tenantId;
    }
    next();
}
/**
 * Middleware to validate tenant access
 */
function validateTenant(req, res, next) {
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
function policyErrorHandler(error, req, res, next) {
    if (error instanceof access_1.AccessPolicyError) {
        res.status(403).json({
            reason: error.message,
            code: error.code,
            details: error.details
        });
        return;
    }
    next(error);
}
