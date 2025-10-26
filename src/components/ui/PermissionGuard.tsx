/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions
 */

import React from 'react';
import { useUIStore } from '@/store/uiStore';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean;
  permissions?: string[];
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null, 
  requireAll = false,
  permissions = []
}: PermissionGuardProps) {
  const { userRole } = useUIStore();

  // Define role-based permissions
  const rolePermissions: Record<string, string[]> = {
    admin: [
      'products.create', 'products.update', 'products.delete',
      'customers.create', 'customers.update', 'customers.delete',
      'suppliers.create', 'suppliers.update', 'suppliers.delete',
      'categories.create', 'categories.update', 'categories.delete',
      'users.create', 'users.update', 'users.delete',
      'reports.view', 'settings.manage', 'backup.manage',
      'sales.view', 'sales.create', 'sales.update', 'sales.delete',
      'inventory.manage', 'pricing.manage', 'discounts.manage'
    ],
    manager: [
      'products.create', 'products.update',
      'customers.create', 'customers.update',
      'suppliers.create', 'suppliers.update',
      'categories.create', 'categories.update',
      'reports.view', 'settings.view',
      'sales.view', 'sales.create', 'sales.update',
      'inventory.view', 'pricing.view', 'discounts.view'
    ],
    cashier: [
      'sales.view', 'sales.create',
      'products.view', 'customers.view',
      'inventory.view'
    ],
    auditor: [
      'reports.view', 'sales.view',
      'products.view', 'customers.view',
      'inventory.view'
    ]
  };

  const hasPermission = (perm: string): boolean => {
    const userPerms = rolePermissions[userRole] || [];
    return userPerms.includes(perm);
  };

  const checkPermissions = (): boolean => {
    const allPermissions = [permission, ...permissions];
    
    if (requireAll) {
      return allPermissions.every(perm => hasPermission(perm));
    } else {
      return allPermissions.some(perm => hasPermission(perm));
    }
  };

  if (checkPermissions()) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}






