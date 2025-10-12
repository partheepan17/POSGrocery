/**
 * Stock Alerts Component
 * Displays stock alerts, reorder recommendations, and supplier performance
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings,
  Bell,
  ShoppingCart,
  Users,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AlertBanner } from '@/components/ui/AlertBanner';

interface StockAlert {
  id: number;
  product_id: number;
  sku: string;
  name_en: string;
  unit: string;
  alert_type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'REORDER_POINT' | 'EXPIRY_WARNING';
  current_quantity: number;
  threshold_quantity: number;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
}

interface ReorderRecommendation {
  id: number;
  product_id: number;
  sku: string;
  name_en: string;
  unit: string;
  category_name?: string;
  supplier_name?: string;
  reorder_quantity: number;
  reorder_point: number;
  current_quantity: number;
  recommendation_status: 'REORDER_NOW' | 'REORDER_SOON' | 'STOCK_OK';
  created_at: string;
}

interface SupplierPerformance {
  id: number;
  supplier_id: number;
  supplier_name: string;
  product_sku: string;
  product_name: string;
  total_orders: number;
  successful_orders: number;
  average_lead_time_days: number;
  average_quality_score?: number;
  on_time_delivery_rate: number;
  last_order_date?: string;
}

export function StockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [supplierPerformance, setSupplierPerformance] = useState<SupplierPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'reorder' | 'suppliers'>('alerts');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, these would be API calls
      // For now, we'll use mock data
      const mockAlerts: StockAlert[] = [
        {
          id: 1,
          product_id: 1,
          sku: 'PROD001',
          name_en: 'Rice 1kg',
          unit: 'kg',
          alert_type: 'LOW_STOCK',
          current_quantity: 5,
          threshold_quantity: 10,
          message: 'Rice 1kg stock is below threshold (5 < 10)',
          priority: 'MEDIUM',
          created_at: '2025-10-12T10:30:00Z'
        },
        {
          id: 2,
          product_id: 2,
          sku: 'PROD002',
          name_en: 'Sugar 500g',
          unit: 'g',
          alert_type: 'OUT_OF_STOCK',
          current_quantity: 0,
          threshold_quantity: 0,
          message: 'Sugar 500g is out of stock',
          priority: 'HIGH',
          created_at: '2025-10-12T11:15:00Z'
        }
      ];

      const mockRecommendations: ReorderRecommendation[] = [
        {
          id: 1,
          product_id: 1,
          sku: 'PROD001',
          name_en: 'Rice 1kg',
          unit: 'kg',
          category_name: 'Grains',
          supplier_name: 'ABC Suppliers Ltd',
          reorder_quantity: 50,
          reorder_point: 10,
          current_quantity: 5,
          recommendation_status: 'REORDER_NOW',
          created_at: '2025-10-12T09:00:00Z'
        },
        {
          id: 2,
          product_id: 2,
          sku: 'PROD002',
          name_en: 'Sugar 500g',
          unit: 'g',
          category_name: 'Sweeteners',
          supplier_name: 'XYZ Trading Co',
          reorder_quantity: 100,
          reorder_point: 20,
          current_quantity: 0,
          recommendation_status: 'REORDER_NOW',
          created_at: '2025-10-12T09:00:00Z'
        }
      ];

      const mockSupplierPerformance: SupplierPerformance[] = [
        {
          id: 1,
          supplier_id: 1,
          supplier_name: 'ABC Suppliers Ltd',
          product_sku: 'PROD001',
          product_name: 'Rice 1kg',
          total_orders: 15,
          successful_orders: 14,
          average_lead_time_days: 3.5,
          average_quality_score: 4.2,
          on_time_delivery_rate: 93.3,
          last_order_date: '2025-10-10T14:30:00Z'
        },
        {
          id: 2,
          supplier_id: 2,
          supplier_name: 'XYZ Trading Co',
          product_sku: 'PROD002',
          product_name: 'Sugar 500g',
          total_orders: 8,
          successful_orders: 7,
          average_lead_time_days: 5.2,
          average_quality_score: 3.8,
          on_time_delivery_rate: 87.5,
          last_order_date: '2025-10-08T10:15:00Z'
        }
      ];

      setAlerts(mockAlerts);
      setRecommendations(mockRecommendations);
      setSupplierPerformance(mockSupplierPerformance);
    } catch (error) {
      console.error('Failed to load stock alerts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'HIGH': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'LOW': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getAlertTypeIcon = (alertType: string) => {
    switch (alertType) {
      case 'LOW_STOCK': return <Package className="w-4 h-4" />;
      case 'OUT_OF_STOCK': return <XCircle className="w-4 h-4" />;
      case 'REORDER_POINT': return <ShoppingCart className="w-4 h-4" />;
      case 'EXPIRY_WARNING': return <Clock className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getRecommendationStatusColor = (status: string) => {
    switch (status) {
      case 'REORDER_NOW': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'REORDER_SOON': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'STOCK_OK': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const dismissAlert = async (alertId: number) => {
    try {
      // In a real implementation, this would be an API call
      setAlerts(alerts.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
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
              <Bell className="w-5 h-5" />
              <span>Stock Alerts & Reorder Management</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('alerts')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-1">
            <Button
              variant={activeTab === 'alerts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('alerts')}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alerts ({alerts.length})
            </Button>
            <Button
              variant={activeTab === 'reorder' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('reorder')}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Reorder ({recommendations.filter(r => r.recommendation_status !== 'STOCK_OK').length})
            </Button>
            <Button
              variant={activeTab === 'suppliers' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('suppliers')}
            >
              <Users className="w-4 h-4 mr-2" />
              Suppliers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No active stock alerts</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getAlertTypeIcon(alert.alert_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {alert.name_en}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {alert.sku}
                          </Badge>
                          <Badge className={`text-xs ${getPriorityColor(alert.priority)}`}>
                            {alert.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Current: {alert.current_quantity} {alert.unit}</span>
                          <span>Threshold: {alert.threshold_quantity} {alert.unit}</span>
                          <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Reorder Tab */}
      {activeTab === 'reorder' && (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No reorder recommendations</p>
              </CardContent>
            </Card>
          ) : (
            recommendations.map((rec) => (
              <Card key={rec.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {rec.name_en}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {rec.sku}
                        </Badge>
                        <Badge className={`text-xs ${getRecommendationStatusColor(rec.recommendation_status)}`}>
                          {rec.recommendation_status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="font-medium">Current Stock:</span> {rec.current_quantity} {rec.unit}
                        </div>
                        <div>
                          <span className="font-medium">Reorder Point:</span> {rec.reorder_point} {rec.unit}
                        </div>
                        <div>
                          <span className="font-medium">Reorder Qty:</span> {rec.reorder_quantity} {rec.unit}
                        </div>
                        <div>
                          <span className="font-medium">Supplier:</span> {rec.supplier_name || 'Not specified'}
                        </div>
                      </div>
                      {rec.category_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Category: {rec.category_name}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        disabled={rec.recommendation_status === 'STOCK_OK'}
                      >
                        Create Order
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {supplierPerformance.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No supplier performance data</p>
              </CardContent>
            </Card>
          ) : (
            supplierPerformance.map((supplier) => (
              <Card key={supplier.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {supplier.supplier_name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {supplier.product_sku}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {supplier.product_name}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Orders:</span>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {supplier.successful_orders}/{supplier.total_orders}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Lead Time:</span>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {supplier.average_lead_time_days.toFixed(1)} days
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">On-Time Rate:</span>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {supplier.on_time_delivery_rate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Quality:</span>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {supplier.average_quality_score ? supplier.average_quality_score.toFixed(1) : 'N/A'}/5
                          </p>
                        </div>
                      </div>
                      {supplier.last_order_date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Last Order: {new Date(supplier.last_order_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
