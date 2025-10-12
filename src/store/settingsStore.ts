import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppSettings } from '@/types';

// Schema version for migrations
const SETTINGS_SCHEMA_VERSION = 1;

interface SettingsState {
  // Schema versioning
  schemaVersion: number;
  
  // Core settings
  settings: AppSettings;
  
  // Feature flags
  featureFlags: {
    barcodeScanner: boolean;
    scaleIntegration: boolean;
    advancedReporting: boolean;
    multiLocation: boolean;
    loyaltyProgram: boolean;
    inventoryAlerts: boolean;
    backupSync: boolean;
    analytics: boolean;
  };
  
  // UI preferences
  uiPreferences: {
    compactMode: boolean;
    showKeyboardShortcuts: boolean;
    autoSave: boolean;
    notifications: {
      sound: boolean;
      desktop: boolean;
      email: boolean;
    };
  };
  
  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateFeatureFlag: (flag: keyof SettingsState['featureFlags'], enabled: boolean) => void;
  updateUIPreference: (preference: string, value: any) => void;
  resetSettings: () => void;
  migrateSettings: (fromVersion: number, toVersion: number) => void;
}

const defaultSettings: AppSettings = {
  // New structured settings
  storeInfo: {
    name: 'My Grocery Store',
    address: '123 Main Street\nColombo 01\nSri Lanka',
    taxId: '123456789V',
    logoUrl: '',
    defaultReceiptLanguage: 'SI',
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
  
  refund: {
    managerPinThreshold: 5000,
    defaultReason: 'CUSTOMER_CHANGE' as const,
    requireManagerApproval: true,
    autoRestoreInventory: true,
  },
  
  grnSettings: {
    autoNumberPrefix: 'GRN-',
    autoUpdateCostPolicy: 'latest' as const,
    expiryReminderDays: 14,
    defaultTaxPercent: 0,
  },
  
  shiftSettings: {
    requireShiftForSales: true,        // If true, POS blocks finalize unless a shift is open
    allowMultipleOpenPerTerminal: false,
    cashDrawerPulseOnOpen: true,
    sessionTimeoutMinutes: 480,        // 8h shift hint (no auto-close, only warning)
    xReportFooterEN: 'Thank you',
    zReportFooterEN: 'End of Day',
  },
  
  // Legacy settings (for backward compatibility)
  currency: 'LKR',
  currencySymbol: 'රු',
  roundingMode: 'nearest',
  roundingValue: 0.01,
  taxRate: 15,
  receiptLanguage: 'si',
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

const defaultFeatureFlags = {
  barcodeScanner: true,
  scaleIntegration: false,
  advancedReporting: true,
  multiLocation: false,
  loyaltyProgram: false,
  inventoryAlerts: true,
  backupSync: true,
  analytics: false,
};

const defaultUIPreferences = {
  compactMode: false,
  showKeyboardShortcuts: true,
  autoSave: true,
  notifications: {
    sound: true,
    desktop: true,
    email: false,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      settings: defaultSettings,
      featureFlags: defaultFeatureFlags,
      uiPreferences: defaultUIPreferences,

      // Actions
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      updateFeatureFlag: (flag, enabled) =>
        set((state) => ({
          featureFlags: { ...state.featureFlags, [flag]: enabled },
        })),

      updateUIPreference: (preference, value) =>
        set((state) => {
          const newPreferences = { ...state.uiPreferences };
          if (preference.includes('.')) {
            const [parent, child] = preference.split('.');
            newPreferences[parent as keyof typeof newPreferences] = {
              ...(newPreferences[parent as keyof typeof newPreferences] as any),
              [child]: value,
            };
          } else {
            newPreferences[preference as keyof typeof newPreferences] = value;
          }
          return { uiPreferences: newPreferences };
        }),

      resetSettings: () =>
        set({
          schemaVersion: SETTINGS_SCHEMA_VERSION,
          settings: defaultSettings,
          featureFlags: defaultFeatureFlags,
          uiPreferences: defaultUIPreferences,
        }),

      migrateSettings: (fromVersion, toVersion) => {
        const currentState = get();
        
        // Migration logic for different schema versions
        if (fromVersion < 1 && toVersion >= 1) {
          // Migrate from version 0 to 1
          set({
            schemaVersion: toVersion,
            settings: {
              ...defaultSettings,
              ...currentState.settings,
            },
            featureFlags: {
              ...defaultFeatureFlags,
              ...currentState.featureFlags,
            },
            uiPreferences: {
              ...defaultUIPreferences,
              ...currentState.uiPreferences,
            },
          });
        }
      },
    }),
    {
      name: 'grocery-pos-settings',
      version: SETTINGS_SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version: number) => {
        // Handle migration when schema version changes
        if (version < SETTINGS_SCHEMA_VERSION) {
          const state = persistedState as SettingsState;
          state.migrateSettings?.(version, SETTINGS_SCHEMA_VERSION);
          return state;
        }
        return persistedState;
      },
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        settings: state.settings,
        featureFlags: state.featureFlags,
        uiPreferences: state.uiPreferences,
      }),
    }
  )
);
