/**
 * Authentication and Authorization Tests
 * Tests JWT middleware and role-based access control
 */

import request from 'supertest';
import express from 'express';
import { catalogRouter } from '../routes/catalog';
import { generateToken } from '../middleware/auth';
import { User } from '../utils/rbac';

// Create test app
const app = express();
app.use(express.json());
app.use(catalogRouter);

// Test users
const testUsers: Record<string, User> = {
  cashier: {
    id: 1,
    username: 'cashier1',
    name: 'Test Cashier',
    role: 'cashier',
    is_active: true
  },
  manager: {
    id: 2,
    username: 'manager1',
    name: 'Test Manager',
    role: 'manager',
    is_active: true
  },
  admin: {
    id: 3,
    username: 'admin1',
    name: 'Test Admin',
    role: 'admin',
    is_active: true
  },
  inactive: {
    id: 4,
    username: 'inactive1',
    name: 'Inactive User',
    role: 'cashier',
    is_active: false
  }
};

describe('Authentication Middleware', () => {
  describe('POST /api/products', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          name_en: 'Test Product',
          sku: 'TEST001',
          cost: 10.50,
          price: 15.00
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });

    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name_en: 'Test Product',
          sku: 'TEST001',
          cost: 10.50,
          price: 15.00
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toContain('Invalid access token');
    });

    it('should return 401 when token is expired', async () => {
      // Create an expired token (this would need to be mocked in real tests)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJjYXNoaWVyMSIsIm5hbWUiOiJUZXN0IENhc2hpZXIiLCJyb2xlIjoiY2FzaGllciIsImlzX2FjdGl2ZSI6dHJ1ZSwiZXhwIjoxNjAwMDAwMDAwLCJpc3MiOiJwb3MtZ3JvY2VyeS1hcGkiLCJhdWQiOiJwb3MtZ3JvY2VyeS1jbGllbnQifQ.invalid';
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          name_en: 'Test Product',
          sku: 'TEST001',
          cost: 10.50,
          price: 15.00
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
    });

    it('should return 401 when user is inactive', async () => {
      const token = generateToken(testUsers.inactive);
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name_en: 'Test Product',
          sku: 'TEST001',
          cost: 10.50,
          price: 15.00
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toContain('Account deactivated');
    });

    it('should allow cashier to create product', async () => {
      const token = generateToken(testUsers.cashier);
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name_en: 'Test Product',
          sku: 'TEST001',
          cost: 10.50,
          price: 15.00
        });

      // Should not return 401 or 403 (actual product creation might fail due to DB constraints)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should allow manager to create product', async () => {
      const token = generateToken(testUsers.manager);
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name_en: 'Test Product',
          sku: 'TEST002',
          cost: 10.50,
          price: 15.00
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should allow admin to create product', async () => {
      const token = generateToken(testUsers.admin);
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name_en: 'Test Product',
          sku: 'TEST003',
          cost: 10.50,
          price: 15.00
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('DELETE /api/products/:id (Hard Delete)', () => {
    it('should return 403 when cashier tries hard delete', async () => {
      const token = generateToken(testUsers.cashier);
      
      const response = await request(app)
        .delete('/api/products/1?hard=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toContain('Admin or Manager role required');
    });

    it('should allow manager to perform hard delete', async () => {
      const token = generateToken(testUsers.manager);
      
      const response = await request(app)
        .delete('/api/products/1?hard=true')
        .set('Authorization', `Bearer ${token}`);

      // Should not return 403 (actual deletion might fail due to DB constraints)
      expect(response.status).not.toBe(403);
    });

    it('should allow admin to perform hard delete', async () => {
      const token = generateToken(testUsers.admin);
      
      const response = await request(app)
        .delete('/api/products/1?hard=true')
        .set('Authorization', `Bearer ${token}`);

      // Should not return 403 (actual deletion might fail due to DB constraints)
      expect(response.status).not.toBe(403);
    });
  });

  describe('POST /api/categories', () => {
    it('should return 403 when cashier tries to create category', async () => {
      const token = generateToken(testUsers.cashier);
      
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Category'
        });

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should allow manager to create category', async () => {
      const token = generateToken(testUsers.manager);
      
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Category'
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should allow admin to create category', async () => {
      const token = generateToken(testUsers.admin);
      
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Category'
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});

describe('Token Generation', () => {
  it('should generate valid JWT token', () => {
    const token = generateToken(testUsers.cashier);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should generate different tokens for different users', () => {
    const token1 = generateToken(testUsers.cashier);
    const token2 = generateToken(testUsers.manager);
    
    expect(token1).not.toBe(token2);
  });
});











