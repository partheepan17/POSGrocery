import React, { useState } from 'react';
import { Download, Package, AlertTriangle, CheckCircle, XCircle, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { LowStockReport } from '@/services/reportService';
import { exportLowStockData } from '@/utils/csvExport';

interface LowStockWidgetProps {
  data: LowStockReport | null;
  loading: boolean;
  error: string | null;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
}

export function LowStockWidget({ 
  data, 
  loading, 
  error, 
  threshold, 
  onThresholdChange 
}: LowStockWidgetProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'out' | 'low' | 'reorder'>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Out of Stock':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Below Reorder Level':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'Low Stock':
        return <Minus className="w-4 h-4 text-yellow-500" />;
      case 'Adequate Stock':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Out of Stock':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Below Reorder Level':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Low Stock':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Adequate Stock':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredProducts = data?.products.filter(product => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'out') return product.stock_status === 'Out of Stock';
    if (filterStatus === 'low') return product.stock_status === 'Low Stock';
    if (filterStatus === 'reorder') return product.stock_status === 'Below Reorder Level';
    return true;
  }) || [];

  const handleExport = () => {
    if (!data?.products) return;
    
    const exportData = data.products.map(item => ({
      SKU: item.sku,
      'Product Name': item.product_name,
      'Product Name (SI)': item.product_name_si || '',
      Unit: item.unit,
      'Reorder Level': item.reorder_level || 0,
      'Current Stock': item.current_stock,
      'Stock Value': item.stock_value,
      'Unit Cost': item.unit_cost || 0,
      'Stock Status': item.stock_status,
      'Last Movement Date': item.last_movement_date
    }));

    exportLowStockData(exportData, `low-stock-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleAdjustStock = (productId: number) => {
    // This would typically open a modal or navigate to inventory adjustment
    console.log('Adjust stock for product:', productId);
    // For now, just show an alert
    alert(`Adjust stock for product ID: ${productId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Low Stock Alert
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
            Low Stock Alert
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

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Low Stock Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No stock data</p>
              <p className="text-sm">Unable to load inventory data</p>
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
            Low Stock Alert
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
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-blue-600">
              <Package className="w-5 h-5" />
              {data.summary.total_products_checked}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-red-600">
              <XCircle className="w-5 h-5" />
              {data.summary.out_of_stock_count}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              {data.summary.below_reorder_count}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Below Reorder</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-yellow-600">
              <Minus className="w-5 h-5" />
              {data.summary.low_stock_count}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Threshold:
            </label>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
              className="w-20 h-8"
              min="0"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="out">Out of Stock</option>
              <option value="reorder">Below Reorder</option>
              <option value="low">Low Stock</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reorder Level
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stock Value
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No products found</p>
                    <p className="text-sm">
                      {filterStatus === 'all' 
                        ? 'No products match the current threshold'
                        : `No products with ${filterStatus} status`
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(product.stock_status)}
                        <Badge className={getStatusColor(product.stock_status)}>
                          {product.stock_status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {product.sku}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                      <div>
                        <div className="font-medium">{product.product_name}</div>
                        {product.product_name_si && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {product.product_name_si}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{product.current_stock}</span>
                        <span className="text-gray-500 dark:text-gray-400">{product.unit}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {product.reorder_level || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(product.stock_value)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <Button
                        onClick={() => handleAdjustStock(product.product_id)}
                        size="sm"
                        variant="outline"
                        className="gap-1"
                      >
                        <Package className="w-3 h-3" />
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {filteredProducts.length} products
            </Badge>
            <span>Threshold: {threshold}</span>
          </div>
          <div className="text-right">
            <div>Last checked: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}










