/**
 * Access Control Policy Engine
 * Evaluates user permissions and feature access based on roles and tenant settings
 */
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
export declare class AccessPolicyError extends Error {
    status: number;
    code: string;
    details?: any;
    constructor(status: number, reason: string, code: string, details?: any);
}
export declare class AccessPolicy {
    private db;
    /**
     * Check if a feature is enabled for a user in a tenant
     */
    isFeatureEnabled(tenantId: string, user: User, featureCode: string): Promise<boolean>;
    /**
     * Check if a user has a specific permission
     */
    hasPermission(user: User, permissionCode: string): Promise<boolean>;
    /**
     * Comprehensive policy check for feature and permission access
     */
    checkPolicy(policy: PolicyCheck): Promise<void>;
    /**
     * Get user permissions including role-based permissions
     */
    getUserPermissions(user: User): Promise<string[]>;
    /**
     * Get all enabled features for a user in a tenant
     */
    getUserFeatures(tenantId: string, user: User): Promise<string[]>;
    /**
     * Check if user can perform an action (combination of feature and permission)
     */
    canPerformAction(tenantId: string, user: User, featureCode: string, permissionCode: string): Promise<boolean>;
    /**
     * Get role ID by role code
     */
    private getRoleId;
    /**
     * Check if a role has a specific permission
     */
    private checkRolePermission;
    /**
     * Get all permissions for a role
     */
    private getRolePermissions;
    /**
     * Validate user session and return user object
     */
    validateUserSession(userId: number): Promise<User | null>;
    /**
     * Check if user has any of the specified permissions
     */
    hasAnyPermission(user: User, permissions: string[]): Promise<boolean>;
    /**
     * Check if user has all of the specified permissions
     */
    hasAllPermissions(user: User, permissions: string[]): Promise<boolean>;
    /**
     * Get access summary for a user in a tenant
     */
    getAccessSummary(tenantId: string, user: User): Promise<{
        features: string[];
        permissions: string[];
        role: string;
        isActive: boolean;
    }>;
}
export declare const accessPolicy: AccessPolicy;
