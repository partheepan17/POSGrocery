import { dataService, Product, Customer, Sale, SaleLine, DiscountRule } from './dataService';
import { generateReceiptNumber } from '@/utils/receiptNumber';
import { SETTINGS } from '@/config/settings';

export interface POSSaleRequest {
  cashier_id: number;
  terminal_name?: string;
  customer_id?: number;
  price_tier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  language?: 'EN' | 'SI' | 'TA';
}

export interface POSLineRequest {
  sale_id: number;
  product_id: number;
  qty: number;
  unit_price?: number;
  line_discount?: number;
}

export interface POSDiscountRequest {
  sale_id: number;
  line_id: number;
  percent?: number;
  amount?: number;
}

export interface POSPaymentRequest {
  sale_id: number;
  payments: {
    cash: number;
    card: number;
    wallet: number;
  };
}

export interface POSHeldSale {
  id: number;
  datetime: Date;
  customer_id?: number;
  price_tier: string;
  lines: SaleLine[];
  total: number;
}

export interface ScaleBarcodeResult {
  product_id: number;
  qty: number;
  unit_price?: number;
  line_total?: number;
}

export class POSService {
  private currentSale: Sale | null = null;
  private currentLines: SaleLine[] = [];

  // Start a new sale
  async startSale(request: POSSaleRequest): Promise<Sale> {
    this.currentSale = await dataService.startSale(request);
    this.currentLines = [];
    return this.currentSale;
  }

