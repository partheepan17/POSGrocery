/**
 * Stock Ledger Management with FIFO/Average Cost Policy
 * Provides deterministic stock tracking and cost calculation
 */

import { getDatabase } from '../db';
import { createStandardError, ERROR_CODES } from './errorCodes';

export interface StockLot {
  id: number;
  product_id: number;
  lot_number: string | null;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  received_date: string;
  expiry_date: string | null;
  supplier_id: number | null;
  grn_id: number | null;
}

export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'transfer';
  reference_id: number | null;
  reference_type: string | null;
  lot_id: number | null;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  balance_after: number;
  notes: string | null;
  created_at: string;
  created_by: number | null;
}

export interface CostPolicy {
  product_id: number;
  cost_method: 'FIFO' | 'AVERAGE' | 'LIFO';
}

export interface FIFOLot {
  lot_id: number;
  lot_number: string | null;
  quantity_available: number;
  unit_cost: number;
  received_date: string;
  expiry_date: string | null;
  fifo_rank: number;
}

/**
 * Get the cost calculation method for a product
 */
export function getProductCostPolicy(productId: number): 'FIFO' | 'AVERAGE' | 'LIFO' {
  const db = getDatabase();
  const policy = db.prepare(`
    SELECT cost_method FROM product_cost_policy 
    WHERE product_id = ?
  `).get(productId) as CostPolicy | undefined;
  
  return policy?.cost_method || 'AVERAGE';
}

/**
 * Set the cost calculation method for a product
 */
export function setProductCostPolicy(productId: number, method: 'FIFO' | 'AVERAGE' | 'LIFO'): void {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO product_cost_policy (product_id, cost_method, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).run(productId, method);
}

/**
 * Get current stock balance for a product
 */
export function getStockBalance(productId: number): number {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT COALESCE(SUM(quantity_remaining), 0) as total_quantity
    FROM stock_lots 
    WHERE product_id = ?
  `).get(productId) as { total_quantity: number };
  
  return result.total_quantity;
}

/**
 * Get FIFO lots for a product, ordered by received date
 */
export function getFIFOLots(productId: number, requiredQuantity: number): FIFOLot[] {
  const db = getDatabase();
  const lots = db.prepare(`
    SELECT 
      sl.id as lot_id,
      sl.lot_number,
      sl.quantity_remaining as quantity_available,
      sl.unit_cost,
      sl.received_date,
      sl.expiry_date,
      ROW_NUMBER() OVER (ORDER BY sl.received_date ASC, sl.id ASC) as fifo_rank
    FROM stock_lots sl
    WHERE sl.product_id = ? AND sl.quantity_remaining > 0
    ORDER BY sl.received_date ASC, sl.id ASC
  `).all(productId) as FIFOLot[];
  
  // Select lots to fulfill the required quantity
  const selectedLots: FIFOLot[] = [];
  let remainingQuantity = requiredQuantity;
  
  for (const lot of lots) {
    if (remainingQuantity <= 0) break;
    
    const quantityToTake = Math.min(lot.quantity_available, remainingQuantity);
    selectedLots.push({
      ...lot,
      quantity_available: quantityToTake
    });
    
    remainingQuantity -= quantityToTake;
  }
  
  return selectedLots;
}

/**
 * Get average cost for a product
 */
export function getAverageCost(productId: number): number {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT 
      COALESCE(SUM(quantity_remaining * unit_cost) / NULLIF(SUM(quantity_remaining), 0), 0) as average_cost
    FROM stock_lots 
    WHERE product_id = ? AND quantity_remaining > 0
  `).get(productId) as { average_cost: number };
  
  return Math.round(result.average_cost);
}

/**
 * Add stock to the ledger (for GRN receipts)
 */
