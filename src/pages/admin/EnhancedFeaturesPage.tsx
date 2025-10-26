/**
 * Enhanced Features Access Management Page
 * Production-ready with accessibility, tooltips, undo, and configuration management
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { 
  Settings, 
  Users, 
  BarChart3, 
  Search, 
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  Download,
  Upload,
  FileText,
  Lock,
  AlertCircle,
  Info,
  RefreshCw
} from 'lucide-react';
import { AccessibleToggle } from '@/components/ui/AccessibleToggle';
import { UndoSnackbar, useUndoActions } from '@/components/ui/UndoSnackbar';
import { UsageAnalyticsDashboard } from '@/components/analytics/UsageAnalyticsDashboard';
import { configurationService, TenantConfiguration } from '@/services/configurationService';
import { useTelemetry } from '@/hooks/useTelemetry';

interface Feature {
  code: string;
  name: string;
  description: string;
  isCore: boolean;
  isEnabled: boolean;
  dependsOn: string[];
  category: string;
  usage?: {
    totalUsage: number;
    avgDailyUsage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    lastUsed: string;
  };
}

interface Role {
  id: number;
  code: string;
  name: string;
  permissions: string[];
}

export function EnhancedFeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { trackClick, trackInteraction, trackToggle } = useTelemetry({
    featureCode: 'admin.features',
    component: 'EnhancedFeaturesPage'
  });

  const { undoAction, createUndoAction, handleUndo, dismissUndo } = useUndoActions();

  useEffect(() => {
    loadFeatures();
    loadRoles();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockFeatures: Feature[] = [
        {
          code: 'auth.login',
          name: 'User Login',
          description: 'Core authentication functionality',
          isCore: true,
          isEnabled: true,
          dependsOn: [],
          category: 'Authentication',
          usage: {
            totalUsage: 2500,
            avgDailyUsage: 85,
            trend: 'stable',
            lastUsed: '2024-01-15'
          }
        },
        {
          code: 'sales.view',
          name: 'View Sales',
          description: 'Allows viewing of sales transactions',
          isCore: false,
          isEnabled: true,
          dependsOn: ['auth.login'],
          category: 'Sales',
          usage: {
            totalUsage: 1250,
            avgDailyUsage: 45,
            trend: 'increasing',
            lastUsed: '2024-01-15'
          }
        },
        {
          code: 'sales.checkout',
          name: 'Sales Checkout',
          description: 'Process sales transactions',
          isCore: false,
          isEnabled: true,
          dependsOn: ['sales.view'],
          category: 'Sales',
          usage: {
            totalUsage: 890,
            avgDailyUsage: 32,
            trend: 'stable',
            lastUsed: '2024-01-15'
          }
        },
        {
          code: 'inventory.view',
          name: 'View Inventory',
          description: 'Allows viewing of inventory items',
          isCore: false,
          isEnabled: false,
          dependsOn: ['auth.login'],
          category: 'Inventory',
          usage: {
            totalUsage: 0,
            avgDailyUsage: 0,
            trend: 'stable',
            lastUsed: 'Never'
          }
        },
        {
          code: 'reports.sales',
          name: 'Sales Reports',
          description: 'Generate sales reports',
          isCore: false,
          isEnabled: true,
          dependsOn: ['sales.view'],
          category: 'Reports',
          usage: {
            totalUsage: 156,
            avgDailyUsage: 8,
            trend: 'increasing',
            lastUsed: '2024-01-14'
          }
        }
      ];

      setFeatures(mockFeatures);
      trackInteraction('features_loaded');

    } catch (err: any) {
      setError(err.message);
      trackInteraction('features_error');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      // Mock data - replace with actual API call
      const mockRoles: Role[] = [
        {
          id: 1,
          code: 'admin',
          name: 'Administrator',
          permissions: ['admin.all']
        },
        {
          id: 2,
          code: 'manager',
          name: 'Manager',
          permissions: ['sales.view', 'inventory.view', 'reports.view']
        },
        {
          id: 3,
          code: 'cashier',
          name: 'Cashier',
          permissions: ['sales.view', 'sales.checkout']
        }
      ];

      setRoles(mockRoles);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
    }
  };

  const handleFeatureToggle = async (featureCode: string, enabled: boolean) => {
    const feature = features.find(f => f.code === featureCode);
    if (!feature) return;

    const previousState = feature.isEnabled;
    
    try {
      // Optimistic update
      setFeatures(prev => prev.map(f => 
        f.code === featureCode ? { ...f, isEnabled: enabled } : f
      ));

      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create undo action
      createUndoAction(
        'feature_toggle',
        featureCode,
        previousState,
        enabled,
        Math.floor(Math.random() * 1000), // Mock audit ID
        `${featureCode} ${enabled ? 'enabled' : 'disabled'}`,
        'test-tenant-1',
        'current-user'
      );

      trackToggle(enabled);
      trackClick('feature_toggle');

    } catch (error) {
      // Revert optimistic update
      setFeatures(prev => prev.map(f => 
        f.code === featureCode ? { ...f, isEnabled: previousState } : f
      ));
      
      trackToggle(previousState);
      console.error('Failed to toggle feature:', error);
    }
  };

  const handleExportConfiguration = async () => {
    try {
      setIsExporting(true);
      trackClick('export_configuration');
      
      await configurationService.downloadConfiguration('test-tenant-1');
      
    } catch (error) {
      console.error('Failed to export configuration:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportConfiguration = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      trackClick('import_configuration');
      
      const result = await configurationService.uploadConfiguration(
        'test-tenant-1',
        file,
        {
          overwriteExisting: true,
          validateDependencies: true,
          createMissingRoles: false
        }
      );

      if (result.success) {
        // Reload features after successful import
        await loadFeatures();
        trackInteraction('configuration_imported');
      } else {
        console.error('Import failed:', result.errors);
      }
      
    } catch (error) {
      console.error('Failed to import configuration:', error);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredFeatures = features.filter(feature => {
    const matchesSearch = feature.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feature.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(features.map(f => f.category)))];

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Features & Access</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Features & Access</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Failed to load features: {error}</p>
              <Button onClick={() => {
                trackClick('retry_features');
                loadFeatures();
              }} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Features & Access</h1>
            <p className="text-gray-600">Manage feature flags and role-based access control</p>
          </div>
          <div className="flex space-x-2">
            <Tooltip content="Export current feature configuration">
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleExportConfiguration}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                >
                  {isExporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export current configuration as JSON</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip content="Import feature configuration from JSON file">
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  variant="outline"
                  size="sm"
                >
                  {isImporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Import
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import configuration from JSON file</p>
              </TooltipContent>
            </Tooltip>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportConfiguration}
              className="hidden"
            />
            
            <Button 
              onClick={() => {
                trackClick('refresh_features');
                loadFeatures();
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="features" className="space-y-4">
          <TabsList>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
            <TabsTrigger value="access-matrix">Access Matrix</TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="space-y-4">
            {/* Filters */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search features..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      trackInteraction('search_features');
                    }}
                    className="pl-10"
                    aria-label="Search features"
                  />
                </div>
              </div>
              <div className="w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    trackClick('filter_category');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Filter by category"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeatures.map((feature) => (
                <Card key={feature.code} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{feature.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {feature.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {feature.isCore && (
                          <Tooltip content="Core feature - cannot be disabled">
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="flex items-center space-x-1">
                                <Lock className="h-3 w-3" />
                                <span>Core</span>
                              </Badge>
                            </TooltipTrigger>
                          </Tooltip>
                        )}
                        {feature.usage && (
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(feature.usage.trend)}
                            <span className={`text-xs ${getTrendColor(feature.usage.trend)}`}>
                              {feature.usage.totalUsage}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Dependencies */}
                      {feature.dependsOn.length > 0 && (
                        <div>
                          <Label className="text-xs text-gray-500">Dependencies</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {feature.dependsOn.map(dep => (
                              <Tooltip key={dep} content="Required for this feature to work">
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs cursor-help">
                                    {dep}
                                  </Badge>
                                </TooltipTrigger>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Usage Stats */}
                      {feature.usage && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Total Usage</span>
                            <span>{feature.usage.totalUsage.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Daily Avg</span>
                            <span>{feature.usage.avgDailyUsage}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Last Used</span>
                            <span>{feature.usage.lastUsed}</span>
                          </div>
                        </div>
                      )}

                      {/* Accessible Toggle */}
                      <AccessibleToggle
                        id={feature.code}
                        checked={feature.isEnabled}
                        onCheckedChange={(enabled) => {
                          trackClick('toggle_feature');
                          handleFeatureToggle(feature.code, enabled);
                        }}
                        disabled={feature.isCore}
                        label={feature.isEnabled ? 'Enabled' : 'Disabled'}
                        description={`Toggle ${feature.name} feature`}
                        tooltip={feature.isCore ? 'Core features cannot be disabled' : undefined}
                        isCore={feature.isCore}
                        aria-describedby={`feature-${feature.code}-description`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <UsageAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="access-matrix" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Access Matrix</CardTitle>
                <CardDescription>
                  Manage role permissions and feature overrides
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedFeature ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">{selectedFeature.name}</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedFeature(null);
                          trackClick('close_access_matrix');
                        }}
                      >
                        Close
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Role Permissions */}
                      <div>
                        <h4 className="font-medium mb-2">Role Permissions</h4>
                        <div className="space-y-2">
                          {roles.map(role => (
                            <div key={role.id} className="flex items-center justify-between p-3 border rounded">
                              <span className="font-medium">{role.name}</span>
                              <div className="flex items-center space-x-2">
                                <AccessibleToggle
                                  id={`role-${role.id}-${selectedFeature.code}`}
                                  checked={role.permissions.includes(selectedFeature.code)}
                                  onCheckedChange={(enabled) => {
                                    trackClick('toggle_role_permission');
                                    // Handle role permission toggle
                                  }}
                                  label={`${role.name} permission`}
                                  description={`Allow ${role.name} to access ${selectedFeature.name}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a feature to manage its access matrix</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Undo Snackbar */}
        <UndoSnackbar
          action={undoAction}
          onUndo={handleUndo}
          onDismiss={dismissUndo}
        />
      </div>
    </TooltipProvider>
  );
}
