/**
 * Valuation Engine - Shared adapter for FIFO & Average cost calculation
 * Provides consistent stock valuation across the system
 */

import { getDatabase } from '../db';
import { createRequestLogger } from './logger';

export type ValuationMethod = 'FIFO' | 'AVERAGE' | 'LIFO';

export interface StockLot {
  id: number;
  product_id: number;
  lot_number: string | null;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost_cents: number;
  received_date: string;
  expiry_date: string | null;
  supplier_id: number | null;
  grn_id: number | null;
}

export interface FIFOLayer {
  lot_id: number;
  qty_remaining: number;
  unit_cost_cents: number;
  received_date: string;
  expiry_date: string | null;
}

export interface ValuationResult {
  qty_on_hand: number;
  value_cents: number;
  method: ValuationMethod;
  has_unknown_cost: boolean;
  layers?: FIFOLayer[];
  average_cost_cents?: number;
}

export class ValuationEngine {
  private get db() { return getDatabase(); }
  private logger = createRequestLogger({} as any);

  /**
   * Get current stock on hand for a product
   */
  getSOH(productId: number): number {
    const result = this.db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as qty_on_hand
      FROM stock_ledger 
      WHERE product_id = ?
    `).get(productId) as { qty_on_hand: number } | undefined;

    return result?.qty_on_hand || 0;
  }

  /**
   * Get average cost for a product (weighted average of positive movements)
   */
  getAvgCost(productId: number): number {
    const result = this.db.prepare(`
      SELECT 
        COALESCE(SUM(quantity * unit_cost * 100), 0) as total_cost,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END), 0) as total_qty
      FROM stock_ledger 
      WHERE product_id = ? AND unit_cost IS NOT NULL AND unit_cost > 0
    `).get(productId) as { total_cost: number; total_qty: number } | undefined;

    if (!result || result.total_qty === 0) {
      return 0;
    }

    return Math.floor(result.total_cost / result.total_qty);
  }

  /**
   * Get FIFO layers for a product (remaining quantities from oldest lots)
   */
  getFIFOLayers(productId: number): FIFOLayer[] {
    const lots = this.db.prepare(`
      SELECT 
        id as lot_id,
        quantity_remaining as qty_remaining,
        unit_cost_cents,
        received_date,
        expiry_date
      FROM stock_lots 
      WHERE product_id = ? AND quantity_remaining > 0
      ORDER BY received_date ASC, id ASC
    `).all(productId) as FIFOLayer[];

    return lots;
  }

  /**
   * Compute valuation for a product using specified method
   */
  computeValuation(productId: number, qtyOnHand: number, method: ValuationMethod): ValuationResult {
    this.logger.debug({ productId, qtyOnHand, method }, 'Computing valuation');

    const result: ValuationResult = {
      qty_on_hand: qtyOnHand,
      value_cents: 0,
      method,
      has_unknown_cost: false
    };

    if (qtyOnHand <= 0) {
      return result;
    }

    switch (method) {
      case 'AVERAGE':
        return this.computeAverageValuation(productId, qtyOnHand);
      
      case 'FIFO':
        return this.computeFIFOValuation(productId, qtyOnHand);
      
      case 'LIFO':
        return this.computeLIFOValuation(productId, qtyOnHand);
      
      default:
        throw new Error(`Unsupported valuation method: ${method}`);
    }
  }

  /**
   * Compute average cost valuation
   */
  private computeAverageValuation(productId: number, qtyOnHand: number): ValuationResult {
    const avgCost = this.getAvgCost(productId);
    const hasUnknownCost = avgCost === 0 && qtyOnHand > 0;

    return {
      qty_on_hand: qtyOnHand,
      value_cents: qtyOnHand * avgCost,
      method: 'AVERAGE',
      has_unknown_cost: hasUnknownCost,
      average_cost_cents: avgCost
    };
  }

  /**
   * Compute FIFO valuation
   */
  private computeFIFOValuation(productId: number, qtyOnHand: number): ValuationResult {
    const layers = this.getFIFOLayers(productId);
    let remainingQty = qtyOnHand;
    let totalValue = 0;
    const consumedLayers: FIFOLayer[] = [];

    for (const layer of layers) {
      if (remainingQty <= 0) break;

      const qtyToConsume = Math.min(remainingQty, layer.qty_remaining);
      totalValue += qtyToConsume * layer.unit_cost_cents;
      remainingQty -= qtyToConsume;

      consumedLayers.push({
        ...layer,
        qty_remaining: qtyToConsume
      });
    }

    const hasUnknownCost = remainingQty > 0 && layers.length === 0;

    return {
      qty_on_hand: qtyOnHand,
      value_cents: totalValue,
      method: 'FIFO',
      has_unknown_cost: hasUnknownCost,
      layers: consumedLayers
    };
  }

  /**
   * Compute LIFO valuation (Last In, First Out)
   */
  private computeLIFOValuation(productId: number, qtyOnHand: number): ValuationResult {
    const layers = this.getFIFOLayers(productId).reverse(); // Reverse for LIFO
    let remainingQty = qtyOnHand;
    let totalValue = 0;
    const consumedLayers: FIFOLayer[] = [];

    for (const layer of layers) {
      if (remainingQty <= 0) break;

      const qtyToConsume = Math.min(remainingQty, layer.qty_remaining);
      totalValue += qtyToConsume * layer.unit_cost_cents;
      remainingQty -= qtyToConsume;

      consumedLayers.push({
        ...layer,
        qty_remaining: qtyToConsume
      });
    }

    const hasUnknownCost = remainingQty > 0 && layers.length === 0;

    return {
      qty_on_hand: qtyOnHand,
      value_cents: totalValue,
      method: 'LIFO',
      has_unknown_cost: hasUnknownCost,
      layers: consumedLayers
    };
  }

  /**
   * Get valuation for multiple products
   */
  computeBulkValuation(productIds: number[], method: ValuationMethod): Map<number, ValuationResult> {
    const results = new Map<number, ValuationResult>();

    for (const productId of productIds) {
      const qtyOnHand = this.getSOH(productId);
      results.set(productId, this.computeValuation(productId, qtyOnHand, method));
    }

    return results;
  }

  /**
   * Get total inventory valuation
   */
  getTotalInventoryValue(method: ValuationMethod): {
    method: ValuationMethod;
    total_value_cents: number;
    total_products: number;
    products_with_unknown_cost: number;
  } {
    const products = this.db.prepare(`
      SELECT DISTINCT product_id 
      FROM stock_ledger 
      WHERE product_id IN (SELECT id FROM products WHERE is_active = 1)
    `).all() as { product_id: number }[];

    let totalValue = 0;
    let productsWithUnknownCost = 0;

    for (const { product_id } of products) {
      const qtyOnHand = this.getSOH(product_id);
      if (qtyOnHand > 0) {
        const valuation = this.computeValuation(product_id, qtyOnHand, method);
        totalValue += valuation.value_cents;
        if (valuation.has_unknown_cost) {
          productsWithUnknownCost++;
        }
      }
    }

    return {
      method,
      total_value_cents: totalValue,
      total_products: products.length,
      products_with_unknown_cost: productsWithUnknownCost
    };
  }

  /**
   * Create a stock lot for FIFO tracking
   */
  createStockLot(
    productId: number,
    quantityReceived: number,
    unitCostCents: number,
    lotNumber: string | null = null,
    expiryDate: string | null = null,
    supplierId: number | null = null,
    grnId: number | null = null
  ): number {
    const result = this.db.prepare(`
      INSERT INTO stock_lots (
        product_id, lot_number, quantity_received, quantity_remaining,
        unit_cost_cents, received_date, expiry_date, supplier_id, grn_id
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?)
    `).run(
      productId, lotNumber, quantityReceived, quantityReceived,
      unitCostCents, expiryDate, supplierId, grnId
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Consume stock from FIFO lots
   */
  consumeFIFOStock(productId: number, quantity: number): {
    consumed: FIFOLayer[];
    remainingQty: number;
  } {
    const layers = this.getFIFOLayers(productId);
    let remainingQty = quantity;
    const consumed: FIFOLayer[] = [];

    for (const layer of layers) {
      if (remainingQty <= 0) break;

      const qtyToConsume = Math.min(remainingQty, layer.qty_remaining);
      
      // Update the lot
      this.db.prepare(`
        UPDATE stock_lots 
        SET quantity_remaining = quantity_remaining - ?
        WHERE id = ?
      `).run(qtyToConsume, layer.lot_id);

      consumed.push({
        ...layer,
        qty_remaining: qtyToConsume
      });

      remainingQty -= qtyToConsume;
    }

    return { consumed, remainingQty };
  }
}

// Export singleton instance
export const valuationEngine = new ValuationEngine();
