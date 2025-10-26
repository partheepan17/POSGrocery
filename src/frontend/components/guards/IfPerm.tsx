/**
 * IfPerm Component
 * Conditionally renders children based on permission availability
 */

import React from 'react';
import { useFeatures } from '@/frontend/state/features/useFeatures';

interface IfPermProps {
  code: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, requires all permissions to be granted
  requireAny?: boolean; // If true, requires any permission to be granted
  permissions?: string[]; // Additional permissions to check
  invert?: boolean; // If true, renders when permission is denied
  role?: string; // Specific role requirement
  roles?: string[]; // Multiple role requirements
  requireRole?: boolean; // If true, requires specific role
  requireAnyRole?: boolean; // If true, requires any of the specified roles
}

/**
 * IfPerm - Renders children only if the specified permission is granted
 */
export const IfPerm: React.FC<IfPermProps> = ({
  code,
  children,
  fallback = null,
  requireAll = false,
  requireAny = false,
  permissions = [],
  invert = false,
  role,
  roles = [],
  requireRole = false,
  requireAnyRole = false
}) => {
  const { can, canAll, canAnyPermission, getUserRole, isAdmin } = useFeatures();
  const hasPermission = can(code);

  // Check permissions
  let hasRequiredPermission = hasPermission;

  if (permissions.length > 0) {
    if (requireAll) {
      hasRequiredPermission = Object.values(canAll([code, ...permissions])).every(Boolean);
    } else if (requireAny) {
      hasRequiredPermission = Object.values(canAnyPermission([code, ...permissions])).some(Boolean);
    } else {
      // Default behavior: all permissions must be granted
      hasRequiredPermission = Object.values(canAll([code, ...permissions])).every(Boolean);
    }
  }

  // Check role requirements
  let hasRequiredRole = true; // Default to true if no role requirements

  if (requireRole && role) {
    hasRequiredRole = getUserRole() === role;
  } else if (requireAnyRole && roles.length > 0) {
    hasRequiredRole = roles.includes(getUserRole());
  } else if (role) {
    // If role is specified but requireRole is false, check as additional requirement
    hasRequiredRole = getUserRole() === role;
  } else if (roles.length > 0) {
    // If roles are specified but requireAnyRole is false, check as additional requirement
    hasRequiredRole = roles.includes(getUserRole());
  }

  // Admin always has all permissions
  const isAdminUser = isAdmin();
  const adminOverride = isAdminUser && code !== 'admin.all'; // Admin has all permissions except admin.all itself

  // Determine if we should render
  let shouldRender = (hasRequiredPermission || adminOverride) && hasRequiredRole;

  // Apply invert logic
  if (invert) {
    shouldRender = !shouldRender;
  }

  return shouldRender ? <>{children}</> : <>{fallback}</>;
};

/**
 * IfNotPerm - Renders children only if the specified permission is denied
 */
export const IfNotPerm: React.FC<Omit<IfPermProps, 'invert'>> = (props) => {
  return <IfPerm {...props} invert={true} />;
};

/**
 * IfAllPerms - Renders children only if all specified permissions are granted
 */
export const IfAllPerms: React.FC<Omit<IfPermProps, 'requireAll' | 'requireAny'>> = (props) => {
  return <IfPerm {...props} requireAll={true} />;
};

/**
 * IfAnyPerm - Renders children only if any specified permission is granted
 */
export const IfAnyPerm: React.FC<Omit<IfPermProps, 'requireAll' | 'requireAny'>> = (props) => {
  return <IfPerm {...props} requireAny={true} />;
};

/**
 * IfRole - Renders children only if user has the specified role
 */
export const IfRole: React.FC<{
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  roles?: string[];
  requireAny?: boolean;
}> = ({ role, children, fallback = null, roles = [], requireAny = false }) => {
  const { getUserRole } = useFeatures();
  const userRole = getUserRole();

  let hasRole = userRole === role;
  
  if (roles.length > 0) {
    if (requireAny) {
      hasRole = [role, ...roles].includes(userRole);
    } else {
      hasRole = [role, ...roles].includes(userRole);
    }
  }

  return hasRole ? <>{children}</> : <>{fallback}</>;
};

/**
 * IfAdmin - Renders children only if user is admin
 */
export const IfAdmin: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback = null }) => {
  const { isAdmin } = useFeatures();
  return isAdmin() ? <>{children}</> : <>{fallback}</>;
};

/**
 * IfManager - Renders children only if user is manager or admin
 */
export const IfManager: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback = null }) => {
  const { isManager } = useFeatures();
  return isManager() ? <>{children}</> : <>{fallback}</>;
};

/**
 * IfCashier - Renders children only if user is cashier
 */
export const IfCashier: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback = null }) => {
  const { isCashier } = useFeatures();
  return isCashier() ? <>{children}</> : <>{fallback}</>;
};

export default IfPerm;

