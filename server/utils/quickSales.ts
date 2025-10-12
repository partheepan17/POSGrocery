// Quick Sales Session Management
import { getDatabase } from '../db';
import { createRequestLogger } from './logger';
import { rbacService, RBACContext } from './rbac';
import { quickSalesAuditLogger } from './quickSalesAudit';
import { generateReceiptNumber } from './receiptNumber';

export interface QuickSalesSession {
  id: number;
  session_date: string;
  opened_by: number;
  opened_at: string;
  closed_by?: number;
  closed_at?: string;
  status: 'open' | 'closed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface QuickSalesLine {
  id: number;
  session_id: number;
  product_id: number;
  sku: string;
  name: string;
  uom: string;
  qty: number;
  unit_price: number;
  auto_discount: number;
  manual_discount: number;
  line_total: number;
  created_at: string;
}

export interface QuickSalesSessionWithLines extends QuickSalesSession {
  lines: QuickSalesLine[];
  total_lines: number;
  total_amount: number;
}

/**
 * Ensures there's an open Quick Sales session for today.
 * If one exists, returns it. If not, creates one atomically.
 * Only one open session per day is allowed.
 */
export function ensureTodayQuickSalesOpen(openedBy: number = 1, requestId?: string): QuickSalesSession {
  const db = getDatabase();
  const logger = requestId ? createRequestLogger({ requestId, get: () => '', ip: '127.0.0.1' } as any) : console;
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  try {
    // Use a transaction to ensure atomicity
    const result = db.transaction(() => {
      // First, try to get existing open session for today
      const existingSession = db.prepare(`
        SELECT * FROM quick_sales_sessions 
        WHERE session_date = ? AND status = 'open'
        LIMIT 1
      `).get(today) as QuickSalesSession | undefined;
      
      if (existingSession) {
        logger.info(`Found existing open Quick Sales session for ${today}`, { sessionId: existingSession.id });
        return existingSession;
      }
      
      // No open session exists, create a new one
      const insertSession = db.prepare(`
        INSERT INTO quick_sales_sessions (session_date, opened_by, status)
        VALUES (?, ?, 'open')
      `);
      
      const insertResult = insertSession.run(today, openedBy);
      const sessionId = insertResult.lastInsertRowid;
      
      // Fetch the created session
      const newSession = db.prepare(`
        SELECT * FROM quick_sales_sessions WHERE id = ?
      `).get(sessionId) as QuickSalesSession;
      
      logger.info(`Created new Quick Sales session for ${today}`, { sessionId: newSession.id });
      return newSession;
    })();
    
    return result;
  } catch (error) {
    logger.error('Failed to ensure Quick Sales session is open', { error, today, openedBy });
    throw error;
  }
}

/**
 * Adds a line to the current day's Quick Sales session
 */
