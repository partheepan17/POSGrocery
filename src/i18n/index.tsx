import React, { createContext, useContext, ReactNode } from 'react';
import { Language } from '@/types';

export interface Translation {
  // Navigation
  nav: {
    sales: string;
    products: string;
    pricing: string;
    suppliers: string;
    customers: string;
    discounts: string;
    inventory: string;
    reports: string;
    settings: string;
    backups: string;
  };
  
  // Common actions
  actions: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    print: string;
    close: string;
    confirm: string;
    yes: string;
    no: string;
  };
  
  // Currency and formatting
  currency: {
    symbol: string;
    code: string;
    format: (amount: number) => string;
  };
  
  // Date formatting
  date: {
    format: string;
    timeFormat: string;
    formatDate: (date: Date) => string;
    formatTime: (date: Date) => string;
  };
  
  // Messages
  messages: {
    loading: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    noData: string;
    confirmDelete: string;
    unsavedChanges: string;
  };
}

export const translations: Record<Language, Translation> = {
  en: {
    nav: {
      sales: 'Sales',
      products: 'Products',
      pricing: 'Price Management',
      suppliers: 'Suppliers',
      customers: 'Customers',
      discounts: 'Discounts',
      inventory: 'Inventory',
      reports: 'Reports',
      settings: 'Settings',
      backups: 'Backups',
    },
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      print: 'Print',
      close: 'Close',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
    },
    currency: {
      symbol: 'රු',
      code: 'LKR',
      format: (amount: number) => `රු ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    },
    date: {
      format: 'MM/DD/YYYY',
      timeFormat: 'HH:mm:ss',
      formatDate: (date: Date) => date.toLocaleDateString('en-LK'),
      formatTime: (date: Date) => date.toLocaleTimeString('en-LK'),
    },
    messages: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      noData: 'No data available',
      confirmDelete: 'Are you sure you want to delete this item?',
      unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
    },
  },
  
  si: {
    nav: {
      sales: 'විකිණීම්',
      products: 'නිෂ්පාදන',
      pricing: 'මිල නියම කිරීම',
      suppliers: 'සපයන්නන්',
      customers: 'පාරිභෝගිකයින්',
      discounts: 'වට්ටම්',
      inventory: 'ඉඩම් ගණන්',
      reports: 'වාර්තා',
      settings: 'සැකසුම්',
      backups: 'උපස්ථය',
    },
    actions: {
      save: 'සුරකින්න',
      cancel: 'අවලංගු කරන්න',
      delete: 'මකන්න',
      edit: 'සංස්කරණය',
      add: 'එකතු කරන්න',
      search: 'සොයන්න',
      filter: 'පෙරණය',
      export: 'නිර්යාත කරන්න',
      import: 'ආනයන කරන්න',
      print: 'මුද්රණය',
      close: 'වසන්න',
      confirm: 'තහවුරු කරන්න',
      yes: 'ඔව්',
      no: 'නැහැ',
    },
    currency: {
      symbol: 'රු',
      code: 'LKR',
      format: (amount: number) => `රු ${amount.toLocaleString('si-LK', { minimumFractionDigits: 2 })}`,
    },
    date: {
      format: 'DD/MM/YYYY',
      timeFormat: 'HH:mm:ss',
      formatDate: (date: Date) => date.toLocaleDateString('si-LK'),
      formatTime: (date: Date) => date.toLocaleTimeString('si-LK'),
    },
    messages: {
      loading: 'පූරණය වෙමින්...',
      error: 'දෝෂයක් සිදු විය',
      success: 'සාර්ථකයි',
      warning: 'අවවාදය',
      info: 'තොරතුරු',
      noData: 'දත්ත නොමැත',
      confirmDelete: 'මෙම අයිතමය මකා දැමීමට ඔබට විශ්වාසද?',
      unsavedChanges: 'ඔබට සුරකින ලද වෙනස්කම් ඇත. ඉදිරියට යාමට ඔබට විශ්වාසද?',
    },
  },
  
  ta: {
    nav: {
      sales: 'விற்பனை',
      products: 'தயாரிப்புகள்',
      pricing: 'விலை மேலாண்மை',
      suppliers: 'வழங்குநர்கள்',
      customers: 'வாடிக்கையாளர்கள்',
      discounts: 'தள்ளுபடிகள்',
      inventory: 'பொருட்கள்',
      reports: 'அறிக்கைகள்',
      settings: 'அமைப்புகள்',
      backups: 'காப்புப்பிரதிகள்',
    },
    actions: {
      save: 'சேமி',
      cancel: 'ரத்து செய்',
      delete: 'நீக்கு',
      edit: 'திருத்து',
      add: 'சேர்',
      search: 'தேடு',
      filter: 'வடிகட்டு',
      export: 'ஏற்றுமதி',
      import: 'இறக்குமதி',
      print: 'அச்சிடு',
      close: 'மூடு',
      confirm: 'உறுதிப்படுத்து',
      yes: 'ஆம்',
      no: 'இல்லை',
    },
    currency: {
      symbol: 'රු',
      code: 'LKR',
      format: (amount: number) => `රු ${amount.toLocaleString('ta-LK', { minimumFractionDigits: 2 })}`,
    },
    date: {
      format: 'DD/MM/YYYY',
      timeFormat: 'HH:mm:ss',
      formatDate: (date: Date) => date.toLocaleDateString('ta-LK'),
      formatTime: (date: Date) => date.toLocaleTimeString('ta-LK'),
    },
    messages: {
      loading: 'ஏற்றுகிறது...',
      error: 'பிழை ஏற்பட்டது',
      success: 'வெற்றி',
      warning: 'எச்சரிக்கை',
      info: 'தகவல்',
      noData: 'தரவு இல்லை',
      confirmDelete: 'இந்த உருப்படியை நீக்க விரும்புகிறீர்களா?',
      unsavedChanges: 'நீங்கள் சேமிக்கப்படாத மாற்றங்கள் உள்ளன. தொடர விரும்புகிறீர்களா?',
    },
  },
};

export function useTranslation(language: Language = 'en'): Translation {
  return translations[language];
}

export function formatCurrency(amount: number, language: Language = 'en'): string {
  return translations[language].currency.format(amount);
}

export function formatDate(date: Date, language: Language = 'en'): string {
  return translations[language].date.formatDate(date);
}

export function formatTime(date: Date, language: Language = 'en'): string {
  return translations[language].date.formatTime(date);
}

// I18n Context
interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translation;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// I18n Provider Component
interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function I18nProvider({ children, defaultLanguage = 'en' }: I18nProviderProps) {
  const [language, setLanguage] = React.useState<Language>(defaultLanguage);
  const t = useTranslation(language);

  const contextValue: I18nContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook to use I18n context
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
