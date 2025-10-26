/**
 * Guard Components Usage Examples
 * Demonstrates how to use guard components in real applications
 */

import React from 'react';
import { 
  IfFeature, 
  IfNotFeature, 
  IfAllFeatures, 
  IfAnyFeature,
  IfPerm, 
  IfNotPerm, 
  IfAllPerms, 
  IfAnyPerm,
  IfRole,
  IfAdmin,
  IfManager,
  IfCashier,
  Guard,
  FeatureGuard,
  PermissionGuard,
  RoleGuard,
  AdminGuard,
  ManagerGuard
} from './index';

/**
 * Example: Sales Dashboard with Feature Guards
 */
export const SalesDashboard: React.FC = () => {
  return (
    <div className="sales-dashboard">
      <h1>Sales Dashboard</h1>
      
      {/* Basic feature check */}
      <IfFeature code="sales.view">
        <div className="sales-content">
          <h2>Sales Overview</h2>
          <p>Sales data and analytics</p>
        </div>
      </IfFeature>

      {/* Feature with fallback */}
      <IfFeature 
        code="sales.analytics" 
        fallback={<div className="upgrade-prompt">Upgrade to see analytics</div>}
      >
        <div className="analytics-content">
          <h2>Sales Analytics</h2>
          <p>Advanced analytics and reports</p>
        </div>
      </IfFeature>

      {/* Multiple features - all required */}
      <IfAllFeatures code="sales.view" features={['reports.view']}>
        <div className="reports-section">
          <h2>Sales Reports</h2>
          <p>Comprehensive sales reporting</p>
        </div>
      </IfAllFeatures>

      {/* Multiple features - any required */}
      <IfAnyFeature code="sales.view" features={['inventory.view']}>
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <p>Common actions available</p>
        </div>
      </IfAnyFeature>

      {/* Inverted feature check */}
      <IfNotFeature code="sales.advanced">
        <div className="basic-mode">
          <p>You're using basic mode. Upgrade for advanced features.</p>
        </div>
      </IfNotFeature>
    </div>
  );
};

/**
 * Example: Admin Panel with Permission Guards
 */
export const AdminPanel: React.FC = () => {
  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      
      {/* Basic permission check */}
      <IfPerm code="admin.users">
        <div className="user-management">
          <h2>User Management</h2>
          <p>Manage users and roles</p>
        </div>
      </IfPerm>

      {/* Permission with fallback */}
      <IfPerm 
        code="admin.settings" 
        fallback={<div className="access-denied">Access denied to settings</div>}
      >
        <div className="settings-content">
          <h2>System Settings</h2>
          <p>Configure system settings</p>
        </div>
      </IfPerm>

      {/* Multiple permissions - all required */}
      <IfAllPerms code="admin.users" permissions={['admin.roles']}>
        <div className="role-management">
          <h2>Role Management</h2>
          <p>Manage user roles and permissions</p>
        </div>
      </IfAllPerms>

      {/* Multiple permissions - any required */}
      <IfAnyPerm code="admin.users" permissions={['admin.settings']}>
        <div className="admin-actions">
          <h2>Admin Actions</h2>
          <p>Administrative functions</p>
        </div>
      </IfAnyPerm>

      {/* Inverted permission check */}
      <IfNotPerm code="admin.advanced">
        <div className="basic-admin">
          <p>You have basic admin access</p>
        </div>
      </IfNotPerm>
    </div>
  );
};

/**
 * Example: Role-based Navigation
 */
export const Navigation: React.FC = () => {
  return (
    <nav className="main-navigation">
      <ul>
        {/* Cashier navigation */}
        <IfRole role="cashier">
          <li><a href="/sales">Sales</a></li>
          <li><a href="/hold">Hold Orders</a></li>
          <li><a href="/returns">Returns</a></li>
        </IfRole>

        {/* Manager navigation */}
        <IfManager>
          <li><a href="/reports">Reports</a></li>
          <li><a href="/inventory">Inventory</a></li>
          <li><a href="/staff">Staff Management</a></li>
        </IfManager>

        {/* Admin navigation */}
        <IfAdmin>
          <li><a href="/admin">Admin Panel</a></li>
          <li><a href="/settings">System Settings</a></li>
          <li><a href="/audit">Audit Logs</a></li>
        </IfAdmin>

        {/* Role-specific features */}
        <IfRole role="cashier" roles={['manager', 'admin']} requireAny={true}>
          <li><a href="/discounts">Discounts</a></li>
        </IfRole>
      </ul>
    </nav>
  );
};

/**
 * Example: Complex Guard with Multiple Requirements
 */
export const ComplexGuardExample: React.FC = () => {
  return (
    <div className="complex-guard-example">
      <h1>Complex Guard Example</h1>
      
      {/* Guard with feature, permission, and role requirements */}
      <Guard 
        feature="sales.advanced"
        permission="sales.create"
        role="manager"
        fallback={<div className="access-denied">Access denied: Advanced sales features require manager role</div>}
        onGranted={() => console.log('Access granted to advanced sales')}
        onDenied={() => console.log('Access denied to advanced sales')}
      >
        <div className="advanced-sales">
          <h2>Advanced Sales Features</h2>
          <p>This content is only visible to managers with advanced sales features</p>
        </div>
      </Guard>

      {/* Guard with multiple features and permissions */}
      <Guard 
        features={['inventory.view', 'inventory.edit']}
        requireAllFeatures={true}
        permissions={['inventory.manage', 'inventory.pricing']}
        requireAllPermissions={true}
        roles={['manager', 'admin']}
        requireAnyRole={true}
        fallback={<div className="access-denied">Access denied: Inventory management requires manager or admin role</div>}
      >
        <div className="inventory-management">
          <h2>Inventory Management</h2>
          <p>Full inventory management capabilities</p>
        </div>
      </Guard>

      {/* Guard with redirect */}
      <Guard 
        feature="reports.advanced"
        permission="reports.view"
        role="admin"
        redirectTo="/unauthorized"
        fallback={<div>Redirecting...</div>}
      >
        <div className="advanced-reports">
          <h2>Advanced Reports</h2>
          <p>Advanced reporting features</p>
        </div>
      </Guard>

      {/* Inverted guard */}
      <Guard 
        feature="maintenance.mode"
        invert={true}
        fallback={<div className="maintenance-notice">System is in maintenance mode</div>}
      >
        <div className="normal-operation">
          <h2>System Normal</h2>
          <p>System is operating normally</p>
        </div>
      </Guard>
    </div>
  );
};

