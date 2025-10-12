import { getDatabase } from '../db';
import { createRequestLogger } from './logger';

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'cashier' | 'manager' | 'admin';
  is_active: boolean;
  pin?: string;
}

export interface RBACContext {
  user: User;
  requestId: string;
}

export class RBACService {
  private getDb() {
    try {
      return getDatabase();
    } catch (error) {
      // Database not initialized yet, return null
      return null;
    }
  }

  /**
   * Get user by ID with role information
   */
  getUser(userId: number): User | null {
    try {
      const db = this.getDb();
      if (!db) return null;

      const user = db.prepare(`
        SELECT id, username, name, role, is_active, pin
        FROM users
        WHERE id = ? AND is_active = 1
      `).get(userId) as User | null;

      return user;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Verify user PIN for sensitive operations
   */
  verifyPin(userId: number, pin: string): { success: boolean; user?: User; reason?: string } {
    try {
      const user = this.getUser(userId);
      
      if (!user) {
        return { success: false, reason: 'User not found or inactive' };
      }

      if (!user.pin) {
        return { success: false, reason: 'No PIN set for user' };
      }

      if (user.pin !== pin) {
        return { success: false, reason: 'Invalid PIN' };
      }

      return { success: true, user };
    } catch (error) {
      console.error('Failed to verify PIN:', error);
      return { success: false, reason: 'PIN verification failed' };
    }
  }

  /**
   * Check if user has permission for operation
   */
  hasPermission(user: User, operation: string): boolean {
    switch (operation) {
      case 'QUICK_SALE_ADD_LINE':
        return ['cashier', 'manager', 'admin'].includes(user.role);
      
      case 'QUICK_SALE_DELETE_LINE':
      case 'QUICK_SALE_CLOSE_SESSION':
      case 'QUICK_SALE_BACKDATE_CLOSE':
        return ['manager', 'admin'].includes(user.role);
      
      default:
        return false;
    }
  }

  /**
   * Require specific role for operation
   */
  requireRole(user: User, requiredRole: string): { allowed: boolean; reason?: string } {
    const roleHierarchy = {
      'cashier': 1,
      'manager': 2,
      'admin': 3
    };

    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    if (userLevel >= requiredLevel) {
      return { allowed: true };
    }

    return { 
      allowed: false, 
      reason: `Requires ${requiredRole} role or higher. Current role: ${user.role}` 
    };
  }

  /**
   * Get user context from request
   */
  getContextFromRequest(req: any): RBACContext | null {
    try {
      // For now, we'll use a simple approach - in production this would come from JWT/session
      const userId = req.userId || req.headers['x-user-id'] || 1; // Default to user 1
      const user = this.getUser(parseInt(userId));
      
      if (!user) {
        return null;
      }

      return {
        user,
        requestId: req.requestId || 'unknown'
      };
    } catch (error) {
      console.error('Failed to get context from request:', error);
      return null;
    }
  }
}

export const rbacService = new RBACService();