  // Add line to current sale
  async addLine(request: POSLineRequest): Promise<SaleLine> {
    if (!this.currentSale) {
      throw new Error('No active sale');
    }

    const product = await dataService.getProductById(request.product_id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Get the appropriate price based on the sale's price tier
    let unitPrice = request.unit_price;
    if (!unitPrice) {
      switch (this.currentSale.price_tier) {
        case 'Retail':
          unitPrice = product.price_retail;
          break;
        case 'Wholesale':
          unitPrice = product.price_wholesale;
          break;
        case 'Credit':
          unitPrice = product.price_credit;
          break;
        case 'Other':
          unitPrice = product.price_other;
          break;
        default:
          unitPrice = product.price_retail;
      }
    }

    // Check if this is a scale item
    if (product.is_scale_item && request.qty > 0) {
      // For scale items, the qty represents weight
      // Unit price should be per kg/pc
    }

    const lineDiscount = request.line_discount || 0;
    const subtotal = (unitPrice * request.qty) - lineDiscount;
    // FIX: Tax is computed after all discounts at invoice level to avoid drift.
    const tax = 0; // Per-line tax removed - computed at invoice level
    const total = subtotal + tax;

    const saleLine: SaleLine = {
      id: Date.now(),
      sale_id: this.currentSale.id,
      product_id: request.product_id,
      qty: request.qty,
      unit_price: unitPrice,
      line_discount: lineDiscount,
      tax,
      total
    };

    // Check if line already exists for this product
    const existingLineIndex = this.currentLines.findIndex(
      line => line.product_id === request.product_id && line.unit_price === unitPrice
    );

    if (existingLineIndex >= 0) {
      // Increment quantity of existing line
      this.currentLines[existingLineIndex].qty += request.qty;
      this.currentLines[existingLineIndex].total = 
        ((this.currentLines[existingLineIndex].qty * unitPrice) - lineDiscount);
    } else {
      // Add new line
      this.currentLines.push(saleLine);
    }

    // Apply discount rules
    await this.applyRuleCaps(this.currentSale.id);

    return saleLine;
  }

  // Apply line discount
  async applyLineDiscount(request: POSDiscountRequest): Promise<SaleLine | null> {
    if (!this.currentSale) {
      throw new Error('No active sale');
    }

    const lineIndex = this.currentLines.findIndex(line => line.id === request.line_id);
    if (lineIndex === -1) {
      throw new Error('Line not found');
    }

    const line = this.currentLines[lineIndex];
    let discount = 0;

    if (request.percent) {
      discount = (line.qty * line.unit_price) * (request.percent / 100);
    } else if (request.amount) {
      discount = request.amount;
    }

    line.line_discount = discount;
    line.total = ((line.qty * line.unit_price) - discount);

    this.currentLines[lineIndex] = line;
    return line;
  }

  // Apply discount rule caps
  async applyRuleCaps(saleId: number): Promise<void> {
    if (!this.currentSale) {
      return;
    }

    const discountRules = await dataService.getDiscountRules();
    const today = new Date().toISOString().split('T')[0];

    for (const rule of discountRules) {
      const activeFrom = rule.active_from instanceof Date ? rule.active_from : new Date(rule.active_from as any);
      const activeTo = rule.active_to instanceof Date ? rule.active_to : new Date(rule.active_to as any);
      const fromStr = activeFrom.toISOString().split('T')[0];
      const toStr = activeTo.toISOString().split('T')[0];

      if (rule.applies_to === 'PRODUCT' && rule.active && 
          today >= fromStr && 
          today <= toStr) {
        
        // Find lines for this product
        const productLines = this.currentLines.filter(line => line.product_id === rule.target_id);
        let totalQty = productLines.reduce((sum, line) => sum + line.qty, 0);

        if (totalQty > 0 && rule.max_qty_or_weight) {
          let eligibleQty = Math.min(totalQty, rule.max_qty_or_weight);
          // IMPORTANT: Discounts are calculated on retail price, not current unit price
          const product = await dataService.getProductById(productLines[0].product_id);
          const retailPrice = product?.price_retail || productLines[0].unit_price;
          const discountPerUnit = rule.type === 'PERCENT' ? 
            (retailPrice * rule.value / 100) : rule.value;
          
          // Apply discount to eligible quantity
          for (const line of productLines) {
            if (line.qty <= eligibleQty) {
              line.line_discount = line.qty * discountPerUnit;
              eligibleQty -= line.qty;
            } else {
              line.line_discount = eligibleQty * discountPerUnit;
              break;
            }
            
            // Recalculate total
            line.total = ((line.qty * line.unit_price) - line.line_discount);
          }
        }
      }
    }
  }

  // Hold sale
  async holdSale(saleId: number): Promise<boolean> {
    if (!this.currentSale) {
      throw new Error('No active sale');
    }

    const success = await dataService.holdSale(saleId);
    if (success) {
      this.currentSale = null;
      this.currentLines = [];
    }
    return success;
  }

  // Resume sale
  async resumeSale(saleId: number): Promise<POSHeldSale | null> {
    const sale = await dataService.resumeSale(saleId);
    if (sale) {
      this.currentSale = sale;
      this.currentLines = await dataService.getSaleLines(saleId);
    }
    return sale ? {
      id: sale.id,
      datetime: sale.datetime,
      customer_id: sale.customer_id,
      price_tier: sale.price_tier,
      lines: this.currentLines,
      total: sale.net
    } : null;
  }

  // Finalize sale
  async finalizeSale(request: POSPaymentRequest): Promise<Sale> {
    if (!this.currentSale) {
      throw new Error('No active sale');
    }

    // Calculate totals
    const gross = this.currentLines.reduce((sum, line) => sum + (line.qty * line.unit_price), 0);
    const discount = this.currentLines.reduce((sum, line) => sum + line.line_discount, 0);
    // FIX: Tax computed at invoice level using SETTINGS.TAX_RATE
    const tax = (gross - discount) * SETTINGS.TAX_RATE;
    const net = gross - discount + tax;

    // Update sale totals
    this.currentSale.gross = gross;
    this.currentSale.discount = discount;
    this.currentSale.tax = tax;
    this.currentSale.net = net;

    // Finalize with payments
    const finalizedSale = await dataService.finalizeSale(this.currentSale.id, {
      pay_cash: request.payments.cash,
      pay_card: request.payments.card,
      pay_wallet: request.payments.wallet
    });
    
    // Clear current sale
    this.currentSale = null;
    this.currentLines = [];

    return finalizedSale;
  }

  // Scale barcode parsing
  parseScaleBarcode(barcode: string): ScaleBarcodeResult | null {
    // Scale barcode format: PLU + weight/price
    // Example: "1234567890124" + "250" (weight in grams)
    // or "1234567890124" + "P500" (price override)
    
    if (barcode.length < 13) {
      return null;
    }

    const productBarcode = barcode.substring(0, 13);
    const scaleData = barcode.substring(13);

    if (scaleData.startsWith('P')) {
      // Price override
      const price = parseFloat(scaleData.substring(1)) / 100; // Convert cents to rupees
      return {
        product_id: 0, // Will be resolved by barcode lookup
        qty: 1,
        line_total: price
      };
    } else {
      // Weight
      const weight = parseFloat(scaleData) / 1000; // Convert grams to kg
      return {
        product_id: 0, // Will be resolved by barcode lookup
        qty: weight,
        unit_price: 0 // Will be resolved by product lookup
      };
    }
  }

  // Get current sale
  getCurrentSale(): Sale | null {
    return this.currentSale;
  }

  // Get current lines
  getCurrentLines(): SaleLine[] {
    return this.currentLines;
  }

  // Remove line
  removeLine(lineId: number): void {
    this.currentLines = this.currentLines.filter(line => line.id !== lineId);
  }

  // Update line quantity
  updateLineQty(lineId: number, qty: number): void {
    const lineIndex = this.currentLines.findIndex(line => line.id === lineId);
    if (lineIndex >= 0) {
      this.currentLines[lineIndex].qty = qty;
      const line = this.currentLines[lineIndex];
      line.total = ((line.qty * line.unit_price) - line.line_discount);
    }
  }

  // Get sale totals
  getSaleTotals(): { gross: number; discount: number; tax: number; net: number } {
    const gross = this.currentLines.reduce((sum, line) => sum + (line.qty * line.unit_price), 0);
    const discount = this.currentLines.reduce((sum, line) => sum + line.line_discount, 0);
    // FIX: Tax computed at invoice level using SETTINGS.TAX_RATE
    const tax = (gross - discount) * SETTINGS.TAX_RATE;
    const net = gross - discount + tax;

    return { gross, discount, tax, net };
  }

  // Export today's invoices as CSV
  async exportTodayCsv(): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    // Mock data for CSV export - in real implementation, this would query the database
    const sales = [
      {
        id: 'sale1',
        datetime: new Date().toISOString(),
        terminal_name: 'Counter-1',
        cashier_id: 'user1',
        customer_name: 'Walk-in',
        price_tier: 'Retail',
        gross: 100.00,
        discount: 0.00,
        tax: 15.00,
        net: 115.00,
        pay_cash: 115.00,
        pay_card: 0.00,
        pay_wallet: 0.00,
        language: 'EN',
        product_id: 'prod1',
        sku: 'RICE5',
        name_en: 'Rice 5kg',
        qty: 1,
        unit_price: 100.00,
        line_discount: 0.00,
        tax_amount: 15.00,
        total: 115.00
      }
    ];

    const headers = [
      'invoice_id', 'datetime', 'terminal', 'cashier', 'customer_name', 'price_tier',
      'item_sku', 'item_name_en', 'qty', 'unit_price', 'line_discount', 'tax', 'line_total',
      'gross', 'discount', 'tax_total', 'net', 'pay_cash', 'pay_card', 'pay_wallet', 'language'
    ];

    const rows = sales.map((row: any) => [
      row.id,
      row.datetime,
      row.terminal_name || '',
      row.cashier_name || '',
      row.customer_name || '',
      row.price_tier,
      row.sku || '',
      row.name_en || '',
      row.qty || '',
      row.unit_price || '',
      row.line_discount || '',
      row.tax || '',
      row.total || '',
      row.gross || '',
      row.discount || '',
      row.tax || '',
      row.net || '',
      row.pay_cash || '',
      row.pay_card || '',
      row.pay_wallet || '',
      row.language || ''
    ]);

    // Generate CSV
    const csvContent = [headers, ...rows]
      .map(row => row.map((field: any) => `"${String(field || '')}"`).join(','))
      .join('\n');

    return csvContent;
  }
}

// Singleton instance
export const posService = new POSService();
