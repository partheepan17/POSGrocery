import { database } from './database';
import { 
  Return, 
  ReturnLine, 
  SaleWithLines, 
  ReturnValidationResult, 
  ReturnReason
} from '../types';
import { ReceiptPayload } from '../types/receipt';

export class RefundService {
  /**
   * Look up a sale by receipt number or barcode
   */
  async getSaleByReceipt(receiptNo: string): Promise<SaleWithLines | null> {
    try {
      const db = await database;
      
      // First try to find by sale ID (if receiptNo is numeric)
      let saleId: number | null = null;
      if (/^\d+$/.test(receiptNo)) {
        saleId = parseInt(receiptNo);
      }
      
      // Query for sale with lines and product names
      const saleQuery = `
        SELECT 
          s.id, s.datetime, s.cashier_id, s.customer_id, s.price_tier,
          s.gross, s.discount, s.tax, s.net, s.pay_cash, s.pay_card, s.pay_wallet,
          s.language, s.terminal_name
         FROM sales s 
        WHERE s.id = ? OR s.id = ?
        ORDER BY s.id DESC
        LIMIT 1
      `;
      
      const saleResult = await db.query(saleQuery, [saleId, saleId]);
      const sale = saleResult[0];
      if (!sale) {
        return null;
      }
      
      // Get sale lines with product names
      const linesQuery = `
        SELECT 
          sl.id, sl.product_id, sl.qty, sl.unit_price, sl.line_discount, sl.tax, sl.total,
          p.name as product_name, p.name_si as product_name_si, p.name_ta as product_name_ta
        FROM sale_lines sl
        JOIN products p ON sl.product_id = p.id
        WHERE sl.sale_id = ?
        ORDER BY sl.id
      `;
      
      const lines = await db.query(linesQuery, [sale.id]);
      
      return {
        ...sale,
        lines: lines.map(line => ({
          ...line,
          product_name: line.product_name || 'Unknown Product',
          product_name_si: line.product_name_si,
          product_name_ta: line.product_name_ta
        }))
      };
    } catch (error) {
      console.error('Error looking up sale by receipt:', error);
      throw new Error('Failed to lookup sale');
    }
  }

  /**
   * Get return ledger for a sale (sum of previously returned quantities)
   */
  async getSaleReturnLedger(saleId: number): Promise<Array<{ sale_line_id: number; returned_qty: number }>> {
    try {
      const db = await database;
      
      const query = `
           SELECT 
          rl.sale_line_id,
          COALESCE(SUM(rl.qty), 0) as returned_qty
        FROM return_lines rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.sale_id = ?
        GROUP BY rl.sale_line_id
      `;
      
      const result = await db.query(query, [saleId]);
      return result.map(row => ({
        sale_line_id: row.sale_line_id,
        returned_qty: parseFloat(row.returned_qty)
      }));
    } catch (error) {
      console.error('Error getting sale return ledger:', error);
      throw new Error('Failed to get return ledger');
    }
  }

