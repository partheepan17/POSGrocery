/**
 * Returns Service
 * Handles return processing with proper cost tracking from original sales
 */

import { getDatabase } from '../db/database';
import { createLogger } from '../utils/logger';

const logger = createLogger('returnsService');

export interface ReturnLineItem {
  sale_line_id: number;
  product_id: number;
  quantity: number;
  reason: string;
}

export interface ReturnData {
  original_receipt_no: string;
  customer_id?: number;
  notes?: string;
  lines: ReturnLineItem[];
}

export interface ReturnResult {
  return_id: number;
  return_receipt_no: string;
  total_value: number;
  lines_processed: number;
}

export class ReturnsService {
  /**
   * Get original sale data with unit costs from invoice_lines
   */
  static async getOriginalSaleData(receiptNumber: string) {
    const db = getDatabase();
    
    // Get sale with lines including original unit costs
    const sale = db.prepare(`
      SELECT 
        i.id, i.receipt_number, i.sale_date, i.total_amount,
        c.customer_name, u.username as cashier_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.cashier_id = u.id
      WHERE i.receipt_number = ?
    `).get(receiptNumber);
    
    if (!sale) {
      throw new Error('Sale not found');
    }
    
    // Get sale lines with original unit costs
    const lines = db.prepare(`
      SELECT 
        il.id, il.product_id, il.quantity, il.unit_price, il.total_amount,
        il.unit_cost_cents, p.name_en as product_name, p.sku
      FROM invoice_lines il
      LEFT JOIN products p ON il.product_id = p.id
      WHERE il.invoice_id = ?
      ORDER BY il.id
    `).all((sale as any).id);
    
    // Convert unit_cost_cents to unit_cost
    const processedLines = lines.map((line: any) => ({
      ...line,
      unit_cost: line.unit_cost_cents ? line.unit_cost_cents / 100 : 0
    }));
    
    return {
      ...sale,
      lines: processedLines
    };
  }

