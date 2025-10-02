import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Truck, 
  Users, 
  Percent, 
  Warehouse, 
  BarChart3, 
  Settings, 
  Cloud,
  Activity,
  Menu,
  X,
  ClipboardCheck,
  FileInput,
  Shield,
  UserCog,
  RotateCcw,
  Tags
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/utils/cn';
import { authService } from '@/services/authService';
import { Permission } from '@/security/permissions';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  permission?: Permission;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const navigationSections: NavigationSection[] = [
  {
    title: 'Operations',
    items: [
      { name: 'Sales', href: '/', icon: ShoppingCart, shortcut: 'Ctrl+1', permission: 'VIEW_SALES' as Permission },
      { name: 'Returns', href: '/returns', icon: RotateCcw, shortcut: 'F9', permission: 'RETURNS_CREATE' as Permission },
    ]
  },
  {
    title: 'Catalog',
    items: [
      { name: 'Products', href: '/products', icon: Package, shortcut: 'Ctrl+2' },
      { name: 'Price Management', href: '/pricing', icon: DollarSign, shortcut: 'Ctrl+3' },
      { name: 'Suppliers', href: '/suppliers', icon: Truck, shortcut: 'Ctrl+4' },
      { name: 'Customers', href: '/customers', icon: Users, shortcut: 'Ctrl+5' },
      { name: 'Discounts', href: '/discounts', icon: Percent, shortcut: 'Ctrl+6' },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { name: 'Stock Levels', href: '/inventory', icon: Warehouse, shortcut: 'Ctrl+7' },
      { name: 'Labels', href: '/labels', icon: Tags, shortcut: 'Ctrl+L' },
      { name: 'Stocktake', href: '/stocktake', icon: ClipboardCheck, shortcut: 'F6', permission: 'STOCKTAKE_CREATE' as Permission },
      { name: 'GRN', href: '/grn', icon: FileInput, shortcut: 'Ctrl+G', permission: 'GRN_CREATE' as Permission },
    ]
  },
  {
    title: 'Reports & Analytics',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3, shortcut: 'Ctrl+8', permission: 'REPORTS_VIEW_ALL' as Permission },
      { name: 'Audit Trail', href: '/audit', icon: Shield, shortcut: 'Ctrl+A', permission: 'AUDIT_VIEW' as Permission },
    ]
  },
  {
    title: 'Administration',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings, shortcut: 'Ctrl+9', permission: 'SETTINGS_VIEW' as Permission },
      { name: 'Users', href: '/users', icon: UserCog, shortcut: 'Ctrl+U', permission: 'SETTINGS_WRITE' as Permission },
      { name: 'Health Check', href: '/health', icon: Activity, shortcut: 'Ctrl+H', permission: 'HEALTH_VIEW' as Permission },
    ]
  }
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Grocery POS
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3 overflow-y-auto flex-1">
          <div className="space-y-6">
            {navigationSections.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items
                    .filter(item => !item.permission || authService.hasPermission(item.permission))
                    .map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          isActive
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                        )
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {item.shortcut}
                      </span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Version 1.0.0
          </div>
        </div>
      </div>
    </>
  );
}

