import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import { 
  Search, 
  ShoppingCart, 
  RotateCcw, 
  BarChart3, 
  Package, 
  Warehouse, 
  ShoppingBag, 
  Settings, 
  Wrench,
  Command,
  ArrowRight
} from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  current: boolean;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationItem[];
}

interface CommandItem {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  category: string;
}

export function CommandPalette({ isOpen, onClose, navigation }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Command items
  const commandItems: CommandItem[] = [
    // Navigation
    ...navigation.map(item => ({
      id: `nav-${item.name.toLowerCase()}`,
      name: item.name,
      description: `Navigate to ${item.name}`,
      href: item.href,
      icon: item.icon,
      shortcut: item.shortcut,
      category: 'Navigation'
    })),
    
    // Quick Actions
    {
      id: 'new-sale',
      name: 'New Sale',
      description: 'Start a new sale transaction',
      href: '/pos',
      icon: ShoppingCart,
      shortcut: 'Ctrl+N',
      category: 'Quick Actions'
    },
    {
      id: 'search-products',
      name: 'Search Products',
      description: 'Search for products by name or barcode',
      href: '/search',
      icon: Search,
      shortcut: 'Ctrl+F',
      category: 'Quick Actions'
    },
    {
      id: 'z-report',
      name: 'Z Report',
      description: 'Generate Z report for end of day',
      href: '/reports/z',
      icon: BarChart3,
      shortcut: 'Ctrl+Z',
      category: 'Quick Actions'
    },
    
    // Reports
    {
      id: 'profit-report',
      name: 'Profit Report',
      description: 'View profit and loss report',
      href: '/reports/profit',
      icon: BarChart3,
      category: 'Reports'
    },
    {
      id: 'movers-report',
      name: 'Movers Report',
      description: 'View fast and slow moving products',
      href: '/reports/movers',
      icon: BarChart3,
      category: 'Reports'
    },
    
    // Inventory
    {
      id: 'stock-adjustment',
      name: 'Stock Adjustment',
      description: 'Adjust inventory quantities',
      href: '/inventory/adjustment',
      icon: Warehouse,
      category: 'Inventory'
    },
    {
      id: 'transfer-stock',
      name: 'Transfer Stock',
      description: 'Transfer stock between locations',
      href: '/inventory/transfer',
      icon: Warehouse,
      category: 'Inventory'
    },
    
    // Settings
    {
      id: 'user-settings',
      name: 'User Settings',
      description: 'Manage user accounts and permissions',
      href: '/settings/users',
      icon: Settings,
      category: 'Settings'
    },
    {
      id: 'system-settings',
      name: 'System Settings',
      description: 'Configure system preferences',
      href: '/settings/system',
      icon: Settings,
      category: 'Settings'
    }
  ];

  // Filter items based on query
  const filteredItems = commandItems.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            window.location.href = filteredItems[selectedIndex].href;
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal bg-black/50 flex items-start justify-center pt-16">
      <div className="w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-0 shadow-none focus:ring-0"
            variant="default"
          />
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto" ref={listRef}>
          {Object.keys(groupedItems).length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No commands found
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                  {category}
                </div>
                {items.map((item, index) => {
                  const globalIndex = filteredItems.findIndex(i => i.id === item.id);
                  const isSelected = globalIndex === selectedIndex;
                  
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = item.href;
                        onClose();
                      }}
                      className={cn(
                        'flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                        isSelected && 'bg-primary-50 dark:bg-primary-900/20'
                      )}
                      data-selected={isSelected}
                    >
                      <item.icon className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.description}
                        </div>
                      </div>
                      {item.shortcut && (
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          {item.shortcut?.split(' ').map((key, i) => (
                            <React.Fragment key={i}>
                              <Badge variant="outline" size="sm">
                                {key}
                              </Badge>
                              {i < (item.shortcut?.split(' ').length || 0) - 1 && (
                                <span>+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                      <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />
                    </a>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>⎋ Close</span>
            </div>
            <div>
              {filteredItems.length} command{filteredItems.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


