import express from 'express';
import { AuthService } from '../auth/authService';
import { requireAuth } from '../middleware/requireAuth';

export function createAuthRoutes(authService: AuthService) {
  const router = express.Router();

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { username, password, pin } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      if (!username || (!password && !pin)) {
        return res.status(400).json({
          success: false,
          message: 'Username and password or PIN required'
        });
      }

      const result = await authService.login(
        { username, password, pin },
        ipAddress,
        userAgent
      );

      if (result.success) {
        res.json({
          success: true,
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          message: 'Login successful'
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message || 'Login failed'
        });
      }
    } catch (error) {
      console.error('Login route error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', requireAuth(authService), async (req, res) => {
    try {
      const userId = req.user!.id;
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7); // Remove 'Bearer ' prefix

      const success = await authService.logout(userId, token);

      if (success) {
        res.json({
          success: true,
          message: 'Logout successful'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }
    } catch (error) {
      console.error('Logout route error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // GET /api/auth/me
  router.get('/me', requireAuth(authService), async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await authService.getCurrentUser(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user roles and permissions
      const roles = await authService.getUserRoles(userId);
      const permissions = await authService.getUserPermissions(userId);

      res.json({
        success: true,
        user: {
          ...user,
          roles: roles.map(r => r.name),
          permissions: permissions.map(p => p.name)
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // POST /api/auth/refresh
  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      // Verify refresh token
      const user = await authService.verifyToken(refreshToken);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new access token
      const newToken = authService.generateToken(user);

      res.json({
        success: true,
        token: newToken,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // GET /api/auth/sessions
  router.get('/sessions', requireAuth(authService), async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user's active sessions
      const sessions = authService.getUserSessions(userId);

      res.json({
        success: true,
        sessions
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // DELETE /api/auth/sessions/:sessionId
  router.delete('/sessions/:sessionId', requireAuth(authService), async (req, res) => {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.sessionId;

      const success = await authService.revokeSession(userId, sessionId);

      if (success) {
        res.json({
          success: true,
          message: 'Session revoked successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  return router;
}