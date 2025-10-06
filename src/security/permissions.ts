/**
 * Security Permissions and Roles
 * Defines role-based access control for the POS system
 */

export const ROLES = ['CASHIER', 'MANAGER', 'ADMIN', 'AUDITOR'] as const;
export type Role = typeof ROLES[number];

export const PERMISSIONS = {
  // Sales Operations
  VIEW_SALES: ['CASHIER', 'MANAGER', 'ADMIN', 'AUDITOR'],
  TAKE_PAYMENT: ['CASHIER', 'MANAGER', 'ADMIN'],
  PRICE_OVERRIDE: ['MANAGER', 'ADMIN'],
  DISCOUNT_OVERRIDE: ['MANAGER', 'ADMIN'],
  
  // Returns & Refunds
  RETURNS_CREATE: ['CASHIER', 'MANAGER', 'ADMIN'],
  RETURNS_APPROVE: ['MANAGER', 'ADMIN'],
  VOID_UNFINALIZED: ['CASHIER', 'MANAGER', 'ADMIN'],
  VOID_FINALIZED: ['MANAGER', 'ADMIN'],
  
  // Shift Management
  SHIFTS_VIEW: ['CASHIER', 'MANAGER', 'ADMIN'],
  SHIFT_START: ['CASHIER', 'MANAGER', 'ADMIN'],
  SHIFT_X_REPORT: ['CASHIER', 'MANAGER', 'ADMIN'],
  SHIFT_Z_CLOSE: ['MANAGER', 'ADMIN'],
  
  // Inventory & Stock
  STOCKTAKE_CREATE: ['MANAGER', 'ADMIN'],
  STOCKTAKE_FINALIZE: ['MANAGER', 'ADMIN'],
  GRN_CREATE: ['MANAGER', 'ADMIN'],
  GRN_POST: ['MANAGER', 'ADMIN'],
  
  // Hold Operations
  HOLD_CREATE: ['CASHIER', 'MANAGER', 'ADMIN'],
  HOLD_RESUME: ['CASHIER', 'MANAGER', 'ADMIN'],
  HOLD_DELETE: ['MANAGER', 'ADMIN'],
  
  // Settings & Configuration
  SETTINGS_VIEW: ['MANAGER', 'ADMIN'],
  SETTINGS_WRITE: ['MANAGER', 'ADMIN'],
  BACKUP_CREATE: ['MANAGER', 'ADMIN'],
  BACKUP_RESTORE: ['ADMIN'],
  
  // Reports & Data
  REPORTS_VIEW_BASIC: ['CASHIER', 'MANAGER', 'ADMIN', 'AUDITOR'],
  REPORTS_VIEW_ALL: ['MANAGER', 'ADMIN', 'AUDITOR'],
  EXPORT_CSV: ['MANAGER', 'ADMIN', 'AUDITOR'],
  
  // Audit & Security
  AUDIT_VIEW: ['MANAGER', 'ADMIN', 'AUDITOR'],
  AUDIT_EXPORT: ['ADMIN', 'AUDITOR'],
  USER_MANAGEMENT: ['ADMIN'],
  
  // Health & Diagnostics
  HEALTH_VIEW: ['MANAGER', 'ADMIN'],
  HEALTH_EXPORT: ['ADMIN'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly Role[];
  return allowedRoles.includes(userRole);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return Object.keys(PERMISSIONS).filter(permission => 
    hasPermission(role, permission as Permission)
  ) as Permission[];
}

/**
 * Check if a role can escalate to perform an action
 */
export function canEscalate(fromRole: Role, toPermission: Permission): boolean {
  // Only allow escalation to Manager/Admin permissions
  const allowedRoles = PERMISSIONS[toPermission] as readonly Role[];
  return allowedRoles.includes('MANAGER') || allowedRoles.includes('ADMIN');
}

/**
 * Get minimum role required for a permission
 */
export function getMinimumRole(permission: Permission): Role {
  const allowedRoles = PERMISSIONS[permission] as readonly Role[];
  
  // Return the lowest privilege role that has this permission
  for (const role of ['CASHIER', 'AUDITOR', 'MANAGER', 'ADMIN'] as Role[]) {
    if (allowedRoles.includes(role)) {
      return role;
    }
  }
  
  return 'ADMIN'; // Default to highest privilege
}

/**
 * Permission groups for UI organization
 */
export const PERMISSION_GROUPS = {
  'Sales Operations': [
    'VIEW_SALES',
    'TAKE_PAYMENT', 
    'PRICE_OVERRIDE',
    'DISCOUNT_OVERRIDE'
  ],
  'Returns & Voids': [
    'RETURNS_CREATE',
    'RETURNS_APPROVE',
    'VOID_UNFINALIZED',
    'VOID_FINALIZED'
  ],
  'Shift Management': [
    'SHIFT_START',
    'SHIFT_X_REPORT',
    'SHIFT_Z_CLOSE'
  ],
  'Inventory': [
    'STOCKTAKE_CREATE',
    'STOCKTAKE_FINALIZE',
    'GRN_CREATE',
    'GRN_POST'
  ],
  'System & Settings': [
    'SETTINGS_VIEW',
    'SETTINGS_WRITE',
    'BACKUP_CREATE',
    'BACKUP_RESTORE'
  ],
  'Reports & Audit': [
    'REPORTS_VIEW_ALL',
    'EXPORT_CSV',
    'AUDIT_VIEW',
    'AUDIT_EXPORT'
  ]
} as const;
