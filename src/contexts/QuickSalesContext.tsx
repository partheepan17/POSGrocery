/**
 * Quick Sales Context
 * Manages quick sales state and operations
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface QuickSalesState {
  isActive: boolean;
  sessionId: string | null;
  startTime: Date | null;
  endTime: Date | null;
  totalSales: number;
  totalTransactions: number;
  showYesterdayBanner: boolean;
}

export interface QuickSalesContextType {
  state: QuickSalesState;
  session: any;
  isLoading: boolean;
  startSession: (sessionId: string) => void;
  endSession: () => void;
  updateSales: (amount: number) => void;
  incrementTransactions: () => void;
  setShowYesterdayBanner: (show: boolean) => void;
  closeSession: (pin: string, reason: string) => Promise<boolean>;
  refreshSession: () => void;
}

const QuickSalesContext = createContext<QuickSalesContextType | undefined>(undefined);

export interface QuickSalesProviderProps {
  children: ReactNode;
}

export function QuickSalesProvider({ children }: QuickSalesProviderProps) {
  const [state, setState] = useState<QuickSalesState>({
    isActive: false,
    sessionId: null,
    startTime: null,
    endTime: null,
    totalSales: 0,
    totalTransactions: 0,
    showYesterdayBanner: false,
  });

  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startSession = (sessionId: string) => {
    setState(prev => ({
      ...prev,
      isActive: true,
      sessionId,
      startTime: new Date(),
      endTime: null,
      totalSales: 0,
      totalTransactions: 0,
    }));
  };

  const endSession = () => {
    setState(prev => ({
      ...prev,
      isActive: false,
      sessionId: null,
      endTime: new Date(),
    }));
  };

  const updateSales = (amount: number) => {
    setState(prev => ({
      ...prev,
      totalSales: prev.totalSales + amount,
    }));
  };

  const incrementTransactions = () => {
    setState(prev => ({
      ...prev,
      totalTransactions: prev.totalTransactions + 1,
    }));
  };

  const setShowYesterdayBanner = (show: boolean) => {
    setState(prev => ({
      ...prev,
      showYesterdayBanner: show,
    }));
  };

  const closeSession = async (pin: string, reason: string): Promise<boolean> => {
    // Mock implementation
    return true;
  };

  const refreshSession = () => {
    // Mock implementation
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const value: QuickSalesContextType = {
    state,
    session,
    isLoading,
    startSession,
    endSession,
    updateSales,
    incrementTransactions,
    setShowYesterdayBanner,
    closeSession,
    refreshSession,
  };

  return (
    <QuickSalesContext.Provider value={value}>
      {children}
    </QuickSalesContext.Provider>
  );
}

export function useQuickSales(): QuickSalesContextType {
  const context = useContext(QuickSalesContext);
  if (context === undefined) {
    throw new Error('useQuickSales must be used within a QuickSalesProvider');
  }
  return context;
}