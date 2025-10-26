import React from 'react';
import { User, Shield, Crown, UserCheck, Key, Clock, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore, User as UserType } from '@/store/authStore';

export function RoleDisplay() {
  const { user, token } = useAuthStore();

  if (!user || !token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No user information available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-5 h-5 text-purple-600" />;
      case 'manager':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'cashier':
        return <UserCheck className="w-5 h-5 text-green-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cashier':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full system access including user management, system settings, and all operations';
      case 'manager':
        return 'Management access including reports, inventory management, and staff oversight';
      case 'cashier':
        return 'Point of sale operations including sales, returns, and basic inventory viewing';
      default:
        return 'Limited access to basic operations';
    }
  };

  const getPermissions = (role: string) => {
    switch (role) {
      case 'admin':
        return [
          'User Management',
          'System Settings',
          'All Reports',
          'Inventory Management',
          'Sales Operations',
          'Backup & Maintenance',
          'Audit Logs'
        ];
      case 'manager':
        return [
          'Financial Reports',
          'Inventory Management',
          'Sales Operations',
          'Staff Reports',
          'Product Management',
          'Customer Management'
        ];
      case 'cashier':
        return [
          'Point of Sale',
          'Sales Operations',
          'Returns & Refunds',
          'Basic Inventory View',
          'Customer Lookup'
        ];
      default:
        return ['Basic Operations'];
    }
  };

  // Decode JWT to get additional info
  const getJWTInfo = () => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: new Date(payload.exp * 1000),
        tokenId: payload.jti || 'N/A'
      };
    } catch (error) {
      return null;
    }
  };

  const jwtInfo = getJWTInfo();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          User Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Basic Info */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              {getRoleIcon(user.role)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user.full_name || user.username}
              </h3>
              <Badge className={getRoleColor(user.role)}>
                {user.role.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {getRoleDescription(user.role)}
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Username: {user.username}
            </div>
            {user.email && (
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {user.email}
              </div>
            )}
          </div>
        </div>

        {/* Permissions */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Permissions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {getPermissions(user.role).map((permission) => (
              <div
                key={permission}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                {permission}
              </div>
            ))}
          </div>
        </div>

        {/* Session Info */}
        {jwtInfo && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Session Information
            </h4>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Session Started:</span>
                <span className="text-gray-900 dark:text-white">
                  {jwtInfo.issuedAt.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                <span className="text-gray-900 dark:text-white">
                  {jwtInfo.expiresAt.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Token ID:</span>
                <span className="text-gray-900 dark:text-white font-mono text-xs">
                  {jwtInfo.tokenId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Session Duration:</span>
                <span className="text-gray-900 dark:text-white">
                  {Math.round((jwtInfo.expiresAt.getTime() - jwtInfo.issuedAt.getTime()) / (1000 * 60 * 60))} hours
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Role Badge */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Current role and permissions
            </div>
            <div className="flex items-center gap-2">
              {getRoleIcon(user.role)}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}










