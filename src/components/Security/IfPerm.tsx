/**
 * IfPerm Component
 * Conditionally renders children based on user permissions
 */

import React from 'react';
import { authService } from '@/services/authService';
import { Permission } from '@/security/permissions';

interface IfPermProps {
  can: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  disabled?: boolean;
}

const IfPerm: React.FC<IfPermProps> = ({ 
  can, 
  children, 
  fallback = null,
  disabled = false 
}) => {
  const hasPermission = authService.hasPermission(can);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  // If disabled prop is true, render children but disabled
  if (disabled && React.isValidElement(children)) {
    return React.cloneElement(children, {
      disabled: true,
      title: `Requires ${can.replace(/_/g, ' ').toLowerCase()} permission`,
      ...children.props
    });
  }

  return <>{children}</>;
};

export default IfPerm;


