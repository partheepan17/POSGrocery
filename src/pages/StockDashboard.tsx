/**
 * Stock Dashboard - Comprehensive inventory management interface
 * Provides real-time stock levels, valuation, and movement tracking
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  DollarSign,
  BarChart3,
  Settings
} from 'lucide-react';
import { stockService, type StockItem, type StockMeta, type StockValuation } from '@/services/stockService';
import { useDebounce } from '@/utils/performance';
import { toast } from 'react-hot-toast';
import { ProductStockModal } from '@/components/stock/ProductStockModal';
import { GRNIntegration } from '@/components/stock/GRNIntegration';
import { PerformanceDashboard } from '@/components/stock/PerformanceDashboard';
import { StockAlerts } from '@/components/stock/StockAlerts';
import { SnapshotReports } from '@/components/stock/SnapshotReports';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dropdown, DropdownMenu, DropdownItem } from '@/components/ui/Dropdown';
import { AlertBanner } from '@/components/ui/AlertBanner';

interface StockFilters {
  search: string;
  category_id: number | null;
  method: 'fifo' | 'average' | 'lifo';
  page: number;
  pageSize: number;
}

export default function StockDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<StockFilters>({
    search: searchParams.get('search') || '',
    category_id: searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!) : null,
    method: (searchParams.get('method') as 'fifo' | 'average' | 'lifo') || 'average',
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20')
  });

  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [meta, setMeta] = useState<StockMeta | null>(null);
  const [valuation, setValuation] = useState<StockValuation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(filters.search, 300);

  // Load stock data
  const loadStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [stockResponse, valuationResponse] = await Promise.all([
        stockService.getStockOnHand({
          search: debouncedSearch || undefined,
          category_id: filters.category_id || undefined,
          page: filters.page,
          pageSize: filters.pageSize,
          method: filters.method
        }),
        stockService.getInventoryValuation(filters.method)
      ]);

      setStockData(stockResponse.items);
      setMeta(stockResponse.meta);
      setValuation(valuationResponse);
    } catch (err) {
      console.error('Failed to load stock data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.category_id, filters.page, filters.pageSize, filters.method]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadStockData();
    setRefreshing(false);
  }, [loadStockData]);

  // Update URL params
  const updateUrlParams = useCallback((newFilters: Partial<StockFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    const params = new URLSearchParams();
    if (updatedFilters.search) params.set('search', updatedFilters.search);
    if (updatedFilters.category_id) params.set('category_id', updatedFilters.category_id.toString());
    if (updatedFilters.method !== 'average') params.set('method', updatedFilters.method);
    if (updatedFilters.page !== 1) params.set('page', updatedFilters.page.toString());
    if (updatedFilters.pageSize !== 20) params.set('pageSize', updatedFilters.pageSize.toString());

    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  // Stock statistics
  const stockStats = useMemo(() => {
    const totalProducts = stockData.length;
    const outOfStock = stockData.filter(item => item.qty_on_hand <= 0).length;
    const lowStock = stockData.filter(item => item.qty_on_hand > 0 && item.qty_on_hand <= 10).length;
    const inStock = stockData.filter(item => item.qty_on_hand > 10).length;
    const totalValue = stockData.reduce((sum, item) => sum + item.value_cents, 0);
    const unknownCost = stockData.filter(item => item.has_unknown_cost).length;

    return {
      totalProducts,
      outOfStock,
      lowStock,
      inStock,
      totalValue,
      unknownCost
    };
  }, [stockData]);

  // Handle search
  const handleSearch = (value: string) => {
    updateUrlParams({ search: value, page: 1 });
  };

  // Handle method change
  const handleMethodChange = (method: 'fifo' | 'average' | 'lifo') => {
    updateUrlParams({ method, page: 1 });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    updateUrlParams({ page });
  };

  // Handle page size change
  const handlePageSizeChange = (pageSize: number) => {
    updateUrlParams({ pageSize, page: 1 });
  };

  // Handle product view
  const handleProductView = (product: StockItem) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  // Export data
  const handleExport = () => {
    const csvContent = [
      ['SKU', 'Product Name', 'Unit', 'Category', 'Qty on Hand', 'Value (LKR)', 'Method', 'Status'],
      ...stockData.map(item => [
        item.sku,
        item.name_en,
        item.unit,
        item.category_name || 'N/A',
        item.qty_on_hand.toString(),
        stockService.formatCurrency(item.value_cents),
        item.method,
        stockService.getStockStatusBadge(item.qty_on_hand).text
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time inventory levels and valuation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={handleExport}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          variant="danger"
          title="Error Loading Data"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stockStats.totalProducts}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stockService.formatCurrency(stockStats.totalValue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stockStats.outOfStock}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{stockStats.lowStock}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products by name, SKU, or barcode..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Dropdown>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Method: {filters.method.toUpperCase()}</span>
                </Button>
                <DropdownMenu>
                  <DropdownItem onClick={() => handleMethodChange('average')}>
                    Average Cost
                  </DropdownItem>
                  <DropdownItem onClick={() => handleMethodChange('fifo')}>
                    FIFO
                  </DropdownItem>
                  <DropdownItem onClick={() => handleMethodChange('lifo')}>
                    LIFO
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
              <Dropdown>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>Page Size: {filters.pageSize}</span>
                </Button>
                <DropdownMenu>
                  <DropdownItem onClick={() => handlePageSizeChange(10)}>10 per page</DropdownItem>
                  <DropdownItem onClick={() => handlePageSizeChange(20)}>20 per page</DropdownItem>
                  <DropdownItem onClick={() => handlePageSizeChange(50)}>50 per page</DropdownItem>
                  <DropdownItem onClick={() => handlePageSizeChange(100)}>100 per page</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Stock Levels</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockData.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Product</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Category</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Qty on Hand</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Value</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((item) => {
                    const statusBadge = stockService.getStockStatusBadge(item.qty_on_hand);
                    return (
                      <tr key={item.product_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{item.name_en}</p>
                            {item.name_si && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{item.name_si}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{item.sku}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                          {item.category_name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={stockService.getStockStatusColor(item.qty_on_hand)}>
                            {stockService.formatQuantity(item.qty_on_hand, item.unit)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                          {stockService.formatCurrency(item.value_cents)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.text}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProductView(item)}
                            className="flex items-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((meta.page - 1) * meta.pageSize) + 1} to {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} products
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={!meta.hasPrev}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {meta.page} of {meta.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={!meta.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Valuation Summary */}
      {valuation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Inventory Valuation Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stockService.formatCurrency(valuation.total_value_cents)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Products Valued</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {valuation.total_products}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Unknown Cost</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {valuation.products_with_unknown_cost}
                </p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Badge variant="outline">
                Method: {valuation.method}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GRN Integration */}
      <GRNIntegration />

      {/* Performance Monitoring */}
      <PerformanceDashboard />

      {/* Stock Alerts & Reorder Management */}
      <StockAlerts />

      {/* Snapshot Reports & Analytics */}
      <SnapshotReports />

      {/* Product Stock Modal */}
      <ProductStockModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />
    </div>
  );
}
