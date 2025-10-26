/**
 * Guard Component
 * Advanced guard component with redirect and null behavior
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeatures } from '@/frontend/state/features/useFeatures';

interface GuardProps {
  // Feature requirements
  feature?: string;
  features?: string[];
  requireAllFeatures?: boolean;
  requireAnyFeature?: boolean;
  
  // Permission requirements
  permission?: string;
  permissions?: string[];
  requireAllPermissions?: boolean;
  requireAnyPermission?: boolean;
  
  // Role requirements
  role?: string;
  roles?: string[];
  requireRole?: boolean;
  requireAnyRole?: boolean;
  
  // Behavior options
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  redirectReplace?: boolean;
  onDenied?: () => void;
  onGranted?: () => void;
  
  // Invert logic
  invert?: boolean;
  
  // Loading state
  loading?: React.ReactNode;
  isLoading?: boolean;
}

/**
 * Guard - Advanced guard component with multiple requirement types
 */
export const Guard: React.FC<GuardProps> = ({
  // Feature requirements
  feature,
  features = [],
  requireAllFeatures = false,
  requireAnyFeature = false,
  
  // Permission requirements
  permission,
  permissions = [],
  requireAllPermissions = false,
  requireAnyPermission = false,
  
  // Role requirements
  role,
  roles = [],
  requireRole = false,
  requireAnyRole = false,
  
  // Behavior options
  children,
  fallback = null,
  redirectTo,
  redirectReplace = false,
  onDenied,
  onGranted,
  
  // Invert logic
  invert = false,
  
  // Loading state
  loading,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const { 
    hasFeature, 
    hasAllFeatures, 
    hasAnyFeature,
    can,
    canAll,
    canAnyPermission,
    getUserRole,
    isAdmin,
    isLoaded
  } = useFeatures();

  // Show loading state if specified
  if (isLoading || loading) {
    return <>{loading}</>;
  }

  // Don't render if features are not loaded yet
  if (!isLoaded()) {
    return <>{fallback}</>;
  }

  // Check feature requirements
  let hasRequiredFeatures = true;
  if (feature || features.length > 0) {
    const allFeatures = feature ? [feature, ...features] : features;
    
    if (requireAllFeatures) {
      hasRequiredFeatures = hasAllFeatures(allFeatures);
    } else if (requireAnyFeature) {
      hasRequiredFeatures = hasAnyFeature(allFeatures);
    } else {
      // Default: all features must be enabled
      hasRequiredFeatures = hasAllFeatures(allFeatures);
    }
  }

  // Check permission requirements
  let hasRequiredPermissions = true;
  if (permission || permissions.length > 0) {
    const allPermissions = permission ? [permission, ...permissions] : permissions;
    
    if (requireAllPermissions) {
      hasRequiredPermissions = Object.values(canAll(allPermissions)).every(Boolean);
    } else if (requireAnyPermission) {
      hasRequiredPermissions = Object.values(canAnyPermission(allPermissions)).some(Boolean);
    } else {
      // Default: all permissions must be granted
      hasRequiredPermissions = Object.values(canAll(allPermissions)).every(Boolean);
    }
  }

  // Check role requirements
  let hasRequiredRole = true;
  const userRole = getUserRole();
  
  if (role || roles.length > 0) {
    const allRoles = role ? [role, ...roles] : roles;
    
    if (requireRole && role) {
      hasRequiredRole = userRole === role;
    } else if (requireAnyRole && roles.length > 0) {
      hasRequiredRole = roles.includes(userRole);
    } else {
      // Default: user must have one of the specified roles
      hasRequiredRole = allRoles.includes(userRole);
    }
  }

  // Admin override: admins have all permissions and features
  const isAdminUser = isAdmin();
  const adminOverride = isAdminUser && !invert;

  // Determine if access is granted
  const hasAccess = (hasRequiredFeatures && hasRequiredPermissions && hasRequiredRole) || adminOverride;

  // Apply invert logic
  const shouldRender = invert ? !hasAccess : hasAccess;

  // Handle access denied
  if (!shouldRender) {
    // Call onDenied callback
    if (onDenied) {
      onDenied();
    }

    // Redirect if specified
    if (redirectTo) {
      navigate(redirectTo, { replace: redirectReplace });
      return <>{fallback}</>;
    }

    // Return fallback
    return <>{fallback}</>;
  }

  // Handle access granted
  if (onGranted) {
    onGranted();
  }

  // Render children
  return <>{children}</>;
};

/**
 * FeatureGuard - Guard based on feature requirements only
 */
export const FeatureGuard: React.FC<{
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  invert?: boolean;
}> = ({ feature, children, fallback, redirectTo, invert }) => {
  return (
    <Guard
      feature={feature}
      children={children}
      fallback={fallback}
      redirectTo={redirectTo}
      invert={invert}
    />
  );
};

/**
 * PermissionGuard - Guard based on permission requirements only
 */
export const PermissionGuard: React.FC<{
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  invert?: boolean;
}> = ({ permission, children, fallback, redirectTo, invert }) => {
  return (
    <Guard
      permission={permission}
      children={children}
      fallback={fallback}
      redirectTo={redirectTo}
      invert={invert}
    />
  );
};

/**
 * RoleGuard - Guard based on role requirements only
 */
export const RoleGuard: React.FC<{
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  roles?: string[];
  requireAny?: boolean;
}> = ({ role, children, fallback, redirectTo, roles = [], requireAny = false }) => {
  return (
    <Guard
      role={role}
      roles={roles}
      requireAnyRole={requireAny}
      children={children}
      fallback={fallback}
      redirectTo={redirectTo}
    />
  );
};

/**
 * AdminGuard - Guard for admin-only content
 */
export const AdminGuard: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}> = ({ children, fallback, redirectTo }) => {
  return (
    <RoleGuard
      role="admin"
      children={children}
      fallback={fallback}
      redirectTo={redirectTo}
    />
  );
};

/**
 * ManagerGuard - Guard for manager and admin content
 */
export const ManagerGuard: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}> = ({ children, fallback, redirectTo }) => {
  return (
    <RoleGuard
      role="manager"
      roles={['admin', 'supervisor']}
      requireAny={true}
      children={children}
      fallback={fallback}
      redirectTo={redirectTo}
    />
  );
};

export default Guard;

