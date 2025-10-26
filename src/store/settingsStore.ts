import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'auto';
export type Language = 'en' | 'si' | 'ta';
export type ValuationMethod = 'fifo' | 'lifo' | 'average' | 'informational';

export interface UserPreferences {
  theme: Theme;
  language: Language;
  defaultValuationMethod: ValuationMethod;
  notifications: {
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
  ui: {
    compactMode: boolean;
    showKeyboardShortcuts: boolean;
    autoSave: boolean;
  };
}

export interface TerminalInfo {
  id: number | null;
  name: string | null;
  description: string | null;
  isActive: boolean;
  lastSeen: string | null;
}

interface SettingsState {
  // User preferences
  preferences: UserPreferences;
  
  // Terminal information
  currentTerminal: TerminalInfo;
  
  // Settings (for compatibility)
  settings: any;
  
  // Actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  updateNestedPreference: <K extends keyof UserPreferences, N extends keyof UserPreferences[K]>(
    key: K, 
    nestedKey: N, 
    value: UserPreferences[K][N]
  ) => void;
  setCurrentTerminal: (terminal: Partial<TerminalInfo>) => void;
  resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'auto',
  language: 'en',
  defaultValuationMethod: 'informational',
  notifications: {
    sound: true,
    desktop: true,
    email: false,
  },
  ui: {
    compactMode: false,
    showKeyboardShortcuts: true,
    autoSave: true,
  },
};

const defaultTerminal: TerminalInfo = {
  id: null,
  name: null,
  description: null,
  isActive: false,
  lastSeen: null,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, _get) => ({
      // Initial state
      preferences: defaultPreferences,
      currentTerminal: defaultTerminal,
      settings: {},

      // Actions
      updatePreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),

      updatePreference: (key, value) =>
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
        })),

      updateNestedPreference: (key, nestedKey, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: {
              ...(state.preferences[key] as any),
              [nestedKey]: value,
            },
          },
        })),

      setCurrentTerminal: (terminal) =>
        set((state) => ({
          currentTerminal: { ...state.currentTerminal, ...terminal },
        })),

      resetPreferences: () =>
        set({
          preferences: defaultPreferences,
        }),
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        preferences: state.preferences,
        currentTerminal: state.currentTerminal,
      }),
    }
  )
);

// Selectors for common use cases
export const useTheme = () => useSettingsStore((state) => state.preferences.theme);
export const useLanguage = () => useSettingsStore((state) => state.preferences.language);
export const useCurrentTerminal = () => useSettingsStore((state) => state.currentTerminal);
export const usePreferences = () => useSettingsStore((state) => state.preferences);