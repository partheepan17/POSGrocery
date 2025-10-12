/**
 * User Service
 * Manages user accounts, roles, PINs, and security settings
 */

import { dataService } from './dataService';
import { authService, User } from './authService';
import { auditService, AUDIT_ACTIONS } from './auditService';
import { Role } from '@/security/permissions';

export interface UserFilters {
  search?: string;
  role?: Role | 'ALL';
  status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'ALL';
}

export interface UserCreateInput {
  name: string;
  role: Role;
  active?: boolean;
  email?: string;
  phone?: string;
  pin?: string;
}

export interface UserUpdateInput {
  name?: string;
  role?: Role;
  active?: boolean;
  email?: string;
  phone?: string;
}

export interface UserWithStatus extends User {
  email?: string;
  phone?: string;
  last_login_at?: string;
  is_locked: boolean;
  lockout_expires?: string;
}

export interface UserCSVImportRow {
  name: string;
  role: string;
  active: string | boolean;
  pin?: string;
}

export interface UserCSVExportRow {
  name: string;
  role: string;
  active: boolean;
  locked_until: string;
}

class UserService {
  /**
   * List users with filters and status information
   */
  async listUsers(filters: UserFilters = {}): Promise<UserWithStatus[]> {
    try {
      let query = `
        SELECT 
          u.*,
          CASE 
            WHEN u.pin_locked_until > datetime('now') THEN 1 
            ELSE 0 
          END as is_locked,
          u.pin_locked_until as lockout_expires
        FROM users u
        WHERE 1=1
      `;
      
      const params: any[] = [];

      if (filters.search) {
        query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filters.role && filters.role !== 'ALL') {
        query += ' AND u.role = ?';
        params.push(filters.role);
      }

      if (filters.status && filters.status !== 'ALL') {
        switch (filters.status) {
          case 'ACTIVE':
            query += ' AND u.active = 1';
            break;
          case 'INACTIVE':
            query += ' AND u.active = 0';
            break;
          case 'LOCKED':
            query += ' AND u.pin_locked_until > datetime("now")';
            break;
        }
      }

      query += ' ORDER BY u.name ASC';

      const users = await dataService.query<UserWithStatus>(query, params);
      
      return users.map(user => ({
        ...user,
        is_locked: Boolean(user.is_locked),
        lockout_expires: user.lockout_expires || undefined
      }));

    } catch (error) {
      console.error('Failed to list users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with status information
   */
  async getUser(id: number): Promise<UserWithStatus | null> {
    try {
      const users = await dataService.query<UserWithStatus>(
        `SELECT 
          u.*,
          CASE 
            WHEN u.pin_locked_until > datetime('now') THEN 1 
            ELSE 0 
          END as is_locked,
          u.pin_locked_until as lockout_expires
        FROM users u
        WHERE u.id = ?`,
        [Number(id)]
      );

      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        ...user,
        is_locked: Boolean(user.is_locked),
        lockout_expires: user.lockout_expires || undefined
      };

    } catch (error) {
      console.error('Failed to get user:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async createUser(input: UserCreateInput): Promise<UserWithStatus> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Validate role
      const validRoles: Role[] = ['CASHIER', 'MANAGER', 'ADMIN', 'AUDITOR'];
      if (!validRoles.includes(input.role)) {
        throw new Error('Invalid role specified');
      }

      // Check if user name already exists
      const existingUsers = await dataService.query(
        'SELECT id FROM users WHERE name = ?',
        [input.name]
      );

      if (existingUsers.length > 0) {
        throw new Error('User with this name already exists');
      }

      const now = new Date().toISOString();
      
      const result = await dataService.execute(
        `INSERT INTO users (
          name, role, pin, active, email, phone, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.name,
          input.role,
          input.pin || '',
          input.active !== false ? 1 : 0,
          input.email || null,
          input.phone || null,
          now,
          now
        ]
      );

      const userId = result.lastInsertRowid;
      
      // Log user creation
      await auditService.log({
        action: AUDIT_ACTIONS.USER_CREATE,
        entity: 'user',
        entityId: userId,
        payload: {
          name: input.name,
          role: input.role,
          active: input.active !== false,
          has_pin: Boolean(input.pin)
        }
      });

      const user = await this.getUser(Number(userId ?? 0));
      if (!user) {
        throw new Error('Failed to retrieve created user');
      }

      console.log(`User created: ${input.name} (${input.role})`);
      return user;

    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Update existing user
   */
  async updateUser(id: number, input: UserUpdateInput): Promise<UserWithStatus> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const existingUser = await this.getUser(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Validate role if provided
      if (input.role) {
        const validRoles: Role[] = ['CASHIER', 'MANAGER', 'ADMIN', 'AUDITOR'];
        if (!validRoles.includes(input.role)) {
          throw new Error('Invalid role specified');
        }
      }

      // Check if name already exists (excluding current user)
      if (input.name && input.name !== existingUser.name) {
        const existingUsers = await dataService.query(
          'SELECT id FROM users WHERE name = ? AND id != ?',
          [input.name, id]
        );

        if (existingUsers.length > 0) {
          throw new Error('User with this name already exists');
        }
      }

      // Build update query
      const updates: string[] = [];
      const params: any[] = [];

      if (input.name !== undefined) {
        updates.push('name = ?');
        params.push(input.name);
      }

      if (input.role !== undefined) {
        updates.push('role = ?');
        params.push(input.role);
      }

      if (input.active !== undefined) {
        updates.push('active = ?');
        params.push(input.active ? 1 : 0);
      }

      if (input.email !== undefined) {
        updates.push('email = ?');
        params.push(input.email || null);
      }

      if (input.phone !== undefined) {
        updates.push('phone = ?');
        params.push(input.phone || null);
      }

      if (updates.length === 0) {
        return existingUser; // No changes
      }

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      await dataService.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Log user update
      const changes: any = {};
      if (input.name !== undefined) changes.name = input.name;
      if (input.role !== undefined) changes.role = input.role;
      if (input.active !== undefined) changes.active = input.active;
      if (input.email !== undefined) changes.email = input.email;
      if (input.phone !== undefined) changes.phone = input.phone;

      await auditService.log({
        action: AUDIT_ACTIONS.USER_UPDATE,
        entity: 'user',
        entityId: id,
        payload: {
          changes,
          previous: {
            name: existingUser.name,
            role: existingUser.role,
            active: existingUser.active
          }
        }
      });

      // Log role change specifically if role changed
      if (input.role && input.role !== existingUser.role) {
        await auditService.log({
          action: AUDIT_ACTIONS.USER_ROLE_CHANGE,
          entity: 'user',
          entityId: id,
          payload: {
            from_role: existingUser.role,
            to_role: input.role,
            user_name: input.name || existingUser.name
          }
        });
      }

      const updatedUser = await this.getUser(id);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      console.log(`User updated: ${updatedUser.name} (ID: ${id})`);
      return updatedUser;

    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Toggle user active status
   */
  async toggleActive(id: number, active: boolean): Promise<UserWithStatus> {
    try {
      const user = await this.getUser(id);
      if (!user) {
        throw new Error('User not found');
      }

      await dataService.execute(
        'UPDATE users SET active = ?, updated_at = ? WHERE id = ?',
        [active ? 1 : 0, new Date().toISOString(), id]
      );

      // Log activation/deactivation
      await auditService.log({
        action: active ? AUDIT_ACTIONS.USER_ACTIVATE : AUDIT_ACTIONS.USER_DEACTIVATE,
        entity: 'user',
        entityId: id,
        payload: {
          user_name: user.name,
          active
        }
      });

      const updatedUser = await this.getUser(id);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      console.log(`User ${active ? 'activated' : 'deactivated'}: ${user.name}`);
      return updatedUser;

    } catch (error) {
      console.error('Failed to toggle user active status:', error);
      throw error;
    }
  }

  /**
   * Set user PIN (resets attempts and lockout)
   */
  async setPin(id: number, pin: string): Promise<void> {
    try {
      const user = await this.getUser(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate PIN
      if (!pin || pin.length < 4 || pin.length > 6) {
        throw new Error('PIN must be 4-6 digits');
      }

      if (!/^\d+$/.test(pin)) {
        throw new Error('PIN must contain only digits');
      }

      await dataService.execute(
        `UPDATE users 
         SET pin = ?, pin_attempts = 0, pin_locked_until = NULL, updated_at = ?
         WHERE id = ?`,
        [pin, new Date().toISOString(), id]
      );

      // Log PIN reset
      await auditService.log({
        action: AUDIT_ACTIONS.USER_PIN_RESET,
        entity: 'user',
        entityId: id,
        payload: {
          user_name: user.name,
          reset_by: authService.getCurrentUser()?.name
        }
      });

      console.log(`PIN reset for user: ${user.name}`);

    } catch (error) {
      console.error('Failed to set user PIN:', error);
      throw error;
    }
  }

  /**
   * Reset user lockout (clear attempts and lockout time)
   */
  async resetLock(id: number): Promise<void> {
    try {
      const user = await this.getUser(id);
      if (!user) {
        throw new Error('User not found');
      }

      await dataService.execute(
        'UPDATE users SET pin_attempts = 0, pin_locked_until = NULL, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );

      // Log lock reset
      await auditService.log({
        action: AUDIT_ACTIONS.USER_LOCK_RESET,
        entity: 'user',
        entityId: id,
        payload: {
          user_name: user.name,
          reset_by: authService.getCurrentUser()?.name
        }
      });

      console.log(`Lock reset for user: ${user.name}`);

    } catch (error) {
      console.error('Failed to reset user lock:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(id: number): Promise<void> {
    try {
      const user = await this.getUser(id);
      if (!user) {
        throw new Error('User not found');
      }

      // For safety, we deactivate instead of hard delete
      await this.toggleActive(id, false);

      console.log(`User deleted (deactivated): ${user.name}`);

    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Get user statistics for health checks
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    lockedUsers: number;
    managerUsers: number;
    usersWithoutRole: number;
  }> {
    try {
      const [totalResult, activeResult, lockedResult, managerResult, noRoleResult] = await Promise.all([
        dataService.query<{count: number}>('SELECT COUNT(*) as count FROM users'),
        dataService.query<{count: number}>('SELECT COUNT(*) as count FROM users WHERE active = 1'),
        dataService.query<{count: number}>('SELECT COUNT(*) as count FROM users WHERE pin_locked_until > datetime("now")'),
        dataService.query<{count: number}>('SELECT COUNT(*) as count FROM users WHERE role IN (?, ?) AND active = 1', ['MANAGER', 'ADMIN']),
        dataService.query<{count: number}>('SELECT COUNT(*) as count FROM users WHERE role IS NULL OR role = ""')
      ]);

      return {
        totalUsers: totalResult[0]?.count || 0,
        activeUsers: activeResult[0]?.count || 0,
        lockedUsers: lockedResult[0]?.count || 0,
        managerUsers: managerResult[0]?.count || 0,
        usersWithoutRole: noRoleResult[0]?.count || 0
      };

    } catch (error) {
      console.error('Failed to get user stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        lockedUsers: 0,
        managerUsers: 0,
        usersWithoutRole: 0
      };
    }
  }

  /**
   * Validate CSV import data
   */
  validateCSVRow(row: UserCSVImportRow, index: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!row.name || typeof row.name !== 'string' || row.name.trim().length === 0) {
      errors.push('Name is required');
    }

    // Validate role
    const validRoles: Role[] = ['CASHIER', 'MANAGER', 'ADMIN', 'AUDITOR'];
    if (!row.role || !validRoles.includes(row.role as Role)) {
      errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Validate active
    if (row.active !== undefined) {
      const activeStr = String(row.active).toLowerCase();
      if (!['true', 'false', '1', '0'].includes(activeStr)) {
        errors.push('Active must be true/false or 1/0');
      }
    }

    // Validate PIN if provided
    if (row.pin) {
      if (typeof row.pin !== 'string' || !/^\d{4,6}$/.test(row.pin)) {
        errors.push('PIN must be 4-6 digits');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert active string to boolean
   */
  private parseActive(value: string | boolean): boolean {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase();
    return str === 'true' || str === '1';
  }
}

// Export singleton instance
export const userService = new UserService();
