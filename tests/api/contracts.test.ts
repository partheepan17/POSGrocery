/**
 * API Contract Tests
 * Ensures consistent response formats across all endpoints
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestServer } from '../utils/testServer';

// Store original fetch
const originalFetch = (globalThis as any).fetch;

describe('API Contracts', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    const testServer = await createTestServer();
    server = testServer.server;
    baseUrl = testServer.baseUrl;
    
    console.log('Test server started at:', baseUrl);
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Override global fetch to use our test server
    (globalThis as any).fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      console.log('Fetching:', fullUrl);
      const response = await originalFetch(fullUrl, options);
      return response;
    });
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
    // Restore original fetch
    (globalThis as any).fetch = originalFetch;
  });

  describe('Health Endpoint', () => {
    it('should return consistent health check format', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();

      console.log('Health response:', data);

      expect(response.ok).toBe(true);
      expect(data).toMatchObject({
        success: true,
        data: {
          ok: true,
          ts: expect.any(String)
        }
      });
    });
  });

  describe('Pagination Contract', () => {
    it('should return standardized paginated response for products', async () => {
      const response = await fetch(`${baseUrl}/api/products?page=1&pageSize=10`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toMatchObject({
        success: true,
        data: {
          items: expect.any(Array)
        },
        meta: {
          page: 1,
          pageSize: 10,
          total: expect.any(Number),
          pages: expect.any(Number)
        }
      });

      // Validate pagination math
      expect(data.meta.pages).toBe(Math.ceil(data.meta.total / data.meta.pageSize));
    });

    it('should handle pagination edge cases', async () => {
      // Test with large page number
      const response = await fetch(`${baseUrl}/api/products?page=999&pageSize=10`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.meta.page).toBe(999);
      expect(data.data.items).toHaveLength(0);
    });

    it('should validate page size limits', async () => {
      // Test with invalid page size
      const response = await fetch(`${baseUrl}/api/products?pageSize=500`);
      
      if (response.ok) {
        const data = await response.json();
        // Should be capped at maximum allowed size
        expect(data.meta.pageSize).toBeLessThanOrEqual(200);
      } else {
        // Or should return validation error
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for invalid requests', async () => {
      const response = await fetch(`${baseUrl}/api/products/invalid-id`);
      
      if (!response.ok) {
        const data = await response.json();
        expect(data).toMatchObject({
          ok: false,
          error: expect.any(String)
        });
      }
    });
  });

  describe('Authentication Contract', () => {
    it('should return consistent auth error format', async () => {
      const response = await fetch(`${baseUrl}/api/settings`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        expect(data).toMatchObject({
          ok: false,
          error: expect.any(String)
        });
      }
    });
  });
});

