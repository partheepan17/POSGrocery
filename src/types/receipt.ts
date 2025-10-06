export type ReceiptPayload = {
  type?: 'sale' | 'return'; // Distinguish between sales and returns
  store: {
    name: string;
    address?: string;
    taxId?: string;
    logoUrl?: string;
  };
  terminalName: string;
  invoice: {
    id: string; // printable bill no
    datetime: string; // ISO
    language: 'EN' | 'SI' | 'TA';
    priceTier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
    isReprint?: boolean;
    items: Array<{
      sku: string;
      name_en: string;
      name_si?: string;
      name_ta?: string;
      unit: 'pc' | 'kg';
      qty: number; // up to 3 dp for kg
      unitPrice: number; // effective tier price used
      lineDiscount: number; // absolute
      tax: number; // absolute
      total: number; // (qty*unitPrice) - lineDiscount + tax
    }>;
    totals: {
      gross: number;
      discount: number;
      tax: number;
      net: number;
    };
    payments: {
      cash: number;
      card: number;
      wallet: number;
      change: number;
    };
  };
  options: {
    paper: '58mm' | '80mm' | 'A4';
    showQRCode?: boolean;
    showBarcode?: boolean;
    openCashDrawerOnCash?: boolean;
    roundingMode: 'NEAREST_1' | 'NEAREST_0_50' | 'NEAREST_0_10';
    decimalPlacesKg?: number;
    footerText: {
      EN?: string;
      SI?: string;
      TA?: string;
    };
  };
};

export type ReceiptAdapter = {
  name: string;
  print: (payload: ReceiptPayload) => Promise<void>;
  preview: (payload: ReceiptPayload) => Promise<string>; // Returns HTML for preview
  supportsCashDrawer?: boolean;
};

export type ReceiptSettings = {
  defaultPaper: '58mm' | '80mm' | 'A4';
  drawerOnCash: boolean;
  showQR: boolean;
  showBarcode: boolean;
  footerTextEN: string;
  footerTextSI: string;
  footerTextTA: string;
  decimalPlacesKg: number;
};
