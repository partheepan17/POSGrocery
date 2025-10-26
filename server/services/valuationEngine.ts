/**
 * Valuation Engine for COGS Calculation
 * Implements FIFO, LIFO, and Average cost methods for inventory valuation
 */

import { getDatabase } from '../db';
import { unitCost, money, calculateCOGSTotal, calculateGrossMargin, moneyToCents, centsToMoney } from '../utils/number';

export type ValuationMethod = 'FIFO' | 'LIFO' | 'AVERAGE';

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
  version: number; // Optimistic locking version
}

export interface ValuationResult {
  unitCostCents: number;
  totalCostCents: number;
  lotsUsed: Array<{
    lotId: number;
    quantityUsed: number;
    unitCostCents: number;
    version: number; // For optimistic locking
  }>;
}

export interface StockValidationResult {
  isValid: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  shortage: number;
  lots: StockLot[];
}

export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostFreezeStatus {
  productId: number;
  productName: string;
  sku: string;
  lastGrnDate: string | null;
  lastFreezeDate: string | null;
  lastSaleDate: string | null;
  effectiveFreezeDate: string | null;
  freezeStatus: 'FROZEN' | 'SALE_LOCKED' | 'OPEN';
}

export class ValuationEngine {
  private get db() {
    return getDatabase();
  }

  /**
   * Get the valuation method for a product
   */
  private getValuationMethod(productId: number): ValuationMethod {
    try {
      // First check product-specific policy
      const productPolicy = this.db.prepare(`
        SELECT cost_method FROM product_cost_policy 
        WHERE product_id = ?
      `).get(productId) as { cost_method: string } | undefined;

      if (productPolicy) {
        return productPolicy.cost_method as ValuationMethod;
      }

      // Fall back to system default
      const systemConfig = this.db.prepare(`
        SELECT value FROM system_config 
        WHERE key = 'default_valuation_method'
      `).get() as { value: string } | undefined;

      return (systemConfig?.value as ValuationMethod) || 'FIFO';
    } catch (error) {
      console.error('Error getting valuation method:', error);
      return 'FIFO'; // Safe default
    }
  }

  /**
   * Get available stock lots for a product, ordered by method
   */
  private getStockLots(productId: number, method: ValuationMethod): StockLot[] {
    const query = method === 'FIFO' 
      ? `SELECT *, version FROM stock_lots WHERE product_id = ? AND quantity_remaining > 0 ORDER BY received_date ASC, id ASC`
      : method === 'LIFO'
      ? `SELECT *, version FROM stock_lots WHERE product_id = ? AND quantity_remaining > 0 ORDER BY received_date DESC, id DESC`
      : `SELECT *, version FROM stock_lots WHERE product_id = ? AND quantity_remaining > 0 ORDER BY received_date ASC, id ASC`;

    return this.db.prepare(query).all(productId) as StockLot[];
  }

  /**
   * Validate stock availability before consumption
   */
  async validateStockAvailability(productId: number, requestedQuantity: number): Promise<StockValidationResult> {
    const method = await this.getValuationMethod(productId);
    const lots = await this.getStockLots(productId, method);
    
    const availableQuantity = lots.reduce((sum, lot) => sum + lot.quantity_remaining, 0);
    const shortage = Math.max(0, requestedQuantity - availableQuantity);
    
    return {
      isValid: availableQuantity >= requestedQuantity,
      availableQuantity,
      requestedQuantity,
      shortage,
      lots
    };
  }

  /**
   * Validate stock lots versions for optimistic locking
   */
  async validateLotVersions(lotsUsed: Array<{ lotId: number; version: number }>): Promise<boolean> {
    for (const lot of lotsUsed) {
      if (lot.lotId <= 0) continue; // Skip virtual lots
      
      const currentLot = this.db.prepare(`
        SELECT version FROM stock_lots WHERE id = ?
      `).get(lot.lotId) as { version: number } | undefined;
      
      if (!currentLot || currentLot.version !== lot.version) {
        return false; // Version mismatch
      }
    }
    return true;
  }

