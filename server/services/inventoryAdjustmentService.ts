/**
 * Inventory Adjustment Service
 * Handles inventory adjustments with proper stock movement tracking
 */

import { getDatabase } from '../db/database';
import { createLogger } from '../utils/logger';
import { getCurrentUTC } from '../utils/dateUtils';

const logger = createLogger('inventoryAdjustmentService');

export interface InventoryAdjustment {
  id?: number;
  product_id: number;
  delta_qty: number;
  reason: string;
  notes?: string;
  created_by: number;
  created_at?: string;
}

export interface AdjustmentResult {
  adjustment_id: number;
  product_id: number;
  delta_qty: number;
  new_quantity: number;
  reason: string;
}

export interface AdjustmentWithProduct extends InventoryAdjustment {
  product_name?: string;
  product_sku?: string;
  current_quantity?: number;
  new_quantity?: number;
}

export class InventoryAdjustmentService {
  /**
   * Create inventory adjustment and update stock
   */
  static async createAdjustment(adjustment: InventoryAdjustment): Promise<AdjustmentResult> {
    const db = getDatabase();
    
    // Start transaction
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Validate product exists
      const product = db.prepare(`
        SELECT id, name_en, sku FROM products WHERE id = ?
      `).get(adjustment.product_id);
      
      if (!product) {
        throw new Error(`Product with ID ${adjustment.product_id} not found`);
      }
      
      // Get current stock
      const currentStock = db.prepare(`
        SELECT current_quantity, total_value, average_cost 
        FROM product_stock WHERE product_id = ?
      `).get(adjustment.product_id) || {
        current_quantity: 0,
        total_value: 0,
        average_cost: 0
      };
      
      // Calculate new quantity
      const newQuantity = (currentStock as any).current_quantity + adjustment.delta_qty;
      
      if (newQuantity < 0) {
        throw new Error(`Adjustment would result in negative stock. Current: ${(currentStock as any).current_quantity}, Adjustment: ${adjustment.delta_qty}`);
      }
      
      // Insert adjustment record
      const insertAdjustment = db.prepare(`
        INSERT INTO inventory_adjustments (
          product_id, delta_qty, reason, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const adjustmentResult = insertAdjustment.run(
        adjustment.product_id,
        adjustment.delta_qty,
        adjustment.reason,
        adjustment.notes || null,
        adjustment.created_by,
        getCurrentUTC()
      );
      
      const adjustmentId = adjustmentResult.lastInsertRowid;
      
      // Create stock movement
      const insertStockMovement = db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, reference_id, reference_type,
          quantity, unit_cost, total_cost, balance_after, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // For adjustments, we don't change the cost basis, just quantity
      const unitCost = (currentStock as any).average_cost || 0;
      const totalCost = adjustment.delta_qty * unitCost;
      
      insertStockMovement.run(
        adjustment.product_id,
        'adjustment',
        adjustmentId,
        'adjustment',
        adjustment.delta_qty,
        unitCost,
        totalCost,
        newQuantity,
        `Inventory adjustment: ${adjustment.reason}`,
        adjustment.created_by,
        getCurrentUTC()
      );
      
      // Update product stock
      const updateProductStock = db.prepare(`
        INSERT OR REPLACE INTO product_stock (
          product_id, current_quantity, available_quantity, total_value, average_cost,
          last_movement_date, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Calculate new total value (only if we have a cost basis)
      const newTotalValue = (currentStock as any).total_value + totalCost;
      const newAverageCost = newQuantity > 0 ? newTotalValue / newQuantity : (currentStock as any).average_cost;
      
      updateProductStock.run(
        adjustment.product_id,
        newQuantity,
        newQuantity, // available = current for now
        newTotalValue,
        newAverageCost,
        getCurrentUTC(),
        getCurrentUTC()
      );
      
      // Commit transaction
      db.exec('COMMIT');
      
      logger.info({
        adjustmentId,
        productId: adjustment.product_id,
        deltaQty: adjustment.delta_qty,
        newQuantity,
        reason: adjustment.reason,
        createdBy: adjustment.created_by
      }, 'Inventory adjustment created successfully');
      
      return {
        adjustment_id: adjustmentId,
        product_id: adjustment.product_id,
        delta_qty: adjustment.delta_qty,
        new_quantity: newQuantity,
        reason: adjustment.reason
      };
      
    } catch (error) {
      // Rollback transaction on error
      db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get adjustments with product details
   */
  static async getAdjustments(page: number = 1, pageSize: number = 20, productId?: number) {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    let params: any[] = [];
    
    if (productId) {
      whereClause = 'WHERE ia.product_id = ?';
      params = [productId];
    }
    
    // Get adjustments with product details
    const adjustments = db.prepare(`
      SELECT 
        ia.*,
        p.name_en as product_name,
        p.sku as product_sku,
        u.username as created_by_username,
        u.name as created_by_name,
        ps.current_quantity
      FROM inventory_adjustments ia
      LEFT JOIN products p ON ia.product_id = p.id
      LEFT JOIN users u ON ia.created_by = u.id
      LEFT JOIN product_stock ps ON ia.product_id = ps.product_id
      ${whereClause}
      ORDER BY ia.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);
    
    // Get total count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total FROM inventory_adjustments ia
      ${whereClause}
    `).get(...params);
    
    const total = (totalResult as any).total;
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      adjustments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    };
  }

  /**
   * Get adjustment by ID
   */
  static async getAdjustmentById(adjustmentId: number): Promise<AdjustmentWithProduct | null> {
    const db = getDatabase();
    
    const adjustment = db.prepare(`
      SELECT 
        ia.*,
        p.name_en as product_name,
        p.sku as product_sku,
        u.username as created_by_username,
        u.name as created_by_name,
        ps.current_quantity
      FROM inventory_adjustments ia
      LEFT JOIN products p ON ia.product_id = p.id
      LEFT JOIN users u ON ia.created_by = u.id
      LEFT JOIN product_stock ps ON ia.product_id = ps.product_id
      WHERE ia.id = ?
    `).get(adjustmentId);
    
    return adjustment || null;
  }

  /**
   * Get adjustment history for a product
   */
  static async getProductAdjustmentHistory(productId: number, limit: number = 50) {
    const db = getDatabase();
    
    const adjustments = db.prepare(`
      SELECT 
        ia.*,
        u.username as created_by_username,
        u.name as created_by_name
      FROM inventory_adjustments ia
      LEFT JOIN users u ON ia.created_by = u.id
      WHERE ia.product_id = ?
      ORDER BY ia.created_at DESC
      LIMIT ?
    `).all(productId, limit);
    
    return adjustments;
  }

  /**
   * Get adjustment statistics
   */
  static async getAdjustmentStats(days: number = 30) {
    const db = getDatabase();
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_adjustments,
        COUNT(DISTINCT product_id) as products_adjusted,
        SUM(CASE WHEN delta_qty > 0 THEN delta_qty ELSE 0 END) as total_increases,
        SUM(CASE WHEN delta_qty < 0 THEN ABS(delta_qty) ELSE 0 END) as total_decreases,
        COUNT(DISTINCT created_by) as users_made_adjustments
      FROM inventory_adjustments
      WHERE created_at >= datetime('now', '-${days} days')
    `).get();
    
    return stats;
  }

  /**
   * Validate adjustment reason
   */
  static validateReason(reason: string): { valid: boolean; error?: string } {
    const validReasons = [
      'stock_take',
      'damage',
      'theft',
      'expired',
      'found',
      'correction',
      'transfer',
      'other'
    ];
    
    if (!reason || reason.trim().length === 0) {
      return { valid: false, error: 'Reason is required' };
    }
    
    if (reason.length > 200) {
      return { valid: false, error: 'Reason must be 200 characters or less' };
    }
    
    return { valid: true };
  }
}
