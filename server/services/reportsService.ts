import { Database } from 'better-sqlite3';

export interface SalesSummary {
  totalSales: number;
  totalInvoices: number;
  averageInvoice: number;
  totalTax: number;
  totalDiscount: number;
  grossMargin: number;
  netMargin: number;
}

export interface SalesByTier {
  tier: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  sku: string;
  quantity_sold: number;
  total_amount: number;
  percentage: number;
}

export interface TopCategory {
  category: string;
  quantity_sold: number;
  total_amount: number;
  percentage: number;
}

export interface DiscountAudit {
  invoice_id: number;
  invoice_number: string;
  customer_name: string;
  discount_amount: number;
  discount_percentage: number;
  total_amount: number;
  created_at: string;
  cashier_name: string;
}

export class ReportsService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getSalesSummary(filters: {
    startDate?: string;
    endDate?: string;
    cashierId?: number;
  } = {}): Promise<SalesSummary> {
    let query = `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as average_invoice,
        SUM(tax_amount) as total_tax,
        SUM(discount_amount) as total_discount,
        SUM(subtotal) as total_subtotal
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

    const totalSales = result.total_sales || 0;
    const totalSubtotal = result.total_subtotal || 0;
    const grossMargin = totalSubtotal > 0 ? ((totalSales - totalSubtotal) / totalSubtotal) * 100 : 0;
    const netMargin = totalSales > 0 ? ((totalSales - totalSubtotal) / totalSales) * 100 : 0;

    return {
      totalSales,
      totalInvoices: result.total_invoices || 0,
      averageInvoice: result.average_invoice || 0,
      totalTax: result.total_tax || 0,
      totalDiscount: result.total_discount || 0,
      grossMargin,
      netMargin
    };
  }

  async getSalesByTier(filters: {
    startDate?: string;
    endDate?: string;
    cashierId?: number;
  } = {}): Promise<SalesByTier[]> {
    let query = `
      SELECT 
        CASE 
          WHEN total_amount < 100 THEN 'Under $100'
          WHEN total_amount < 500 THEN '$100-$500'
          WHEN total_amount < 1000 THEN '$500-$1000'
          WHEN total_amount < 2000 THEN '$1000-$2000'
          ELSE 'Over $2000'
        END as tier,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
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

    query += ' GROUP BY tier ORDER BY total_amount DESC';

    const results = this.db.prepare(query).all(...params) as any[];
    
    // Calculate total for percentage calculation
    const totalAmount = results.reduce((sum, row) => sum + row.total_amount, 0);

    return results.map(row => ({
      tier: row.tier,
      count: row.count,
      totalAmount: row.total_amount,
      percentage: totalAmount > 0 ? (row.total_amount / totalAmount) * 100 : 0
    }));
  }

  async getTopProducts(filters: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<TopProduct[]> {
    let query = `
      SELECT 
        il.product_id,
        il.product_name,
        il.product_sku as sku,
        SUM(il.quantity) as quantity_sold,
        SUM(il.line_total) as total_amount
      FROM invoice_lines il
      JOIN invoices i ON il.invoice_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.startDate) {
      query += ' AND i.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND i.created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' GROUP BY il.product_id, il.product_name, il.product_sku ORDER BY total_amount DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const results = this.db.prepare(query).all(...params) as any[];
    
    // Calculate total for percentage calculation
    const totalAmount = results.reduce((sum, row) => sum + row.total_amount, 0);

    return results.map(row => ({
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      quantity_sold: row.quantity_sold,
      total_amount: row.total_amount,
      percentage: totalAmount > 0 ? (row.total_amount / totalAmount) * 100 : 0
    }));
  }

  async getTopCategories(filters: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<TopCategory[]> {
    let query = `
      SELECT 
        p.category,
        SUM(il.quantity) as quantity_sold,
        SUM(il.line_total) as total_amount
      FROM invoice_lines il
      JOIN invoices i ON il.invoice_id = i.id
      JOIN products p ON il.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.startDate) {
      query += ' AND i.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND i.created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' GROUP BY p.category ORDER BY total_amount DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const results = this.db.prepare(query).all(...params) as any[];
    
    // Calculate total for percentage calculation
    const totalAmount = results.reduce((sum, row) => sum + row.total_amount, 0);

    return results.map(row => ({
      category: row.category || 'Uncategorized',
      quantity_sold: row.quantity_sold,
      total_amount: row.total_amount,
      percentage: totalAmount > 0 ? (row.total_amount / totalAmount) * 100 : 0
    }));
  }

  async getDiscountAudit(filters: {
    startDate?: string;
    endDate?: string;
    minDiscountAmount?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<DiscountAudit[]> {
    let query = `
      SELECT 
        i.id as invoice_id,
        i.invoice_number,
        i.customer_name,
        i.discount_amount,
        CASE 
          WHEN i.subtotal > 0 THEN (i.discount_amount / i.subtotal) * 100
          ELSE 0
        END as discount_percentage,
        i.total_amount,
        i.created_at,
        u.name as cashier_name
      FROM invoices i
      JOIN users u ON i.cashier_id = u.id
      WHERE i.discount_amount > 0
    `;
    const params: any[] = [];

    if (filters.startDate) {
      query += ' AND i.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND i.created_at <= ?';
      params.push(filters.endDate);
    }

    if (filters.minDiscountAmount) {
      query += ' AND i.discount_amount >= ?';
      params.push(filters.minDiscountAmount);
    }

    query += ' ORDER BY i.discount_amount DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const results = this.db.prepare(query).all(...params) as any[];
    
    return results.map(row => ({
      invoice_id: row.invoice_id,
      invoice_number: row.invoice_number,
      customer_name: row.customer_name || 'Walk-in Customer',
      discount_amount: row.discount_amount,
      discount_percentage: row.discount_percentage,
      total_amount: row.total_amount,
      created_at: row.created_at,
      cashier_name: row.cashier_name
    }));
  }

  async exportSalesSummary(filters: {
    startDate?: string;
    endDate?: string;
    cashierId?: number;
  } = {}): Promise<string> {
    const summary = await this.getSalesSummary(filters);
    const byTier = await this.getSalesByTier(filters);
    const topProducts = await this.getTopProducts({ ...filters, limit: 10 });
    const topCategories = await this.getTopCategories({ ...filters, limit: 10 });

    const csvRows = [];
    
    // Summary section
    csvRows.push('Sales Summary');
    csvRows.push(`Total Sales,${summary.totalSales}`);
    csvRows.push(`Total Invoices,${summary.totalInvoices}`);
    csvRows.push(`Average Invoice,${summary.averageInvoice}`);
    csvRows.push(`Total Tax,${summary.totalTax}`);
    csvRows.push(`Total Discount,${summary.totalDiscount}`);
    csvRows.push(`Gross Margin %,${summary.grossMargin.toFixed(2)}`);
    csvRows.push(`Net Margin %,${summary.netMargin.toFixed(2)}`);
    csvRows.push('');

    // Sales by tier
    csvRows.push('Sales by Tier');
    csvRows.push('Tier,Count,Total Amount,Percentage');
    byTier.forEach(tier => {
      csvRows.push(`${tier.tier},${tier.count},${tier.totalAmount},${tier.percentage.toFixed(2)}%`);
    });
    csvRows.push('');

    // Top products
    csvRows.push('Top Products');
    csvRows.push('Product Name,SKU,Quantity Sold,Total Amount,Percentage');
    topProducts.forEach(product => {
      csvRows.push(`"${product.product_name}",${product.sku},${product.quantity_sold},${product.total_amount},${product.percentage.toFixed(2)}%`);
    });
    csvRows.push('');

    // Top categories
    csvRows.push('Top Categories');
    csvRows.push('Category,Quantity Sold,Total Amount,Percentage');
    topCategories.forEach(category => {
      csvRows.push(`"${category.category}",${category.quantity_sold},${category.total_amount},${category.percentage.toFixed(2)}%`);
    });

    return csvRows.join('\n');
  }

  async exportDiscountAudit(filters: {
    startDate?: string;
    endDate?: string;
    minDiscountAmount?: number;
  } = {}): Promise<string> {
    const audits = await this.getDiscountAudit(filters);

    const csvRows = [];
    csvRows.push('Invoice ID,Invoice Number,Customer Name,Discount Amount,Discount %,Total Amount,Created At,Cashier Name');
    
    audits.forEach(audit => {
      csvRows.push([
        audit.invoice_id,
        audit.invoice_number,
        `"${audit.customer_name}"`,
        audit.discount_amount,
        `${audit.discount_percentage.toFixed(2)}%`,
        audit.total_amount,
        audit.created_at,
        `"${audit.cashier_name}"`
      ].join(','));
    });

    return csvRows.join('\n');
  }
}










