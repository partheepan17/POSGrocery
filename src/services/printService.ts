/**
 * Print Service Integration
 * Frontend service for communicating with the print server
 */

export interface PrintLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  separator?: boolean;
}

export interface PrintOptions {
  width?: number;
  showTimestamp?: boolean;
  showBorder?: boolean;
  centerText?: boolean;
}

export interface Printer {
  id: string;
  name: string;
  type: 'usb' | 'serial' | 'network';
  status: 'available' | 'busy' | 'error';
  vendorId?: number;
  productId?: number;
  path?: string;
  ip?: string;
  port?: number;
}

export interface PrintResult {
  success: boolean;
  printerId: string;
  printerName: string;
  jobId: string;
  timestamp: string;
}

export interface PrintError {
  error: string;
  message?: string;
  printerId?: string;
}

class PrintService {
  private ws: WebSocket | null = null;
  private printServerUrl: string;
  private isConnected: boolean = false;
  private printers: Printer[] = [];
  private connectionRetries: number = 0;
  private maxRetries: number = 5;

  constructor() {
    this.printServerUrl = import.meta.env.VITE_PRINT_SERVER_URL || 'ws://localhost:8251/ws/print';
    // Only connect if print server URL is provided (not in development)
    if (this.printServerUrl && !this.printServerUrl.includes('localhost:8251')) {
      this.connect();
    }
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.printServerUrl);
      
