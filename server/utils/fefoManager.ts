/**
 * FEFO (First Expiry, First Out) Manager
 * Handles lot selection based on expiry dates for sales
 */

import { getDatabase } from '../db';
import { createContextLogger } from './logger';

export interface FEFOLot {
  lot_id: number;
  lot_number: string;
  quantity_remaining: number;
  expiry_date: string | null;
  unit_cost_cents: number;
  received_date: string;
  fefo_priority: number;
}

export interface FEFOSelection {
  lots: FEFOLot[];
  total_quantity: number;
  total_cost_cents: number;
  remaining_quantity: number;
}

export class FEFOManager {
  private logger = createContextLogger({ operation: 'fefo_manager' });

  /**
   * Get FEFO lots for a product, ordered by expiry date
   */
  getFEFOLots(productId: number): FEFOLot[] {
    const db = getDatabase();
    
    try {
      const lots = db.prepare(`
        SELECT 
          lot_id,
          lot_number,
          quantity_remaining,
          expiry_date,
          unit_cost_cents,
          received_date,
          fefo_priority
        FROM vw_fefo_lots_by_product
        WHERE product_id = ? AND quantity_remaining > 0
        ORDER BY fefo_priority
      `).all(productId) as FEFOLot[];

      this.logger.debug({ 
        productId, 
        lotsFound: lots.length 
      }, 'Retrieved FEFO lots for product');

      return lots;
    } catch (error) {
      this.logger.error('Failed to get FEFO lots', { 
        productId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Select lots for sale using FEFO logic
   */
  selectLotsForSale(productId: number, requestedQuantity: number): FEFOSelection {
    const lots = this.getFEFOLots(productId);
    
    if (lots.length === 0) {
      return {
        lots: [],
        total_quantity: 0,
        total_cost_cents: 0,
        remaining_quantity: requestedQuantity
      };
    }

    const selectedLots: FEFOLot[] = [];
    let remainingQuantity = requestedQuantity;
    let totalCostCents = 0;

    // Select lots in FEFO order
    for (const lot of lots) {
      if (remainingQuantity <= 0) break;

      const quantityToTake = Math.min(lot.quantity_remaining, remainingQuantity);
      
      selectedLots.push({
        ...lot,
        quantity_remaining: quantityToTake
      });

      totalCostCents += quantityToTake * lot.unit_cost_cents;
      remainingQuantity -= quantityToTake;
    }

    const totalQuantity = requestedQuantity - remainingQuantity;

    this.logger.info({
      productId,
      requestedQuantity,
      totalQuantity,
      remainingQuantity,
      lotsSelected: selectedLots.length,
      totalCostCents
    }, 'Selected lots for sale using FEFO');

    return {
      lots: selectedLots,
      total_quantity: totalQuantity,
      total_cost_cents: totalCostCents,
      remaining_quantity: remainingQuantity
    };
  }

  /**
   * Check if a product has any expiring lots
   */
  hasExpiringLots(productId: number, daysThreshold: number = 30): boolean {
    const db = getDatabase();
    
    try {
      const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM stock_lots
        WHERE product_id = ? 
          AND quantity_remaining > 0
          AND expiry_date IS NOT NULL
          AND julianday(expiry_date) <= julianday('now', '+${daysThreshold} days')
      `).get(productId) as { count: number };

      return result.count > 0;
    } catch (error) {
      this.logger.error('Failed to check expiring lots', { 
        productId, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Get expiry information for a product
   */
  getProductExpiryInfo(productId: number): {
    hasExpiry: boolean;
    earliestExpiry: string | null;
    daysToEarliestExpiry: number | null;
    expiringLotsCount: number;
    totalExpiringQuantity: number;
  } {
    const db = getDatabase();
    
    try {
      const result = db.prepare(`
        SELECT 
          COUNT(*) as expiring_lots_count,
          SUM(quantity_remaining) as total_expiring_quantity,
          MIN(expiry_date) as earliest_expiry
        FROM stock_lots
        WHERE product_id = ? 
          AND quantity_remaining > 0
          AND expiry_date IS NOT NULL
          AND julianday(expiry_date) > julianday('now')
      `).get(productId) as {
        expiring_lots_count: number;
        total_expiring_quantity: number;
        earliest_expiry: string | null;
      };

      const hasExpiry = result.expiring_lots_count > 0;
      let daysToEarliestExpiry: number | null = null;

      if (result.earliest_expiry) {
        const daysResult = db.prepare(`
          SELECT CAST((julianday(?) - julianday('now')) AS INTEGER) as days
        `).get(result.earliest_expiry) as { days: number };
        daysToEarliestExpiry = daysResult.days;
      }

      return {
        hasExpiry,
        earliestExpiry: result.earliest_expiry,
        daysToEarliestExpiry,
        expiringLotsCount: result.expiring_lots_count,
        totalExpiringQuantity: result.total_expiring_quantity || 0
      };
    } catch (error) {
      this.logger.error('Failed to get product expiry info', { 
        productId, 
        error: error.message 
      });
      return {
        hasExpiry: false,
        earliestExpiry: null,
        daysToEarliestExpiry: null,
        expiringLotsCount: 0,
        totalExpiringQuantity: 0
      };
    }
  }

  /**
   * Get products with near-expiry lots
   */
  getNearExpiryProducts(daysThreshold: number = 30): Array<{
    product_id: number;
    sku: string;
    name_en: string;
    name_si?: string;
    name_ta?: string;
    unit: string;
    category_name?: string;
    lot_id: number;
    lot_number: string;
    quantity_remaining: number;
    expiry_date: string;
    days_to_expiry: number;
    unit_cost_cents: number;
  }> {
    const db = getDatabase();
    
    try {
      const products = db.prepare(`
        SELECT 
          product_id,
          sku,
          name_en,
          name_si,
          name_ta,
          unit,
          category_name,
          lot_id,
          lot_number,
          quantity_remaining,
          expiry_date,
          days_to_expiry,
          unit_cost_cents
        FROM vw_near_expiry_products
        WHERE days_to_expiry <= ?
        ORDER BY days_to_expiry ASC, product_id, lot_id
      `).all(daysThreshold) as Array<{
        product_id: number;
        sku: string;
        name_en: string;
        name_si?: string;
        name_ta?: string;
        unit: string;
        category_name?: string;
        lot_id: number;
        lot_number: string;
        quantity_remaining: number;
        expiry_date: string;
        days_to_expiry: number;
        unit_cost_cents: number;
      }>;

      this.logger.info({ 
        daysThreshold, 
        productsFound: products.length 
      }, 'Retrieved near-expiry products');

      return products;
    } catch (error) {
      this.logger.error('Failed to get near-expiry products', { 
        error: error.message 
      });
      return [];
    }
  }

  /**
   * Update lot quantities after sale
   */
  updateLotQuantities(lotSelections: FEFOSelection[]): void {
    const db = getDatabase();
    
    try {
      db.transaction(() => {
        for (const selection of lotSelections) {
          for (const lot of selection.lots) {
            db.prepare(`
              UPDATE stock_lots 
              SET quantity_remaining = quantity_remaining - ?
              WHERE lot_id = ?
            `).run(lot.quantity_remaining, lot.lot_id);
          }
        }
      });

      this.logger.info({ 
        selectionsProcessed: lotSelections.length 
      }, 'Updated lot quantities after sale');

    } catch (error) {
      this.logger.error('Failed to update lot quantities', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get lot details for a specific lot ID
   */
  getLotDetails(lotId: number): FEFOLot | null {
    const db = getDatabase();
    
    try {
      const lot = db.prepare(`
        SELECT 
          lot_id,
          lot_number,
          quantity_remaining,
          expiry_date,
          unit_cost_cents,
          received_date,
          1 as fefo_priority
        FROM stock_lots
        WHERE lot_id = ?
      `).get(lotId) as FEFOLot | undefined;

      return lot || null;
    } catch (error) {
      this.logger.error('Failed to get lot details', { 
        lotId, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Get all lots for a product with expiry information
   */
  getProductLotsWithExpiry(productId: number): Array<FEFOLot & {
    days_to_expiry: number | null;
    expiry_status: string;
  }> {
    const db = getDatabase();
    
    try {
      const lots = db.prepare(`
        SELECT 
          sl.lot_id,
          sl.lot_number,
          sl.quantity_remaining,
          sl.expiry_date,
          sl.unit_cost_cents,
          sl.received_date,
          1 as fefo_priority,
          CASE 
            WHEN sl.expiry_date IS NULL THEN NULL
            ELSE CAST((julianday(sl.expiry_date) - julianday('now')) AS INTEGER)
          END as days_to_expiry,
          CASE 
            WHEN sl.expiry_date IS NULL THEN 'No Expiry'
            WHEN julianday(sl.expiry_date) < julianday('now') THEN 'Expired'
            WHEN julianday(sl.expiry_date) <= julianday('now', '+7 days') THEN 'Critical'
            WHEN julianday(sl.expiry_date) <= julianday('now', '+30 days') THEN 'Near Expiry'
            ELSE 'Fresh'
          END as expiry_status
        FROM stock_lots sl
        WHERE sl.product_id = ?
        ORDER BY 
          CASE WHEN sl.expiry_date IS NULL THEN 1 ELSE 0 END,
          sl.expiry_date ASC,
          sl.received_date ASC
      `).all(productId) as Array<FEFOLot & {
        days_to_expiry: number | null;
        expiry_status: string;
      }>;

      return lots;
    } catch (error) {
      this.logger.error('Failed to get product lots with expiry', { 
        productId, 
        error: error.message 
      });
      return [];
    }
  }
}

// Export singleton instance
export const fefoManager = new FEFOManager();










