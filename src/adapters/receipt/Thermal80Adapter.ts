import { ReceiptAdapter, ReceiptPayload } from '@/types/receipt';

export class Thermal80Adapter implements ReceiptAdapter {
  name = 'Thermal80';
  supportsCashDrawer = true;

  async print(payload: ReceiptPayload): Promise<void> {
    const receiptHtml = await this.generateReceiptHtml(payload);

    // Use hidden iframe to allow Chrome print preview instead of system-only dialog
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      throw new Error('Unable to access print iframe document');
    }

    iframeDoc.open();
    iframeDoc.write(receiptHtml);
    iframeDoc.close();

    // Wait for iframe to render then trigger print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        // Remove iframe shortly after to avoid DOM leaks
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }
    }, 150);

    // Send cash drawer pulse if needed
    if (payload.options.openCashDrawerOnCash && payload.invoice.payments.cash > 0) {
      await this.pulseCashDrawer();
    }
  }

  async preview(payload: ReceiptPayload): Promise<string> {
    return this.generateReceiptHtml(payload, true);
  }

  private async generateReceiptHtml(payload: ReceiptPayload, isPreview = false): Promise<string> {
    const { store, terminalName, invoice, options } = payload;
    
    // Get localized content
    const localizedContent = this.getLocalizedContent(invoice.language);
    const itemNameField = this.getItemNameField(invoice.language);
    const footerText = options.footerText[invoice.language] || localizedContent.defaultFooter;

    // Format currency
    const formatCurrency = (amount: number) => `රු ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

    // Format quantity
    const formatQuantity = (qty: number, unit: string) => {
      if (unit === 'kg') {
        return qty.toFixed(options.decimalPlacesKg || 3);
      }
      return qty.toFixed(0);
    };

    // Apply rounding
    const applyRounding = (amount: number) => {
      switch (options.roundingMode) {
        case 'NEAREST_0_10':
          return Math.round(amount * 10) / 10;
        case 'NEAREST_0_50':
          return Math.round(amount * 2) / 2;
        default:
          return Math.round(amount);
      }
    };

    // Table headers localized
    const headers = {
      name: localizedContent.itemName || 'Item',
      qty: localizedContent.qty || 'Qty',
      price: localizedContent.unitPrice || 'Price',
      disc: localizedContent.discount || 'Disc',
      total: localizedContent.total || 'Total'
    };

    const itemsHtml = `
      <div class="items-header" style="display:flex; font-weight:bold; border-bottom:1px solid #000; padding-bottom:4px;">
        <div style="flex: 6">${headers.name}</div>
        <div style="flex: 2; text-align:right;">${headers.qty}</div>
        <div style="flex: 3; text-align:right;">${headers.price}</div>
        <div style="flex: 3; text-align:right;">${headers.disc}</div>
        <div style="flex: 3; text-align:right;">${headers.total}</div>
      </div>
      ${invoice.items.map(item => {
        const localizedName = (item as any)[itemNameField] || (item as any).name_en;
        const qtyFormatted = formatQuantity(item.qty, item.unit);
        const unitPriceFormatted = formatCurrency(applyRounding(item.unitPrice));
        const lineDisc = item.lineDiscount ? formatCurrency(applyRounding(item.lineDiscount)) : '-';
        const totalFormatted = formatCurrency(applyRounding(item.total));
        const weightMath = item.unit === 'kg' ? `<div class="item-details">${item.unitPrice.toFixed(2)} × ${item.qty.toFixed(3)}kg</div>` : '';
        return `
          <div class="item-row" style="display:flex; margin:4px 0;">
            <div style="flex: 6">${this.truncateText(localizedName, 30)}</div>
            <div style="flex: 2; text-align:right;">${qtyFormatted}</div>
            <div style="flex: 3; text-align:right;">${unitPriceFormatted}</div>
            <div style="flex: 3; text-align:right;">${lineDisc}</div>
            <div style="flex: 3; text-align:right;">${totalFormatted}</div>
          </div>
          ${weightMath}
        `;
      }).join('')}
    `;

    // Format totals
    const totals = {
      gross: formatCurrency(applyRounding(invoice.totals.gross)),
      discount: formatCurrency(applyRounding(invoice.totals.discount)),
      tax: formatCurrency(applyRounding(invoice.totals.tax)),
      net: formatCurrency(applyRounding(invoice.totals.net))
    };

    // Payments formatting: support either aggregated fields or a list
    const paymentsList: Array<{ method: string; amount: number }> = Array.isArray((invoice as any).paymentsList)
      ? (invoice as any).paymentsList
      : [
          { method: 'CASH', amount: Number(invoice.payments.cash || 0) },
          { method: 'CARD', amount: Number(invoice.payments.card || 0) },
          { method: 'WALLET', amount: Number(invoice.payments.wallet || 0) }
        ].filter(p => p.amount > 0);
    const payments = {
      cash: formatCurrency(applyRounding(invoice.payments.cash)),
      card: formatCurrency(applyRounding(invoice.payments.card)),
      wallet: formatCurrency(applyRounding(invoice.payments.wallet)),
      change: formatCurrency(applyRounding(invoice.payments.change))
    };

    // Generate QR code if enabled
    const qrCodeHtml = options.showQRCode ? this.generateQRCode(invoice.id) : '';
    const barcodeHtml = options.showBarcode ? this.generateBarcode(invoice.id) : '';

    // Generate reprint watermark
    const reprintWatermark = invoice.isReprint ? '<div class="reprint-watermark">REPRINT</div>' : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt - ${invoice.id}</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.3;
            margin: 0;
            padding: 12px;
            width: 100%;
            max-width: 100%;
            min-width: 250px;
            background: white;
            color: black;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        
        .receipt-type {
            font-weight: bold;
            font-size: 14px;
            margin: 5px 0;
            text-transform: uppercase;
        }
        
        .store-name {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 3px;
        }
        
        .store-address {
            font-size: 11px;
            margin-bottom: 3px;
        }
        
        .tax-id {
            font-size: 10px;
            margin-bottom: 5px;
        }
        
        .invoice-info {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 5px;
        }
        
        .reprint-watermark {
            text-align: center;
            font-weight: bold;
            color: #666;
            font-size: 12px;
            margin: 6px 0;
            border: 2px solid #666;
            padding: 4px;
        }
        
        .price-tier {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin: 6px 0;
            background: #f0f0f0;
            padding: 3px;
        }
        
        .items-section {
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        
        .item-row {
            margin-bottom: 6px;
        }
        
        .item-name {
            font-weight: bold;
            margin-bottom: 2px;
        }
        
        .item-details {
            font-size: 11px;
            margin-bottom: 2px;
        }
        
        .item-total {
            text-align: right;
            font-weight: bold;
        }
        
        .item-discount {
            font-size: 10px;
            color: #666;
            text-align: right;
        }
        
        .totals-section {
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        
        .total-row.net {
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 6px;
            margin-top: 6px;
            font-size: 14px;
        }
        
        .payments-section {
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        
        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        
        .footer {
            text-align: center;
            font-size: 11px;
            margin-top: 10px;
        }
        
        .qr-code, .barcode {
            text-align: center;
            margin: 10px 0;
        }
        
        .qr-code img, .barcode img {
            max-width: 100%;
            height: auto;
        }
        
        @media print {
            body { margin: 0; }
            .reprint-watermark { border: 2px solid #000 !important; }
        }
    </style>
</head>
<body>
    ${reprintWatermark}
    
    <div class="header">
        <div class="store-name">${store.name}</div>
        ${store.address ? `<div class="store-address">${store.address}</div>` : ''}
        ${store.taxId ? `<div class="tax-id">${localizedContent.taxId}: ${store.taxId}</div>` : ''}
        ${payload.type === 'return' ? `<div class="receipt-type">${localizedContent.returnReceipt}</div>` : ''}
        <div class="invoice-info">
            <span>${payload.type === 'return' ? localizedContent.returnId : localizedContent.invoice}: ${invoice.id}</span>
            <span>${terminalName}</span>
        </div>
        <div class="invoice-info">
            <span>${new Date(invoice.datetime).toLocaleDateString()}</span>
            <span>${new Date(invoice.datetime).toLocaleTimeString()}</span>
        </div>
    </div>
    
    <div class="price-tier">
        ${localizedContent.priceTier}: ${(localizedContent as any)[invoice.priceTier.toLowerCase()]}
    </div>
    
    <div class="items-section">
        ${itemsHtml}
    </div>
    
    <div class="totals-section">
        <div class="total-row">
            <span>${localizedContent.gross}:</span>
            <span>${totals.gross}</span>
        </div>
        ${invoice.totals.discount > 0 ? `
        <div class="total-row">
            <span>${localizedContent.discount}:</span>
            <span>${totals.discount}</span>
        </div>
        ` : ''}
        ${invoice.totals.tax > 0 ? `
        <div class="total-row">
            <span>${localizedContent.tax}:</span>
            <span>${totals.tax}</span>
        </div>
        ` : ''}
        <div class="total-row net">
            <span>${localizedContent.net}:</span>
            <span>${totals.net}</span>
        </div>
    </div>
    
    <div class="payments-section">
        ${paymentsList.map(p => `
          <div class="payment-row">
            <span>${p.method}:</span>
            <span>${formatCurrency(applyRounding(p.amount))}</span>
          </div>
        `).join('')}
        ${invoice.payments.change > 0 ? `
          <div class="payment-row">
            <span>${localizedContent.change}:</span>
            <span>${payments.change}</span>
          </div>
        ` : ''}
    </div>
    
    ${qrCodeHtml}
    ${barcodeHtml}
    
    <div class="footer">
        <div>${footerText}</div>
        <div style="margin-top: 6px;">${localizedContent.thankYou}</div>
        <div style="margin-top: 8px; font-size: 9px; color: #666;">
            <div>viRtual POS © Virtual Software Pvt Ltd</div>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  private getLocalizedContent(language: string) {
    const content = {
      EN: {
        invoice: 'Invoice',
        returnId: 'Return ID',
        returnReceipt: 'RETURN RECEIPT',
        taxId: 'Tax ID',
        itemName: 'Item',
        qty: 'Qty',
        unitPrice: 'Price',
        total: 'Total',
        gross: 'Gross',
        discount: 'Disc',
        tax: 'Tax',
        net: 'Net',
        cash: 'Cash',
        card: 'Card',
        wallet: 'Wallet',
        change: 'Change',
        priceTier: 'Price Tier',
        retail: 'Retail',
        wholesale: 'Wholesale',
        credit: 'Credit',
        other: 'Other',
        thankYou: 'Thank you for your business!',
        defaultFooter: 'Warranty: 7 days | Hotline: 011-1234567'
      },
      SI: {
        invoice: 'ඉන්වොයිස්',
        returnId: 'ආපසු ලබාදීමේ අංකය',
        returnReceipt: 'ආපසු ලබාදීමේ රිසිට්',
        taxId: 'බදු අංකය',
        itemName: 'භාණ්ඩය',
        qty: 'ප්‍රමාණය',
        unitPrice: 'මිල',
        total: 'මුළු',
        gross: 'මුළු',
        discount: 'වට්ටම්',
        tax: 'බද්ද',
        net: 'ශුද්ධ',
        cash: 'මුදල්',
        card: 'කාඩ්',
        wallet: 'පසුම්බිය',
        change: 'ඉතිරි',
        priceTier: 'මිල මට්ටම',
        retail: 'තොග',
        wholesale: 'විශාල',
        credit: 'ණය',
        other: 'වෙනත්',
        thankYou: 'ඔබේ ව්‍යාපාරයට ස්තූතියි!',
        defaultFooter: 'වගකීම: දින 7 | දුරකථන: 011-1234567'
      },
      TA: {
        invoice: 'விலைப்பட்டியல்',
        returnId: 'திரும்ப பெறுதல் எண்',
        returnReceipt: 'திரும்ப பெறுதல் ரசீது',
        taxId: 'வரி எண்',
        itemName: 'பொருள்',
        qty: 'அளவு',
        unitPrice: 'விலை',
        total: 'மொத்தம்',
        gross: 'மொத்தம்',
        discount: 'தள்ளுபடி',
        tax: 'வரி',
        net: 'நிகர',
        cash: 'பணம்',
        card: 'அட்டை',
        wallet: 'பணப்பை',
        change: 'மீதம்',
        priceTier: 'விலை நிலை',
        retail: 'சில்லறை',
        wholesale: 'மொத்த',
        credit: 'கடன்',
        other: 'மற்றவை',
        thankYou: 'உங்கள் வணிகத்திற்கு நன்றி!',
        defaultFooter: 'உத்தரவாதம்: 7 நாட்கள் | தொலைபேசி: 011-1234567'
      }
    };

    return content[language as keyof typeof content] || content.EN;
  }

  private getItemNameField(language: string): keyof { name_en: string; name_si?: string; name_ta?: string } {
    switch (language) {
      case 'SI': return 'name_si';
      case 'TA': return 'name_ta';
      default: return 'name_en';
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private generateQRCode(invoiceId: string): string {
    return `
      <div class="qr-code">
        <div style="border: 1px solid #000; padding: 10px; display: inline-block;">
          <div style="font-size: 9px; text-align: center;">QR CODE</div>
          <div style="font-size: 7px; text-align: center; word-break: break-all;">${invoiceId}</div>
        </div>
      </div>
    `;
  }

  private generateBarcode(invoiceId: string): string {
    return `
      <div class="barcode">
        <div style="border: 1px solid #000; padding: 6px; text-align: center;">
          <div style="font-size: 9px;">BARCODE</div>
          <div style="font-size: 12px; font-family: monospace;">${invoiceId}</div>
        </div>
      </div>
    `;
  }

  private async pulseCashDrawer(): Promise<void> {
    console.log('Cash drawer pulse sent');
  }
}
