import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, Filter, Copy, TrendingUp, DollarSign, ShoppingCart, Tag, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { reportService, ReportFilters, ReportKPIs } from '@/services/reportService';
import { csvService } from '@/services/csvService';
import { useAppStore } from '@/store/appStore';
import { SimpleBar } from '@/components/Charts/SimpleBar';
import { SimpleLine } from '@/components/Charts/SimpleLine';

type TabType = 'summary' | 'tier' | 'products' | 'categories' | 'discounts';

export function Reports() {
  const { t } = useTranslation();
  const { settings } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    from: new Date(new Date().setHours(0, 0, 0, 0)),
    to: new Date(new Date().setHours(23, 59, 59, 999)),
  });
  const [showFilters, setShowFilters] = useState(true);
  
  // Data states
  const [kpis, setKpis] = useState<ReportKPIs | null>(null);
  const [salesSummary, setSalesSummary] = useState<any[]>([]);
  const [salesByTier, setSalesByTier] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [discountAudit, setDiscountAudit] = useState<any[]>([]);
  
  // UI states
  const [showSiTaNames, setShowSiTaNames] = useState(false);
  const [selectedDiscountRule, setSelectedDiscountRule] = useState<string | null>(null);
  const [productsLimit, setProductsLimit] = useState(20);
  const [categoriesLimit, setCategoriesLimit] = useState(20);

  const debounceRef = useRef<NodeJS.Timeout>();

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Debounced filter changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      loadData();
    }, 250);
  }, [filters, productsLimit, categoriesLimit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + number for tab switching
      if (e.altKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const tabs: TabType[] = ['summary', 'tier', 'products', 'categories', 'discounts'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex]);
        }
      }

      // Ctrl+E for export
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        kpisData,
        summaryData,
        tierData,
        productsData,
        categoriesData,
        discountsData
      ] = await Promise.all([
        reportService.getKPIs(filters),
        reportService.getSalesSummary(filters),
        reportService.getSalesByTier(filters),
        reportService.getTopProducts({ ...filters, limit: productsLimit }),
        reportService.getTopCategories({ ...filters, limit: categoriesLimit }),
        reportService.getDiscountAudit(filters)
      ]);

      setKpis(kpisData);
      setSalesSummary(summaryData);
      setSalesByTier(tierData);
      setTopProducts(productsData);
      setTopCategories(categoriesData);
      setDiscountAudit(discountsData);
    } catch (error) {
      console.error('Failed to load report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    let from: Date, to: Date;

    switch (range) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from = new Date(yesterday.setHours(0, 0, 0, 0));
        to = new Date(yesterday.setHours(23, 59, 59, 999));
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        from = new Date(weekStart.setHours(0, 0, 0, 0));
        to = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
    }

    setFilters(prev => ({ ...prev, from, to }));
  };

  const handleExport = () => {
    try {
      switch (activeTab) {
        case 'summary':
          csvService.exportSalesSummaryCSV(salesSummary, filters);
          break;
        case 'tier':
          csvService.exportSalesByTierCSV(salesByTier, filters);
          break;
        case 'products':
          csvService.exportTopProductsCSV(topProducts, filters);
          break;
        case 'categories':
          csvService.exportTopCategoriesCSV(topCategories, filters);
          break;
        case 'discounts':
          csvService.exportDiscountAuditCSV(discountAudit, filters);
          break;
      }
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  };

  const formatCurrency = (amount: number): string => {
    return `රු ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (filters.tier) count++;
    if (filters.terminal) count++;
    if (filters.cashier) count++;
    return count;
  };

  const hasData = (): boolean => {
    switch (activeTab) {
      case 'summary':
        return salesSummary.length > 0;
      case 'tier':
        return salesByTier.length > 0;
      case 'products':
        return topProducts.length > 0;
      case 'categories':
        return topCategories.length > 0;
      case 'discounts':
        return discountAudit.length > 0;
      default:
        return false;
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <AlertCircle className="w-12 h-12 mb-4" />
      <h3 className="text-lg font-medium mb-2">No data found</h3>
      <p className="text-sm mb-4">Try adjusting your date range or clearing filters</p>
      <button
        onClick={() => setFilters({
          from: new Date(new Date().setHours(0, 0, 0, 0)),
          to: new Date(new Date().setHours(23, 59, 59, 999)),
        })}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Clear Filters
      </button>
    </div>
  );

  const tabs = [
    { id: 'summary', label: 'Sales Summary', shortcut: '1' },
    { id: 'tier', label: 'By Price Tier', shortcut: '2' },
    { id: 'products', label: 'Top Products', shortcut: '3' },
    { id: 'categories', label: 'Top Categories', shortcut: '4' },
    { id: 'discounts', label: 'Discount Audit', shortcut: '5' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-600 mt-1">
              Sales analytics and performance insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 border rounded-lg transition-all duration-200 shadow-sm ${
                showFilters 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                  : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-1 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
              title="Export current tab data (Ctrl+E)"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={loadData}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-1 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.from.toISOString().split('T')[0]}
                onChange={(e) => setFilters(prev => ({ ...prev, from: new Date(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.to.toISOString().split('T')[0]}
                onChange={(e) => setFilters(prev => ({ ...prev, to: new Date(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            {/* Price Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Tier</label>
              <select
                value={filters.tier || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, tier: e.target.value as any || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">All</option>
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Credit">Credit</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Quick Date Ranges */}
          <div className="flex items-center space-x-2 mt-4">
            <span className="text-sm text-gray-500">Quick ranges:</span>
            {[
              { label: 'Today', value: 'today' },
              { label: 'Yesterday', value: 'yesterday' },
              { label: 'Last 7d', value: 'week' },
              { label: 'This Month', value: 'month' },
            ].map(range => (
              <button
                key={range.value}
                onClick={() => handleDateRangeChange(range.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-gray-900 bg-white"
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-1 text-xs text-gray-400">(Alt+{tab.shortcut})</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!hasData() ? renderEmptyState() : (
          <>
            {/* KPIs Section */}
            {kpis && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                      <p className="text-2xl font-bold text-gray-900">{kpis.invoices.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="w-8 h-8 text-blue-500" />
                      <button
                        onClick={() => copyToClipboard(kpis.invoices.toString(), 'Invoices')}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Net Sales</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.net)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-8 h-8 text-green-500" />
                      <button
                        onClick={() => copyToClipboard(formatCurrency(kpis.net), 'Net Sales')}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Discount</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.discount)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Tag className="w-8 h-8 text-yellow-500" />
                      <button
                        onClick={() => copyToClipboard(formatCurrency(kpis.discount), 'Discount')}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg per Invoice</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.avg_per_invoice)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-8 h-8 text-purple-500" />
                      <button
                        onClick={() => copyToClipboard(formatCurrency(kpis.avg_per_invoice), 'Average')}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                {salesSummary.length > 1 && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Net Sales Trend</h3>
                    <SimpleLine
                      data={salesSummary.map(row => ({
                        label: new Date(row.date).toLocaleDateString(),
                        value: row.net
                      }))}
                      formatValue={formatCurrency}
                    />
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Daily Summary</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoices</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {salesSummary.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(row.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.invoices.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(row.gross)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(row.discount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(row.tax)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(row.net)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(row.avg_per_invoice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tier' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Sales by Price Tier</h3>
                  <SimpleBar
                    data={salesByTier.map(row => ({
                      label: row.tier,
                      value: row.net
                    }))}
                    formatValue={formatCurrency}
                  />
                </div>

                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Sales by Price Tier</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Tier</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoices</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {salesByTier.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {row.tier}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.invoices.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(row.gross)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(row.discount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(row.net)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(row.avg_per_invoice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Top Products</h3>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showSiTaNames}
                        onChange={(e) => setShowSiTaNames(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show SI/TA names</span>
                    </label>
                    <select
                      value={productsLimit}
                      onChange={(e) => setProductsLimit(parseInt(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={20}>Top 20</option>
                      <option value={50}>Top 50</option>
                      <option value={100}>Top 100</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoices</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topProducts.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {row.sku}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{row.name_en}</div>
                              {showSiTaNames && (
                                <div className="text-xs text-gray-500">
                                  {row.name_si && <div>SI: {row.name_si}</div>}
                                  {row.name_ta && <div>TA: {row.name_ta}</div>}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.qty.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(row.net)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.invoices.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Top Categories</h3>
                  <select
                    value={categoriesLimit}
                    onChange={(e) => setCategoriesLimit(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={20}>Top 20</option>
                    <option value={50}>Top 50</option>
                    <option value={100}>Top 100</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoices</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topCategories.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.category_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.qty.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(row.net)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.invoices.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'discounts' && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Discount Rules Performance</h3>
                  <p className="text-sm text-gray-600 mt-1">Click on a rule to see recent invoices impacted</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Times Applied</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Discount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg per Invoice</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affected Invoices</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {discountAudit.map((row, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={async () => {
                            setSelectedDiscountRule(row.rule_name);
                            const details = await reportService.getDiscountRuleDetails(row.rule_name, filters);
                            console.log('Discount rule details:', details);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                            {row.rule_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.times_applied.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(row.discounted_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(row.avg_per_invoice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.affected_invoices.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
