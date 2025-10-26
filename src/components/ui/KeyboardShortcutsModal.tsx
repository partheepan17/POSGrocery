/**
 * Keyboard Shortcuts Help Modal
 * Displays all available keyboard shortcuts organized by category
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Keyboard, MousePointer, Zap } from 'lucide-react';
import { Button } from './Button';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { t } = useTranslation();
  const { getShortcutsByCategory } = useKeyboardShortcuts({
    enableGlobalShortcuts: true,
    enableSalesShortcuts: true,
    enablePaymentShortcuts: true,
    enableAdminShortcuts: true
  });

  if (!isOpen) return null;

  const navigationShortcuts = getShortcutsByCategory('navigation');
  const salesShortcuts = getShortcutsByCategory('sales');
  const paymentShortcuts = getShortcutsByCategory('payment');
  const utilityShortcuts = getShortcutsByCategory('utility');
  const adminShortcuts = getShortcutsByCategory('admin');

  const formatKeyCombo = (shortcut: any) => {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.metaKey) parts.push('Cmd');
    parts.push(shortcut.key);
    return parts.join(' + ');
  };

  const ShortcutGroup = ({ 
    title, 
    shortcuts, 
    icon: Icon 
  }: { 
    title: string; 
    shortcuts: any[]; 
    icon: React.ComponentType<any>;
  }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{shortcut.description}</span>
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-sm font-mono text-gray-600">
              {formatKeyCombo(shortcut)}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">
              {t('keyboard.shortcuts')}
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div>
              <ShortcutGroup
                title={t('keyboard.navigation')}
                shortcuts={navigationShortcuts}
                icon={MousePointer}
              />
              
              <ShortcutGroup
                title={t('keyboard.sales')}
                shortcuts={salesShortcuts}
                icon={Zap}
              />
            </div>

            {/* Right Column */}
            <div>
              <ShortcutGroup
                title={t('keyboard.payment')}
                shortcuts={paymentShortcuts}
                icon={Keyboard}
              />
              
              <ShortcutGroup
                title={t('keyboard.utility')}
                shortcuts={utilityShortcuts}
                icon={Zap}
              />
              
              {adminShortcuts.length > 0 && (
                <ShortcutGroup
                  title={t('keyboard.admin')}
                  shortcuts={adminShortcuts}
                  icon={Keyboard}
                />
              )}
            </div>
          </div>

          {/* Tips Section */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              {t('keyboard.tips')}
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {t('keyboard.tip1')}</li>
              <li>• {t('keyboard.tip2')}</li>
              <li>• {t('keyboard.tip3')}</li>
              <li>• {t('keyboard.tip4')}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {t('keyboard.pressQuestion')}
            </div>
            <Button onClick={onClose} className="px-6">
              {t('common.close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}







