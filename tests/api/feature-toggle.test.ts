/**
 * API Integration tests for feature toggle endpoints
 * Tests toggles permit/deny, 403 on blocked, and real-time updates
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios from 'axios';
import { createServer } from 'http';
import { app } from '../../server/index';

const BASE_URL = 'http://localhost:3001';
const TEST_TENANT = 'test-tenant-api';

let server: any;
let authToken: string;
let cashierToken: string;

// Test configuration
const testConfig = {
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT
  }
};

describe('Feature Toggle API Integration Tests', () => {
  beforeAll(async () => {
    // Start test server
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(3001, () => {
        console.log('Test server started on port 3001');
        resolve();
      });
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('Test server closed');
          resolve();
        });
      });
    }
  });

  beforeEach(async () => {
    // Login as admin
    try {
      const adminResponse = await axios.post('/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      }, testConfig);
      authToken = adminResponse.data.data.token;
      testConfig.headers['Authorization'] = `Bearer ${authToken}`;
    } catch (error) {
      console.warn('Admin login failed, continuing with tests');
    }

    // Login as cashier
    try {
      const cashierResponse = await axios.post('/api/auth/login', {
        username: 'cashier',
        password: 'cashier123'
      }, testConfig);
      cashierToken = cashierResponse.data.data.token;
    } catch (error) {
      console.warn('Cashier login failed, continuing with tests');
    }
  });

  describe('Feature Toggle Endpoints', () => {
    it('should allow admin to toggle features', async () => {
      const response = await axios.post('/api/admin/features/toggle', {
        featureCode: 'inventory.view',
        isEnabled: true
      }, testConfig);

      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      expect(response.data.data.featureCode).toBe('inventory.view');
      expect(response.data.data.isEnabled).toBe(true);
    });

    it('should deny non-admin users from toggling features', async () => {
      const cashierConfig = {
        ...testConfig,
        headers: {
          ...testConfig.headers,
          'Authorization': `Bearer ${cashierToken}`
        }
      };

      try {
        await axios.post('/api/admin/features/toggle', {
          featureCode: 'inventory.view',
          isEnabled: true
        }, cashierConfig);
        expect.fail('Should have thrown 403 error');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.ok).toBe(false);
        expect(error.response.data.reason).toContain('permission');
      }
    });

    it('should return 401 for unauthenticated requests', async () => {
      const unauthenticatedConfig = {
        ...testConfig,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': TEST_TENANT
        }
      };

      try {
        await axios.post('/api/admin/features/toggle', {
          featureCode: 'inventory.view',
          isEnabled: true
        }, unauthenticatedConfig);
        expect.fail('Should have thrown 401 error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should validate request body', async () => {
      try {
        await axios.post('/api/admin/features/toggle', {
          // Missing required fields
        }, testConfig);
        expect.fail('Should have thrown 400 error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.ok).toBe(false);
        expect(error.response.data.error).toContain('Invalid request data');
      }
    });

    it('should handle cascade disable', async () => {
      // First enable a feature with dependents
      await axios.post('/api/admin/features/toggle', {
        featureCode: 'sales.view',
        isEnabled: true
      }, testConfig);

      await axios.post('/api/admin/features/toggle', {
        featureCode: 'sales.create',
        isEnabled: true
      }, testConfig);

      // Now disable with cascade
      const response = await axios.post('/api/admin/features/toggle', {
        featureCode: 'sales.view',
        isEnabled: false,
        cascade: true
      }, testConfig);

      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      expect(response.data.data.cascadeTargets).toBeDefined();
    });

    it('should block disable without cascade when dependents exist', async () => {
      // Enable feature with dependents
      await axios.post('/api/admin/features/toggle', {
        featureCode: 'sales.view',
        isEnabled: true
      }, testConfig);

      await axios.post('/api/admin/features/toggle', {
        featureCode: 'sales.create',
        isEnabled: true
      }, testConfig);

      // Try to disable without cascade
      try {
        await axios.post('/api/admin/features/toggle', {
          featureCode: 'sales.view',
          isEnabled: false,
          cascade: false
        }, testConfig);
        expect.fail('Should have thrown 400 error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.ok).toBe(false);
        expect(error.response.data.error).toBe('DEPENDENTS');
        expect(error.response.data.blockingDependents).toBeDefined();
      }
    });
  });

  describe('Role Feature Override Endpoints', () => {
    it('should allow admin to override role features', async () => {
      const response = await axios.post('/api/admin/features/override', {
        roleId: 2, // manager role
        featureCode: 'inventory.view',
        isEnabled: false
      }, testConfig);

      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      expect(response.data.data.roleId).toBe(2);
      expect(response.data.data.featureCode).toBe('inventory.view');
    });

    it('should deny non-admin users from overriding role features', async () => {
      const cashierConfig = {
        ...testConfig,
        headers: {
          ...testConfig.headers,
          'Authorization': `Bearer ${cashierToken}`
        }
      };

      try {
        await axios.post('/api/admin/features/override', {
          roleId: 2,
          featureCode: 'inventory.view',
          isEnabled: false
        }, cashierConfig);
        expect.fail('Should have thrown 403 error');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.ok).toBe(false);
      }
    });

    it('should validate role exists', async () => {
      try {
        await axios.post('/api/admin/features/override', {
          roleId: 999, // non-existent role
          featureCode: 'inventory.view',
          isEnabled: false
        }, testConfig);
        expect.fail('Should have thrown 404 error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.ok).toBe(false);
        expect(error.response.data.message).toContain('Role not found');
      }
    });
  });

  describe('Dependency Endpoints', () => {
    it('should return feature dependencies', async () => {
      const response = await axios.get('/api/admin/features/dependencies/sales.view', testConfig);

      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      expect(response.data.data.featureCode).toBe('sales.view');
      expect(response.data.data.dependents).toBeDefined();
      expect(response.data.data.dependencies).toBeDefined();
    });

    it('should deny non-admin access to dependency endpoints', async () => {
      const cashierConfig = {
        ...testConfig,
        headers: {
          ...testConfig.headers,
          'Authorization': `Bearer ${cashierToken}`
        }
      };

      try {
        await axios.get('/api/admin/features/dependencies/sales.view', cashierConfig);
        expect.fail('Should have thrown 403 error');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.ok).toBe(false);
      }
    });
  });

  describe('Meta Features Endpoint', () => {
    it('should return user features and permissions', async () => {
      const response = await axios.get('/api/meta/features', testConfig);

      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      expect(response.data.data.enabled).toBeDefined();
      expect(response.data.data.permissions).toBeDefined();
      expect(response.data.data.dependencies).toBeDefined();
    });

    it('should return different features for different users', async () => {
      const adminResponse = await axios.get('/api/meta/features', testConfig);
      
      const cashierConfig = {
        ...testConfig,
        headers: {
          ...testConfig.headers,
          'Authorization': `Bearer ${cashierToken}`
        }
      };
      const cashierResponse = await axios.get('/api/meta/features', cashierConfig);

      expect(adminResponse.data.data.enabled).not.toEqual(cashierResponse.data.data.enabled);
      expect(adminResponse.data.data.permissions).not.toEqual(cashierResponse.data.data.permissions);
    });

    it('should require authentication', async () => {
      const unauthenticatedConfig = {
        ...testConfig,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': TEST_TENANT
        }
      };

      try {
        await axios.get('/api/meta/features', unauthenticatedConfig);
        expect.fail('Should have thrown 401 error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Audit Trail Endpoints', () => {
    it('should return audit logs for admin', async () => {
      const response = await axios.get('/api/admin/audit', testConfig);

      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      expect(response.data.data.logs).toBeDefined();
      expect(response.data.data.pagination).toBeDefined();
    });

    it('should deny non-admin access to audit logs', async () => {
      const cashierConfig = {
        ...testConfig,
        headers: {
          ...testConfig.headers,
          'Authorization': `Bearer ${cashierToken}`
        }
      };

      try {
        await axios.get('/api/admin/audit', cashierConfig);
        expect.fail('Should have thrown 403 error');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.ok).toBe(false);
      }
    });

    it('should support filtering audit logs', async () => {
      const response = await axios.get('/api/admin/audit?action=FEATURE_TOGGLE&limit=5', testConfig);

      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      expect(response.data.data.logs).toBeDefined();
      expect(response.data.data.pagination.limit).toBe(5);
    });

    it('should export audit logs as CSV', async () => {
      const response = await axios.get('/api/admin/audit/export?format=csv', {
        ...testConfig,
        responseType: 'blob'
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid feature codes', async () => {
      try {
        await axios.post('/api/admin/features/toggle', {
          featureCode: 'nonexistent.feature',
          isEnabled: true
        }, testConfig);
        expect.fail('Should have thrown 404 error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.ok).toBe(false);
        expect(error.response.data.message).toContain('Feature not found');
      }
    });

    it('should handle core feature disable attempts', async () => {
      try {
        await axios.post('/api/admin/features/toggle', {
          featureCode: 'auth.login',
          isEnabled: false
        }, testConfig);
        expect.fail('Should have thrown 400 error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.ok).toBe(false);
        expect(error.response.data.message).toContain('Core feature');
      }
    });

    it('should handle malformed JSON', async () => {
      try {
        await axios.post('/api/admin/features/toggle', 'invalid json', {
          ...testConfig,
          headers: {
            ...testConfig.headers,
            'Content-Type': 'application/json'
          }
        });
        expect.fail('Should have thrown 400 error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('Performance', () => {
    it('should handle concurrent feature toggles', async () => {
      const promises = Array(10).fill(null).map((_, i) => 
        axios.post('/api/admin/features/toggle', {
          featureCode: `test.feature.${i}`,
          isEnabled: true
        }, testConfig)
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should respond to feature queries within acceptable time', async () => {
      const start = performance.now();
      await axios.get('/api/meta/features', testConfig);
      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});










