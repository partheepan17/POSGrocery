/**
 * Advanced Reporting Service
 * Provides comprehensive business intelligence and analytics
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface FinancialReport {
  period: DateRange;
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    grossMargin: number;
    netProfit: number;
    netMargin: number;
    totalTransactions: number;
    averageTransactionValue: number;
  };
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    transactions: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    transactions: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    amount: number;
    percentage: number;
    transactions: number;
  }>;
}

export interface InventoryReport {
  period: DateRange;
  summary: {
    totalProducts: number;
    activeProducts: number;
    totalValue: number;
    averageValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  topProducts: Array<{
    productId: number;
    sku: string;
    name: string;
    quantitySold: number;
    revenue: number;
    margin: number;
    marginPercent: number;
  }>;
  lowStockProducts: Array<{
    productId: number;
    sku: string;
    name: string;
    currentQuantity: number;
    reorderLevel: number;
    category: string;
    value: number;
  }>;
  categoryAnalysis: Array<{
    category: string;
    productCount: number;
    totalValue: number;
    averageValue: number;
    lowStockCount: number;
  }>;
  movementAnalysis: Array<{
    date: string;
    incoming: number;
    outgoing: number;
    netMovement: number;
    totalValue: number;
  }>;
}

export interface CustomerReport {
  period: DateRange;
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    totalRevenue: number;
    averageOrderValue: number;
    averageOrdersPerCustomer: number;
  };
  topCustomers: Array<{
    customerId: number;
    name: string;
    email: string;
    totalSpent: number;
    orderCount: number;
    averageOrderValue: number;
    lastOrderDate: string;
  }>;
  customerSegments: Array<{
    segment: string;
    count: number;
    totalRevenue: number;
    averageOrderValue: number;
  }>;
  customerGrowth: Array<{
    date: string;
    newCustomers: number;
    totalCustomers: number;
  }>;
}

export interface PerformanceReport {
  period: DateRange;
  summary: {
    totalSales: number;
    totalTransactions: number;
    averageTransactionValue: number;
    peakHour: string;
    peakDay: string;
    busiestTerminal: string;
  };
  hourlyAnalysis: Array<{
    hour: number;
    transactions: number;
    revenue: number;
    averageValue: number;
  }>;
  dailyAnalysis: Array<{
    day: string;
    transactions: number;
    revenue: number;
    averageValue: number;
  }>;
  terminalPerformance: Array<{
    terminalName: string;
    transactions: number;
    revenue: number;
    averageValue: number;
    uptime: number;
  }>;
  cashierPerformance: Array<{
    cashierId: number;
    cashierName: string;
    transactions: number;
    revenue: number;
    averageValue: number;
    efficiency: number;
  }>;
}

export class AdvancedReportsService {
  private logger = createContextLogger({ operation: 'advanced_reports' });

  /**
   * Generate comprehensive financial report
   */
  async generateFinancialReport(dateRange: DateRange): Promise<FinancialReport> {
    const db = getDatabase();
    
    this.logger.info('Generating financial report', { dateRange });

    // Get summary data
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(i.net), 0) as totalRevenue,
        COALESCE(SUM(il.qty * COALESCE(p.cost, 0)), 0) as totalCost,
        COUNT(DISTINCT i.id) as totalTransactions,
        COALESCE(AVG(i.net), 0) as averageTransactionValue
      FROM invoices i
      LEFT JOIN invoice_lines il ON i.id = il.invoice_id
      LEFT JOIN products p ON il.product_id = p.id
      WHERE DATE(i.created_at) BETWEEN ? AND ?
    `;

    const summary = db.prepare(summaryQuery).get(dateRange.startDate, dateRange.endDate) as {
      totalRevenue: number;
      totalCost: number;
      totalTransactions: number;
      averageTransactionValue: number;
    };

    const grossProfit = summary.totalRevenue - summary.totalCost;
    const grossMargin = summary.totalRevenue > 0 ? (grossProfit / summary.totalRevenue) * 100 : 0;
    const netProfit = grossProfit; // Assuming no other expenses for now
    const netMargin = summary.totalRevenue > 0 ? (netProfit / summary.totalRevenue) * 100 : 0;

    // Get daily breakdown
    const dailyQuery = `
      SELECT 
        DATE(i.created_at) as date,
        COALESCE(SUM(i.net), 0) as revenue,
        COALESCE(SUM(il.qty * COALESCE(p.cost, 0)), 0) as cost,
        COUNT(DISTINCT i.id) as transactions
      FROM invoices i
      LEFT JOIN invoice_lines il ON i.id = il.invoice_id
      LEFT JOIN products p ON il.product_id = p.id
      WHERE DATE(i.created_at) BETWEEN ? AND ?
      GROUP BY DATE(i.created_at)
      ORDER BY date
    `;

    const dailyBreakdown = db.prepare(dailyQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      date: string;
      revenue: number;
      cost: number;
      transactions: number;
    }>;

    // Calculate profit for each day
    const dailyWithProfit = dailyBreakdown.map(day => ({
      ...day,
      profit: day.revenue - day.cost
    }));

    // Get category breakdown
    const categoryQuery = `
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        COALESCE(SUM(i.net), 0) as revenue,
        COALESCE(SUM(il.qty * COALESCE(p.cost, 0)), 0) as cost,
        COUNT(DISTINCT i.id) as transactions
      FROM invoices i
      JOIN invoice_lines il ON i.id = il.invoice_id
      JOIN products p ON il.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE DATE(i.created_at) BETWEEN ? AND ?
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `;

    const categoryBreakdown = db.prepare(categoryQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      category: string;
      revenue: number;
      cost: number;
      transactions: number;
    }>;

    const categoryWithMargin = categoryBreakdown.map(cat => ({
      ...cat,
      profit: cat.revenue - cat.cost,
      margin: cat.revenue > 0 ? ((cat.revenue - cat.cost) / cat.revenue) * 100 : 0
    }));

    // Get payment method breakdown
    const paymentQuery = `
      SELECT 
        method,
        SUM(amount) as amount,
        COUNT(*) as transactions
      FROM invoice_payments ip
      JOIN invoices i ON ip.invoice_id = i.id
      WHERE DATE(i.created_at) BETWEEN ? AND ?
      GROUP BY method
      ORDER BY amount DESC
    `;

    const paymentBreakdown = db.prepare(paymentQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      method: string;
      amount: number;
      transactions: number;
    }>;

    const totalPaymentAmount = paymentBreakdown.reduce((sum, p) => sum + p.amount, 0);
    const paymentWithPercentage = paymentBreakdown.map(payment => ({
      ...payment,
      percentage: totalPaymentAmount > 0 ? (payment.amount / totalPaymentAmount) * 100 : 0
    }));

    return {
      period: dateRange,
      summary: {
        totalRevenue: summary.totalRevenue,
        totalCost: summary.totalCost,
        grossProfit,
        grossMargin,
        netProfit,
        netMargin,
        totalTransactions: summary.totalTransactions,
        averageTransactionValue: summary.averageTransactionValue
      },
      dailyBreakdown: dailyWithProfit,
      categoryBreakdown: categoryWithMargin,
      paymentMethodBreakdown: paymentWithPercentage
    };
  }

  /**
   * Generate comprehensive inventory report
   */
  async generateInventoryReport(dateRange: DateRange): Promise<InventoryReport> {
    const db = getDatabase();
    
    this.logger.info('Generating inventory report', { dateRange });

    // Get summary data
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT p.id) as totalProducts,
        COUNT(DISTINCT CASE WHEN p.is_active = 1 THEN p.id END) as activeProducts,
        COALESCE(SUM(ps.current_quantity * COALESCE(p.cost, 0)), 0) as totalValue,
        COALESCE(AVG(ps.current_quantity * COALESCE(p.cost, 0)), 0) as averageValue,
        COUNT(CASE WHEN ps.current_quantity <= COALESCE(p.reorder_level, 0) THEN 1 END) as lowStockCount,
        COUNT(CASE WHEN ps.current_quantity <= 0 THEN 1 END) as outOfStockCount
      FROM products p
      LEFT JOIN product_stock ps ON p.id = ps.product_id
    `;

    const summary = db.prepare(summaryQuery).get() as {
      totalProducts: number;
      activeProducts: number;
      totalValue: number;
      averageValue: number;
      lowStockCount: number;
      outOfStockCount: number;
    };

    // Get top products by sales
    const topProductsQuery = `
      SELECT 
        p.id as productId,
        p.sku,
        p.name_en as name,
        COALESCE(SUM(il.qty), 0) as quantitySold,
        COALESCE(SUM(il.total), 0) as revenue,
        COALESCE(SUM(il.qty * COALESCE(p.cost, 0)), 0) as cost
      FROM products p
      LEFT JOIN invoice_lines il ON p.id = il.product_id
      LEFT JOIN invoices i ON il.invoice_id = i.id
      WHERE DATE(i.created_at) BETWEEN ? AND ?
      GROUP BY p.id, p.sku, p.name_en
      ORDER BY revenue DESC
      LIMIT 20
    `;

    const topProducts = db.prepare(topProductsQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      productId: number;
      sku: string;
      name: string;
      quantitySold: number;
      revenue: number;
      cost: number;
    }>;

    const topProductsWithMargin = topProducts.map(product => ({
      ...product,
      margin: product.revenue - product.cost,
      marginPercent: product.revenue > 0 ? ((product.revenue - product.cost) / product.revenue) * 100 : 0
    }));

    // Get low stock products
    const lowStockQuery = `
      SELECT 
        p.id as productId,
        p.sku,
        p.name_en as name,
        COALESCE(ps.current_quantity, 0) as currentQuantity,
        COALESCE(p.reorder_level, 0) as reorderLevel,
        COALESCE(c.name, 'Uncategorized') as category,
        COALESCE(ps.current_quantity * COALESCE(p.cost, 0), 0) as value
      FROM products p
      LEFT JOIN product_stock ps ON p.id = ps.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 
        AND (COALESCE(ps.current_quantity, 0) <= COALESCE(p.reorder_level, 0) 
             OR COALESCE(ps.current_quantity, 0) = 0)
      ORDER BY COALESCE(ps.current_quantity, 0) ASC
    `;

    const lowStockProducts = db.prepare(lowStockQuery).all() as Array<{
      productId: number;
      sku: string;
      name: string;
      currentQuantity: number;
      reorderLevel: number;
      category: string;
      value: number;
    }>;

    // Get category analysis
    const categoryQuery = `
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        COUNT(DISTINCT p.id) as productCount,
        COALESCE(SUM(ps.current_quantity * COALESCE(p.cost, 0)), 0) as totalValue,
        COALESCE(AVG(ps.current_quantity * COALESCE(p.cost, 0)), 0) as averageValue,
        COUNT(CASE WHEN ps.current_quantity <= COALESCE(p.reorder_level, 0) THEN 1 END) as lowStockCount
      FROM products p
      LEFT JOIN product_stock ps ON p.id = ps.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      GROUP BY c.id, c.name
      ORDER BY totalValue DESC
    `;

    const categoryAnalysis = db.prepare(categoryQuery).all() as Array<{
      category: string;
      productCount: number;
      totalValue: number;
      averageValue: number;
      lowStockCount: number;
    }>;

    // Get movement analysis
    const movementQuery = `
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN delta_qty > 0 THEN delta_qty ELSE 0 END) as incoming,
        SUM(CASE WHEN delta_qty < 0 THEN ABS(delta_qty) ELSE 0 END) as outgoing,
        SUM(delta_qty) as netMovement,
        SUM(ABS(delta_qty) * COALESCE(unit_cost_cents, 0) / 100) as totalValue
      FROM stock_ledger
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const movementAnalysis = db.prepare(movementQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      date: string;
      incoming: number;
      outgoing: number;
      netMovement: number;
      totalValue: number;
    }>;

    return {
      period: dateRange,
      summary,
      topProducts: topProductsWithMargin,
      lowStockProducts,
      categoryAnalysis,
      movementAnalysis
    };
  }

  /**
   * Generate customer analytics report
   */
  async generateCustomerReport(dateRange: DateRange): Promise<CustomerReport> {
    const db = getDatabase();
    
    this.logger.info('Generating customer report', { dateRange });

    // Get summary data
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as totalCustomers,
        COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN c.id END) as activeCustomers,
        COUNT(DISTINCT CASE WHEN DATE(c.created_at) BETWEEN ? AND ? THEN c.id END) as newCustomers,
        COALESCE(SUM(i.net), 0) as totalRevenue,
        COALESCE(AVG(i.net), 0) as averageOrderValue,
        COALESCE(COUNT(i.id) / NULLIF(COUNT(DISTINCT c.id), 0), 0) as averageOrdersPerCustomer
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id AND DATE(i.created_at) BETWEEN ? AND ?
    `;

    const summary = db.prepare(summaryQuery).get(
      dateRange.startDate, 
      dateRange.endDate, 
      dateRange.startDate, 
      dateRange.endDate
    ) as {
      totalCustomers: number;
      activeCustomers: number;
      newCustomers: number;
      totalRevenue: number;
      averageOrderValue: number;
      averageOrdersPerCustomer: number;
    };

    // Get top customers
    const topCustomersQuery = `
      SELECT 
        c.id as customerId,
        c.customer_name as name,
        c.phone as email,
        COALESCE(SUM(i.net), 0) as totalSpent,
        COUNT(i.id) as orderCount,
        COALESCE(AVG(i.net), 0) as averageOrderValue,
        MAX(i.created_at) as lastOrderDate
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      WHERE DATE(i.created_at) BETWEEN ? AND ?
      GROUP BY c.id, c.customer_name, c.phone
      ORDER BY totalSpent DESC
      LIMIT 20
    `;

    const topCustomers = db.prepare(topCustomersQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      customerId: number;
      name: string;
      email: string;
      totalSpent: number;
      orderCount: number;
      averageOrderValue: number;
      lastOrderDate: string;
    }>;

    // Get customer segments
    const segmentsQuery = `
      SELECT 
        CASE 
          WHEN COALESCE(SUM(i.net), 0) >= 1000 THEN 'High Value'
          WHEN COALESCE(SUM(i.net), 0) >= 500 THEN 'Medium Value'
          WHEN COALESCE(SUM(i.net), 0) > 0 THEN 'Low Value'
          ELSE 'Inactive'
        END as segment,
        COUNT(DISTINCT c.id) as count,
        COALESCE(SUM(i.net), 0) as totalRevenue,
        COALESCE(AVG(i.net), 0) as averageOrderValue
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id AND DATE(i.created_at) BETWEEN ? AND ?
      GROUP BY c.id
    `;

    const segments = db.prepare(segmentsQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      segment: string;
      count: number;
      totalRevenue: number;
      averageOrderValue: number;
    }>;

    // Group by segment
    const customerSegments = segments.reduce((acc, row) => {
      const existing = acc.find(s => s.segment === row.segment);
      if (existing) {
        existing.count += row.count;
        existing.totalRevenue += row.totalRevenue;
        existing.averageOrderValue = (existing.averageOrderValue + row.averageOrderValue) / 2;
      } else {
        acc.push({
          segment: row.segment,
          count: row.count,
          totalRevenue: row.totalRevenue,
          averageOrderValue: row.averageOrderValue
        });
      }
      return acc;
    }, [] as Array<{
      segment: string;
      count: number;
      totalRevenue: number;
      averageOrderValue: number;
    }>);

    // Get customer growth
    const growthQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as newCustomers
      FROM customers
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const growth = db.prepare(growthQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      date: string;
      newCustomers: number;
    }>;

    // Calculate cumulative customers
    let totalCustomers = 0;
    const customerGrowth = growth.map(day => {
      totalCustomers += day.newCustomers;
      return {
        date: day.date,
        newCustomers: day.newCustomers,
        totalCustomers
      };
    });

    return {
      period: dateRange,
      summary,
      topCustomers,
      customerSegments,
      customerGrowth
    };
  }

  /**
   * Generate performance analytics report
   */
  async generatePerformanceReport(dateRange: DateRange): Promise<PerformanceReport> {
    const db = getDatabase();
    
    this.logger.info('Generating performance report', { dateRange });

    // Get summary data
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(net), 0) as totalSales,
        COUNT(*) as totalTransactions,
        COALESCE(AVG(net), 0) as averageTransactionValue
      FROM invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
    `;

    const summary = db.prepare(summaryQuery).get(dateRange.startDate, dateRange.endDate) as {
      totalSales: number;
      totalTransactions: number;
      averageTransactionValue: number;
    };

    // Get peak hour
    const peakHourQuery = `
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as transactions,
        SUM(net) as revenue
      FROM invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY strftime('%H', created_at)
      ORDER BY transactions DESC
      LIMIT 1
    `;

    const peakHour = db.prepare(peakHourQuery).get(dateRange.startDate, dateRange.endDate) as {
      hour: string;
      transactions: number;
      revenue: number;
    };

    // Get peak day
    const peakDayQuery = `
      SELECT 
        strftime('%w', created_at) as day,
        COUNT(*) as transactions,
        SUM(net) as revenue
      FROM invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY strftime('%w', created_at)
      ORDER BY transactions DESC
      LIMIT 1
    `;

    const peakDay = db.prepare(peakDayQuery).get(dateRange.startDate, dateRange.endDate) as {
      day: string;
      transactions: number;
      revenue: number;
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Get busiest terminal
    const busiestTerminalQuery = `
      SELECT 
        COALESCE(terminal_name, 'Unknown') as terminal,
        COUNT(*) as transactions,
        SUM(net) as revenue
      FROM invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY terminal_name
      ORDER BY transactions DESC
      LIMIT 1
    `;

    const busiestTerminal = db.prepare(busiestTerminalQuery).get(dateRange.startDate, dateRange.endDate) as {
      terminal: string;
      transactions: number;
      revenue: number;
    };

    // Get hourly analysis
    const hourlyQuery = `
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as transactions,
        SUM(net) as revenue,
        AVG(net) as averageValue
      FROM invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY strftime('%H', created_at)
      ORDER BY hour
    `;

    const hourlyAnalysis = db.prepare(hourlyQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      hour: number;
      transactions: number;
      revenue: number;
      averageValue: number;
    }>;

    // Get daily analysis
    const dailyQuery = `
      SELECT 
        strftime('%w', created_at) as day,
        COUNT(*) as transactions,
        SUM(net) as revenue,
        AVG(net) as averageValue
      FROM invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY strftime('%w', created_at)
      ORDER BY day
    `;

    const dailyAnalysis = db.prepare(dailyQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      day: string;
      transactions: number;
      revenue: number;
      averageValue: number;
    }>;

    const dailyWithNames = dailyAnalysis.map(day => ({
      day: dayNames[parseInt(day.day)],
      transactions: day.transactions,
      revenue: day.revenue,
      averageValue: day.averageValue
    }));

    // Get terminal performance
    const terminalQuery = `
      SELECT 
        COALESCE(terminal_name, 'Unknown') as terminalName,
        COUNT(*) as transactions,
        SUM(net) as revenue,
        AVG(net) as averageValue
      FROM invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY terminal_name
      ORDER BY transactions DESC
    `;

    const terminalPerformance = db.prepare(terminalQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      terminalName: string;
      transactions: number;
      revenue: number;
      averageValue: number;
    }>;

    // Add uptime calculation (simplified)
    const terminalWithUptime = terminalPerformance.map(terminal => ({
      ...terminal,
      uptime: 95 // Simplified - in real implementation, calculate based on actual uptime data
    }));

    // Get cashier performance
    const cashierQuery = `
      SELECT 
        i.cashier_id,
        COALESCE(u.name, 'Unknown') as cashierName,
        COUNT(*) as transactions,
        SUM(i.net) as revenue,
        AVG(i.net) as averageValue
      FROM invoices i
      LEFT JOIN users u ON i.cashier_id = u.id
      WHERE DATE(i.created_at) BETWEEN ? AND ?
      GROUP BY i.cashier_id, u.name
      ORDER BY transactions DESC
    `;

    const cashierPerformance = db.prepare(cashierQuery).all(dateRange.startDate, dateRange.endDate) as Array<{
      cashierId: number;
      cashierName: string;
      transactions: number;
      revenue: number;
      averageValue: number;
    }>;

    // Add efficiency calculation (simplified)
    const cashierWithEfficiency = cashierPerformance.map(cashier => ({
      ...cashier,
      efficiency: Math.min(100, (cashier.transactions / Math.max(...cashierPerformance.map(c => c.transactions))) * 100)
    }));

    return {
      period: dateRange,
      summary: {
        totalSales: summary.totalSales,
        totalTransactions: summary.totalTransactions,
        averageTransactionValue: summary.averageTransactionValue,
        peakHour: peakHour?.hour || 'N/A',
        peakDay: peakDay ? dayNames[parseInt(peakDay.day)] : 'N/A',
        busiestTerminal: busiestTerminal?.terminal || 'N/A'
      },
      hourlyAnalysis,
      dailyAnalysis: dailyWithNames,
      terminalPerformance: terminalWithUptime,
      cashierPerformance: cashierWithEfficiency
    };
  }
}

// Export singleton instance
export const advancedReportsService = new AdvancedReportsService();










