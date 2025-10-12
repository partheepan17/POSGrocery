/**
 * Daily Stock Snapshot Job
 * Creates automated daily inventory snapshots for reporting and analysis
 */

import { getDatabase } from '../db';
import { createRequestLogger } from '../utils/logger';
import { ValuationEngine } from '../utils/valuationEngine';

const logger = createRequestLogger({} as any);

export interface StockSnapshot {
  id?: number;
  snapshot_date: string;
  product_id: number;
  sku: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: string;
  category_id?: number;
  category_name?: string;
  qty_on_hand: number;
  value_cents: number;
  valuation_method: 'FIFO' | 'AVERAGE' | 'LIFO';
  has_unknown_cost: boolean;
  created_at: string;
}

export interface SnapshotSummary {
  snapshot_date: string;
  total_products: number;
  total_value_cents: number;
  products_with_stock: number;
  products_out_of_stock: number;
  products_low_stock: number;
  valuation_method: string;
  created_at: string;
}

export class DailySnapshotService {
  private get db() { return getDatabase(); }
  private valuationEngine = new ValuationEngine();

  /**
   * Create daily stock snapshot
   */
  async createDailySnapshot(method: 'FIFO' | 'AVERAGE' | 'LIFO' = 'AVERAGE'): Promise<SnapshotSummary> {
    const snapshotDate = new Date().toISOString().split('T')[0];
    
    logger.info({ snapshotDate, method }, 'Creating daily stock snapshot');

    try {
      // Start transaction
      this.db.exec('BEGIN IMMEDIATE');

      // Get all active products with their current stock levels
      const products = this.db.prepare(`
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          p.name_si,
          p.name_ta,
          p.unit,
          p.category_id,
          c.name as category_name,
          COALESCE(SUM(sl.quantity), 0) as qty_on_hand
        FROM products p
        LEFT JOIN stock_ledger sl ON p.id = sl.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
        GROUP BY p.id, p.sku, p.name_en, p.name_si, p.name_ta, p.unit, p.category_id, c.name
        ORDER BY p.name_en ASC
      `).all() as any[];

      // Calculate valuations for each product
      const snapshots: Omit<StockSnapshot, 'id' | 'created_at'>[] = [];
      let totalValue = 0;
      let productsWithStock = 0;
      let productsOutOfStock = 0;
      let productsLowStock = 0;

      for (const product of products) {
        const valuation = this.valuationEngine.computeValuation(product.product_id, product.qty_on_hand, method);
        
        const snapshot: Omit<StockSnapshot, 'id' | 'created_at'> = {
          snapshot_date: snapshotDate,
          product_id: product.product_id,
          sku: product.sku,
          name_en: product.name_en,
          name_si: product.name_si,
          name_ta: product.name_ta,
          unit: product.unit,
          category_id: product.category_id,
          category_name: product.category_name,
          qty_on_hand: product.qty_on_hand,
          value_cents: valuation.value_cents,
          valuation_method: method,
          has_unknown_cost: valuation.has_unknown_cost
        };

        snapshots.push(snapshot);
        totalValue += valuation.value_cents;

        // Count stock levels
        if (product.qty_on_hand > 0) {
          productsWithStock++;
          if (product.qty_on_hand <= 10) {
            productsLowStock++;
          }
        } else {
          productsOutOfStock++;
        }
      }

      // Clear existing snapshots for this date
      this.db.prepare(`
        DELETE FROM stock_snapshots WHERE snapshot_date = ?
      `).run(snapshotDate);

      // Insert snapshots
      const insertSnapshot = this.db.prepare(`
        INSERT INTO stock_snapshots (
          snapshot_date, product_id, sku, name_en, name_si, name_ta, unit,
          category_id, category_name, qty_on_hand, value_cents, valuation_method,
          has_unknown_cost, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const snapshot of snapshots) {
        insertSnapshot.run(
          snapshot.snapshot_date,
          snapshot.product_id,
          snapshot.sku,
          snapshot.name_en,
          snapshot.name_si,
          snapshot.name_ta,
          snapshot.unit,
          snapshot.category_id,
          snapshot.category_name,
          snapshot.qty_on_hand,
          snapshot.value_cents,
          snapshot.valuation_method,
          snapshot.has_unknown_cost ? 1 : 0,
          new Date().toISOString()
        );
      }

      // Create summary
      const summary: SnapshotSummary = {
        snapshot_date: snapshotDate,
        total_products: products.length,
        total_value_cents: totalValue,
        products_with_stock: productsWithStock,
        products_out_of_stock: productsOutOfStock,
        products_low_stock: productsLowStock,
        valuation_method: method,
        created_at: new Date().toISOString()
      };

      // Insert or replace summary
      this.db.prepare(`
        INSERT OR REPLACE INTO stock_snapshot_summaries (
          snapshot_date, total_products, total_value_cents, products_with_stock,
          products_out_of_stock, products_low_stock, valuation_method, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        summary.snapshot_date,
        summary.total_products,
        summary.total_value_cents,
        summary.products_with_stock,
        summary.products_out_of_stock,
        summary.products_low_stock,
        summary.valuation_method,
        summary.created_at
      );

      // Commit transaction
      this.db.exec('COMMIT');

      logger.info({
        snapshotDate,
        totalProducts: products.length,
        totalValue,
        productsWithStock,
        productsOutOfStock,
        productsLowStock
      }, 'Daily stock snapshot created successfully');

      return summary;

    } catch (error) {
      // Rollback on error
      this.db.exec('ROLLBACK');
      logger.error({ error, snapshotDate }, 'Failed to create daily stock snapshot');
      throw error;
    }
  }

  /**
   * Get snapshot for a specific date
   */
  getSnapshot(date: string): StockSnapshot[] {
    return this.db.prepare(`
      SELECT 
        id, snapshot_date, product_id, sku, name_en, name_si, name_ta, unit,
        category_id, category_name, qty_on_hand, value_cents, valuation_method,
        has_unknown_cost, created_at
      FROM stock_snapshots
      WHERE snapshot_date = ?
      ORDER BY name_en ASC
    `).all(date) as StockSnapshot[];
  }

  /**
   * Get snapshot summary for a specific date
   */
  getSnapshotSummary(date: string): SnapshotSummary | null {
    return this.db.prepare(`
      SELECT 
        snapshot_date, total_products, total_value_cents, products_with_stock,
        products_out_of_stock, products_low_stock, valuation_method, created_at
      FROM stock_snapshot_summaries
      WHERE snapshot_date = ?
    `).get(date) as SnapshotSummary | null;
  }

  /**
   * Get available snapshot dates
   */
  getAvailableDates(): string[] {
    const results = this.db.prepare(`
      SELECT DISTINCT snapshot_date
      FROM stock_snapshots
      ORDER BY snapshot_date DESC
    `).all() as { snapshot_date: string }[];

    return results.map(r => r.snapshot_date);
  }

  /**
   * Get snapshot trends (last 30 days)
   */
  getSnapshotTrends(days: number = 30): SnapshotSummary[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    return this.db.prepare(`
      SELECT 
        snapshot_date, total_products, total_value_cents, products_with_stock,
        products_out_of_stock, products_low_stock, valuation_method, created_at
      FROM stock_snapshot_summaries
      WHERE snapshot_date >= ?
      ORDER BY snapshot_date DESC
    `).all(cutoffDateStr) as SnapshotSummary[];
  }

  /**
   * Clean up old snapshots (keep last 90 days)
   */
  cleanupOldSnapshots(daysToKeep: number = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const deletedSnapshots = this.db.prepare(`
      DELETE FROM stock_snapshots WHERE snapshot_date < ?
    `).run(cutoffDateStr).changes;

    const deletedSummaries = this.db.prepare(`
      DELETE FROM stock_snapshot_summaries WHERE snapshot_date < ?
    `).run(cutoffDateStr).changes;

    logger.info({
      deletedSnapshots,
      deletedSummaries,
      cutoffDate: cutoffDateStr
    }, 'Cleaned up old snapshots');

    return deletedSnapshots + deletedSummaries;
  }
}

export const dailySnapshotService = new DailySnapshotService();
