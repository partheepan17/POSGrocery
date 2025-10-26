/**
 * Policy Middleware
 * Gates sensitive API endpoints with feature and permission checks
 */
import { Request, Response, NextFunction } from 'express';
import { User } from '../lib/access';
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
    requireBoth?: boolean;
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
export declare function requirePolicy(options: PolicyOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Convenience functions for common policy patterns
 */
export declare function requireFeature(feature: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function requirePermission(permission: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function requireFeatureAndPermission(feature: string, permission: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function requireFeatureOrPermission(feature: string, permission: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Admin-only access
 */
export declare function requireAdmin(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Manager or Admin access
 */
export declare function requireManager(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Sales access
 */
export declare function requireSalesAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Inventory access
 */
export declare function requireInventoryAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Financial access
 */
export declare function requireFinancialAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Customer access
 */
export declare function requireCustomerAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Product access
 */
export declare function requireProductAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reporting access
 */
export declare function requireReportingAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Settings access
 */
export declare function requireSettingsAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Audit access
 */
export declare function requireAuditAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Backup access
 */
export declare function requireBackupAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Feature management access
 */
export declare function requireFeatureManagementAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * User management access
 */
export declare function requireUserManagementAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Role management access
 */
export declare function requireRoleManagementAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Tenant management access
 */
export declare function requireTenantManagementAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Hardware management access
 */
export declare function requireHardwareAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Integration access
 */
export declare function requireIntegrationAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Security access
 */
export declare function requireSecurityAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Supplier access
 */
export declare function requireSupplierAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Category access
 */
export declare function requireCategoryAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to set tenant ID from various sources
 */
export declare function extractTenant(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to validate tenant access
 */
export declare function validateTenant(req: Request, res: Response, next: NextFunction): void;
/**
 * Error handler for policy violations
 */
export declare function policyErrorHandler(error: any, req: Request, res: Response, next: NextFunction): void;
