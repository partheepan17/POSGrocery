/**
 * Receipt Number Service - Unique, Per-Day, Per-Store
 * Generates robust receipt numbers with proper sequencing
 */

import { getDatabase } from '../db';
import { env } from '../config/env';

export interface ReceiptSequence {
  storeId: string;
  businessDate: string;
  last: number;
}

export interface ReceiptNumberResult {
  receiptNo: string;
  sequence: number;
  storeId: string;
  businessDate: string;
}

/**
 * Get or create receipt sequence for a store and date
 */
async function getReceiptSequence(storeId: string, businessDate: string): Promise<ReceiptSequence> {
  const db = getDatabase();
  
  try {
    // Use BEGIN IMMEDIATE to prevent concurrent access issues
    db.exec('BEGIN IMMEDIATE');
    
    // Try to get existing sequence
    let sequence = db.prepare(`
      SELECT store_id, business_date, last 
      FROM receipt_sequence 
      WHERE store_id = ? AND business_date = ?
    `).get(storeId, businessDate) as ReceiptSequence | undefined;
    
    if (!sequence) {
      // Create new sequence for this store/date
      db.prepare(`
        INSERT INTO receipt_sequence (store_id, business_date, last)
        VALUES (?, ?, 0)
      `).run(storeId, businessDate);
      
      sequence = {
        storeId,
        businessDate,
        last: 0
      };
    }
    
    db.exec('COMMIT');
    return sequence;
    
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Increment and get next receipt number
 */
async function incrementReceiptSequence(storeId: string, businessDate: string): Promise<number> {
  const db = getDatabase();
  
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      db.exec('BEGIN IMMEDIATE');
      
      // Get current sequence
      const current = db.prepare(`
        SELECT last FROM receipt_sequence 
        WHERE store_id = ? AND business_date = ?
      `).get(storeId, businessDate) as { last: number } | undefined;
      
      if (!current) {
        throw new Error(`Receipt sequence not found for store ${storeId}, date ${businessDate}`);
      }
      
      // Increment sequence
      const nextSequence = current.last + 1;
      
      db.prepare(`
        UPDATE receipt_sequence 
        SET last = ? 
        WHERE store_id = ? AND business_date = ?
      `).run(nextSequence, storeId, businessDate);
      
      db.exec('COMMIT');
      return nextSequence;
      
    } catch (error: any) {
      db.exec('ROLLBACK');
      
      if (error.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
        // Retry with random backoff
        const backoffMs = 5 + Math.random() * 20; // 5-25ms
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        retryCount++;
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Failed to increment receipt sequence after maximum retries');
}

/**
 * Generate receipt number
 */
export async function generateReceiptNumber(storeId?: string): Promise<ReceiptNumberResult> {
  const store = storeId || env.RECEIPT_PREFIX || 'S1';
  const businessDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  try {
    // Ensure sequence exists
    await getReceiptSequence(store, businessDate);
    
    // Get next sequence number
    const sequence = await incrementReceiptSequence(store, businessDate);
    
    // Format: {STORE}-{YYYYMMDD}-{6-digit seq}
    const receiptNo = `${store}-${businessDate}-${sequence.toString().padStart(6, '0')}`;
    
    return {
      receiptNo,
      sequence,
      storeId: store,
      businessDate
    };
    
  } catch (error) {
    console.error('Failed to generate receipt number:', error);
    throw error;
  }
}

/**
 * Generate return receipt number
 */
export async function generateReturnReceiptNumber(storeId?: string): Promise<ReceiptNumberResult> {
  const result = await generateReceiptNumber(storeId);
  return {
    ...result,
    receiptNo: `R-${result.receiptNo}`
  };
}

/**
 * Validate receipt number format
 */
export function validateReceiptNumber(receiptNo: string): boolean {
  // Format: {STORE}-{YYYYMMDD}-{6-digit seq} or R-{STORE}-{YYYYMMDD}-{6-digit seq}
  const pattern = /^(R-)?[A-Z0-9]+-\d{8}-\d{6}$/;
  return pattern.test(receiptNo);
}

/**
 * Parse receipt number components
 */
export function parseReceiptNumber(receiptNo: string): {
  isReturn: boolean;
  storeId: string;
  businessDate: string;
  sequence: number;
} | null {
  if (!validateReceiptNumber(receiptNo)) {
    return null;
  }
  
  const isReturn = receiptNo.startsWith('R-');
  const cleanReceiptNo = isReturn ? receiptNo.substring(2) : receiptNo;
  
  const parts = cleanReceiptNo.split('-');
  if (parts.length !== 3) {
    return null;
  }
  
  const [storeId, businessDate, sequenceStr] = parts;
  const sequence = parseInt(sequenceStr, 10);
  
  if (isNaN(sequence)) {
    return null;
  }
  
  return {
    isReturn,
    storeId,
    businessDate,
    sequence
  };
}

/**
 * Get receipt statistics for a store/date
 */
export async function getReceiptStats(storeId?: string, businessDate?: string): Promise<{
  storeId: string;
  businessDate: string;
  totalReceipts: number;
  lastSequence: number;
  nextSequence: number;
}> {
  const db = getDatabase();
  const store = storeId || env.RECEIPT_PREFIX || 'S1';
  const date = businessDate || new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  try {
    const sequence = db.prepare(`
      SELECT last FROM receipt_sequence 
      WHERE store_id = ? AND business_date = ?
    `).get(store, date) as { last: number } | undefined;
    
    const lastSequence = sequence?.last || 0;
    
    // Count actual receipts issued
    const receiptCount = db.prepare(`
      SELECT COUNT(*) as count FROM invoices 
      WHERE receipt_no LIKE ?
    `).get(`${store}-${date}-%`) as { count: number };
    
    return {
      storeId: store,
      businessDate: date,
      totalReceipts: receiptCount.count,
      lastSequence,
      nextSequence: lastSequence + 1
    };
    
  } catch (error) {
    console.error('Failed to get receipt stats:', error);
    throw error;
  }
}

/**
 * Reset receipt sequence for a new day
 */
export async function resetReceiptSequence(storeId: string, businessDate: string): Promise<void> {
  const db = getDatabase();
  
  try {
    db.prepare(`
      DELETE FROM receipt_sequence 
      WHERE store_id = ? AND business_date = ?
    `).run(storeId, businessDate);
    
    console.log(`Reset receipt sequence for store ${storeId}, date ${businessDate}`);
    
  } catch (error) {
    console.error('Failed to reset receipt sequence:', error);
    throw error;
  }
}