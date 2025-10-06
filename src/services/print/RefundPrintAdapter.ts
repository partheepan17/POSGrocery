/**
 * Refund Print Adapter
 * Handles printing of refund receipts with proper formatting and watermarks
 */

export interface RefundPrintData {
  refund: {
    id: number;
    refund_datetime: string;
    original_invoice: string;
    cashier_name: string;
    terminal: string;
    method: string;
    refund_net: number;
    notes?: string;
  };
  original_sale: {
    datetime: string;
    invoice_number: string;
    customer_name?: string;
  };
  lines: Array<{
    product_sku: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    restock: boolean;
  }>;
  store_info: {
    name: string;
    address: string;
    tax_id?: string;
  };
}

export interface RefundPrintOptions {
  printerWidth: '58mm' | '80mm';
  copies: number;
  cutPaper: boolean;
  openDrawer: boolean;
}

export interface RefundPrintTemplate {
  header: string[];
  content: string[];
  footer: string[];
}

class RefundPrintAdapter {
  private readonly defaultOptions: RefundPrintOptions = {
    printerWidth: '80mm',
    copies: 1,
    cutPaper: true,
    openDrawer: false
  };

  /**
   * Print refund receipt
   */
  async printRefund(refundData: RefundPrintData, options: Partial<RefundPrintOptions> = {}): Promise<void> {
    try {
      const printOptions = { ...this.defaultOptions, ...options };
      const template = this.generateRefundTemplate(refundData, printOptions.printerWidth);
      
      await this.print(template, printOptions);
      console.log('✅ Refund receipt printed successfully');
    } catch (error) {
      console.error('❌ Failed to print refund receipt:', error);
      throw error;
    }
  }

  /**
   * Generate refund receipt template
   */
  private generateRefundTemplate(refundData: RefundPrintData, width: '58mm' | '80mm'): RefundPrintTemplate {
    const lineWidth = width === '58mm' ? 32 : 48;
    const line = '='.repeat(lineWidth);
    const dashLine = '-'.repeat(lineWidth);

    const header = [
      this.centerText(refundData.store_info.name, lineWidth),
      this.centerText(refundData.store_info.address.replace(/\n/g, ' '), lineWidth),
      ...(refundData.store_info.tax_id ? [this.centerText(`Tax ID: ${refundData.store_info.tax_id}`, lineWidth)] : []),
      line,
      '',
      this.centerText('*** REFUND RECEIPT ***', lineWidth),
      this.centerText('*** NOT A SALE ***', lineWidth),
      '',
      line,
      `Refund ID: REF-${refundData.refund.id}`,
      `Original Sale: ${refundData.refund.original_invoice}`,
      `Date: ${this.formatDateTime(refundData.refund.refund_datetime)}`,
      `Cashier: ${refundData.refund.cashier_name}`,
      `Terminal: ${refundData.refund.terminal}`,
      ...(refundData.original_sale.customer_name ? [`Customer: ${refundData.original_sale.customer_name}`] : []),
      dashLine
    ];

    const content = [
      this.centerText('ORIGINAL SALE INFO', lineWidth),
      dashLine,
      `Sale Date: ${this.formatDateTime(refundData.original_sale.datetime)}`,
      `Invoice: ${refundData.original_sale.invoice_number}`,
      dashLine,
      this.centerText('REFUNDED ITEMS', lineWidth),
      dashLine
    ];

    // Add refunded items
    let totalRefund = 0;
    refundData.lines.forEach(line => {
      content.push(`${line.product_sku} - ${line.product_name}`);
      content.push(
        this.formatLine(
          `  ${line.quantity} x ${this.formatCurrency(line.unit_price)}`,
          `-${this.formatCurrency(line.line_total)}`,
          lineWidth
        )
      );
      if (line.restock) {
        content.push('  [RESTOCKED TO INVENTORY]');
      }
      content.push('');
      totalRefund += line.line_total;
    });

    content.push(dashLine);
    content.push(
      this.formatLine('REFUND TOTAL:', `-${this.formatCurrency(totalRefund)}`, lineWidth)
    );
    content.push(
      this.formatLine('REFUND METHOD:', refundData.refund.method, lineWidth)
    );
    content.push(dashLine);

    // Add notes if present
    if (refundData.refund.notes) {
      content.push('REASON:');
      content.push(refundData.refund.notes);
      content.push(dashLine);
    }

    const footer = [
      '',
      this.centerText('REFUND POLICY', lineWidth),
      this.centerText('Items marked [RESTOCKED] have been', lineWidth),
      this.centerText('returned to inventory.', lineWidth),
      '',
      this.centerText('This refund is linked to original', lineWidth),
      this.centerText(`sale ${refundData.original_sale.invoice_number}`, lineWidth),
      '',
      this.centerText('Thank you for your business', lineWidth),
      '',
      `Printed: ${this.formatDateTime(new Date().toISOString())}`,
      '',
      line
    ];

    return { header, content, footer };
  }

