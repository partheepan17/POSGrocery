/**
 * Performance Monitoring Dashboard
 * Real-time system performance metrics and monitoring
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart3,
  Server,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AlertBanner } from '@/components/ui/AlertBanner';

interface SystemMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  slowest_operation: string;
  slowest_duration: number;
  database_queries: number;
  cache_hits: number;
  cache_misses: number;
  memory_usage: number;
  uptime: number;
}

interface DatabaseMetrics {
  total_queries: number;
  slow_queries: number;
  average_query_time: number;
  slowest_query: string;
  slowest_duration: number;
  connection_pool_size: number;
  active_connections: number;
}

interface APIMetrics {
  endpoint: string;
  method: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  min_response_time: number;
  max_response_time: number;
  last_request: string;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
}

export function PerformanceDashboard() {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics | null>(null);
  const [apiMetrics, setApiMetrics] = useState<APIMetrics[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Load performance data
  useEffect(() => {
    loadPerformanceData();
    const interval = setInterval(loadPerformanceData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, these would be API calls
      // For now, we'll use mock data
      const mockSystemMetrics: SystemMetrics = {
        total_requests: 1247,
        successful_requests: 1198,
        failed_requests: 49,
        average_response_time: 156,
        slowest_operation: 'POST /api/stock/snapshot/create',
        slowest_duration: 2340,
        database_queries: 892,
        cache_hits: 234,
        cache_misses: 45,
        memory_usage: 87.5,
        uptime: 86400 // 24 hours
      };

      const mockDatabaseMetrics: DatabaseMetrics = {
        total_queries: 892,
        slow_queries: 12,
        average_query_time: 45,
        slowest_query: 'SELECT * FROM stock_ledger WHERE product_id = ?',
        slowest_duration: 890,
        connection_pool_size: 1,
        active_connections: 1
      };

      const mockApiMetrics: APIMetrics[] = [
        {
          endpoint: '/api/stock/soh',
          method: 'GET',
          total_requests: 156,
          successful_requests: 154,
          failed_requests: 2,
          average_response_time: 89,
          min_response_time: 23,
          max_response_time: 456,
          last_request: '2025-10-12T14:22:54.742Z'
        },
        {
          endpoint: '/api/stock/snapshot/create',
          method: 'POST',
          total_requests: 3,
          successful_requests: 3,
          failed_requests: 0,
          average_response_time: 1234,
          min_response_time: 890,
          max_response_time: 2340,
          last_request: '2025-10-12T14:20:15.123Z'
        },
        {
          endpoint: '/api/stock/valuation',
          method: 'GET',
          total_requests: 23,
          successful_requests: 23,
          failed_requests: 0,
          average_response_time: 234,
          min_response_time: 156,
          max_response_time: 567,
          last_request: '2025-10-12T14:21:30.456Z'
        }
      ];

      const mockHealthStatus: HealthStatus = {
        status: 'warning',
        issues: ['High memory usage: 87.5MB', 'Slow operation: POST /api/stock/snapshot/create (2340ms)']
      };

      setSystemMetrics(mockSystemMetrics);
      setDatabaseMetrics(mockDatabaseMetrics);
      setApiMetrics(mockApiMetrics);
      setHealthStatus(mockHealthStatus);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number): string => {
    return `${bytes.toFixed(1)} MB`;
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
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
      {/* Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getHealthStatusIcon(healthStatus.status)}
              <span>System Health Status</span>
              <Badge variant={healthStatus.status === 'healthy' ? 'success' : healthStatus.status === 'warning' ? 'warning' : 'danger'}>
                {healthStatus.status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthStatus.issues.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Issues detected:</p>
                <ul className="list-disc list-inside space-y-1">
                  {healthStatus.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-green-600 dark:text-green-400">All systems operating normally</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Overview */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {systemMetrics.total_requests.toLocaleString()}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Success: {systemMetrics.successful_requests} | Failed: {systemMetrics.failed_requests}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {systemMetrics.average_response_time}ms
                  </p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Slowest: {systemMetrics.slowest_duration}ms
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory Usage</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatBytes(systemMetrics.memory_usage)}
                  </p>
                </div>
                <Server className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Heap usage
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Uptime</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatUptime(systemMetrics.uptime)}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                System uptime
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Database Performance */}
      {databaseMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Database Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Queries</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {databaseMetrics.total_queries.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Slow Queries</p>
                <p className="text-xl font-bold text-red-600">
                  {databaseMetrics.slow_queries}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Query Time</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {databaseMetrics.average_query_time}ms
                </p>
              </div>
            </div>
            {databaseMetrics.slowest_query && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Slowest Query ({databaseMetrics.slowest_duration}ms):
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 font-mono mt-1">
                  {databaseMetrics.slowest_query}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Endpoints Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>API Endpoints Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiMetrics.map((api, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="outline">{api.method}</Badge>
                    <span className="font-medium text-gray-900 dark:text-white">{api.endpoint}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Requests:</span> {api.total_requests}
                    </div>
                    <div>
                      <span className="font-medium">Success Rate:</span> {Math.round((api.successful_requests / api.total_requests) * 100)}%
                    </div>
                    <div>
                      <span className="font-medium">Avg Time:</span> {api.average_response_time}ms
                    </div>
                    <div>
                      <span className="font-medium">Range:</span> {api.min_response_time}-{api.max_response_time}ms
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {api.average_response_time > 1000 ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Update */}
      {lastUpdate && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPerformanceData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
