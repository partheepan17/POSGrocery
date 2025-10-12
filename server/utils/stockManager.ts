// Stock Management Utilities
// This module provides functions for managing inventory and stock movements

import { getDatabase } from '../db';
import { createRequestLogger } from './logger';

export interface StockMovement {
  product_id: number;
  movement_type: 'grn' | 'sale' | 'return' | 'adjustment' | 'transfer';
  reference_id?: number;
  reference_type?: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
  created_by?: number;
}

export interface StockBalance {
  product_id: number;
  current_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  total_value: number;
  average_cost: number;
  last_movement_date: string;
}

/**
 * Get current stock balance for a product
 */
export function getStockBalance(productId: number): StockBalance | null {
  const db = getDatabase();
  const stock = db.prepare(`
    SELECT 
      product_id,
      current_quantity,
      reserved_quantity,
      available_quantity,
      total_value,
      average_cost,
      last_movement_date
    FROM product_stock 
    WHERE product_id = ?
  `).get(productId) as StockBalance | undefined;

  return stock || null;
}

/**
 * Get stock balance for multiple products
 */
export function getStockBalances(productIds: number[]): StockBalance[] {
  if (productIds.length === 0) return [];
  
  const db = getDatabase();
  const placeholders = productIds.map(() => '?').join(',');
  
  return db.prepare(`
    SELECT 
      product_id,
      current_quantity,
      reserved_quantity,
      available_quantity,
      total_value,
      average_cost,
      last_movement_date
    FROM product_stock 
    WHERE product_id IN (${placeholders})
  `).all(...productIds) as StockBalance[];
}

/**
 * Record a stock movement
 */
export function recordStockMovement(movement: StockMovement): void {
  const db = getDatabase();
  
  // Validate product exists
  const product = db.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(movement.product_id);
  if (!product) {
    throw new Error(`Product with ID ${movement.product_id} not found or inactive`);
  }

  // Get current stock balance
  const currentStock = getStockBalance(movement.product_id);
  const currentQuantity = currentStock?.current_quantity || 0;
  const currentValue = currentStock?.total_value || 0;

  // Calculate new balance
  const newQuantity = currentQuantity + movement.quantity;
  const newValue = currentValue + (movement.total_cost || 0);
  const newAverageCost = newQuantity > 0 ? newValue / newQuantity : 0;

  // Check for negative stock (except for GRN which always adds stock)
  if (movement.movement_type !== 'grn' && newQuantity < 0) {
    throw new Error(`Insufficient stock: Cannot reduce stock below zero. Current: ${currentQuantity}, Requested: ${Math.abs(movement.quantity)}`);
  }

  // Update or insert stock record
  db.prepare(`
    INSERT OR REPLACE INTO product_stock (
      product_id, current_quantity, available_quantity, 
      total_value, average_cost, last_movement_date, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    movement.product_id,
    newQuantity,
    newQuantity, // For now, available = current (no reservations)
    newValue,
    newAverageCost,
    new Date().toISOString()
  );

  // Record in stock ledger
  db.prepare(`
    INSERT INTO stock_ledger (
      product_id, movement_type, reference_id, reference_type,
      quantity, unit_cost, total_cost, balance_quantity, balance_value,
      batch_number, expiry_date, notes, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    movement.product_id,
    movement.movement_type,
    movement.reference_id || null,
    movement.reference_type || null,
    movement.quantity,
    movement.unit_cost || null,
    movement.total_cost || null,
    newQuantity,
    newValue,
    movement.batch_number || null,
    movement.expiry_date || null,
    movement.notes || null,
    movement.created_by || null
  );
}

/**
 * Process GRN and update stock
 */
export function processGRNStock(grnId: number, lines: Array<{
  product_id: number;
  quantity_received: number;
  unit_cost: number;
  batch_number?: string;
  expiry_date?: string;
}>): void {
  const db = getDatabase();
  
  // Verify GRN exists
  const grn = db.prepare('SELECT id, status FROM grn_headers WHERE id = ?').get(grnId) as { id: number; status: string } | undefined;
  if (!grn) {
    throw new Error(`GRN with ID ${grnId} not found`);
  }

  if (grn.status === 'completed') {
    throw new Error(`GRN ${grnId} has already been processed`);
  }

  // Process each line
  for (const line of lines) {
    recordStockMovement({
      product_id: line.product_id,
      movement_type: 'grn',
      reference_id: grnId,
      reference_type: 'grn',
      quantity: line.quantity_received,
      unit_cost: line.unit_cost,
      total_cost: line.quantity_received * line.unit_cost,
      batch_number: line.batch_number,
      expiry_date: line.expiry_date
    });
  }

  // Update GRN status
  db.prepare('UPDATE grn_headers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('completed', grnId);
}

/**
 * Check if sufficient stock is available
 */
export function checkStockAvailability(productId: number, requiredQuantity: number): boolean {
  const stock = getStockBalance(productId);
  return stock ? stock.available_quantity >= requiredQuantity : false;
}

/**
 * Reserve stock for a sale
 */
export function reserveStock(productId: number, quantity: number): void {
  const db = getDatabase();
  
  const stock = getStockBalance(productId);
  if (!stock) {
    throw new Error(`Product ${productId} not found in stock`);
  }

  if (stock.available_quantity < quantity) {
    throw new Error(`Insufficient stock: Available ${stock.available_quantity}, Required ${quantity}`);
  }

  db.prepare(`
    UPDATE product_stock 
    SET reserved_quantity = reserved_quantity + ?, 
        available_quantity = available_quantity - ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ?
  `).run(quantity, quantity, productId);
}

/**
 * Release reserved stock
 */
export function releaseStock(productId: number, quantity: number): void {
  const db = getDatabase();
  
  db.prepare(`
    UPDATE product_stock 
    SET reserved_quantity = reserved_quantity - ?, 
        available_quantity = available_quantity + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ?
  `).run(quantity, quantity, productId);
}

/**
 * Get stock movement history for a product
 */
export function getStockHistory(productId: number, limit: number = 50): Array<{
  id: number;
  movement_type: string;
  reference_type: string;
  reference_id: number;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  balance_quantity: number;
  balance_value: number;
  batch_number: string;
  expiry_date: string;
  notes: string;
  created_at: string;
}> {
  const db = getDatabase();
  
  return db.prepare(`
    SELECT 
      id, movement_type, reference_type, reference_id,
      quantity, unit_cost, total_cost, balance_quantity, balance_value,
      batch_number, expiry_date, notes, created_at
    FROM stock_ledger 
    WHERE product_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(productId, limit) as any[];
}

/**
 * Get low stock products
 */
export function getLowStockProducts(threshold: number = 10): Array<{
  product_id: number;
  sku: string;
  name_en: string;
  current_quantity: number;
  reorder_level: number;
  category_name: string;
}> {
  const db = getDatabase();
  
  return db.prepare(`
    SELECT 
      ps.product_id,
      p.sku,
      p.name_en,
      ps.current_quantity,
      p.reorder_level,
      c.name as category_name
    FROM product_stock ps
    JOIN products p ON ps.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ps.current_quantity <= ? 
      AND p.is_active = 1
      AND p.reorder_level IS NOT NULL
    ORDER BY ps.current_quantity ASC
  `).all(threshold) as any[];
}
