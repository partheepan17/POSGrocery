/**
 * Auth Store - Manages user authentication and role-based access
 */

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier';
  email?: string;
  full_name?: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: 'admin' | 'manager' | 'cashier';
  iat: number;
  exp: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setToken: (token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  hasRole: (roles: string | string[]) => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isCashier: () => boolean;
  canAccess: (permission: string) => boolean;
}

type AuthStore = AuthState & AuthActions;

// Permission definitions
const PERMISSIONS = {
  // Product management
  'products.create': ['admin', 'manager'],
  'products.update': ['admin', 'manager'],
  'products.delete': ['admin', 'manager'],
  'products.hard_delete': ['admin'],
  'products.view_costs': ['admin', 'manager'],
  'products.adjust_stock': ['admin', 'manager'],
  
  // User management
  'users.create': ['admin'],
  'users.update': ['admin'],
  'users.delete': ['admin'],
  'users.view_all': ['admin', 'manager'],
  
  // Reports and analytics
  'reports.financial': ['admin', 'manager'],
  'reports.analytics': ['admin', 'manager'],
  'reports.export': ['admin', 'manager'],
  
  // System administration
  'system.settings': ['admin'],
  'system.backup': ['admin'],
  'system.logs': ['admin'],
  'system.maintenance': ['admin'],
  
  // Sales operations
  'sales.create': ['admin', 'manager', 'cashier'],
  'sales.update': ['admin', 'manager', 'cashier'],
  'sales.delete': ['admin', 'manager'],
  'sales.refund': ['admin', 'manager', 'cashier'],
  'sales.void': ['admin', 'manager'],
  
  // Inventory management
  'inventory.view': ['admin', 'manager', 'cashier'],
  'inventory.adjust': ['admin', 'manager'],
  'inventory.transfer': ['admin', 'manager'],
  'inventory.audit': ['admin', 'manager'],
  
  // Customer management
  'customers.create': ['admin', 'manager', 'cashier'],
  'customers.update': ['admin', 'manager', 'cashier'],
  'customers.delete': ['admin', 'manager'],
  'customers.view_all': ['admin', 'manager'],
  
  // Supplier management
  'suppliers.create': ['admin', 'manager'],
  'suppliers.update': ['admin', 'manager'],
  'suppliers.delete': ['admin', 'manager'],
  'suppliers.view_all': ['admin', 'manager'],
  
  // GRN and purchasing
  'grn.create': ['admin', 'manager'],
  'grn.update': ['admin', 'manager'],
  'grn.delete': ['admin', 'manager'],
  'grn.approve': ['admin', 'manager'],
  
  // Returns
  'returns.create': ['admin', 'manager', 'cashier'],
  'returns.update': ['admin', 'manager'],
  'returns.delete': ['admin', 'manager'],
  'returns.approve': ['admin', 'manager']
} as const;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setToken: (token: string) => {
        try {
          // Decode JWT to get user information
          const decoded = jwtDecode<JWTPayload>(token);
          
          // Check if token is expired
          const now = Math.floor(Date.now() / 1000);
          if (decoded.exp < now) {
            set({ error: 'Token expired', token: null, user: null, isAuthenticated: false });
            return;
          }

          // Create user object from JWT payload
          const user: User = {
            id: decoded.userId,
            username: decoded.username,
            name: decoded.username, // Use username as name if not provided
            role: decoded.role,
            email: undefined, // JWT doesn't include email
            full_name: undefined // JWT doesn't include full name
          };

          set({
            token,
            user,
            isAuthenticated: true,
            error: null
          });
        } catch (error) {
          console.error('Failed to decode JWT:', error);
          set({
            error: 'Invalid token',
            token: null,
            user: null,
            isAuthenticated: false
          });
        }
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      hasRole: (roles: string | string[]) => {
        const { user } = get();
        if (!user) return false;
        
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      isManager: () => {
        const { user } = get();
        return user?.role === 'manager';
      },

      isCashier: () => {
        const { user } = get();
        return user?.role === 'cashier';
      },

      canAccess: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        
        const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
        if (!allowedRoles) return false;
        
        return allowedRoles.includes(user.role as any);
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Utility functions for easy access
export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    hasRole: store.hasRole,
    isAdmin: store.isAdmin,
    isManager: store.isManager,
    isCashier: store.isCashier,
    canAccess: store.canAccess,
    setToken: store.setToken,
    clearAuth: store.clearAuth,
    setLoading: store.setLoading,
    setError: store.setError
  };
};

// Role guard component props
export interface RoleGuardProps {
  roles: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Role guard component
export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  roles, 
  children, 
  fallback = null 
}) => {
  const { hasRole } = useAuth();
  
  if (!hasRole(roles)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Permission guard component props
export interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Permission guard component
export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const { canAccess } = useAuth();
  
  if (!canAccess(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};