  /**
   * Process return with original unit costs and create return lots
   */
  static async processReturn(data: ReturnData, cashierId: number): Promise<ReturnResult> {
    const db = getDatabase();
    
    // Start transaction
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Generate return receipt number
      const returnReceiptNumber = this.generateReturnReceiptNumber();
      
      // Get original sale data to retrieve unit costs
      const originalSale = await this.getOriginalSaleData(data.original_receipt_no);
      
      // Calculate total return value using original unit costs
      const totalValue = data.lines.reduce((sum, line) => {
        const originalLine = originalSale.lines.find((l: any) => l.id === line.sale_line_id);
        if (!originalLine) {
          throw new Error(`Original sale line not found for line ID: ${line.sale_line_id}`);
        }
        const lineTotal = line.quantity * originalLine.unit_cost * 100; // Convert to cents
        return sum + lineTotal;
      }, 0);
      
      // Create return header
      const returnHeader = db.prepare(`
        INSERT INTO returns (
          return_receipt_no, original_receipt_no, customer_id, cashier_id,
          total_value, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const returnResult = returnHeader.run(
        returnReceiptNumber,
        data.original_receipt_no,
        data.customer_id || null,
        cashierId,
        totalValue,
        data.notes || null
      );
      
      const returnId = returnResult.lastInsertRowid;
      logger.info({ returnId, returnReceiptNumber }, 'Return header created');
      
      // Create return lines and stock movements with original costs
      const insertReturnLine = db.prepare(`
        INSERT INTO return_lines (
          return_id, product_id, quantity, reason, condition, created_at
        ) VALUES (?, ?, ?, ?, 'good', datetime('now'))
      `);
      
      const insertStockMovement = db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, reference_id, reference_type,
          quantity, unit_cost, total_cost, balance_after, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const insertStockLot = db.prepare(`
        INSERT INTO stock_lots (
          product_id, lot_number, quantity_received, quantity_remaining,
          unit_cost, received_date, source, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), 'return', datetime('now'))
      `);
      
      const updateProductStock = db.prepare(`
        INSERT OR REPLACE INTO product_stock (
          product_id, current_quantity, available_quantity, total_value, average_cost,
          last_movement_date, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const getCurrentStock = db.prepare(`
        SELECT current_quantity, total_value, average_cost 
        FROM product_stock WHERE product_id = ?
      `);
      
      for (const line of data.lines) {
        // Find original line data
        const originalLine = originalSale.lines.find((l: any) => l.id === line.sale_line_id);
        if (!originalLine) {
          throw new Error(`Original sale line not found for line ID: ${line.sale_line_id}`);
        }
        
        // Insert return line
        insertReturnLine.run(
          returnId,
          line.product_id,
          line.quantity,
          line.reason
        );
        
        // Get current stock for this product
        const currentStock = getCurrentStock.get(line.product_id) || {
          current_quantity: 0,
          total_value: 0,
          average_cost: 0
        };
        
        // Calculate new stock levels (add back returned quantity)
        const newQuantity = (currentStock as any).current_quantity + line.quantity;
        const originalUnitCostCents = Math.round(originalLine.unit_cost * 100);
        const lineTotalCost = line.quantity * originalUnitCostCents;
        const newTotalValue = (currentStock as any).total_value + lineTotalCost;
        const newAverageCost = newQuantity > 0 ? newTotalValue / newQuantity : 0;
        
        // Create return lot with original unit cost
        const lotResult = insertStockLot.run(
          line.product_id,
          `RET-${returnReceiptNumber}-${line.product_id}`, // Generate lot number
          line.quantity,
          line.quantity,
          originalUnitCostCents
        );
        
        const lotId = lotResult.lastInsertRowid;
        
        // Insert stock movement (positive quantity for return) with lot reference
        insertStockMovement.run(
          line.product_id,
          'return',
          returnId,
          'return',
          line.quantity,
          originalUnitCostCents,
          lineTotalCost,
          newQuantity,
          `Return ${returnReceiptNumber} - Original cost preserved`,
          cashierId
        );
        
        // Update product stock
        updateProductStock.run(
          line.product_id,
          newQuantity,
          newQuantity, // available = current for now
          newTotalValue,
          newAverageCost
        );
        
        logger.info({
          productId: line.product_id,
          quantity: line.quantity,
          originalUnitCost: originalLine.unit_cost,
          newQuantity,
          newAverageCost,
          lotId
        }, 'Return lot created with original cost');
      }
      
      // Commit transaction
      db.exec('COMMIT');
      
      logger.info({ 
        returnId, 
        returnReceiptNumber, 
        totalValue: totalValue / 100,
        lineCount: data.lines.length 
      }, 'Return processed successfully with original costs');
      
      return {
        return_id: returnId,
        return_receipt_no: returnReceiptNumber,
        total_value: totalValue / 100,
        lines_processed: data.lines.length
      };
      
    } catch (error) {
      // Rollback transaction on error
      db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Generate unique return receipt number
   */
  private static generateReturnReceiptNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RET${year}${month}${day}${random}`;
  }

  /**
   * Get return details with lot information
   */
  static async getReturnDetails(returnId: number) {
    const db = getDatabase();
    
    // Get return header
    const returnData = db.prepare(`
      SELECT 
        r.*, c.customer_name, u.username as cashier_name
      FROM returns r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON r.cashier_id = u.id
      WHERE r.id = ?
    `).get(returnId);
    
    if (!returnData) {
      throw new Error('Return not found');
    }
    
    // Get return lines with lot information
    const lines = db.prepare(`
      SELECT 
        rl.*, p.name_en as product_name, p.sku,
        sl.id as lot_id, sl.lot_number, sl.unit_cost as lot_unit_cost, sl.source
      FROM return_lines rl
      LEFT JOIN products p ON rl.product_id = p.id
      LEFT JOIN stock_lots sl ON sl.product_id = rl.product_id 
        AND sl.source = 'return' 
        AND sl.lot_number LIKE 'RET-' || r.return_receipt_no || '-%'
      WHERE rl.return_id = ?
      ORDER BY rl.id
    `).all(returnId);
    
    return {
      ...returnData,
      lines
    };
  }
}










