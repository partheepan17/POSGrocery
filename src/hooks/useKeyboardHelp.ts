import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotify } from '@/lib/notifications';

export function useKeyboardHelp() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const notify = useNotify();

  // Command palette actions
  const commandActions = [
    // Navigation commands
    {
      id: 'nav-sales',
      title: 'Go to Sales',
      description: 'Navigate to the sales page',
      shortcut: 'F1',
      category: 'Navigation',
      action: () => navigate('/sales'),
    },
    {
      id: 'nav-returns',
      title: 'Go to Returns',
      description: 'Navigate to the returns page',
      shortcut: 'F2',
      category: 'Navigation',
      action: () => navigate('/returns'),
    },
    {
      id: 'nav-products',
      title: 'Go to Products',
      description: 'Navigate to the products page',
      shortcut: 'F3',
      category: 'Navigation',
      action: () => navigate('/products'),
    },
    {
      id: 'nav-customers',
      title: 'Go to Customers',
      description: 'Navigate to the customers page',
      shortcut: 'F4',
      category: 'Navigation',
      action: () => navigate('/customers'),
    },
    {
      id: 'nav-suppliers',
      title: 'Go to Suppliers',
      description: 'Navigate to the suppliers page',
      shortcut: 'F5',
      category: 'Navigation',
      action: () => navigate('/suppliers'),
    },
    {
      id: 'nav-pricing',
      title: 'Go to Pricing',
      description: 'Navigate to the pricing page',
      shortcut: 'F6',
      category: 'Navigation',
      action: () => navigate('/pricing'),
    },
    {
      id: 'nav-discounts',
      title: 'Go to Discounts',
      description: 'Navigate to the discounts page',
      shortcut: 'F7',
      category: 'Navigation',
      action: () => navigate('/discounts'),
    },
    {
      id: 'nav-shifts',
      title: 'Go to Shifts',
      description: 'Navigate to the shifts page',
      shortcut: 'F8',
      category: 'Navigation',
      action: () => navigate('/shifts'),
    },
    
    // Sales commands
    {
      id: 'sales-new',
      title: 'New Sale',
      description: 'Start a new sale transaction',
      shortcut: 'Ctrl+N',
      category: 'Sales',
      action: () => {
        // This would trigger new sale functionality
        notify.success('New sale started');
      },
    },
    {
      id: 'sales-hold',
      title: 'Hold Sale',
      description: 'Hold current sale for later',
      shortcut: 'F9',
      category: 'Sales',
      action: () => {
        // This would trigger hold sale functionality
        notify.info('Sale held successfully');
      },
    },
    {
      id: 'sales-resume',
      title: 'Resume Hold',
      description: 'Resume a held sale',
      shortcut: 'F10',
      category: 'Sales',
      action: () => {
        // This would trigger resume hold functionality
        notify.info('Resuming held sale...');
      },
    },
    {
      id: 'sales-cash',
      title: 'Cash Payment',
      description: 'Process cash payment',
      shortcut: 'F11',
      category: 'Sales',
      action: () => {
        // This would trigger cash payment functionality
        notify.info('Opening cash payment...');
      },
    },
    {
      id: 'sales-card',
      title: 'Card Payment',
      description: 'Process card payment',
      shortcut: 'F12',
      category: 'Sales',
      action: () => {
        // This would trigger card payment functionality
        notify.info('Opening card payment...');
      },
    },
    
    // Returns commands
    {
      id: 'returns-start',
      title: 'Start Return',
      description: 'Begin return process',
      shortcut: 'Ctrl+R',
      category: 'Returns',
      action: () => navigate('/returns'),
    },
    
    // Cash operations
    {
      id: 'cash-drawer',
      title: 'Open Drawer',
      description: 'Open cash drawer',
      shortcut: 'Ctrl+D',
      category: 'Cash Operations',
      action: () => {
        // This would trigger drawer open functionality
        notify.info('Opening cash drawer...');
      },
    },
    {
      id: 'cash-count',
      title: 'Cash Count',
      description: 'Perform cash count',
      shortcut: 'Ctrl+Shift+D',
      category: 'Cash Operations',
      action: () => navigate('/cash/drawer'),
    },
    
    // Printing commands
    {
      id: 'print-receipt',
      title: 'Print Receipt',
      description: 'Print current receipt',
      shortcut: 'Ctrl+P',
      category: 'Printing',
      action: () => {
        // This would trigger print functionality
        notify.info('Printing receipt...');
      },
    },
    {
      id: 'print-reprint',
      title: 'Reprint Receipt',
      description: 'Reprint previous receipt',
      shortcut: 'Ctrl+Shift+P',
      category: 'Printing',
      action: () => {
        // This would trigger reprint functionality
        notify.info('Opening reprint dialog...');
      },
    },
  ];

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Help shortcut (? key)
    if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      setIsHelpOpen(true);
      return;
    }

    // Command palette shortcut (Ctrl+K or Cmd+K)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
      return;
    }

    // Individual shortcuts
    switch (e.key) {
      case 'F1':
        e.preventDefault();
        navigate('/sales');
        break;
      case 'F2':
        e.preventDefault();
        navigate('/returns');
        break;
      case 'F3':
        e.preventDefault();
        navigate('/products');
        break;
      case 'F4':
        e.preventDefault();
        navigate('/customers');
        break;
      case 'F5':
        e.preventDefault();
        navigate('/suppliers');
        break;
      case 'F6':
        e.preventDefault();
        navigate('/pricing');
        break;
      case 'F7':
        e.preventDefault();
        navigate('/discounts');
        break;
      case 'F8':
        e.preventDefault();
        navigate('/shifts');
        break;
      case 'F9':
        e.preventDefault();
        // Hold sale functionality
        notify.info('Hold sale functionality triggered');
        break;
      case 'F10':
        e.preventDefault();
        // Resume hold functionality
        notify.info('Resume hold functionality triggered');
        break;
      case 'F11':
        e.preventDefault();
        // Cash payment functionality
        notify.info('Cash payment functionality triggered');
        break;
      case 'F12':
        e.preventDefault();
        // Card payment functionality
        notify.info('Card payment functionality triggered');
        break;
      case 'r':
        if (e.ctrlKey) {
          e.preventDefault();
          navigate('/returns');
        }
        break;
      case 'd':
        if (e.ctrlKey) {
          e.preventDefault();
          // Open drawer functionality
          notify.info('Open drawer functionality triggered');
        }
        break;
      case 'n':
        if (e.ctrlKey) {
          e.preventDefault();
          // New sale functionality
          notify.success('New sale started');
        }
        break;
      case 'p':
        if (e.ctrlKey) {
          e.preventDefault();
          // Print functionality
          notify.info('Print functionality triggered');
        }
        break;
    }
  }, [navigate, notify]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    isHelpOpen,
    setIsHelpOpen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandActions,
  };
}