/**
 * Example: Specialized Guard Components
 */
export const SpecializedGuards: React.FC = () => {
  return (
    <div className="specialized-guards">
      <h1>Specialized Guard Components</h1>
      
      {/* Feature Guard */}
      <FeatureGuard 
        feature="sales.view"
        fallback={<div>Sales view not available</div>}
      >
        <div className="sales-view">
          <h2>Sales View</h2>
          <p>Sales viewing functionality</p>
        </div>
      </FeatureGuard>

      {/* Permission Guard */}
      <PermissionGuard 
        permission="sales.create"
        fallback={<div>Sales creation not permitted</div>}
      >
        <div className="sales-create">
          <h2>Create Sale</h2>
          <p>Sales creation functionality</p>
        </div>
      </PermissionGuard>

      {/* Role Guard */}
      <RoleGuard 
        role="manager"
        roles={['admin']}
        requireAny={true}
        fallback={<div>Manager or admin role required</div>}
      >
        <div className="management-content">
          <h2>Management Content</h2>
          <p>Management-level functionality</p>
        </div>
      </RoleGuard>

      {/* Admin Guard */}
      <AdminGuard 
        fallback={<div>Admin access required</div>}
      >
        <div className="admin-content">
          <h2>Admin Content</h2>
          <p>Administrative functionality</p>
        </div>
      </AdminGuard>

      {/* Manager Guard */}
      <ManagerGuard 
        fallback={<div>Manager access required</div>}
      >
        <div className="manager-content">
          <h2>Manager Content</h2>
          <p>Manager-level functionality</p>
        </div>
      </ManagerGuard>
    </div>
  );
};

/**
 * Example: Loading States and Error Handling
 */
export const LoadingAndErrorStates: React.FC = () => {
  return (
    <div className="loading-error-states">
      <h1>Loading and Error States</h1>
      
      {/* Guard with loading state */}
      <Guard 
        feature="sales.view"
        loading={<div className="loading">Loading sales data...</div>}
        isLoading={false} // This would come from your state
      >
        <div className="sales-content">
          <h2>Sales Data</h2>
          <p>Sales information loaded</p>
        </div>
      </Guard>

      {/* Guard with custom fallback for different states */}
      <Guard 
        feature="inventory.view"
        fallback={
          <div className="fallback">
            <h3>Inventory Not Available</h3>
            <p>This feature is currently disabled or you don't have access</p>
            <button>Request Access</button>
          </div>
        }
      >
        <div className="inventory-content">
          <h2>Inventory Data</h2>
          <p>Inventory information</p>
        </div>
      </Guard>
    </div>
  );
};

/**
 * Example: Conditional Rendering Patterns
 */
export const ConditionalRenderingPatterns: React.FC = () => {
  return (
    <div className="conditional-rendering">
      <h1>Conditional Rendering Patterns</h1>
      
      {/* Show different content based on features */}
      <IfFeature code="sales.advanced">
        <div className="advanced-sales">
          <h2>Advanced Sales</h2>
          <p>Advanced sales features available</p>
        </div>
      </IfFeature>
      
      <IfNotFeature code="sales.advanced">
        <div className="basic-sales">
          <h2>Basic Sales</h2>
          <p>Basic sales features only</p>
        </div>
      </IfNotFeature>

      {/* Show different buttons based on permissions */}
      <div className="action-buttons">
        <IfPerm code="sales.create">
          <button className="btn-primary">Create Sale</button>
        </IfPerm>
        
        <IfPerm code="sales.edit">
          <button className="btn-secondary">Edit Sale</button>
        </IfPerm>
        
        <IfPerm code="sales.delete">
          <button className="btn-danger">Delete Sale</button>
        </IfPerm>
      </div>

      {/* Show different navigation based on role */}
      <div className="role-based-nav">
        <IfCashier>
          <nav className="cashier-nav">
            <a href="/sales">Sales</a>
            <a href="/hold">Hold</a>
            <a href="/returns">Returns</a>
          </nav>
        </IfCashier>
        
        <IfManager>
          <nav className="manager-nav">
            <a href="/reports">Reports</a>
            <a href="/inventory">Inventory</a>
            <a href="/staff">Staff</a>
          </nav>
        </IfManager>
        
        <IfAdmin>
          <nav className="admin-nav">
            <a href="/admin">Admin</a>
            <a href="/settings">Settings</a>
            <a href="/audit">Audit</a>
          </nav>
        </IfAdmin>
      </div>
    </div>
  );
};

export default {
  SalesDashboard,
  AdminPanel,
  Navigation,
  ComplexGuardExample,
  SpecializedGuards,
  LoadingAndErrorStates,
  ConditionalRenderingPatterns
};










