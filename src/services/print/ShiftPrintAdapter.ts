/**
 * Shift Print Adapter
 * Handles printing of X Reports, Z Reports, and shift-related documents
 * Supports both 58mm and 80mm thermal printers
 */

import { XReport, ZReport, CashEvent } from '../../types';

export interface PrintOptions {
  printerWidth: '58mm' | '80mm';
  copies: number;
  cutPaper: boolean;
  openDrawer: boolean;
}

export interface PrintTemplate {
  header: string[];
  content: string[];
  footer: string[];
}

class ShiftPrintAdapter {
  private readonly defaultOptions: PrintOptions = {
    printerWidth: '80mm',
    copies: 1,
    cutPaper: true,
    openDrawer: false
  };

  /**
   * Print X Report (mid-shift snapshot)
   */
  async printXReport(xReport: XReport, options: Partial<PrintOptions> = {}): Promise<void> {
    try {
      const printOptions = { ...this.defaultOptions, ...options };
      const template = this.generateXReportTemplate(xReport, printOptions.printerWidth);
      
      await this.print(template, printOptions);
      console.log('✅ X Report printed successfully');
    } catch (error) {
      console.error('❌ Failed to print X Report:', error);
      throw error;
    }
  }

  /**
   * Print Z Report (end-of-shift)
   */
  async printZReport(zReport: ZReport, options: Partial<PrintOptions> = {}): Promise<void> {
    try {
      const printOptions = { ...this.defaultOptions, ...options, openDrawer: true };
      const template = this.generateZReportTemplate(zReport, printOptions.printerWidth);
      
      await this.print(template, printOptions);
      console.log('✅ Z Report printed successfully');
    } catch (error) {
      console.error('❌ Failed to print Z Report:', error);
      throw error;
    }
  }

  /**
   * Print No-Sale receipt (drawer open without sale)
   */
  async printNoSaleReceipt(reason: string, cashierName: string, options: Partial<PrintOptions> = {}): Promise<void> {
    try {
      const printOptions = { ...this.defaultOptions, ...options, openDrawer: true };
      const template = this.generateNoSaleTemplate(reason, cashierName, printOptions.printerWidth);
      
      await this.print(template, printOptions);
      console.log('✅ No-Sale receipt printed successfully');
    } catch (error) {
      console.error('❌ Failed to print No-Sale receipt:', error);
      throw error;
    }
  }

