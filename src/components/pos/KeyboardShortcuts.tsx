import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation & Search',
      items: [
        { key: 'F2', description: 'Focus search bar' },
        { key: 'F4', description: 'Focus barcode field' },
        { key: '/', description: 'Quick search focus' },
        { key: 'Enter', description: 'Add/confirm item' },
        { key: 'Esc', description: 'Clear modal/close drawer' },
      ]
    },
    {
      category: 'Payment',
      items: [
        { key: 'Ctrl+P', description: 'Open payment drawer' },
        { key: 'F7', description: 'Cash payment' },
        { key: 'F8', description: 'Card payment' },
        { key: 'F9', description: 'Wallet payment' },
        { key: 'F10', description: 'Credit payment' },
      ]
    },
    {
      category: 'Cart Management',
      items: [
        { key: 'F5', description: 'Hold sale' },
        { key: 'F6', description: 'Resume hold' },
        { key: 'F2', description: 'View held sales' },
        { key: 'Ctrl+Enter', description: 'Quick add to cart' },
      ]
    },
    {
      category: 'System',
      items: [
        { key: 'F10', description: 'Cash movement' },
        { key: 'F11', description: 'Returns' },
        { key: 'F12', description: 'Shift reports' },
        { key: 'Ctrl+Shift+L', description: 'Logout' },
      ]
    },
    {
      category: 'Cart Line Editing',
      items: [
        { key: 'Click qty', description: 'Edit quantity inline' },
        { key: 'Enter', description: 'Confirm quantity edit' },
        { key: 'Esc', description: 'Cancel quantity edit' },
        { key: '+/-', description: 'Increment/decrement qty' },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Keyboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Keyboard Shortcuts</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Speed up your POS operations
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {shortcuts.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {category.category}
              </h3>
              <div className="grid gap-2">
                {category.items.map((shortcut, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <Badge variant="outline" className="font-mono">
                      {shortcut.key}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
              <p><strong>Tips:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Most shortcuts work from anywhere in the POS interface</li>
                <li>Payment shortcuts only work when cart has items</li>
                <li>Hold shortcuts require items in cart or existing holds</li>
                <li>System shortcuts navigate to different sections</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
