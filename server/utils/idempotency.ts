/**
 * Idempotency Service - Prevent Duplicate Sales
 * Handles idempotency keys and duplicate sale prevention
 */

import { getDatabase } from '../db';
import { createHash } from 'crypto';

export interface IdempotencyRequest {
  idempotencyKey: string;
  customerId?: number;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
  payments: Array<{
    method: string;
    amount: number;
  }>;
}

export interface IdempotencyResult {
  isDuplicate: boolean;
  originalSaleId?: number;
  originalReceiptNo?: string;
  expiresAt?: Date;
}

/**
 * Generate a signature for the request items
 */
function generateItemsSignature(items: IdempotencyRequest['items']): string {
  const sortedItems = items
    .map(item => `${item.productId}:${item.quantity}:${item.unitPrice}`)
    .sort()
    .join('|');
  
  return createHash('sha256').update(sortedItems).digest('hex');
}

/**
 * Check if a request is idempotent (duplicate)
 */
export async function checkIdempotency(
  request: IdempotencyRequest,
  totalAmount: number
): Promise<IdempotencyResult> {
  const db = getDatabase();
  
  try {
    // Check if key already exists
    const existing = db.prepare(`
      SELECT 
        si.sale_id,
        si.total_amount,
        si.items_signature,
        si.expires_at,
        i.receipt_no
      FROM sales_idempotency si
      JOIN invoices i ON si.sale_id = i.id
      WHERE si.idempotency_key = ?
    `).get(request.idempotencyKey) as {
      sale_id: number;
      total_amount: number;
      items_signature: string;
      expires_at: string;
      receipt_no: string;
    } | undefined;
    
    if (!existing) {
      return { isDuplicate: false };
    }
    
    // Check if expired
    const expiresAt = new Date(existing.expires_at);
    if (expiresAt < new Date()) {
      // Clean up expired entry
      db.prepare('DELETE FROM sales_idempotency WHERE idempotency_key = ?')
        .run(request.idempotencyKey);
      return { isDuplicate: false };
    }
    
    // Check if request matches (same items, same total)
    const currentSignature = generateItemsSignature(request.items);
    const totalMatches = existing.total_amount === totalAmount;
    const itemsMatch = existing.items_signature === currentSignature;
    
    if (totalMatches && itemsMatch) {
      return {
        isDuplicate: true,
        originalSaleId: existing.sale_id,
        originalReceiptNo: existing.receipt_no,
        expiresAt
      };
    }
    
    // Request doesn't match - this is an error case
    throw new Error(`Idempotency key conflict: key ${request.idempotencyKey} already used with different parameters`);
    
  } catch (error) {
    console.error('Idempotency check failed:', error);
    throw error;
  }
}

/**
 * Store idempotency record
 */
export async function storeIdempotency(
  idempotencyKey: string,
  saleId: number,
  customerId: number | undefined,
  totalAmount: number,
  items: IdempotencyRequest['items']
): Promise<void> {
  const db = getDatabase();
  
  try {
    const itemsSignature = generateItemsSignature(items);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    db.prepare(`
      INSERT INTO sales_idempotency (
        idempotency_key,
        sale_id,
        customer_id,
        total_amount,
        items_signature,
        expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      idempotencyKey,
      saleId,
      customerId,
      totalAmount,
      itemsSignature,
      expiresAt.toISOString()
    );
    
  } catch (error) {
    console.error('Failed to store idempotency record:', error);
    throw error;
  }
}

/**
 * Clean up expired idempotency records
 */
export async function cleanupExpiredIdempotency(): Promise<number> {
  const db = getDatabase();
  
  try {
    const result = db.prepare(`
      DELETE FROM sales_idempotency 
      WHERE expires_at < datetime('now')
    `).run();
    
    return result.changes;
  } catch (error) {
    console.error('Failed to cleanup expired idempotency records:', error);
    return 0;
  }
}

/**
 * Generate a new idempotency key
 */
export function generateIdempotencyKey(): string {
  return `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate idempotency key format
 */
export function validateIdempotencyKey(key: string): boolean {
  // Allow UUIDs, timestamps, or our generated format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const timestampRegex = /^sale_\d+_[a-z0-9]+$/;
  
  return uuidRegex.test(key) || timestampRegex.test(key) || key.length >= 8;
}
