export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: string;
  category_id?: string;
  is_scale_item: boolean;
  tax_code?: string;
  price_retail: number;
  price_wholesale: number;
  price_credit: number;
  price_other: number;
  cost?: number;
  reorder_level?: number;
  preferred_supplier_id?: string;
  is_active: boolean;
  created_at: Date;
  // Legacy fields for compatibility
  name?: string;
  nameSinhala?: string;
  nameTamil?: string;
  category?: string;
  price?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
  supplier_name: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  tax_id?: string;
  active: boolean;
  created_at: Date;
  // Legacy fields for compatibility
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  city?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
  
  // Refund Settings
  refund: {
    managerPinThreshold: number; // default 5000
    defaultReason: 'DAMAGED' | 'EXPIRED' | 'WRONG_ITEM' | 'CUSTOMER_CHANGE' | 'OTHER';
    requireManagerApproval: boolean;
    autoRestoreInventory: boolean;
  };
  
  // GRN Settings
  grnSettings: {
    autoNumberPrefix: string; // default 'GRN-'
    autoUpdateCostPolicy: 'none' | 'average' | 'latest'; // default 'latest'
    expiryReminderDays: number; // default 14
    defaultTaxPercent: number; // default 0
  };
  
  // Shift Settings
  shiftSettings: {
    requireShiftForSales: boolean; // If true, POS blocks finalize unless a shift is open
    allowMultipleOpenPerTerminal: boolean;
    cashDrawerPulseOnOpen: boolean;
    sessionTimeoutMinutes: number; // 8h shift hint (no auto-close, only warning)
    xReportFooterEN: string;
    zReportFooterEN: string;
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
    // New fields for extended functionality
    languageMode?: 'preset' | 'per_item'; // new
    showPackedDate?: boolean;
    showExpiryDate?: boolean;
    showMRP?: boolean;
    showBatch?: boolean;
    dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
    mrpLabel?: string;     // default 'MRP'
    batchLabel?: string;   // default 'Batch'
    packedLabel?: string;  // default 'Packed'
    expiryLabel?: string;  // default 'Expiry'
  };
  style: {
    font_scale: number; // 0.8–1.4
    bold_name: boolean;
    align: 'left' | 'center' | 'right';
    show_store_logo: boolean;
    sectionOrder?: Array<'name' | 'barcode' | 'price' | 'mrp' | 'batch' | 'dates'>; // stacking
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
  language?: 'EN' | 'SI' | 'TA'; // overrides preset default
  custom_line1?: string;
  custom_line2?: string;
  // New fields for extended functionality
  packedDate?: string | null;  // ISO yyyy-mm-dd
  expiryDate?: string | null;  // ISO yyyy-mm-dd
  mrp?: number | null;         // printed "MRP"
  batchNo?: string | null;
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
  defaultDateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
}

export type LabelSource = 'products' | 'grn' | 'csv';
export type BarcodeSymbology = 'EAN13' | 'CODE128';
export type LabelPaperType = 'THERMAL' | 'A4';
export type LabelType = 'product' | 'shelf';

// Returns & Refunds Types
export type ReturnReason = 'DAMAGED' | 'EXPIRED' | 'WRONG_ITEM' | 'CUSTOMER_CHANGE' | 'OTHER';

export interface Return {
  id?: number;
  sale_id: number;
  datetime?: string;
  cashier_id?: number;
  manager_id?: number | null;
  refund_cash: number;
  refund_card: number;
  refund_wallet: number;
  refund_store_credit: number;
  reason_summary?: string | null;
  language: 'EN' | 'SI' | 'TA';
  terminal_name?: string;
}

export interface ReturnLine {
  id?: number;
  return_id?: number;
  sale_line_id: number;
  product_id: number;
  qty: number;
  unit_price: number;
  line_refund: number;
  reason_code: ReturnReason;
}

// Extended types for returns processing
export interface SaleWithLines {
  id: number;
  datetime: string;
  cashier_id?: number;
  customer_id?: number;
  price_tier: string;
  gross: number;
  discount: number;
  tax: number;
  net: number;
  pay_cash: number;
  pay_card: number;
  pay_wallet: number;
  language: 'EN' | 'SI' | 'TA';
  terminal_name?: string;
  lines: Array<{
    id: number;
    product_id: number;
    qty: number;
    unit_price: number;
    line_discount: number;
    tax: number;
    total: number;
    product_name?: string;
    product_name_si?: string;
    product_name_ta?: string;
  }>;
}

