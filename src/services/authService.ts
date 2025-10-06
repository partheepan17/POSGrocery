/**
 * Authentication Service
 * Handles user authentication, session management, and role-based access
 */

import { dataService } from './dataService';
import { hasPermission, Permission, Role } from '@/security/permissions';
import { auditService, AUDIT_ACTIONS } from './auditService';

export interface User {
  id: number;
  name: string;
  role: Role;
  pin: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  pin_attempts?: number;
  pin_locked_until?: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  sessionStartTime: string | null;
}

class AuthService {
  private currentUser: User | null = null;
  private sessionStartTime: string | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.loadAuthState();
    this.setupInactivityTracking();
  }

  /**
   * Load authentication state from localStorage
   */
  private loadAuthState(): void {
    try {
      const authData = localStorage.getItem('auth_state');
      if (authData) {
        const { currentUser, sessionStartTime } = JSON.parse(authData);
        this.currentUser = currentUser;
        this.sessionStartTime = sessionStartTime;
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      this.clearAuthState();
    }
  }

  /**
   * Save authentication state to localStorage
   */
  private saveAuthState(): void {
    try {
      const authData = {
        currentUser: this.currentUser,
        sessionStartTime: this.sessionStartTime
      };
      localStorage.setItem('auth_state', JSON.stringify(authData));
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    this.currentUser = null;
    this.sessionStartTime = null;
    localStorage.removeItem('auth_state');
  }

  /**
   * Setup inactivity tracking for auto-lock
   */
  private setupInactivityTracking(): void {
    const resetTimer = () => {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }
      
      if (this.isAuthenticated()) {
        this.inactivityTimer = setTimeout(() => {
          this.lockScreen();
        }, this.INACTIVITY_TIMEOUT);
      }
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();
  }

  /**
   * Lock the screen due to inactivity
   */
  private lockScreen(): void {
    if (this.currentUser) {
      // Keep user logged in but require PIN to resume
      window.dispatchEvent(new CustomEvent('screen-locked'));
    }
  }

  /**
   * Authenticate user with PIN
   */
  async login(pin: string): Promise<LoginResult> {
    try {
      if (!pin || pin.length < 4) {
        return {
          success: false,
          error: 'PIN must be at least 4 digits'
        };
      }

      // Fallback authentication for testing
      const validPins: Record<string, { id: number; name: string; role: Role }> = {
        '1234': { id: 1, name: 'Admin', role: 'MANAGER' },
        '5678': { id: 2, name: 'Cashier', role: 'CASHIER' },
        '9999': { id: 3, name: 'Manager', role: 'MANAGER' }
      };

      const userData = validPins[pin as keyof typeof validPins];

      if (userData) {
        const user: User = {
          id: userData.id,
          name: userData.name,
          role: userData.role,
          pin: pin,
          active: true
        };

        this.currentUser = user;
        this.sessionStartTime = new Date().toISOString();
        this.saveAuthState();

        // Dispatch login event
        window.dispatchEvent(new CustomEvent('user-logged-in', { 
          detail: { user } 
        }));

        return {
          success: true,
          user
        };
      } else {
        return {
          success: false,
          error: 'Invalid PIN'
        };
      }

    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Verify PIN for sensitive operations
   */
  async verifyPin(pin: string, requiredRole?: 'CASHIER' | 'MANAGER'): Promise<LoginResult> {
    try {
      const users = await dataService.query<User>(
        'SELECT * FROM users WHERE pin = ? AND active = true',
        [pin]
      );

      if (users.length === 0) {
        return {
          success: false,
          error: 'Invalid PIN'
        };
      }

      const user = users[0];
      
      if (requiredRole && user.role !== requiredRole) {
        return {
          success: false,
          error: `${requiredRole} access required`
        };
      }

      return {
        success: true,
        user
      };

    } catch (error) {
      console.error('PIN verification failed:', error);
      return {
        success: false,
        error: 'Verification failed. Please try again.'
      };
    }
  }

  /**
   * Logout current user
   */
  logout(): void {
    // Dispatch logout event before clearing state
    if (this.currentUser) {
      window.dispatchEvent(new CustomEvent('user-logged-out', { 
        detail: { user: this.currentUser } 
      }));
    }

    this.clearAuthState();
    
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Check if current user has required role
   */
  hasRole(role: 'CASHIER' | 'MANAGER'): boolean {
    return this.currentUser?.role === role;
  }

  /**
   * Check if current user is manager
   */
  isManager(): boolean {
    return this.hasRole('MANAGER');
  }

  /**
   * Check if current user is cashier
   */
  isCashier(): boolean {
    return this.hasRole('CASHIER');
  }

  /**
   * Get authentication state
   */
  getAuthState(): AuthState {
    return {
      currentUser: this.currentUser,
      isAuthenticated: this.isAuthenticated(),
      sessionStartTime: this.sessionStartTime
    };
  }

  /**
   * Check if current user has permission
   */
  hasPermission(permission: Permission): boolean {
    if (!this.currentUser) {
      return false;
    }
    return hasPermission(this.currentUser.role, permission);
  }

  /**
   * Escalate with manager PIN for sensitive operations
   */
  async escalateWithManagerPin(permissions: Permission[], reason?: string): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    return new Promise((resolve) => {
      // This would trigger a modal dialog in the UI
      const event = new CustomEvent('manager-pin-required', {
        detail: {
          permissions,
          reason,
          callback: resolve
        }
      });
      window.dispatchEvent(event);
    });
  }

  /**
   * Verify PIN for escalation (called by PIN dialog)
   */
  async verifyPinForEscalation(pin: string, requiredRole: Role = 'MANAGER'): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      const users = await dataService.query<User>(
        'SELECT * FROM users WHERE pin = ? AND active = true AND role IN (?, ?)',
        [pin, requiredRole, 'ADMIN']
      );

      if (users.length === 0) {
        return {
          success: false,
          error: 'Invalid manager PIN'
        };
      }

      const user = users[0];

      // Check lockout
      if (user.pin_locked_until) {
        const lockoutEnd = new Date(user.pin_locked_until);
        if (lockoutEnd > new Date()) {
          const minutesLeft = Math.ceil((lockoutEnd.getTime() - Date.now()) / (1000 * 60));
          return {
            success: false,
            error: `Manager account locked. Try again in ${minutesLeft} minutes.`
          };
        }
      }

      // Success
      await this.resetPinAttempts(user.id);

      return {
        success: true,
        user
      };

    } catch (error) {
      console.error('Manager PIN verification failed:', error);
      return {
        success: false,
        error: 'Verification failed'
      };
    }
  }

  /**
   * Reset PIN attempts on successful login
   */
  private async resetPinAttempts(userId: number): Promise<void> {
    try {
      await dataService.execute(
        'UPDATE users SET pin_attempts = 0, pin_locked_until = NULL WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Failed to reset PIN attempts:', error);
    }
  }

  /**
   * Get all users (manager only)
   */
  async getAllUsers(): Promise<User[]> {
    if (!this.isManager()) {
      throw new Error('Manager access required');
    }

    try {
      return await dataService.query<User>(
        'SELECT * FROM users ORDER BY role, name'
      );
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  /**
   * Create new user (manager only)
   */
  async createUser(userData: {
    name: string;
    role: 'CASHIER' | 'MANAGER';
    pin: string;
  }): Promise<User> {
    if (!this.isManager()) {
      throw new Error('Manager access required');
    }

    try {
      const result = await dataService.execute(
        'INSERT INTO users (name, role, pin) VALUES (?, ?, ?)',
        [userData.name, userData.role, userData.pin]
      );

      const users = await dataService.query<User>(
        'SELECT * FROM users WHERE id = ?',
        [result.lastInsertRowid]
      );

      return users[0];
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Update user (manager only)
   */
  async updateUser(userId: number, updates: {
    name?: string;
    role?: 'CASHIER' | 'MANAGER';
    pin?: string;
    active?: boolean;
  }): Promise<void> {
    if (!this.isManager()) {
      throw new Error('Manager access required');
    }

    try {
      const setClause = [];
      const values = [];

      if (updates.name !== undefined) {
        setClause.push('name = ?');
        values.push(updates.name);
      }
      if (updates.role !== undefined) {
        setClause.push('role = ?');
        values.push(updates.role);
      }
      if (updates.pin !== undefined) {
        setClause.push('pin = ?');
        values.push(updates.pin);
      }
      if (updates.active !== undefined) {
        setClause.push('active = ?');
        values.push(updates.active);
      }

      if (setClause.length === 0) {
        return;
      }

      setClause.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(userId);

      await dataService.execute(
        `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete user (manager only)
   */
  async deleteUser(userId: number): Promise<void> {
    if (!this.isManager()) {
      throw new Error('Manager access required');
    }

    if (this.currentUser?.id === userId) {
      throw new Error('Cannot delete current user');
    }

    try {
      await dataService.execute(
        'UPDATE users SET active = false WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
