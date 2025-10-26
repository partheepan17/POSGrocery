import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, BarChart3, Download, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { reportService, SalesSummaryReport, TopSKUsReport, LowStockReport } from '@/services/reportService';
import { DateRangePicker, DateRange } from '@/components/Reports/DateRangePicker';
import { DailySalesWidget } from '@/components/Reports/DailySalesWidget';
import { TopSKUsWidget } from '@/components/Reports/TopSKUsWidget';
import { LowStockWidget } from '@/components/Reports/LowStockWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function Reports() {
  const { t } = useTranslation();
  
  // Date range state (defaults to last 7 days)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    return {
      start: lastWeek.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  });

  // Low stock threshold
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Data states
  const [salesSummary, setSalesSummary] = useState<SalesSummaryReport | null>(null);
  const [topSKUs, setTopSKUs] = useState<TopSKUsReport | null>(null);
  const [lowStock, setLowStock] = useState<LowStockReport | null>(null);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    sales?: string | null;
    topSKUs?: string | null;
    lowStock?: string | null;
  }>({});

  // Load all reports
  const loadReports = async () => {
    setLoading(true);
    setErrors({});

    try {
      const [salesData, skusData, stockData] = await Promise.allSettled([
        reportService.getSalesSummary(dateRange.start, dateRange.end),
        reportService.getTopSKUs(dateRange.start, dateRange.end, 20),
        reportService.getLowStock(lowStockThreshold)
      ]);

      // Handle sales data
      if (salesData.status === 'fulfilled') {
        setSalesSummary(salesData.value);
        setErrors(prev => ({ ...prev, sales: null }));
      } else {
        console.error('Failed to load sales summary:', salesData.reason);
        setErrors(prev => ({ ...prev, sales: salesData.reason?.message || 'Failed to load sales data' }));
      }

      // Handle top SKUs data
      if (skusData.status === 'fulfilled') {
        setTopSKUs(skusData.value);
        setErrors(prev => ({ ...prev, topSKUs: null }));
      } else {
        console.error('Failed to load top SKUs:', skusData.reason);
        setErrors(prev => ({ ...prev, topSKUs: skusData.reason?.message || 'Failed to load top SKUs data' }));
      }

      // Handle low stock data
      if (stockData.status === 'fulfilled') {
        setLowStock(stockData.value);
        setErrors(prev => ({ ...prev, lowStock: null }));
      } else {
        console.error('Failed to load low stock:', stockData.reason);
        setErrors(prev => ({ ...prev, lowStock: stockData.reason?.message || 'Failed to load low stock data' }));
      }

    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Load reports when dependencies change
  useEffect(() => {
    loadReports();
  }, [dateRange.start, dateRange.end, lowStockThreshold]);

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  const handleThresholdChange = (threshold: number) => {
    setLowStockThreshold(threshold);
  };

  const handleRefresh = () => {
    loadReports();
  };

  const hasErrors = Object.values(errors).some(error => error !== null);
  const hasData = salesSummary || topSKUs || lowStock;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              {t('reports.title', 'Reports')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('reports.description', 'Analytics and insights for your business')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh', 'Refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Date Range:
              </span>
              <DateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Low Stock Threshold:
              </span>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
              />
            </div>
          </div>

          {hasErrors && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Some data may be incomplete
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!hasData && !loading ? (
          <div className="h-full flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Data Available
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No reports data found for the selected period. Try adjusting your date range.
                </p>
                <Button onClick={handleRefresh} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Daily Sales Widget */}
            <DailySalesWidget
              data={salesSummary}
              loading={loading}
              error={errors.sales || null}
            />

            {/* Top SKUs Widget */}
            <TopSKUsWidget
              data={topSKUs}
              loading={loading}
              error={errors.topSKUs || null}
            />

            {/* Low Stock Widget */}
            <LowStockWidget
              data={lowStock}
              loading={loading}
              error={errors.lowStock || null}
              threshold={lowStockThreshold}
              onThresholdChange={handleThresholdChange}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>
              Period: {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
            </span>
            <span>•</span>
            <span>Low Stock Threshold: {lowStockThreshold}</span>
          </div>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Export individual widgets using the Export CSV buttons</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
