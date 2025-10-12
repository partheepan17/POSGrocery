import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AlertBanner } from '../ui/AlertDialog';
import { 
  Trash2, 
  AlertTriangle, 
  Shield, 
  Database, 
  CheckCircle, 
  XCircle,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DemoStats {
  products: number;
  customers: number;
  suppliers: number;
  invoices: number;
  categories: number;
  users: number;
}

interface PurgeResult {
  success: boolean;
  message: string;
  purgedCounts: DemoStats;
  statsBefore: DemoStats;
  errors?: string[];
}

export function AdminSection() {
  const [demoStats, setDemoStats] = useState<DemoStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [lastPurgeResult, setLastPurgeResult] = useState<PurgeResult | null>(null);

  useEffect(() => {
    loadDemoStats();
  }, []);

  const loadDemoStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/demo-stats');
      const data = await response.json();
      
      if (data.success) {
        setDemoStats(data.stats);
      } else {
        toast.error('Failed to load demo data statistics');
      }
    } catch (error) {
      console.error('Error loading demo stats:', error);
      toast.error('Failed to load demo data statistics');
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeDemoData = async () => {
    if (!managerPin) {
      toast.error('Please enter manager PIN');
      return;
    }

    if (!/^\d{4}$/.test(managerPin)) {
      toast.error('Manager PIN must be 4 digits');
      return;
    }

    try {
      setPurging(true);
      const response = await fetch('/api/admin/purge-demo-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerPin }),
      });

      const result: PurgeResult = await response.json();
      setLastPurgeResult(result);

      if (result.success) {
        toast.success('Demo data purged successfully');
        setManagerPin('');
        setShowPurgeConfirm(false);
        // Reload stats to show updated counts
        await loadDemoStats();
      } else {
        toast.error(result.message || 'Failed to purge demo data');
      }
    } catch (error) {
      console.error('Error purging demo data:', error);
      toast.error('Failed to purge demo data');
    } finally {
      setPurging(false);
    }
  };

  const totalDemoRecords = demoStats ? Object.values(demoStats).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Tools</h1>
            <p className="text-gray-600 text-lg mt-1">System administration and maintenance tools</p>
          </div>
        </div>
      </div>

      {/* Demo Data Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Demo Data Statistics</h2>
            </div>
            <Button
              onClick={loadDemoStats}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading statistics...</span>
            </div>
          ) : demoStats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{demoStats.products}</div>
                <div className="text-sm text-blue-800">Demo Products</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{demoStats.customers}</div>
                <div className="text-sm text-green-800">Demo Customers</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{demoStats.suppliers}</div>
                <div className="text-sm text-purple-800">Demo Suppliers</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{demoStats.invoices}</div>
                <div className="text-sm text-orange-800">Demo Invoices</div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{demoStats.categories}</div>
                <div className="text-sm text-indigo-800">Demo Categories</div>
              </div>
              <div className="bg-pink-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-pink-600">{demoStats.users}</div>
                <div className="text-sm text-pink-800">Demo Users</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No statistics available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purge Demo Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Trash2 className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold">Purge Demo Data</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertBanner type="warning" className="border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Warning: Destructive Operation</p>
                <p className="text-amber-700 text-sm">
                  This will permanently delete all demo data (records with names starting with TEST/ or DEMO/). 
                  This action cannot be undone and will improve database performance.
                </p>
              </div>
            </div>
          </AlertBanner>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-900">What will be purged:</span>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 ml-6">
              <li>• Products with names starting with TEST/ or DEMO/</li>
              <li>• Customers with names starting with TEST/ or DEMO/</li>
              <li>• Suppliers with names starting with TEST/ or DEMO/</li>
              <li>• Invoices created by demo users or for demo customers</li>
              <li>• Categories with names starting with TEST/ or DEMO/ (if no products reference them)</li>
              <li>• Users with names starting with TEST/ or DEMO/ (except admin users)</li>
            </ul>
          </div>

          {!showPurgeConfirm ? (
            <div className="flex items-center gap-4">
              <Input
                type="password"
                placeholder="Enter 4-digit manager PIN"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                maxLength={4}
                className="w-48"
              />
              <Button
                onClick={() => setShowPurgeConfirm(true)}
                disabled={!managerPin || managerPin.length !== 4 || totalDemoRecords === 0}
                variant="danger"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Purge Demo Data
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <AlertBanner type="error" className="border-red-200 bg-red-50">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">Confirm Purge Operation</p>
                    <p className="text-red-700 text-sm">
                      You are about to delete {totalDemoRecords} demo records. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </AlertBanner>
              
              <div className="flex items-center gap-4">
                <Button
                  onClick={handlePurgeDemoData}
                  disabled={purging}
                  variant="danger"
                >
                  {purging ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {purging ? 'Purging...' : 'Confirm Purge'}
                </Button>
                <Button
                  onClick={() => {
                    setShowPurgeConfirm(false);
                    setManagerPin('');
                  }}
                  variant="outline"
                  disabled={purging}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {totalDemoRecords === 0 && (
            <div className="text-center py-4 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>No demo data found. Database is clean!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Purge Result */}
      {lastPurgeResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {lastPurgeResult.success ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <h2 className="text-xl font-semibold">
                {lastPurgeResult.success ? 'Purge Completed' : 'Purge Failed'}
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-700">{lastPurgeResult.message}</p>
              
              {lastPurgeResult.success && lastPurgeResult.purgedCounts && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {lastPurgeResult.purgedCounts.products}
                    </div>
                    <div className="text-sm text-blue-800">Products Purged</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {lastPurgeResult.purgedCounts.customers}
                    </div>
                    <div className="text-sm text-green-800">Customers Purged</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {lastPurgeResult.purgedCounts.suppliers}
                    </div>
                    <div className="text-sm text-purple-800">Suppliers Purged</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">
                      {lastPurgeResult.purgedCounts.invoices}
                    </div>
                    <div className="text-sm text-orange-800">Invoices Purged</div>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-indigo-600">
                      {lastPurgeResult.purgedCounts.categories}
                    </div>
                    <div className="text-sm text-indigo-800">Categories Purged</div>
                  </div>
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-pink-600">
                      {lastPurgeResult.purgedCounts.users}
                    </div>
                    <div className="text-sm text-pink-800">Users Purged</div>
                  </div>
                </div>
              )}

              {lastPurgeResult.errors && lastPurgeResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {lastPurgeResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