  /**
   * Calculate average cost for a product
   */
  private calculateAverageCost(productId: number): number {
    const result = this.db.prepare(`
      SELECT 
        SUM(quantity_remaining * unit_cost_cents) as total_cost,
        SUM(quantity_remaining) as total_quantity
      FROM stock_lots 
      WHERE product_id = ? AND quantity_remaining > 0
    `).get(productId) as { total_cost: number; total_quantity: number } | undefined;

    if (!result || result.total_quantity === 0) {
      // Fall back to product cost if no lots available
      const product = this.db.prepare('SELECT cost FROM products WHERE id = ?').get(productId) as { cost: number } | undefined;
      return product ? moneyToCents(unitCost(product.cost)) : 0;
    }

    const averageCost = result.total_cost / result.total_quantity;
    return moneyToCents(unitCost(centsToMoney(averageCost)));
  }

  /**
   * Calculate COGS using FIFO method
   */
  private calculateFIFO(productId: number, quantity: number): ValuationResult {
    const lots = this.getStockLots(productId, 'FIFO');
    let remainingQuantity = quantity;
    let totalCostCents = 0;
    const lotsUsed: Array<{ lotId: number; quantityUsed: number; unitCostCents: number; version: number }> = [];

    for (const lot of lots) {
      if (remainingQuantity <= 0) break;

      const quantityToUse = Math.min(remainingQuantity, lot.quantity_remaining);
      const costForThisLot = moneyToCents(calculateCOGSTotal(quantityToUse, centsToMoney(lot.unit_cost_cents)));

      totalCostCents += costForThisLot;
      lotsUsed.push({
        lotId: lot.id,
        quantityUsed: quantityToUse,
        unitCostCents: lot.unit_cost_cents,
        version: lot.version
      });

      remainingQuantity -= quantityToUse;
    }

    if (remainingQuantity > 0) {
      // Not enough stock - use average cost for remaining
      const averageCost = this.calculateAverageCost(productId);
      const additionalCost = moneyToCents(calculateCOGSTotal(remainingQuantity, centsToMoney(averageCost)));
      totalCostCents += additionalCost;
      
      // Add a virtual lot entry for the shortage
      lotsUsed.push({
        lotId: -1, // Virtual lot ID
        quantityUsed: remainingQuantity,
        unitCostCents: averageCost,
        version: 0 // No version for virtual lots
      });
    }

    const unitCostCents = quantity > 0 ? moneyToCents(unitCost(centsToMoney(totalCostCents / quantity))) : 0;
    return {
      unitCostCents,
      totalCostCents,
      lotsUsed
    };
  }

  /**
   * Calculate COGS using LIFO method
   */
  private calculateLIFO(productId: number, quantity: number): ValuationResult {
    const lots = this.getStockLots(productId, 'LIFO');
    let remainingQuantity = quantity;
    let totalCostCents = 0;
    const lotsUsed: Array<{ lotId: number; quantityUsed: number; unitCostCents: number; version: number }> = [];

    for (const lot of lots) {
      if (remainingQuantity <= 0) break;

      const quantityToUse = Math.min(remainingQuantity, lot.quantity_remaining);
      const costForThisLot = moneyToCents(calculateCOGSTotal(quantityToUse, centsToMoney(lot.unit_cost_cents)));

      totalCostCents += costForThisLot;
      lotsUsed.push({
        lotId: lot.id,
        quantityUsed: quantityToUse,
        unitCostCents: lot.unit_cost_cents,
        version: lot.version
      });

      remainingQuantity -= quantityToUse;
    }

    if (remainingQuantity > 0) {
      // Not enough stock - use average cost for remaining
      const averageCost = this.calculateAverageCost(productId);
      const additionalCost = moneyToCents(calculateCOGSTotal(remainingQuantity, centsToMoney(averageCost)));
      totalCostCents += additionalCost;
      
      lotsUsed.push({
        lotId: -1, // Virtual lot ID
        quantityUsed: remainingQuantity,
        unitCostCents: averageCost,
        version: 0 // No version for virtual lots
      });
    }

    const unitCostCents = quantity > 0 ? moneyToCents(unitCost(centsToMoney(totalCostCents / quantity))) : 0;
    return {
      unitCostCents,
      totalCostCents,
      lotsUsed
    };
  }

