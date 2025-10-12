/**
 * Printer Adapter Interface
 * Handles receipt printing and reprint functionality
 */

export interface PrinterConfig {
  host: string;
  port: number;
  timeout: number;
  encoding: string;
}

export interface ReceiptData {
  receipt_no: string;
  receipt_type: 'sale' | 'return';
  store_name: string;
  store_address: string;
  store_phone: string;
  cashier_name: string;
  customer_name?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  payment_reference?: string;
  created_at: string;
  footer_text: string;
}

export interface ReceiptItem {
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  discount?: number;
}

export interface PrintResult {
  success: boolean;
  message: string;
  printer_response?: string;
}

/**
 * Mock printer adapter for development/testing
 */
export class MockPrinterAdapter {
  private config: PrinterConfig;
  
  constructor(config: PrinterConfig) {
    this.config = config;
  }
  
  async print(receiptData: ReceiptData): Promise<PrintResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional printer errors
    if (Math.random() < 0.1) {
      return {
        success: false,
        message: 'Printer connection failed',
        printer_response: 'ERROR: Connection timeout'
      };
    }
    
    // Log receipt data for debugging
    console.log('=== RECEIPT PRINTED ===');
    console.log(`Receipt: ${receiptData.receipt_no}`);
    console.log(`Type: ${receiptData.receipt_type}`);
    console.log(`Store: ${receiptData.store_name}`);
    console.log(`Cashier: ${receiptData.cashier_name}`);
    console.log(`Total: ${receiptData.total / 100} LKR`);
    console.log('========================');
    
    return {
      success: true,
      message: 'Receipt printed successfully',
      printer_response: 'OK'
    };
  }
  
  async isConnected(): Promise<boolean> {
    // Simulate connection check
    await new Promise(resolve => setTimeout(resolve, 50));
    return Math.random() > 0.2; // 80% success rate
  }
}

/**
 * TCP Printer Adapter for real ESC/POS printers
 */
export class TCPPrinterAdapter {
  private config: PrinterConfig;
  
  constructor(config: PrinterConfig) {
    this.config = config;
  }
  
