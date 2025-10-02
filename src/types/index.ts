export interface Product {
  id: string;
  name: string;
  nameSinhala?: string;
  nameTamil?: string;
  barcode?: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  customerId?: string;
  customer?: Customer;
  paymentMethod: 'cash' | 'card' | 'mobile';
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceTier {
  id: string;
  name: string;
  minQuantity: number;
  maxQuantity?: number;
  discountPercentage: number;
  isActive: boolean;
}

export interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minAmount?: number;
  maxAmount?: number;
  isActive: boolean;
  validFrom: Date;
  validTo: Date;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  product: Product;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Report {
  id: string;
  name: string;
  type: 'sales' | 'inventory' | 'profit' | 'custom';
  filters: Record<string, any>;
  data: any[];
  generatedAt: Date;
  generatedBy: string;
}

export interface Backup {
  id: string;
  name: string;
  type: 'full' | 'incremental';
  size: number;
  createdAt: Date;
  status: 'pending' | 'completed' | 'failed';
  url?: string;
}

export interface AppSettings {
  // Store Info
  storeInfo: {
    name: string;
    address: string;
    taxId: string;
    logoUrl?: string;
    defaultReceiptLanguage: 'EN' | 'SI' | 'TA';
  };
  
  // Device Settings
  devices: {
    receiptPaper: '58mm' | '80mm' | 'A4';
    cashDrawerOpenOnCash: boolean;
    barcodeInputMode: 'keyboard_wedge';
    scaleMode: 'weight_embedded' | 'price_embedded' | 'off';
  };
  
  // Language & Formatting
  languageFormatting: {
    displayLanguage: 'EN' | 'SI' | 'TA';
    roundingMode: 'NEAREST_1' | 'NEAREST_0_50' | 'NEAREST_0_10';
    kgDecimals: number; // 2-3
  };
  
  // Pricing Policies
  pricingPolicies: {
    missingPricePolicy: 'warn_fallback' | 'block_manager';
    requiredTiers: ('retail' | 'wholesale' | 'credit' | 'other')[];
    autoCreateCategories: boolean;
    autoCreateSuppliers: boolean;
  };
  
  // Receipt Options
  receiptOptions: {
    footerTextEN: string;
    footerTextSI: string;
    footerTextTA: string;
    showQRCode: boolean;
    showBarcode: boolean;
    showTierBadge: boolean;
  };
  
  // Backup Settings
  backupSettings: {
    provider: 'google_drive' | 'onedrive' | 's3' | 'backblaze' | 'local';
    schedule: {
      dailyTime: string; // HH:MM format
      onSettingsChange: boolean;
    };
    retention: {
      keepDaily: number; // default 30
      keepConfigChange: number; // default 5
    };
    credentials?: {
      [key: string]: string;
    };
  };
  
  // Label Settings
  labelSettings?: LabelSettings;
  
  // Legacy settings (for backward compatibility)
  currency: string;
  currencySymbol: string;
  roundingMode: 'nearest' | 'up' | 'down';
  roundingValue: number;
  taxRate: number;
  receiptLanguage: 'en' | 'si' | 'ta';
  theme: 'light' | 'dark' | 'auto';
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  barcodeScanner: boolean;
  scaleIntegration: boolean;
  printerSettings: {
    enabled: boolean;
    name?: string;
    copies: number;
  };
  receiptSettings: {
    defaultPaper: '58mm' | '80mm' | 'A4';
    drawerOnCash: boolean;
    showQR: boolean;
    showBarcode: boolean;
    footerTextEN: string;
    footerTextSI: string;
    footerTextTA: string;
    decimalPlacesKg: number;
  };
  pricingSettings: {
    missingPricePolicy: 'warn' | 'block';
    requiredTiers: ('retail' | 'wholesale' | 'credit' | 'other')[];
    autoCreateCategories: boolean;
    autoCreateSuppliers: boolean;
  };
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: string;
  description: string;
}

export type Theme = 'light' | 'dark' | 'auto';
export type Language = 'en' | 'si' | 'ta';
export type RoundingMode = 'nearest' | 'up' | 'down';
export type PaymentMethod = 'cash' | 'card' | 'mobile';
export type SaleStatus = 'pending' | 'completed' | 'cancelled';
export type InventoryTransactionType = 'in' | 'out' | 'adjustment';
export type ReportType = 'sales' | 'inventory' | 'profit' | 'custom';
export type BackupType = 'full' | 'incremental';
export type BackupStatus = 'pending' | 'completed' | 'failed';

// Label System Types
export interface LabelPreset {
  id: string;
  name: string; // e.g., "50x30 Product", "Shelf 70x38"
  type: 'product' | 'shelf';
  paper: 'THERMAL' | 'A4';
  size: { 
    width_mm: number; 
    height_mm: number; 
  };
  a4?: { 
    rows: number; 
    cols: number; 
    page_width_mm: number; 
    page_height_mm: number; 
    margin_mm: number; 
    gutter_mm: number; 
  };
  barcode: { 
    symbology: 'EAN13' | 'CODE128'; 
    source: 'barcode' | 'sku'; 
    show_text: boolean; 
  };
  fields: {
    line1: 'name_en' | 'name_si' | 'name_ta' | 'custom';
    line2?: 'sku' | 'category' | 'custom';
    price: { 
      enabled: boolean; 
      source: 'retail' | 'wholesale' | 'credit' | 'other'; 
      currency: 'LKR'; 
      show_label: boolean; 
    };
    weight_hint?: boolean; // show "per kg" if unit=kg
  };
  style: {
    font_scale: number; // 0.8–1.4
    bold_name: boolean;
    align: 'left' | 'center' | 'right';
    show_store_logo: boolean;
  };
  defaults: {
    qty: number;
    language: 'EN' | 'SI' | 'TA';
  };
}

export interface LabelItem {
  id: string;
  sku: string;
  barcode?: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  category?: string;
  unit: string;
  price_retail: number;
  price_wholesale: number;
  price_credit: number;
  price_other: number;
  qty: number;
  price_tier: 'retail' | 'wholesale' | 'credit' | 'other';
  language: 'EN' | 'SI' | 'TA';
  custom_line1?: string;
  custom_line2?: string;
}

export interface LabelJob {
  id: string;
  timestamp: Date;
  preset_name: string;
  source: 'products' | 'grn' | 'csv' | 'reprint';
  items_count: number;
  printed_by?: string;
  terminal?: string;
  items?: LabelItem[];
}

export interface LabelBatch {
  items: LabelItem[];
  preset: LabelPreset;
}

export interface LabelSettings {
  defaultPresetId: string | null;
  defaultDPI: 203 | 300;
  thermalPrinterName: string;
  a4Default: { 
    rows: number; 
    cols: number; 
    margin_mm: number; 
    gutter_mm: number; 
  };
}

export type LabelSource = 'products' | 'grn' | 'csv';
export type BarcodeSymbology = 'EAN13' | 'CODE128';
export type LabelPaperType = 'THERMAL' | 'A4';
export type LabelType = 'product' | 'shelf';
