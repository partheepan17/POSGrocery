/**
 * UI state management for POS system
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PrintLanguage = 'en' | 'si' | 'ta';

interface UIState {
  // Online status
  isOnline: boolean;
  lastOnlineCheck: Date | null;
  
  // Print language
  printLanguage: PrintLanguage;
  
  // Current time
  currentTime: Date;
  
  // User info
  userRole: 'manager' | 'cashier';
  userName: string;
  
  // Terminal info
  terminalId: string;
  
  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  setPrintLanguage: (language: PrintLanguage) => void;
  updateTime: () => void;
  setUserInfo: (role: 'manager' | 'cashier', name: string) => void;
  setTerminalId: (terminalId: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: true,
      lastOnlineCheck: null,
      printLanguage: 'si', // Default to Sinhala
      currentTime: new Date(),
      userRole: 'cashier',
      userName: 'Admin User',
      terminalId: 'TERMINAL-001',

      // Set online status
      setOnlineStatus: (isOnline: boolean) => {
        set({ 
          isOnline, 
          lastOnlineCheck: new Date() 
        });
      },

      // Set print language
      setPrintLanguage: (language: PrintLanguage) => {
        set({ printLanguage: language });
      },

      // Update current time
      updateTime: () => {
        set({ currentTime: new Date() });
      },

      // Set user info
      setUserInfo: (role: 'manager' | 'cashier', name: string) => {
        set({ userRole: role, userName: name });
      },

      // Set terminal ID
      setTerminalId: (terminalId: string) => {
        set({ terminalId });
      }
    }),
    {
      name: 'pos-ui-storage',
      partialize: (state) => ({
        printLanguage: state.printLanguage,
        userRole: state.userRole,
        userName: state.userName,
        terminalId: state.terminalId
      })
    }
  )
);

