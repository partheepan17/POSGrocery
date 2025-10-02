import { db } from './database';

export interface ReportFilters {
  from: Date;
  to: Date;
  tier?: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  terminal?: string;
  cashier?: string;
}

export interface SalesSummaryRow {
  date: string;
  invoices: number;
  gross: number;
  discount: number;
  tax: number;
  net: number;
  pay_cash: number;
  pay_card: number;
  pay_wallet: number;
  avg_per_invoice: number;
}

export interface SalesByTierRow {
  tier: string;
  invoices: number;
  gross: number;
  discount: number;
  net: number;
  avg_per_invoice: number;
}

export interface TopProductRow {
  sku: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  qty: number;
  net: number;
  invoices: number;
}

export interface TopCategoryRow {
  category_name: string;
  qty: number;
  net: number;
  invoices: number;
}

export interface DiscountAuditRow {
  rule_name: string;
  times_applied: number;
  discounted_amount: number;
  avg_per_invoice: number;
  affected_invoices: number;
}

export interface ReportKPIs {
  invoices: number;
  gross: number;
  discount: number;
  tax: number;
  net: number;
  avg_per_invoice: number;
  pay_cash: number;
  pay_card: number;
  pay_wallet: number;
}

class ReportService {
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private buildBaseQuery(filters: ReportFilters): { whereClause: string; params: any[] } {
    let whereClause = 'WHERE s.created_at >= ? AND s.created_at <= ?';
    const params: any[] = [filters.from, filters.to];

    if (filters.tier) {
      whereClause += ' AND s.price_tier = ?';
      params.push(filters.tier);
    }

    if (filters.terminal) {
      whereClause += ' AND s.terminal_id = ?';
      params.push(filters.terminal);
    }

    if (filters.cashier) {
      whereClause += ' AND s.cashier_id = ?';
      params.push(filters.cashier);
    }

    return { whereClause, params };
  }

  async getSalesSummary(filters: ReportFilters): Promise<SalesSummaryRow[]> {
    const { whereClause, params } = this.buildBaseQuery(filters);
    
    // Determine if we need daily buckets (more than 1 day)
    const daysDiff = Math.ceil((filters.to.getTime() - filters.from.getTime()) / (1000 * 60 * 60 * 24));
    const groupByDate = daysDiff > 1;

    let query: string;
    if (groupByDate) {
      query = `
        SELECT 
          DATE(s.created_at) as date,
          COUNT(DISTINCT s.id) as invoices,
          COALESCE(SUM(s.gross_total), 0) as gross,
          COALESCE(SUM(s.discount_total), 0) as discount,
          COALESCE(SUM(s.tax_total), 0) as tax,
          COALESCE(SUM(s.net_total), 0) as net,
          COALESCE(SUM(CASE WHEN s.payment_method = 'cash' THEN s.net_total ELSE 0 END), 0) as pay_cash,
          COALESCE(SUM(CASE WHEN s.payment_method = 'card' THEN s.net_total ELSE 0 END), 0) as pay_card,
          COALESCE(SUM(CASE WHEN s.payment_method = 'wallet' THEN s.net_total ELSE 0 END), 0) as pay_wallet
        FROM sales s
        ${whereClause}
        GROUP BY DATE(s.created_at)
        ORDER BY DATE(s.created_at)
      `;
    } else {
      query = `
        SELECT 
          '${this.formatDate(filters.from)}' as date,
          COUNT(DISTINCT s.id) as invoices,
          COALESCE(SUM(s.gross_total), 0) as gross,
          COALESCE(SUM(s.discount_total), 0) as discount,
          COALESCE(SUM(s.tax_total), 0) as tax,
          COALESCE(SUM(s.net_total), 0) as net,
          COALESCE(SUM(CASE WHEN s.payment_method = 'cash' THEN s.net_total ELSE 0 END), 0) as pay_cash,
          COALESCE(SUM(CASE WHEN s.payment_method = 'card' THEN s.net_total ELSE 0 END), 0) as pay_card,
          COALESCE(SUM(CASE WHEN s.payment_method = 'wallet' THEN s.net_total ELSE 0 END), 0) as pay_wallet
        FROM sales s
        ${whereClause}
      `;
    }

    const rows = await db.query<any>(query, params);
    return rows.map(row => ({
      ...row,
      avg_per_invoice: row.invoices > 0 ? row.net / row.invoices : 0
    }));
  }

  async getSalesByTier(filters: ReportFilters): Promise<SalesByTierRow[]> {
    const { whereClause, params } = this.buildBaseQuery(filters);
    
    const query = `
      SELECT 
        s.price_tier as tier,
        COUNT(DISTINCT s.id) as invoices,
        COALESCE(SUM(s.gross_total), 0) as gross,
        COALESCE(SUM(s.discount_total), 0) as discount,
        COALESCE(SUM(s.net_total), 0) as net
      FROM sales s
      ${whereClause}
      GROUP BY s.price_tier
      ORDER BY SUM(s.net_total) DESC
    `;

    const rows = await db.query<any>(query, params);
    return rows.map(row => ({
      ...row,
      avg_per_invoice: row.invoices > 0 ? row.net / row.invoices : 0
    }));
  }

