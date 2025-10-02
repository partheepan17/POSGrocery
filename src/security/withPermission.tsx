/**
 * withPermission HOC
 * Higher-order component for protecting routes with permission checks
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Permission } from './permissions';
import RequirePerm from '@/components/Security/RequirePerm';

interface WithPermissionOptions {
  permission: Permission;
  redirectTo?: string;
  showFallback?: boolean;
  fallback?: React.ComponentType;
}

/**
 * HOC that wraps a component with permission checking
 */
export function withPermission<P extends object>(
  options: WithPermissionOptions | Permission
) {
  return function <T extends React.ComponentType<P>>(
    WrappedComponent: T
  ): React.ComponentType<P> {
    const WithPermissionComponent: React.FC<P> = (props) => {
      const config = typeof options === 'string' 
        ? { permission: options }
        : options;

      const {
        permission,
        redirectTo = '/',
        showFallback = true,
        fallback: FallbackComponent
      } = config;

      // Check authentication first
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return <Navigate to="/login" replace />;
      }

      // Check permission
      const hasPermission = authService.hasPermission(permission);
      
      if (!hasPermission) {
        if (FallbackComponent) {
          return <FallbackComponent {...(props as any)} />;
        }
        
        if (!showFallback) {
          return <Navigate to={redirectTo} replace />;
        }
        
        // Use RequirePerm component for default fallback
        return (
          <RequirePerm permission={permission} showFallback={true}>
            <WrappedComponent {...(props as any)} />
          </RequirePerm>
        );
      }

      return <WrappedComponent {...(props as any)} />;
    };

    // Set display name for debugging
    WithPermissionComponent.displayName = 
      `withPermission(${WrappedComponent.displayName || WrappedComponent.name})`;

    return WithPermissionComponent;
  };
}

/**
 * Hook for checking permissions in functional components
 */
export function usePermission(permission: Permission): boolean {
  return authService.hasPermission(permission);
}

/**
 * Hook for checking multiple permissions
 */
export function usePermissions(permissions: Permission[]): Record<Permission, boolean> {
  return permissions.reduce((acc, perm) => {
    acc[perm] = authService.hasPermission(perm);
    return acc;
  }, {} as Record<Permission, boolean>);
}

/**
 * Component that renders children only if user has any of the specified permissions
 */
export const IfAnyPerm: React.FC<{
  permissions: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permissions, children, fallback = null }) => {
  const hasAnyPermission = permissions.some(perm => 
    authService.hasPermission(perm)
  );

  return hasAnyPermission ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children only if user has all of the specified permissions
 */
export const IfAllPerms: React.FC<{
  permissions: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permissions, children, fallback = null }) => {
  const hasAllPermissions = permissions.every(perm => 
    authService.hasPermission(perm)
  );

  return hasAllPermissions ? <>{children}</> : <>{fallback}</>;
};
