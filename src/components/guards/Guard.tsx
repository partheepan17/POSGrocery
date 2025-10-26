/**
 * Guard Component
 * Simple guard component for feature/permission/role checks
 */

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

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
  
  // Fallback behavior
  fallback?: React.ReactNode;
  redirectTo?: string;
  
  // Loading state
  loading?: React.ReactNode;
  
  // Children
  children: React.ReactNode;
}

export const Guard: React.FC<GuardProps> = ({
  feature,
  features = [],
  requireAllFeatures = false,
  requireAnyFeature = false,
  permission,
  permissions = [],
  requireAllPermissions = false,
  requireAnyPermission = false,
  role,
  roles = [],
  requireRole = false,
  requireAnyRole = false,
  fallback,
  redirectTo = '/not-available',
  loading,
  children
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const { user, isAuthenticated, canAccess, hasRole } = useAuthStore();

  useEffect(() => {
    const checkAccess = () => {
      if (!isAuthenticated || !user) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      let access = true;

      // Check feature requirements
      if (feature || features.length > 0) {
        const featureList = feature ? [feature, ...features] : features;
        if (requireAllFeatures) {
          access = access && featureList.every(f => canAccess(f));
        } else if (requireAnyFeature) {
          access = access && featureList.some(f => canAccess(f));
        } else {
          // Default: require any feature if multiple, or the single feature
          access = access && (featureList.length === 1 ? canAccess(featureList[0]) : featureList.some(f => canAccess(f)));
        }
      }

      // Check permission requirements
      if (permission || permissions.length > 0) {
        const permissionList = permission ? [permission, ...permissions] : permissions;
        if (requireAllPermissions) {
          access = access && permissionList.every(p => canAccess(p));
        } else if (requireAnyPermission) {
          access = access && permissionList.some(p => canAccess(p));
        } else {
          // Default: require any permission if multiple, or the single permission
          access = access && (permissionList.length === 1 ? canAccess(permissionList[0]) : permissionList.some(p => canAccess(p)));
        }
      }

      // Check role requirements
      if (role || roles.length > 0) {
        const roleList = role ? [role, ...roles] : roles;
        if (requireRole) {
          access = access && roleList.every(r => hasRole(r));
        } else if (requireAnyRole) {
          access = access && roleList.some(r => hasRole(r));
        } else {
          // Default: require any role if multiple, or the single role
          access = access && (roleList.length === 1 ? hasRole(roleList[0]) : roleList.some(r => hasRole(r)));
        }
      }

      setHasAccess(access);
      setIsLoading(false);
    };

    checkAccess();
  }, [
    isAuthenticated,
    user,
    feature,
    features,
    requireAllFeatures,
    requireAnyFeature,
    permission,
    permissions,
    requireAllPermissions,
    requireAnyPermission,
    role,
    roles,
    requireRole,
    requireAnyRole,
    canAccess,
    hasRole
  ]);

  if (isLoading) {
    return <>{loading || <div className="flex items-center justify-center min-h-screen">Loading...</div>}</>;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};




