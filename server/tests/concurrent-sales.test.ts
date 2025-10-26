/**
 * Unit tests for concurrent sales and stock validation
 * Tests optimistic locking and negative stock prevention
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initDatabase } from '../db';
import { salesService } from '../services/salesService';
import { valuationEngine } from '../services/valuationEngine';

describe('Concurrent Sales and Stock Validation', () => {
  let db: any;
  let productId: number;
  let lotId: number;

  beforeAll(async () => {
    initDatabase();
    db = getDatabase();
    
    // Create a test product
    const insertProduct = db.prepare(`
      INSERT INTO products (name_en, sku, cost, price, unit, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const productResult = insertProduct.run('Test Product', 'TEST001', 10.00, 15.00, 'pc', 1);
    productId = productResult.lastInsertRowid;

    // Create a stock lot with limited quantity
    const insertLot = db.prepare(`
      INSERT INTO stock_lots (
        product_id, lot_number, quantity_received, quantity_remaining, 
        unit_cost_cents, received_date, version
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `);
    
    const lotResult = insertLot.run(productId, 'LOT001', 5, 5, 1000, 1);
    lotId = lotResult.lastInsertRowid;
  });

  afterAll(async () => {
    // Clean up test data
    db.prepare('DELETE FROM stock_lots WHERE product_id = ?').run(productId);
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
  });

  beforeEach(async () => {
    // Reset stock lot quantity before each test
    db.prepare('UPDATE stock_lots SET quantity_remaining = 5, version = 1 WHERE id = ?').run(lotId);
  });

  describe('Stock Validation', () => {
    it('should validate sufficient stock availability', async () => {
      const lineItems = [
        { productId, quantity: 3, unitPrice: 15.00 }
      ];

      const validation = await salesService.validateStockAvailability(lineItems);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect insufficient stock', async () => {
      const lineItems = [
        { productId, quantity: 10, unitPrice: 15.00 }
      ];

      const validation = await salesService.validateStockAvailability(lineItems);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('Insufficient stock');
    });

    it('should validate multiple products', async () => {
      // Create another product and lot
      const insertProduct2 = db.prepare(`
        INSERT INTO products (name_en, sku, cost, price, unit, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      const product2Result = insertProduct2.run('Test Product 2', 'TEST002', 5.00, 8.00, 'pc', 1);
      const product2Id = product2Result.lastInsertRowid;

      const insertLot2 = db.prepare(`
        INSERT INTO stock_lots (
          product_id, lot_number, quantity_received, quantity_remaining, 
          unit_cost_cents, received_date, version
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
      `);
      insertLot2.run(product2Id, 'LOT002', 2, 2, 500, 1);

      const lineItems = [
        { productId, quantity: 3, unitPrice: 15.00 },
        { productId: product2Id, quantity: 1, unitPrice: 8.00 }
      ];

      const validation = await salesService.validateStockAvailability(lineItems);
      expect(validation.isValid).toBe(true);

      // Clean up
      db.prepare('DELETE FROM stock_lots WHERE product_id = ?').run(product2Id);
      db.prepare('DELETE FROM products WHERE id = ?').run(product2Id);
    });
  });

  describe('Optimistic Locking', () => {
    it('should handle version conflicts in stock lots', async () => {
      // Simulate concurrent access by manually updating version
      db.prepare('UPDATE stock_lots SET version = version + 1 WHERE id = ?').run(lotId);

      const lotsUsed = [
        { lotId, quantityUsed: 2, unitCostCents: 1000, version: 1 } // Old version
      ];

      await expect(valuationEngine.updateStockLots(lotsUsed)).rejects.toThrow('Version conflict');
    });

    it('should succeed with correct version', async () => {
      const lotsUsed = [
        { lotId, quantityUsed: 2, unitCostCents: 1000, version: 1 } // Current version
      ];

      await expect(valuationEngine.updateStockLots(lotsUsed)).resolves.not.toThrow();
    });
  });

  describe('Concurrent Sales Simulation', () => {
    it('should prevent negative stock with concurrent sales', async () => {
      const lineItems = [
        { productId, quantity: 3, unitPrice: 15.00 }
      ];

      // Create a mock invoice for testing
      const insertInvoice = db.prepare(`
        INSERT INTO invoices (
          receipt_no, total_amount_cents, tax_amount_cents, discount_amount_cents,
          payment_method, cashier_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const invoiceResult = insertInvoice.run('TEST001', 4500, 0, 0, 'cash', 1);
      const invoiceId = invoiceResult.lastInsertRowid;

      // Create invoice line
      const insertLine = db.prepare(`
        INSERT INTO invoice_lines (
          invoice_id, product_id, quantity, unit_price_cents, 
          line_total_cents, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      insertLine.run(invoiceId, productId, 3, 1500, 4500);

      // First sale should succeed
      await expect(salesService.processSaleWithCOGS(
        invoiceId, 
        'TEST001', 
        lineItems, 
        1
      )).resolves.not.toThrow();

      // Verify stock was reduced
      const remainingStock = db.prepare(`
        SELECT quantity_remaining FROM stock_lots WHERE id = ?
      `).get(lotId) as { quantity_remaining: number };
      
      expect(remainingStock.quantity_remaining).toBe(2);

      // Second sale with same quantity should fail due to insufficient stock
      const insertInvoice2 = db.prepare(`
        INSERT INTO invoices (
          receipt_no, total_amount_cents, tax_amount_cents, discount_amount_cents,
          payment_method, cashier_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const invoice2Result = insertInvoice2.run('TEST002', 4500, 0, 0, 'cash', 1);
      const invoice2Id = invoice2Result.lastInsertRowid;

      const insertLine2 = db.prepare(`
        INSERT INTO invoice_lines (
          invoice_id, product_id, quantity, unit_price_cents, 
          line_total_cents, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      insertLine2.run(invoice2Id, productId, 3, 1500, 4500);

      await expect(salesService.processSaleWithCOGS(
        invoice2Id, 
        'TEST002', 
        lineItems, 
        1
      )).rejects.toThrow('INSUFFICIENT_STOCK');

      // Clean up
      db.prepare('DELETE FROM invoice_lines WHERE invoice_id IN (?, ?)').run(invoiceId, invoice2Id);
      db.prepare('DELETE FROM invoices WHERE id IN (?, ?)').run(invoiceId, invoice2Id);
      db.prepare('DELETE FROM stock_ledger WHERE product_id = ?').run(productId);
    });

    it('should handle concurrent sales to different lots', async () => {
      // Create another lot for the same product
      const insertLot2 = db.prepare(`
        INSERT INTO stock_lots (
          product_id, lot_number, quantity_received, quantity_remaining, 
          unit_cost_cents, received_date, version
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
      `);
      
      const lot2Result = insertLot2.run(productId, 'LOT002', 3, 3, 1200, 1);
      const lot2Id = lot2Result.lastInsertRowid;

      const lineItems1 = [{ productId, quantity: 2, unitPrice: 15.00 }];
      const lineItems2 = [{ productId, quantity: 2, unitPrice: 15.00 }];

      // Create invoices
      const insertInvoice1 = db.prepare(`
        INSERT INTO invoices (
          receipt_no, total_amount_cents, tax_amount_cents, discount_amount_cents,
          payment_method, cashier_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const insertInvoice2 = db.prepare(`
        INSERT INTO invoices (
          receipt_no, total_amount_cents, tax_amount_cents, discount_amount_cents,
          payment_method, cashier_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const invoice1Result = insertInvoice1.run('TEST003', 3000, 0, 0, 'cash', 1);
      const invoice2Result = insertInvoice2.run('TEST004', 3000, 0, 0, 'cash', 1);
      
      const invoice1Id = invoice1Result.lastInsertRowid;
      const invoice2Id = invoice2Result.lastInsertRowid;

      // Create invoice lines
      const insertLine1 = db.prepare(`
        INSERT INTO invoice_lines (
          invoice_id, product_id, quantity, unit_price_cents, 
          line_total_cents, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const insertLine2 = db.prepare(`
        INSERT INTO invoice_lines (
          invoice_id, product_id, quantity, unit_price_cents, 
          line_total_cents, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      insertLine1.run(invoice1Id, productId, 2, 1500, 3000);
      insertLine2.run(invoice2Id, productId, 2, 1500, 3000);

      // Both sales should succeed as they use different lots
      await expect(salesService.processSaleWithCOGS(
        invoice1Id, 
        'TEST003', 
        lineItems1, 
        1
      )).resolves.not.toThrow();

      await expect(salesService.processSaleWithCOGS(
        invoice2Id, 
        'TEST004', 
        lineItems2, 
        1
      )).resolves.not.toThrow();

      // Clean up
      db.prepare('DELETE FROM invoice_lines WHERE invoice_id IN (?, ?)').run(invoice1Id, invoice2Id);
      db.prepare('DELETE FROM invoices WHERE id IN (?, ?)').run(invoice1Id, invoice2Id);
      db.prepare('DELETE FROM stock_ledger WHERE product_id = ?').run(productId);
      db.prepare('DELETE FROM stock_lots WHERE id = ?').run(lot2Id);
    });
  });
});
