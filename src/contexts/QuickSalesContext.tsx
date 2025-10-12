import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface QuickSalesSession {
  id: number;
  session_date: string;
  status: string;
  total_amount: number;
  total_lines: number;
}

interface QuickSalesContextType {
  session: QuickSalesSession | null;
  isLoading: boolean;
  isYesterdaySession: boolean;
  ensureSessionOpen: () => Promise<void>;
  closeSession: (managerPin: string, note?: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
  showYesterdayBanner: boolean;
  setShowYesterdayBanner: (show: boolean) => void;
}

const QuickSalesContext = createContext<QuickSalesContextType | undefined>(undefined);

export const useQuickSales = () => {
  const context = useContext(QuickSalesContext);
  if (!context) {
    throw new Error('useQuickSales must be used within a QuickSalesProvider');
  }
  return context;
};

interface QuickSalesProviderProps {
  children: React.ReactNode;
}

export const QuickSalesProvider: React.FC<QuickSalesProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const [session, setSession] = useState<QuickSalesSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showYesterdayBanner, setShowYesterdayBanner] = useState(false);

  // Check if session is from yesterday
  const isYesterdaySession = session ? 
    session.session_date !== new Date().toISOString().split('T')[0] : false;

  // Ensure session is open
  const ensureSessionOpen = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoading) {
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/quick-sales/ensure-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opened_by: 1 })
      });

      if (!response.ok) {
        throw new Error('Failed to ensure session is open');
      }

      const data = await response.json();
      setSession(data.session);

      // Check if this is yesterday's session
      const today = new Date().toISOString().split('T')[0];
      if (data.session.session_date !== today) {
        setShowYesterdayBanner(true);
      }
    } catch (error) {
      console.error('Failed to ensure session:', error);
      toast.error(t('quickSales.errors.sessionOpenFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t, isLoading]);

  // Close session
  const closeSession = useCallback(async (managerPin: string, note?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/quick-sales/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerPin,
          note: note || 'Quick Sales session closed'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to close session');
      }

      const data = await response.json();
      
      toast.success(t('quickSales.success.sessionClosed', { receiptNo: data.receipt_no }));
      
      // Reset session and ensure new one
      setSession(null);
      setShowYesterdayBanner(false);
      await ensureSessionOpen();
      
      return true;
    } catch (error) {
      console.error('Close failed:', error);
      toast.error(error instanceof Error ? error.message : t('quickSales.errors.closeSessionFailed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [t, ensureSessionOpen]);

  // Refresh session data
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/quick-sales/session');
      if (!response.ok) return;

      const data = await response.json();
      if (data.status === 'none') {
        setSession(null);
        setShowYesterdayBanner(false);
      } else {
        setSession(data.session);
        
        // Check if this is yesterday's session
        const today = new Date().toISOString().split('T')[0];
        if (data.session.session_date !== today) {
          setShowYesterdayBanner(true);
        }
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  }, []);

  // Auto-ensure session on mount
  useEffect(() => {
    // Only ensure session if we don't have one already
    if (!session) {
      ensureSessionOpen();
    }
  }, [ensureSessionOpen, session]);

  const value: QuickSalesContextType = {
    session,
    isLoading,
    isYesterdaySession,
    ensureSessionOpen,
    closeSession,
    refreshSession,
    showYesterdayBanner,
    setShowYesterdayBanner
  };

  return (
    <QuickSalesContext.Provider value={value}>
      {children}
    </QuickSalesContext.Provider>
  );
};


