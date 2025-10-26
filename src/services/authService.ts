/**
 * Auth Service - Handles authentication and JWT token management
 */

import { useAuthStore } from '@/store/authStore';

export interface User {
  id: number;
  userId: number;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier';
  email?: string;
  full_name?: string;
}

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.host}`;
  }

  /**
   * Login with username and password
   */
  async login(username: string, password?: string): Promise<{ success: boolean; message?: string; user?: User; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password: password || username })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Login failed'
        };
      }

      if (data.success && data.token) {
        // Store token in auth store (this will decode JWT and set user)
        useAuthStore.getState().setToken(data.token);

        // Create user object from token data
        const user: User = {
          id: data.user?.userId || 1,
          userId: data.user?.userId || 1,
          username: data.user?.username || username,
          name: data.user?.name || data.user?.username || username,
          role: data.user?.role || 'cashier',
          email: data.user?.email,
          full_name: data.user?.full_name || data.user?.name || data.user?.username || username
        };

        return {
          success: true,
          message: 'Login successful',
          user
        };
      }

      return {
        success: false,
        message: 'Invalid response from server'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error during login'
      };
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    useAuthStore.getState().clearAuth();
  }

  /**
   * Verify PIN for escalation (manager/admin functions)
   */
  async verifyPinForEscalation(pin: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();
      
      if (response.ok) {
        return { success: true, message: 'PIN verified successfully' };
      } else {
        return { success: false, message: data.message || 'PIN verification failed' };
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      return { success: false, message: 'Network error during PIN verification' };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return useAuthStore.getState().user;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return useAuthStore.getState().token;
  }

  /**
   * Check if user has specific role
   */
  hasRole(roles: string | string[]): boolean {
    return useAuthStore.getState().hasRole(roles);
  }

  /**
   * Check if user can access specific permission
   */
  canAccess(permission: string): boolean {
    return useAuthStore.getState().canAccess(permission);
  }

  /**
   * Check if user has a specific permission (alias for canAccess)
   */
  hasPermission(permission: string): boolean {
    return this.canAccess(permission);
  }

  /**
   * Verify PIN for authentication
   */
  async verifyPin(pin: string, role?: string): Promise<{ success: boolean; message?: string }> {
    // This is a simplified implementation
    // In a real app, you'd verify the PIN against the database
    return { success: true };
  }

  /**
   * Initialize auth from stored token
   */
  initializeAuth(): void {
    const { token } = useAuthStore.getState();
    if (token) {
      // Re-validate token by setting it again (this will decode and check expiry)
      useAuthStore.getState().setToken(token);
    }
  }

  /**
   * Make authenticated API request
   */
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    return fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers
    });
  }
}

export const authService = new AuthService();


