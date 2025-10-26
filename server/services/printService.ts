/**
 * Print Service
 * Handles receipt printing, label printing, and other print operations
 */

import { createContextLogger } from '../utils/logger';
import { printConfig } from '../config/network';

const logger = createContextLogger({ operation: 'print_service' });

export interface PrintJob {
  id: string;
  type: 'receipt' | 'label' | 'report' | 'invoice';
  content: string;
  printer: string;
  copies: number;
  priority: 'low' | 'normal' | 'high';
  metadata?: Record<string, any>;
}

export interface Printer {
  id: string;
  name: string;
  type: 'thermal' | 'laser' | 'inkjet' | 'label';
  status: 'online' | 'offline' | 'error' | 'paper_out' | 'ink_low';
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  capabilities: string[];
}

export interface PrintResult {
  success: boolean;
  jobId?: string;
  error?: string;
  printer?: string;
  timestamp: Date;
}

export class PrintService {
  private printers: Map<string, Printer> = new Map();
  private printQueue: PrintJob[] = [];
  private isProcessing = false;

  constructor() {
    this.initializePrinters();
    this.startPrintProcessor();
  }

  /**
   * Initialize available printers
   */
  private initializePrinters(): void {
    // Default thermal receipt printer
    this.printers.set('default', {
      id: 'default',
      name: 'Default Receipt Printer',
      type: 'thermal',
      status: 'online',
      paperSize: '80mm',
      orientation: 'portrait',
      capabilities: ['receipt', 'label']
    });

    // Label printer
    this.printers.set('label', {
      id: 'label',
      name: 'Label Printer',
      type: 'label',
      status: 'online',
      paperSize: 'A4',
      orientation: 'portrait',
      capabilities: ['label']
    });

    logger.info('Printers initialized', { count: this.printers.size });
  }

  /**
   * Get all available printers
   */
  getPrinters(): Printer[] {
    return Array.from(this.printers.values());
  }

  /**
   * Get printer by ID
   */
  getPrinter(id: string): Printer | undefined {
    return this.printers.get(id);
  }

  /**
   * Print receipt
   */
  async printReceipt(receiptData: {
    receiptNumber: string;
    date: string;
    time: string;
    cashier: string;
    terminal: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    customerName?: string;
    customerPhone?: string;
  }): Promise<PrintResult> {
    const content = this.generateReceiptContent(receiptData);
    
    const job: PrintJob = {
      id: this.generateJobId(),
      type: 'receipt',
      content,
      printer: 'default',
      copies: 1,
      priority: 'high',
      metadata: {
        receiptNumber: receiptData.receiptNumber,
        total: receiptData.total
      }
    };

    return this.addToQueue(job);
  }

  /**
   * Print label
   */
  async printLabel(labelData: {
    productName: string;
    sku: string;
    barcode: string;
    price: number;
    expiryDate?: string;
    batchNumber?: string;
  }): Promise<PrintResult> {
    const content = this.generateLabelContent(labelData);
    
    const job: PrintJob = {
      id: this.generateJobId(),
      type: 'label',
      content,
      printer: 'label',
      copies: 1,
      priority: 'normal',
      metadata: {
        sku: labelData.sku,
        barcode: labelData.barcode
      }
    };

    return this.addToQueue(job);
  }

  /**
   * Print report
   */
  async printReport(reportData: {
    title: string;
    date: string;
    content: string;
    type: 'sales' | 'inventory' | 'financial';
  }): Promise<PrintResult> {
    const content = this.generateReportContent(reportData);
    
    const job: PrintJob = {
      id: this.generateJobId(),
      type: 'report',
      content,
      printer: 'default',
      copies: 1,
      priority: 'normal',
      metadata: {
        reportType: reportData.type,
        title: reportData.title
      }
    };

    return this.addToQueue(job);
  }

  /**
   * Add job to print queue
   */
  private async addToQueue(job: PrintJob): Promise<PrintResult> {
    // Validate printer
    const printer = this.getPrinter(job.printer);
    if (!printer) {
      return {
        success: false,
        error: `Printer '${job.printer}' not found`,
        timestamp: new Date()
      };
    }

    if (printer.status !== 'online') {
      return {
        success: false,
        error: `Printer '${job.printer}' is ${printer.status}`,
        timestamp: new Date()
      };
    }

    // Add to queue
    this.printQueue.push(job);
    
    // Sort by priority
    this.printQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    logger.info('Print job added to queue', {
      jobId: job.id,
      type: job.type,
      printer: job.printer,
      priority: job.priority,
      queueLength: this.printQueue.length
    });

    return {
      success: true,
      jobId: job.id,
      printer: job.printer,
      timestamp: new Date()
    };
  }

