/**
 * LazyRoute Component
 * Wraps lazy-loaded components with feature guards and error boundaries
 */

import React, { Suspense, lazy, ComponentType } from 'react';
import { Navigate } from 'react-router-dom';
import { Guard } from '../guards/Guard';
import { ErrorBoundary } from '../ErrorBoundary';

interface LazyRouteProps {
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
  
  // Lazy loading
  importFn: () => Promise<{ default: ComponentType<any> }>;
  
  // Fallback behavior
  fallbackPath?: string;
  fallbackComponent?: React.ComponentType;
  
  // Loading state
  loadingComponent?: React.ComponentType;
  
  // Props to pass to the component
  componentProps?: Record<string, any>;
}

/**
 * LazyRoute - Lazy loads a component with feature guards
 */
export const LazyRoute: React.FC<LazyRouteProps> = ({
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
  
  // Lazy loading
  importFn,
  
  // Fallback behavior
  fallbackPath = '/not-available',
  fallbackComponent: FallbackComponent,
  
  // Loading state
  loadingComponent: LoadingComponent,
  
  // Props to pass to the component
  componentProps = {}
}) => {
  // Create lazy component
  const LazyComponent = lazy(importFn);

  // Default loading component
  const DefaultLoading = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );

  // Default fallback component
  const DefaultFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Feature Not Available</h1>
        <p className="text-gray-600 mb-4">This feature is not enabled for your account.</p>
        <Navigate to={fallbackPath} replace />
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <Guard
        // Feature requirements
        feature={feature}
        features={features}
        requireAllFeatures={requireAllFeatures}
        requireAnyFeature={requireAnyFeature}
        
        // Permission requirements
        permission={permission}
        permissions={permissions}
        requireAllPermissions={requireAllPermissions}
        requireAnyPermission={requireAnyPermission}
        
        // Role requirements
        role={role}
        roles={roles}
        requireRole={requireRole}
        requireAnyRole={requireAnyRole}
        
        // Fallback behavior
        fallback={FallbackComponent ? <FallbackComponent /> : <DefaultFallback />}
        redirectTo={fallbackPath}
        
        // Loading state
        loading={LoadingComponent ? <LoadingComponent /> : <DefaultLoading />}
      >
        <Suspense fallback={LoadingComponent ? <LoadingComponent /> : <DefaultLoading />}>
          <LazyComponent {...componentProps} />
        </Suspense>
      </Guard>
    </ErrorBoundary>
  );
};

/**
 * FeatureLazyRoute - Lazy loads a component with feature guard only
 */
export const FeatureLazyRoute: React.FC<{
  feature: string;
  importFn: () => Promise<{ default: ComponentType<any> }>;
  fallbackPath?: string;
  loadingComponent?: React.ComponentType;
  componentProps?: Record<string, any>;
}> = ({ feature, importFn, fallbackPath, loadingComponent, componentProps }) => {
  return (
    <LazyRoute
      feature={feature}
      importFn={importFn}
      fallbackPath={fallbackPath}
      loadingComponent={loadingComponent}
      componentProps={componentProps}
    />
  );
};

/**
 * PermissionLazyRoute - Lazy loads a component with permission guard only
 */
export const PermissionLazyRoute: React.FC<{
  permission: string;
  importFn: () => Promise<{ default: ComponentType<any> }>;
  fallbackPath?: string;
  loadingComponent?: React.ComponentType;
  componentProps?: Record<string, any>;
}> = ({ permission, importFn, fallbackPath, loadingComponent, componentProps }) => {
  return (
    <LazyRoute
      permission={permission}
      importFn={importFn}
      fallbackPath={fallbackPath}
      loadingComponent={loadingComponent}
      componentProps={componentProps}
    />
  );
};

/**
 * RoleLazyRoute - Lazy loads a component with role guard only
 */
export const RoleLazyRoute: React.FC<{
  role: string;
  roles?: string[];
  requireAny?: boolean;
  importFn: () => Promise<{ default: ComponentType<any> }>;
  fallbackPath?: string;
  loadingComponent?: React.ComponentType;
  componentProps?: Record<string, any>;
}> = ({ role, roles, requireAny, importFn, fallbackPath, loadingComponent, componentProps }) => {
  return (
    <LazyRoute
      role={role}
      roles={roles}
      requireAnyRole={requireAny}
      importFn={importFn}
      fallbackPath={fallbackPath}
      loadingComponent={loadingComponent}
      componentProps={componentProps}
    />
  );
};

export default LazyRoute;










