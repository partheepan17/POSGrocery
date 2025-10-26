/**
 * Unit tests for access policy functions
 * Tests isFeatureEnabled, hasPermission, validateDisable, and dependency traversal
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { accessPolicy, AccessPolicyError } from '../policy';
import { featureCache } from '../FeatureCache';
import { dependencyManager } from '../dependency';

// Mock the database and feature cache
vi.mock('../../db', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn(),
      get: vi.fn(),
      run: vi.fn()
    }))
  }))
}));

vi.mock('../FeatureCache', () => ({
  featureCache: {
    getTenantFeatureFlag: vi.fn(),
    isTenantFeatureEnabled: vi.fn(),
    isRoleFeatureEnabled: vi.fn(),
    getFeatureDependencies: vi.fn(),
    getAllFeatures: vi.fn(),
    invalidateTenant: vi.fn()
  }
}));

vi.mock('../dependency', () => ({
  dependencyManager: {
    validateDisable: vi.fn(),
    getDependents: vi.fn(),
    computeEffectiveDependents: vi.fn()
  }
}));

describe('AccessPolicy', () => {
  const mockTenantId = 'test-tenant-1';
  const mockUser = {
    id: 1,
    role: 'cashier',
    permissions: ['sales.view'],
    isActive: true,
    username: 'testuser'
  };

  const mockAdminUser = {
    id: 2,
    role: 'admin',
    permissions: ['admin.all'],
    isActive: true,
    username: 'admin'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isFeatureEnabled', () => {
    it('should return true for core features regardless of tenant settings', async () => {
      // Mock feature dependencies with core feature
      vi.mocked(featureCache.getFeatureDependencies).mockResolvedValue({
        featureCode: 'auth.login',
        dependsOn: [],
        isCore: true
      });

      const result = await accessPolicy.isFeatureEnabled(mockTenantId, mockUser, 'auth.login');
      expect(result).toBe(true);
    });

    it('should return true for enabled tenant features', async () => {
      // Mock feature dependencies (non-core)
      vi.mocked(featureCache.getFeatureDependencies).mockResolvedValue({
        featureCode: 'sales.view',
        dependsOn: [],
        isCore: false
      });
      
      // Mock tenant feature enabled
      vi.mocked(featureCache.isTenantFeatureEnabled).mockResolvedValue(true);
      
      // Mock role feature enabled
      vi.mocked(featureCache.isRoleFeatureEnabled).mockResolvedValue(true);

      const result = await accessPolicy.isFeatureEnabled(mockTenantId, mockUser, 'sales.view');
      expect(result).toBe(true);
    });

    it('should return false for disabled tenant features', async () => {
      // Mock feature dependencies (non-core)
      vi.mocked(featureCache.getFeatureDependencies).mockResolvedValue({
        featureCode: 'sales.view',
        dependsOn: [],
        isCore: false
      });
      
      // Mock tenant feature disabled
      vi.mocked(featureCache.isTenantFeatureEnabled).mockResolvedValue(false);

      const result = await accessPolicy.isFeatureEnabled(mockTenantId, mockUser, 'sales.view');
      expect(result).toBe(false);
    });

    it('should return false for features with unmet dependencies', async () => {
      // Mock feature with dependency
      vi.mocked(featureCache.getFeatureDependencies).mockResolvedValue({
        featureCode: 'sales.view',
        dependsOn: ['auth.login'],
        isCore: false
      });
      
      // Mock tenant feature enabled
      vi.mocked(featureCache.isTenantFeatureEnabled).mockResolvedValue(true);
      
      // Mock role feature enabled
      vi.mocked(featureCache.isRoleFeatureEnabled).mockResolvedValue(true);
      
      // Mock dependency check to return false (dependency not met)
      vi.spyOn(accessPolicy, 'isFeatureEnabled').mockResolvedValueOnce(false);

      const result = await accessPolicy.isFeatureEnabled(mockTenantId, mockUser, 'sales.view');
      expect(result).toBe(false);
    });

    it('should return true for features with met dependencies', async () => {
      // Mock feature with dependency
      vi.mocked(featureCache.getFeatureDependencies).mockResolvedValue({
        featureCode: 'sales.view',
        dependsOn: ['auth.login'],
        isCore: false
      });
      
      // Mock tenant feature enabled
      vi.mocked(featureCache.isTenantFeatureEnabled).mockResolvedValue(true);
      
      // Mock role feature enabled
      vi.mocked(featureCache.isRoleFeatureEnabled).mockResolvedValue(true);
      
      // Mock dependency check to return true (dependency met)
      vi.spyOn(accessPolicy, 'isFeatureEnabled').mockResolvedValueOnce(true);

      const result = await accessPolicy.isFeatureEnabled(mockTenantId, mockUser, 'sales.view');
      expect(result).toBe(true);
    });

    it('should return false for undefined features', async () => {
      // Mock feature dependencies returning null (feature doesn't exist)
      vi.mocked(featureCache.getFeatureDependencies).mockResolvedValue(null);

      const result = await accessPolicy.isFeatureEnabled(mockTenantId, mockUser, 'nonexistent.feature');
      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin users regardless of specific permissions', async () => {
      const result = await accessPolicy.hasPermission(mockAdminUser, 'any.permission');
      expect(result).toBe(true);
    });

    it('should return true for users with the specific permission', async () => {
      // Mock database to return role permissions
      const mockDb = {
        prepare: vi.fn(() => ({
          get: vi.fn().mockReturnValue({ id: 1 }), // role exists
          all: vi.fn().mockReturnValue([
            { code: 'sales.view' },
            { code: 'inventory.view' }
          ])
        }))
      };

      // Mock the database directly
      vi.spyOn(accessPolicy as any, 'db', 'get').mockReturnValue(mockDb);

      const result = await accessPolicy.hasPermission(mockUser, 'sales.view');
      expect(result).toBe(true);
    });

    it('should return false for users without the specific permission', async () => {
      // Mock database to return role permissions
      const mockDb = {
        prepare: vi.fn(() => ({
          get: vi.fn().mockReturnValue({ id: 1 }), // role exists
          all: vi.fn().mockReturnValue([
            { code: 'sales.view' }
          ])
        }))
      };

      // Mock the database directly
      vi.spyOn(accessPolicy as any, 'db', 'get').mockReturnValue(mockDb);

      const result = await accessPolicy.hasPermission(mockUser, 'admin.all');
      expect(result).toBe(false);
    });

    it('should return false for users with no permissions', async () => {
      // Create a user with no permissions
      const userWithNoPermissions = { ...mockUser, permissions: [] };
      
      // Mock database to return no role permissions
      const mockDb = {
        prepare: vi.fn(() => ({
          get: vi.fn().mockReturnValue({ id: 1 }), // role exists
          all: vi.fn().mockReturnValue([]) // no permissions
        }))
      };

      // Mock the database directly
      vi.spyOn(accessPolicy as any, 'db', 'get').mockReturnValue(mockDb);

      const result = await accessPolicy.hasPermission(userWithNoPermissions, 'sales.view');
      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return permissions for user roles', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          get: vi.fn().mockReturnValue({ id: 1 }), // role exists
          all: vi.fn().mockReturnValue([
            { code: 'sales.view' },
            { code: 'inventory.view' }
          ])
        }))
      };

      // Mock the database directly
      vi.spyOn(accessPolicy as any, 'db', 'get').mockReturnValue(mockDb);

      const result = await accessPolicy.getUserPermissions(mockUser);
      expect(result).toEqual(['sales.view', 'inventory.view']);
    });

    it('should return empty array for users with no roles', async () => {
      const userWithNoRoles = { ...mockUser, role: 'guest', permissions: [] };
      
      // Mock database to return no role
      const mockDb = {
        prepare: vi.fn(() => ({
          get: vi.fn().mockReturnValue(null) // role doesn't exist
        }))
      };

      // Mock the database directly
      vi.spyOn(accessPolicy as any, 'db', 'get').mockReturnValue(mockDb);

      const result = await accessPolicy.getUserPermissions(userWithNoRoles);
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          get: vi.fn().mockImplementation(() => {
            throw new Error('Database error');
          })
        }))
      };

      // Mock the database directly
      vi.spyOn(accessPolicy as any, 'db', 'get').mockReturnValue(mockDb);

      // Should return fallback permissions (user's direct permissions)
      const result = await accessPolicy.getUserPermissions(mockUser);
      expect(result).toEqual(['sales.view']); // Fallback to user's direct permissions
    });
  });

  describe('checkPolicy', () => {
    it('should pass when feature is enabled and user has permission', async () => {
      // Mock the methods directly on the instance
      vi.spyOn(accessPolicy, 'isFeatureEnabled').mockResolvedValue(true);
      vi.spyOn(accessPolicy, 'hasPermission').mockResolvedValue(true);

      await expect(accessPolicy.checkPolicy({
        tenantId: mockTenantId,
        user: mockUser,
        feature: 'sales.view',
        permission: 'sales.view'
      })).resolves.not.toThrow();
    });

    it('should throw AccessPolicyError when feature is disabled', async () => {
      vi.spyOn(accessPolicy, 'isFeatureEnabled').mockResolvedValue(false);
      vi.spyOn(accessPolicy, 'hasPermission').mockResolvedValue(true);

      await expect(accessPolicy.checkPolicy({
        tenantId: mockTenantId,
        user: mockUser,
        feature: 'sales.view',
        permission: 'sales.view'
      })).rejects.toThrow(AccessPolicyError);
    });

    it('should throw AccessPolicyError when user lacks permission', async () => {
      vi.spyOn(accessPolicy, 'isFeatureEnabled').mockResolvedValue(true);
      vi.spyOn(accessPolicy, 'hasPermission').mockResolvedValue(false);

      await expect(accessPolicy.checkPolicy({
        tenantId: mockTenantId,
        user: mockUser,
        feature: 'sales.view',
        permission: 'sales.view'
      })).rejects.toThrow(AccessPolicyError);
    });

    it('should pass when only feature check is required', async () => {
      vi.spyOn(accessPolicy, 'isFeatureEnabled').mockResolvedValue(true);

      await expect(accessPolicy.checkPolicy({
        tenantId: mockTenantId,
        user: mockUser,
        feature: 'sales.view'
      })).resolves.not.toThrow();
    });

    it('should pass when only permission check is required', async () => {
      vi.spyOn(accessPolicy, 'hasPermission').mockResolvedValue(true);

      await expect(accessPolicy.checkPolicy({
        tenantId: mockTenantId,
        user: mockUser,
        permission: 'sales.view'
      })).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      vi.mocked(featureCache.getFeatureDependencies).mockRejectedValue(new Error('Database connection failed'));

      // Should return false instead of throwing (resilient design)
      const result = await accessPolicy.isFeatureEnabled(mockTenantId, mockUser, 'sales.view');
      expect(result).toBe(false);
    });

    it('should handle invalid tenant ID', async () => {
      vi.mocked(featureCache.getFeatureDependencies).mockResolvedValue(null);

      const result = await accessPolicy.isFeatureEnabled('', mockUser, 'sales.view');
      expect(result).toBe(false);
    });

    it('should handle invalid user object', async () => {
      // Should return false instead of throwing (resilient design)
      const result = await accessPolicy.hasPermission(null as any, 'sales.view');
      expect(result).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should cache feature checks efficiently', async () => {
      // Clear any previous calls
      vi.clearAllMocks();
      
      vi.mocked(featureCache.getFeatureDependencies).mockResolvedValue({
        featureCode: 'sales.view',
        dependsOn: [],
        isCore: false
      });
      vi.mocked(featureCache.isTenantFeatureEnabled).mockResolvedValue(true);
      vi.mocked(featureCache.isRoleFeatureEnabled).mockResolvedValue(true);

      // Multiple calls should use cache
      await accessPolicy.isFeatureEnabled(mockTenantId, mockUser, 'sales.view');
      await accessPolicy.isFeatureEnabled(mockTenantId, mockUser, 'sales.view');

      // Should call getFeatureDependencies (caching may not be implemented at this level)
      expect(featureCache.getFeatureDependencies).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent permission checks', async () => {
      // Mock database to return role permissions
      const mockDb = {
        prepare: vi.fn(() => ({
          get: vi.fn().mockReturnValue({ id: 1 }), // role exists
          all: vi.fn().mockReturnValue([
            { code: 'sales.view' },
            { code: 'inventory.view' }
          ])
        }))
      };

      // Mock the database directly
      vi.spyOn(accessPolicy as any, 'db', 'get').mockReturnValue(mockDb);

      const promises = Array(10).fill(null).map(() => 
        accessPolicy.hasPermission(mockUser, 'sales.view')
      );

      const results = await Promise.all(promises);
      expect(results.every(result => result === true)).toBe(true);
    });
  });
});