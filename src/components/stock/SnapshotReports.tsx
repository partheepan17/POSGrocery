/**
 * Snapshot Reports Component
 * Displays comprehensive reports from daily stock snapshots
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  BarChart3, 
  TrendingUp, 
  Calendar,
  RefreshCw,
  Filter,
  Eye,
  FileSpreadsheet,
  PieChart,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dropdown, DropdownMenu, DropdownItem } from '@/components/ui/Dropdown';

interface ReportSummary {
  total_products: number;
  total_value_cents: number;
  products_with_stock: number;
  products_out_of_stock: number;
  products_low_stock: number;
  average_stock_value: number;
  top_categories: Array<{ category_name: string; value_cents: number; product_count: number }>;
  top_products: Array<{ sku: string; name_en: string; value_cents: number; qty_on_hand: number }>;
}

interface TrendData {
  date: string;
  value_cents: number;
  product_count: number;
}

interface CategoryBreakdown {
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

interface DashboardData {
  date: string;
  generated_at: string;
  summary: ReportSummary;
  top_categories: CategoryBreakdown[];
  recent_trends: TrendData[];
  stock_alerts: {
    low_stock: number;
    out_of_stock: number;
    total_alerts: number;
  };
}

export function SnapshotReports() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'trends' | 'categories' | 'export'>('dashboard');

  // Load data
  useEffect(() => {
    loadAvailableDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadDashboardData(selectedDate);
    }
  }, [selectedDate]);

  const loadAvailableDates = async () => {
    try {
      // In a real implementation, this would be an API call
      // For now, we'll use mock data
      const mockDates = [
        '2025-10-12',
        '2025-10-11',
        '2025-10-10',
        '2025-10-09',
        '2025-10-08'
      ];
      
      setAvailableDates(mockDates);
      if (mockDates.length > 0) {
        setSelectedDate(mockDates[0]);
      }
    } catch (error) {
      console.error('Failed to load available dates:', error);
    }
  };

  const loadDashboardData = async (date: string) => {
    try {
      setLoading(true);
      
      // In a real implementation, this would be an API call
      // For now, we'll use mock data
      const mockDashboardData: DashboardData = {
        date,
        generated_at: '2025-10-12T14:30:00Z',
        summary: {
          total_products: 150,
          total_value_cents: 1250000,
          products_with_stock: 142,
          products_out_of_stock: 8,
          products_low_stock: 15,
          average_stock_value: 8333.33,
          top_categories: [
            { category_name: 'Grains', value_cents: 450000, product_count: 25 },
            { category_name: 'Dairy', value_cents: 320000, product_count: 18 },
            { category_name: 'Vegetables', value_cents: 280000, product_count: 35 },
            { category_name: 'Meat', value_cents: 200000, product_count: 12 }
          ],
          top_products: [
            { sku: 'RICE001', name_en: 'Basmati Rice 5kg', value_cents: 25000, qty_on_hand: 50 },
            { sku: 'MILK001', name_en: 'Fresh Milk 1L', value_cents: 18000, qty_on_hand: 120 },
            { sku: 'VEG001', name_en: 'Tomatoes 1kg', value_cents: 15000, qty_on_hand: 80 }
          ]
        },
        top_categories: [
          {
            category_name: 'Grains',
            product_count: 25,
            total_value_cents: 450000,
            avg_value_per_product: 18000,
            products: [
              { sku: 'RICE001', name_en: 'Basmati Rice 5kg', qty_on_hand: 50, value_cents: 25000, percentage_of_category: 5.56 },
              { sku: 'RICE002', name_en: 'White Rice 1kg', qty_on_hand: 100, value_cents: 20000, percentage_of_category: 4.44 }
            ]
          }
        ],
        recent_trends: [
          { date: '2025-10-06', value_cents: 1200000, product_count: 148 },
          { date: '2025-10-07', value_cents: 1220000, product_count: 149 },
          { date: '2025-10-08', value_cents: 1210000, product_count: 147 },
          { date: '2025-10-09', value_cents: 1230000, product_count: 150 },
          { date: '2025-10-10', value_cents: 1240000, product_count: 151 },
          { date: '2025-10-11', value_cents: 1245000, product_count: 150 },
          { date: '2025-10-12', value_cents: 1250000, product_count: 150 }
        ],
        stock_alerts: {
          low_stock: 15,
          out_of_stock: 8,
          total_alerts: 23
        }
      };

      setDashboardData(mockDashboardData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportReport = async (format: 'json' | 'csv') => {
    try {
      // In a real implementation, this would trigger a download
      console.log(`Exporting report for ${selectedDate} in ${format} format`);
      // Simulate download
      const link = document.createElement('a');
      link.href = `#export-${selectedDate}-${format}`;
      link.download = `snapshot-report-${selectedDate}.${format}`;
      link.click();
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Snapshot Reports & Analytics</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Dropdown>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  {selectedDate || 'Select Date'}
                </Button>
                <DropdownMenu>
                  {availableDates.map(date => (
                    <DropdownItem
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={selectedDate === date ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    >
                      {formatDate(date)}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDashboardData(selectedDate)}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-1">
            <Button
              variant={activeView === 'dashboard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('dashboard')}
            >
              <Activity className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={activeView === 'trends' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('trends')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Trends
            </Button>
            <Button
              variant={activeView === 'categories' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('categories')}
            >
              <PieChart className="w-4 h-4 mr-2" />
              Categories
            </Button>
            <Button
              variant={activeView === 'export' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('export')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard View */}
      {activeView === 'dashboard' && dashboardData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dashboardData.summary.total_products}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(dashboardData.summary.total_value_cents)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stock Alerts</p>
                    <p className="text-2xl font-bold text-red-600">
                      {dashboardData.stock_alerts.total_alerts}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-red-500" />
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Low: {dashboardData.stock_alerts.low_stock} | Out: {dashboardData.stock_alerts.out_of_stock}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Value</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(dashboardData.summary.average_stock_value)}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Top Categories by Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.summary.top_categories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{category.category_name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{category.product_count} products</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(category.value_cents)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {((category.value_cents / dashboardData.summary.total_value_cents) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Value Trend (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.recent_trends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(trend.date)}
                    </span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">
                        {formatCurrency(trend.value_cents)}
                      </span>
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${(trend.value_cents / Math.max(...dashboardData.recent_trends.map(t => t.value_cents))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export View */}
      {activeView === 'export' && (
        <Card>
          <CardHeader>
            <CardTitle>Export Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => exportReport('json')}
                  className="flex items-center space-x-2 h-12"
                >
                  <FileText className="w-5 h-5" />
                  <span>Export as JSON</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportReport('csv')}
                  className="flex items-center space-x-2 h-12"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>Export as CSV</span>
                </Button>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>Available export formats:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>JSON:</strong> Complete report data in JSON format</li>
                  <li><strong>CSV:</strong> Product data in spreadsheet format</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other views would be implemented similarly */}
      {activeView === 'trends' && (
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Trends analysis view coming soon</p>
          </CardContent>
        </Card>
      )}

      {activeView === 'categories' && (
        <Card>
          <CardContent className="p-6 text-center">
            <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Category breakdown view coming soon</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
