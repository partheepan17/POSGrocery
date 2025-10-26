/**
 * Inventory Costing Service
 * Handles FIFO, LIFO, and Average costing methods for inventory valuation
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';

export type CostingMethod = 'FIFO' | 'LIFO' | 'AVERAGE';

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

export interface StockMovement {
  id: number;
  product_id: number;
  qty: number;
  type: 'IN' | 'OUT';
  reason: string;
  unit_cost: number | null;
  terminal: string | null;
  cashier: number | null;
  created_at: string;
}

export interface CostCalculation {
  method: CostingMethod;
  unit_cost_cents: number;
  total_cost_cents: number;
  lots_used: Array<{
    lot_id: number;
    quantity_used: number;
    unit_cost_cents: number;
    total_cost_cents: number;
  }>;
  remaining_quantity: number;
}

export interface InventoryValuation {
  product_id: number;
  current_stock: number;
  valuation_method: CostingMethod;
  average_cost_cents: number;
  total_value_cents: number;
  lots: StockLot[];
}

export class InventoryCostingService {
  private logger = createContextLogger({ operation: 'inventory_costing' });

  /**
   * Calculate cost for a sale using the specified costing method
   */
  async calculateSaleCost(
    productId: number,
    quantity: number,
    method: CostingMethod = 'FIFO'
  ): Promise<CostCalculation> {
    this.logger.info({ productId, quantity, method }, 'Calculating sale cost');

    const db = getDatabase();
    
    try {
      // Get available lots for the product
      const lots = this.getAvailableLots(productId);
      
      if (lots.length === 0) {
        throw new Error(`No stock available for product ${productId}`);
      }

      const totalAvailable = lots.reduce((sum, lot) => sum + lot.quantity_remaining, 0);
      
      if (totalAvailable < quantity) {
        throw new Error(`Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`);
      }

      let result: CostCalculation;

      switch (method) {
        case 'FIFO':
          result = this.calculateFIFOCost(lots, quantity);
          break;
        case 'LIFO':
          result = this.calculateLIFOCost(lots, quantity);
          break;
        case 'AVERAGE':
          result = this.calculateAverageCost(lots, quantity);
          break;
        default:
          throw new Error(`Unsupported costing method: ${method}`);
      }

      this.logger.info({
        productId,
        quantity,
        method,
        unitCost: result.unit_cost_cents,
        totalCost: result.total_cost_cents,
        lotsUsed: result.lots_used.length
      }, 'Sale cost calculated');

      return result;

    } catch (error) {
      this.logger.error({ productId, quantity, method, error }, 'Failed to calculate sale cost');
      throw error;
    }
  }

  /**
   * Get current inventory valuation for a product
   */
  async getInventoryValuation(productId: number): Promise<InventoryValuation> {
    const db = getDatabase();
    
    try {
      // Get product's costing method
      const costPolicy = db.prepare(`
        SELECT cost_method FROM product_cost_policy WHERE product_id = ?
      `).get(productId) as { cost_method: CostingMethod } | undefined;

      const method = costPolicy?.cost_method || 'AVERAGE';

      // Get current lots
      const lots = this.getAvailableLots(productId);
      const currentStock = lots.reduce((sum, lot) => sum + lot.quantity_remaining, 0);

      // Calculate average cost
      const totalValue = lots.reduce((sum, lot) => 
        sum + (lot.quantity_remaining * lot.unit_cost_cents), 0);
      const averageCost = currentStock > 0 ? Math.round(totalValue / currentStock) : 0;

      return {
        product_id: productId,
        current_stock: currentStock,
        valuation_method: method,
        average_cost_cents: averageCost,
        total_value_cents: totalValue,
        lots
      };

    } catch (error) {
      this.logger.error({ productId, error }, 'Failed to get inventory valuation');
      throw error;
    }
  }

  /**
   * Record stock movement with proper costing
   */
  async recordStockMovement(
    productId: number,
    quantity: number,
    type: 'IN' | 'OUT',
    reason: string,
    unitCostCents: number | null = null,
    terminal: string | null = null,
    cashierId: number | null = null,
    referenceId: number | null = null,
    referenceType: string | null = null
  ): Promise<number> {
    const db = getDatabase();
    
    try {
      // Get current stock balance
      const currentBalance = this.getCurrentStock(productId);
      const newBalance = type === 'IN' ? currentBalance + quantity : currentBalance - quantity;

      if (newBalance < 0) {
        throw new Error(`Insufficient stock. Current: ${currentBalance}, Requested: ${quantity}`);
      }

      // Record the movement
      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          product_id, qty, type, reason, unit_cost, terminal, cashier, 
          created_at, reference_id, reference_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const movementId = insertMovement.run(
        productId,
        type === 'IN' ? quantity : -quantity,
        type,
        reason,
        unitCostCents,
        terminal,
        cashierId,
        new Date().toISOString(),
        referenceId,
        referenceType
      ).lastInsertRowid as number;

      // If it's an IN movement, create or update stock lots
      if (type === 'IN' && unitCostCents) {
        await this.createStockLot(productId, quantity, unitCostCents, reason, referenceId);
      }

      this.logger.info({
        productId,
        quantity,
        type,
        reason,
        unitCostCents,
        newBalance,
        movementId
      }, 'Stock movement recorded');

      return movementId;

    } catch (error) {
      this.logger.error({ productId, quantity, type, reason, error }, 'Failed to record stock movement');
      throw error;
    }
  }

  /**
   * Update stock lots after a sale (for FIFO/LIFO)
   */
  async updateStockLotsAfterSale(
    productId: number,
    costCalculation: CostCalculation
  ): Promise<void> {
    const db = getDatabase();
    
    try {
      const updateLot = db.prepare(`
        UPDATE stock_lots 
        SET quantity_remaining = quantity_remaining - ?
        WHERE id = ?
      `);

      for (const lotUsage of costCalculation.lots_used) {
        updateLot.run(lotUsage.quantity_used, lotUsage.lot_id);
      }

      this.logger.info({
        productId,
        method: costCalculation.method,
        lotsUpdated: costCalculation.lots_used.length
      }, 'Stock lots updated after sale');

    } catch (error) {
      this.logger.error({ productId, costCalculation, error }, 'Failed to update stock lots');
      throw error;
    }
  }

  /**
   * Get available stock lots for a product
   */
  private getAvailableLots(productId: number): StockLot[] {
    const db = getDatabase();
    
    return db.prepare(`
      SELECT 
        id, product_id, lot_number, quantity_received, quantity_remaining,
        unit_cost_cents, received_date, expiry_date, supplier_id, grn_id
      FROM stock_lots 
      WHERE product_id = ? AND quantity_remaining > 0
      ORDER BY received_date ASC, id ASC
    `).all(productId) as StockLot[];
  }

  /**
   * Get current stock quantity for a product
   */
  private getCurrentStock(productId: number): number {
    const db = getDatabase();
    
    const result = db.prepare(`
      SELECT COALESCE(SUM(qty), 0) as total_stock
      FROM stock_movements 
      WHERE product_id = ?
    `).get(productId) as { total_stock: number };

    return result.total_stock;
  }

  /**
   * Calculate FIFO cost
   */
  private calculateFIFOCost(lots: StockLot[], quantity: number): CostCalculation {
    const lotsUsed: CostCalculation['lots_used'] = [];
    let remainingQuantity = quantity;
    let totalCostCents = 0;

    // Sort lots by received_date (FIFO = First In, First Out)
    const sortedLots = [...lots].sort((a, b) => 
      new Date(a.received_date).getTime() - new Date(b.received_date).getTime()
    );

    for (const lot of sortedLots) {
      if (remainingQuantity <= 0) break;

      const quantityToUse = Math.min(remainingQuantity, lot.quantity_remaining);
      const lotCost = quantityToUse * lot.unit_cost_cents;

      lotsUsed.push({
        lot_id: lot.id,
        quantity_used: quantityToUse,
        unit_cost_cents: lot.unit_cost_cents,
        total_cost_cents: lotCost
      });

      totalCostCents += lotCost;
      remainingQuantity -= quantityToUse;
    }

    return {
      method: 'FIFO',
      unit_cost_cents: quantity > 0 ? Math.round(totalCostCents / quantity) : 0,
      total_cost_cents: totalCostCents,
      lots_used: lotsUsed,
      remaining_quantity: remainingQuantity
    };
  }

  /**
   * Calculate LIFO cost
   */
  private calculateLIFOCost(lots: StockLot[], quantity: number): CostCalculation {
    const lotsUsed: CostCalculation['lots_used'] = [];
    let remainingQuantity = quantity;
    let totalCostCents = 0;

    // Sort lots by received_date descending (LIFO = Last In, First Out)
    const sortedLots = [...lots].sort((a, b) => 
      new Date(b.received_date).getTime() - new Date(a.received_date).getTime()
    );

    for (const lot of sortedLots) {
      if (remainingQuantity <= 0) break;

      const quantityToUse = Math.min(remainingQuantity, lot.quantity_remaining);
      const lotCost = quantityToUse * lot.unit_cost_cents;

      lotsUsed.push({
        lot_id: lot.id,
        quantity_used: quantityToUse,
        unit_cost_cents: lot.unit_cost_cents,
        total_cost_cents: lotCost
      });

      totalCostCents += lotCost;
      remainingQuantity -= quantityToUse;
    }

    return {
      method: 'LIFO',
      unit_cost_cents: quantity > 0 ? Math.round(totalCostCents / quantity) : 0,
      total_cost_cents: totalCostCents,
      lots_used: lotsUsed,
      remaining_quantity: remainingQuantity
    };
  }

  /**
   * Calculate Average cost
   */
  private calculateAverageCost(lots: StockLot[], quantity: number): CostCalculation {
    const totalValue = lots.reduce((sum, lot) => 
      sum + (lot.quantity_remaining * lot.unit_cost_cents), 0);
    const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity_remaining, 0);
    
    const averageCostCents = totalQuantity > 0 ? Math.round(totalValue / totalQuantity) : 0;
    const totalCostCents = quantity * averageCostCents;

    // For average costing, we don't track specific lots
    const lotsUsed: CostCalculation['lots_used'] = [];

    return {
      method: 'AVERAGE',
      unit_cost_cents: averageCostCents,
      total_cost_cents: totalCostCents,
      lots_used: lotsUsed,
      remaining_quantity: 0
    };
  }

  /**
   * Create a new stock lot
   */
  private async createStockLot(
    productId: number,
    quantity: number,
    unitCostCents: number,
    reason: string,
    referenceId: number | null = null
  ): Promise<number> {
    const db = getDatabase();
    
    const insertLot = db.prepare(`
      INSERT INTO stock_lots (
        product_id, lot_number, quantity_received, quantity_remaining,
        unit_cost_cents, received_date, grn_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const lotNumber = `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const lotId = insertLot.run(
      productId,
      lotNumber,
      quantity,
      quantity,
      unitCostCents,
      new Date().toISOString(),
      referenceId
    ).lastInsertRowid as number;

    this.logger.info({
      productId,
      quantity,
      unitCostCents,
      lotNumber,
      lotId
    }, 'Stock lot created');

    return lotId;
  }

  /**
   * Get costing method for a product
   */
  async getCostingMethod(productId: number): Promise<CostingMethod> {
    const db = getDatabase();
    
    const result = db.prepare(`
      SELECT cost_method FROM product_cost_policy WHERE product_id = ?
    `).get(productId) as { cost_method: CostingMethod } | undefined;

    return result?.cost_method || 'AVERAGE';
  }

  /**
   * Set costing method for a product
   */
  async setCostingMethod(productId: number, method: CostingMethod): Promise<void> {
    const db = getDatabase();
    
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO product_cost_policy (product_id, cost_method, updated_at)
      VALUES (?, ?, ?)
    `);

    upsert.run(productId, method, new Date().toISOString());

    this.logger.info({ productId, method }, 'Costing method updated');
  }

  /**
   * Validate inventory integrity
   */
  async validateInventoryIntegrity(): Promise<{
    isValid: boolean;
    issues: Array<{
      product_id: number;
      issue: string;
      details: any;
    }>;
  }> {
    const db = getDatabase();
    const issues: Array<{ product_id: number; issue: string; details: any }> = [];

    try {
      // Check for negative stock
      const negativeStock = db.prepare(`
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          COALESCE(SUM(sm.qty), 0) as current_stock
        FROM products p
        LEFT JOIN stock_movements sm ON p.id = sm.product_id
        GROUP BY p.id, p.sku, p.name_en
        HAVING current_stock < 0
      `).all();

      for (const item of negativeStock) {
        issues.push({
          product_id: item.product_id,
          issue: 'Negative stock',
          details: { sku: item.sku, name: item.name_en, stock: item.current_stock }
        });
      }

      // Check for lot inconsistencies
      const lotInconsistencies = db.prepare(`
        SELECT 
          sl.product_id,
          sl.id as lot_id,
          sl.quantity_remaining,
          COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.qty ELSE -sm.qty END), 0) as calculated_remaining
        FROM stock_lots sl
        LEFT JOIN stock_movements sm ON sl.id = sm.lot_id
        WHERE sl.quantity_remaining != COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.qty ELSE -sm.qty END), 0)
        GROUP BY sl.product_id, sl.id, sl.quantity_remaining
      `).all();

      for (const item of lotInconsistencies) {
        issues.push({
          product_id: item.product_id,
          issue: 'Lot quantity mismatch',
          details: { 
            lot_id: item.lot_id, 
            recorded: item.quantity_remaining, 
            calculated: item.calculated_remaining 
          }
        });
      }

      return {
        isValid: issues.length === 0,
        issues
      };

    } catch (error) {
      this.logger.error({ error }, 'Failed to validate inventory integrity');
      throw error;
    }
  }
}

export const inventoryCostingService = new InventoryCostingService();







