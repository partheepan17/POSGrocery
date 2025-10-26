import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import { vi, describe, it, expect } from 'vitest';

// Mock the useDashboardData hook
vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    tiles: {
      todaySales: { title: 'Today Sales', value: 125000, change: 12.5, changeType: 'positive' },
      transactions: { title: 'Transactions', value: 45, change: 8.2, changeType: 'positive' },
      avgBasket: { title: 'Avg Basket', value: 2778, change: -2.1, changeType: 'negative' },
      grossMargin: { title: 'Gross Margin', value: '28.5%', change: 1.2, changeType: 'positive' },
      lowStockCount: { title: 'Low Stock', value: 12, change: -3, changeType: 'negative' },
    },
    charts: {
      sales7Day: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Sales (රු)',
          data: [100000, 120000, 110000, 130000, 125000, 140000, 150000],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }]
      },
      top5SKUs: [
        { sku: 'SKU001', name: 'Rice 1kg', quantity: 150, revenue: 45000 },
        { sku: 'SKU002', name: 'Cooking Oil 500ml', quantity: 120, revenue: 36000 },
        { sku: 'SKU003', name: 'Sugar 1kg', quantity: 95, revenue: 28500 },
        { sku: 'SKU004', name: 'Milk 1L', quantity: 80, revenue: 24000 },
        { sku: 'SKU005', name: 'Bread Loaf', quantity: 75, revenue: 15000 }
      ]
    },
    loading: false,
    error: null,
    refetch: vi.fn()
  })
}));

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard', () => {
  it('renders dashboard title', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders all dashboard tiles', () => {
    renderDashboard();
    
    expect(screen.getByText('Today Sales')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Avg Basket')).toBeInTheDocument();
    expect(screen.getByText('Gross Margin')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });

  it('renders chart titles', () => {
    renderDashboard();
    
    expect(screen.getByText('7-Day Sales Trend')).toBeInTheDocument();
    expect(screen.getByText('Top Selling Products')).toBeInTheDocument();
  });

  it('renders quick actions', () => {
    renderDashboard();
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('New Sale')).toBeInTheDocument();
    expect(screen.getByText('Receive Stock')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders top selling products', () => {
    renderDashboard();
    
    expect(screen.getByText('Top Selling Products')).toBeInTheDocument();
    expect(screen.getByText('Rice 1kg')).toBeInTheDocument();
    expect(screen.getByText('Cooking Oil 500ml')).toBeInTheDocument();
  });

  it('displays currency formatted values', () => {
    renderDashboard();
    
    // Check for currency formatting (LKR symbol)
    expect(screen.getByText(/LKR 125,000/)).toBeInTheDocument();
    expect(screen.getByText(/LKR 2,778/)).toBeInTheDocument();
  });

  it('shows change indicators', () => {
    renderDashboard();
    
    // Check for positive/negative change indicators
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('-2.1%')).toBeInTheDocument();
  });
});