export function addQuickSalesLine(
  productId: number,
  qty: number = 1,
  manualDiscount: number = 0,
  uom?: string,
  requestId?: string,
  context?: RBACContext
): QuickSalesLine {
  const db = getDatabase();
  const logger = requestId ? createRequestLogger({ requestId, get: () => '', ip: '127.0.0.1' } as any) : console;
  
  try {
    // RBAC check - only cashiers and above can add lines
    if (context) {
      if (!rbacService.hasPermission(context.user, 'QUICK_SALE_ADD_LINE')) {
        quickSalesAuditLogger.logUnauthorizedAccess(context, 'QUICK_SALE_ADD_LINE', 'Insufficient permissions');
        throw new Error('FORBIDDEN: Insufficient permissions to add Quick Sales lines');
      }
    }

    // Ensure today's session is open
    const session = ensureTodayQuickSalesOpen(1, requestId);
    
    // Get product details
    const product = db.prepare(`
      SELECT id, sku, name_en, name_si, name_ta, price_retail, price_wholesale, 
             price_credit, price_other, unit, category_id, is_scale_item
      FROM products 
      WHERE id = ? AND is_active = 1
    `).get(productId) as any;
    
    if (!product) {
      throw new Error(`Product with ID ${productId} not found or inactive`);
    }
    
    // Compute pricing using the same logic as the pricing endpoint
    const pricingResult = computePricing({
      product,
      qty,
      uom: uom || 'BASE',
      customerType: 'Retail' // Quick Sales is always retail
    });
    
    // Insert the line with computed pricing
    const insertLine = db.prepare(`
      INSERT INTO quick_sales_lines (
        session_id, product_id, sku, name, uom, qty, unit_price, 
        auto_discount, manual_discount, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertResult = insertLine.run(
      session.id,
      productId,
      product.sku,
      product.name_en, // Use English name as default
      uom || product.unit || 'pcs',
      qty,
      pricingResult.unitPrice,
      pricingResult.autoDiscount,
      manualDiscount,
      pricingResult.lineTotal - manualDiscount
    );
    
    const lineId = insertResult.lastInsertRowid;
    
    // Fetch the created line
    const newLine = db.prepare(`
      SELECT * FROM quick_sales_lines WHERE id = ?
    `).get(lineId) as QuickSalesLine;
    
      logger.info('Added line to Quick Sales session', {
        sessionId: session.id,
        lineId: newLine.id,
        productId,
        qty,
        unitPrice: pricingResult.unitPrice,
        reason: pricingResult.reason
      });

      // Audit log the line addition
      if (context) {
        quickSalesAuditLogger.logLineAdd(
          context,
          session.id,
          productId,
          product.sku,
          product.name_en,
          qty,
          pricingResult.unitPrice,
          newLine.line_total
        );
      }

      return newLine;
  } catch (error) {
    logger.error('Failed to add Quick Sales line', { error, productId, qty });
    throw error;
  }
}

/**
 * Compute pricing for a product with quantity and UOM
 */
function computePricing({
  product,
  qty,
  uom = 'BASE',
  customerType = 'Retail'
}: {
  product: any;
  qty: number;
  uom?: string;
  customerType?: string;
}): {
  unitPrice: number;
  lineTotal: number;
  autoDiscount: number;
  autoDiscountReason?: string;
  reason: string;
} {
  const db = getDatabase();
  
  // For now, use simple pricing without tiers (keeping it simple as requested)
  // In a full implementation, these would be actual database queries
  const tiers: any[] = [];
  const customerSpecial: any = null;
  
  // Compute unit price using the same logic as frontend
  let unitPrice = product.price_retail;
  let reason = 'Base price';
  
  // 1) Customer special overrides everything
  if (customerSpecial?.special_price != null && !isNaN(Number(customerSpecial.special_price))) {
    unitPrice = Number(customerSpecial.special_price);
    reason = `Customer special → ${unitPrice.toFixed(2)}`;
  }
  // 2) Tier-based quantity breaks
  else if (tiers.length > 0) {
    for (const tier of tiers) {
      if (qty >= tier.min_qty) {
        unitPrice = Number(tier.price);
        const label = tier.label || `${tier.min_qty}+`;
        reason = `Tier ${label} → ${unitPrice.toFixed(2)}`;
        break;
      }
    }
  }
  // 3) Customer type pricing
  else if (customerType !== 'Retail') {
    switch (customerType) {
      case 'Wholesale':
        unitPrice = product.price_wholesale || product.price_retail;
        reason = `Wholesale → ${unitPrice.toFixed(2)}`;
        break;
      case 'Credit':
        unitPrice = product.price_credit || product.price_retail;
        reason = `Credit → ${unitPrice.toFixed(2)}`;
        break;
      case 'Other':
        unitPrice = product.price_other || product.price_retail;
        reason = `Other → ${unitPrice.toFixed(2)}`;
        break;
    }
  }
  
  // Apply UOM conversion if not BASE (simplified for now)
  if (uom !== 'BASE') {
    // Simple UOM conversion factors (in a real system, these would come from database)
    const uomFactors: { [key: string]: number } = {
      'kg': 1,
      'grams': 0.001,
      'liters': 1,
      'ml': 0.001,
      'boxes': 1,
      'pcs': 1
    };
    
    const factor = uomFactors[uom] || 1;
    unitPrice = unitPrice * factor;
    reason += ` (UOM ${uom} ×${factor})`;
  }
  
  // Calculate line total
  const lineTotal = unitPrice * qty;
  
  // Calculate auto discount (if any)
  let autoDiscount = 0;
  let autoDiscountReason = null;
  
  // Check for bulk discounts
  if (qty >= 10) {
    autoDiscount = lineTotal * 0.05; // 5% bulk discount
    autoDiscountReason = 'Bulk discount (10+ items)';
  } else if (qty >= 5) {
    autoDiscount = lineTotal * 0.02; // 2% bulk discount
    autoDiscountReason = 'Bulk discount (5+ items)';
  }
  
  return {
    unitPrice: Number(unitPrice.toFixed(2)),
    lineTotal: Number((lineTotal - autoDiscount).toFixed(2)),
    autoDiscount: Number(autoDiscount.toFixed(2)),
    autoDiscountReason: autoDiscountReason || undefined,
    reason
  };
}

/**
 * Gets the current day's Quick Sales session with all lines
 */
export function getTodayQuickSalesSession(requestId?: string): QuickSalesSessionWithLines | null {
  const db = getDatabase();
  const logger = requestId ? createRequestLogger({ requestId, get: () => '', ip: '127.0.0.1' } as any) : console;
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Get the session
    const session = db.prepare(`
      SELECT * FROM quick_sales_sessions 
      WHERE session_date = ? AND status = 'open'
      LIMIT 1
    `).get(today) as QuickSalesSession | undefined;
    
    if (!session) {
      return null;
    }
    
    // Get all lines for this session
    const lines = db.prepare(`
      SELECT * FROM quick_sales_lines 
      WHERE session_id = ? 
      ORDER BY created_at ASC
    `).all(session.id) as QuickSalesLine[];
    
    // Calculate totals
    const totalLines = lines.length;
    const totalAmount = lines.reduce((sum, line) => sum + line.line_total, 0);
    
    return {
      ...session,
      lines,
      total_lines: totalLines,
      total_amount: totalAmount
    };
  } catch (error) {
    logger.error('Failed to get today\'s Quick Sales session', { error, today });
    throw error;
  }
}

/**
 * Gets paginated lines for the current day's Quick Sales session
 */
export function getQuickSalesLines(
  cursor?: string,
  limit: number = 200,
  requestId?: string
): { lines: QuickSalesLine[]; hasMore: boolean; nextCursor?: string } {
  const db = getDatabase();
  const logger = requestId ? createRequestLogger({ requestId, get: () => '', ip: '127.0.0.1' } as any) : console;
  
  try {
    // Get today's session
    const today = new Date().toISOString().split('T')[0];
    const session = db.prepare(`
      SELECT id FROM quick_sales_sessions 
      WHERE session_date = ? AND status = 'open'
      LIMIT 1
    `).get(today) as { id: number } | undefined;
    
    if (!session) {
      return { lines: [], hasMore: false };
    }
    
    // Parse cursor (line ID)
    const cursorId = cursor ? parseInt(cursor) : 0;
    
    // Get lines with pagination
    const lines = db.prepare(`
      SELECT * FROM quick_sales_lines 
      WHERE session_id = ? AND id > ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(session.id, cursorId, limit + 1) as QuickSalesLine[];
    
    const hasMore = lines.length > limit;
    const resultLines = hasMore ? lines.slice(0, limit) : lines;
    const nextCursor = hasMore ? resultLines[resultLines.length - 1].id.toString() : undefined;
    
    logger.info('Retrieved paginated Quick Sales lines', { 
      sessionId: session.id,
      count: resultLines.length,
      hasMore,
      nextCursor 
    });
    
    return { lines: resultLines, hasMore, nextCursor };
  } catch (error) {
    logger.error('Failed to get Quick Sales lines', { error, cursor, limit });
    throw error;
  }
}

/**
 * Removes a line from the current day's Quick Sales session
 */
export function removeQuickSalesLine(
  lineId: number,
  requestId?: string,
  context?: RBACContext,
  managerPin?: string,
  reason?: string
): boolean {
  const db = getDatabase();
  const logger = requestId ? createRequestLogger({ requestId, get: () => '', ip: '127.0.0.1' } as any) : console;
  
  try {
    // RBAC check - only managers and above can delete lines
    if (context) {
      if (!rbacService.hasPermission(context.user, 'QUICK_SALE_DELETE_LINE')) {
        quickSalesAuditLogger.logUnauthorizedAccess(context, 'QUICK_SALE_DELETE_LINE', 'Insufficient permissions');
        throw new Error('FORBIDDEN: Insufficient permissions to delete Quick Sales lines');
      }

      // PIN verification required for line deletion
      if (!managerPin) {
        quickSalesAuditLogger.logPinVerifyFailure(context, 'QUICK_SALE_DELETE_LINE', 'Manager PIN required');
        throw new Error('PIN_REQUIRED: Manager PIN is required to delete lines');
      }

      const pinResult = rbacService.verifyPin(context.user.id, managerPin);
      if (!pinResult.success) {
        quickSalesAuditLogger.logPinVerifyFailure(context, 'QUICK_SALE_DELETE_LINE', pinResult.reason || 'Invalid PIN');
        throw new Error(`PIN_INVALID: ${pinResult.reason}`);
      }

      quickSalesAuditLogger.logPinVerifySuccess(context, 'QUICK_SALE_DELETE_LINE');
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Verify line belongs to today's open session
    const line = db.prepare(`
      SELECT qsl.*, qs.session_date, qs.status
      FROM quick_sales_lines qsl
      JOIN quick_sales_sessions qs ON qsl.session_id = qs.id
      WHERE qsl.id = ? AND qs.session_date = ? AND qs.status = 'open'
    `).get(lineId, today) as QuickSalesLine & { session_date: string; status: string };
    
    if (!line) {
      return false;
    }
    
    // Delete the line
    const deleteResult = db.prepare(`
      DELETE FROM quick_sales_lines WHERE id = ?
    `).run(lineId);
    
    const success = deleteResult.changes > 0;
    
    if (success) {
      logger.info('Removed Quick Sales line', { lineId });
      
      // Audit log the line deletion
      if (context) {
        quickSalesAuditLogger.logLineDelete(
          context,
          line.session_id,
          lineId,
          line.sku,
          line.name,
          line.qty,
          line.line_total,
          reason || 'No reason provided'
        );
      }
    }
    
    return success;
  } catch (error) {
    logger.error('Failed to remove Quick Sales line', { error, lineId });
    throw error;
  }
}

/**
 * Closes the current day's Quick Sales session and creates an invoice
 */
export async function closeTodayQuickSalesSession(
  closedBy: number = 1,
  notes?: string,
  requestId?: string,
  context?: RBACContext,
  managerPin?: string,
  sessionIdToClose?: number
): Promise<{ session: QuickSalesSession; invoiceId: number; receiptNo: string; totals: any }> {
  const db = getDatabase();
  const logger = requestId ? createRequestLogger({ requestId, get: () => '', ip: '127.0.0.1' } as any) : console;
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // RBAC check - only managers and above can close sessions
    if (context) {
      if (!rbacService.hasPermission(context.user, 'QUICK_SALE_CLOSE_SESSION')) {
        quickSalesAuditLogger.logUnauthorizedAccess(context, 'QUICK_SALE_CLOSE_SESSION', 'Insufficient permissions');
        throw new Error('FORBIDDEN: Insufficient permissions to close Quick Sales sessions');
      }

      // PIN verification required for session close
      if (!managerPin) {
        quickSalesAuditLogger.logPinVerifyFailure(context, 'QUICK_SALE_CLOSE_SESSION', 'Manager PIN required');
        throw new Error('PIN_REQUIRED: Manager PIN is required to close sessions');
      }

      const pinResult = rbacService.verifyPin(context.user.id, managerPin);
      if (!pinResult.success) {
        quickSalesAuditLogger.logPinVerifyFailure(context, 'QUICK_SALE_CLOSE_SESSION', pinResult.reason || 'Invalid PIN');
        throw new Error(`PIN_INVALID: ${pinResult.reason}`);
      }

      quickSalesAuditLogger.logPinVerifySuccess(context, 'QUICK_SALE_CLOSE_SESSION');
    }

    // Generate receipt number outside transaction
    const receiptNoResult = await generateReceiptNumber();
    const receiptNo = receiptNoResult.receiptNo;
    
    const result = db.transaction(() => {
      // Get the open session with optimistic locking
      const session = db.prepare(`
        SELECT * FROM quick_sales_sessions 
        WHERE session_date = ? AND status = 'open'
        LIMIT 1
      `).get(today) as QuickSalesSession | undefined;
      
      if (!session) {
        throw new Error(`No open Quick Sales session found for ${today}`);
      }
      
      // Try to mark session as closing (concurrency control)
      const updateResult = db.prepare(`
        UPDATE quick_sales_sessions 
        SET status = 'closing', closed_by = ?, closed_at = CURRENT_TIMESTAMP, notes = ?
        WHERE id = ? AND status = 'open'
      `).run(closedBy, notes || null, session.id);
      
      if (updateResult.changes === 0) {
        throw new Error('CONFLICT: Session is already being closed by another process');
      }
      
      // Get all lines and aggregate by product_id + uom
      const lines = db.prepare(`
        SELECT product_id, uom, 
               SUM(qty) as total_qty,
               AVG(unit_price) as avg_unit_price,
               SUM(line_total) as total_line_amount
        FROM quick_sales_lines 
        WHERE session_id = ? 
        GROUP BY product_id, uom
        ORDER BY MIN(created_at) ASC
      `).all(session.id) as any[];
      
      if (lines.length === 0) {
        // Rollback the status change
        db.prepare(`
          UPDATE quick_sales_sessions
          SET status = 'open', closed_by = NULL, closed_at = NULL
          WHERE id = ?
        `).run(session.id);
        throw new Error('INVALID_INPUT: Cannot close session with no lines');
      }
      
      // Calculate totals
      const gross = lines.reduce((sum, line) => sum + line.total_line_amount, 0);
      const tax = gross * 0.15; // 15% tax
      const net = gross + tax;
      
      // Check if meta column exists
      const tableInfo = db.prepare("PRAGMA table_info(invoices)").all();
      const hasMetaColumn = tableInfo.some((col: any) => col.name === 'meta');
      
      let createInvoice: any;
      let invoiceResult: any;
      
      if (hasMetaColumn) {
        createInvoice = db.prepare(`
          INSERT INTO invoices (receipt_no, customer_id, gross, discount, tax, net, cashier_id, meta)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        invoiceResult = createInvoice.run(
          receiptNo,
          1, // Walk-in customer
          gross,
          0, // No discount at session level
          tax,
          net,
          closedBy,
          JSON.stringify({ type: 'quick-sale' }) // Meta label for reports
        );
      } else {
        createInvoice = db.prepare(`
          INSERT INTO invoices (receipt_no, customer_id, gross, discount, tax, net, cashier_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        invoiceResult = createInvoice.run(
          receiptNo,
          1, // Walk-in customer
          gross,
          0, // No discount at session level
          tax,
          net,
          closedBy
        );
      }
      
      const invoiceId = Number(invoiceResult.lastInsertRowid);
      
      // Create aggregated invoice lines
      const createInvoiceLine = db.prepare(`
        INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const line of lines) {
        createInvoiceLine.run(
          invoiceId,
          line.product_id,
          line.total_qty,
          line.avg_unit_price,
          line.total_line_amount
        );
      }
      
      // Create single cash payment (Quick Sales is always cash-only)
      const createPayment = db.prepare(`
        INSERT INTO invoice_payments (invoice_id, method, amount)
        VALUES (?, 'cash', ?)
      `);

      createPayment.run(invoiceId, net);

      logger.info('Created cash payment for Quick Sales invoice', {
        invoiceId,
        amount: net,
        method: 'cash'
      });

      // Reduce stock for each product
      const updateStock = db.prepare(`
        UPDATE products 
        SET stock_qty = stock_qty - ?
        WHERE id = ? AND stock_qty >= ?
      `);

      const createStockMovement = db.prepare(`
        INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, reference_type, created_by)
        VALUES (?, 'sale', ?, ?, 'invoice', ?)
      `);

      for (const line of lines) {
        // Update stock quantity
        const stockResult = updateStock.run(line.total_qty, line.product_id, line.total_qty);
        
        if (stockResult.changes === 0) {
          logger.warn('Insufficient stock for product', {
            productId: line.product_id,
            requested: line.total_qty,
            available: 'unknown'
          });
        }

        // Record stock movement
        createStockMovement.run(
          line.product_id,
          line.total_qty,
          invoiceId,
          closedBy
        );
      }

      logger.info('Updated stock quantities for Quick Sales invoice', {
        invoiceId,
        lineCount: lines.length
      });
      
      // Mark session as closed and set invoice_id
      const closeSession = db.prepare(`
        UPDATE quick_sales_sessions 
        SET status = 'closed', invoice_id = ?
        WHERE id = ?
      `);
      
      closeSession.run(invoiceId, session.id);
      
      // Get updated session
      const updatedSession = db.prepare(`
        SELECT * FROM quick_sales_sessions WHERE id = ?
      `).get(session.id) as QuickSalesSession;
      
      const totals = {
        gross,
        tax,
        net,
        line_count: lines.length,
        total_qty: lines.reduce((sum, line) => sum + line.total_qty, 0)
      };
      
      logger.info('Closed Quick Sales session and created invoice', { 
        sessionId: session.id, 
        invoiceId, 
        receiptNo,
        lineCount: lines.length,
        totals 
      });

      // Audit log the session close
      if (context) {
        quickSalesAuditLogger.logSessionClose(
          context,
          session.id,
          totals,
          invoiceId
        );
      }
      
      return { 
        session: updatedSession, 
        invoiceId, 
        receiptNo,
        totals 
      };
    })();
    
    return result;
  } catch (error) {
    logger.error('Failed to close Quick Sales session', { error, today });
    throw error;
  }
}

