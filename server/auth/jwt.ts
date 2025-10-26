/**
 * JWT Authentication Service
 * Handles JWT token generation, validation, and refresh
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createContextLogger } from '../utils/logger';

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserSession {
  userId: number;
  username: string;
  role: string;
  permissions: string[];
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export class JWTAuthService {
  private logger = createContextLogger({ operation: 'jwt_auth' });
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly REFRESH_TOKEN_EXPIRES_IN: string;
  private readonly SALT_ROUNDS: number = 12;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
    this.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    
    if (this.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      this.logger.warn('Using default JWT secret - change in production!');
    }
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'pos-system',
      audience: 'pos-client'
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'pos-system',
      audience: 'pos-client'
    });
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'pos-system',
        audience: 'pos-client'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      this.logger.warn('Invalid JWT token', { error: error.message });
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(payload: JWTPayload): boolean {
    if (!payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(payload: JWTPayload): Date | null {
    if (!payload.exp) return null;
    return new Date(payload.exp * 1000);
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  } {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
    // Calculate expiration time
    const decoded = this.verifyToken(accessToken);
    const expiresAt = decoded ? this.getTokenExpiration(decoded) : new Date(Date.now() + 3600000); // 1 hour default
    
    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAt || new Date(Date.now() + 3600000)
    };
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): {
    accessToken: string;
    expiresAt: Date;
  } | null {
    const payload = this.verifyToken(refreshToken);
    if (!payload || this.isTokenExpired(payload)) {
      return null;
    }

    const accessToken = this.generateAccessToken({
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions
    });

    const decoded = this.verifyToken(accessToken);
    const expiresAt = decoded ? this.getTokenExpiration(decoded) : new Date(Date.now() + 3600000);

    return {
      accessToken,
      expiresAt: expiresAt || new Date(Date.now() + 3600000)
    };
  }

  /**
   * Blacklist token (for logout)
   */
  async blacklistToken(token: string): Promise<void> {
    // In a production system, you'd store blacklisted tokens in Redis
    // For now, we'll just log it
    this.logger.info('Token blacklisted', { token: token.substring(0, 20) + '...' });
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    // In a production system, you'd check Redis
    // For now, always return false
    return false;
  }
}

// Export singleton instance
export const jwtAuthService = new JWTAuthService();










