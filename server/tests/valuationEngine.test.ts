/**
 * Unit Tests for Valuation Engine
 * Comprehensive test coverage for FIFO, Average Cost, and LIFO valuation methods
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from 'better-sqlite3';
import { ValuationEngine, ValuationMethod } from '../utils/valuationEngine';

describe('ValuationEngine', () => {
  let db: Database;
  let valuationEngine: ValuationEngine;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    
    // Create test tables
    db.exec(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        name_en TEXT NOT NULL,
        unit TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE stock_ledger (
        id INTEGER PRIMARY KEY,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_cost_cents INTEGER NOT NULL,
        reason TEXT NOT NULL,
        ref_id INTEGER,
        balance_after REAL NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE INDEX idx_ledger_product ON stock_ledger(product_id);
      CREATE INDEX idx_ledger_created ON stock_ledger(created_at);
    `);

    // Insert test products
    db.prepare(`
      INSERT INTO products (id, sku, name_en, unit) VALUES 
      (1, 'TEST001', 'Test Product 1', 'kg'),
      (2, 'TEST002', 'Test Product 2', 'pcs'),
      (3, 'TEST003', 'Test Product 3', 'kg')
    `).run();

    valuationEngine = new ValuationEngine();
  });

  afterEach(() => {
    db.close();
  });

  describe('Average Cost Method', () => {
    it('should calculate average cost correctly with multiple receipts', () => {
      // Add stock movements
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1200, 'GRN', 2, 150, '2025-01-02T10:00:00Z'),
        (1, 200, 1100, 'GRN', 3, 350, '2025-01-03T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 350, 'AVERAGE');

      expect(result.qty_on_hand).toBe(350);
      expect(result.value_cents).toBe(385000); // (100*1000 + 50*1200 + 200*1100) = 385000
      expect(result.avg_cost_cents).toBe(1100); // 385000 / 350 = 1100
      expect(result.has_unknown_cost).toBe(false);
    });

    it('should handle zero quantity', () => {
      const result = valuationEngine.computeValuation(1, 0, 'AVERAGE');

      expect(result.qty_on_hand).toBe(0);
      expect(result.value_cents).toBe(0);
      expect(result.avg_cost_cents).toBe(0);
      expect(result.has_unknown_cost).toBe(false);
    });

    it('should handle unknown cost when no stock movements exist', () => {
      const result = valuationEngine.computeValuation(1, 100, 'AVERAGE');

      expect(result.qty_on_hand).toBe(100);
      expect(result.value_cents).toBe(0);
      expect(result.avg_cost_cents).toBe(0);
      expect(result.has_unknown_cost).toBe(true);
    });

    it('should calculate average cost with sales (negative quantities)', () => {
      // Add stock movements with sales
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1200, 'GRN', 2, 150, '2025-01-02T10:00:00Z'),
        (1, -30, 1100, 'SALE', 1, 120, '2025-01-03T10:00:00Z'),
        (1, -20, 1100, 'SALE', 2, 100, '2025-01-04T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 100, 'AVERAGE');

      expect(result.qty_on_hand).toBe(100);
      // Average cost should be based on remaining stock: (100*1000 + 50*1200) / 150 = 1066.67
      expect(result.avg_cost_cents).toBe(1067); // Rounded
      expect(result.value_cents).toBe(106700); // 100 * 1067
      expect(result.has_unknown_cost).toBe(false);
    });
  });

  describe('FIFO Method', () => {
    it('should calculate FIFO cost correctly with multiple receipts', () => {
      // Add stock movements in chronological order
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1200, 'GRN', 2, 150, '2025-01-02T10:00:00Z'),
        (1, 200, 1100, 'GRN', 3, 350, '2025-01-03T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 350, 'FIFO');

      expect(result.qty_on_hand).toBe(350);
      expect(result.value_cents).toBe(385000); // Same as average for full stock
      expect(result.fifo_layers).toHaveLength(3);
      expect(result.fifo_layers[0]).toEqual({ quantity: 100, unit_cost_cents: 1000 });
      expect(result.fifo_layers[1]).toEqual({ quantity: 50, unit_cost_cents: 1200 });
      expect(result.fifo_layers[2]).toEqual({ quantity: 200, unit_cost_cents: 1100 });
      expect(result.has_unknown_cost).toBe(false);
    });

    it('should calculate FIFO cost with partial consumption', () => {
      // Add stock movements
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1200, 'GRN', 2, 150, '2025-01-02T10:00:00Z'),
        (1, -30, 1000, 'SALE', 1, 120, '2025-01-03T10:00:00Z'),
        (1, -20, 1000, 'SALE', 2, 100, '2025-01-04T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 100, 'FIFO');

      expect(result.qty_on_hand).toBe(100);
      // Remaining: 50 from first batch (1000), 50 from second batch (1200)
      expect(result.value_cents).toBe(110000); // 50*1000 + 50*1200
      expect(result.fifo_layers).toHaveLength(2);
      expect(result.fifo_layers[0]).toEqual({ quantity: 50, unit_cost_cents: 1000 });
      expect(result.fifo_layers[1]).toEqual({ quantity: 50, unit_cost_cents: 1200 });
    });

    it('should handle complete consumption in FIFO order', () => {
      // Add stock movements
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1200, 'GRN', 2, 150, '2025-01-02T10:00:00Z'),
        (1, -150, 1000, 'SALE', 1, 0, '2025-01-03T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 0, 'FIFO');

      expect(result.qty_on_hand).toBe(0);
      expect(result.value_cents).toBe(0);
      expect(result.fifo_layers).toHaveLength(0);
    });
  });

  describe('LIFO Method', () => {
    it('should calculate LIFO cost correctly with multiple receipts', () => {
      // Add stock movements in chronological order
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1200, 'GRN', 2, 150, '2025-01-02T10:00:00Z'),
        (1, 200, 1100, 'GRN', 3, 350, '2025-01-03T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 350, 'LIFO');

      expect(result.qty_on_hand).toBe(350);
      expect(result.value_cents).toBe(385000); // Same as average for full stock
      expect(result.lifo_layers).toHaveLength(3);
      expect(result.lifo_layers[0]).toEqual({ quantity: 200, unit_cost_cents: 1100 });
      expect(result.lifo_layers[1]).toEqual({ quantity: 50, unit_cost_cents: 1200 });
      expect(result.lifo_layers[2]).toEqual({ quantity: 100, unit_cost_cents: 1000 });
      expect(result.has_unknown_cost).toBe(false);
    });

    it('should calculate LIFO cost with partial consumption', () => {
      // Add stock movements
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1200, 'GRN', 2, 150, '2025-01-02T10:00:00Z'),
        (1, -30, 1200, 'SALE', 1, 120, '2025-01-03T10:00:00Z'),
        (1, -20, 1200, 'SALE', 2, 100, '2025-01-04T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 100, 'LIFO');

      expect(result.qty_on_hand).toBe(100);
      // Remaining: 100 from first batch (1000)
      expect(result.value_cents).toBe(100000); // 100*1000
      expect(result.lifo_layers).toHaveLength(1);
      expect(result.lifo_layers[0]).toEqual({ quantity: 100, unit_cost_cents: 1000 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative quantities gracefully', () => {
      // Add stock movements with negative quantities
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, -150, 1000, 'SALE', 1, -50, '2025-01-02T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, -50, 'AVERAGE');

      expect(result.qty_on_hand).toBe(-50);
      expect(result.value_cents).toBe(0); // Negative stock has no value
      expect(result.has_unknown_cost).toBe(false);
    });

    it('should handle very large quantities', () => {
      // Add stock movements with large quantities
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 1000000, 1000, 'GRN', 1, 1000000, '2025-01-01T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 1000000, 'AVERAGE');

      expect(result.qty_on_hand).toBe(1000000);
      expect(result.value_cents).toBe(1000000000); // 1,000,000 * 1000
      expect(result.avg_cost_cents).toBe(1000);
    });

    it('should handle zero cost items', () => {
      // Add stock movements with zero cost
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 0, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1000, 'GRN', 2, 150, '2025-01-02T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 150, 'AVERAGE');

      expect(result.qty_on_hand).toBe(150);
      expect(result.value_cents).toBe(50000); // 50 * 1000 (only non-zero cost items)
      expect(result.avg_cost_cents).toBe(333); // 50000 / 150 = 333.33
    });

    it('should handle mixed positive and negative quantities', () => {
      // Add complex stock movements
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1200, 'GRN', 2, 150, '2025-01-02T10:00:00Z'),
        (1, -30, 1000, 'SALE', 1, 120, '2025-01-03T10:00:00Z'),
        (1, 20, 1100, 'GRN', 3, 140, '2025-01-04T10:00:00Z'),
        (1, -40, 1000, 'SALE', 2, 100, '2025-01-05T10:00:00Z')
      `).run();

      const result = valuationEngine.computeValuation(1, 100, 'AVERAGE');

      expect(result.qty_on_hand).toBe(100);
      expect(result.has_unknown_cost).toBe(false);
      // Should calculate based on net positive movements
      expect(result.value_cents).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of stock movements efficiently', () => {
      // Add many stock movements
      const insertStmt = db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        insertStmt.run(
          1,
          Math.random() > 0.5 ? 10 : -5, // Random positive or negative
          1000 + Math.floor(Math.random() * 500), // Random cost between 1000-1500
          'GRN',
          i,
          i * 5, // Simulate running balance
          `2025-01-${String(i % 28 + 1).padStart(2, '0')}T10:00:00Z`
        );
      }

      const result = valuationEngine.computeValuation(1, 100, 'AVERAGE');
      const endTime = Date.now();

      expect(result.qty_on_hand).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('Data Integrity', () => {
    it('should handle missing product gracefully', () => {
      const result = valuationEngine.computeValuation(999, 100, 'AVERAGE');

      expect(result.qty_on_hand).toBe(100);
      expect(result.value_cents).toBe(0);
      expect(result.has_unknown_cost).toBe(true);
    });

    it('should handle empty stock ledger gracefully', () => {
      const result = valuationEngine.computeValuation(1, 0, 'AVERAGE');

      expect(result.qty_on_hand).toBe(0);
      expect(result.value_cents).toBe(0);
      expect(result.has_unknown_cost).toBe(false);
    });

    it('should maintain consistency across different valuation methods', () => {
      // Add stock movements
      db.prepare(`
        INSERT INTO stock_ledger (product_id, quantity, unit_cost_cents, reason, ref_id, balance_after, created_at) VALUES
        (1, 100, 1000, 'GRN', 1, 100, '2025-01-01T10:00:00Z'),
        (1, 50, 1200, 'GRN', 2, 150, '2025-01-02T10:00:00Z')
      `).run();

      const avgResult = valuationEngine.computeValuation(1, 150, 'AVERAGE');
      const fifoResult = valuationEngine.computeValuation(1, 150, 'FIFO');
      const lifoResult = valuationEngine.computeValuation(1, 150, 'LIFO');

      // All methods should have same quantity and value for full stock
      expect(avgResult.qty_on_hand).toBe(150);
      expect(fifoResult.qty_on_hand).toBe(150);
      expect(lifoResult.qty_on_hand).toBe(150);

      expect(avgResult.value_cents).toBe(160000); // 100*1000 + 50*1200
      expect(fifoResult.value_cents).toBe(160000);
      expect(lifoResult.value_cents).toBe(160000);

      expect(avgResult.has_unknown_cost).toBe(false);
      expect(fifoResult.has_unknown_cost).toBe(false);
      expect(lifoResult.has_unknown_cost).toBe(false);
    });
  });
});
