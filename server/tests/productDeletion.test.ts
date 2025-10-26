/**
 * Product Deletion Tests
 * Tests FK constraints and deletion prevention
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';
import { getDatabase } from '../db/database';
import { productDeletionService } from '../services/productDeletionService';

describe('Product Deletion Tests', () => {
  let db: any;
  let authToken: string;
  let testProductId: number;
  let testInvoiceId: number;
  let testGrnId: number;
  let testReturnId: number;
  let testQuickSaleId: number;

  beforeAll(async () => {
    db = getDatabase();
    
    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'testpass123',
        name: 'Test User',
        role: 'admin'
      });
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass123'
      });
    
    authToken = loginResponse.body.token;
  });

  beforeEach(async () => {
    // Create test product
    const productResult = db.prepare(`
      INSERT INTO products (sku, name_en, price_retail, cost, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run('TEST-PRODUCT-001', 'Test Product', 10.00, 5.00, 1);
    
    testProductId = productResult.lastInsertRowid;

    // Create test customer
    const customerResult = db.prepare(`
      INSERT INTO customers (customer_name, phone, email)
      VALUES (?, ?, ?)
    `).run('Test Customer', '1234567890', 'test@example.com');
    
    const testCustomerId = customerResult.lastInsertRowid;

    // Create test supplier
    const supplierResult = db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, email)
      VALUES (?, ?, ?, ?)
    `).run('Test Supplier', 'John Doe', '0987654321', 'supplier@example.com');
    
    const testSupplierId = supplierResult.lastInsertRowid;

    // Create test invoice (sales)
    const invoiceResult = db.prepare(`
      INSERT INTO invoices (receipt_no, customer_id, cashier_id, gross, discount, tax, net, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('TEST-001', testCustomerId, 1, 1000, 0, 0, 1000, new Date().toISOString());
    
    testInvoiceId = invoiceResult.lastInsertRowid;

    // Create test GRN
    const grnResult = db.prepare(`
      INSERT INTO grn_headers (grn_number, supplier_id, received_by, grn_date, status)
      VALUES (?, ?, ?, ?, ?)
    `).run('GRN-001', testSupplierId, 1, new Date().toISOString(), 'completed');
    
    testGrnId = grnResult.lastInsertRowid;

    // Create test return
    const returnResult = db.prepare(`
      INSERT INTO returns (return_receipt_no, original_receipt_no, customer_id, cashier_id, total_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('RET-001', 'TEST-001', testCustomerId, 1, 100, new Date().toISOString());
    
    testReturnId = returnResult.lastInsertRowid;

    // Create test quick sale session
    const quickSaleResult = db.prepare(`
      INSERT INTO quick_sales_sessions (session_name, cashier_id, created_at)
      VALUES (?, ?, ?)
    `).run('Test Session', 1, new Date().toISOString());
    
    testQuickSaleId = quickSaleResult.lastInsertRowid;
  });

  afterEach(async () => {
    // Clean up test data
    db.prepare('DELETE FROM invoice_lines WHERE product_id = ?').run(testProductId);
    db.prepare('DELETE FROM stock_movements WHERE product_id = ?').run(testProductId);
    db.prepare('DELETE FROM grn_lines WHERE product_id = ?').run(testProductId);
    db.prepare('DELETE FROM return_lines WHERE product_id = ?').run(testProductId);
    db.prepare('DELETE FROM quick_sales_lines WHERE product_id = ?').run(testProductId);
    db.prepare('DELETE FROM products WHERE id = ?').run(testProductId);
    db.prepare('DELETE FROM invoices WHERE id = ?').run(testInvoiceId);
    db.prepare('DELETE FROM grn_headers WHERE id = ?').run(testGrnId);
    db.prepare('DELETE FROM returns WHERE id = ?').run(testReturnId);
    db.prepare('DELETE FROM quick_sales_sessions WHERE id = ?').run(testQuickSaleId);
  });

  afterAll(async () => {
    // Clean up test user
    db.prepare('DELETE FROM users WHERE username = ?').run('testuser');
  });

  describe('FK Constraint Tests', () => {
    it('should prevent deletion of product with sales records', async () => {
      // Create sales record
      db.prepare(`
        INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testInvoiceId, testProductId, 1, 10.00, 10.00, new Date().toISOString());

      // Try to delete product - should fail
      const response = await request(app)
        .delete(`/api/products/${testProductId}/hard-delete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete product');
      expect(response.body.error).toContain('sales records');
    });

    it('should prevent deletion of product with stock movements', async () => {
      // Create stock movement
      db.prepare(`
        INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, reference_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testProductId, 'purchase', 10, 1, 'grn', new Date().toISOString());

      // Try to delete product - should fail
      const response = await request(app)
        .delete(`/api/products/${testProductId}/hard-delete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete product');
      expect(response.body.error).toContain('stock movements');
    });

    it('should prevent deletion of product with GRN records', async () => {
      // Create GRN record
      db.prepare(`
        INSERT INTO grn_lines (grn_id, product_id, quantity_received, unit_cost, total_cost, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testGrnId, testProductId, 10, 5.00, 50.00, new Date().toISOString());

      // Try to delete product - should fail
      const response = await request(app)
        .delete(`/api/products/${testProductId}/hard-delete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete product');
      expect(response.body.error).toContain('GRN records');
    });

    it('should prevent deletion of product with return records', async () => {
      // Create return record
      db.prepare(`
        INSERT INTO return_lines (return_id, product_id, quantity, reason, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(testReturnId, testProductId, 1, 'Defective item', new Date().toISOString());

      // Try to delete product - should fail
      const response = await request(app)
        .delete(`/api/products/${testProductId}/hard-delete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete product');
      expect(response.body.error).toContain('return records');
    });

    it('should prevent deletion of product with quick sales records', async () => {
      // Create quick sale record
      db.prepare(`
        INSERT INTO quick_sales_lines (session_id, product_id, quantity, unit_price, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testQuickSaleId, testProductId, 1, 10.00, 10.00, new Date().toISOString());

      // Try to delete product - should fail
      const response = await request(app)
        .delete(`/api/products/${testProductId}/hard-delete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete product');
      expect(response.body.error).toContain('quick sales records');
    });
  });

  describe('Deletion Status Tests', () => {
    it('should return correct deletion status for product with sales', async () => {
      // Create sales record
      db.prepare(`
        INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testInvoiceId, testProductId, 1, 10.00, 10.00, new Date().toISOString());

      const response = await request(app)
        .get(`/api/products/${testProductId}/deletion-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletion_status).toBe('has_sales');
      expect(response.body.data.sales_count).toBe(1);
    });

    it('should return correct deletion status for product with movements', async () => {
      // Create stock movement
      db.prepare(`
        INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, reference_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testProductId, 'purchase', 10, 1, 'grn', new Date().toISOString());

      const response = await request(app)
        .get(`/api/products/${testProductId}/deletion-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletion_status).toBe('has_movements');
      expect(response.body.data.movements_count).toBe(1);
    });

    it('should return can_delete status for product without dependencies', async () => {
      const response = await request(app)
        .get(`/api/products/${testProductId}/deletion-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletion_status).toBe('can_delete');
      expect(response.body.data.sales_count).toBe(0);
      expect(response.body.data.movements_count).toBe(0);
    });
  });

  describe('Soft Delete Tests', () => {
    it('should allow soft delete of product without dependencies', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/soft-delete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test soft delete' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('soft deleted successfully');

      // Verify product is soft deleted
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(testProductId);
      expect(product.deleted_at).toBeTruthy();
      expect(product.deleted_by).toBe(1);
    });

    it('should prevent soft delete of product with dependencies', async () => {
      // Create sales record
      db.prepare(`
        INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testInvoiceId, testProductId, 1, 10.00, 10.00, new Date().toISOString());

      const response = await request(app)
        .post(`/api/products/${testProductId}/soft-delete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test soft delete' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete product');
    });

    it('should restore soft deleted product', async () => {
      // Soft delete product first
      await request(app)
        .post(`/api/products/${testProductId}/soft-delete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test soft delete' })
        .expect(200);

      // Restore product
      const response = await request(app)
        .post(`/api/products/${testProductId}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('restored successfully');

      // Verify product is restored
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(testProductId);
      expect(product.deleted_at).toBeNull();
      expect(product.deleted_by).toBeNull();
    });
  });

  describe('Service Layer Tests', () => {
    it('should check deletion status correctly', async () => {
      const status = await productDeletionService.checkDeletionStatus(testProductId);
      expect(status).toBeTruthy();
      expect(status!.id).toBe(testProductId);
      expect(status!.deletion_status).toBe('can_delete');
    });

    it('should return correct canDelete result', async () => {
      const result = await productDeletionService.canDeleteProduct(testProductId);
      expect(result.canDelete).toBe(true);
      expect(result.dependencies.sales).toBe(0);
    });

    it('should get deletable products', async () => {
      const products = await productDeletionService.getDeletableProducts();
      expect(Array.isArray(products)).toBe(true);
      expect(products.some(p => p.id === testProductId)).toBe(true);
    });

    it('should get product dependencies', async () => {
      // Create some dependencies
      db.prepare(`
        INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testInvoiceId, testProductId, 1, 10.00, 10.00, new Date().toISOString());

      const dependencies = await productDeletionService.getProductDependencies(testProductId);
      expect(dependencies.sales).toHaveLength(1);
      expect(dependencies.movements).toHaveLength(0);
    });
  });

  describe('Error Handling Tests', () => {
    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/99999/deletion-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get(`/api/products/${testProductId}/deletion-status`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for insufficient permissions', async () => {
      // Create cashier user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'cashier',
          password: 'testpass123',
          name: 'Cashier User',
          role: 'cashier'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'cashier',
          password: 'testpass123'
        });

      const cashierToken = loginResponse.body.token;

      const response = await request(app)
        .delete(`/api/products/${testProductId}/hard-delete`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});










