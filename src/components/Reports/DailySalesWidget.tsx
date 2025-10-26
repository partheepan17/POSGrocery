import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SalesSummaryReport } from '@/services/reportService';
import { exportSalesData } from '@/utils/csvExport';

interface DailySalesWidgetProps {
  data: SalesSummaryReport | null;
  loading: boolean;
  error: string | null;
}

export function DailySalesWidget({ data, loading, error }: DailySalesWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'revenue' || name === 'avgAmount') {
      return formatCurrency(value);
    }
    return value.toLocaleString();
  };

  const chartData = data?.daily.map(day => ({
    date: new Date(day.sale_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    fullDate: day.sale_date,
    revenue: day.total_revenue,
    sales: day.total_sales,
    avgAmount: day.avg_sale_amount,
    discounts: day.total_discounts,
    tax: day.total_tax
  })) || [];

  const handleExport = () => {
    if (!data?.daily) return;
    
    const exportData = data.daily.map(day => ({
      Date: day.sale_date,
      'Total Sales': day.total_sales,
      'Total Revenue': day.total_revenue,
      'Total Gross': day.total_gross,
      'Total Discounts': day.total_discounts,
      'Total Tax': day.total_tax,
      'Average Sale Amount': day.avg_sale_amount
    }));

    exportSalesData(exportData, `daily-sales-${data.period.start}-to-${data.period.end}.csv`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Daily Sales
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
            <TrendingUp className="w-5 h-5" />
            Daily Sales
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

  if (!data || data.daily.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Daily Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No sales data</p>
              <p className="text-sm">No sales found for the selected period</p>
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
            <TrendingUp className="w-5 h-5" />
            Daily Sales
          </CardTitle>
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
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600">
              <DollarSign className="w-5 h-5" />
              {formatCurrency(data.overall.total_revenue)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-blue-600">
              <ShoppingCart className="w-5 h-5" />
              {data.overall.total_sales.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-purple-600">
              <TrendingUp className="w-5 h-5" />
              {formatCurrency(data.overall.avg_sale_amount)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Sale</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6b7280' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6b7280' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                formatter={formatTooltipValue}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const data = payload[0].payload;
                    return new Date(data.fullDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  }
                  return label;
                }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                name="Sales Count"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Period Info */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {data.daily.length} days
            </Badge>
            <span>
              {new Date(data.period.start).toLocaleDateString()} - {new Date(data.period.end).toLocaleDateString()}
            </span>
          </div>
          <div className="text-right">
            <div>Total Discounts: {formatCurrency(data.overall.total_discounts)}</div>
            <div>Total Tax: {formatCurrency(data.overall.total_tax)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}










