/**
 * Report Service - Client-side service for analytics and reporting
 * Provides hooks and utilities for accessing reporting endpoints
 */

import { apiGet } from './api';

// Type definitions for reporting data
export interface SalesSummaryReport {
  period: {
    start: string;
    end: string;
  };
  overall: {
    total_sales: number;
    total_revenue: number;
    total_gross: number;
    total_discounts: number;
    total_tax: number;
    avg_sale_amount: number;
    first_sale: string;
    last_sale: string;
  };
  daily: Array<{
    sale_date: string;
    total_sales: number;
    total_revenue: number;
    total_gross: number;
    total_discounts: number;
    total_tax: number;
    avg_sale_amount: number;
  }>;
  by_cashier: Array<{
    cashier_id: number;
    cashier_name: string;
    cashier_username: string;
    total_sales: number;
    total_revenue: number;
    avg_sale_amount: number;
    first_sale: string;
    last_sale: string;
  }>;
  by_payment_method: Array<{
    payment_method: string;
    total_sales: number;
    total_amount: number;
    avg_payment_amount: number;
    total_payments: number;
  }>;
}

export interface TopSKUsReport {
  period: {
    start: string;
    end: string;
  };
  limit: number;
  by_quantity: Array<{
    product_id: number;
    sku: string;
    product_name: string;
    product_name_si: string | null;
    product_name_ta: string | null;
    unit: string;
    total_quantity_sold: number;
    total_revenue: number;
    avg_selling_price: number;
    sales_count: number;
    total_cogs: number;
    total_gross_margin: number;
  }>;
  by_revenue: Array<{
    product_id: number;
    sku: string;
    product_name: string;
    product_name_si: string | null;
    product_name_ta: string | null;
    unit: string;
    total_quantity_sold: number;
    total_revenue: number;
    avg_selling_price: number;
    sales_count: number;
    total_cogs: number;
    total_gross_margin: number;
  }>;
  by_margin: Array<{
    product_id: number;
    sku: string;
    product_name: string;
    product_name_si: string | null;
    product_name_ta: string | null;
    unit: string;
    total_quantity_sold: number;
    total_revenue: number;
    avg_selling_price: number;
    sales_count: number;
    total_cogs: number;
    total_gross_margin: number;
  }>;
}

export interface LowStockReport {
  threshold: number;
  summary: {
    total_products_checked: number;
    low_stock_count: number;
    out_of_stock_count: number;
    below_reorder_count: number;
    threshold: number;
  };
  products: Array<{
    product_id: number;
    sku: string;
    product_name: string;
    product_name_si: string | null;
    product_name_ta: string | null;
    unit: string;
    reorder_level: number | null;
    current_stock: number;
    stock_value: number;
    unit_cost: number | null;
    stock_status: 'Out of Stock' | 'Below Reorder Level' | 'Low Stock' | 'Adequate Stock';
    last_movement_date: string;
  }>;
}

export interface ReportResponse<T> {
  ok: boolean;
  data: T;
  requestId: string;
}

class ReportService {
  /**
   * Get sales summary report
   */
  async getSalesSummary(startDate: string, endDate: string): Promise<SalesSummaryReport> {
    try {
      const response = await apiGet<SalesSummaryReport>(`/api/reports/sales-summary?start=${startDate}&end=${endDate}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sales summary');
      }

      return response.data!;
    } catch (error) {
      console.error('Failed to fetch sales summary:', error);
      throw error;
    }
  }

  /**
   * Get top SKUs report
   */
  async getTopSKUs(
    startDate: string,
    endDate: string,
    limit: number = 20
  ): Promise<TopSKUsReport> {
    try {
      const response = await apiGet<TopSKUsReport>(`/api/reports/top-skus?start=${startDate}&end=${endDate}&limit=${limit}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch top SKUs');
      }

      return response.data!;
    } catch (error) {
      console.error('Failed to fetch top SKUs:', error);
      throw error;
    }
  }

  /**
   * Get low stock report
   */
  async getLowStock(threshold: number = 10): Promise<LowStockReport> {
    try {
      const response = await apiGet<LowStockReport>(`/api/reports/low-stock?threshold=${threshold}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch low stock report');
      }

      return response.data!;
    } catch (error) {
      console.error('Failed to fetch low stock report:', error);
      throw error;
    }
  }

  /**
   * Get formatted currency value
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Get formatted percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Get formatted date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get formatted date and time
   */
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calculate margin percentage
   */
  calculateMarginPercentage(revenue: number, cogs: number): number {
    if (revenue === 0) return 0;
    return ((revenue - cogs) / revenue) * 100;
  }

  /**
   * Get stock status color class
   */
  getStockStatusColor(status: string): string {
    switch (status) {
      case 'Out of Stock':
        return 'text-red-600 bg-red-100';
      case 'Below Reorder Level':
        return 'text-orange-600 bg-orange-100';
      case 'Low Stock':
        return 'text-yellow-600 bg-yellow-100';
      case 'Adequate Stock':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Get stock status icon
   */
  getStockStatusIcon(status: string): string {
    switch (status) {
      case 'Out of Stock':
        return '❌';
      case 'Below Reorder Level':
        return '⚠️';
      case 'Low Stock':
        return '🟡';
      case 'Adequate Stock':
        return '✅';
      default:
        return '❓';
    }
  }
}

export const reportService = new ReportService();

// React hooks for reports (if using React Query or SWR)
export const useSalesSummary = (startDate: string, endDate: string) => {
  // This would be implemented with your preferred data fetching library
  // For now, returning a simple async function
  return {
    data: null,
    loading: false,
    error: null,
    refetch: () => reportService.getSalesSummary(startDate, endDate)
  };
};

export const useTopSKUs = (startDate: string, endDate: string, limit: number = 20) => {
  return {
    data: null,
    loading: false,
    error: null,
    refetch: () => reportService.getTopSKUs(startDate, endDate, limit)
  };
};

export const useLowStock = (threshold: number = 10) => {
  return {
    data: null,
    loading: false,
    error: null,
    refetch: () => reportService.getLowStock(threshold)
  };
};