  async getTopProducts(filters: ReportFilters & { limit?: number }): Promise<TopProductRow[]> {
    const { whereClause, params } = this.buildBaseQuery(filters);
    const limit = filters.limit || 20;
    
    const query = `
      SELECT 
        p.sku,
        p.name_en,
        p.name_si,
        p.name_ta,
        COALESCE(SUM(sl.qty), 0) as qty,
        COALESCE(SUM(sl.total), 0) as net,
        COUNT(DISTINCT s.id) as invoices
      FROM sale_lines sl
      JOIN sales s ON sl.sale_id = s.id
      JOIN products p ON sl.product_id = p.id
      ${whereClause}
      GROUP BY p.id, p.sku, p.name_en, p.name_si, p.name_ta
      ORDER BY SUM(sl.total) DESC
      LIMIT ?
    `;

    return await db.query<TopProductRow>(query, [...params, limit]);
  }

  async getTopCategories(filters: ReportFilters & { limit?: number }): Promise<TopCategoryRow[]> {
    const { whereClause, params } = this.buildBaseQuery(filters);
    const limit = filters.limit || 20;
    
    const query = `
      SELECT 
        c.name as category_name,
        COALESCE(SUM(sl.qty), 0) as qty,
        COALESCE(SUM(sl.total), 0) as net,
        COUNT(DISTINCT s.id) as invoices
      FROM sale_lines sl
      JOIN sales s ON sl.sale_id = s.id
      JOIN products p ON sl.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name
      ORDER BY SUM(sl.total) DESC
      LIMIT ?
    `;

    return await db.query<TopCategoryRow>(query, [...params, limit]);
  }

  async getDiscountAudit(filters: ReportFilters): Promise<DiscountAuditRow[]> {
    const { whereClause, params } = this.buildBaseQuery(filters);
    
    const query = `
      SELECT 
        dr.name as rule_name,
        COUNT(sl.id) as times_applied,
        COALESCE(SUM(sl.line_discount), 0) as discounted_amount,
        COUNT(DISTINCT s.id) as affected_invoices
      FROM sale_lines sl
      JOIN sales s ON sl.sale_id = s.id
      LEFT JOIN discount_rules dr ON sl.applied_discount_rule_id = dr.id
      ${whereClause} AND sl.line_discount > 0 AND dr.id IS NOT NULL
      GROUP BY dr.id, dr.name
      ORDER BY SUM(sl.line_discount) DESC
    `;

    const rows = await db.query<any>(query, params);
    return rows.map(row => ({
      ...row,
      avg_per_invoice: row.affected_invoices > 0 ? row.discounted_amount / row.affected_invoices : 0
    }));
  }

  async getKPIs(filters: ReportFilters): Promise<ReportKPIs> {
    const { whereClause, params } = this.buildBaseQuery(filters);
    
    const query = `
      SELECT 
        COUNT(DISTINCT s.id) as invoices,
        COALESCE(SUM(s.gross_total), 0) as gross,
        COALESCE(SUM(s.discount_total), 0) as discount,
        COALESCE(SUM(s.tax_total), 0) as tax,
        COALESCE(SUM(s.net_total), 0) as net,
        COALESCE(SUM(CASE WHEN s.payment_method = 'cash' THEN s.net_total ELSE 0 END), 0) as pay_cash,
        COALESCE(SUM(CASE WHEN s.payment_method = 'card' THEN s.net_total ELSE 0 END), 0) as pay_card,
        COALESCE(SUM(CASE WHEN s.payment_method = 'wallet' THEN s.net_total ELSE 0 END), 0) as pay_wallet
      FROM sales s
      ${whereClause}
    `;

    const result = await db.query<any>(query, params);
    const row = result[0] || {
      invoices: 0, gross: 0, discount: 0, tax: 0, net: 0,
      pay_cash: 0, pay_card: 0, pay_wallet: 0
    };

    return {
      ...row,
      avg_per_invoice: row.invoices > 0 ? row.net / row.invoices : 0
    };
  }

  async getDiscountRuleDetails(ruleName: string, filters: ReportFilters): Promise<any[]> {
    const { whereClause, params } = this.buildBaseQuery(filters);
    
    const query = `
      SELECT 
        s.id as sale_id,
        s.created_at,
        s.net_total,
        SUM(sl.line_discount) as total_discount
      FROM sale_lines sl
      JOIN sales s ON sl.sale_id = s.id
      LEFT JOIN discount_rules dr ON sl.applied_discount_rule_id = dr.id
      ${whereClause} AND dr.name = ? AND sl.line_discount > 0
      GROUP BY s.id, s.created_at, s.net_total
      ORDER BY s.created_at DESC
      LIMIT 10
    `;

    return await db.query<any>(query, [...params, ruleName]);
  }

  // Helper method to get available terminals and cashiers for filters
  async getFilterOptions(): Promise<{
    terminals: { id: string; name: string }[];
    cashiers: { id: string; name: string }[];
  }> {
    const terminals = await db.query<any>('SELECT id, name FROM terminals WHERE active = true ORDER BY name');
    const cashiers = await db.query<any>('SELECT id, name FROM users WHERE active = true ORDER BY name');
    
    return {
      terminals: terminals || [],
      cashiers: cashiers || []
    };
  }
}

// Singleton instance
export const reportService = new ReportService();



