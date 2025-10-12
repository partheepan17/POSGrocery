/**
 * Product Stock Modal - Detailed view of individual product stock movements
 * Shows movement history, valuation details, and stock trends
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, TrendingUp, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { stockService, type StockItem, type StockMovement, type StockMovementsResponse } from '@/services/stockService';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertBanner } from '@/components/ui/AlertBanner';

interface ProductStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: StockItem | null;
}

export function ProductStockModal({ isOpen, onClose, product }: ProductStockModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  // Load movements when modal opens
  useEffect(() => {
    if (isOpen && product) {
      loadMovements();
    }
  }, [isOpen, product]);

  const loadMovements = async () => {
    if (!product) return;

    try {
      setLoading(true);
      setError(null);

      const response = await stockService.getProductMovements(product.product_id, {
        from: dateRange.from,
        to: dateRange.to,
        limit: 100
      });

      setMovements(response.movements);
    } catch (err) {
      console.error('Failed to load movements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load movements');
      toast.error('Failed to load movements');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMovements([]);
    setError(null);
    onClose();
  };

  const getMovementIcon = (reason: string) => {
    switch (reason) {
      case 'GRN':
        return <Package className="w-4 h-4 text-green-500" />;
      case 'SALE':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'RETURN':
        return <CheckCircle className="w-4 h-4 text-orange-500" />;
      case 'ADJUST':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMovementColor = (deltaQty: number) => {
    if (deltaQty > 0) return 'text-green-600';
    if (deltaQty < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatMovementDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {product.name_en}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              SKU: {product.sku} • {product.unit}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Product Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Stock</p>
                    <p className={`text-2xl font-bold ${stockService.getStockStatusColor(product.qty_on_hand)}`}>
                      {stockService.formatQuantity(product.qty_on_hand, product.unit)}
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
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Value</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stockService.formatCurrency(product.value_cents)}
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
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Valuation Method</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {product.method}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status and Warnings */}
          <div className="space-y-2">
            <Badge variant={stockService.getStockStatusBadge(product.qty_on_hand).variant}>
              {stockService.getStockStatusBadge(product.qty_on_hand).text}
            </Badge>
            {product.has_unknown_cost && (
              <Badge variant="warning">
                Unknown Cost - Valuation may be inaccurate
              </Badge>
            )}
          </div>

          {/* Date Range Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Filter Movements</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.from || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.to || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadMovements} disabled={loading}>
                    Apply Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Banner */}
          {error && (
            <AlertBanner
              variant="danger"
              title="Error Loading Movements"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          {/* Movements Table */}
          <Card>
            <CardHeader>
              <CardTitle>Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No movements found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Type</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Quantity</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Balance</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Unit Cost</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Reference</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => (
                        <tr key={movement.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {formatMovementDate(movement.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {getMovementIcon(movement.reason)}
                              <span className="font-medium">{movement.reason}</span>
                            </div>
                          </td>
                          <td className={`py-3 px-4 text-right font-medium ${getMovementColor(movement.delta_qty)}`}>
                            {movement.delta_qty > 0 ? '+' : ''}{movement.delta_qty}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                            {movement.balance_after}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                            {movement.unit_cost_cents ? stockService.formatCurrency(movement.unit_cost_cents) : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {movement.ref_id ? `#${movement.ref_id}` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {movement.notes || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