  /**
   * Calculate COGS using Average method
   */
  private calculateAverage(productId: number, quantity: number): ValuationResult {
    const averageCost = this.calculateAverageCost(productId);
    const totalCostCents = moneyToCents(calculateCOGSTotal(quantity, centsToMoney(averageCost)));

    return {
      unitCostCents: averageCost,
      totalCostCents,
      lotsUsed: [{
        lotId: -1, // Virtual lot for average
        quantityUsed: quantity,
        unitCostCents: averageCost,
        version: 0 // No version for virtual lots
      }]
    };
  }

  /**
   * Calculate COGS for a product sale
   */
  calculateCOGS(productId: number, quantity: number): ValuationResult {
    try {
      const method = this.getValuationMethod(productId);

      switch (method) {
        case 'FIFO':
          return this.calculateFIFO(productId, quantity);
        case 'LIFO':
          return this.calculateLIFO(productId, quantity);
        case 'AVERAGE':
          return this.calculateAverage(productId, quantity);
        default:
          console.warn(`Unknown valuation method: ${method}, falling back to FIFO`);
          return this.calculateFIFO(productId, quantity);
      }
    } catch (error) {
      console.error('Error calculating COGS:', error);
      // Fall back to product cost with proper rounding
      const product = this.db.prepare('SELECT cost FROM products WHERE id = ?').get(productId) as { cost: number } | undefined;
      const fallbackCost = product ? moneyToCents(unitCost(product.cost)) : 0;
      const totalCostCents = moneyToCents(calculateCOGSTotal(quantity, centsToMoney(fallbackCost)));
      
      return {
        unitCostCents: fallbackCost,
        totalCostCents,
        lotsUsed: [{
          lotId: -1,
          quantityUsed: quantity,
          unitCostCents: fallbackCost,
          version: 0
        }]
      };
    }
  }

  /**
   * Update stock lots after consumption with optimistic locking
   */
  updateStockLots(lotsUsed: Array<{ lotId: number; quantityUsed: number; unitCostCents: number; version: number }>): void {
    const updateLot = this.db.prepare(`
      UPDATE stock_lots 
      SET quantity_remaining = quantity_remaining - ?, 
          version = version + 1
      WHERE id = ? AND version = ?
    `);

    for (const lot of lotsUsed) {
      if (lot.lotId > 0) { // Only update real lots, not virtual ones
        const result = updateLot.run(lot.quantityUsed, lot.lotId, lot.version);
        if (result.changes === 0) {
          throw new Error(`Version conflict for lot ${lot.lotId}. Expected version ${lot.version} but lot was modified.`);
        }
      }
    }
  }