  /**
   * Generate X Report print template
   */
  private generateXReportTemplate(xReport: XReport, width: '58mm' | '80mm'): PrintTemplate {
    const lineWidth = width === '58mm' ? 32 : 48;
    const line = '='.repeat(lineWidth);
    const dashLine = '-'.repeat(lineWidth);

    const header = [
      this.centerText('X REPORT (MID-SHIFT)', lineWidth),
      line,
      `Session ID: ${xReport.session.id}`,
      `Cashier: ${xReport.session.cashier_name}`,
      `Terminal: ${xReport.session.terminal}`,
      `Started: ${this.formatDateTime(xReport.session.started_at)}`,
      `Generated: ${this.formatDateTime(xReport.generated_at)}`,
      dashLine
    ];

    const content = [
      this.centerText('SALES SUMMARY', lineWidth),
      dashLine,
      this.formatLine('Invoices:', xReport.totals.invoices.toString(), lineWidth),
      this.formatLine('Gross Sales:', this.formatCurrency(xReport.totals.gross), lineWidth),
      this.formatLine('Discounts:', this.formatCurrency(xReport.totals.discount), lineWidth),
      this.formatLine('Tax:', this.formatCurrency(xReport.totals.tax), lineWidth),
      this.formatLine('Net Sales:', this.formatCurrency(xReport.totals.net), lineWidth),
      dashLine,
      this.centerText('PAYMENT METHODS', lineWidth),
      dashLine,
      this.formatLine('Cash:', this.formatCurrency(xReport.totals.cash), lineWidth),
      this.formatLine('Card:', this.formatCurrency(xReport.totals.card), lineWidth),
      this.formatLine('Wallet:', this.formatCurrency(xReport.totals.wallet), lineWidth),
      dashLine,
      this.centerText('CASH EVENTS', lineWidth),
      dashLine,
      this.formatLine('Opening Float:', this.formatCurrency(xReport.session.opening_float), lineWidth),
      this.formatLine('Cash In:', this.formatCurrency(xReport.totals.cash_in), lineWidth),
      this.formatLine('Cash Out:', this.formatCurrency(xReport.totals.cash_out), lineWidth),
      this.formatLine('Expected Cash:', this.formatCurrency(xReport.totals.expected_cash), lineWidth),
      dashLine
    ];

    // Add cash events detail if any
    if (xReport.cashEvents.length > 0) {
      content.push(this.centerText('CASH EVENT DETAILS', lineWidth));
      content.push(dashLine);
      xReport.cashEvents.forEach((event: CashEvent) => {
        const sign = event.type === 'CASH_IN' ? '+' : '-';
        content.push(
          this.formatLine(
            `${event.type} - ${event.reason}:`,
            `${sign}${this.formatCurrency(event.amount)}`,
            lineWidth
          )
        );
      });
      content.push(dashLine);
    }

    const footer = [
      '',
      this.centerText('** MID-SHIFT REPORT **', lineWidth),
      this.centerText('Session continues...', lineWidth),
      '',
      `Printed: ${this.formatDateTime(new Date().toISOString())}`,
      '',
      'Cashier: _______________________',
      '',
      line
    ];

    return { header, content, footer };
  }

  /**
   * Generate Z Report print template
   */
  private generateZReportTemplate(zReport: ZReport, width: '58mm' | '80mm'): PrintTemplate {
    const lineWidth = width === '58mm' ? 32 : 48;
    const line = '='.repeat(lineWidth);
    const dashLine = '-'.repeat(lineWidth);

    const header = [
      this.centerText('Z REPORT (END-OF-SHIFT)', lineWidth),
      line,
      `Session ID: ${zReport.session.id}`,
      `Cashier: ${zReport.session.cashier_name}`,
      `Terminal: ${zReport.session.terminal}`,
      `Started: ${this.formatDateTime(zReport.session.started_at)}`,
      `Ended: ${this.formatDateTime(zReport.ended_at)}`,
      `Closed By: ${zReport.closed_by_name || 'System'}`,
      dashLine
    ];

    const content = [
      this.centerText('SALES SUMMARY', lineWidth),
      dashLine,
      this.formatLine('Invoices:', zReport.totals.invoices.toString(), lineWidth),
      this.formatLine('Gross Sales:', this.formatCurrency(zReport.totals.gross), lineWidth),
      this.formatLine('Discounts:', this.formatCurrency(zReport.totals.discount), lineWidth),
      this.formatLine('Tax:', this.formatCurrency(zReport.totals.tax), lineWidth),
      this.formatLine('Net Sales:', this.formatCurrency(zReport.totals.net), lineWidth),
      dashLine,
      this.centerText('PAYMENT METHODS', lineWidth),
      dashLine,
      this.formatLine('Cash:', this.formatCurrency(zReport.totals.cash), lineWidth),
      this.formatLine('Card:', this.formatCurrency(zReport.totals.card), lineWidth),
      this.formatLine('Wallet:', this.formatCurrency(zReport.totals.wallet), lineWidth),
      dashLine,
      this.centerText('CASH RECONCILIATION', lineWidth),
      dashLine,
      this.formatLine('Opening Float:', this.formatCurrency(zReport.session.opening_float), lineWidth),
      this.formatLine('Cash Sales:', this.formatCurrency(zReport.totals.cash), lineWidth),
      this.formatLine('Cash In:', this.formatCurrency(zReport.totals.cash_in), lineWidth),
      this.formatLine('Cash Out:', this.formatCurrency(zReport.totals.cash_out), lineWidth),
      dashLine,
      this.formatLine('Expected Cash:', this.formatCurrency(zReport.totals.expected_cash), lineWidth),
      this.formatLine('Counted Cash:', this.formatCurrency(zReport.counted_cash), lineWidth),
      this.formatLine('Variance:', this.formatCurrency(zReport.variance), lineWidth, this.getVarianceColor(zReport.variance)),
      dashLine
    ];

    // Add cash events detail if any
    if (zReport.cashEvents.length > 0) {
      content.push(this.centerText('CASH EVENT DETAILS', lineWidth));
      content.push(dashLine);
      zReport.cashEvents.forEach((event: CashEvent) => {
        const sign = event.type === 'CASH_IN' ? '+' : '-';
        content.push(
          this.formatLine(
            `${event.type} - ${event.reason}:`,
            `${sign}${this.formatCurrency(event.amount)}`,
            lineWidth
          )
        );
      });
      content.push(dashLine);
    }

    const footer = [
      '',
      this.centerText('** END OF SHIFT **', lineWidth),
      this.centerText('Session Closed', lineWidth),
      '',
      `Printed: ${this.formatDateTime(new Date().toISOString())}`,
      '',
      'Cashier Signature: _______________',
      '',
      'Manager Signature: _______________',
      '',
      line
    ];

    return { header, content, footer };
  }

