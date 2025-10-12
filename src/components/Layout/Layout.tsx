import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/utils/cn';
import { KeyboardHelp } from '../KeyboardHelp';
import { CommandPalette } from '../CommandPalette';
import { useKeyboardHelp } from '@/hooks/useKeyboardHelp';

export function Layout() {
  const { sidebarOpen } = useAppStore();
  const navigate = useNavigate();
  const { 
    isHelpOpen, 
    setIsHelpOpen, 
    isCommandPaletteOpen, 
    setIsCommandPaletteOpen, 
    commandActions 
  } = useKeyboardHelp();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('🔍 Keyboard event:', e.key, 'Ctrl:', e.ctrlKey);
      
      // Ctrl+L for Labels
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        console.log('🚀 Navigating to /labels');
        navigate('/labels');
      }
      // Ctrl+1 for Sales
      else if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        console.log('🚀 Navigating to / (Sales)');
        navigate('/');
      }
      // Ctrl+2 for Products
      else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        navigate('/products');
      }
      // Ctrl+3 for Pricing
      else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        navigate('/pricing');
      }
      // Ctrl+4 for Suppliers
      else if (e.ctrlKey && e.key === '4') {
        e.preventDefault();
        navigate('/suppliers');
      }
      // Ctrl+5 for Customers
      else if (e.ctrlKey && e.key === '5') {
        e.preventDefault();
        navigate('/customers');
      }
      // Ctrl+6 for Discounts
      else if (e.ctrlKey && e.key === '6') {
        e.preventDefault();
        navigate('/discounts');
      }
      // Ctrl+7 for Inventory
      else if (e.ctrlKey && e.key === '7') {
        e.preventDefault();
        navigate('/inventory');
      }
      // Ctrl+8 for Reports
      else if (e.ctrlKey && e.key === '8') {
        e.preventDefault();
        navigate('/reports');
      }
      // Ctrl+9 for Settings
      else if (e.ctrlKey && e.key === '9') {
        e.preventDefault();
        navigate('/settings');
      }
      // Ctrl+G for GRN
      else if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        navigate('/grn');
      }
      // Ctrl+U for Users
      else if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        navigate('/users');
      }
      // Ctrl+A for Audit
      else if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        navigate('/audit');
      }
      // Ctrl+H for Health Check
      else if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        navigate('/health');
      }
      // Ctrl+I for About
      else if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        navigate('/about');
      }
      // F6 for Stocktake (removed - conflicts with Hold Resume)
      // F9 for Returns (removed - conflicts with Wallet payment)
      // F12 for Stocktake (alternative)
      else if (e.key === 'F12') {
        e.preventDefault();
        navigate('/stocktake');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header />
        
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Keyboard Help Modal */}
      <KeyboardHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
      
      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commandActions}
      />
    </div>
  );
}







