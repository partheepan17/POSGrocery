import { ReceiptAdapter, ReceiptPayload } from '@/types/receipt';

export class A4PreviewAdapter implements ReceiptAdapter {
  name = 'A4Preview';
  supportsCashDrawer = false;

  async print(payload: ReceiptPayload): Promise<void> {
    const receiptHtml = await this.generateReceiptHtml(payload);
    
    // Open print dialog for A4 printer
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

    // Generate items table
    const itemsRows = invoice.items.map(item => {
      const localizedName = item[itemNameField] || item.name_en;
      const qtyFormatted = formatQuantity(item.qty, item.unit);
      const unitPriceFormatted = formatCurrency(applyRounding(item.unitPrice));
      const totalFormatted = formatCurrency(applyRounding(item.total));
      const discountFormatted = item.lineDiscount > 0 ? formatCurrency(applyRounding(item.lineDiscount)) : '';
      
      return `
        <tr>
          <td>${localizedName}</td>
          <td class="text-center">${qtyFormatted}${item.unit}</td>
          <td class="text-right">${unitPriceFormatted}</td>
          <td class="text-right">${discountFormatted}</td>
          <td class="text-right">${totalFormatted}</td>
        </tr>
      `;
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
    <title>Invoice - ${invoice.id}</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            background: white;
            color: black;
            word-wrap: break-word;
            overflow-wrap: break-word;
            width: 100%;
            max-width: 100%;
        }
        
        .invoice-container {
            max-width: 100%;
            margin: 0 auto;
        }
        
        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .receipt-type {
            font-weight: bold;
            font-size: 18px;
            margin: 10px 0;
            text-transform: uppercase;
            color: #d32f2f;
        }
        
        .store-info {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .store-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .store-address {
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .tax-id {
            font-size: 12px;
            color: #666;
        }
        
        .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        
        .invoice-info {
            flex: 1;
        }
        
        .invoice-info h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        
        .invoice-info p {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .reprint-watermark {
            text-align: center;
            font-weight: bold;
            color: #999;
            font-size: 24px;
            margin: 20px 0;
            border: 3px solid #999;
            padding: 10px;
            background: rgba(255, 255, 255, 0.9);
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            z-index: 1000;
            width: 300px;
        }
        
        .price-tier {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 20px 0;
            background: #f5f5f5;
            padding: 10px;
            border: 1px solid #ddd;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        .items-table .text-center {
            text-align: center;
        }
        
        .items-table .text-right {
            text-align: right;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        
        .totals-table {
            width: 300px;
            border-collapse: collapse;
        }
        
        .totals-table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
        }
        
        .totals-table .label {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        .totals-table .net-row {
            font-weight: bold;
            font-size: 16px;
            background-color: #e8f4f8;
        }
        
        .payments-section {
            margin-bottom: 30px;
        }
        
        .payments-table {
            width: 300px;
            border-collapse: collapse;
        }
        
        .payments-table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
        }
        
        .payments-table .label {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        .codes-section {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
        }
        
        .qr-code, .barcode {
            text-align: center;
            border: 1px solid #ddd;
            padding: 15px;
            background: #f9f9f9;
        }
        
        .qr-code img, .barcode img {
            max-width: 150px;
            height: auto;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
        
        @media print {
            body { margin: 0; }
            .reprint-watermark { 
                border: 3px solid #000 !important; 
                color: #000 !important;
                background: rgba(255, 255, 255, 0.95) !important;
            }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    ${reprintWatermark}
    
    <div class="invoice-container">
        <div class="header">
            <div class="store-info">
                <div class="store-name">${store.name}</div>
                ${store.address ? `<div class="store-address">${store.address}</div>` : ''}
                ${store.taxId ? `<div class="tax-id">${localizedContent.taxId}: ${store.taxId}</div>` : ''}
                ${payload.type === 'return' ? `<div class="receipt-type">${localizedContent.returnReceipt}</div>` : ''}
            </div>
            
            <div class="invoice-details">
                <div class="invoice-info">
                    <h3>${payload.type === 'return' ? localizedContent.returnReceipt : localizedContent.invoice}</h3>
                    <p><strong>${payload.type === 'return' ? localizedContent.returnId : localizedContent.invoice} No:</strong> ${invoice.id}</p>
                    <p><strong>Date:</strong> ${new Date(invoice.datetime).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${new Date(invoice.datetime).toLocaleTimeString()}</p>
                </div>
                <div class="invoice-info">
                    <h3>${localizedContent.terminal}</h3>
                    <p><strong>${localizedContent.terminal}:</strong> ${terminalName}</p>
                </div>
            </div>
        </div>
        
        <div class="price-tier">
            ${localizedContent.priceTier}: ${(localizedContent as any)[invoice.priceTier.toLowerCase()]}
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>${localizedContent.item}</th>
                    <th class="text-center">${localizedContent.quantity}</th>
                    <th class="text-right">${localizedContent.unitPrice}</th>
                    <th class="text-right">${localizedContent.discount}</th>
                    <th class="text-right">${localizedContent.total}</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows}
            </tbody>
        </table>
        
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="label">${localizedContent.gross}:</td>
                    <td class="text-right">${totals.gross}</td>
                </tr>
                ${invoice.totals.discount > 0 ? `
                <tr>
                    <td class="label">${localizedContent.discount}:</td>
                    <td class="text-right">${totals.discount}</td>
                </tr>
                ` : ''}
                ${invoice.totals.tax > 0 ? `
                <tr>
                    <td class="label">${localizedContent.tax}:</td>
                    <td class="text-right">${totals.tax}</td>
                </tr>
                ` : ''}
                <tr class="net-row">
                    <td class="label">${localizedContent.net}:</td>
                    <td class="text-right">${totals.net}</td>
                </tr>
            </table>
        </div>
        
        <div class="payments-section">
            <h3>${localizedContent.paymentDetails}</h3>
            <table class="payments-table">
                ${invoice.payments.cash > 0 ? `
                <tr>
                    <td class="label">${localizedContent.cash}:</td>
                    <td class="text-right">${payments.cash}</td>
                </tr>
                ` : ''}
                ${invoice.payments.card > 0 ? `
                <tr>
                    <td class="label">${localizedContent.card}:</td>
                    <td class="text-right">${payments.card}</td>
                </tr>
                ` : ''}
                ${invoice.payments.wallet > 0 ? `
                <tr>
                    <td class="label">${localizedContent.wallet}:</td>
                    <td class="text-right">${payments.wallet}</td>
                </tr>
                ` : ''}
                ${invoice.payments.change > 0 ? `
                <tr>
                    <td class="label">${localizedContent.change}:</td>
                    <td class="text-right">${payments.change}</td>
                </tr>
                ` : ''}
            </table>
        </div>
        
        ${options.showQRCode || options.showBarcode ? `
        <div class="codes-section">
            ${qrCodeHtml}
            ${barcodeHtml}
        </div>
        ` : ''}
        
        <div class="footer">
            <div>${footerText}</div>
            <div style="margin-top: 10px;">${localizedContent.thankYou}</div>
            <div style="margin-top: 15px; font-size: 10px; color: #999;">
                <div>viRtual POS © Virtual Software Pvt Ltd</div>
            </div>
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
        terminal: 'Terminal',
        taxId: 'Tax ID',
        item: 'Item',
        quantity: 'Qty',
        unitPrice: 'Unit Price',
        discount: 'Discount',
        total: 'Total',
        gross: 'Gross',
        net: 'Net',
        tax: 'Tax',
        cash: 'Cash',
        card: 'Card',
        wallet: 'Wallet',
        change: 'Change',
        paymentDetails: 'Payment Details',
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
        terminal: 'ටර්මිනල්',
        taxId: 'බදු අංකය',
        item: 'අයිතමය',
        quantity: 'ප්‍රමාණය',
        unitPrice: 'ඒකක මිල',
        discount: 'වට්ටම්',
        total: 'එකතුව',
        gross: 'ප්‍රාථමික',
        net: 'ශුද්ධ',
        tax: 'බදු',
        cash: 'මුදල්',
        card: 'කාඩ්',
        wallet: 'පසුම්බිය',
        change: 'ඉතිරි',
        paymentDetails: 'ගෙවීම් විස්තර',
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
        terminal: 'முனையம்',
        taxId: 'வரி எண்',
        item: 'பொருள்',
        quantity: 'அளவு',
        unitPrice: 'அலகு விலை',
        discount: 'தள்ளுபடி',
        total: 'மொத்தம்',
        gross: 'மொத்தம்',
        net: 'நிகர',
        tax: 'வரி',
        cash: 'பணம்',
        card: 'அட்டை',
        wallet: 'பணப்பை',
        change: 'மீதம்',
        paymentDetails: 'கட்டண விவரங்கள்',
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

  private generateQRCode(invoiceId: string): string {
    return `
      <div class="qr-code">
        <div style="font-size: 12px; margin-bottom: 10px;">QR Code</div>
        <div style="border: 2px solid #000; padding: 15px; display: inline-block; background: white;">
          <div style="font-size: 8px; text-align: center; word-break: break-all;">${invoiceId}</div>
        </div>
      </div>
    `;
  }

  private generateBarcode(invoiceId: string): string {
    return `
      <div class="barcode">
        <div style="font-size: 12px; margin-bottom: 10px;">Barcode</div>
        <div style="border: 2px solid #000; padding: 10px; background: white;">
          <div style="font-size: 14px; font-family: monospace; text-align: center;">${invoiceId}</div>
        </div>
      </div>
    `;
  }
}
