import { Database } from 'better-sqlite3';

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_reference?: string;
  cashier_id: number;
  terminal_id?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLine {
  id: number;
  invoice_id: number;
  product_id: number;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  created_at: string;
}

export interface CreateInvoiceRequest {
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  lines: {
    product_id: number;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    discount_rate?: number;
  }[];
  payment_method: string;
  payment_reference?: string;
  cashier_id: number;
  terminal_id?: string;
  notes?: string;
}

export class InvoiceService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    const transaction = this.db.transaction(() => {
      try {
        // Calculate totals
        let subtotal = 0;
        let totalTax = 0;
        let totalDiscount = 0;

        const lines = request.lines.map(line => {
          const lineTotal = line.quantity * line.unit_price;
          const taxRate = line.tax_rate || 0;
          const discountRate = line.discount_rate || 0;
          
          const taxAmount = lineTotal * (taxRate / 100);
          const discountAmount = lineTotal * (discountRate / 100);
          const finalLineTotal = lineTotal + taxAmount - discountAmount;

          subtotal += lineTotal;
          totalTax += taxAmount;
          totalDiscount += discountAmount;

          return {
            ...line,
            line_total: finalLineTotal,
            tax_amount: taxAmount,
            discount_amount: discountAmount
          };
        });

        const totalAmount = subtotal + totalTax - totalDiscount;

        // Create invoice
        const invoiceResult = this.db.prepare(`
          INSERT INTO invoices (
            customer_id, customer_name, customer_phone, customer_email,
            subtotal, tax_amount, discount_amount, total_amount,
            payment_method, payment_reference, cashier_id, terminal_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          request.customer_id || null,
          request.customer_name || null,
          request.customer_phone || null,
          request.customer_email || null,
          subtotal,
          totalTax,
          totalDiscount,
          totalAmount,
          request.payment_method,
          request.payment_reference || null,
          request.cashier_id,
          request.terminal_id || null,
          request.notes || null
        );

        const invoiceId = invoiceResult.lastInsertRowid as number;

        // Create invoice lines
        for (const line of lines) {
          // Get product details
          const product = this.db.prepare(`
            SELECT name, sku FROM products WHERE id = ?
          `).get(line.product_id) as any;

          if (!product) {
            throw new Error(`Product with ID ${line.product_id} not found`);
          }

          this.db.prepare(`
            INSERT INTO invoice_lines (
              invoice_id, product_id, product_name, product_sku,
              quantity, unit_price, line_total, tax_rate, tax_amount,
              discount_rate, discount_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            invoiceId,
            line.product_id,
            product.name,
            product.sku || null,
            line.quantity,
            line.unit_price,
            line.line_total,
            line.tax_rate || 0,
            line.tax_amount,
            line.discount_rate || 0,
            line.discount_amount
          );

          // Create inventory movement for SALE
          this.db.prepare(`
            INSERT INTO inventory_movements (
              product_id, movement_type, quantity, unit_cost, total_cost,
              reference_type, reference_id, reason, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            line.product_id,
            'SALE',
            -line.quantity, // Negative for sale
            line.unit_price,
            line.quantity * line.unit_price,
            'INVOICE',
            invoiceId,
            'SALE',
            request.cashier_id
          );
        }

        // Get the created invoice
        const invoice = this.db.prepare(`
          SELECT * FROM invoices WHERE id = ?
        `).get(invoiceId) as Invoice;

        return invoice;
      } catch (error) {
        throw error;
      }
    });

    return transaction();
  }

  async getInvoice(invoiceId: number): Promise<Invoice | null> {
    const invoice = this.db.prepare(`
      SELECT * FROM invoices WHERE id = ?
    `).get(invoiceId) as Invoice;

    return invoice || null;
  }

  async getInvoiceLines(invoiceId: number): Promise<InvoiceLine[]> {
    const lines = this.db.prepare(`
      SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id
    `).all(invoiceId) as InvoiceLine[];

    return lines;
  }

  async getInvoices(filters: {
    startDate?: string;
    endDate?: string;
    cashierId?: number;
    customerId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Invoice[]> {
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];

    if (filters.startDate) {
      query += ' AND created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND created_at <= ?';
      params.push(filters.endDate);
    }

    if (filters.cashierId) {
      query += ' AND cashier_id = ?';
      params.push(filters.cashierId);
    }

    if (filters.customerId) {
      query += ' AND customer_id = ?';
      params.push(filters.customerId);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const invoices = this.db.prepare(query).all(...params) as Invoice[];
    return invoices;
  }

  async processReturn(invoiceId: number, returnLines: {
    line_id: number;
    quantity: number;
    reason: string;
  }[], processedBy: number): Promise<boolean> {
    const transaction = this.db.transaction(() => {
      try {
        for (const returnLine of returnLines) {
          // Get original line
          const originalLine = this.db.prepare(`
            SELECT * FROM invoice_lines WHERE id = ? AND invoice_id = ?
          `).get(returnLine.line_id, invoiceId) as InvoiceLine;

          if (!originalLine) {
            throw new Error(`Invoice line ${returnLine.line_id} not found`);
          }

          if (returnLine.quantity > originalLine.quantity) {
            throw new Error(`Return quantity cannot exceed original quantity`);
          }

          // Create return movement
          this.db.prepare(`
            INSERT INTO inventory_movements (
              product_id, movement_type, quantity, unit_cost, total_cost,
              reference_type, reference_id, reason, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            originalLine.product_id,
            'RETURN',
            returnLine.quantity, // Positive for return
            originalLine.unit_price,
            returnLine.quantity * originalLine.unit_price,
            'INVOICE',
            invoiceId,
            returnLine.reason,
            processedBy
          );
        }

        return true;
      } catch (error) {
        throw error;
      }
    });

    return transaction();
  }

  async getInvoiceSummary(filters: {
    startDate?: string;
    endDate?: string;
    cashierId?: number;
  } = {}): Promise<{
    totalInvoices: number;
    totalAmount: number;
    totalTax: number;
    totalDiscount: number;
    averageInvoice: number;
  }> {
    let query = `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_amount,
        SUM(tax_amount) as total_tax,
        SUM(discount_amount) as total_discount,
        AVG(total_amount) as average_invoice
      FROM invoices 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.startDate) {
      query += ' AND created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND created_at <= ?';
      params.push(filters.endDate);
    }

    if (filters.cashierId) {
      query += ' AND cashier_id = ?';
      params.push(filters.cashierId);
    }

    const result = this.db.prepare(query).get(...params) as any;

    return {
      totalInvoices: result.total_invoices || 0,
      totalAmount: result.total_amount || 0,
      totalTax: result.total_tax || 0,
      totalDiscount: result.total_discount || 0,
      averageInvoice: result.average_invoice || 0
    };
  }
}










