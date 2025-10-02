import { ReceiptPayload } from '@/types/receipt';
import { Thermal58Adapter } from './receipt/Thermal58Adapter';
import { Thermal80Adapter } from './receipt/Thermal80Adapter';
import { A4PreviewAdapter } from './receipt/A4PreviewAdapter';

export interface PrintSettings {
  paperSize: '58mm' | '80mm' | 'A4';
  copies: number;
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize: number;
  fontFamily: string;
}

// Legacy interface for backward compatibility
export interface ReceiptData {
  header?: {
    title: string;
    subtitle?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    description?: string;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  footer?: {
    thankYou?: string;
    website?: string;
    taxId?: string;
  };
  metadata: {
    receiptNumber: string;
    date: Date;
    cashier?: string;
    customer?: string;
  };
}

export abstract class PrintAdapter {
  abstract print(data: ReceiptData, settings: PrintSettings): Promise<void>;
  abstract preview(data: ReceiptData, settings: PrintSettings): Promise<string>;
  abstract getAvailablePrinters(): Promise<string[]>;
  abstract isAvailable(): Promise<boolean>;
  
  // New receipt printing methods
  abstract printReceipt(payload: ReceiptPayload): Promise<void>;
  abstract previewReceipt(payload: ReceiptPayload): Promise<string>;
}

export class BrowserPrintAdapter extends PrintAdapter {
  async print(data: ReceiptData, settings: PrintSettings): Promise<void> {
    const html = await this.preview(data, settings);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window');
    }
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    printWindow.print();
    printWindow.close();
  }

