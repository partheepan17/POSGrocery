/**
 * User Management Service
 * Handles user CRUD operations, authentication, and role management
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { jwtAuthService, User, LoginCredentials, UserSession } from './jwt';

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserWithPermissions extends User {
  permissions: string[];
}

export class UserService {
  private logger = createContextLogger({ operation: 'user_service' });

  /**
   * Initialize user tables
   */
  async initializeTables(): Promise<void> {
    const db = getDatabase();
    
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        is_active BOOLEAN DEFAULT 1,
        last_login TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create user_sessions table for refresh tokens
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create role_permissions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        permission TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(role, permission)
      )
    `);

    // Insert default permissions
    this.initializeDefaultPermissions();
    
    this.logger.info('User tables initialized');
  }

  /**
   * Initialize default role permissions
   */
  private initializeDefaultPermissions(): void {
    const db = getDatabase();
    
    const permissions = [
      // Admin permissions
      { role: 'admin', permission: 'users.create' },
      { role: 'admin', permission: 'users.read' },
      { role: 'admin', permission: 'users.update' },
      { role: 'admin', permission: 'users.delete' },
      { role: 'admin', permission: 'reports.all' },
      { role: 'admin', permission: 'inventory.all' },
      { role: 'admin', permission: 'sales.all' },
      { role: 'admin', permission: 'settings.all' },
      
      // Manager permissions
      { role: 'manager', permission: 'users.read' },
      { role: 'manager', permission: 'reports.read' },
      { role: 'manager', permission: 'inventory.read' },
      { role: 'manager', permission: 'inventory.update' },
      { role: 'manager', permission: 'sales.read' },
      { role: 'manager', permission: 'sales.update' },
      
      // Cashier permissions
      { role: 'cashier', permission: 'sales.create' },
      { role: 'cashier', permission: 'sales.read' },
      { role: 'cashier', permission: 'inventory.read' },
      { role: 'cashier', permission: 'customers.read' },
      { role: 'cashier', permission: 'customers.create' },
      { role: 'cashier', permission: 'customers.update' }
    ];

    for (const perm of permissions) {
      try {
        db.prepare(`
          INSERT OR IGNORE INTO role_permissions (role, permission)
          VALUES (?, ?)
        `).run(perm.role, perm.permission);
      } catch (error) {
        // Ignore duplicate key errors
      }
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest, createdBy: number): Promise<User> {
    const db = getDatabase();
    
    // Check if username or email already exists
    const existingUser = db.prepare(`
      SELECT id FROM users WHERE username = ? OR email = ?
    `).get(userData.username, userData.email);
    
    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    // Hash password
    const passwordHash = await jwtAuthService.hashPassword(userData.password);
    
    // Create user
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userData.username,
      userData.email,
      passwordHash,
      userData.role,
      userData.is_active ?? true,
      createdBy
    );

    const userId = result.lastInsertRowid as number;
    
    this.logger.info('User created', { 
      userId, 
      username: userData.username, 
      role: userData.role 
    });

    return this.getUserById(userId);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<User> {
    const db = getDatabase();
    
    const user = db.prepare(`
      SELECT id, username, email, role, is_active, last_login, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId) as User | undefined;
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User & { password_hash: string }> {
    const db = getDatabase();
    
    const user = db.prepare(`
      SELECT id, username, email, password_hash, role, is_active, last_login, created_at, updated_at
      FROM users WHERE username = ?
    `).get(username) as (User & { password_hash: string }) | undefined;
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  /**
   * Get all users with pagination
   */
  async getUsers(page: number = 1, pageSize: number = 20, role?: string): Promise<{
    users: User[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    let params: any[] = [];
    
    if (role) {
      whereClause = 'WHERE role = ?';
      params = [role];
    }
    
    const users = db.prepare(`
      SELECT id, username, email, role, is_active, last_login, created_at, updated_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset) as User[];
    
    const totalResult = db.prepare(`
      SELECT COUNT(*) as count FROM users ${whereClause}
    `).get(...params) as { count: number };
    
    const total = totalResult.count;
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      users,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * Update user
   */
  async updateUser(userId: number, userData: UpdateUserRequest, updatedBy: number): Promise<User> {
    const db = getDatabase();
    
    // Check if user exists
    const existingUser = await this.getUserById(userId);
    
    // Check if username or email already exists (excluding current user)
    if (userData.username || userData.email) {
      const duplicateUser = db.prepare(`
        SELECT id FROM users 
        WHERE (username = ? OR email = ?) AND id != ?
      `).get(
        userData.username || existingUser.username,
        userData.email || existingUser.email,
        userId
      );
      
      if (duplicateUser) {
        throw new Error('Username or email already exists');
      }
    }
    
    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    
    if (userData.username) {
      updates.push('username = ?');
      params.push(userData.username);
    }
    if (userData.email) {
      updates.push('email = ?');
      params.push(userData.email);
    }
    if (userData.role) {
      updates.push('role = ?');
      params.push(userData.role);
    }
    if (userData.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(userData.is_active);
    }
    
    if (updates.length === 0) {
      return existingUser;
    }
    
    updates.push('updated_at = datetime("now")');
    params.push(userId);
    
    db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);
    
    this.logger.info('User updated', { userId, updatedBy, changes: Object.keys(userData) });
    
    return this.getUserById(userId);
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, passwordData: ChangePasswordRequest): Promise<void> {
    const db = getDatabase();
    
    // Get user with password hash
    const user = await this.getUserByUsername((await this.getUserById(userId)).username);
    
    // Verify current password
    const isValidPassword = await jwtAuthService.verifyPassword(
      passwordData.currentPassword, 
      user.password_hash
    );
    
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const newPasswordHash = await jwtAuthService.hashPassword(passwordData.newPassword);
    
    // Update password
    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?
    `).run(newPasswordHash, userId);
    
    this.logger.info('Password changed', { userId });
  }

  /**
   * Delete user
   */
  async deleteUser(userId: number, deletedBy: number): Promise<void> {
    const db = getDatabase();
    
    // Check if user exists
    const user = await this.getUserById(userId);
    
    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const adminCount = db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1
      `).get() as { count: number };
      
      if (adminCount.count <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }
    
    // Soft delete (set is_active = false)
    db.prepare(`
      UPDATE users SET is_active = 0, updated_at = datetime("now") WHERE id = ?
    `).run(userId);
    
    this.logger.info('User deleted', { userId, deletedBy });
  }

  /**
   * Authenticate user
   */
  async authenticateUser(credentials: LoginCredentials): Promise<UserSession> {
    const user = await this.getUserByUsername(credentials.username);
    
    if (!user.is_active) {
      throw new Error('User account is disabled');
    }
    
    const isValidPassword = await jwtAuthService.verifyPassword(
      credentials.password, 
      user.password_hash
    );
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    // Get user permissions
    const permissions = await this.getUserPermissions(user.role);
    
    // Generate tokens
    const tokenPair = jwtAuthService.generateTokenPair({
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions
    });
    
    // Store refresh token in database
    const db = getDatabase();
    db.prepare(`
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES (?, ?, ?)
    `).run(
      user.id,
      tokenPair.refreshToken,
      tokenPair.expiresAt.toISOString()
    );
    
    // Update last login
    db.prepare(`
      UPDATE users SET last_login = datetime("now") WHERE id = ?
    `).run(user.id);
    
    this.logger.info('User authenticated', { userId: user.id, username: user.username });
    
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions,
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.expiresAt
    };
  }

  /**
   * Get user permissions by role
   */
  async getUserPermissions(role: string): Promise<string[]> {
    const db = getDatabase();
    
    const permissions = db.prepare(`
      SELECT permission FROM role_permissions WHERE role = ?
    `).all(role) as { permission: string }[];
    
    return permissions.map(p => p.permission);
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
  } | null> {
    const db = getDatabase();
    
    // Check if refresh token exists and is valid
    const session = db.prepare(`
      SELECT us.*, u.username, u.role, u.is_active
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.refresh_token = ? AND us.is_active = 1 AND us.expires_at > datetime("now")
    `).get(refreshToken) as any;
    
    if (!session) {
      return null;
    }
    
    if (!session.is_active) {
      return null;
    }
    
    // Get user permissions
    const permissions = await this.getUserPermissions(session.role);
    
    // Generate new access token
    const tokenPair = jwtAuthService.generateTokenPair({
      userId: session.user_id,
      username: session.username,
      role: session.role,
      permissions
    });
    
    return {
      accessToken: tokenPair.accessToken,
      expiresAt: tokenPair.expiresAt
    };
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logoutUser(refreshToken: string): Promise<void> {
    const db = getDatabase();
    
    db.prepare(`
      UPDATE user_sessions SET is_active = 0 WHERE refresh_token = ?
    `).run(refreshToken);
    
    this.logger.info('User logged out', { refreshToken: refreshToken.substring(0, 20) + '...' });
  }

  /**
   * Get user with permissions
   */
  async getUserWithPermissions(userId: number): Promise<UserWithPermissions> {
    const user = await this.getUserById(userId);
    const permissions = await this.getUserPermissions(user.role);
    
    return {
      ...user,
      permissions
    };
  }

  /**
   * Create default admin user if none exists
   */
  async createDefaultAdmin(): Promise<void> {
    const db = getDatabase();
    
    const adminCount = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1
    `).get() as { count: number };
    
    if (adminCount.count === 0) {
      const adminUser = await this.createUser({
        username: 'admin',
        email: 'admin@pos.local',
        password: 'admin123',
        role: 'admin',
        is_active: true
      }, 1); // Self-created
      
      this.logger.info('Default admin user created', { 
        userId: adminUser.id, 
        username: adminUser.username 
      });
    }
  }
}

// Export singleton instance
export const userService = new UserService();










