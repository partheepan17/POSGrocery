import React, { useState, useEffect } from 'react';
import { X, Search, Keyboard, Mouse, Scan, Printer, Calculator } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';

interface KeyboardShortcut {
  key: string;
  description: string;
  category: 'navigation' | 'sales' | 'returns' | 'cash' | 'general' | 'scanning' | 'printing';
  modifier?: 'ctrl' | 'alt' | 'shift';
  icon?: React.ReactNode;
}

const keyboardShortcuts: KeyboardShortcut[] = [
  // Navigation shortcuts
  { key: 'F1', description: 'Go to Sales', category: 'navigation', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F2', description: 'Go to Returns', category: 'navigation', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F3', description: 'Go to Products', category: 'navigation', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F4', description: 'Go to Customers', category: 'navigation', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F5', description: 'Go to Suppliers', category: 'navigation', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F6', description: 'Go to Pricing', category: 'navigation', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F7', description: 'Go to Discounts', category: 'navigation', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F8', description: 'Go to Shifts', category: 'navigation', icon: <Calculator className="w-4 h-4" /> },
  
  // Sales shortcuts
  { key: 'F9', description: 'Hold Sale', category: 'sales', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F10', description: 'Resume Hold', category: 'sales', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F11', description: 'Cash Payment', category: 'sales', icon: <Calculator className="w-4 h-4" /> },
  { key: 'F12', description: 'Card Payment', category: 'sales', icon: <Calculator className="w-4 h-4" /> },
  { key: 'Ctrl+Enter', description: 'Complete Sale', category: 'sales', modifier: 'ctrl', icon: <Calculator className="w-4 h-4" /> },
  { key: 'Ctrl+Shift+H', description: 'Held Sales', category: 'sales', modifier: 'ctrl', icon: <Calculator className="w-4 h-4" /> },
  
  // Returns shortcuts
  { key: 'Ctrl+R', description: 'Start Return', category: 'returns', modifier: 'ctrl', icon: <Calculator className="w-4 h-4" /> },
  { key: 'Ctrl+Shift+R', description: 'Process Return', category: 'returns', modifier: 'ctrl', icon: <Calculator className="w-4 h-4" /> },
  
  // Cash operations
  { key: 'Ctrl+D', description: 'Open Drawer', category: 'cash', modifier: 'ctrl', icon: <Calculator className="w-4 h-4" /> },
  { key: 'Ctrl+Shift+D', description: 'Cash Count', category: 'cash', modifier: 'ctrl', icon: <Calculator className="w-4 h-4" /> },
  
  // General shortcuts
  { key: 'Ctrl+N', description: 'New Sale', category: 'general', modifier: 'ctrl', icon: <Calculator className="w-4 h-4" /> },
  { key: 'Ctrl+P', description: 'Print Receipt', category: 'printing', modifier: 'ctrl', icon: <Printer className="w-4 h-4" /> },
  { key: 'Ctrl+Shift+P', description: 'Reprint Receipt', category: 'printing', modifier: 'ctrl', icon: <Printer className="w-4 h-4" /> },
  { key: 'Escape', description: 'Cancel/Close', category: 'general', icon: <X className="w-4 h-4" /> },
  { key: 'Enter', description: 'Confirm/Select', category: 'general', icon: <Calculator className="w-4 h-4" /> },
  { key: 'Tab', description: 'Next Field', category: 'general', icon: <Calculator className="w-4 h-4" /> },
  { key: 'Shift+Tab', description: 'Previous Field', category: 'general', modifier: 'shift', icon: <Calculator className="w-4 h-4" /> },
  
  // Scanning shortcuts
  { key: 'Space', description: 'Focus Scanner', category: 'scanning', icon: <Scan className="w-4 h-4" /> },
  { key: 'Ctrl+Shift+S', description: 'Manual Scan Entry', category: 'scanning', modifier: 'ctrl', icon: <Scan className="w-4 h-4" /> },
];

const scanTips = [
  'Point the scanner at the barcode and press the trigger',
  'For damaged barcodes, try scanning at different angles',
  'Ensure good lighting for better scan accuracy',
  'Clean the scanner lens regularly for optimal performance',
  'Use manual entry (Space key) if scanning fails',
  'Check barcode orientation - some scanners work better vertically',
];

const commandPaletteActions = [
  { action: 'New Sale', shortcut: 'Ctrl+N', description: 'Start a new sale transaction' },
  { action: 'Hold Sale', shortcut: 'F9', description: 'Hold current sale for later' },
  { action: 'Resume Hold', shortcut: 'F10', description: 'Resume a held sale' },
  { action: 'Cash Payment', shortcut: 'F11', description: 'Process cash payment' },
  { action: 'Card Payment', shortcut: 'F12', description: 'Process card payment' },
  { action: 'Start Return', shortcut: 'Ctrl+R', description: 'Begin return process' },
  { action: 'Open Drawer', shortcut: 'Ctrl+D', description: 'Open cash drawer' },
  { action: 'Print Receipt', shortcut: 'Ctrl+P', description: 'Print current receipt' },
  { action: 'Reprint Receipt', shortcut: 'Ctrl+Shift+P', description: 'Reprint previous receipt' },
  { action: 'Cash Count', shortcut: 'Ctrl+Shift+D', description: 'Perform cash count' },
  { action: 'Go to Sales', shortcut: 'F1', description: 'Navigate to sales page' },
  { action: 'Go to Returns', shortcut: 'F2', description: 'Navigate to returns page' },
  { action: 'Go to Products', shortcut: 'F3', description: 'Navigate to products page' },
  { action: 'Go to Customers', shortcut: 'F4', description: 'Navigate to customers page' },
  { action: 'Go to Suppliers', shortcut: 'F5', description: 'Navigate to suppliers page' },
  { action: 'Go to Pricing', shortcut: 'F6', description: 'Navigate to pricing page' },
  { action: 'Go to Discounts', shortcut: 'F7', description: 'Navigate to discounts page' },
  { action: 'Go to Shifts', shortcut: 'F8', description: 'Navigate to shifts page' },
];

interface KeyboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardHelp({ isOpen, onClose }: KeyboardHelpProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'scanning' | 'commands'>('shortcuts');

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredShortcuts = keyboardShortcuts.filter(shortcut =>
    shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCommands = commandPaletteActions.filter(command =>
    command.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    command.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const shortcutsByCategory = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryLabels = {
    navigation: 'Navigation',
    sales: 'Sales',
    returns: 'Returns',
    cash: 'Cash Operations',
    general: 'General',
    scanning: 'Scanning',
    printing: 'Printing',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader 
          title="Keyboard Shortcuts & Help"
          className="flex flex-row items-center justify-between space-y-0 pb-4"
          action={<Keyboard className="w-5 h-5" />}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search shortcuts, commands, or tips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'shortcuts'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Keyboard Shortcuts
            </button>
            <button
              onClick={() => setActiveTab('scanning')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'scanning'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Scanning Tips
            </button>
            <button
              onClick={() => setActiveTab('commands')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'commands'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Command Palette
            </button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      {categoryLabels[category as keyof typeof categoryLabels] || category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {shortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {shortcut.icon}
                            <span className="text-sm text-gray-900 dark:text-white">
                              {shortcut.description}
                            </span>
                          </div>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {shortcut.key}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'scanning' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Scan className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Barcode Scanning Tips
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scanTips.map((tip, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                    >
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'commands' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Mouse className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Command Palette Actions
                  </h3>
                </div>
                <div className="space-y-2">
                  {filteredCommands.map((command, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {command.action}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {command.description}
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {command.shortcut}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t pt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">?</kbd> to open this help anytime</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
