import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, Package, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TopSKUsReport } from '@/services/reportService';
import { exportTopSKUsData } from '@/utils/csvExport';

interface TopSKUsWidgetProps {
  data: TopSKUsReport | null;
  loading: boolean;
  error: string | null;
}

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export function TopSKUsWidget({ data, loading, error }: TopSKUsWidgetProps) {
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue' | 'margin'>('quantity');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'revenue' || name === 'avgPrice' || name === 'cogs' || name === 'margin') {
      return formatCurrency(value);
    }
    if (name === 'marginPercentage') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const getChartData = () => {
    if (!data) return [];
    
    const sourceData = sortBy === 'quantity' ? data.by_quantity :
                      sortBy === 'revenue' ? data.by_revenue :
                      data.by_margin;

    return sourceData.slice(0, 10).map((item, index) => ({
      ...item,
      sku: item.sku,
      name: item.product_name,
      quantity: item.total_quantity_sold,
      revenue: item.total_revenue,
      avgPrice: item.avg_selling_price,
      salesCount: item.sales_count,
      cogs: item.total_cogs,
      margin: item.total_gross_margin,
      marginPercentage: item.total_revenue > 0 ? (item.total_gross_margin / item.total_revenue) * 100 : 0,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  };

  const chartData = getChartData();

  const handleExport = () => {
    if (!data) return;
    
    const exportData = data.by_quantity.map(item => ({
      SKU: item.sku,
      'Product Name': item.product_name,
      'Product Name (SI)': item.product_name_si || '',
      Unit: item.unit,
      'Quantity Sold': item.total_quantity_sold,
      'Total Revenue': item.total_revenue,
      'Average Price': item.avg_selling_price,
      'Sales Count': item.sales_count,
      'Total COGS': item.total_cogs,
      'Gross Margin': item.total_gross_margin
    }));

    exportTopSKUsData(exportData, `top-skus-${data.period.start}-to-${data.period.end}.csv`);
  };

  const getSortLabel = (type: typeof sortBy) => {
    switch (type) {
      case 'quantity': return 'Quantity Sold';
      case 'revenue': return 'Revenue';
      case 'margin': return 'Gross Margin';
      default: return 'Quantity Sold';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Top SKUs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Top SKUs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-red-500">
            <div className="text-center">
              <p className="font-medium">Failed to load data</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.by_quantity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Top SKUs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No SKU data</p>
              <p className="text-sm">No product sales found for the selected period</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Top SKUs
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setSortBy('quantity')}
                variant={sortBy === 'quantity' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
              >
                Qty
              </Button>
              <Button
                onClick={() => setSortBy('revenue')}
                variant={sortBy === 'revenue' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
              >
                Revenue
              </Button>
              <Button
                onClick={() => setSortBy('margin')}
                variant={sortBy === 'margin' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
              >
                Margin
              </Button>
            </div>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-blue-600">
              <Package className="w-5 h-5" />
              {data.by_quantity.length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Products</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600">
              <DollarSign className="w-5 h-5" />
              {formatCurrency(data.by_quantity.reduce((sum, item) => sum + item.total_revenue, 0))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-purple-600">
              <TrendingUp className="w-5 h-5" />
              {data.by_quantity.reduce((sum, item) => sum + item.total_quantity_sold, 0).toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Qty Sold</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="sku" 
                tick={{ fontSize: 10 }}
                tickLine={{ stroke: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6b7280' }}
                tickFormatter={(value) => {
                  if (sortBy === 'quantity') return value.toLocaleString();
                  return formatCurrency(value);
                }}
              />
              <Tooltip
                formatter={formatTooltipValue}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const data = payload[0].payload;
                    return `${data.sku} - ${data.name}`;
                  }
                  return label;
                }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  maxWidth: '300px'
                }}
              />
              <Bar 
                dataKey={sortBy === 'quantity' ? 'quantity' : sortBy === 'revenue' ? 'revenue' : 'margin'}
                name={getSortLabel(sortBy)}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 List */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Top 5 by {getSortLabel(sortBy)}
          </h4>
          <div className="space-y-2">
            {chartData.slice(0, 5).map((item, index) => (
              <div key={item.sku} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.sku}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                      {item.name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {sortBy === 'quantity' ? item.quantity.toLocaleString() :
                     sortBy === 'revenue' ? formatCurrency(item.revenue) :
                     formatCurrency(item.margin)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {item.salesCount} sales
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Period Info */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {data.by_quantity.length} products
            </Badge>
            <span>
              {new Date(data.period.start).toLocaleDateString()} - {new Date(data.period.end).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}










