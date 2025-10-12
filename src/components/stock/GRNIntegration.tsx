/**
 * GRN Integration Component - Links Stock Dashboard with GRN system
 * Provides quick access to GRN operations and shows recent GRN activity
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Package, 
  Truck, 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';

interface RecentGRN {
  id: number;
  grn_number: string;
  supplier_name: string;
  total_items: number;
  total_value_cents: number;
  status: 'PENDING' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED';
  created_at: string;
  received_at?: string;
}

interface GRNStats {
  pending_count: number;
  received_today: number;
  total_value_today: number;
  avg_processing_time: number;
}

export function GRNIntegration() {
  const navigate = useNavigate();
  const [recentGRNs, setRecentGRNs] = useState<RecentGRN[]>([]);
  const [grnStats, setGrnStats] = useState<GRNStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load GRN data
  useEffect(() => {
    loadGRNData();
  }, []);

  const loadGRNData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, these would be API calls
      // For now, we'll use mock data
      const mockRecentGRNs: RecentGRN[] = [
        {
          id: 1,
          grn_number: 'GRN-2025-001',
          supplier_name: 'ABC Suppliers Ltd',
          total_items: 15,
          total_value_cents: 125000,
          status: 'RECEIVED',
          created_at: '2025-10-12T10:30:00Z',
          received_at: '2025-10-12T11:45:00Z'
        },
        {
          id: 2,
          grn_number: 'GRN-2025-002',
          supplier_name: 'XYZ Trading Co',
          total_items: 8,
          total_value_cents: 87500,
          status: 'PENDING',
          created_at: '2025-10-12T14:20:00Z'
        },
        {
          id: 3,
          grn_number: 'GRN-2025-003',
          supplier_name: 'Fresh Foods Inc',
          total_items: 22,
          total_value_cents: 156000,
          status: 'PARTIAL',
          created_at: '2025-10-12T16:10:00Z'
        }
      ];

      const mockStats: GRNStats = {
        pending_count: 2,
        received_today: 1,
        total_value_today: 125000,
        avg_processing_time: 75 // minutes
      };

      setRecentGRNs(mockRecentGRNs);
      setGrnStats(mockStats);
    } catch (error) {
      console.error('Failed to load GRN data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <Badge variant="success">Received</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>;
      case 'PARTIAL':
        return <Badge variant="info">Partial</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateGRN = () => {
    navigate('/grn/new');
  };

  const handleViewGRN = (grnId: number) => {
    navigate(`/grn/${grnId}`);
  };

  const handleViewAllGRNs = () => {
    navigate('/grn');
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
      {/* GRN Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="w-5 h-5" />
            <span>GRN Operations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleCreateGRN}
              className="flex items-center space-x-2 h-12"
            >
              <Plus className="w-5 h-5" />
              <span>Create New GRN</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleViewAllGRNs}
              className="flex items-center space-x-2 h-12"
            >
              <FileText className="w-5 h-5" />
              <span>View All GRNs</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/purchasing/grn')}
              className="flex items-center space-x-2 h-12"
            >
              <Package className="w-5 h-5" />
              <span>Receive GRN</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* GRN Statistics */}
      {grnStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending GRNs</p>
                  <p className="text-2xl font-bold text-yellow-600">{grnStats.pending_count}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Received Today</p>
                  <p className="text-2xl font-bold text-green-600">{grnStats.received_today}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Value Today</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(grnStats.total_value_today)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Processing</p>
                  <p className="text-2xl font-bold text-purple-600">{grnStats.avg_processing_time}m</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent GRNs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Recent GRNs</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewAllGRNs}
              className="flex items-center space-x-1"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View All</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentGRNs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No recent GRNs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentGRNs.map((grn) => (
                <div
                  key={grn.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {grn.grn_number}
                      </h3>
                      {getStatusBadge(grn.status)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Supplier:</span> {grn.supplier_name}
                      </div>
                      <div>
                        <span className="font-medium">Items:</span> {grn.total_items}
                      </div>
                      <div>
                        <span className="font-medium">Value:</span> {formatCurrency(grn.total_value_cents)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Created: {formatDate(grn.created_at)}
                      {grn.received_at && (
                        <span className="ml-4">
                          Received: {formatDate(grn.received_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewGRN(grn.id)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
