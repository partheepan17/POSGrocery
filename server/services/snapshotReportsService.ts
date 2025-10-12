/**
 * Daily Snapshot Reports Service
 * Generates comprehensive reports from daily stock snapshots
 */

import { getDatabase } from '../db';
import { createRequestLogger } from '../utils/logger';

const logger = createRequestLogger({} as any);

export interface SnapshotReport {
  report_id: string;
  report_type: 'DAILY_SUMMARY' | 'TREND_ANALYSIS' | 'CATEGORY_BREAKDOWN' | 'SUPPLIER_ANALYSIS' | 'VALUATION_COMPARISON';
  report_date: string;
  generated_at: string;
  data: any;
  summary: {
    total_products: number;
    total_value_cents: number;
    products_with_stock: number;
    products_out_of_stock: number;
    products_low_stock: number;
    average_stock_value: number;
    top_categories: Array<{ category_name: string; value_cents: number; product_count: number }>;
    top_products: Array<{ sku: string; name_en: string; value_cents: number; qty_on_hand: number }>;
  };
}

export interface TrendAnalysis {
  period: string;
  start_date: string;
  end_date: string;
  total_value_trend: Array<{ date: string; value_cents: number; product_count: number }>;
  category_trends: Array<{
    category_name: string;
    trend_data: Array<{ date: string; value_cents: number; product_count: number }>;
  }>;
  stock_movements: Array<{
    product_sku: string;
    product_name: string;
    start_qty: number;
    end_qty: number;
    qty_change: number;
    value_change_cents: number;
  }>;
}

export interface CategoryBreakdown {
  category_name: string;
  product_count: number;
  total_value_cents: number;
  avg_value_per_product: number;
  products: Array<{
    sku: string;
    name_en: string;
    qty_on_hand: number;
    value_cents: number;
    percentage_of_category: number;
  }>;
}

export class SnapshotReportsService {
  private get db() { return getDatabase(); }

  /**
   * Generate daily summary report
   */
  generateDailySummaryReport(date: string): SnapshotReport {
    const snapshotData = this.db.prepare(`
      SELECT 
        s.*,
        c.name as category_name
      FROM stock_snapshots s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.snapshot_date = ?
      ORDER BY s.value_cents DESC
    `).all(date) as any[];

    if (snapshotData.length === 0) {
      throw new Error(`No snapshot data found for date ${date}`);
    }

    const totalValue = snapshotData.reduce((sum, item) => sum + item.value_cents, 0);
    const productsWithStock = snapshotData.filter(item => item.qty_on_hand > 0).length;
    const productsOutOfStock = snapshotData.filter(item => item.qty_on_hand === 0).length;
    const productsLowStock = snapshotData.filter(item => item.qty_on_hand > 0 && item.qty_on_hand <= 10).length;

    // Group by category
    const categoryGroups = snapshotData.reduce((groups, item) => {
      const category = item.category_name || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = { value_cents: 0, product_count: 0, products: [] };
      }
      groups[category].value_cents += item.value_cents;
      groups[category].product_count += 1;
      groups[category].products.push(item);
      return groups;
    }, {} as Record<string, any>);

    const topCategories = Object.entries(categoryGroups)
      .map(([category_name, data]: [string, any]) => ({
        category_name,
        value_cents: data.value_cents,
        product_count: data.product_count
      }))
      .sort((a, b) => b.value_cents - a.value_cents)
      .slice(0, 10);

    const topProducts = snapshotData
      .slice(0, 20)
      .map(item => ({
        sku: item.sku,
        name_en: item.name_en,
        value_cents: item.value_cents,
        qty_on_hand: item.qty_on_hand
      }));

    const report: SnapshotReport = {
      report_id: `daily-summary-${date}`,
      report_type: 'DAILY_SUMMARY',
      report_date: date,
      generated_at: new Date().toISOString(),
      data: {
        snapshot_data: snapshotData,
        category_breakdown: categoryGroups
      },
      summary: {
        total_products: snapshotData.length,
        total_value_cents: totalValue,
        products_with_stock: productsWithStock,
        products_out_of_stock: productsOutOfStock,
        products_low_stock: productsLowStock,
        average_stock_value: totalValue / snapshotData.length,
        top_categories: topCategories,
        top_products: topProducts
      }
    };

    logger.info({
      report_id: report.report_id,
      date,
      total_products: snapshotData.length,
      total_value: totalValue
    }, 'Daily summary report generated');

