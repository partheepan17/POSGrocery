import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, Theme, Language, LabelSettings } from '@/types';
import { User } from '@/services/authService';
import { Session } from '@/services/shiftService';

interface AppState {
  // Theme and UI
  theme: Theme;
  language: Language;
  sidebarOpen: boolean;
  fullscreen: boolean;
  
  // Settings
  settings: AppSettings;
  
  // Hold settings
  holdsSettings: {
    enabled: boolean;
    maxHoldsPerTerminal: number;
    expiryMinutes: number;
    purgeOnOpen: boolean;
    lockPricesDefault: boolean;
    requireCustomerForHold: boolean;
    printHoldSlipOnCreate: boolean;
  };
  
  // Stock settings
  stockSettings: {
    defaultCountMode: 'scan-first' | 'grid';
    allowNegativeAdjust: boolean;
    requireManagerForNegative: boolean;
    autoCreateMissingBarcodes: boolean;
    costUpdateOnGRN: 'never' | 'if-empty' | 'always';
  };
  
  // Security settings
  securitySettings: {
    inactivityMinutes: number;
    maxPinAttempts: number;
    lockoutMinutes: number;
    showAuditBanner: boolean;
  };
  
  // Label settings
  labelSettings: LabelSettings;
  
  // Authentication and Session
  currentUser: User | null;
  currentSession: Session | null;
  terminal: string;
  
  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleFullscreen: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  updateHoldsSettings: (settings: Partial<AppState['holdsSettings']>) => void;
  updateStockSettings: (settings: Partial<AppState['stockSettings']>) => void;
  updateSecuritySettings: (settings: Partial<AppState['securitySettings']>) => void;
  setCurrentUser: (user: User | null) => void;
  setCurrentSession: (session: Session | null) => void;
  setTerminal: (terminal: string) => void;
}