export function addStockToLedger(
  productId: number,
  quantity: number,
  unitCost: number,
  lotNumber: string | null = null,
  expiryDate: string | null = null,
  supplierId: number | null = null,
  grnId: number | null = null,
  createdBy: number | null = null
): number {
  const db = getDatabase();
  
  return db.transaction(() => {
    // Create or update stock lot
    const lotId = db.prepare(`
      INSERT INTO stock_lots (
        product_id, lot_number, quantity_received, quantity_remaining,
        unit_cost, expiry_date, supplier_id, grn_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId, lotNumber, quantity, quantity,
      unitCost, expiryDate, supplierId, grnId
    ).lastInsertRowid as number;
    
    // Record stock movement
    const movementId = db.prepare(`
      INSERT INTO stock_movements (
        product_id, movement_type, reference_id, reference_type,
        lot_id, quantity, unit_cost, total_cost, balance_after, created_by
      ) VALUES (?, 'purchase', ?, 'grn', ?, ?, ?, ?, ?, ?)
    `).run(
      productId, grnId, lotId, quantity, unitCost, quantity * unitCost,
      getStockBalance(productId) + quantity, createdBy
    ).lastInsertRowid as number;
    
    return lotId;
  })();
}

/**
 * Remove stock from the ledger (for sales)
 */
export function removeStockFromLedger(
  productId: number,
  quantity: number,
  referenceId: number,
  referenceType: string = 'sale',
  createdBy: number | null = null
): { lots: FIFOLot[], totalCost: number } {
  const db = getDatabase();
  
  return db.transaction(() => {
    const costMethod = getProductCostPolicy(productId);
    let lots: FIFOLot[] = [];
    let totalCost = 0;
    
    if (costMethod === 'FIFO') {
      // Use FIFO method
      lots = getFIFOLots(productId, quantity);
      
      for (const lot of lots) {
        const actualQuantity = Math.min(lot.quantity_available, quantity);
        const lotCost = actualQuantity * lot.unit_cost;
        totalCost += lotCost;
        
        // Update lot quantity
        db.prepare(`
          UPDATE stock_lots 
          SET quantity_remaining = quantity_remaining - ?
          WHERE id = ?
        `).run(actualQuantity, lot.lot_id);
        
        // Record movement
        db.prepare(`
          INSERT INTO stock_movements (
            product_id, movement_type, reference_id, reference_type,
            lot_id, quantity, unit_cost, total_cost, balance_after, created_by
          ) VALUES (?, 'sale', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          productId, referenceId, referenceType, lot.lot_id,
          -actualQuantity, lot.unit_cost, -lotCost,
          getStockBalance(productId) - actualQuantity, createdBy
        );
        
        quantity -= actualQuantity;
        if (quantity <= 0) break;
      }
    } else {
      // Use Average Cost method
      const averageCost = getAverageCost(productId);
      const totalCostCents = quantity * averageCost;
      totalCost = totalCostCents;
      
      // Record movement without specific lot
      db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, reference_id, reference_type,
          quantity, unit_cost, total_cost, balance_after, created_by
        ) VALUES (?, 'sale', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        productId, referenceId, referenceType,
        -quantity, averageCost, -totalCostCents,
        getStockBalance(productId) - quantity, createdBy
      );
      
      // Update all lots proportionally
      const lotsToUpdate = db.prepare(`
        SELECT id, quantity_remaining FROM stock_lots 
        WHERE product_id = ? AND quantity_remaining > 0
      `).all(productId) as { id: number, quantity_remaining: number }[];
      
      const totalRemaining = lotsToUpdate.reduce((sum, lot) => sum + lot.quantity_remaining, 0);
      
      for (const lot of lotsToUpdate) {
        const proportion = lot.quantity_remaining / totalRemaining;
        const quantityToRemove = Math.min(Math.round(quantity * proportion), lot.quantity_remaining);
        
        if (quantityToRemove > 0) {
          db.prepare(`
            UPDATE stock_lots 
            SET quantity_remaining = quantity_remaining - ?
            WHERE id = ?
          `).run(quantityToRemove, lot.id);
        }
      }
    }
    
    return { lots, totalCost };
  })();
}

/**
 * Add stock back to the ledger (for returns)
 */
export function addStockBackToLedger(
  productId: number,
  quantity: number,
  referenceId: number,
  referenceType: string = 'return',
  createdBy: number | null = null
): void {
  const db = getDatabase();
  
  db.transaction(() => {
    const averageCost = getAverageCost(productId);
    const totalCost = quantity * averageCost;
    
    // Create a new lot for the return
    const lotId = db.prepare(`
      INSERT INTO stock_lots (
        product_id, lot_number, quantity_received, quantity_remaining,
        unit_cost, received_date
      ) VALUES (?, 'RET-' || ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      productId, referenceId, quantity, quantity, averageCost
    ).lastInsertRowid as number;
    
    // Record movement
    db.prepare(`
      INSERT INTO stock_movements (
        product_id, movement_type, reference_id, reference_type,
        lot_id, quantity, unit_cost, total_cost, balance_after, created_by
      ) VALUES (?, 'return', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId, referenceId, referenceType, lotId,
      quantity, averageCost, totalCost,
      getStockBalance(productId) + quantity, createdBy
    );
  })();
}

/**
 * Get stock movement history for a product
 */
export function getStockMovementHistory(
  productId: number,
  limit: number = 50,
  offset: number = 0
): StockMovement[] {
  const db = getDatabase();
  
  return db.prepare(`
    SELECT 
      sm.*,
      sl.lot_number,
      u.name as created_by_name
    FROM stock_movements sm
    LEFT JOIN stock_lots sl ON sm.lot_id = sl.id
    LEFT JOIN users u ON sm.created_by = u.id
    WHERE sm.product_id = ?
    ORDER BY sm.created_at DESC
    LIMIT ? OFFSET ?
  `).all(productId, limit, offset) as StockMovement[];
}

/**
 * Get stock ledger summary for a product
 */
export function getStockLedgerSummary(productId: number): {
  totalQuantity: number;
  averageCost: number;
  totalValue: number;
  lotCount: number;
  costMethod: string;
} {
  const db = getDatabase();
  
  const summary = db.prepare(`
    SELECT 
      COALESCE(SUM(sl.quantity_remaining), 0) as total_quantity,
      COALESCE(SUM(sl.quantity_remaining * sl.unit_cost), 0) as total_value,
      COUNT(DISTINCT sl.id) as lot_count
    FROM stock_lots sl
    WHERE sl.product_id = ?
  `).get(productId) as { total_quantity: number, total_value: number, lot_count: number };
  
  const averageCost = summary.total_quantity > 0 
    ? Math.round(summary.total_value / summary.total_quantity)
    : 0;
  
  const costMethod = getProductCostPolicy(productId);
  
  return {
    totalQuantity: summary.total_quantity,
    averageCost,
    totalValue: summary.total_value,
    lotCount: summary.lot_count,
    costMethod
  };
}

/**
 * Validate stock availability for a sale
 */
export function validateStockAvailability(productId: number, requiredQuantity: number): {
  available: boolean;
  availableQuantity: number;
  shortage: number;
} {
  const availableQuantity = getStockBalance(productId);
  const shortage = Math.max(0, requiredQuantity - availableQuantity);
  
  return {
    available: availableQuantity >= requiredQuantity,
    availableQuantity,
    shortage
  };
}