  async preview(data: ReceiptData, settings: PrintSettings): Promise<string> {
    const isReceipt = settings.paperSize === '58mm' || settings.paperSize === '80mm';
    const width = isReceipt ? (settings.paperSize === '58mm' ? '58mm' : '80mm') : '210mm';
    const fontSize = isReceipt ? Math.max(8, settings.fontSize - 2) : settings.fontSize;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt Preview</title>
          <style>
            @media print {
              @page {
                size: ${settings.paperSize === 'A4' ? 'A4' : 'auto'};
                margin: ${settings.margins.top}mm ${settings.margins.right}mm ${settings.margins.bottom}mm ${settings.margins.left}mm;
              }
            }
            
            body {
              font-family: ${settings.fontFamily}, monospace;
              font-size: ${fontSize}px;
              line-height: 1.2;
              margin: 0;
              padding: 0;
              color: #000;
              background: #fff;
              width: ${width};
              max-width: ${width};
            }
            
            .receipt {
              width: 100%;
              max-width: ${width};
              margin: 0 auto;
              padding: 0;
            }
            
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            
            .header h1 {
              margin: 0;
              font-size: ${fontSize + 4}px;
              font-weight: bold;
            }
            
            .header h2 {
              margin: 5px 0 0 0;
              font-size: ${fontSize + 2}px;
              font-weight: normal;
            }
            
            .header p {
              margin: 2px 0;
              font-size: ${fontSize}px;
            }
            
            .items {
              margin: 10px 0;
            }
            
            .item {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
              padding: 2px 0;
              border-bottom: 1px dotted #ccc;
            }
            
            .item-name {
              flex: 1;
              font-weight: 500;
            }
            
            .item-details {
              font-size: ${fontSize - 1}px;
              color: #666;
              margin-top: 1px;
            }
            
            .item-price {
              text-align: right;
              font-weight: bold;
              min-width: 60px;
            }
            
            .totals {
              margin-top: 15px;
              border-top: 1px solid #000;
              padding-top: 10px;
            }
            
            .total-line {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            
            .total-line.final {
              border-top: 1px solid #000;
              padding-top: 5px;
              font-weight: bold;
              font-size: ${fontSize + 1}px;
            }
            
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: ${fontSize - 1}px;
            }
            
            .metadata {
              margin: 10px 0;
              font-size: ${fontSize - 1}px;
              color: #666;
            }
            
            .metadata div {
              margin: 2px 0;
            }
            
            @media screen {
              body {
                background: #f5f5f5;
                padding: 20px;
              }
              
              .receipt {
                background: #fff;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                padding: 20px;
                border-radius: 8px;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${data.header ? `
              <div class="header">
                <h1>${data.header.title}</h1>
                ${data.header.subtitle ? `<h2>${data.header.subtitle}</h2>` : ''}
                ${data.header.address ? `<p>${data.header.address}</p>` : ''}
                ${data.header.phone ? `<p>${data.header.phone}</p>` : ''}
                ${data.header.email ? `<p>${data.header.email}</p>` : ''}
              </div>
            ` : ''}
            
            <div class="metadata">
              <div><strong>Receipt #:</strong> ${data.metadata.receiptNumber}</div>
              <div><strong>Date:</strong> ${data.metadata.date.toLocaleString()}</div>
              ${data.metadata.cashier ? `<div><strong>Cashier:</strong> ${data.metadata.cashier}</div>` : ''}
              ${data.metadata.customer ? `<div><strong>Customer:</strong> ${data.metadata.customer}</div>` : ''}
            </div>
            
            <div class="items">
              ${data.items.map(item => `
                <div class="item">
                  <div>
                    <div class="item-name">${item.name}</div>
                    ${item.description ? `<div class="item-details">${item.description}</div>` : ''}
                    <div class="item-details">Qty: ${item.quantity} × රු ${item.unitPrice.toFixed(2)}</div>
                  </div>
                  <div class="item-price">රු ${item.total.toFixed(2)}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="totals">
              <div class="total-line">
                <span>Subtotal:</span>
                <span>රු ${data.totals.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-line">
                <span>Discount:</span>
                <span>-රු ${data.totals.discount.toFixed(2)}</span>
              </div>
              <div class="total-line">
                <span>Tax (15%):</span>
                <span>රු ${data.totals.tax.toFixed(2)}</span>
              </div>
              <div class="total-line final">
                <span>TOTAL:</span>
                <span>රු ${data.totals.total.toFixed(2)}</span>
              </div>
            </div>
            
            ${data.footer ? `
              <div class="footer">
                ${data.footer.thankYou ? `<p>${data.footer.thankYou}</p>` : ''}
                ${data.footer.website ? `<p>${data.footer.website}</p>` : ''}
                ${data.footer.taxId ? `<p>Tax ID: ${data.footer.taxId}</p>` : ''}
              </div>
            ` : ''}
          </div>
        </body>
      </html>
    `;
  }

  async getAvailablePrinters(): Promise<string[]> {
    // Browser doesn't have direct access to printers
    return ['Browser Print Dialog'];
  }

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'print' in window;
  }

  // New receipt printing methods
  async printReceipt(payload: ReceiptPayload): Promise<void> {
    const adapter = this.getReceiptAdapter(payload.options.paper);
    await adapter.print(payload);
  }

  async previewReceipt(payload: ReceiptPayload): Promise<string> {
    const adapter = this.getReceiptAdapter(payload.options.paper);
    return adapter.preview(payload);
  }

  private getReceiptAdapter(paperSize: '58mm' | '80mm' | 'A4') {
    switch (paperSize) {
      case '58mm':
        return new Thermal58Adapter();
      case '80mm':
        return new Thermal80Adapter();
      case 'A4':
        return new A4PreviewAdapter();
      default:
        return new Thermal80Adapter();
    }
  }
}

export class ElectronPrintAdapter extends PrintAdapter {
  async print(data: ReceiptData, settings: PrintSettings): Promise<void> {
    // Implementation for Electron app
    throw new Error('Electron print adapter not implemented');
  }

  async preview(data: ReceiptData, settings: PrintSettings): Promise<string> {
    // Implementation for Electron app
    throw new Error('Electron print adapter not implemented');
  }

  async getAvailablePrinters(): Promise<string[]> {
    // Implementation for Electron app
    throw new Error('Electron print adapter not implemented');
  }

  async isAvailable(): Promise<boolean> {
    return false; // Not available in browser
  }

  // New receipt printing methods
  async printReceipt(payload: ReceiptPayload): Promise<void> {
    // Implementation for Electron app
    throw new Error('Electron receipt printing not implemented');
  }

  async previewReceipt(payload: ReceiptPayload): Promise<string> {
    // Implementation for Electron app
    throw new Error('Electron receipt preview not implemented');
  }
}

// Factory function to get the appropriate adapter
export function createPrintAdapter(): PrintAdapter {
  if (typeof window !== 'undefined') {
    return new BrowserPrintAdapter();
  }
  return new ElectronPrintAdapter();
}