  async print(receiptData: ReceiptData): Promise<PrintResult> {
    try {
      const net = require('net');
      
      return new Promise((resolve) => {
        const client = new net.Socket();
        const timeout = setTimeout(() => {
          client.destroy();
          resolve({
            success: false,
            message: 'Printer connection timeout',
            printer_response: 'TIMEOUT'
          });
        }, this.config.timeout);
        
        client.connect(this.config.port, this.config.host, () => {
          clearTimeout(timeout);
          
          // Convert receipt data to ESC/POS commands
          const escPosCommands = this.generateEscPosCommands(receiptData);
          
          client.write(escPosCommands, this.config.encoding, (error: any) => {
            if (error) {
              resolve({
                success: false,
                message: 'Failed to send data to printer',
                printer_response: error instanceof Error ? error.message : String(error)
              });
            } else {
              resolve({
                success: true,
                message: 'Receipt sent to printer',
                printer_response: 'OK'
              });
            }
          });
        });
        
        client.on('error', (error: any) => {
          clearTimeout(timeout);
          resolve({
            success: false,
            message: 'Printer connection error',
            printer_response: error instanceof Error ? error.message : String(error)
          });
        });
        
        client.on('close', () => {
          clearTimeout(timeout);
        });
      });
    } catch (error) {
      return {
        success: false,
        message: 'Printer error',
        printer_response: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  async isConnected(): Promise<boolean> {
    try {
      const net = require('net');
      
      return new Promise((resolve) => {
        const client = new net.Socket();
        const timeout = setTimeout(() => {
          client.destroy();
          resolve(false);
        }, 2000);
        
        client.connect(this.config.port, this.config.host, () => {
          clearTimeout(timeout);
          client.destroy();
          resolve(true);
        });
        
        client.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }
  
  private generateEscPosCommands(receiptData: ReceiptData): Buffer {
    const commands: string[] = [];
    
    // Initialize printer
    commands.push('\x1B\x40'); // ESC @ - Initialize
    
    // Set alignment to center
    commands.push('\x1B\x61\x01'); // ESC a 1 - Center alignment
    
    // Store name (bold, double height)
    commands.push('\x1B\x45\x01'); // ESC E 1 - Bold on
    commands.push('\x1D\x21\x11'); // GS ! 11 - Double height and width
    commands.push(`${receiptData.store_name}\n`);
    commands.push('\x1B\x45\x00'); // ESC E 0 - Bold off
    commands.push('\x1D\x21\x00'); // GS ! 00 - Normal size
    
    // Store address
    commands.push(`${receiptData.store_address}\n`);
    commands.push(`${receiptData.store_phone}\n`);
    
    // Separator line
    commands.push('--------------------------------\n');
    
    // Set alignment to left
    commands.push('\x1B\x61\x00'); // ESC a 0 - Left alignment
    
    // Receipt info
    commands.push(`Receipt: ${receiptData.receipt_no}\n`);
    commands.push(`Date: ${new Date(receiptData.created_at).toLocaleString()}\n`);
    commands.push(`Cashier: ${receiptData.cashier_name}\n`);
    
    if (receiptData.customer_name) {
      commands.push(`Customer: ${receiptData.customer_name}\n`);
    }
    
    commands.push('\n');
    
    // Items
    commands.push('Item                Qty  Price  Total\n');
    commands.push('--------------------------------\n');
    
    for (const item of receiptData.items) {
      const name = item.name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(3);
      const price = (item.unit_price / 100).toFixed(2).padStart(6);
      const total = (item.line_total / 100).toFixed(2).padStart(6);
      
      commands.push(`${name} ${qty} ${price} ${total}\n`);
      
      if (item.discount && item.discount > 0) {
        commands.push(`  Discount: -${(item.discount / 100).toFixed(2)}\n`);
      }
    }
    
    commands.push('--------------------------------\n');
    
    // Totals
    commands.push(`Subtotal:           ${(receiptData.subtotal / 100).toFixed(2).padStart(10)}\n`);
    
    if (receiptData.discount_amount > 0) {
      commands.push(`Discount:           -${(receiptData.discount_amount / 100).toFixed(2).padStart(9)}\n`);
    }
    
    if (receiptData.tax_amount > 0) {
      commands.push(`Tax:                ${(receiptData.tax_amount / 100).toFixed(2).padStart(10)}\n`);
    }
    
    commands.push('--------------------------------\n');
    commands.push(`TOTAL:              ${(receiptData.total / 100).toFixed(2).padStart(10)}\n`);
    commands.push('\n');
    
    // Payment info
    commands.push(`Payment: ${receiptData.payment_method}\n`);
    if (receiptData.payment_reference) {
      commands.push(`Ref: ${receiptData.payment_reference}\n`);
    }
    
    commands.push('\n');
    
    // Footer
    commands.push('\x1B\x61\x01'); // Center alignment
    commands.push(`${receiptData.footer_text}\n`);
    commands.push('\n');
    
    // Cut paper
    commands.push('\x1D\x56\x00'); // GS V 0 - Full cut
    
    return Buffer.from(commands.join(''), 'utf8');
  }
}

/**
 * Printer factory
 */
export function createPrinterAdapter(config: PrinterConfig, useMock: boolean = false) {
  if (useMock || process.env.NODE_ENV === 'development') {
    return new MockPrinterAdapter(config);
  }
  return new TCPPrinterAdapter(config);
}

/**
 * Default printer configuration
 */
export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  host: process.env.PRINTER_HOST || 'localhost',
  port: parseInt(process.env.PRINTER_PORT || '9100'),
  timeout: parseInt(process.env.PRINTER_TIMEOUT || '5000'),
  encoding: 'utf8'
};
