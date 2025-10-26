/**
 * Shared Type Definitions
 * Centralized type definitions for the entire application
 */

// Base entity interface
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// Product types
export interface Product extends BaseEntity {
  sku: string;
  barcode?: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  name?: string; // Generic name field for backward compatibility
  unit?: 'pc' | 'kg'; // Make optional for backward compatibility
  category_id?: number;
  supplier_id?: number; // For supplier relationship
  is_scale_item?: boolean; // Make optional for backward compatibility
  tax_code?: string;
  price_retail: number;
  price_wholesale?: number;
  price_credit?: number;
  price_other?: number;
  price?: number; // Generic price field for backward compatibility
  cost: number;
  reorder_level?: number;
  preferred_supplier_id?: number;
  is_active: boolean;
}

export interface ProductWithRelations extends Product {
  category_name?: string;
  supplier_name?: string;
}

export interface ProductFilters {
  search?: string;
  category_id?: number;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Customer types
export interface Customer extends BaseEntity {
  customer_name: string;
  customer_phone?: string;
  phone?: string; // Alternative phone field
  customer_email?: string;
  address?: string;
  city?: string;
  customer_type: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  credit_limit?: number;
  default_price_tier?: string;
  notes?: string;
  note?: string; // Alternative field name for backward compatibility
  active: boolean;
  special_pricing_on?: boolean;
  special_pricing_profile_id?: number;
}

export interface CustomerFilters {
  search?: string;
  customer_type?: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  active?: boolean;
}

// Category types
export interface Category extends BaseEntity {
  name: string;
  description?: string;
  is_active: boolean;
}

// Supplier types
export interface Supplier {
  id: number;
  created_at: string;
  updated_at?: string; // Make optional for test compatibility
  supplier_name: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  tax_id?: string;
  active?: boolean; // Make optional for backward compatibility
  is_active?: boolean; // Alternative field name for backward compatibility
}

// Sale types
export interface Sale {
  id: number | string; // Allow both number and string for store compatibility
  created_at: string;
  createdAt?: Date; // Alternative field name for store compatibility
  updated_at: string;
  datetime?: string; // Make optional for backward compatibility
  cashier_id?: number; // Make optional for backward compatibility
  customer_id?: number;
  customerId?: number; // Alternative field name for backward compatibility
  price_tier?: 'Retail' | 'Wholesale' | 'Credit' | 'Other'; // Make optional for backward compatibility
  gross?: number; // Make optional for backward compatibility
  discount?: number; // Make optional for backward compatibility
  tax?: number; // Make optional for backward compatibility
  net?: number; // Make optional for backward compatibility
  subtotal?: number; // Alternative field name
  total?: number; // Alternative field name
  lines?: SaleLine[]; // Add lines property
  pay_cash?: number; // Make optional for backward compatibility
  pay_card?: number; // Make optional for backward compatibility
  pay_wallet?: number; // Make optional for backward compatibility
  language?: 'EN' | 'SI' | 'TA'; // Make optional for backward compatibility
  terminal_name?: string;
  items?: SaleItem[]; // For store compatibility
  customer?: Customer; // For store compatibility
  paymentMethod?: 'mobile' | 'cash' | 'card'; // For store compatibility with proper type
  status?: string; // For store compatibility
  updatedAt?: string | Date; // Alternative field name for backward compatibility
  note?: string; // For sale notes
}

export interface SaleLine extends BaseEntity {
  sale_id: number;
  product_id: number;
  product_name?: string; // For backward compatibility
  product_name_si?: string; // Sinhala product name
  product_name_ta?: string; // Tamil product name
  qty: number;
  unit_price: number;
  line_discount: number;
  tax: number;
  total: number;
}

export interface SaleRequest {
  customer_id?: number;
  price_tier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  cashier_id: number;
  terminal_name?: string;
  language?: 'EN' | 'SI' | 'TA';
}

export interface SaleLineRequest {
  product_id: number;
  qty: number;
  line_discount?: number;
}

// Discount types
export type DiscountLevel = 'PRODUCT' | 'GROUP' | 'SUPPLIER';
export type DiscountChannel = 'RETAIL' | 'WHOLESALE' | 'BOTH';
export type DiscountStackMode = 'EXCLUSIVE' | 'ADDITIVE';

export interface DiscountRule extends BaseEntity {
  name: string;
  level: DiscountLevel;
  target_id: number;
  type: 'PERCENT' | 'AMOUNT';
  value: number;
  channel?: DiscountChannel;
  stack_mode?: DiscountStackMode;
  apply_quantity_rule?: boolean;
  max_qty_or_weight?: number;
  active_from: string;
  active_to?: string;
  priority: number;
  reason_required?: boolean;
  active: boolean;
  description?: string;
  applies_to?: 'PRODUCT' | 'CATEGORY' | 'SUPPLIER'; // Alternative field name for backward compatibility
}

// Payment types
export interface PaymentSplit {
  pay_cash: number;
  pay_card: number;
  pay_wallet: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET' | 'CREDIT';

export interface PaymentData {
  payments: Array<{
    method: PaymentMethod;
    amount: number;
    reference?: string;
  }>;
  notes?: string;
}

// User types
export interface User extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'AUDITOR';
  active: boolean;
  pin?: string;
  is_locked?: boolean;
  lockout_expires?: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Cart types
export interface CartItem {
  id: string;
  product_id: number;
  name: string;
  sku: string;
  qty: number;
  unit_price: number;
  line_discount_type?: 'PERCENT' | 'AMOUNT';
  line_discount_value?: number;
  line_total: number;
  unit: 'pc' | 'kg';
  is_scale_item: boolean;
  retail_price: number;
  wholesale_price?: number;
  credit_price?: number;
  other_price?: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  tax: number;
  net_total: number;
}

export interface CartState {
  items: CartItem[];
  totals: CartTotals;
  priceTier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  customerId?: number;
  customerName?: string;
  manualDiscount: {
    type: 'PERCENT' | 'AMOUNT';
    value: number;
  };
}

// UI Store types
export interface UIState {
  userRole: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'AUDITOR';
  userName: string;
  terminalId: string;
  printLanguage: 'en' | 'si' | 'ta';
  updateTime: string;
}

// App Store types
export interface AppState {
  theme: 'light' | 'dark' | 'auto';
  currentUser?: User;
  currentSession?: any;
  terminal: string;
  settings: any;
}

// GRN (Goods Received Note) types
export interface GRN extends BaseEntity {
  grn_number: string;
  grn_no?: string; // Alternative field name for backward compatibility
  supplier_id: number;
  received_date: string;
  receivedDate?: string; // Alternative field name for backward compatibility
  datetime?: string; // Alternative field name for backward compatibility
  status: GRNStatus;
  total_amount: number;
  total?: number; // Alternative field name for backward compatibility
  notes?: string;
  note?: string; // Alternative field name for backward compatibility
  received_by?: number; // Make optional for test compatibility
  subtotal?: number;
  tax?: number;
  other?: number;
}

export interface GRNLine extends BaseEntity {
  grn_id: number;
  product_id: number;
  qty_ordered: number;
  qty_received: number;
  qty?: number; // Alternative field name for backward compatibility
  unit_cost: number;
  line_total: number;
  notes?: string;
  batch_no?: string; // For batch tracking
  expiry_date?: string; // For expiry tracking
  mrp?: number; // Maximum Retail Price
}

export interface GRNWithDetails extends GRN {
  supplier_name?: string;
  lines: GRNLine[];
}

export type GRNStatus = 'PENDING' | 'PARTIAL' | 'COMPLETE' | 'CANCELLED';

export interface GRNLabelItem {
  product_id: number;
  product_name: string;
  qty: number;
  unit_cost: number;
}

// Label types
export type BarcodeSymbology = 'CODE128' | 'EAN13' | 'UPC' | 'QR' | 'CODE39';

export interface LabelPreset {
  id: string;
  name: string;
  template: string;
  width: number;
  height: number;
  is_default: boolean;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  // Additional properties for label configuration
  type?: string; // Label type (e.g., 'product', 'barcode')
  paper?: string; // Paper type (e.g., 'A4', 'roll')
  size?: { 
    width: number; 
    height: number;
    width_mm?: number;
    height_mm?: number;
  }; // Size format with mm support
  a4?: { 
    rows: number; 
    cols: number; 
    margin?: number;
    page_width_mm?: number;
    page_height_mm?: number;
    margin_mm?: number;
    gutter_mm?: number;
  }; // A4-specific configuration
  barcode?: { 
    enabled: boolean; 
    type: string; 
    position: string;
    source?: string;
    symbology?: string;
    show_text?: boolean;
  }; // Barcode configuration
  fields?: Array<{
    name: string;
    enabled: boolean;
    label: string;
    source?: string;
    show_label?: boolean;
  }> | {
    languageMode?: string;
    line1?: string;
    line2?: string;
    price?: {
      enabled: boolean;
      source?: string;
      show_label?: boolean;
      currency?: string;
    };
    weight_hint?: boolean;
    showMRP?: boolean;
    mrpLabel?: string;
    showBatch?: boolean;
    batchLabel?: string;
    dateFormat?: string;
    showPackedDate?: boolean;
    packedLabel?: string;
    showExpiryDate?: boolean;
    expiryLabel?: string;
  }; // Field configuration (supports both array and object formats)
  style?: {
    font_scale?: number;
    fontSize?: number;
    fontFamily?: string;
    textAlign?: string;
    align?: string;
    show_store_logo?: boolean;
    sectionOrder?: string[];
    bold_name?: boolean;
  }; // Style configuration
}

export interface LabelItem {
  id: string;
  product_id: number;
  product_name: string;
  name_en?: string; // Alternative field name
  name_si?: string; // Sinhala name
  name_ta?: string; // Tamil name
  sku: string;
  price: number;
  price_retail?: number; // For retail price display
  price_wholesale?: number; // For wholesale price display
  price_credit?: number; // For credit price display
  price_other?: number; // For other price display
  price_tier?: string; // For price tier display
  barcode?: string;
  category?: string; // Category name
  category_name?: string;
  supplier_name?: string;
  language?: string; // For multi-language labels
  unit?: string; // For unit display
  mrp?: number | null; // Maximum Retail Price
  batchNo?: string | null; // Batch number
  expiryDate?: string | null; // Expiry date
  packedDate?: string | null; // Packed date
  qty?: number; // For quantity display
  custom_line1?: string; // Custom line 1 for additional info
  custom_line2?: string; // Custom line 2 for additional info
}

export interface LabelJob {
  id: string;
  name: string;
  source: LabelSource;
  source_id: number;
  preset_id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total_items: number;
  processed_items: number;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  timestamp?: string;
  preset_name?: string;
  items_count?: number;
  printed_by?: string;
  terminal?: string;
}

export interface LabelBatch {
  id: string;
  items: LabelItem[];
  preset: LabelPreset;
  created_at: string;
}

export type LabelSource = 'products' | 'grn' | 'csv';

// Shift types
export interface Shift extends BaseEntity {
  shift_number: string;
  cashier_id: number;
  terminal_id: string;
  terminal_name?: string; // Alternative field name for backward compatibility
  start_time: string;
  opened_at?: string; // Alternative field name for backward compatibility
  end_time?: string;
  status: ShiftStatus;
  opening_cash: number;
  closing_cash?: number;
  declared_cash?: number;
  variance_cash?: number;
  total_sales: number;
  total_transactions: number;
  closed_at?: string; // For shift closing timestamp
}

export interface ShiftMovement extends BaseEntity {
  shift_id: number;
  type: 'OPEN' | 'CLOSE' | 'CASH_IN' | 'CASH_OUT' | 'SALE' | 'REFUND' | 'DROP' | 'PICKUP' | 'PETTY';
  amount: number;
  reference?: string;
  notes?: string;
  reason?: string; // For movement reason
  created_by?: number; // Make optional for test compatibility
  datetime?: string; // Alternative field name for backward compatibility
}

export interface ShiftSummary {
  shift: Shift;
  movements: ShiftMovement[];
  cashier_name: string;
  terminal_name: string;
  sales?: any; // For sales data
  payments?: any; // For payment data
  cashDrawer?: {
    opening: number;
    cashIn: number;
    cashOut: number;
    drops: number;
    pickups: number;
    petty: number;
    expectedCash: number;
    declaredCash?: number;
    variance?: number;
  };
}

export type ShiftStatus = 'OPEN' | 'CLOSED' | 'SUSPENDED';

// Return/Refund types
export interface ReturnLine {
  id: number;
  return_id: number;
  sale_line_id: number;
  product_id: number;
  qty_returned: number;
  qty?: number; // Alternative field name for backward compatibility
  unit_price: number;
  line_refund?: number; // Line refund amount
  reason_code?: string; // Alternative field name for backward compatibility
  reason: ReturnReason;
  notes?: string;
}

export interface SaleWithLines extends Sale {
  lines: SaleLine[];
  customer?: Customer;
  created_at: string;
  updated_at: string;
}

export interface ReturnValidationResult {
  valid: boolean;
  ok?: boolean; // Alternative field name for backward compatibility
  errors: string[];
  warnings: string[];
}

export type ReturnReason = 'DEFECTIVE' | 'WRONG_ITEM' | 'CUSTOMER_REQUEST' | 'EXPIRED' | 'DAMAGED' | 'OTHER' | 'CUSTOMER_CHANGE';

// Report types
export interface XReport {
  shift_id: number;
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
  shift_id: number;
  generated_at: string;
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

export interface CashEvent {
  id: number;
  shift_id: number;
  type: 'OPEN' | 'CLOSE' | 'CASH_IN' | 'CASH_OUT';
  amount: number;
  timestamp: string;
  reason: string;
  notes?: string;
  created_by: number;
}

// App Settings types
export interface AppSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  tax_rate: number;
  currency: string;
  currencySymbol?: string;
  language: Language;
  theme: Theme;
  scaleIntegration?: boolean;
  print_settings: {
    enabled?: boolean;
    copies?: number;
    receipt_printer: string;
    label_printer: string;
    receipt_template: string;
  };
  label_settings: LabelSettings;
  storeInfo?: {
    name?: string;
    address?: string;
    taxId?: string;
    logoUrl?: string;
    defaultReceiptLanguage?: string;
  };
  pricingPolicies?: {
    missingPricePolicy: 'block' | 'warn' | 'allow';
    requiredTiers: string[];
    autoCreateCategories: boolean;
    autoCreateSuppliers: boolean;
  };
  languageFormatting?: {
    roundingMode: 'round' | 'floor' | 'ceil';
    kgDecimals: number;
    displayLanguage?: string;
  };
  devices?: {
    cashDrawerOpenOnCash: boolean;
    receiptPaper?: string;
    scaleMode?: string;
  };
  receiptOptions?: {
    footerTextEN?: string;
    footerTextSI?: string;
    footerTextTA?: string;
    showQRCode?: boolean;
    showBarcode?: boolean;
    showTierBadge?: boolean;
  };
  backupSettings?: {
    provider: 'local' | 'cloud' | 's3' | 'backblaze' | 'onedrive' | 'google_drive';
    schedule: {
      onSettingsChange: boolean;
      dailyTime?: string;
    };
    retention?: {
      keepDaily?: number;
      keepConfigChange?: number;
    };
    credentials?: {
      endpoint?: string;
      bucket?: string;
      accessKey?: string;
      secretKey?: string;
      folderPath?: string; // For OneDrive
      accessToken?: string; // For OneDrive
      encryptionKey?: string; // For encryption
      folderId?: string; // For Google Drive
    };
  };
  roundingMode?: 'nearest' | 'up' | 'down'; // Alternative field name for backward compatibility
  roundingValue?: number; // For rounding value
  taxRate?: number; // Alternative field name for backward compatibility
  receiptLanguage?: string; // For receipt language
}

export type Theme = 'light' | 'dark' | 'auto';
export type Language = 'en' | 'si' | 'ta';

export interface LabelSettings {
  default_preset_id: number;
  defaultPresetId?: string; // Alternative field name for backward compatibility
  defaultDPI?: number;
  auto_print?: boolean; // Make optional for backward compatibility
  batch_size?: number; // Make optional for backward compatibility
  a4Default?: {
    width?: number;
    height?: number;
    margin?: number;
    rows?: number;
    cols?: number; // For columns
    margin_mm?: number; // For margin in mm
    gutter_mm?: number; // For gutter in mm
  };
  defaultDateFormat?: string; // For default date format
}

// License types
export interface LicenseInfo {
  license_key: string;
  company_name: string;
  valid_until: string;
  features: string[];
  max_terminals: number;
  active: boolean;
}

export interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  license_key: string;
}

// Keyboard types
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  ctrlKey?: boolean; // Alternative field name for backward compatibility
  alt?: boolean;
  altKey?: boolean; // Alternative field name for backward compatibility
  shift?: boolean;
  shiftKey?: boolean; // Alternative field name for backward compatibility
  action: string;
  description: string;
}

// Sale Item type (for store compatibility)
export interface SaleItem {
  id: string;
  product_id: number;
  productId?: number; // Alternative field name for backward compatibility
  product?: any; // For backward compatibility
  name: string;
  sku: string;
  qty: number;
  quantity?: number; // Alternative field name for backward compatibility
  unit_price: number;
  unitPrice?: number; // Alternative field name for backward compatibility
  line_discount: number;
  discount?: number; // Alternative field name for backward compatibility
  line_total: number;
  total?: number; // Alternative field name for backward compatibility
  unit: 'pc' | 'kg';
}

// Utility types
export type RoundingMode = 'nearest' | 'up' | 'down';