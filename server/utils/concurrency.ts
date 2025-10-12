/**
 * Concurrency Utilities - SQLite Busy/Race-free Writes
 * Handles SQLite concurrency issues and retry logic
 */

import { getDatabase } from '../db';
import { env } from '../config/env';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
}

export interface ConcurrencyConfig {
  busyTimeoutMs: number;
  retryOptions: RetryOptions;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  baseDelayMs: 10,
  maxDelayMs: 50,
  jitterMs: 10
};

/**
 * Get concurrency configuration from environment
 */
export function getConcurrencyConfig(): ConcurrencyConfig {
  return {
    busyTimeoutMs: env.PRAGMA_BUSY_TIMEOUT_MS,
    retryOptions: {
      maxRetries: env.RETRY_MAX_ATTEMPTS,
      baseDelayMs: env.RETRY_BASE_DELAY_MS,
      maxDelayMs: env.RETRY_MAX_DELAY_MS,
      jitterMs: env.RETRY_JITTER_MS
    }
  };
}

/**
 * Initialize database concurrency settings
 */
export function initializeConcurrency(): void {
  const db = getDatabase();
  const config = getConcurrencyConfig();
  
  try {
    // Set busy timeout to handle concurrent access
    db.prepare(`PRAGMA busy_timeout = ${config.busyTimeoutMs}`).run();
    
    // Enable WAL mode for better concurrency
    db.prepare('PRAGMA journal_mode = WAL').run();
    
    // Set synchronous mode for better performance with WAL
    db.prepare('PRAGMA synchronous = NORMAL').run();
    
    // Enable foreign keys
    db.prepare('PRAGMA foreign_keys = ON').run();
    
    console.log(`Database concurrency initialized: busy_timeout=${config.busyTimeoutMs}ms`);
    
  } catch (error) {
    console.error('Failed to initialize database concurrency:', error);
    throw error;
  }
}

/**
 * Calculate retry delay with jitter
 */
function calculateRetryDelay(attempt: number, options: RetryOptions): number {
  const baseDelay = options.baseDelayMs || 10;
  const maxDelay = options.maxDelayMs || 50;
  const jitter = options.jitterMs || 10;
  
  // Exponential backoff with jitter
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitterAmount = Math.random() * jitter;
  
  return delay + jitterAmount;
}

/**
 * Execute a database operation with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => T,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  let lastError: Error | undefined;
  const maxRetries = options.maxRetries || 5;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a retryable error
      if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
        if (attempt < maxRetries - 1) {
          const delay = calculateRetryDelay(attempt, options);
          console.log(`Database busy, retrying in ${delay.toFixed(2)}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // Non-retryable error or max retries reached
      throw error;
    }
  }
  
  throw lastError || new Error('Operation failed after maximum retries');
}

/**
 * Execute a transaction with retry logic
 */
export async function executeTransactionWithRetry<T>(
  transaction: (db: any) => T,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  return executeWithRetry(() => {
    const db = getDatabase();
    
    try {
      db.exec('BEGIN IMMEDIATE');
      const result = transaction(db);
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }, options);
}

/**
 * Execute multiple operations atomically with retry
 */
export async function executeAtomicOperations<T>(
  operations: Array<(db: any) => void>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<void> {
  return executeTransactionWithRetry((db) => {
    operations.forEach(operation => operation(db));
  }, options);
}

/**
 * Load test function for concurrency testing
 */
export async function loadTestConcurrency(
  operationCount: number = 50,
  concurrency: number = 10
): Promise<{
  successCount: number;
  errorCount: number;
  averageTimeMs: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let successCount = 0;
  let errorCount = 0;
  
  // Create operation promises
  const operations = Array.from({ length: operationCount }, (_, i) => 
    executeWithRetry(async () => {
      const db = getDatabase();
      
      // Simulate a small sale operation
      const receiptNo = `LOAD_TEST_${Date.now()}_${i}`;
      
      db.exec('BEGIN IMMEDIATE');
      
      try {
        // Create test invoice
        const invoiceResult = db.prepare(`
          INSERT INTO invoices (receipt_no, customer_id, gross, discount, tax, net, cashier_id, language, price_tier)
          VALUES (?, 1, 1.50, 0, 0.23, 1.73, 1, 'EN', 'Retail')
        `).run(receiptNo);
        
        const invoiceId = invoiceResult.lastInsertRowid;
        
        // Create test invoice line
        db.prepare(`
          INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, line_discount, tax, total)
          VALUES (?, 1, 1, 1.50, 0, 0, 1.50)
        `).run(invoiceId);
        
        db.exec('COMMIT');
        return invoiceId;
        
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    })
  );
  
  // Execute operations with controlled concurrency
  const chunks = [];
  for (let i = 0; i < operations.length; i += concurrency) {
    chunks.push(operations.slice(i, i + concurrency));
  }
  
  for (const chunk of chunks) {
    const results = await Promise.allSettled(chunk);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errorCount++;
        errors.push(`Operation ${index}: ${result.reason.message}`);
      }
    });
  }
  
  const endTime = Date.now();
  const averageTimeMs = (endTime - startTime) / operationCount;
  
  return {
    successCount,
    errorCount,
    averageTimeMs,
    errors
  };
}

/**
 * Check database concurrency health
 */
export function checkConcurrencyHealth(): {
  busyTimeout: number;
  journalMode: string;
  synchronous: number;
  foreignKeys: number;
} {
  const db = getDatabase();
  
  try {
    const busyTimeout = db.prepare('PRAGMA busy_timeout').get() as { busy_timeout: number };
    const journalMode = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    const synchronous = db.prepare('PRAGMA synchronous').get() as { synchronous: number };
    const foreignKeys = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    
    return {
      busyTimeout: busyTimeout.busy_timeout,
      journalMode: journalMode.journal_mode,
      synchronous: synchronous.synchronous,
      foreignKeys: foreignKeys.foreign_keys
    };
    
  } catch (error) {
    console.error('Failed to check concurrency health:', error);
    throw error;
  }
}
