import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/Separator';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { 
  Search, 
  Filter, 
  Settings, 
  Shield, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { useFeatures } from '@/frontend/state/features/useFeatures';
// import { useToast } from '@/hooks/use-toast';
// import { ImpactPreviewModal } from '@/components/features/ImpactPreviewModal';
// import { AccessMatrix } from '@/components/features/AccessMatrix';

interface Feature {
  code: string;
  name: string;
  description: string;
  category: string;
  isCore: boolean;
  isEnabled: boolean;
  dependsOn: string[];
  lastUpdated?: string;
  updatedBy?: string;
}

interface Role {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface RolePermission {
  roleId: number;
  permissionId: number;
  granted: boolean;
}

interface RoleFeatureOverride {
  roleId: number;
  featureCode: string;
  isEnabled: boolean;
}

const FEATURE_CATEGORIES = [
  'Authentication',
  'Sales',
  'Inventory',
  'Pricing',
  'Reports',
  'Administration',
  'System'
];

export const FeaturesAccessPage: React.FC = () => {
  const { 
    isLoaded, 
    isLoading, 
    hasError, 
    error,
    refresh,
    hasFeature
  } = useFeatures();
  
  // const { toast } = useToast();
  
  // State
  const [features, setFeatures] = useState<Feature[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [roleFeatureOverrides, setRoleFeatureOverrides] = useState<RoleFeatureOverride[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{
    featureCode: string;
    isEnabled: boolean;
  } | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [blockingDependents, setBlockingDependents] = useState<string[]>([]);
  const [cascadeTargets, setCascadeTargets] = useState<string[]>([]);

  // Load data
  useEffect(() => {
    loadFeaturesData();
    loadRolesData();
    loadPermissionsData();
  }, []);

  const loadFeaturesData = async () => {
    try {
      // This would typically come from an API
      const mockFeatures: Feature[] = [
        {
          code: 'auth.login',
          name: 'User Login',
          description: 'Allows users to log in to the system',
          category: 'Authentication',
          isCore: true,
          isEnabled: true,
          dependsOn: []
        },
        {
          code: 'sales.view',
          name: 'View Sales',
          description: 'Allows viewing of sales transactions',
          category: 'Sales',
          isCore: false,
          isEnabled: hasFeature('sales.view'),
          dependsOn: ['auth.login']
        },
        {
          code: 'sales.create',
          name: 'Create Sales',
          description: 'Allows creating new sales transactions',
          category: 'Sales',
          isCore: false,
          isEnabled: hasFeature('sales.create'),
          dependsOn: ['sales.view']
        },
        {
          code: 'inventory.view',
          name: 'View Inventory',
          description: 'Allows viewing inventory levels and products',
          category: 'Inventory',
          isCore: false,
          isEnabled: hasFeature('inventory.view'),
          dependsOn: ['auth.login']
        },
        {
          code: 'inventory.manage',
          name: 'Manage Inventory',
          description: 'Allows managing inventory items and stock levels',
          category: 'Inventory',
          isCore: false,
          isEnabled: hasFeature('inventory.manage'),
          dependsOn: ['inventory.view']
        },
        {
          code: 'reports.sales',
          name: 'Sales Reports',
          description: 'Generate and view sales reports',
          category: 'Reports',
          isCore: false,
          isEnabled: hasFeature('reports.sales'),
          dependsOn: ['sales.view']
        },
        {
          code: 'admin.features',
          name: 'Feature Management',
          description: 'Manage feature flags and access controls',
          category: 'Administration',
          isCore: false,
          isEnabled: hasFeature('admin.features'),
          dependsOn: ['auth.login']
        }
      ];
      
      setFeatures(mockFeatures);
    } catch (error) {
      console.error('Failed to load features:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to load features data',
      //   variant: 'destructive'
      // });
    }
  };

  const loadRolesData = async () => {
    try {
      // This would typically come from an API
      const mockRoles: Role[] = [
        { id: 1, code: 'admin', name: 'Administrator', description: 'Full system access' },
        { id: 2, code: 'manager', name: 'Manager', description: 'Management level access' },
        { id: 3, code: 'cashier', name: 'Cashier', description: 'Point of sale access' }
      ];
      setRoles(mockRoles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadPermissionsData = async () => {
    try {
      // This would typically come from an API
      const mockPermissions: Permission[] = [
        { id: 1, code: 'admin.all', name: 'All Admin Permissions', description: 'Full administrative access' },
        { id: 2, code: 'sales.view', name: 'View Sales', description: 'View sales transactions' },
        { id: 3, code: 'sales.create', name: 'Create Sales', description: 'Create new sales' },
        { id: 4, code: 'inventory.view', name: 'View Inventory', description: 'View inventory levels' },
        { id: 5, code: 'inventory.manage', name: 'Manage Inventory', description: 'Manage inventory items' },
        { id: 6, code: 'reports.sales', name: 'Sales Reports', description: 'Generate sales reports' },
        { id: 7, code: 'feature.toggle', name: 'Toggle Features', description: 'Enable/disable features' }
      ];
      setPermissions(mockPermissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handleFeatureToggle = async (featureCode: string, isEnabled: boolean) => {
    setPendingToggle({ featureCode, isEnabled });
    
    try {
      // Check dependencies first
      const response = await fetch(`/api/admin/features/dependencies/${featureCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (!isEnabled && data.data.cascadeInfo.blockingDependents.length > 0) {
          setBlockingDependents(data.data.cascadeInfo.blockingDependents);
          setCascadeTargets(data.data.cascadeInfo.cascadeTargets);
          setShowImpactModal(true);
          return;
        }
      }

      // Proceed with toggle
      await performFeatureToggle(featureCode, isEnabled, false);
    } catch (error) {
      console.error('Failed to check dependencies:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to check feature dependencies',
      //   variant: 'destructive'
      // });
    }
  };

  const performFeatureToggle = async (featureCode: string, isEnabled: boolean, cascade: boolean) => {
    setIsToggling(true);
    
    try {
      const response = await fetch('/api/admin/features/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          featureCode,
          isEnabled,
          cascade
        })
      });

      const result = await response.json();

      if (result.ok) {
        // Update local state optimistically
        setFeatures(prev => 
          prev.map(f => 
            f.code === featureCode 
              ? { ...f, isEnabled, lastUpdated: new Date().toISOString() }
              : f
          )
        );

        // toast({
        //   title: 'Success',
        //   description: result.message,
        //   variant: 'default'
        // });

        // Refresh features data
        await refresh();
      } else {
        if (result.error === 'DEPENDENTS') {
          setBlockingDependents(result.blockingDependents || []);
          setCascadeTargets([]);
          setShowImpactModal(true);
        } else {
          throw new Error(result.message || 'Toggle failed');
        }
      }
    } catch (error: any) {
      console.error('Feature toggle failed:', error);
      // toast({
      //   title: 'Error',
      //   description: error.message || 'Failed to toggle feature', 
      //   variant: 'destructive'
      // });
    } finally {
      setIsToggling(false);
      setPendingToggle(null);
    }
  };

  const handleImpactConfirm = (cascade: boolean) => {
    if (pendingToggle) {
      performFeatureToggle(pendingToggle.featureCode, pendingToggle.isEnabled, cascade);
    }
    setShowImpactModal(false);
  };

  const handlePermissionChange = async (roleId: number, permissionId: number, granted: boolean) => {
    try {
      // This would typically call an API to update role permissions
      console.log('Updating role permission:', { roleId, permissionId, granted });
      
      // Update local state
      setRolePermissions(prev => 
        prev.map(rp => 
          rp.roleId === roleId && rp.permissionId === permissionId 
            ? { ...rp, granted }
            : rp
        )
      );

      // toast({
      //   title: 'Success',
      //   description: 'Permission updated successfully',
      //   variant: 'default'
      // });
    } catch (error) {
      console.error('Failed to update permission:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to update permission',
      //   variant: 'destructive'
      // });
    }
  };

  const handleFeatureOverrideChange = async (roleId: number, featureCode: string, isEnabled: boolean) => {
    try {
      // This would typically call an API to update role feature overrides
      console.log('Updating role feature override:', { roleId, featureCode, isEnabled });
      
      // Update local state
      setRoleFeatureOverrides(prev => 
        prev.map(ro => 
          ro.roleId === roleId && ro.featureCode === featureCode 
            ? { ...ro, isEnabled }
            : ro
        )
      );

      // toast({
      //   title: 'Success',
      //   description: 'Feature override updated successfully',     
      //   variant: 'default'
      // });
    } catch (error) {
      console.error('Failed to update feature override:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to update feature override',
      //   variant: 'destructive'
      // });
    }
  };

  // Filter features
  const filteredFeatures = features.filter(feature => {
    const matchesSearch = feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         feature.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group features by category
  const featuresByCategory = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  if (hasError()) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load features: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Features & Access Control</h1>
          <p className="text-muted-foreground">
            Manage feature flags and role-based access controls
          </p>
        </div>
        <Button onClick={refresh} disabled={isLoading()}>
          {isLoading() ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="access">Access Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search features..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="all">All Categories</option>
                    {FEATURE_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.keys(featuresByCategory).length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-lg text-muted-foreground">No features found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category}</CardTitle>
                  <CardDescription>
                    {categoryFeatures.length} feature{categoryFeatures.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryFeatures.map((feature) => (
                    <div key={feature.code} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{feature.name}</span>
                          {feature.isCore && (
                            <Badge variant="secondary" className="text-xs">Core</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {feature.code}
                          </Badge>
                          {feature.dependsOn.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Depends on: {feature.dependsOn.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`feature-${feature.code}`} className="text-sm">
                          {feature.isEnabled ? 'Enabled' : 'Disabled'}
                        </Label>
                        <Switch
                          id={`feature-${feature.code}`}
                          checked={feature.isEnabled}
                          onCheckedChange={(checked) => 
                            handleFeatureToggle(feature.code, checked)
                          }
                          disabled={isToggling || feature.isCore}
                        />
                        <div data-testid={feature.isEnabled ? 'enabled-icon' : 'disabled-icon'}>
                          {feature.isEnabled ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Matrix</CardTitle>
              <CardDescription>
                Manage role-based access to features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="font-medium">Feature</div>
                  <div className="font-medium">Admin</div>
                  <div className="font-medium">Manager</div>
                  <div className="font-medium">Cashier</div>
                </div>
                {features.map((feature) => (
                  <div key={feature.code} className="grid grid-cols-4 gap-4 items-center p-2 border rounded">
                    <div>
                      <div className="font-medium">Feature: {feature.code}</div>
                      <div className="text-sm text-muted-foreground">{feature.name}</div>
                    </div>
                    {roles.map((role) => (
                      <div key={role.id} className="text-center">
                        <span className="text-sm">{role.code}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Impact Preview Modal */}
      {showImpactModal && pendingToggle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <p>Impact Preview Modal would go here</p>
            <button onClick={() => setShowImpactModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
