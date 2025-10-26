/**
 * Unified Keyboard Shortcuts Hook
 * Centralizes all keyboard shortcuts for the POS system
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useNotify } from '@/hooks/useNotify';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  category: 'navigation' | 'sales' | 'payment' | 'utility' | 'admin';
  action: () => void;
  enabled?: boolean;
}

export interface KeyboardShortcutConfig {
  enableGlobalShortcuts?: boolean;
  enableSalesShortcuts?: boolean;
  enableAdminShortcuts?: boolean;
  enablePaymentShortcuts?: boolean;
}

export function useKeyboardShortcuts(config: KeyboardShortcutConfig = {}) {
  const navigate = useNavigate();
  const notify = useNotify();
  const { items: cartItems, clearCart } = useCartStore();
  const { userRole } = useUIStore();
  
  const shortcutsRef = useRef<KeyboardShortcut[]>([]);
  const isInputFocusedRef = useRef(false);

  // Check if user has admin privileges
  const isAdmin = userRole === 'manager';

  // Check if current element is an input field
  const isInputElement = (element: Element): boolean => {
    const tagName = element.tagName.toLowerCase();
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(tagName) || element.getAttribute('contenteditable') === 'true';
  };

  // Navigation shortcuts
  const navigationShortcuts: KeyboardShortcut[] = [
    {
      key: 'F1',
      description: 'Go to Sales',
      category: 'navigation',
      action: () => navigate('/pos'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F2',
      description: 'Go to Returns',
      category: 'navigation',
      action: () => navigate('/returns'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F3',
      description: 'Go to Products',
      category: 'navigation',
      action: () => navigate('/products'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F4',
      description: 'Go to Customers',
      category: 'navigation',
      action: () => navigate('/customers'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F5',
      description: 'Go to Suppliers',
      category: 'navigation',
      action: () => navigate('/suppliers'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F6',
      description: 'Go to Pricing',
      category: 'navigation',
      action: () => navigate('/pricing'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F7',
      description: 'Go to Discounts',
      category: 'navigation',
      action: () => navigate('/discounts'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F8',
      description: 'Go to Shifts',
      category: 'navigation',
      action: () => navigate('/shifts'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F9',
      description: 'Go to Inventory',
      category: 'navigation',
      action: () => navigate('/inventory'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F10',
      description: 'Go to Reports',
      category: 'navigation',
      action: () => navigate('/reports'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F11',
      description: 'Go to Settings',
      category: 'navigation',
      action: () => navigate('/settings'),
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'F12',
      description: 'Go to Stocktake',
      category: 'navigation',
      action: () => navigate('/stocktake'),
      enabled: config.enableGlobalShortcuts
    }
  ];

  // Sales shortcuts
  const salesShortcuts: KeyboardShortcut[] = [
    {
      key: 'Enter',
      description: 'Add selected product to cart',
      category: 'sales',
      action: () => {
        // This will be handled by individual components
        notify.info('Enter key pressed - add product to cart');
      },
      enabled: config.enableSalesShortcuts
    },
    {
      key: 'Escape',
      description: 'Clear current operation',
      category: 'sales',
      action: () => {
        // This will be handled by individual components
        notify.info('Escape key pressed - clear operation');
      },
      enabled: config.enableSalesShortcuts
    },
    {
      key: 'Delete',
      description: 'Remove selected item from cart',
      category: 'sales',
      action: () => {
        // This will be handled by individual components
        notify.info('Delete key pressed - remove item');
      },
      enabled: config.enableSalesShortcuts
    },
    {
      key: 'c',
      ctrlKey: true,
      description: 'Clear cart',
      category: 'sales',
      action: () => {
        if (cartItems.length > 0) {
          clearCart();
          notify.success('Cart cleared');
        }
      },
      enabled: config.enableSalesShortcuts
    },
    {
      key: 'h',
      ctrlKey: true,
      description: 'Hold current sale',
      category: 'sales',
      action: () => {
        if (cartItems.length > 0) {
          notify.info('Hold sale functionality');
        }
      },
      enabled: config.enableSalesShortcuts
    },
    {
      key: 'r',
      ctrlKey: true,
      description: 'Resume held sale',
      category: 'sales',
      action: () => {
        notify.info('Resume held sale functionality');
      },
      enabled: config.enableSalesShortcuts
    }
  ];

  // Payment shortcuts
  const paymentShortcuts: KeyboardShortcut[] = [
    {
      key: 'p',
      ctrlKey: true,
      description: 'Process payment (Cash)',
      category: 'payment',
      action: () => {
        if (cartItems.length > 0) {
          notify.info('Process cash payment');
        }
      },
      enabled: config.enablePaymentShortcuts
    },
    {
      key: 'd',
      ctrlKey: true,
      description: 'Process payment (Card)',
      category: 'payment',
      action: () => {
        if (cartItems.length > 0) {
          notify.info('Process card payment');
        }
      },
      enabled: config.enablePaymentShortcuts
    },
    {
      key: 'w',
      ctrlKey: true,
      description: 'Process payment (Wallet)',
      category: 'payment',
      action: () => {
        if (cartItems.length > 0) {
          notify.info('Process wallet payment');
        }
      },
      enabled: config.enablePaymentShortcuts
    },
    {
      key: 't',
      ctrlKey: true,
      description: 'Process payment (Credit)',
      category: 'payment',
      action: () => {
        if (cartItems.length > 0) {
          notify.info('Process credit payment');
        }
      },
      enabled: config.enablePaymentShortcuts
    }
  ];

  // Utility shortcuts
  const utilityShortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      description: 'Open command palette',
      category: 'utility',
      action: () => {
        notify.info('Command palette opened');
      },
      enabled: config.enableGlobalShortcuts
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts help',
      category: 'utility',
      action: () => {
        notify.info('Keyboard shortcuts help');
      },
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'f',
      ctrlKey: true,
      description: 'Focus search field',
      category: 'utility',
      action: () => {
        // This will be handled by individual components
        notify.info('Focus search field');
      },
      enabled: config.enableGlobalShortcuts
    },
    {
      key: 'b',
      ctrlKey: true,
      description: 'Focus barcode field',
      category: 'utility',
      action: () => {
        // This will be handled by individual components
        notify.info('Focus barcode field');
      },
      enabled: config.enableGlobalShortcuts
    }
  ];

  // Admin shortcuts
  const adminShortcuts: KeyboardShortcut[] = [
    {
      key: 'g',
      ctrlKey: true,
      description: 'Go to GRN',
      category: 'admin',
      action: () => navigate('/grn'),
      enabled: config.enableAdminShortcuts && isAdmin
    },
    {
      key: 'u',
      ctrlKey: true,
      description: 'Go to Users',
      category: 'admin',
      action: () => navigate('/users'),
      enabled: config.enableAdminShortcuts && isAdmin
    },
    {
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
      description: 'Go to Audit',
      category: 'admin',
      action: () => navigate('/audit'),
      enabled: config.enableAdminShortcuts && isAdmin
    },
    {
      key: 'h',
      ctrlKey: true,
      description: 'Go to Health Check',
      category: 'admin',
      action: () => navigate('/health'),
      enabled: config.enableAdminShortcuts && isAdmin
    }
  ];

  // Combine all shortcuts
  const allShortcuts = [
    ...navigationShortcuts,
    ...salesShortcuts,
    ...paymentShortcuts,
    ...utilityShortcuts,
    ...adminShortcuts
  ].filter(shortcut => shortcut.enabled !== false);

  // Update shortcuts ref
  shortcutsRef.current = allShortcuts;

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if input is focused
    const activeElement = document.activeElement;
    isInputFocusedRef.current = activeElement ? isInputElement(activeElement) : false;

    // Skip shortcuts if input is focused (unless it's a global shortcut)
    if (isInputFocusedRef.current && !event.ctrlKey && !event.altKey && !event.metaKey) {
      return;
    }

    // Find matching shortcut
    const matchingShortcut = allShortcuts.find(shortcut => {
      return shortcut.key.toLowerCase() === event.key.toLowerCase() &&
             !!shortcut.ctrlKey === event.ctrlKey &&
             !!shortcut.altKey === event.altKey &&
             !!shortcut.shiftKey === event.shiftKey &&
             !!shortcut.metaKey === event.metaKey;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        matchingShortcut.action();
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error);
        notify.error('Error executing keyboard shortcut');
      }
    }
  }, [allShortcuts, notify]);

  // Register keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get shortcuts by category
  const getShortcutsByCategory = useCallback((category: KeyboardShortcut['category']) => {
    return allShortcuts.filter(shortcut => shortcut.category === category);
  }, [allShortcuts]);

  // Get all shortcuts
  const getAllShortcuts = useCallback(() => {
    return allShortcuts;
  }, [allShortcuts]);

  // Check if shortcut is available
  const isShortcutAvailable = useCallback((key: string, modifiers?: {
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
  }) => {
    return allShortcuts.some(shortcut => 
      shortcut.key.toLowerCase() === key.toLowerCase() &&
      !!shortcut.ctrlKey === !!modifiers?.ctrlKey &&
      !!shortcut.altKey === !!modifiers?.altKey &&
      !!shortcut.shiftKey === !!modifiers?.shiftKey &&
      !!shortcut.metaKey === !!modifiers?.metaKey
    );
  }, [allShortcuts]);

  return {
    shortcuts: allShortcuts,
    getShortcutsByCategory,
    getAllShortcuts,
    isShortcutAvailable,
    isInputFocused: isInputFocusedRef.current
  };
}