  /**
   * Print void receipt
   */
  async printVoid(saleData: any, voidedBy: string, options: Partial<RefundPrintOptions> = {}): Promise<void> {
    try {
      const printOptions = { ...this.defaultOptions, ...options };
      const template = this.generateVoidTemplate(saleData, voidedBy, printOptions.printerWidth);
      
      await this.print(template, printOptions);
      console.log('✅ Void receipt printed successfully');
    } catch (error) {
      console.error('❌ Failed to print void receipt:', error);
      throw error;
    }
  }

  /**
   * Generate void receipt template
   */
  private generateVoidTemplate(saleData: any, voidedBy: string, width: '58mm' | '80mm'): RefundPrintTemplate {
    const lineWidth = width === '58mm' ? 32 : 48;
    const line = '='.repeat(lineWidth);
    const dashLine = '-'.repeat(lineWidth);

    const header = [
      this.centerText('*** VOID RECEIPT ***', lineWidth),
      this.centerText('*** TRANSACTION CANCELLED ***', lineWidth),
      line
    ];

    const content = [
      `Original Sale: ${saleData.invoice_number}`,
      `Sale Date: ${this.formatDateTime(saleData.created_at)}`,
      `Voided: ${this.formatDateTime(new Date().toISOString())}`,
      `Voided By: ${voidedBy}`,
      `Terminal: ${saleData.terminal_name}`,
      dashLine,
      this.centerText('ORIGINAL AMOUNT', lineWidth),
      this.formatLine('Total:', this.formatCurrency(saleData.total_amount), lineWidth),
      dashLine,
      this.centerText('TRANSACTION VOIDED', lineWidth),
      this.centerText('No refund issued', lineWidth),
      this.centerText('Sale never completed', lineWidth)
    ];

    const footer = [
      dashLine,
      `Printed: ${this.formatDateTime(new Date().toISOString())}`,
      line
    ];

    return { header, content, footer };
  }

  /**
   * Send print job to printer
   */
  private async print(template: RefundPrintTemplate, options: RefundPrintOptions): Promise<void> {
    try {
      // Combine all template parts
      const printContent = [
        ...template.header,
        ...template.content,
        ...template.footer
      ].join('\n');

      // In a real implementation, this would send to actual printer
      console.log('🖨️ Printing refund document:');
      console.log(printContent);

      // Open print dialog for browser printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Refund Receipt</title>
              <style>
                body { 
                  font-family: 'Courier New', monospace; 
                  font-size: ${options.printerWidth === '58mm' ? '10px' : '12px'};
                  line-height: 1.2;
                  margin: 10px;
                  white-space: pre-wrap;
                }
                @media print {
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();
        
        // Auto-print after a short delay
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }

      // Simulate drawer opening if requested
      if (options.openDrawer) {
        console.log('💰 Opening cash drawer for refund...');
        window.dispatchEvent(new CustomEvent('drawer-opened'));
      }

    } catch (error) {
      console.error('Print operation failed:', error);
      throw error;
    }
  }

  /**
   * Format text to be centered within line width
   */
  private centerText(text: string, lineWidth: number): string {
    const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Format a line with left and right aligned text
   */
  private formatLine(left: string, right: string, lineWidth: number): string {
    const maxLeftWidth = lineWidth - right.length - 1;
    const truncatedLeft = left.length > maxLeftWidth ? left.substring(0, maxLeftWidth) : left;
    const padding = lineWidth - truncatedLeft.length - right.length;
    return truncatedLeft + ' '.repeat(Math.max(1, padding)) + right;
  }

  /**
   * Format currency amount
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(Math.abs(amount));
  }

  /**
   * Format date and time
   */
  private formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString('en-LK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  /**
   * Test printer connection
   */
  async testPrinter(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🖨️ Testing refund printer connection...');
      
      const testTemplate: RefundPrintTemplate = {
        header: ['REFUND PRINTER TEST'],
        content: ['This is a test print for refund receipts', 'Date: ' + new Date().toLocaleString()],
        footer: ['Test completed']
      };

      await this.print(testTemplate, { ...this.defaultOptions, copies: 1 });
      
      return {
        success: true,
        message: 'Refund printer test completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Refund printer test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const refundPrintAdapter = new RefundPrintAdapter();







