import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: number;
  username: string;
  email?: string;
  name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_system_role: boolean;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface LoginRequest {
  username: string;
  password?: string;
  pin?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export class AuthService {
  private db: Database;
  private jwtSecret: string;
  private jwtExpiry: string;
  private refreshTokenExpiry: string;

  constructor(db: Database) {
    this.db = db;
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiry = process.env.JWT_EXPIRY || '1h';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  }

  async login(credentials: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    try {
      const { username, password, pin } = credentials;

      // Find user by username
      const user = this.db.prepare(`
        SELECT id, username, email, password_hash, pin, name, phone, role, is_active, 
               last_login, failed_login_attempts, locked_until
        FROM users 
        WHERE username = ? AND is_active = 1
      `).get(username) as any;

      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return { success: false, message: 'Account is temporarily locked' };
      }

      // Verify credentials
      let isValid = false;
      if (password && user.password_hash) {
        isValid = await bcrypt.compare(password, user.password_hash);
      } else if (pin && user.pin) {
        isValid = pin === user.pin;
      }

      if (!isValid) {
        // Increment failed login attempts
        this.db.prepare(`
          UPDATE users 
          SET failed_login_attempts = failed_login_attempts + 1,
              locked_until = CASE 
                WHEN failed_login_attempts >= 4 THEN datetime('now', '+15 minutes')
                ELSE locked_until
              END
          WHERE id = ?
        `).run(user.id);

        // Log failed attempt
        this.logAuthEvent(user.id, 'LOGIN_FAILED', 'authentication', {
          username,
          method: password ? 'password' : 'pin',
          ip_address: ipAddress
        });

        return { success: false, message: 'Invalid credentials' };
      }

      // Reset failed login attempts on successful login
      this.db.prepare(`
        UPDATE users 
        SET failed_login_attempts = 0, 
            locked_until = NULL,
            last_login = datetime('now')
        WHERE id = ?
      `).run(user.id);

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Store session
      this.createSession(user.id, refreshToken, ipAddress, userAgent);

      // Log successful login
      this.logAuthEvent(user.id, 'LOGIN_SUCCESS', 'authentication', {
        username,
        method: password ? 'password' : 'pin',
        ip_address: ipAddress
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          is_active: user.is_active,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        token,
        refreshToken
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async logout(userId: number, token?: string): Promise<boolean> {
    try {
      if (token) {
        // Invalidate specific session
        this.db.prepare(`
          UPDATE user_sessions 
          SET is_active = 0 
          WHERE user_id = ? AND token_hash = ?
        `).run(userId, this.hashToken(token));
      } else {
        // Invalidate all sessions for user
        this.db.prepare(`
          UPDATE user_sessions 
          SET is_active = 0 
          WHERE user_id = ?
        `).run(userId);
      }

      this.logAuthEvent(userId, 'LOGOUT', 'authentication');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  async getCurrentUser(userId: number): Promise<User | null> {
    try {
      const user = this.db.prepare(`
        SELECT id, username, email, name, phone, role, is_active, 
               last_login, created_at, updated_at
        FROM users 
        WHERE id = ? AND is_active = 1
      `).get(userId) as any;

      return user || null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getUserRoles(userId: number): Promise<Role[]> {
    try {
      const roles = this.db.prepare(`
        SELECT r.id, r.name, r.description, r.is_system_role
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
        ORDER BY r.name
      `).all(userId) as Role[];

      return roles;
    } catch (error) {
      console.error('Get user roles error:', error);
      return [];
    }
  }

  async getUserPermissions(userId: number): Promise<Permission[]> {
    try {
      const permissions = this.db.prepare(`
        SELECT DISTINCT p.id, p.name, p.description, p.resource, p.action
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ? AND rp.granted = 1
        ORDER BY p.resource, p.action
      `).all(userId) as Permission[];

      return permissions;
    } catch (error) {
      console.error('Get user permissions error:', error);
      return [];
    }
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Check if session is still active
      const session = this.db.prepare(`
        SELECT us.*, u.username, u.email, u.name, u.phone, u.role, u.is_active, 
               u.last_login, u.created_at, u.updated_at
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.token_hash = ? AND us.is_active = 1 AND us.expires_at > datetime('now')
      `).get(this.hashToken(token)) as any;

      if (!session) {
        return null;
      }

      // Update last used timestamp
      this.db.prepare(`
        UPDATE user_sessions 
        SET last_used_at = datetime('now') 
        WHERE token_hash = ?
      `).run(this.hashToken(token));

      return {
        id: session.user_id,
        username: session.username,
        email: session.email,
        name: session.name,
        phone: session.phone,
        role: session.role,
        is_active: session.is_active,
        last_login: session.last_login,
        created_at: session.created_at,
        updated_at: session.updated_at
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  private generateToken(user: any): string {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiry });
  }

  private generateRefreshToken(user: any): string {
    const payload = {
      userId: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.refreshTokenExpiry });
  }

  private hashToken(token: string): string {
    return require('crypto').createHash('sha256').update(token).digest('hex');
  }

  private createSession(userId: number, refreshToken: string, ipAddress?: string, userAgent?: string): void {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    this.db.prepare(`
      INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      this.hashToken(refreshToken),
      expiresAt.toISOString(),
      ipAddress || null,
      userAgent || null
    );
  }

  private logAuthEvent(userId: number, action: string, resource: string, details?: any): void {
    this.db.prepare(`
      INSERT INTO auth_audit_log (user_id, action, resource, details)
      VALUES (?, ?, ?, ?)
    `).run(
      userId,
      action,
      resource,
      details ? JSON.stringify(details) : null
    );
  }

  // Seed initial data
  async seedInitialData(): Promise<void> {
    try {
      // Create roles
      const roles = [
        { name: 'admin', description: 'System Administrator', is_system_role: 1 },
        { name: 'supervisor', description: 'Store Supervisor', is_system_role: 1 },
        { name: 'cashier', description: 'Cashier', is_system_role: 1 },
        { name: 'manager', description: 'Store Manager', is_system_role: 1 }
      ];

      for (const role of roles) {
        this.db.prepare(`
          INSERT OR IGNORE INTO roles (name, description, is_system_role)
          VALUES (?, ?, ?)
        `).run(role.name, role.description, role.is_system_role);
      }

      // Create permissions
      const permissions = [
        // Sales permissions
        { name: 'sales.view', description: 'View sales', resource: 'sales', action: 'view' },
        { name: 'sales.create', description: 'Create sales', resource: 'sales', action: 'create' },
        { name: 'sales.update', description: 'Update sales', resource: 'sales', action: 'update' },
        { name: 'sales.delete', description: 'Delete sales', resource: 'sales', action: 'delete' },
        
        // Inventory permissions
        { name: 'inventory.view', description: 'View inventory', resource: 'inventory', action: 'view' },
        { name: 'inventory.update', description: 'Update inventory', resource: 'inventory', action: 'update' },
        { name: 'inventory.adjust', description: 'Adjust inventory', resource: 'inventory', action: 'adjust' },
        
        // Reports permissions
        { name: 'reports.view', description: 'View reports', resource: 'reports', action: 'view' },
        { name: 'reports.export', description: 'Export reports', resource: 'reports', action: 'export' },
        
        // Settings permissions
        { name: 'settings.view', description: 'View settings', resource: 'settings', action: 'view' },
        { name: 'settings.update', description: 'Update settings', resource: 'settings', action: 'update' },
        
        // User management permissions
        { name: 'users.view', description: 'View users', resource: 'users', action: 'view' },
        { name: 'users.create', description: 'Create users', resource: 'users', action: 'create' },
        { name: 'users.update', description: 'Update users', resource: 'users', action: 'update' },
        { name: 'users.delete', description: 'Delete users', resource: 'users', action: 'delete' }
      ];

      for (const permission of permissions) {
        this.db.prepare(`
          INSERT OR IGNORE INTO permissions (name, description, resource, action)
          VALUES (?, ?, ?, ?)
        `).run(permission.name, permission.description, permission.resource, permission.action);
      }

      // Create default admin user with password
      const bcrypt = require('bcryptjs');
      const adminPasswordHash = bcrypt.hashSync('1234', 10);
      
      this.db.prepare(`
        INSERT OR IGNORE INTO users (username, name, role, is_active, email, password_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('admin', 'Administrator', 'admin', 1, 'admin@virtualpos.local', adminPasswordHash);

      // Create default cashier user
      this.db.prepare(`
        INSERT OR IGNORE INTO users (username, name, role, is_active)
        VALUES (?, ?, ?, ?)
      `).run('cashier', 'Cashier', 'cashier', 1);

      // Create default supervisor user
      this.db.prepare(`
        INSERT OR IGNORE INTO users (username, name, role, is_active)
        VALUES (?, ?, ?, ?)
      `).run('supervisor', 'Supervisor', 'manager', 1);

      // Assign roles to users
      const roleAssignments = [
        { username: 'admin', role: 'admin' },
        { username: 'cashier', role: 'cashier' },
        { username: 'supervisor', role: 'supervisor' }
      ];

      for (const assignment of roleAssignments) {
        const user = this.db.prepare('SELECT id FROM users WHERE username = ?').get(assignment.username) as any;
        const role = this.db.prepare('SELECT id FROM roles WHERE name = ?').get(assignment.role) as any;
        
        if (user && role) {
          this.db.prepare(`
            INSERT OR IGNORE INTO user_roles (user_id, role_id)
            VALUES (?, ?)
          `).run(user.id, role.id);
        }
      }

      // Assign permissions to roles
      const rolePermissions = [
        // Admin gets all permissions
        { role: 'admin', permissions: permissions.map(p => p.name) },
        
        // Supervisor gets most permissions except user management
        { role: 'supervisor', permissions: permissions.filter(p => !p.name.startsWith('users.')).map(p => p.name) },
        
        // Cashier gets basic permissions
        { role: 'cashier', permissions: [
          'sales.view', 'sales.create', 'sales.update',
          'inventory.view', 'reports.view'
        ]}
      ];

      for (const rolePerm of rolePermissions) {
        const role = this.db.prepare('SELECT id FROM roles WHERE name = ?').get(rolePerm.role) as any;
        if (role) {
          for (const permName of rolePerm.permissions) {
            const permission = this.db.prepare('SELECT id FROM permissions WHERE name = ?').get(permName) as any;
            if (permission) {
              this.db.prepare(`
                INSERT OR IGNORE INTO role_permissions (role_id, permission_id, granted)
                VALUES (?, ?, ?)
              `).run(role.id, permission.id, 1);
            }
          }
        }
      }

      console.log('✅ Auth system seeded successfully');
    } catch (error) {
      console.error('Error seeding auth data:', error);
    }
  }
}