  /**
   * Start print processor
   */
  private startPrintProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.printQueue.length > 0) {
        await this.processPrintQueue();
      }
    }, 1000); // Check every second
  }

  /**
   * Process print queue
   */
  private async processPrintQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift();
      if (!job) break;

      try {
        await this.executePrintJob(job);
      } catch (error) {
        logger.error('Print job failed', {
          jobId: job.id,
          error: error.message
        });
      }
    }

    this.isProcessing = false;
  }

  /**
   * Execute print job
   */
  private async executePrintJob(job: PrintJob): Promise<void> {
    const printer = this.getPrinter(job.printer);
    if (!printer) {
      throw new Error(`Printer '${job.printer}' not found`);
    }

    logger.info('Executing print job', {
      jobId: job.id,
      type: job.type,
      printer: job.printer,
      copies: job.copies
    });

    // Simulate printing (in real implementation, this would interface with printer drivers)
    await this.simulatePrint(job, printer);

    logger.info('Print job completed', {
      jobId: job.id,
      type: job.type,
      printer: job.printer
    });
  }

  /**
   * Simulate print operation
   */
  private async simulatePrint(job: PrintJob, printer: Printer): Promise<void> {
    // Simulate print delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real implementation, this would:
    // 1. Convert content to printer-specific format
    // 2. Send to printer via appropriate driver
    // 3. Handle printer responses and errors
    // 4. Update printer status

    console.log(`[PRINT] ${printer.name}: ${job.type.toUpperCase()}`);
    console.log(`[PRINT] Job ID: ${job.id}`);
    console.log(`[PRINT] Copies: ${job.copies}`);
    console.log(`[PRINT] Content:\n${job.content}`);
    console.log(`[PRINT] --- End of Print Job ---`);
  }

  /**
   * Generate receipt content
   */
  private generateReceiptContent(data: any): string {
    const width = 32; // 80mm thermal printer width
    const separator = '─'.repeat(width);
    
    let content = '';
    
    // Header
    content += ' '.repeat((width - 20) / 2) + 'POS GROCERY STORE\n';
    content += ' '.repeat((width - 15) / 2) + '123 Main Street\n';
    content += ' '.repeat((width - 12) / 2) + 'Colombo, Sri Lanka\n';
    content += ' '.repeat((width - 8) / 2) + 'Tel: 011-123-4567\n';
    content += separator + '\n';
    
    // Receipt info
    content += `Receipt #: ${data.receiptNumber}\n`;
    content += `Date: ${data.date}\n`;
    content += `Time: ${data.time}\n`;
    content += `Cashier: ${data.cashier}\n`;
    content += `Terminal: ${data.terminal}\n`;
    
    if (data.customerName) {
      content += `Customer: ${data.customerName}\n`;
    }
    if (data.customerPhone) {
      content += `Phone: ${data.customerPhone}\n`;
    }
    
    content += separator + '\n';
    
    // Items
    content += 'Item'.padEnd(20) + 'Qty'.padStart(4) + 'Price'.padStart(8) + '\n';
    content += separator + '\n';
    
    for (const item of data.items) {
      const name = item.name.length > 18 ? item.name.substring(0, 15) + '...' : item.name;
      content += name.padEnd(20) + item.quantity.toString().padStart(4) + item.total.toFixed(2).padStart(8) + '\n';
    }
    
    content += separator + '\n';
    
    // Totals
    content += 'Subtotal:'.padEnd(24) + data.subtotal.toFixed(2).padStart(8) + '\n';
    if (data.discount > 0) {
      content += 'Discount:'.padEnd(24) + `-${data.discount.toFixed(2)}`.padStart(8) + '\n';
    }
    if (data.tax > 0) {
      content += 'Tax:'.padEnd(24) + data.tax.toFixed(2).padStart(8) + '\n';
    }
    content += 'TOTAL:'.padEnd(24) + data.total.toFixed(2).padStart(8) + '\n';
    
    content += separator + '\n';
    content += `Payment: ${data.paymentMethod}\n`;
    content += separator + '\n';
    
    // Footer
    content += ' '.repeat((width - 20) / 2) + 'Thank you for shopping!\n';
    content += ' '.repeat((width - 15) / 2) + 'Please come again\n';
    content += '\n\n\n'; // Paper cut
    
    return content;
  }

  /**
   * Generate label content
   */
  private generateLabelContent(data: any): string {
    let content = '';
    
    // Product name
    content += data.productName + '\n';
    content += '─'.repeat(32) + '\n';
    
    // SKU and barcode
    content += `SKU: ${data.sku}\n`;
    content += `Barcode: ${data.barcode}\n`;
    
    // Price
    content += `Price: Rs. ${data.price.toFixed(2)}\n`;
    
    // Additional info
    if (data.expiryDate) {
      content += `Expiry: ${data.expiryDate}\n`;
    }
    if (data.batchNumber) {
      content += `Batch: ${data.batchNumber}\n`;
    }
    
    content += '─'.repeat(32) + '\n';
    content += '\n\n\n'; // Paper cut
    
    return content;
  }

  /**
   * Generate report content
   */
  private generateReportContent(data: any): string {
    const width = 32;
    const separator = '─'.repeat(width);
    
    let content = '';
    
    // Header
    content += ' '.repeat((width - data.title.length) / 2) + data.title + '\n';
    content += ' '.repeat((width - data.date.length) / 2) + data.date + '\n';
    content += separator + '\n';
    
    // Report content
    content += data.content + '\n';
    
    content += separator + '\n';
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += '\n\n\n'; // Paper cut
    
    return content;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get print queue status
   */
  getQueueStatus(): {
    length: number;
    jobs: Array<{
      id: string;
      type: string;
      printer: string;
      priority: string;
      timestamp: Date;
    }>;
  } {
    return {
      length: this.printQueue.length,
      jobs: this.printQueue.map(job => ({
        id: job.id,
        type: job.type,
        printer: job.printer,
        priority: job.priority,
        timestamp: new Date()
      }))
    };
  }

  /**
   * Clear print queue
   */
  clearQueue(): void {
    this.printQueue = [];
    logger.info('Print queue cleared');
  }

  /**
   * Update printer status
   */
  updatePrinterStatus(printerId: string, status: Printer['status']): void {
    const printer = this.getPrinter(printerId);
    if (printer) {
      printer.status = status;
      logger.info('Printer status updated', { printerId, status });
    }
  }
}

export const printService = new PrintService();







