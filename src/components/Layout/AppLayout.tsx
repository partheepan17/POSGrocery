import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { 
  ShoppingCart, 
  RotateCcw, 
  BarChart3, 
  Package, 
  Warehouse, 
  ShoppingBag, 
  Settings, 
  Wrench,
  Menu,
  X,
  Search,
  Bell,
  User,
  Wifi,
  WifiOff,
  Printer,
  Scale,
  ChevronDown
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { CommandPalette } from './CommandPalette';
import { HeaderStatus } from './HeaderStatus';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

const navigation = [
  { name: 'Sales', href: '/pos', icon: ShoppingCart, shortcut: 'g s', current: false },
  { name: 'Returns', href: '/returns', icon: RotateCcw, shortcut: 'g r', current: false },
  { name: 'Z Report', href: '/reports/z', icon: BarChart3, shortcut: 'g z', current: false },
  { name: 'Catalog', href: '/catalog', icon: Package, shortcut: 'g c', current: false },
  { name: 'Inventory', href: '/inventory', icon: Warehouse, shortcut: 'g i', current: false },
  { name: 'Purchasing', href: '/purchasing', icon: ShoppingBag, shortcut: 'g p', current: false },
  { name: 'Settings', href: '/settings', icon: Settings, shortcut: 'g s', current: false },
  { name: 'Tools', href: '/tools', icon: Wrench, shortcut: 'g t', current: false },
];

const statusItems = [
  { name: 'Online', status: 'online', icon: Wifi, color: 'pos-success' },
  { name: 'Printer', status: 'online', icon: Printer, color: 'pos-success' },
  { name: 'Scale', status: 'offline', icon: Scale, color: 'pos-danger' },
];

export function AppLayout({ children, currentPage }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette (Ctrl/Cmd + K)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }

      // Quick navigation
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        // Wait for second key
        const handleSecondKey = (e2: KeyboardEvent) => {
          const shortcut = `g ${e2.key}`;
          const navItem = navigation.find(item => item.shortcut === shortcut);
          if (navItem) {
            window.location.href = navItem.href;
          }
          document.removeEventListener('keydown', handleSecondKey);
        };
        document.addEventListener('keydown', handleSecondKey);
      }

      // Help (?) - show shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // Show shortcuts help
        console.log('Shortcuts help');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              POS Grocery
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isCurrent = currentPage === item.name.toLowerCase();
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isCurrent
                      ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                  )}
                >
                  <item.icon className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isCurrent ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                  )} />
                  {item.name}
                  <span className="ml-auto text-xs text-gray-400 group-hover:text-gray-500">
                    {item.shortcut}
                  </span>
                </a>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div>Version 1.0.0</div>
              <div>Environment: {import.meta.env.MODE}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Search */}
              <div className="hidden md:block w-96">
                <Input
                  type="text"
                  placeholder="Search products, customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                  variant="search"
                  inputSize="sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Handle search
                      console.log('Search:', searchQuery);
                    }
                  }}
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Status badges */}
              <div className="hidden lg:flex items-center space-x-2">
                {statusItems.map((item) => (
                  <div key={item.name} className="flex items-center space-x-1">
                    <item.icon className="w-4 h-4 text-gray-400" />
                    <Badge 
                      variant={item.color as any}
                      size="sm"
                    >
                      {item.name}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Button>

              {/* User menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:block">Cashier</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        navigation={navigation}
      />
    </div>
  );
}


