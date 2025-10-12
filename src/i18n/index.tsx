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
    returns: string;
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
  
  // GRN
  grn: {
    title: string;
    newGrn: string;
    editGrn: string;
    grnNo: string;
    supplier: string;
    date: string;
    status: string;
    note: string;
    addItem: string;
    searchProduct: string;
    qty: string;
    unitCost: string;
    mrp: string;
    batchNo: string;
    expiryDate: string;
    lineTotal: string;
    subtotal: string;
    tax: string;
    other: string;
    total: string;
    saveDraft: string;
    postGrn: string;
    printGrn: string;
    printLabels: string;
    costUpdatePolicy: string;
    labelLanguage: string;
    open: string;
    posted: string;
    void: string;
  };

  // Returns & Refunds
  returns: {
    title: string;
    lookupSale: string;
    receiptNumber: string;
    findSale: string;
    saleDetails: string;
    returnItems: string;
    refundSummary: string;
    totalRefund: string;
    processReturn: string;
    printReceipt: string;
    clear: string;
    returnReceipt: string;
    refund: string;
    reason: string;
    alreadyReturned: string;
    returnQty: string;
    managerPin: string;
    managerPinRequired: string;
    enterManagerPin: string;
    reasonCodes: {
      damaged: string;
      expired: string;
      wrongItem: string;
      customerChange: string;
      other: string;
    };
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
  
  // Labels
  labels: {
    mrp: string;
    batch: string;
    packed: string;
    expiry: string;
    language: string;
    packedDate: string;
    expiryDate: string;
    batchNumber: string;
    maximumRetailPrice: string;
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
      returns: 'Returns',
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
    grn: {
      title: 'GRN',
      newGrn: 'New GRN',
      editGrn: 'Edit GRN',
      grnNo: 'GRN No',
      supplier: 'Supplier',
      date: 'Date',
      status: 'Status',
      note: 'Note',
      addItem: 'Add Item',
      searchProduct: 'Search Product',
      qty: 'Qty',
      unitCost: 'Unit Cost',
      mrp: 'MRP',
      batchNo: 'Batch No',
      expiryDate: 'Expiry Date',
      lineTotal: 'Line Total',
      subtotal: 'Subtotal',
      tax: 'Tax',
      other: 'Other',
      total: 'Total',
      saveDraft: 'Save Draft',
      postGrn: 'Post GRN',
      printGrn: 'Print GRN',
      printLabels: 'Print Labels',
      costUpdatePolicy: 'Cost Update Policy',
      labelLanguage: 'Label Language',
      open: 'Open',
      posted: 'Posted',
      void: 'Void',
    },
    returns: {
      title: 'Returns & Refunds',
      lookupSale: 'Lookup Sale',
      receiptNumber: 'Receipt No. or Scan Receipt Barcode',
      findSale: 'Find Sale',
      saleDetails: 'Sale Details',
      returnItems: 'Return Items',
      refundSummary: 'Refund Summary',
      totalRefund: 'Total Refund',
      processReturn: 'Process Return',
      printReceipt: 'Print Return Receipt',
      clear: 'Clear',
      returnReceipt: 'Return Receipt',
      refund: 'Refund',
      reason: 'Reason',
      alreadyReturned: 'Already Returned',
      returnQty: 'Return Qty',
      managerPin: 'Manager PIN',
      managerPinRequired: 'Manager PIN Required',
      enterManagerPin: 'Enter Manager PIN',
      reasonCodes: {
        damaged: 'Damaged',
        expired: 'Expired',
        wrongItem: 'Wrong Item',
        customerChange: 'Customer Change',
        other: 'Other',
      },
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
    labels: {
      mrp: 'MRP',
      batch: 'Batch',
      packed: 'Packed',
      expiry: 'Expiry',
      language: 'Language',
      packedDate: 'Packed Date',
      expiryDate: 'Expiry Date',
      batchNumber: 'Batch Number',
      maximumRetailPrice: 'Maximum Retail Price',
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
      returns: 'ආපසු ලබාදීම්',
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
    grn: {
      title: 'භාණ්ඩ ලැබීම් සටහන',
      newGrn: 'නව GRN',
      editGrn: 'GRN සංස්කරණය',
      grnNo: 'GRN අංකය',
      supplier: 'භාණ්ඩ සපයන්නා',
      date: 'දිනය',
      status: 'තත්වය',
      note: 'සටහන',
      addItem: 'අයිතමයක් එකතු කරන්න',
      searchProduct: 'නිෂ්පාදනය සොයන්න',
      qty: 'ප්‍රමාණය',
      unitCost: 'ඒකක පිරිවැය',
      mrp: 'MRP',
      batchNo: 'කණ්ඩායම් අංකය',
      expiryDate: 'කල් ඉකුත් දිනය',
      lineTotal: 'පේළි මුළු',
      subtotal: 'උප මුළු',
      tax: 'බදු',
      other: 'වෙනත්',
      total: 'මුළු',
      saveDraft: 'කටුලේඛය සුරකින්න',
      postGrn: 'GRN පළ කරන්න',
      printGrn: 'GRN මුද්‍රණය',
      printLabels: 'ලේබල් මුද්‍රණය',
      costUpdatePolicy: 'පිරිවැය යාවත්කාලීන ප්‍රතිපත්තිය',
      labelLanguage: 'ලේබල් භාෂාව',
      open: 'විවෘත',
      posted: 'පළ කරන ලද',
      void: 'අවලංගු',
    },
    returns: {
      title: 'ආපසු ලබාදීම් සහ ආපසු ගෙවීම්',
      lookupSale: 'විකිණීම සොයන්න',
      receiptNumber: 'රිසිට් අංකය හෝ රිසිට් බාර්කෝඩ් ස්කෑන් කරන්න',
      findSale: 'විකිණීම සොයන්න',
      saleDetails: 'විකිණීම් විස්තර',
      returnItems: 'ආපසු ලබාදෙන භාණ්ඩ',
      refundSummary: 'ආපසු ගෙවීම් සාරාංශය',
      totalRefund: 'මුළු ආපසු ගෙවීම',
      processReturn: 'ආපසු ලබාදීම සකසන්න',
      printReceipt: 'ආපසු ලබාදීමේ රිසිට් මුද්රණය',
      clear: 'මකන්න',
      returnReceipt: 'ආපසු ලබාදීමේ රිසිට්',
      refund: 'ආපසු ගෙවීම',
      reason: 'හේතුව',
      alreadyReturned: 'දැනටමත් ආපසු ලබාදී ඇත',
      returnQty: 'ආපසු ලබාදෙන ප්‍රමාණය',
      managerPin: 'කළමනාකරුගේ PIN',
      managerPinRequired: 'කළමනාකරුගේ PIN අවශ්‍යයි',
      enterManagerPin: 'කළමනාකරුගේ PIN ඇතුළත් කරන්න',
      reasonCodes: {
        damaged: 'විනාශ වූ',
        expired: 'කල් ඉකුත් වූ',
        wrongItem: 'වැරදි භාණ්ඩය',
        customerChange: 'පාරිභෝගික වෙනස්කම්',
        other: 'වෙනත්',
      },
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
    labels: {
      mrp: 'උපරිම මිල',
      batch: 'කණ්ඩායම',
      packed: 'ඇසුරුම්',
      expiry: 'කල් ඉකුත්',
      language: 'භාෂාව',
      packedDate: 'ඇසුරුම් දිනය',
      expiryDate: 'කල් ඉකුත් දිනය',
      batchNumber: 'කණ්ඩායම් අංකය',
      maximumRetailPrice: 'උපරිම සිල්ලර මිල',
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
      returns: 'திரும்ப பெறுதல்',
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
    grn: {
      title: 'பொருட்கள் பெறுதல் குறிப்பு',
      newGrn: 'புதிய GRN',
      editGrn: 'GRN திருத்தம்',
      grnNo: 'GRN எண்',
      supplier: 'வழங்குநர்',
      date: 'தேதி',
      status: 'நிலை',
      note: 'குறிப்பு',
      addItem: 'உருப்படியைச் சேர்க்கவும்',
      searchProduct: 'தயாரிப்பைத் தேடுங்கள்',
      qty: 'அளவு',
      unitCost: 'அலகு செலவு',
      mrp: 'MRP',
      batchNo: 'தொகுதி எண்',
      expiryDate: 'காலாவதி தேதி',
      lineTotal: 'வரி மொத்தம்',
      subtotal: 'துணை மொத்தம்',
      tax: 'வரி',
      other: 'மற்றவை',
      total: 'மொத்தம்',
      saveDraft: 'வரைவைச் சேமிக்கவும்',
      postGrn: 'GRN இடுகையிடவும்',
      printGrn: 'GRN அச்சிடவும்',
      printLabels: 'லேபிள்களை அச்சிடவும்',
      costUpdatePolicy: 'செலவு புதுப்பிப்பு கொள்கை',
      labelLanguage: 'லேபிள் மொழி',
      open: 'திறந்த',
      posted: 'இடுகையிடப்பட்டது',
      void: 'வெற்று',
    },
    returns: {
      title: 'திரும்ப பெறுதல் மற்றும் பணத்திரும்பம்',
      lookupSale: 'விற்பனையைத் தேடு',
      receiptNumber: 'ரசீது எண் அல்லது ரசீது பார்கோடை ஸ்கேன் செய்யுங்கள்',
      findSale: 'விற்பனையைக் கண்டறி',
      saleDetails: 'விற்பனை விவரங்கள்',
      returnItems: 'திரும்ப பெறப்படும் பொருட்கள்',
      refundSummary: 'பணத்திரும்ப சுருக்கம்',
      totalRefund: 'மொத்த பணத்திரும்பம்',
      processReturn: 'திரும்ப பெறுதலைச் செயலாக்கு',
      printReceipt: 'திரும்ப பெறுதல் ரசீதை அச்சிடு',
      clear: 'அழி',
      returnReceipt: 'திரும்ப பெறுதல் ரசீது',
      refund: 'பணத்திரும்பம்',
      reason: 'காரணம்',
      alreadyReturned: 'ஏற்கனவே திரும்பப் பெறப்பட்டது',
      returnQty: 'திரும்பப் பெறும் அளவு',
      managerPin: 'மேலாளர் PIN',
      managerPinRequired: 'மேலாளர் PIN தேவை',
      enterManagerPin: 'மேலாளர் PIN ஐ உள்ளிடவும்',
      reasonCodes: {
        damaged: 'சேதமடைந்த',
        expired: 'காலாவதியான',
        wrongItem: 'தவறான பொருள்',
        customerChange: 'வாடிக்கையாளர் மாற்றம்',
        other: 'மற்றவை',
      },
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
    labels: {
      mrp: 'அதிகபட்ச விலை',
      batch: 'தொகுதி',
      packed: 'பேக்கிங்',
      expiry: 'காலாவதி',
      language: 'மொழி',
      packedDate: 'பேக்கிங் தேதி',
      expiryDate: 'காலாவதி தேதி',
      batchNumber: 'தொகுதி எண்',
      maximumRetailPrice: 'அதிகபட்ச சில்லறை விலை',
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

const STORAGE_KEY = 'app-language';

export function I18nProvider({ children, defaultLanguage = 'si' }: I18nProviderProps) {
  const [language, setLanguage] = React.useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      return (saved || defaultLanguage) as Language;
    } catch {
      return defaultLanguage;
    }
  });
  const t = useTranslation(language);

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, language); } catch {}
  }, [language]);

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