      this.ws.onopen = () => {
        console.log('🖨️ Connected to print service');
        this.isConnected = true;
        this.connectionRetries = 0;
        this.listPrinters();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        console.log('🖨️ Print service disconnected');
        this.isConnected = false;
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('🖨️ Print service error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('🖨️ Failed to connect to print service:', error);
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      const delay = Math.min(1000 * Math.pow(2, this.connectionRetries), 10000);
      
      console.log(`🖨️ Reconnecting to print service in ${delay}ms (attempt ${this.connectionRetries}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('🖨️ Max reconnection attempts reached. Print service unavailable.');
    }
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'printers_list':
        this.printers = message.printers || [];
        console.log(`🖨️ Found ${this.printers.length} printers`);
        break;
        
      case 'print_success':
        console.log('🖨️ Print successful:', message.result);
        this.onPrintSuccess?.(message.result);
        break;
        
      case 'print_error':
        console.error('🖨️ Print error:', message.error);
        this.onPrintError?.(message.error);
        break;
        
      case 'print_started':
        console.log('🖨️ Print started:', message.printerId);
        this.onPrintStarted?.(message.printerId);
        break;
        
      case 'pong':
        // Keep-alive response
        break;
        
      default:
        console.log('🖨️ Unknown message:', message);
    }
  }

  // Event callbacks
  public onPrintSuccess?: (result: PrintResult) => void;
  public onPrintError?: (error: PrintError) => void;
  public onPrintStarted?: (printerId: string) => void;

  // Public methods
  public isPrintServiceConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  public getPrinters(): Printer[] {
    return [...this.printers];
  }

  public getDefaultPrinter(): Printer | null {
    return this.printers.find(p => p.status === 'available') || null;
  }

  public async listPrinters(): Promise<Printer[]> {
    if (!this.isPrintServiceConnected()) {
      throw new Error('Print service not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('List printers timeout'));
      }, 5000);

      const originalCallback = this.onPrintSuccess;
      this.onPrintSuccess = (_result) => {
        clearTimeout(timeout);
        this.onPrintSuccess = originalCallback;
        resolve(this.printers);
      };

      this.ws?.send(JSON.stringify({ type: 'list_printers' }));
    });
  }

  public async printReceipt(
    printerId: string,
    lines: PrintLine[],
    options: PrintOptions = {}
  ): Promise<PrintResult> {
    if (!this.isPrintServiceConnected()) {
      throw new Error('Print service not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Print timeout'));
      }, 10000);

      const originalSuccessCallback = this.onPrintSuccess;
      const originalErrorCallback = this.onPrintError;

      this.onPrintSuccess = (result) => {
        clearTimeout(timeout);
        this.onPrintSuccess = originalSuccessCallback;
        this.onPrintError = originalErrorCallback;
        resolve(result);
      };

      this.onPrintError = (error) => {
        clearTimeout(timeout);
        this.onPrintSuccess = originalSuccessCallback;
        this.onPrintError = originalErrorCallback;
        reject(new Error(error.error));
      };

      this.ws?.send(JSON.stringify({
        type: 'print_receipt',
        data: {
          printerId,
          lines,
          options
        }
      }));
    });
  }

  public async printSaleReceipt(saleData: {
    items: Array<{ name: string; quantity: number; price: number; total: number }>;
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    paymentMethod?: string;
    customerName?: string;
    receiptNumber?: string;
  }): Promise<PrintResult> {
    const printer = this.getDefaultPrinter();
    if (!printer) {
      throw new Error('No printer available');
    }

    const lines: PrintLine[] = [
      { text: 'SALE RECEIPT', align: 'center', bold: true },
      { text: '================', align: 'center' },
      { text: `Receipt #: ${saleData.receiptNumber || 'N/A'}`, align: 'left' },
      { text: `Date: ${new Date().toLocaleDateString()}`, align: 'left' },
      { text: `Time: ${new Date().toLocaleTimeString()}`, align: 'left' }
    ];

    if (saleData.customerName) {
      lines.push({ text: `Customer: ${saleData.customerName}`, align: 'left' });
    }

    lines.push({ text: '================', align: 'center' });

    // Add items
    saleData.items.forEach(item => {
      lines.push({ text: `${item.name}`, align: 'left' });
      lines.push({ 
        text: `x${item.quantity} @ $${item.price.toFixed(2)} = $${item.total.toFixed(2)}`, 
        align: 'right' 
      });
    });

    lines.push({ text: '================', align: 'center' });
    lines.push({ text: `Subtotal: $${saleData.subtotal.toFixed(2)}`, align: 'right' });

    if (saleData.discount && saleData.discount > 0) {
      lines.push({ text: `Discount: -$${saleData.discount.toFixed(2)}`, align: 'right' });
    }

    if (saleData.tax && saleData.tax > 0) {
      lines.push({ text: `Tax: $${saleData.tax.toFixed(2)}`, align: 'right' });
    }

    lines.push({ text: '================', align: 'center' });
    lines.push({ text: `TOTAL: $${saleData.total.toFixed(2)}`, align: 'center', bold: true });

    if (saleData.paymentMethod) {
      lines.push({ text: `Payment: ${saleData.paymentMethod}`, align: 'center' });
    }

    lines.push(
      { text: '================', align: 'center' },
      { text: 'Thank you for your business!', align: 'center' },
      { text: 'Visit us again soon!', align: 'center' }
    );

    return this.printReceipt(printer.id, lines, {
      width: 32,
      showTimestamp: true,
      showBorder: true
    });
  }

  public async testPrinter(printerId: string): Promise<PrintResult> {
    const testLines: PrintLine[] = [
      { text: 'TEST RECEIPT', align: 'center', bold: true },
      { text: '================', align: 'center' },
      { text: 'This is a test print', align: 'center' },
      { text: 'from POS Print Service', align: 'center' },
      { text: new Date().toISOString(), align: 'center' },
      { text: '================', align: 'center' },
      { text: 'Test completed successfully!', align: 'center', bold: true }
    ];

    return this.printReceipt(printerId, testLines, {
      width: 32,
      showTimestamp: true,
      showBorder: true
    });
  }

  public ping(): void {
    if (this.isPrintServiceConnected()) {
      this.ws?.send(JSON.stringify({ type: 'ping' }));
    }
  }

  /**
   * Print cash balance report
   */
  public printCashBalance(balance: number, drawer: string = 'Main'): void {
    if (!this.isPrintServiceConnected()) {
      console.warn('Print service not connected');
      return;
    }

    const lines: PrintLine[] = [
      { text: 'CASH BALANCE REPORT', align: 'center', bold: true, separator: true },
      { text: `Drawer: ${drawer}`, align: 'center' },
      { text: `Date: ${new Date().toLocaleString()}`, align: 'center' },
      { text: '', separator: true },
      { text: `Balance: $${balance.toFixed(2)}`, align: 'center', bold: true },
      { text: '', separator: true },
      { text: 'End of Report', align: 'center' },
      { text: '', separator: true }
    ];

    this.printReceipt('default', lines, {
      width: 48,
      showTimestamp: false,
      showBorder: true
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const printService = new PrintService();