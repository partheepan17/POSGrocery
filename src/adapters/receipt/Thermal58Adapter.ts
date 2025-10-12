import { ReceiptAdapter, ReceiptPayload } from '@/types/receipt';

export class Thermal58Adapter implements ReceiptAdapter {
  name = 'Thermal58';
  supportsCashDrawer = true;

  async print(payload: ReceiptPayload): Promise<void> {
    const receiptHtml = await this.generateReceiptHtml(payload);
    
    // Open print dialog for thermal printer
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 100);

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

    // Generate items HTML
    const itemsHtml = invoice.items.map((item: any) => {
      const localizedName = item[itemNameField] || item.name_en;
      const qtyFormatted = formatQuantity(item.qty, item.unit);
      const unitPriceFormatted = formatCurrency(applyRounding(item.unitPrice));
      const totalFormatted = formatCurrency(applyRounding(item.total));
      
      let itemHtml = `
        <div class="item-row">
          <div class="item-name">${this.truncateText(localizedName, 20)}</div>
          <div class="item-details">
            ${qtyFormatted}${item.unit}${item.uom ? ' ('+String(item.uom)+')' : ''} × ${unitPriceFormatted}
          </div>
          <div class="item-total">${totalFormatted}</div>
      `;
      
      if (item.lineDiscount > 0) {
        itemHtml += `<div class="item-discount">${localizedContent.discount}: ${formatCurrency(applyRounding(item.lineDiscount))}</div>`;
      }
      // Weight math line for kg items
      if (item.unit === 'kg') {
        itemHtml += `<div class="item-details">${item.unitPrice.toFixed(2)} × ${item.qty.toFixed(3)}kg</div>`;
      }
      
      itemHtml += '</div>';
      return itemHtml;
    }).join('');

    // Format totals
    const totals = {
      gross: formatCurrency(applyRounding(invoice.totals.gross)),
      discount: formatCurrency(applyRounding(invoice.totals.discount)),
      tax: formatCurrency(applyRounding(invoice.totals.tax)),
      net: formatCurrency(applyRounding(invoice.totals.net))
    };

    // Format payments
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
            size: 58mm auto;
            margin: 0;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 8px;
            width: 100%;
            max-width: 100%;
            min-width: 200px;
            background: white;
            color: black;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        
        .receipt-type {
            font-weight: bold;
            font-size: 12px;
            margin: 3px 0;
            text-transform: uppercase;
        }
        
        .store-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 2px;
        }
        
        .store-address {
            font-size: 10px;
            margin-bottom: 2px;
        }
        
        .tax-id {
            font-size: 9px;
            margin-bottom: 4px;
        }
        
        .invoice-info {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 4px;
        }
        
        .reprint-watermark {
            text-align: center;
            font-weight: bold;
            color: #666;
            font-size: 10px;
            margin: 4px 0;
            border: 1px solid #666;
            padding: 2px;
        }
        
        .price-tier {
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            margin: 4px 0;
            background: #f0f0f0;
            padding: 2px;
        }
        
        .items-section {
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        
        .item-row {
            margin-bottom: 4px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .item-name {
            font-weight: bold;
            margin-bottom: 1px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
        }
        
        .item-details {
            font-size: 10px;
            margin-bottom: 1px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .item-total {
            text-align: right;
            font-weight: bold;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .item-discount {
            font-size: 9px;
            color: #666;
            text-align: right;
        }
        
        .totals-section {
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }
        
        .total-row.net {
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 4px;
            margin-top: 4px;
        }
        
        .payments-section {
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        
        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }
        
        .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 8px;
        }
        
        .qr-code, .barcode {
            text-align: center;
            margin: 8px 0;
        }
        
        .qr-code img, .barcode img {
            max-width: 100%;
            height: auto;
        }
        
        @media print {
            body { margin: 0; }
            .reprint-watermark { border: 1px solid #000 !important; }
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
        ${invoice.payments.cash > 0 ? `
        <div class="payment-row">
            <span>${localizedContent.cash}:</span>
            <span>${payments.cash}</span>
        </div>
        ` : ''}
        ${invoice.payments.card > 0 ? `
        <div class="payment-row">
            <span>${localizedContent.card}:</span>
            <span>${payments.card}</span>
        </div>
        ` : ''}
        ${invoice.payments.wallet > 0 ? `
        <div class="payment-row">
            <span>${localizedContent.wallet}:</span>
            <span>${payments.wallet}</span>
        </div>
        ` : ''}
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
        <div style="margin-top: 4px;">${localizedContent.thankYou}</div>
        <div style="margin-top: 6px; font-size: 8px; color: #666;">
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
        gross: 'ප්‍රාථමික',
        discount: 'වට්ටම්',
        tax: 'බදු',
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
    // Simple QR code placeholder - in production, use a QR code library
    return `
      <div class="qr-code">
        <div style="border: 1px solid #000; padding: 8px; display: inline-block;">
          <div style="font-size: 8px; text-align: center;">QR CODE</div>
          <div style="font-size: 6px; text-align: center; word-break: break-all;">${invoiceId}</div>
        </div>
      </div>
    `;
  }

  private generateBarcode(invoiceId: string): string {
    // Simple barcode placeholder
    return `
      <div class="barcode">
        <div style="border: 1px solid #000; padding: 4px; text-align: center;">
          <div style="font-size: 8px;">BARCODE</div>
          <div style="font-size: 10px; font-family: monospace;">${invoiceId}</div>
        </div>
      </div>
    `;
  }

  private async pulseCashDrawer(): Promise<void> {
    // In a real implementation, this would send ESC/POS commands to the thermal printer
    // For now, we'll just log it
    console.log('Cash drawer pulse sent');
  }
}