const defaultSettings: AppSettings = {
  // New structured settings
  storeInfo: {
    name: 'My Grocery Store',
    address: '123 Main Street\nColombo 01\nSri Lanka',
    taxId: '123456789V',
    logoUrl: '',
    defaultReceiptLanguage: 'EN',
  },
  devices: {
    receiptPaper: '80mm',
    cashDrawerOpenOnCash: true,
    barcodeInputMode: 'keyboard_wedge',
    scaleMode: 'off',
  },
  languageFormatting: {
    displayLanguage: 'EN',
    roundingMode: 'NEAREST_1',
    kgDecimals: 3,
  },
  pricingPolicies: {
    missingPricePolicy: 'warn_fallback',
    requiredTiers: ['retail'],
    autoCreateCategories: true,
    autoCreateSuppliers: true,
  },
  receiptOptions: {
    footerTextEN: 'Warranty: 7 days | Hotline: 011-1234567',
    footerTextSI: 'වගකීම: දින 7 | දුරකථන: 011-1234567',
    footerTextTA: 'உத்தரவாதம்: 7 நாட்கள் | தொலைபேசி: 011-1234567',
    showQRCode: true,
    showBarcode: true,
    showTierBadge: false,
  },
  backupSettings: {
    provider: 'local',
    schedule: {
      dailyTime: '22:30',
      onSettingsChange: true,
    },
    retention: {
      keepDaily: 30,
      keepConfigChange: 5,
    },
    credentials: {
      encryptionKey: 'default-development-key-change-in-production',
    },
  },
  
  // Legacy settings (for backward compatibility)
  currency: 'LKR',
  currencySymbol: 'රු',
  roundingMode: 'nearest',
  roundingValue: 0.01,
  taxRate: 15,
  receiptLanguage: 'en',
  theme: 'auto',
  autoBackup: true,
  backupFrequency: 'daily',
  barcodeScanner: true,
  scaleIntegration: false,
  printerSettings: {
    enabled: false,
    copies: 1,
  },
  receiptSettings: {
    defaultPaper: '80mm',
    drawerOnCash: true,
    showQR: true,
    showBarcode: true,
    footerTextEN: 'Warranty: 7 days | Hotline: 011-1234567',
    footerTextSI: 'වගකීම: දින 7 | දුරකථන: 011-1234567',
    footerTextTA: 'உத்தரவாதம்: 7 நாட்கள் | தொலைபேசி: 011-1234567',
    decimalPlacesKg: 3,
  },
  pricingSettings: {
    missingPricePolicy: 'warn',
    requiredTiers: ['retail'],
    autoCreateCategories: true,
    autoCreateSuppliers: true,
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'auto',
      language: 'en',
      sidebarOpen: true,
        fullscreen: false,
        settings: defaultSettings,
        
        // Hold settings
        holdsSettings: {
          enabled: true,
          maxHoldsPerTerminal: 10,
          expiryMinutes: 120, // 2 hours
          purgeOnOpen: true,
          lockPricesDefault: false,
          requireCustomerForHold: false,
          printHoldSlipOnCreate: false
        },
        
        // Stock settings
        stockSettings: {
          defaultCountMode: 'scan-first',
          allowNegativeAdjust: true,
          requireManagerForNegative: true,
          autoCreateMissingBarcodes: false,
          costUpdateOnGRN: 'if-empty'
        },
        
        // Security settings
        securitySettings: {
          inactivityMinutes: 10,
          maxPinAttempts: 5,
          lockoutMinutes: 15,
          showAuditBanner: true
        },
        
        // Label settings
        labelSettings: {
          defaultPresetId: 'product-50x30',
          defaultDPI: 203 as const,
          thermalPrinterName: '',
          a4Default: {
            rows: 7,
            cols: 3,
            margin_mm: 5,
            gutter_mm: 2
          }
        },
      
      // Authentication and Session
      currentUser: null,
      currentSession: null,
      terminal: 'POS-001',

      // Actions
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },

      setLanguage: (language) => set({ language }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleFullscreen: () => {
        const newFullscreen = !get().fullscreen;
        set({ fullscreen: newFullscreen });
        
        if (newFullscreen) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
      },

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

        resetSettings: () => set({ settings: defaultSettings }),
        
        updateHoldsSettings: (newHoldsSettings) =>
          set((state) => ({
            holdsSettings: { ...state.holdsSettings, ...newHoldsSettings },
          })),
        
        updateStockSettings: (newStockSettings) =>
          set((state) => ({
            stockSettings: { ...state.stockSettings, ...newStockSettings },
          })),
        
        updateSecuritySettings: (newSecuritySettings) =>
          set((state) => ({
            securitySettings: { ...state.securitySettings, ...newSecuritySettings },
          })),
        
        setCurrentUser: (user) => set({ currentUser: user }),
      
      setCurrentSession: (session) => set({ currentSession: session }),
      
      setTerminal: (terminal) => set({ terminal }),
    }),
    {
      name: 'grocery-pos-app',
      version: 1,
          partialize: (state) => ({
            theme: state.theme,
            language: state.language,
            settings: state.settings,
            holdsSettings: state.holdsSettings,
            stockSettings: state.stockSettings,
            securitySettings: state.securitySettings,
            currentUser: state.currentUser,
            currentSession: state.currentSession,
            terminal: state.terminal,
          }),
      migrate: (persistedState: any, version: number) => {
        console.log('Migrating app store, version:', version);
        console.log('Persisted state:', persistedState);
        
        // If no version or old version, reset to default settings
        if (!version || version < 1) {
          console.log('Migrating app settings to new structure');
          return {
            ...persistedState,
            settings: defaultSettings,
          };
        }
        
        // Ensure settings has the proper structure
        if (persistedState?.settings && !persistedState.settings.storeInfo) {
          console.log('Settings missing storeInfo, adding default structure');
          persistedState.settings = {
            ...defaultSettings,
            ...persistedState.settings,
          };
        }
        
        return persistedState;
      },
    }
  )
);