/**
 * Route Feature Configuration
 * Maps routes to their required features and permissions
 */

export interface RouteConfig {
  path: string;
  feature?: string;
  features?: string[];
  requireAllFeatures?: boolean;
  requireAnyFeature?: boolean;
  permission?: string;
  permissions?: string[];
  requireAllPermissions?: boolean;
  requireAnyPermission?: boolean;
  role?: string;
  roles?: string[];
  requireRole?: boolean;
  requireAnyRole?: boolean;
  importPath: string;
  componentProps?: Record<string, any>;
}

export const ROUTE_FEATURES: RouteConfig[] = [
  // Sales Routes
  {
    path: 'pos',
    feature: 'sales.view',
    importPath: '@/pages/pos'
  },
  {
    path: 'sales',
    feature: 'sales.view',
    importPath: '@/pages/pos'
  },
  {
    path: 'quick-sales',
    feature: 'sales.quick',
    importPath: '@/pages/QuickSales'
  },
  
  // Returns Routes
  {
    path: 'returns',
    feature: 'sales.return',
    permission: 'sales.return',
    importPath: '@/pages/Returns'
  },
  {
    path: 'sales-return',
    feature: 'sales.return',
    permission: 'sales.return',
    importPath: '@/pages/SalesReturn'
  },
  
  // Product Management Routes
  {
    path: 'products',
    feature: 'products.view',
    permission: 'products.view',
    importPath: '@/pages/Products'
  },
  {
    path: 'customers',
    feature: 'customers.view',
    permission: 'customers.view',
    importPath: '@/pages/Customers'
  },
  {
    path: 'suppliers',
    feature: 'suppliers.view',
    permission: 'suppliers.view',
    importPath: '@/pages/Suppliers'
  },
  {
    path: 'pricing',
    feature: 'pricing.view',
    permission: 'pricing.view',
    importPath: '@/pages/Pricing'
  },
  {
    path: 'discounts',
    feature: 'discounts.view',
    permission: 'discounts.view',
    importPath: '@/pages/Discounts'
  },
  
  // Inventory Routes
  {
    path: 'inventory',
    feature: 'inventory.view',
    permission: 'inventory.view',
    importPath: '@/pages/Inventory'
  },
  {
    path: 'inventory/adjust',
    feature: 'inventory.adjust',
    permission: 'inventory.adjust',
    importPath: '@/pages/InventoryAdjustment'
  },
  {
    path: 'stock',
    feature: 'inventory.view',
    permission: 'inventory.view',
    importPath: '@/pages/StockDashboard'
  },
  {
    path: 'labels',
    feature: 'labels.view',
    permission: 'labels.view',
    importPath: '@/pages/Labels'
  },
  
  // Stocktake Routes
  {
    path: 'stocktake',
    feature: 'inventory.stocktake',
    permission: 'inventory.stocktake',
    importPath: '@/pages/Stocktake'
  },
  {
    path: 'stocktake/session/:id',
    feature: 'inventory.stocktake',
    permission: 'inventory.stocktake',
    importPath: '@/pages/StocktakeSession'
  },
  
  // GRN Routes
  {
    path: 'grn',
    feature: 'inventory.receive',
    permission: 'inventory.receive',
    importPath: '@/pages/GrnList'
  },
  {
    path: 'grn/new',
    feature: 'inventory.receive',
    permission: 'inventory.receive',
    importPath: '@/pages/GRN'
  },
  {
    path: 'grn/:id',
    feature: 'inventory.receive',
    permission: 'inventory.receive',
    importPath: '@/pages/GRNReceive'
  },
  
  // Purchasing Routes
  {
    path: 'purchasing/po',
    feature: 'purchasing.po',
    permission: 'purchasing.po',
    importPath: '@/pages/purchasing/POCreate'
  },
  {
    path: 'purchasing/grn',
    feature: 'inventory.receive',
    permission: 'inventory.receive',
    importPath: '@/pages/purchasing/GRNReceive'
  },
  {
    path: 'purchasing/supplier-return',
    feature: 'purchasing.return',
    permission: 'purchasing.return',
    importPath: '@/pages/purchasing/SupplierReturn'
  },
  
  // Cash Management Routes
  {
    path: 'cash/drawer',
    feature: 'cash.manage',
    permission: 'cash.manage',
    importPath: '@/components/cash/DrawerOps',
    componentProps: { shiftId: 1 }
  },
  
  // Shift Management Routes
  {
    path: 'shifts',
    feature: 'shifts.view',
    permission: 'shifts.view',
    importPath: '@/pages/ShiftList'
  },
  {
    path: 'shifts/new',
    feature: 'shifts.create',
    permission: 'shifts.create',
    importPath: '@/pages/NewShift'
  },
  {
    path: 'shifts/:id',
    feature: 'shifts.view',
    permission: 'shifts.view',
    importPath: '@/pages/ShiftSession'
  },
  
  // Reports Routes
  {
    path: 'reports',
    feature: 'reports.view',
    permission: 'reports.view',
    importPath: '@/pages/Reports'
  },
  
  // Settings Routes
  {
    path: 'settings',
    feature: 'settings.view',
    permission: 'settings.view',
    importPath: '@/pages/Settings'
  },
  
  // Admin Routes
  {
    path: 'users',
    role: 'admin',
    roles: ['manager'],
    importPath: '@/pages/Users'
  },
  {
    path: 'audit',
    role: 'admin',
    roles: ['manager'],
    importPath: '@/pages/Audit'
  },
  
  // Tools Routes
  {
    path: 'tools/receipt-test',
    feature: 'tools.receipt',
    permission: 'tools.receipt',
    importPath: '@/pages/ReceiptTest'
  },
  {
    path: 'tools/print-test',
    feature: 'tools.print',
    permission: 'tools.print',
    importPath: '@/pages/PrintTest'
  },
  {
    path: 'tools/navigation-test',
    feature: 'tools.navigation',
    permission: 'tools.navigation',
    importPath: '@/pages/TestNavigation'
  },
  {
    path: 'tools/simple-test',
    feature: 'tools.simple',
    permission: 'tools.simple',
    importPath: '@/pages/SimpleTest'
  },
  {
    path: 'tools/language-test',
    feature: 'tools.language',
    permission: 'tools.language',
    importPath: '@/components/LanguageTest'
  },
  
  // Utility Routes
  {
    path: 'search',
    feature: 'search.view',
    importPath: '@/pages/Search'
  },
  {
    path: 'help-support',
    feature: 'help.view',
    importPath: '@/pages/HelpSupport'
  }
];

// Helper function to get route config by path
export const getRouteConfig = (path: string): RouteConfig | undefined => {
  return ROUTE_FEATURES.find(route => route.path === path);
};

// Helper function to get all routes for a specific feature
export const getRoutesForFeature = (feature: string): RouteConfig[] => {
  return ROUTE_FEATURES.filter(route => 
    route.feature === feature || 
    (route.features && route.features.includes(feature))
  );
};

// Helper function to get all routes for a specific permission
export const getRoutesForPermission = (permission: string): RouteConfig[] => {
  return ROUTE_FEATURES.filter(route => 
    route.permission === permission || 
    (route.permissions && route.permissions.includes(permission))
  );
};

// Helper function to get all routes for a specific role
export const getRoutesForRole = (role: string): RouteConfig[] => {
  return ROUTE_FEATURES.filter(route => 
    route.role === role || 
    (route.roles && route.roles.includes(role))
  );
};

export default ROUTE_FEATURES;
