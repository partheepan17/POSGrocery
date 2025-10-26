/**
 * Telemetry Integration Example
 * Shows how to integrate telemetry tracking in React components
 */

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useTelemetry, useFeatureTracking, usePageTracking } from '@/hooks/useTelemetry';
import { telemetryService, UsageAnalytics } from '@/services/telemetryService';

// Example 1: Basic feature tracking
export function SalesPage() {
  const { trackClick, trackInteraction, trackApiCall } = useFeatureTracking('sales.view', 'SalesPage');

  const handleCheckout = async () => {
    const startTime = Date.now();
    
    try {
      // Track the action
      trackClick('checkout_button');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Track API call with duration
      const duration = Date.now() - startTime;
      trackApiCall('/api/sales/checkout', duration, true);
      
      console.log('Checkout completed');
    } catch (error) {
      trackApiCall('/api/sales/checkout', Date.now() - startTime, false);
      console.error('Checkout failed:', error);
    }
  };

  const handleProductSearch = (query: string) => {
    trackInteraction('product_search', 'sales.view');
    console.log('Searching for:', query);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Page</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleCheckout}>
          Process Checkout
        </Button>
        <Button 
          onClick={() => handleProductSearch('test product')}
          variant="outline"
          className="ml-2"
        >
          Search Products
        </Button>
      </CardContent>
    </Card>
  );
}

// Example 2: Page-level tracking
export function InventoryPage() {
  usePageTracking('inventory.view');

  const { trackClick, trackInteraction } = useTelemetry({
    featureCode: 'inventory.view',
    component: 'InventoryPage'
  });

  const handleAddProduct = () => {
    trackClick('add_product');
    console.log('Adding product');
  };

  const handleBulkImport = () => {
    trackInteraction('bulk_import', 'inventory.view');
    console.log('Bulk importing products');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Page</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleAddProduct}>
          Add Product
        </Button>
        <Button 
          onClick={handleBulkImport}
          variant="outline"
          className="ml-2"
        >
          Bulk Import
        </Button>
      </CardContent>
    </Card>
  );
}

// Example 3: Feature toggle tracking
export function FeatureToggleExample() {
  const { trackToggle } = useFeatureTracking('admin.features', 'FeatureToggle');

  const handleToggleFeature = async (featureCode: string, enabled: boolean) => {
    try {
      // Track the toggle action
      trackToggle(enabled);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`Feature ${featureCode} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      // Track failed toggle
      trackToggle(!enabled, false);
      console.error('Toggle failed:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Toggle Example</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => handleToggleFeature('inventory.view', true)}>
          Enable Inventory
        </Button>
        <Button 
          onClick={() => handleToggleFeature('reports.sales', false)}
          variant="outline"
          className="ml-2"
        >
          Disable Reports
        </Button>
      </CardContent>
    </Card>
  );
}

// Example 4: Performance tracking
export function PerformanceTrackingExample() {
  const { trackPerformance, trackError } = useFeatureTracking('reports.sales', 'ReportGenerator');

  const handleGenerateReport = async () => {
    const startTime = Date.now();
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Track performance
      const duration = Date.now() - startTime;
      trackPerformance('report_generation', duration, 'ms');
      
      console.log('Report generated successfully');
    } catch (error) {
      // Track error
      trackError(error as Error, 'report_generation');
      console.error('Report generation failed:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Tracking Example</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerateReport}>
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
}

// Example 5: Custom event tracking
export function CustomEventExample() {
  const { trackEvent } = useFeatureTracking('admin.analytics', 'CustomEventExample');

  const handleCustomEvent = () => {
    trackEvent({
      eventType: 'ui_interaction',
      eventData: {
        customAction: 'data_export',
        exportFormat: 'csv',
        recordCount: 1000
      },
      metadata: {
        action: 'export_data',
        component: 'DataExporter',
        duration: 1500
      }
    });
    
    console.log('Custom event tracked');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Event Example</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleCustomEvent}>
          Track Custom Event
        </Button>
      </CardContent>
    </Card>
  );
}

// Example 6: Direct telemetry service usage
export function DirectTelemetryExample() {
  useEffect(() => {
    // Track page visit
    telemetryService.trackRouteVisit('/examples/telemetry', 'admin.examples');
    
    // Track component mount
    telemetryService.trackUiInteraction('component_mount', 'admin.examples', 'DirectTelemetryExample');
    
    return () => {
      // Track component unmount
      telemetryService.trackUiInteraction('component_unmount', 'admin.examples', 'DirectTelemetryExample');
    };
  }, []);

  const handleDirectTracking = () => {
    // Direct service usage
    telemetryService.trackFeatureUsage({
      featureCode: 'admin.examples',
      eventType: 'action_click',
      eventData: {
        action: 'direct_tracking',
        timestamp: Date.now()
      },
      metadata: {
        action: 'direct_tracking',
        component: 'DirectTelemetryExample'
      }
    });
    
    console.log('Direct tracking completed');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Direct Telemetry Example</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleDirectTracking}>
          Direct Tracking
        </Button>
      </CardContent>
    </Card>
  );
}

// Example 7: Analytics dashboard integration
export function AnalyticsIntegrationExample() {
  const [analytics, setAnalytics] = React.useState<UsageAnalytics | null>(null);
  const { trackClick } = useFeatureTracking('admin.analytics', 'AnalyticsIntegration');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await telemetryService.getUsageAnalytics({
        groupBy: 'day',
        limit: 30
      });
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleRefreshAnalytics = () => {
    trackClick('refresh_analytics');
    loadAnalytics();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics Integration Example</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleRefreshAnalytics}>
          Refresh Analytics
        </Button>
        {analytics && analytics.metadata && (
          <div className="mt-4">
            <p>Total Features: {analytics.metadata.totalFeatures}</p>
            <p>Data Points: {analytics.metadata.totalDataPoints}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main example component
export function TelemetryIntegrationExample() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Telemetry Integration Examples</h1>
      <p className="text-gray-600">
        These examples show how to integrate telemetry tracking in your React components.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SalesPage />
        <InventoryPage />
        <FeatureToggleExample />
        <PerformanceTrackingExample />
        <CustomEventExample />
        <DirectTelemetryExample />
        <AnalyticsIntegrationExample />
      </div>
    </div>
  );
}