  /**
   * Generate No-Sale template
   */
  private generateNoSaleTemplate(reason: string, cashierName: string, width: '58mm' | '80mm'): PrintTemplate {
    const lineWidth = width === '58mm' ? 32 : 48;
    const line = '='.repeat(lineWidth);
    const dashLine = '-'.repeat(lineWidth);

    const header = [
      this.centerText('NO SALE', lineWidth),
      line
    ];

    const content = [
      `Date: ${this.formatDateTime(new Date().toISOString())}`,
      `Cashier: ${cashierName}`,
      `Reason: ${reason}`,
      dashLine,
      this.centerText('DRAWER OPENED', lineWidth),
      this.centerText('No transaction recorded', lineWidth)
    ];

    const footer = [
      dashLine,
      `Time: ${new Date().toLocaleTimeString()}`,
      line
    ];

    return { header, content, footer };
  }

  /**
   * Send print job to printer
   */
  private async print(template: PrintTemplate, options: PrintOptions): Promise<void> {
    try {
      // Combine all template parts
      const printContent = [
        ...template.header,
        ...template.content,
        ...template.footer
      ].join('\n');

      // In a real implementation, this would send to actual printer
      // For now, we'll simulate printing by logging and optionally showing print dialog
      console.log('🖨️ Printing document:');
      console.log(printContent);

      // Open print dialog for browser printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Document</title>
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
        console.log('💰 Opening cash drawer...');
        // In real implementation, would send drawer open command
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
  private formatLine(left: string, right: string, lineWidth: number, color?: string): string {
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
    }).format(amount);
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
   * Get variance color indicator
   */
  private getVarianceColor(variance: number): string {
    const absVariance = Math.abs(variance);
    if (absVariance <= 10) return 'green';
    if (absVariance <= 100) return 'amber';
    return 'red';
  }

  /**
   * Test printer connection
   */
  async testPrinter(): Promise<{ success: boolean; message: string }> {
    try {
      // In real implementation, would test actual printer connection
      console.log('🖨️ Testing printer connection...');
      
      // Simulate test print
      const testTemplate: PrintTemplate = {
        header: ['PRINTER TEST'],
        content: ['This is a test print', 'Date: ' + new Date().toLocaleString()],
        footer: ['Test completed']
      };

      await this.print(testTemplate, { ...this.defaultOptions, copies: 1 });
      
      return {
        success: true,
        message: 'Printer test completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Printer test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const shiftPrintAdapter = new ShiftPrintAdapter();