  /**
   * Create stock movement entry
   */
  createStockMovement(
    productId: number,
    quantity: number,
    unitCostCents: number,
    referenceType: string,
    referenceId: number,
    createdBy?: number
  ): void {
    const insertMovement = this.db.prepare(`
      INSERT INTO stock_ledger (
        product_id, delta_qty, reason, ref_id, unit_cost_cents, 
        balance_after, created_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Calculate new balance
    const currentBalance = this.db.prepare(`
      SELECT COALESCE(SUM(delta_qty), 0) as balance 
      FROM stock_ledger 
      WHERE product_id = ?
    `).get(productId) as { balance: number };

    const newBalance = currentBalance.balance - quantity; // Negative quantity for sales

    insertMovement.run(
      productId,
      -quantity, // Negative for sales
      'SALE',
      referenceId,
      unitCostCents,
      newBalance,
      createdBy || null,
      `Sale via ${referenceType}`
    );
  }

  /**
   * Get system configuration value
   */
  async getSystemConfig(key: string, defaultValue: string = ''): Promise<string> {
    try {
      const result = this.db.prepare(`
        SELECT value FROM system_config WHERE key = ?
      `).get(key) as { value: string } | undefined;

      return result?.value || defaultValue;
    } catch (error) {
      console.error(`Error getting system config for key ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Get cost freeze configuration
   */
  async getCostFreezeDays(): Promise<number> {
    const value = await this.getSystemConfig('inventory.cost_freeze_after_days', '0');
    return parseInt(value, 10) || 0;
  }

  /**
   * Check if a product's cost is frozen for a given date
   */
  async isCostFrozen(productId: number, checkDate: string): Promise<boolean> {
    const freezeDays = await this.getCostFreezeDays();
    if (freezeDays === 0) {
      return false; // Never freeze
    }

    // Get the effective freeze date for this product
    const freezeStatus = await this.getCostFreezeStatus(productId);
    if (!freezeStatus || !freezeStatus.effectiveFreezeDate) {
      return false; // No freeze date set
    }

    // Check if the check date is after the freeze date + freeze days
    const freezeDate = new Date(freezeStatus.effectiveFreezeDate);
    const cutoffDate = new Date(freezeDate.getTime() + (freezeDays * 24 * 60 * 60 * 1000));
    const checkDateTime = new Date(checkDate);

    return checkDateTime > cutoffDate;
  }

  /**
   * Get cost freeze status for a product
   */
  async getCostFreezeStatus(productId: number): Promise<CostFreezeStatus | null> {
    const result = this.db.prepare(`
      SELECT 
        product_id,
        product_name,
        sku,
        last_grn_date,
        last_freeze_date,
        last_sale_date,
        effective_freeze_date,
        freeze_status
      FROM cost_freeze_status 
      WHERE product_id = ?
    `).get(productId) as {
      product_id: number;
      product_name: string;
      sku: string;
      last_grn_date: string | null;
      last_freeze_date: string | null;
      last_sale_date: string | null;
      effective_freeze_date: string | null;
      freeze_status: 'FROZEN' | 'SALE_LOCKED' | 'OPEN';
    } | undefined;

    if (!result) {
      return null;
    }

    return {
      productId: result.product_id,
      productName: result.product_name,
      sku: result.sku,
      lastGrnDate: result.last_grn_date,
      lastFreezeDate: result.last_freeze_date,
      lastSaleDate: result.last_sale_date,
      effectiveFreezeDate: result.effective_freeze_date,
      freezeStatus: result.freeze_status
    };
  }

  /**
   * Check if a GRN date would affect historical COGS
   */
  async wouldAffectHistoricalCOGS(productId: number, grnDate: string): Promise<boolean> {
    // Check if there are any sales after the GRN date
    const salesAfterGrn = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM invoice_lines il
      JOIN invoices i ON il.invoice_id = i.id
      WHERE il.product_id = ? AND i.created_at > ?
    `).get(productId, grnDate) as { count: number };

    return salesAfterGrn.count > 0;
  }

  /**
   * Mark cost as frozen for a product at a specific date
   */
  async freezeCost(productId: number, freezeDate: string): Promise<void> {
    // Update all stock lots for this product to mark them as frozen
    this.db.prepare(`
      UPDATE stock_lots 
      SET cost_freeze_date = ?
      WHERE product_id = ? AND cost_freeze_date IS NULL
    `).run(freezeDate, productId);

    // Update stock ledger entries
    this.db.prepare(`
      UPDATE stock_ledger 
      SET cost_freeze_date = ?
      WHERE product_id = ? AND cost_freeze_date IS NULL
    `).run(freezeDate, productId);
  }

  /**
   * Set system configuration value
   */
  async setSystemConfig(key: string, value: string, description?: string): Promise<void> {
    try {
      const upsert = this.db.prepare(`
        INSERT INTO system_config (key, value, description, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          description = excluded.description,
          updated_at = datetime('now')
      `);

      upsert.run(key, value, description || null);
    } catch (error) {
      console.error(`Error setting system config for key ${key}:`, error);
      throw error;
    }
  }
}

export const valuationEngine = new ValuationEngine();
