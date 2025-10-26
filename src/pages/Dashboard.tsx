import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingCart, 
  BarChart3, 
  AlertTriangle, 
  RefreshCw,
  DollarSign,
  TrendingDown,
  Package,
  Users,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, Skeleton } from '@/components/ui/LoadingSpinner';
import { ResponsiveContainer, ResponsiveGrid, ResponsiveFlex } from '@/components/ui/ResponsiveContainer';

// Mock data for the dashboard
const salesData = [
  { day: 'Mon', sales: 60 },
  { day: 'Tue', sales: 80 },
  { day: 'Wed', sales: 120 },
  { day: 'Thu', sales: 160 },
  { day: 'Fri', sales: 140 },
  { day: 'Sat', sales: 100 },
  { day: 'Sun', sales: 90 }
];

const topSKUs = [
  { sku: 'SKU001', quantity: 160 },
  { sku: 'SKU002', quantity: 120 },
  { sku: 'SKU003', quantity: 80 },
  { sku: 'SKU004', quantity: 60 },
  { sku: 'SKU005', quantity: 40 }
];

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // In test environment, skip loading state
    if ((globalThis as any).process?.env?.NODE_ENV === 'test') {
      setLoading(false);
      return;
    }
    
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (loading) {
    return (
      <ResponsiveContainer className="py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <ResponsiveGrid cols={{ default: 1, sm: 2, md: 3, lg: 5 }} gap="md">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-20 w-full" />
              </Card>
            ))}
          </ResponsiveGrid>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer className="py-6 space-y-6">
      {/* Header */}
      <ResponsiveFlex 
        direction={{ default: 'col', sm: 'row' }}
        justify="between"
        align="start"
        gap="md"
        className="sm:items-center"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <Button 
          onClick={handleRefresh}
          loading={refreshing}
          loadingText="Refreshing..."
          variant="primary"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Refresh
        </Button>
      </ResponsiveFlex>

      {/* Key Metrics Cards */}
      <ResponsiveGrid cols={{ default: 1, sm: 2, md: 3, lg: 5 }} gap="md">
        {/* Today Sales */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">LKR 125,000</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+12.5%</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">45</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+8.2%</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Basket */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Basket</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">LKR 2,778</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600 dark:text-red-400">-2.1%</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gross Margin */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gross Margin</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">28.5%</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+1.2%</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600 dark:text-red-400">-3%</span>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      {/* Quick Actions */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveGrid cols={{ default: 2, sm: 4 }} gap="md">
            <Button 
              onClick={() => navigate('/pos')}
              variant="primary"
              className="w-full"
              leftIcon={<ShoppingCart className="w-4 h-4" />}
            >
              New Sale
            </Button>
            <Button 
              onClick={() => navigate('/inventory/receive')}
              variant="secondary"
              className="w-full"
              leftIcon={<Package className="w-4 h-4" />}
            >
              Receive Stock
            </Button>
            <Button 
              onClick={() => navigate('/reports')}
              variant="secondary"
              className="w-full"
              leftIcon={<BarChart3 className="w-4 h-4" />}
            >
              Reports
            </Button>
            <Button 
              onClick={() => navigate('/settings')}
              variant="secondary"
              className="w-full"
              leftIcon={<Clock className="w-4 h-4" />}
            >
              Settings
            </Button>
          </ResponsiveGrid>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <ResponsiveGrid cols={{ default: 1, lg: 2 }} gap="md">
        {/* 7-Day Sales Trend */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">7-Day Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <div className="flex items-end justify-between h-full space-x-2">
                {salesData.map((item, index) => (
                  <div key={index} className="flex flex-col items-center space-y-2">
                    <div 
                      className="bg-blue-500 rounded-t w-8 transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${(item.sales / 160) * 200}px` }}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{item.day}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{item.sales}k</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 text-sm font-medium text-gray-900 dark:text-white">Rice 1kg</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-sm font-medium text-gray-900 dark:text-white text-right">
                    150
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-16 text-sm font-medium text-gray-900 dark:text-white">Cooking Oil 500ml</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: '75%' }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-sm font-medium text-gray-900 dark:text-white text-right">
                    120
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-16 text-sm font-medium text-gray-900 dark:text-white">Sugar 1kg</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: '50%' }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-sm font-medium text-gray-900 dark:text-white text-right">
                    95
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-16 text-sm font-medium text-gray-900 dark:text-white">Milk 1L</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: '40%' }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-sm font-medium text-gray-900 dark:text-white text-right">
                    80
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-16 text-sm font-medium text-gray-900 dark:text-white">Bread Loaf</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: '30%' }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-sm font-medium text-gray-900 dark:text-white text-right">
                    75
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </ResponsiveGrid>
    </ResponsiveContainer>
  );
}

export default Dashboard;
