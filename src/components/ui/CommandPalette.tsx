/**
 * Command Palette Component
 * Quick action launcher with fuzzy search
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Zap, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  DollarSign,
  Settings,
  BarChart3,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  action: () => void;
  keywords: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    // Navigation Commands
    {
      id: 'nav-sales',
      title: t('command.goToSales'),
      description: t('command.goToSalesDesc'),
      icon: ShoppingCart,
      category: t('command.navigation'),
      action: () => navigate('/pos'),
      keywords: ['sales', 'pos', 'cashier', 'checkout'],
      shortcut: 'F1'
    },
    {
      id: 'nav-products',
      title: t('command.goToProducts'),
      description: t('command.goToProductsDesc'),
      icon: Package,
      category: t('command.navigation'),
      action: () => navigate('/products'),
      keywords: ['products', 'inventory', 'items', 'stock'],
      shortcut: 'F3'
    },
    {
      id: 'nav-customers',
      title: t('command.goToCustomers'),
      description: t('command.goToCustomersDesc'),
      icon: Users,
      category: t('command.navigation'),
      action: () => navigate('/customers'),
      keywords: ['customers', 'clients', 'people'],
      shortcut: 'F4'
    },
    {
      id: 'nav-suppliers',
      title: t('command.goToSuppliers'),
      description: t('command.goToSuppliersDesc'),
      icon: Truck,
      category: t('command.navigation'),
      action: () => navigate('/suppliers'),
      keywords: ['suppliers', 'vendors', 'purchases'],
      shortcut: 'F5'
    },
    {
      id: 'nav-pricing',
      title: t('command.goToPricing'),
      description: t('command.goToPricingDesc'),
      icon: DollarSign,
      category: t('command.navigation'),
      action: () => navigate('/pricing'),
      keywords: ['pricing', 'prices', 'costs'],
      shortcut: 'F6'
    },
    {
      id: 'nav-reports',
      title: t('command.goToReports'),
      description: t('command.goToReportsDesc'),
      icon: BarChart3,
      category: t('command.navigation'),
      action: () => navigate('/reports'),
      keywords: ['reports', 'analytics', 'statistics'],
      shortcut: 'F10'
    },
    {
      id: 'nav-settings',
      title: t('command.goToSettings'),
      description: t('command.goToSettingsDesc'),
      icon: Settings,
      category: t('command.navigation'),
      action: () => navigate('/settings'),
      keywords: ['settings', 'configuration', 'preferences'],
      shortcut: 'F11'
    },

    // Sales Commands
    {
      id: 'sales-hold',
      title: t('command.holdSale'),
      description: t('command.holdSaleDesc'),
      icon: Clock,
      category: t('command.sales'),
      action: () => {
        // This would trigger hold sale functionality
        onClose();
      },
      keywords: ['hold', 'pause', 'suspend'],
      shortcut: 'Ctrl+H'
    },
    {
      id: 'sales-resume',
      title: t('command.resumeSale'),
      description: t('command.resumeSaleDesc'),
      icon: ArrowRight,
      category: t('command.sales'),
      action: () => {
        // This would trigger resume sale functionality
        onClose();
      },
      keywords: ['resume', 'continue', 'restore'],
      shortcut: 'Ctrl+R'
    },
    {
      id: 'sales-clear',
      title: t('command.clearCart'),
      description: t('command.clearCartDesc'),
      icon: X,
      category: t('command.sales'),
      action: () => {
        // This would trigger clear cart functionality
        onClose();
      },
      keywords: ['clear', 'empty', 'reset'],
      shortcut: 'Ctrl+C'
    },

    // Utility Commands
    {
      id: 'util-help',
      title: t('command.showHelp'),
      description: t('command.showHelpDesc'),
      icon: FileText,
      category: t('command.utility'),
      action: () => {
        // This would show help
        onClose();
      },
      keywords: ['help', 'documentation', 'guide'],
      shortcut: '?'
    },
    {
      id: 'util-shortcuts',
      title: t('command.showShortcuts'),
      description: t('command.showShortcutsDesc'),
      icon: Zap,
      category: t('command.utility'),
      action: () => {
        // This would show keyboard shortcuts
        onClose();
      },
      keywords: ['shortcuts', 'hotkeys', 'keyboard'],
      shortcut: 'Ctrl+K'
    }
  ];

  // Filter commands based on query
  const filteredCommands = commands.filter(command => {
    if (!query) return true;
    
    const searchTerm = query.toLowerCase();
    return (
      command.title.toLowerCase().includes(searchTerm) ||
      command.description.toLowerCase().includes(searchTerm) ||
      command.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
    );
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, Command[]>);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            Math.min(prev + 1, filteredCommands.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
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
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when modal opens
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              ref={inputRef}
              placeholder={t('command.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none text-lg"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto" ref={listRef}>
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">{t('command.noResults')}</p>
              <p className="text-sm">{t('command.tryDifferent')}</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                <div key={category} className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {categoryCommands.map((command, index) => {
                      const globalIndex = filteredCommands.indexOf(command);
                      const isSelected = globalIndex === selectedIndex;
                      
                      return (
                        <div
                          key={command.id}
                          data-selected={isSelected}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => command.action()}
                        >
                          <command.icon className={`w-5 h-5 ${
                            isSelected ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${
                              isSelected ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {command.title}
                            </div>
                            <div className={`text-sm ${
                              isSelected ? 'text-blue-700' : 'text-gray-500'
                            }`}>
                              {command.description}
                            </div>
                          </div>
                          
                          {command.shortcut && (
                            <kbd className={`px-2 py-1 text-xs font-mono rounded ${
                              isSelected 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {command.shortcut}
                            </kbd>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>↑↓ {t('command.navigate')}</span>
              <span>↵ {t('command.select')}</span>
              <span>⎋ {t('command.close')}</span>
            </div>
            <div>
              {filteredCommands.length} {t('command.results')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







