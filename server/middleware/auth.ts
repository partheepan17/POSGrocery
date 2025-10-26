/**
 * Authentication Middleware
 * Handles JWT token validation and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { createContextLogger } from '../utils/logger';
import { jwtAuthService, JWTPayload } from '../auth/jwt';
import { userService } from '../auth/userService';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: string;
        permissions: string[];
      };
      requestId?: string;
    }
  }
}

export interface AuthRequest extends Request {
  user: {
    userId: number;
    username: string;
    role: string;
    permissions: string[];
  };
}

/**
 * JWT Authentication Middleware
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const logger = createContextLogger({ operation: 'auth_middleware', requestId: req.requestId });
  
  try {
    const authHeader = req.headers.authorization;
    const token = jwtAuthService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      logger.warn('No token provided');
      res.status(401).json({
        ok: false,
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
      return;
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await jwtAuthService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      logger.warn('Token is blacklisted');
      res.status(401).json({
        ok: false,
        error: 'Token has been revoked',
        code: 'TOKEN_BLACKLISTED'
      });
      return;
    }
    
    // Verify token
    const payload = jwtAuthService.verifyToken(token);
    if (!payload) {
      logger.warn('Invalid token');
      res.status(401).json({
        ok: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }
    
    // Check if token is expired
    if (jwtAuthService.isTokenExpired(payload)) {
      logger.warn('Token expired');
      res.status(401).json({
        ok: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }
    
    // Get fresh user data to ensure user is still active
    try {
      const user = await userService.getUserById(payload.userId);
      if (!user.is_active) {
        logger.warn('User account is disabled', { userId: payload.userId });
        res.status(401).json({
          ok: false,
          error: 'User account is disabled',
          code: 'USER_DISABLED'
        });
        return;
      }
      
      // Attach user info to request
      req.user = {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        permissions: payload.permissions
      };
      
      logger.debug('User authenticated', { 
        userId: payload.userId, 
        username: payload.username, 
        role: payload.role 
      });
      
      next();
    } catch (error) {
      logger.error('User not found', { userId: payload.userId, error: error.message });
      res.status(401).json({
        ok: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }
    
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
    return;
  }
};

/**
 * Role-based Authorization Middleware
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const logger = createContextLogger({ operation: 'role_auth', requestId: req.requestId });
    
    if (!req.user) {
      logger.warn('No user in request for role check');
      res.status(401).json({
        ok: false,
        error: 'Authentication required',
        code: 'NO_USER'
      });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Insufficient role', { 
        userRole: req.user.role, 
        requiredRoles: allowedRoles 
      });
      res.status(403).json({
        ok: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        details: {
          userRole: req.user.role,
          requiredRoles: allowedRoles
        }
      });
      return;
    }
    
    logger.debug('Role check passed', { 
      userRole: req.user.role, 
      requiredRoles: allowedRoles 
    });
    
    next();
  };
};

/**
 * Permission-based Authorization Middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const logger = createContextLogger({ operation: 'permission_auth', requestId: req.requestId });
    
    if (!req.user) {
      logger.warn('No user in request for permission check');
      res.status(401).json({
        ok: false,
        error: 'Authentication required',
        code: 'NO_USER'
      });
      return;
    }
    
    if (!req.user.permissions.includes(permission)) {
      logger.warn('Insufficient permission', { 
        userPermissions: req.user.permissions, 
        requiredPermission: permission 
      });
      res.status(403).json({
        ok: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSION',
        details: {
          userPermissions: req.user.permissions,
          requiredPermission: permission
        }
      });
      return;
    }
    
    logger.debug('Permission check passed', { 
      userPermissions: req.user.permissions, 
      requiredPermission: permission 
    });
    
    next();
  };
};

/**
 * Optional Authentication Middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const logger = createContextLogger({ operation: 'optional_auth', requestId: req.requestId });
  
  try {
    const authHeader = req.headers.authorization;
    const token = jwtAuthService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      next();
      return;
    }
    
    const payload = jwtAuthService.verifyToken(token);
    if (!payload || jwtAuthService.isTokenExpired(payload)) {
      next();
      return;
    }
    
    try {
      const user = await userService.getUserById(payload.userId);
      if (user.is_active) {
        req.user = {
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
          permissions: payload.permissions
        };
        
        logger.debug('Optional auth successful', { 
          userId: payload.userId, 
          username: payload.username 
        });
      }
    } catch (error) {
      // User not found or inactive, continue without auth
      logger.debug('Optional auth failed', { error: error.message });
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth error', { error: error.message });
    next();
  }
};

/**
 * Admin Only Middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Manager or Admin Middleware
 */
export const requireManager = requireRole('manager', 'admin');

/**
 * Any Authenticated User Middleware
 */
export const requireAuth = authenticateToken;