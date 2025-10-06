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

  // Returns & Refunds Reporting Methods
  async getReturnsSummary(filters: {
    date_from: Date;
    date_to: Date;
    cashier?: number;
    terminal?: string;
  }): Promise<{
    totalReturns: number;
    totalRefundAmount: number;
    refundByMethod: {
      cash: number;
      card: number;
      wallet: number;
      store_credit: number;
    };
    returnsByReason: Array<{
      reason_code: string;
      count: number;
      amount: number;
    }>;
    dailyReturns: Array<{
      date: string;
      count: number;
      amount: number;
    }>;
  }> {
    const whereClause = this.buildReturnsWhereClause(filters);
    const params = this.buildReturnsParams(filters);

    // Total returns and refund amount
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_returns,
        COALESCE(SUM(refund_cash + refund_card + refund_wallet + refund_store_credit), 0) as total_refund_amount,
        COALESCE(SUM(refund_cash), 0) as refund_cash,
        COALESCE(SUM(refund_card), 0) as refund_card,
        COALESCE(SUM(refund_wallet), 0) as refund_wallet,
        COALESCE(SUM(refund_store_credit), 0) as refund_store_credit
      FROM returns r
      ${whereClause}
    `;

    const summaryResult = await db.query(summaryQuery, params);
    const summary = summaryResult[0];

    // Returns by reason
    const reasonQuery = `
      SELECT 
        rl.reason_code,
        COUNT(*) as count,
        COALESCE(SUM(rl.line_refund), 0) as amount
      FROM returns r
      JOIN return_lines rl ON r.id = rl.return_id
      ${whereClause}
      GROUP BY rl.reason_code
      ORDER BY count DESC
    `;

    const returnsByReason = await db.query<any>(reasonQuery, params);

    // Daily returns
    const dailyQuery = `
      SELECT 
        DATE(r.datetime) as date,
        COUNT(*) as count,
        COALESCE(SUM(r.refund_cash + r.refund_card + r.refund_wallet + r.refund_store_credit), 0) as amount
      FROM returns r
      ${whereClause}
      GROUP BY DATE(r.datetime)
      ORDER BY date
    `;

    const dailyReturns = await db.query<any>(dailyQuery, params);

    return {
      totalReturns: summary?.total_returns || 0,
      totalRefundAmount: summary?.total_refund_amount || 0,
      refundByMethod: {
        cash: summary?.refund_cash || 0,
        card: summary?.refund_card || 0,
        wallet: summary?.refund_wallet || 0,
        store_credit: summary?.refund_store_credit || 0,
      },
      returnsByReason: returnsByReason || [],
      dailyReturns: dailyReturns || []
    };
  }

  async getReturnsByReason(filters: {
    date_from: Date;
    date_to: Date;
    cashier?: number;
    terminal?: string;
  }): Promise<Array<{
    reason_code: string;
    reason_name: string;
    count: number;
    total_amount: number;
    percentage: number;
  }>> {
    const whereClause = this.buildReturnsWhereClause(filters);
    const params = this.buildReturnsParams(filters);

    const query = `
      SELECT 
        rl.reason_code,
        CASE rl.reason_code
          WHEN 'DAMAGED' THEN 'Damaged'
          WHEN 'EXPIRED' THEN 'Expired'
          WHEN 'WRONG_ITEM' THEN 'Wrong Item'
          WHEN 'CUSTOMER_CHANGE' THEN 'Customer Change'
          WHEN 'OTHER' THEN 'Other'
          ELSE rl.reason_code
        END as reason_name,
        COUNT(*) as count,
        COALESCE(SUM(rl.line_refund), 0) as total_amount
      FROM returns r
      JOIN return_lines rl ON r.id = rl.return_id
      ${whereClause}
      GROUP BY rl.reason_code
      ORDER BY count DESC
    `;

    const results = await db.query<any>(query, params);
    const totalCount = results.reduce((sum, row) => sum + row.count, 0);

    return results.map(row => ({
      ...row,
      percentage: totalCount > 0 ? (row.count / totalCount) * 100 : 0
    }));
  }

  async exportReturnsCSV(filters: {
    date_from: Date;
    date_to: Date;
    cashier?: number;
    terminal?: string;
  }): Promise<string> {
    const whereClause = this.buildReturnsWhereClause(filters);
    const params = this.buildReturnsParams(filters);

    const query = `
      SELECT 
        r.id as return_id,
        r.datetime,
        r.sale_id,
        u1.name as cashier_name,
        u2.name as manager_name,
        r.refund_cash,
        r.refund_card,
        r.refund_wallet,
        r.refund_store_credit,
        r.reason_summary,
        r.language,
        r.terminal_name,
        p.name_en as product_name,
        rl.qty,
        rl.unit_price,
        rl.line_refund,
        rl.reason_code
      FROM returns r
      LEFT JOIN users u1 ON r.cashier_id = u1.id
      LEFT JOIN users u2 ON r.manager_id = u2.id
      JOIN return_lines rl ON r.id = rl.return_id
      JOIN products p ON rl.product_id = p.id
      ${whereClause}
      ORDER BY r.datetime DESC
    `;

    const results = await db.query<any>(query, params);

    // Convert to CSV format
    const headers = [
      'Return ID', 'Date', 'Sale ID', 'Cashier', 'Manager', 'Refund Cash',
      'Refund Card', 'Refund Wallet', 'Refund Store Credit', 'Reason Summary',
      'Language', 'Terminal', 'Product', 'Quantity', 'Unit Price', 'Line Refund', 'Reason Code'
    ];

    const csvRows = [headers.join(',')];
    
    for (const row of results) {
      const csvRow = [
        row.return_id,
        row.datetime,
        row.sale_id,
        `"${row.cashier_name || ''}"`,
        `"${row.manager_name || ''}"`,
        row.refund_cash,
        row.refund_card,
        row.refund_wallet,
        row.refund_store_credit,
        `"${row.reason_summary || ''}"`,
        row.language,
        `"${row.terminal_name || ''}"`,
        `"${row.product_name}"`,
        row.qty,
        row.unit_price,
        row.line_refund,
        row.reason_code
      ];
      csvRows.push(csvRow.join(','));
    }

    return csvRows.join('\n');
  }

  private buildReturnsWhereClause(filters: {
    date_from: Date;
    date_to: Date;
    cashier?: number;
    terminal?: string;
  }): string {
    let whereClause = 'WHERE r.datetime >= ? AND r.datetime <= ?';
    
    if (filters.cashier) {
      whereClause += ' AND r.cashier_id = ?';
    }
    
    if (filters.terminal) {
      whereClause += ' AND r.terminal_name = ?';
    }
    
    return whereClause;
  }

  private buildReturnsParams(filters: {
    date_from: Date;
    date_to: Date;
    cashier?: number;
    terminal?: string;
  }): any[] {
    const params = [filters.date_from, filters.date_to];
    
    if (filters.cashier) {
      params.push(filters.cashier as any);
    }
    
    if (filters.terminal) {
      params.push(filters.terminal as any);
    }
    
    return params;
  }

  // GRN Reporting Methods
  async getGrnSummary(filters: {
    date_from: Date;
    date_to: Date;
    supplier_id?: number;
  }): Promise<{
    totalGRNs: number;
    totalValue: number;
    grnsByStatus: Array<{
      status: string;
      count: number;
      value: number;
    }>;
    topSuppliers: Array<{
      supplier_id: number;
      supplier_name: string;
      grn_count: number;
      total_value: number;
    }>;
    dailyGRNs: Array<{
      date: string;
      count: number;
      value: number;
    }>;
  }> {
    try {
      // Use db from imports
      
      const whereClause = this.buildGrnWhereClause(filters);
      const params = this.buildGrnParams(filters);
      
      // Total GRNs and value
      const totalsQuery = `
        SELECT 
          COUNT(*) as total_grns,
          COALESCE(SUM(total), 0) as total_value
        FROM grn g
        LEFT JOIN suppliers s ON g.supplier_id = s.id
        ${whereClause}
      `;
      
      const totalsResult = await db.query(totalsQuery, params);
      const totals = totalsResult[0] || {};
      
      // GRNs by status
      const statusQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as value
        FROM grn g
        LEFT JOIN suppliers s ON g.supplier_id = s.id
        ${whereClause}
        GROUP BY status
        ORDER BY count DESC
      `;
      
      const grnsByStatus = await db.query(statusQuery, params);
      
      // Top suppliers
      const suppliersQuery = `
        SELECT 
          g.supplier_id,
          s.supplier_name,
          COUNT(*) as grn_count,
          COALESCE(SUM(g.total), 0) as total_value
        FROM grn g
        LEFT JOIN suppliers s ON g.supplier_id = s.id
        ${whereClause}
        GROUP BY g.supplier_id, s.supplier_name
        ORDER BY total_value DESC
        LIMIT 10
      `;
      
      const topSuppliers = await db.query(suppliersQuery, params);
      
      // Daily GRNs
      const dailyQuery = `
        SELECT 
          DATE(datetime) as date,
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as value
        FROM grn g
        LEFT JOIN suppliers s ON g.supplier_id = s.id
        ${whereClause}
        GROUP BY DATE(datetime)
        ORDER BY date DESC
        LIMIT 30
      `;
      
      const dailyGRNs = await db.query(dailyQuery, params);
      
      return {
        totalGRNs: totals.total_grns || 0,
        totalValue: totals.total_value || 0,
        grnsByStatus: grnsByStatus.map((row: any) => ({
          status: row.status,
          count: row.count,
          value: row.value
        })),
        topSuppliers: topSuppliers.map((row: any) => ({
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name || 'Unknown',
          grn_count: row.grn_count,
          total_value: row.total_value
        })),
        dailyGRNs: dailyGRNs.map((row: any) => ({
          date: row.date,
          count: row.count,
          value: row.value
        }))
      };
    } catch (error) {
      console.error('Error getting GRN summary:', error);
      throw new Error('Failed to get GRN summary');
    }
  }

  async getIncomingByProduct(filters: {
    date_from: Date;
    date_to: Date;
    supplier_id?: number;
  }): Promise<Array<{
    product_id: number;
    product_name: string;
    sku: string;
    total_qty: number;
    total_value: number;
    grn_count: number;
    avg_cost: number;
  }>> {
    try {
      // Use db from imports
      
      const whereClause = this.buildGrnWhereClause(filters);
      const params = this.buildGrnParams(filters);
      
      const query = `
        SELECT 
          gl.product_id,
          p.name as product_name,
          p.sku,
          SUM(gl.qty) as total_qty,
          SUM(gl.line_total) as total_value,
          COUNT(DISTINCT gl.grn_id) as grn_count,
          AVG(gl.unit_cost) as avg_cost
        FROM grn_lines gl
        JOIN grn g ON gl.grn_id = g.id
        JOIN products p ON gl.product_id = p.id
        LEFT JOIN suppliers s ON g.supplier_id = s.id
        ${whereClause.replace('grn g', 'grn g').replace('suppliers s', 'suppliers s')}
        GROUP BY gl.product_id, p.name, p.sku
        ORDER BY total_qty DESC
        LIMIT 50
      `;
      
      const results = await db.query(query, params);
      
      return results.map((row: any) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.sku,
        total_qty: row.total_qty,
        total_value: row.total_value,
        grn_count: row.grn_count,
        avg_cost: row.avg_cost
      }));
    } catch (error) {
      console.error('Error getting incoming by product:', error);
      throw new Error('Failed to get incoming by product');
    }
  }

  async exportGrnCSV(filters: {
    date_from: Date;
    date_to: Date;
    supplier_id?: number;
  }): Promise<string> {
    try {
      const summary = await this.getGrnSummary(filters);
      const byProduct = await this.getIncomingByProduct(filters);
      
      const csvData = [
        {
          'Total GRNs': summary.totalGRNs,
          'Total Value': summary.totalValue,
          'Date From': filters.date_from.toISOString().split('T')[0],
          'Date To': filters.date_to.toISOString().split('T')[0]
        },
        ...summary.grnsByStatus.map(status => ({
          'Status': status.status,
          'Count': status.count,
          'Value': status.value
        })),
        ...byProduct.map(product => ({
          'Product': product.product_name,
          'SKU': product.sku,
          'Total Qty': product.total_qty,
          'Total Value': product.total_value,
          'GRN Count': product.grn_count,
          'Avg Cost': product.avg_cost
        }))
      ];
      
      return csvData.join('\n');
    } catch (error) {
      console.error('Error exporting GRN CSV:', error);
      throw new Error('Failed to export GRN CSV');
    }
  }

  private buildGrnWhereClause(filters: {
    date_from: Date;
    date_to: Date;
    supplier_id?: number;
  }): string {
    let whereClause = 'WHERE 1=1';
    
    if (filters.date_from) {
      whereClause += ' AND DATE(g.datetime) >= ?';
    }
    
    if (filters.date_to) {
      whereClause += ' AND DATE(g.datetime) <= ?';
    }
    
    if (filters.supplier_id) {
      whereClause += ' AND g.supplier_id = ?';
    }
    
    return whereClause;
  }

  private buildGrnParams(filters: {
    date_from: Date;
    date_to: Date;
    supplier_id?: number;
  }): any[] {
    const params: any[] = [];
    
    if (filters.date_from) {
      params.push(filters.date_from.toISOString().split('T')[0]);
    }
    
    if (filters.date_to) {
      params.push(filters.date_to.toISOString().split('T')[0]);
    }
    
    if (filters.supplier_id) {
      params.push(filters.supplier_id);
    }
    
    return params;
  }

  // Shift Reporting Methods
  async getShiftDailySummary(params: {
    date_from: Date;
    date_to: Date;
    terminal?: string;
    cashier_id?: number;
  }): Promise<any[]> {
    try {
      // Use db from imports
      
      let whereClause = 'WHERE DATE(s.opened_at) BETWEEN ? AND ?';
      const queryParams: any[] = [params.date_from, params.date_to];
      
      if (params.terminal) {
        whereClause += ' AND s.terminal_name = ?';
        queryParams.push(params.terminal);
      }
      
      if (params.cashier_id) {
        whereClause += ' AND s.cashier_id = ?';
        queryParams.push(params.cashier_id);
      }
      
      const query = `
        SELECT 
          DATE(s.opened_at) as date,
          s.terminal_name,
          s.cashier_id,
          COUNT(s.id) as total_shifts,
          SUM(CASE WHEN s.status = 'OPEN' THEN 1 ELSE 0 END) as open_shifts,
          SUM(CASE WHEN s.status = 'CLOSED' THEN 1 ELSE 0 END) as closed_shifts,
          SUM(CASE WHEN s.status = 'VOID' THEN 1 ELSE 0 END) as void_shifts,
          COALESCE(SUM(sales.invoices), 0) as total_invoices,
          COALESCE(SUM(sales.gross), 0) as total_gross,
          COALESCE(SUM(sales.discount), 0) as total_discount,
          COALESCE(SUM(sales.tax), 0) as total_tax,
          COALESCE(SUM(sales.net), 0) as total_net,
          COALESCE(SUM(payments.cash), 0) as total_cash,
          COALESCE(SUM(payments.card), 0) as total_card,
          COALESCE(SUM(payments.wallet), 0) as total_wallet,
          COALESCE(SUM(payments.other), 0) as total_other,
          COALESCE(SUM(movements.cash_in), 0) as total_cash_in,
          COALESCE(SUM(movements.cash_out), 0) as total_cash_out,
          COALESCE(SUM(movements.drops), 0) as total_drops,
          COALESCE(SUM(movements.petty), 0) as total_petty,
          COALESCE(SUM(s.declared_cash), 0) as total_declared,
          COALESCE(SUM(s.variance_cash), 0) as total_variance
        FROM shifts s
        LEFT JOIN (
          SELECT 
            shift_id,
            COUNT(*) as invoices,
            SUM(subtotal) as gross,
            SUM(discount) as discount,
            SUM(tax) as tax,
            SUM(total) as net
          FROM sales 
          WHERE shift_id IS NOT NULL
          GROUP BY shift_id
        ) sales ON s.id = sales.shift_id
        LEFT JOIN (
          SELECT 
            shift_id,
            SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash,
            SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card,
            SUM(CASE WHEN payment_method = 'wallet' THEN total ELSE 0 END) as wallet,
            SUM(CASE WHEN payment_method NOT IN ('cash', 'card', 'wallet') THEN total ELSE 0 END) as other
          FROM sales 
          WHERE shift_id IS NOT NULL
          GROUP BY shift_id
        ) payments ON s.id = payments.shift_id
        LEFT JOIN (
          SELECT 
            shift_id,
            SUM(CASE WHEN type = 'CASH_IN' THEN amount ELSE 0 END) as cash_in,
            SUM(CASE WHEN type = 'CASH_OUT' THEN amount ELSE 0 END) as cash_out,
            SUM(CASE WHEN type = 'DROP' THEN amount ELSE 0 END) as drops,
            SUM(CASE WHEN type = 'PETTY' THEN amount ELSE 0 END) as petty
          FROM shift_movements
          GROUP BY shift_id
        ) movements ON s.id = movements.shift_id
        ${whereClause}
        GROUP BY DATE(s.opened_at), s.terminal_name, s.cashier_id
        ORDER BY DATE(s.opened_at) DESC, s.terminal_name, s.cashier_id
      `;
      
      return await db.query(query, queryParams);
    } catch (error) {
      console.error('Error getting shift daily summary:', error);
      throw new Error('Failed to get shift daily summary');
    }
  }

  async exportShiftSummaryCSV(params: {
    date_from: Date;
    date_to: Date;
    terminal?: string;
    cashier_id?: number;
  }): Promise<string> {
    try {
      const data = await this.getShiftDailySummary(params);
      
      const csvData = data.map(row => ({
        date: row.date,
        terminal: row.terminal_name,
        cashier_id: row.cashier_id,
        total_shifts: row.total_shifts,
        open_shifts: row.open_shifts,
        closed_shifts: row.closed_shifts,
        void_shifts: row.void_shifts,
        invoices: row.total_invoices,
        gross: row.total_gross,
        discount: row.total_discount,
        tax: row.total_tax,
        net: row.total_net,
        cash: row.total_cash,
        card: row.total_card,
        wallet: row.total_wallet,
        other: row.total_other,
        cash_in: row.total_cash_in,
        cash_out: row.total_cash_out,
        drops: row.total_drops,
        petty: row.total_petty,
        declared_cash: row.total_declared,
        variance: row.total_variance
      }));
      
      return csvData.join('\n');
    } catch (error) {
      console.error('Error exporting shift summary CSV:', error);
      throw new Error('Failed to export shift summary CSV');
    }
  }
}

// Singleton instance
export const reportService = new ReportService();






