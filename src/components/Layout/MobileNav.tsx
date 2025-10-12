import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ShoppingCart, 
  Package, 
  Warehouse, 
  RotateCcw, 
  BarChart3, 
  Settings,
  Users,
  DollarSign,
  Truck,
  Percent,
  Clock,
  Search
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const quickNavItems = [
    { name: t('navigation.sales'), href: '/', icon: ShoppingCart, color: 'bg-blue-600' },
    { name: t('navigation.returns'), href: '/returns', icon: RotateCcw, color: 'bg-orange-600' },
    { name: t('navigation.products'), href: '/products', icon: Package, color: 'bg-green-600' },
    { name: t('navigation.inventory'), href: '/inventory', icon: Warehouse, color: 'bg-purple-600' },
    { name: 'Stock Dashboard', href: '/stock', icon: BarChart3, color: 'bg-emerald-600' },
    { name: t('navigation.customers'), href: '/customers', icon: Users, color: 'bg-indigo-600' },
    { name: t('navigation.suppliers'), href: '/suppliers', icon: Truck, color: 'bg-teal-600' },
    { name: t('navigation.pricing'), href: '/pricing', icon: DollarSign, color: 'bg-yellow-600' },
    { name: t('navigation.discounts'), href: '/discounts', icon: Percent, color: 'bg-pink-600' },
    { name: t('shifts.title'), href: '/shifts', icon: Clock, color: 'bg-gray-600' },
    { name: t('reports.salesReport'), href: '/reports', icon: BarChart3, color: 'bg-red-600' },
    { name: t('navigation.settings'), href: '/settings', icon: Settings, color: 'bg-slate-600' },
    { name: t('common.search'), href: '/search', icon: Search, color: 'bg-cyan-600' },
  ];

  const handleNavClick = (href: string) => {
    navigate(href);
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Mobile Navigation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('common.navigation')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Navigation Grid */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-2 gap-3">
              {quickNavItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg",
                    "text-white font-medium text-sm",
                    item.color
                  )}
                >
                  <item.icon className="w-6 h-6 mb-2" />
                  <span className="text-center leading-tight">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>viRtual POS v1.0.0</span>
              </div>
              <div>Press any key to close</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
