/**
 * Feature Test Component
 * Test component to verify feature state management functionality
 */

import React, { useState, useEffect } from 'react';
import { useFeatures, useFeature, usePermission, useFeatureSummary } from './useFeatures';

interface FeatureTestComponentProps {
  onStateChange?: (state: any) => void;
}

export const FeatureTestComponent: React.FC<FeatureTestComponentProps> = ({
  onStateChange
}) => {
  const [testResults, setTestResults] = useState<{ [key: string]: any }>({});
  const [refreshCount, setRefreshCount] = useState(0);

  const {
    features,
    loading,
    error,
    connected,
    refresh,
    hasFeature,
    can,
    listEnabled,
    listEnabledPermissions,
    getSummary,
    isAdmin,
    isManager,
    isCashier,
    getUserRole,
    getTenant
  } = useFeatures();

  // Test individual feature and permission hooks
  const salesViewFeature = useFeature('sales.view');
  const adminPermission = usePermission('admin.all');
  const summary = useFeatureSummary();

  // Run tests when features change
  useEffect(() => {
    if (features) {
      const tests = {
        // Basic state tests
        hasFeatures: features !== null,
        hasEnabledFeatures: Object.keys(features.enabled).length > 0,
        hasPermissions: Object.keys(features.permissions).length > 0,
        hasUser: features.user !== null,
        hasTenant: features.tenant !== null,
        
        // Feature tests
        salesViewEnabled: hasFeature('sales.view'),
        inventoryViewEnabled: hasFeature('inventory.view'),
        reportsViewEnabled: hasFeature('reports.view'),
        
        // Permission tests
        adminPermission: can('admin.all'),
        salesPermission: can('sales.view'),
        inventoryPermission: can('inventory.view'),
        
        // Role tests
        isAdminRole: isAdmin(),
        isManagerRole: isManager(),
        isCashierRole: isCashier(),
        userRole: getUserRole(),
        tenant: getTenant(),
        
        // Hook tests
        salesViewHook: salesViewFeature,
        adminPermissionHook: adminPermission,
        
        // Summary tests
        summaryExists: summary !== null,
        summaryTotalFeatures: summary?.totalFeatures || 0,
        summaryEnabledFeatures: summary?.enabledFeatures || 0,
        summaryTotalPermissions: summary?.totalPermissions || 0,
        summaryEnabledPermissions: summary?.enabledPermissions || 0,
        
        // List tests
        enabledFeaturesList: listEnabled(),
        enabledPermissionsList: listEnabledPermissions(),
        
        // Connection tests
        isConnected: connected,
        isLoading: loading,
        hasError: error !== null,
        
        // Timestamp
        lastUpdated: new Date().toISOString()
      };

      setTestResults(tests);
      
      if (onStateChange) {
        onStateChange({
          features,
          tests,
          refreshCount
        });
      }
    }
  }, [
    features, 
    hasFeature, 
    can, 
    listEnabled, 
    listEnabledPermissions, 
    isAdmin, 
    isManager, 
    isCashier, 
    getUserRole, 
    getTenant,
    salesViewFeature,
    adminPermission,
    summary,
    connected,
    loading,
    error,
    refreshCount,
    onStateChange
  ]);

  const handleRefresh = async () => {
    setRefreshCount(prev => prev + 1);
    await refresh();
  };

  const handleConnect = () => {
    // This would be handled by the FeatureProvider
    console.log('Connect requested');
  };

  const handleDisconnect = () => {
    // This would be handled by the FeatureProvider
    console.log('Disconnect requested');
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Feature State Test</h2>
      
      {/* Status */}
      <div className="mb-4 p-3 bg-white rounded border">
        <h3 className="font-semibold mb-2">Status</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Loading: {loading ? '🟡 Yes' : '🟢 No'}</div>
          <div>Connected: {connected ? '🟢 Yes' : '🔴 No'}</div>
          <div>Error: {error ? `🔴 ${error}` : '🟢 None'}</div>
          <div>Features: {features ? '🟢 Loaded' : '🔴 Not loaded'}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 p-3 bg-white rounded border">
        <h3 className="font-semibold mb-2">Actions</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleConnect}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Connect
          </button>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Refresh count: {refreshCount}
        </div>
      </div>

      {/* Test Results */}
      <div className="mb-4 p-3 bg-white rounded border">
        <h3 className="font-semibold mb-2">Test Results</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(testResults).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="font-mono text-xs">{key}:</span>
              <span className={typeof value === 'boolean' ? (value ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}>
                {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Features List */}
      {features && (
        <div className="mb-4 p-3 bg-white rounded border">
          <h3 className="font-semibold mb-2">Enabled Features</h3>
          <div className="max-h-32 overflow-y-auto">
            {listEnabled().map(feature => (
              <div key={feature} className="text-sm font-mono text-green-600">
                ✓ {feature}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions List */}
      {features && (
        <div className="mb-4 p-3 bg-white rounded border">
          <h3 className="font-semibold mb-2">Enabled Permissions</h3>
          <div className="max-h-32 overflow-y-auto">
            {listEnabledPermissions().map(permission => (
              <div key={permission} className="text-sm font-mono text-green-600">
                ✓ {permission}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="p-3 bg-white rounded border">
          <h3 className="font-semibold mb-2">Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Features: {summary.totalFeatures}</div>
            <div>Enabled Features: {summary.enabledFeatures}</div>
            <div>Total Permissions: {summary.totalPermissions}</div>
            <div>Enabled Permissions: {summary.enabledPermissions}</div>
            <div>Categories: {summary.featureCategories.join(', ')}</div>
            <div>Role: {features?.user.role}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureTestComponent;










