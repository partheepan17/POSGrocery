import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Activity,
  X,
  ClipboardCheck,
  FileInput,
  UserCog,
  RotateCcw,
  Tag,
  Clock,
  Printer,
  Search,
  HelpCircle,
  ChevronDown,
  Info
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/utils/cn';
// import { authService } from '@/services/authService';
// import { Permission } from '@/security/permissions';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  permission?: string;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

// Navigation sections will be created dynamically with translations

export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Operations', 'Catalog', 'Inventory']));

  // Navigation sections with translations
  const navigationSections: NavigationSection[] = [
    {
      title: t('sidebar.operations'),
      items: [
        { name: t('navigation.sales'), href: '/', icon: ShoppingCart, shortcut: 'Ctrl+1' },
        { name: t('navigation.quickSales'), href: '/quick-sales', icon: ShoppingCart, shortcut: 'Ctrl+Q' },
        { name: t('navigation.returns'), href: '/returns', icon: RotateCcw, shortcut: 'F9' },
        { name: t('shifts.title'), href: '/shifts', icon: Clock, shortcut: 'Ctrl+Shift+S' },
      ]
    },
    {
      title: t('sidebar.catalog'),
      items: [
        { name: t('navigation.products'), href: '/products', icon: Package, shortcut: 'Ctrl+2' },
        { name: t('navigation.pricing'), href: '/pricing', icon: DollarSign, shortcut: 'Ctrl+3' },
        { name: t('navigation.suppliers'), href: '/suppliers', icon: Truck, shortcut: 'Ctrl+4' },
        { name: t('navigation.customers'), href: '/customers', icon: Users, shortcut: 'Ctrl+5' },
        { name: t('navigation.discounts'), href: '/discounts', icon: Percent, shortcut: 'Ctrl+6' },
      ]
    },
    {
      title: t('sidebar.inventory'),
      items: [
        { name: t('inventory.stockLevels'), href: '/inventory', icon: Warehouse, shortcut: 'Ctrl+7' },
        { name: 'Stock Dashboard', href: '/stock', icon: BarChart3, shortcut: 'Ctrl+Shift+S' },
        { name: t('navigation.labels'), href: '/labels', icon: Tag, shortcut: 'Ctrl+L' },
        { name: t('navigation.stocktake'), href: '/stocktake', icon: ClipboardCheck, shortcut: 'F12' },
        { name: t('navigation.grn'), href: '/grn', icon: FileInput, shortcut: 'Ctrl+G' },
        { name: t('sidebar.createPO'), href: '/purchasing/po', icon: FileInput, shortcut: 'Ctrl+Shift+P' },
        { name: t('sidebar.receiveGRN'), href: '/purchasing/grn', icon: FileInput, shortcut: 'Ctrl+Shift+G' },
        { name: t('sidebar.supplierReturn'), href: '/purchasing/supplier-return', icon: FileInput, shortcut: 'Ctrl+Shift+R' },
      ]
    },
    {
      title: t('sidebar.reports'),
      items: [
        { name: t('reports.salesReport'), href: '/reports', icon: BarChart3, shortcut: 'Ctrl+8' },
        { name: t('sidebar.auditTrail'), href: '/audit', icon: Info, shortcut: 'Ctrl+A' },
      ]
    },
    {
      title: t('sidebar.tools'),
      items: [
        { name: t('common.search'), href: '/search', icon: Search, shortcut: 'Ctrl+F' },
        { name: t('sidebar.receiptTest'), href: '/tools/receipt-test', icon: Printer, shortcut: 'F2' },
        { name: t('sidebar.navigationTest'), href: '/tools/navigation-test', icon: HelpCircle, shortcut: 'F3' },
        { name: t('sidebar.simpleTest'), href: '/tools/simple-test', icon: Activity, shortcut: 'F4' },
        { name: t('sidebar.cashDrawer'), href: '/cash/drawer', icon: DollarSign, shortcut: 'Ctrl+D' },
      ]
    },
    {
      title: t('sidebar.administration'),
      items: [
        { name: t('navigation.settings'), href: '/settings', icon: Settings, shortcut: 'Ctrl+9' },
        { name: t('navigation.users'), href: '/users', icon: UserCog, shortcut: 'Ctrl+U' },
        { name: t('navigation.health'), href: '/health', icon: Activity, shortcut: 'Ctrl+H' },
        { name: t('navigation.about'), href: '/about', icon: Info, shortcut: 'Ctrl+I' },
      ]
    }
  ];

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const renderNavigationItem = (item: NavigationItem) => (
    <NavLink
      key={item.name}
      to={item.href}
      className={({ isActive }) =>
        cn(
          "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out",
          "focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800",
          "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          isActive
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100 hover:transform hover:scale-[1.01]"
        )
      }
      onClick={() => {
        console.log('🔍 Sidebar click:', item.name, 'href:', item.href);
        setSidebarOpen(false);
      }}
      aria-label={`Navigate to ${item.name}`}
    >
      <item.icon className={cn(
        "mr-3 h-4 w-4 flex-shrink-0 transition-colors",
        "group-hover:scale-110 transition-transform duration-200"
      )} />
      <span className="flex-1 truncate text-sm">{item.name}</span>
      <span className={cn(
        "text-xs font-mono px-1.5 py-0.5 rounded transition-colors",
        "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
        "group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
      )}>
        {item.shortcut}
      </span>
    </NavLink>
  );

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
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              viRtual POS
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-4 px-3 overflow-y-auto flex-1 scrollbar-thin">
          <div className="space-y-4">
            {navigationSections.map((section) => (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-200 dark:border-gray-700 pb-1.5 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                >
                  <span>{section.title}</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    expandedSections.has(section.title) && "rotate-180"
                  )} />
                </button>
                <div className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  expandedSections.has(section.title) ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
                )}>
                  <div className="space-y-1 pb-2">
                    {section.items.map(renderNavigationItem)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Version 1.0.0</span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              viRtual POS © Virtual Software Pvt Ltd
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