  /**
   * Validate return request
   */
  async validateReturn(input: { 
    sale: SaleWithLines; 
    items: Array<{ sale_line_id: number; qty: number }> 
  }): Promise<ReturnValidationResult> {
    const errors: string[] = [];
    
    try {
      // Get return ledger for this sale
      const ledger = await this.getSaleReturnLedger(input.sale.id);
      const ledgerMap = new Map(ledger.map(item => [item.sale_line_id, item.returned_qty]));
      
      // Validate each item
      for (const item of input.items) {
        const saleLine = input.sale.lines.find(line => line.id === item.sale_line_id);
        if (!saleLine) {
          errors.push(`Sale line ${item.sale_line_id} not found`);
          continue;
        }
        
        const alreadyReturned = ledgerMap.get(item.sale_line_id) || 0;
        const availableToReturn = saleLine.qty - alreadyReturned;
        
        if (item.qty <= 0) {
          errors.push(`Return quantity must be positive for ${saleLine.product_name}`);
        } else if (item.qty > availableToReturn) {
          errors.push(`Cannot return ${item.qty} of ${saleLine.product_name}. Only ${availableToReturn} available (sold: ${saleLine.qty}, already returned: ${alreadyReturned})`);
        }
      }
      
      if (input.items.length === 0) {
        errors.push('No items selected for return');
      }
      
      const totalQty = input.items.reduce((sum, item) => sum + item.qty, 0);
      if (totalQty === 0) {
        errors.push('Total return quantity must be greater than zero');
      }

      return {
        ok: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error validating return:', error);
      return {
        ok: false,
        errors: ['Failed to validate return request']
      };
    }
  }

  /**
   * Create a return transaction
   */
  async createReturn(tx: {
    saleId: number;
    lines: ReturnLine[];
    payments: { cash: number; card: number; wallet: number; store_credit: number };
    reason_summary?: string;
    language: 'EN' | 'SI' | 'TA';
    cashier_id?: number;
    manager_id?: number | null;
    terminal_name?: string;
  }): Promise<{ returnId: number }> {
    const db = await database;
    
    try {
      await db.execute('BEGIN TRANSACTION');
      
      // 1. Insert into returns table
      const returnInsert = `
        INSERT INTO returns (
          sale_id, cashier_id, manager_id, refund_cash, refund_card, 
          refund_wallet, refund_store_credit, reason_summary, language, terminal_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const returnResult = await db.execute(returnInsert, [
        tx.saleId,
        tx.cashier_id,
        tx.manager_id,
        tx.payments.cash,
        tx.payments.card,
        tx.payments.wallet,
        tx.payments.store_credit,
        tx.reason_summary,
        tx.language,
        tx.terminal_name
      ]);
      
      const returnId = returnResult.lastID;
      
      // 2. Insert return lines
      for (const line of tx.lines) {
        const lineInsert = `
          INSERT INTO return_lines (
            return_id, sale_line_id, product_id, qty, unit_price, line_refund, reason_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.execute(lineInsert, [
          returnId,
          line.sale_line_id,
          line.product_id,
          line.qty,
          line.unit_price,
          line.line_refund,
          line.reason_code
        ]);
        
        // 3. Insert inventory movement (type='RETURN', qty +ve back into stock)
        const inventoryInsert = `
          INSERT INTO inventory_movements (product_id, qty, type, reason, note)
          VALUES (?, ?, 'RETURN', ?, ?)
        `;
        
        await db.execute(inventoryInsert, [
          line.product_id,
          line.qty, // Positive quantity to add back to stock
          `Return - ${line.reason_code}`,
          `Return ID: ${returnId}, Sale Line: ${line.sale_line_id}`
        ]);
      }
      
      // 4. Update product stock levels
      for (const line of tx.lines) {
        const updateStock = `
          UPDATE products 
          SET stock = stock + ? 
          WHERE id = ?
        `;
        
        await db.execute(updateStock, [line.qty, line.product_id]);
      }
      
      await db.execute('COMMIT');
      
      return { returnId };
    } catch (error) {
      await db.execute('ROLLBACK');
      console.error('Error creating return:', error);
      throw new Error('Failed to create return transaction');
    }
  }

  /**
   * Format return receipt data for printing
   */
  async formatReturnReceipt(returnId: number): Promise<ReceiptPayload> {
    try {
      const db = await database;
      
      // Get return with sale details
      const returnQuery = `
        SELECT 
          r.*, s.datetime as sale_datetime, s.terminal_name as sale_terminal,
          u1.name as cashier_name, u2.name as manager_name
        FROM returns r
        LEFT JOIN sales s ON r.sale_id = s.id
        LEFT JOIN users u1 ON r.cashier_id = u1.id
        LEFT JOIN users u2 ON r.manager_id = u2.id
        WHERE r.id = ?
      `;
      
      const returnResult = await db.query(returnQuery, [returnId]);
      const returnData = returnResult[0];
      if (!returnData) {
        throw new Error('Return not found');
      }
      
      // Get return lines with product details
      const linesQuery = `
        SELECT 
          rl.*, p.name as product_name, p.name_si as product_name_si, p.name_ta as product_name_ta
        FROM return_lines rl
        JOIN products p ON rl.product_id = p.id
        WHERE rl.return_id = ?
        ORDER BY rl.id
      `;
      
      const lines = await db.query(linesQuery, [returnId]);
      
      // Calculate totals
      const totalRefund = returnData.refund_cash + returnData.refund_card + 
                         returnData.refund_wallet + returnData.refund_store_credit;
      
      // Format receipt data
      const receiptData: ReceiptPayload = {
        type: 'return',
        store: {
          name: 'Store Name', // TODO: Get from settings
          address: 'Store Address', // TODO: Get from settings
          taxId: 'TAX123', // TODO: Get from settings
        },
        terminalName: returnData.terminal_name || 'POS-001',
        invoice: {
          id: `RET-${returnId.toString().padStart(6, '0')}`,
          datetime: new Date(returnData.datetime).toISOString(),
          language: returnData.language,
          priceTier: 'Retail', // TODO: Get from original sale
          isReprint: false, // TODO: Add reprint logic
          items: lines.map(line => ({
            sku: `PROD-${line.product_id}`,
            name_en: line.product_name || 'Unknown Product',
            name_si: line.product_name_si,
            name_ta: line.product_name_ta,
            unit: 'pc', // TODO: Get from product
            qty: line.qty,
            unitPrice: line.unit_price,
            lineDiscount: 0, // Returns typically don't have discounts
            tax: 0, // Returns typically don't have tax
            total: line.line_refund
          })),
          totals: {
            gross: totalRefund,
            discount: 0,
            tax: 0,
            net: totalRefund
          },
          payments: {
            cash: returnData.refund_cash,
            card: returnData.refund_card,
            wallet: returnData.refund_wallet,
            change: 0 // No change for returns
          }
        },
        options: {
          paper: '80mm', // TODO: Get from settings
          showQRCode: false,
          showBarcode: false,
          openCashDrawerOnCash: false,
          roundingMode: 'NEAREST_1', // TODO: Get from settings
          decimalPlacesKg: 2,
          footerText: {
            EN: this.getLocalizedText('THANK_YOU', 'EN'),
            SI: this.getLocalizedText('THANK_YOU', 'SI'),
            TA: this.getLocalizedText('THANK_YOU', 'TA')
          }
        }
      };
      
      return receiptData;
    } catch (error) {
      console.error('Error formatting return receipt:', error);
      throw new Error('Failed to format return receipt');
    }
  }

  /**
   * Get default return reasons
   */
  getDefaultReturnReasons(): ReturnReason[] {
    return ['DAMAGED', 'EXPIRED', 'WRONG_ITEM', 'CUSTOMER_CHANGE', 'OTHER'];
  }

  /**
   * Helper to get localized text
   */
  private getLocalizedText(key: string, language: 'EN' | 'SI' | 'TA'): string {
    const translations: Record<string, Record<string, string>> = {
      RETURN_RECEIPT: {
        EN: 'RETURN RECEIPT',
        SI: 'ආපසු ලබාදීමේ රිසිට්',
        TA: 'திரும்ப பெறுதல் ரசீது'
      },
      THANK_YOU: {
        EN: 'Thank you for your business!',
        SI: 'ඔබේ ව්‍යාපාරයට ස්තූතියි!',
        TA: 'உங்கள் வணிகத்திற்கு நன்றி!'
      }
    };
    
    return translations[key]?.[language] || translations[key]?.['EN'] || key;
  }

  /**
   * Helper to get localized product name
   */
  private getLocalizedProductName(line: any, language: 'EN' | 'SI' | 'TA'): string {
    switch (language) {
      case 'SI':
        return line.product_name_si || line.product_name || 'Unknown Product';
      case 'TA':
        return line.product_name_ta || line.product_name || 'Unknown Product';
      default:
        return line.product_name || 'Unknown Product';
    }
  }
}

// Export singleton instance
export const refundService = new RefundService();