export interface ReturnValidationResult {
  ok: boolean;
  errors?: string[];
}

// GRN (Goods Received Note) Types
export type GRNStatus = 'OPEN' | 'POSTED' | 'VOID';

export interface GRN {
  id?: number;
  supplier_id: number;
  grn_no?: string;
  datetime?: string;
  received_by?: number | null;
  note?: string;
  status?: GRNStatus;
  subtotal: number;
  tax: number;
  other: number;
  total: number;
}

export interface GRNLine {
  id?: number;
  grn_id?: number;
  product_id: number;
  qty: number;
  unit_cost: number;
  mrp?: number | null;
  batch_no?: string | null;
  expiry_date?: string | null; // ISO yyyy-mm-dd
  line_total: number;
}

// Extended types for GRN processing
export interface GRNWithDetails extends GRN {
  supplier?: Supplier;
  lines?: Array<GRNLine & { product?: Product }>;
}

export interface GRNLabelItem {
  sku: string;
  barcode?: string;
  name: string;
  price?: number;
  mrp?: number;
  qty: number;
  batch_no?: string;
  expiry_date?: string;
}

// Shift Management Types
export type ShiftStatus = 'OPEN' | 'CLOSED' | 'VOID';

export interface Shift {
  id?: number;
  terminal_name: string;
  terminal?: string; // Legacy compatibility
  cashier_id: number;
  opened_at?: string;
  closed_at?: string | null;
  opening_cash: number;
  declared_cash?: number | null;
  variance_cash?: number | null;
  note?: string | null;
  status?: ShiftStatus;
}

export type ShiftMovementType = 'CASH_IN' | 'CASH_OUT' | 'DROP' | 'PICKUP' | 'PETTY';

export interface CashEvent {
  type: ShiftMovementType;
  amount: number;
  reason?: string;
  datetime: string;
}

export interface XReport {
  shiftId: number;
  terminal: string;
  cashierId: number;
  openedAt: string;
  reportTime: string;
  generated_at: string;
  session: {
    id: number;
    cashier_name: string;
    terminal: string;
    started_at: string;
    opening_float: number;
  };
  totals: {
    invoices: number;
    gross: number;
    discount: number;
    tax: number;
    net: number;
    cash: number;
    card: number;
    wallet: number;
    cash_in: number;
    cash_out: number;
    expected_cash: number;
  };
  cashEvents: CashEvent[];
}

export interface ZReport {
  shiftId: number;
  terminal: string;
  cashierId: number;
  openedAt: string;
  closedAt: string;
  ended_at: string;
  closed_by_name?: string;
  session: {
    id: number;
    cashier_name: string;
    terminal: string;
    started_at: string;
    opening_float: number;
  };
  totals: {
    invoices: number;
    gross: number;
    discount: number;
    tax: number;
    net: number;
    cash: number;
    card: number;
    wallet: number;
    cash_in: number;
    cash_out: number;
    expected_cash: number;
  };
  counted_cash: number;
  variance: number;
  cashEvents: CashEvent[];
}

export interface ShiftMovement {
  id?: number;
  shift_id: number;
  datetime?: string;
  type: ShiftMovementType;
  amount: number;
  reason?: string | null;
}

export interface ShiftSummary {
  shift: Shift;
  sales: {
    invoices: number;
    gross: number;
    discount: number;
    tax: number;
    net: number;
  };
  payments: {
    cash: number;
    card: number;
    wallet: number;
    other?: number;
  };
  cashDrawer: {
    opening: number;
    cashIn: number;
    cashOut: number;
    drops: number;
    pickups: number;
    petty: number;
    expectedCash: number;  // opening + cash + cashIn - cashOut - drops - petty
    declaredCash?: number | null;
    variance?: number | null;
  };
}

// Company Profile and License Types
export interface CompanyProfile {
  id: number;
  name: string;
  address: string;
  taxId?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  updatedAt: Date;
}

export interface LicenseInfo {
  id: number;
  productName: string;
  licensee: string;
  fullName: string;
  locked: boolean;
  issuedAt: Date;
}

export interface LicenseAdmin {
  id: number;
  name: string;
  role: 'LICENSE_ADMIN';
  pin: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}