    return report;
  }

  /**
   * Generate trend analysis report
   */
  generateTrendAnalysisReport(startDate: string, endDate: string): TrendAnalysis {
    const snapshots = this.db.prepare(`
      SELECT 
        s.snapshot_date,
        s.product_id,
        s.sku,
        s.name_en,
        s.qty_on_hand,
        s.value_cents,
        c.name as category_name
      FROM stock_snapshots s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.snapshot_date >= ? AND s.snapshot_date <= ?
      ORDER BY s.snapshot_date, s.value_cents DESC
    `).all(startDate, endDate) as any[];

    if (snapshots.length === 0) {
      throw new Error(`No snapshot data found for period ${startDate} to ${endDate}`);
    }

    // Group by date
    const dailyGroups = snapshots.reduce((groups: Record<string, any[]>, item: any) => {
      if (!groups[item.snapshot_date]) {
        groups[item.snapshot_date] = [];
      }
      groups[item.snapshot_date].push(item);
      return groups;
    }, {} as Record<string, any[]>);

    const totalValueTrend = Object.entries(dailyGroups)
      .map(([date, items]: [string, any[]]) => ({
        date,
        value_cents: items.reduce((sum: number, item: any) => sum + item.value_cents, 0),
        product_count: items.length
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Group by category for trends
    const categoryGroups = snapshots.reduce((groups: Record<string, Record<string, any[]>>, item: any) => {
      const category = item.category_name || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = {};
      }
      if (!groups[category][item.snapshot_date]) {
        groups[category][item.snapshot_date] = [];
      }
      groups[category][item.snapshot_date].push(item);
      return groups;
    }, {} as Record<string, Record<string, any[]>>);

    const categoryTrends = Object.entries(categoryGroups)
      .map(([category_name, dailyData]: [string, any]) => ({
        category_name,
        trend_data: Object.entries(dailyData as Record<string, any[]>)
          .map(([date, items]: [string, any[]]) => ({
            date,
            value_cents: items.reduce((sum: number, item: any) => sum + item.value_cents, 0),
            product_count: items.length
          }))
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
      }))
      .filter((trend: any) => trend.trend_data.length > 0);

    // Calculate stock movements for each product
    const productMovements = new Map<string, any>();
    
    snapshots.forEach((item: any) => {
      const key = `${item.product_id}-${item.sku}`;
      if (!productMovements.has(key)) {
        productMovements.set(key, {
          product_sku: item.sku,
          product_name: item.name_en,
          movements: []
        });
      }
      productMovements.get(key).movements.push({
        date: item.snapshot_date,
        qty_on_hand: item.qty_on_hand,
        value_cents: item.value_cents
      });
    });

    const stockMovements = Array.from(productMovements.values())
      .map((product: any) => {
        const movements = product.movements.sort((a: any, b: any) => a.date.localeCompare(b.date));
        const startQty = movements[0]?.qty_on_hand || 0;
        const endQty = movements[movements.length - 1]?.qty_on_hand || 0;
        const startValue = movements[0]?.value_cents || 0;
        const endValue = movements[movements.length - 1]?.value_cents || 0;

        return {
          product_sku: product.product_sku,
          product_name: product.product_name,
          start_qty: startQty,
          end_qty: endQty,
          qty_change: endQty - startQty,
          value_change_cents: endValue - startValue
        };
      })
      .filter((movement: any) => movement.qty_change !== 0 || movement.value_change_cents !== 0)
      .sort((a: any, b: any) => Math.abs(b.value_change_cents) - Math.abs(a.value_change_cents))
      .slice(0, 50);

    const trendAnalysis: TrendAnalysis = {
      period: `${startDate} to ${endDate}`,
      start_date: startDate,
      end_date: endDate,
      total_value_trend: totalValueTrend,
      category_trends: categoryTrends,
      stock_movements: stockMovements
    };

    logger.info({
      start_date: startDate,
      end_date: endDate,
      total_value_trend_points: totalValueTrend.length,
      category_trends_count: categoryTrends.length,
      stock_movements_count: stockMovements.length
    }, 'Trend analysis report generated');

    return trendAnalysis;
  }

  /**
   * Generate category breakdown report
   */
  generateCategoryBreakdownReport(date: string): CategoryBreakdown[] {
    const snapshotData = this.db.prepare(`
      SELECT 
        s.*,
        c.name as category_name
      FROM stock_snapshots s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.snapshot_date = ?
      ORDER BY s.value_cents DESC
    `).all(date) as any[];

    if (snapshotData.length === 0) {
      throw new Error(`No snapshot data found for date ${date}`);
    }

    // Group by category
    const categoryGroups = snapshotData.reduce((groups: Record<string, any[]>, item: any) => {
      const category = item.category_name || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as Record<string, any[]>);

    const categoryBreakdowns = Object.entries(categoryGroups)
      .map(([category_name, products]: [string, any[]]) => {
        const totalValue = products.reduce((sum: number, item: any) => sum + item.value_cents, 0);
        const avgValuePerProduct = totalValue / products.length;

        const productsWithPercentages = products.map((item: any) => ({
          sku: item.sku,
          name_en: item.name_en,
          qty_on_hand: item.qty_on_hand,
          value_cents: item.value_cents,
          percentage_of_category: totalValue > 0 ? (item.value_cents / totalValue) * 100 : 0
        }));

        return {
          category_name,
          product_count: products.length,
          total_value_cents: totalValue,
          avg_value_per_product: avgValuePerProduct,
          products: productsWithPercentages
        };
      })
      .sort((a: any, b: any) => b.total_value_cents - a.total_value_cents);

    logger.info({
      date,
      categories_count: categoryBreakdowns.length,
      total_products: snapshotData.length
    }, 'Category breakdown report generated');

    return categoryBreakdowns;
  }

  /**
   * Generate valuation comparison report
   */
  generateValuationComparisonReport(date: string): any {
    const snapshotData = this.db.prepare(`
      SELECT 
        s.*,
        c.name as category_name
      FROM stock_snapshots s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.snapshot_date = ?
      ORDER BY s.value_cents DESC
    `).all(date) as any[];

    if (snapshotData.length === 0) {
      throw new Error(`No snapshot data found for date ${date}`);
    }

    // Group by valuation method
    const methodGroups = snapshotData.reduce((groups: Record<string, any[]>, item: any) => {
      const method = item.valuation_method || 'AVERAGE';
      if (!groups[method]) {
        groups[method] = [];
      }
      groups[method].push(item);
      return groups;
    }, {} as Record<string, any[]>);

    const methodComparisons = Object.entries(methodGroups)
      .map(([method, products]: [string, any[]]) => {
        const totalValue = products.reduce((sum: number, item: any) => sum + item.value_cents, 0);
        const avgValuePerProduct = totalValue / products.length;
        const productsWithStock = products.filter((item: any) => item.qty_on_hand > 0).length;
        const productsOutOfStock = products.filter((item: any) => item.qty_on_hand === 0).length;

        return {
          method,
          total_products: products.length,
          total_value_cents: totalValue,
          avg_value_per_product: avgValuePerProduct,
          products_with_stock: productsWithStock,
          products_out_of_stock: productsOutOfStock,
          products: products.slice(0, 10) // Top 10 products for this method
        };
      })
      .sort((a: any, b: any) => b.total_value_cents - a.total_value_cents);

    const comparison = {
      report_date: date,
      generated_at: new Date().toISOString(),
      method_comparisons: methodComparisons,
      summary: {
        total_products: snapshotData.length,
        methods_compared: methodComparisons.length,
        highest_value_method: methodComparisons[0]?.method || 'N/A',
        value_difference: methodComparisons.length > 1 
          ? methodComparisons[0].total_value_cents - methodComparisons[1].total_value_cents
          : 0
      }
    };

    logger.info({
      date,
      methods_compared: methodComparisons.length,
      total_products: snapshotData.length
    }, 'Valuation comparison report generated');

    return comparison;
  }

  /**
   * Generate comprehensive report combining all report types
   */
  generateComprehensiveReport(date: string): any {
    const dailySummary = this.generateDailySummaryReport(date);
    const categoryBreakdown = this.generateCategoryBreakdownReport(date);
    
    // Get trend data for last 30 days
    const trendStartDate = new Date(date);
    trendStartDate.setDate(trendStartDate.getDate() - 30);
    const trendAnalysis = this.generateTrendAnalysisReport(
      trendStartDate.toISOString().split('T')[0],
      date
    );

    const comprehensiveReport = {
      report_id: `comprehensive-${date}`,
      report_type: 'COMPREHENSIVE',
      report_date: date,
      generated_at: new Date().toISOString(),
      daily_summary: dailySummary,
      category_breakdown: categoryBreakdown,
      trend_analysis: trendAnalysis,
      metadata: {
        generated_by: 'snapshot-reports-service',
        version: '1.0.0',
        data_sources: ['stock_snapshots', 'categories', 'products']
      }
    };

    logger.info({
      report_id: comprehensiveReport.report_id,
      date,
      sections: ['daily_summary', 'category_breakdown', 'trend_analysis']
    }, 'Comprehensive report generated');

    return comprehensiveReport;
  }

  /**
   * Get available report dates
   */
  getAvailableReportDates(): string[] {
    const dates = this.db.prepare(`
      SELECT DISTINCT snapshot_date
      FROM stock_snapshots
      ORDER BY snapshot_date DESC
    `).all() as { snapshot_date: string }[];

    return dates.map(d => d.snapshot_date);
  }

  /**
   * Export report to JSON
   */
  exportReportToJSON(report: any): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report to CSV (simplified)
   */
  exportReportToCSV(report: SnapshotReport): string {
    const headers = ['SKU', 'Product Name', 'Category', 'Quantity', 'Value (LKR)', 'Unit'];
    const rows = report.data.snapshot_data.map((item: any) => [
      item.sku,
      item.name_en,
      item.category_name || 'Uncategorized',
      item.qty_on_hand,
      (item.value_cents / 100).toFixed(2),
      item.unit
    ]);

    return [headers, ...rows]
      .map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(','))
      .join('\n');
  }
}

export const snapshotReportsService = new SnapshotReportsService();
