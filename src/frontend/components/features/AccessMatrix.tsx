import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { useFeatures } from '@/frontend/state/features/useFeatures';
// import { useToast } from '@/hooks/use-toast';

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

interface AccessMatrixProps {
  selectedFeature: string;
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  roleFeatureOverrides: RoleFeatureOverride[];
  onPermissionChange: (roleId: number, permissionId: number, granted: boolean) => void;
  onFeatureOverrideChange: (roleId: number, featureCode: string, isEnabled: boolean) => void;
  isLoading?: boolean;
}

export const AccessMatrix: React.FC<AccessMatrixProps> = ({
  selectedFeature,
  roles,
  permissions,
  rolePermissions,
  roleFeatureOverrides,
  onPermissionChange,
  onFeatureOverrideChange,
  isLoading = false
}) => {
  // const { toast } = useToast();
  const [localRolePermissions, setLocalRolePermissions] = useState<RolePermission[]>(rolePermissions);
  const [localRoleOverrides, setLocalRoleOverrides] = useState<RoleFeatureOverride[]>(roleFeatureOverrides);

  useEffect(() => {
    setLocalRolePermissions(rolePermissions);
  }, [rolePermissions]);

  useEffect(() => {
    setLocalRoleOverrides(roleFeatureOverrides);
  }, [roleFeatureOverrides]);

  const handlePermissionChange = (roleId: number, permissionId: number, granted: boolean) => {
    setLocalRolePermissions(prev => 
      prev.map(rp => 
        rp.roleId === roleId && rp.permissionId === permissionId 
          ? { ...rp, granted }
          : rp
      )
    );
    onPermissionChange(roleId, permissionId, granted);
  };

  const handleFeatureOverrideChange = (roleId: number, featureCode: string, isEnabled: boolean) => {
    setLocalRoleOverrides(prev => 
      prev.map(ro => 
        ro.roleId === roleId && ro.featureCode === featureCode 
          ? { ...ro, isEnabled }
          : ro
      )
    );
    onFeatureOverrideChange(roleId, featureCode, isEnabled);
  };

  const getRolePermission = (roleId: number, permissionId: number): boolean => {
    const rp = localRolePermissions.find(rp => rp.roleId === roleId && rp.permissionId === permissionId);
    return rp?.granted || false;
  };

  const getRoleFeatureOverride = (roleId: number, featureCode: string): boolean | null => {
    const ro = localRoleOverrides.find(ro => ro.roleId === roleId && ro.featureCode === featureCode);
    return ro?.isEnabled ?? null;
  };

  const getRoleName = (roleId: number): string => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || `Role ${roleId}`;
  };

  const getPermissionName = (permissionId: number): string => {
    const permission = permissions.find(p => p.id === permissionId);
    return permission?.name || `Permission ${permissionId}`;
  };

  const getPermissionCode = (permissionId: number): string => {
    const permission = permissions.find(p => p.id === permissionId);
    return permission?.code || `permission-${permissionId}`;
  };

  // Filter permissions related to the selected feature
  const featurePermissions = permissions.filter(p => 
    p.code.includes(selectedFeature.split('.')[0]) || 
    p.code.includes('admin') ||
    p.code.includes('feature')
  );

  return (
    <div className="space-y-6">
      {/* Feature Availability by Role */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Availability by Role</CardTitle>
          <CardDescription>
            Control which roles can access the <code className="bg-muted px-1 rounded">{selectedFeature}</code> feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map((role) => {
              const override = getRoleFeatureOverride(role.id, selectedFeature);
              return (
                <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {role.code}
                      </Badge>
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`feature-override-${role.id}`} className="text-sm">
                      Override
                    </Label>
                    <Switch
                      id={`feature-override-${role.id}`}
                      checked={override === true}
                      onCheckedChange={(checked) => 
                        handleFeatureOverrideChange(role.id, selectedFeature, checked)
                      }
                      disabled={isLoading}
                    />
                    <span className="text-xs text-muted-foreground">
                      {override === null ? 'Inherit' : override ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Roles × Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions Matrix</CardTitle>
          <CardDescription>
            Manage which permissions each role has for the <code className="bg-muted px-1 rounded">{selectedFeature}</code> feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Role</TableHead>
                  {featurePermissions.map((permission) => (
                    <TableHead key={permission.id} className="text-center min-w-24">
                      <div className="space-y-1">
                        <div className="text-xs font-medium">{permission.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {permission.code}
                        </Badge>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div>{role.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {role.code}
                        </Badge>
                      </div>
                    </TableCell>
                    {featurePermissions.map((permission) => (
                      <TableCell key={permission.id} className="text-center">
                        <Checkbox
                          checked={getRolePermission(role.id, permission.id)}
                          onChange={(e) => 
                            handlePermissionChange(role.id, permission.id, e.target.checked)
                          }
                          disabled={isLoading}
                          className="mx-auto"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Roles:</span> {roles.length}
            </div>
            <div>
              <span className="font-medium">Feature Permissions:</span> {featurePermissions.length}
            </div>
            <div>
              <span className="font-medium">Feature Overrides:</span> {
                localRoleOverrides.filter(ro => ro.featureCode === selectedFeature).length
              }
            </div>
            <div>
              <span className="font-medium">Total Permissions:</span> {
                localRolePermissions.filter(rp => rp.granted).length
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
