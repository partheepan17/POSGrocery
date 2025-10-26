import { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';

export interface DashboardTile {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
  color?: string;
}

export interface SalesChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}

export interface TopSKUData {
  sku: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface DashboardData {
  tiles: {
    todaySales: DashboardTile;
    transactions: DashboardTile;
    avgBasket: DashboardTile;
    grossMargin: DashboardTile;
    lowStockCount: DashboardTile;
  };
  charts: {
    sales7Day: SalesChartData;
    top5SKUs: TopSKUData[];
  };
  loading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    tiles: {
      todaySales: { title: 'Today Sales', value: 0, change: 0, changeType: 'neutral' },
      transactions: { title: 'Transactions', value: 0, change: 0, changeType: 'neutral' },
      avgBasket: { title: 'Avg Basket', value: 0, change: 0, changeType: 'neutral' },
      grossMargin: { title: 'Gross Margin', value: '0%', change: 0, changeType: 'neutral' },
      lowStockCount: { title: 'Low Stock', value: 0, change: 0, changeType: 'neutral' },
    },
    charts: {
      sales7Day: {
        labels: [],
        datasets: [{
          label: 'Sales',
          data: [],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }]
      },
      top5SKUs: []
    },
    loading: true,
    error: null
  });

  const fetchDashboardData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch today's sales data
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Mock data - replace with actual API calls
      const todaySales = await fetchTodaySales(todayStart, todayEnd);
      const transactions = await fetchTransactions(todayStart, todayEnd);
      const avgBasket = await fetchAverageBasket(todayStart, todayEnd);
      const grossMargin = await fetchGrossMargin(todayStart, todayEnd);
      const lowStockCount = await fetchLowStockCount();
      const sales7Day = await fetch7DaySales();
      const top5SKUs = await fetchTop5SKUs();

      setData({
        tiles: {
          todaySales: {
            title: 'Today Sales',
            value: todaySales.amount,
            change: todaySales.change,
            changeType: todaySales.change > 0 ? 'positive' : todaySales.change < 0 ? 'negative' : 'neutral',
            icon: '💰',
            color: 'green'
          },
          transactions: {
            title: 'Transactions',
            value: transactions.count,
            change: transactions.change,
            changeType: transactions.change > 0 ? 'positive' : transactions.change < 0 ? 'negative' : 'neutral',
            icon: '🛒',
            color: 'blue'
          },
          avgBasket: {
            title: 'Avg Basket',
            value: avgBasket.amount,
            change: avgBasket.change,
            changeType: avgBasket.change > 0 ? 'positive' : avgBasket.change < 0 ? 'negative' : 'neutral',
            icon: '📊',
            color: 'purple'
          },
          grossMargin: {
            title: 'Gross Margin',
            value: `${grossMargin.percentage}%`,
            change: grossMargin.change,
            changeType: grossMargin.change > 0 ? 'positive' : grossMargin.change < 0 ? 'negative' : 'neutral',
            icon: '📈',
            color: 'orange'
          },
          lowStockCount: {
            title: 'Low Stock',
            value: lowStockCount.count,
            change: lowStockCount.change,
            changeType: lowStockCount.change > 0 ? 'negative' : lowStockCount.change < 0 ? 'positive' : 'neutral',
            icon: '⚠️',
            color: 'red'
          }
        },
        charts: {
          sales7Day,
          top5SKUs
        },
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data'
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    ...data,
    refetch: fetchDashboardData
  };
}

// Mock API functions - replace with actual API calls
async function fetchTodaySales(start: Date, end: Date) {
  // Mock implementation
  return {
    amount: 125000,
    change: 12.5
  };
}

async function fetchTransactions(start: Date, end: Date) {
  // Mock implementation
  return {
    count: 45,
    change: 8.2
  };
}

async function fetchAverageBasket(start: Date, end: Date) {
  // Mock implementation
  return {
    amount: 2778,
    change: -2.1
  };
}

async function fetchGrossMargin(start: Date, end: Date) {
  // Mock implementation
  return {
    percentage: 28.5,
    change: 1.2
  };
}

async function fetchLowStockCount() {
  // Mock implementation
  return {
    count: 12,
    change: -3
  };
}

async function fetch7DaySales(): Promise<SalesChartData> {
  // Mock implementation
  const labels = [];
  const data = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    data.push(Math.floor(Math.random() * 50000) + 100000);
  }

  return {
    labels,
    datasets: [{
      label: 'Sales (රු)',
      data,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }]
  };
}

async function fetchTop5SKUs(): Promise<TopSKUData[]> {
  // Mock implementation
  return [
    { sku: 'SKU001', name: 'Rice 1kg', quantity: 150, revenue: 45000 },
    { sku: 'SKU002', name: 'Cooking Oil 500ml', quantity: 120, revenue: 36000 },
    { sku: 'SKU003', name: 'Sugar 1kg', quantity: 95, revenue: 28500 },
    { sku: 'SKU004', name: 'Milk 1L', quantity: 80, revenue: 24000 },
    { sku: 'SKU005', name: 'Bread Loaf', quantity: 75, revenue: 15000 }
  ];
}










