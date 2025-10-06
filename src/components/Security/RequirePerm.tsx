/**
 * RequirePerm Component
 * Guard component that renders fallback if user lacks permission
 */

import React from 'react';
import { authService } from '@/services/authService';
import { Permission } from '@/security/permissions';
import { Lock, AlertTriangle } from 'lucide-react';

interface RequirePermProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

const RequirePerm: React.FC<RequirePermProps> = ({ 
  permission, 
  children, 
  fallback,
  showFallback = true 
}) => {
  const hasPermission = authService.hasPermission(permission);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showFallback) {
      return null;
    }

    // Default fallback UI
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
          <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Access Restricted
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
          You don't have permission to access this feature. Contact your manager if you need access.
        </p>
        
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm text-amber-800 dark:text-amber-300">
            Required: {permission.replace(/_/g, ' ').toLowerCase()}
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequirePerm;







