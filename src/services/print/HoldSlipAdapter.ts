/**
 * Hold Slip Print Adapter
 * Handles printing of hold slips for parked sales
 */

import { HoldSale } from '../holdService';

export interface HoldSlipData {
  hold: HoldSale;
  store_info: {
    name: string;
    address: string;
  };
}

export interface HoldSlipOptions {
  printerWidth: '58mm' | '80mm';
  copies: number;
  cutPaper: boolean;
}

export interface HoldSlipTemplate {
  header: string[];
  content: string[];
  footer: string[];
}

class HoldSlipAdapter {
  private readonly defaultOptions: HoldSlipOptions = {
    printerWidth: '80mm',
    copies: 1,
    cutPaper: true
  };

  /**
   * Print hold slip
   */
  async printHoldSlip(holdData: HoldSlipData, options: Partial<HoldSlipOptions> = {}): Promise<void> {
    try {
      const printOptions = { ...this.defaultOptions, ...options };
      const template = this.generateHoldSlipTemplate(holdData, printOptions.printerWidth);
      
      await this.print(template, printOptions);
      console.log('✅ Hold slip printed successfully');
    } catch (error) {
      console.error('❌ Failed to print hold slip:', error);
      throw error;
    }
  }

  /**
   * Generate hold slip template
   */
  private generateHoldSlipTemplate(holdData: HoldSlipData, width: '58mm' | '80mm'): HoldSlipTemplate {
    const lineWidth = width === '58mm' ? 32 : 48;
    const line = '='.repeat(lineWidth);
    const dashLine = '-'.repeat(lineWidth);

    const header = [
      this.centerText(holdData.store_info.name, lineWidth),
      this.centerText(holdData.store_info.address.replace(/\n/g, ' '), lineWidth),
      line,
      '',
      this.centerText('*** HOLD SLIP ***', lineWidth),
      this.centerText('*** NOT A FISCAL RECEIPT ***', lineWidth),
      '',
      line
    ];

    const content = [
      `Hold Name: ${holdData.hold.hold_name}`,
      `Created: ${this.formatDateTime(holdData.hold.created_at)}`,
      `Cashier: ${holdData.hold.cashier_name || 'Unknown'}`,
      `Terminal: ${holdData.hold.terminal_name}`,
      ...(holdData.hold.customer_name ? [`Customer: ${holdData.hold.customer_name}`] : []),
      ...(holdData.hold.expires_at ? [`Expires: ${this.formatDateTime(holdData.hold.expires_at)}`] : []),
      ...(holdData.hold.hold_note ? [`Note: ${holdData.hold.hold_note}`] : []),
      dashLine,
      this.centerText('HELD ITEMS', lineWidth),
      dashLine
    ];

    // Add up to 6 items (or all if fewer)
    const itemsToShow = holdData.hold.lines?.slice(0, 6) || [];
    itemsToShow.forEach(line => {
      const itemName = line.product_name.length > (lineWidth - 10) 
        ? line.product_name.substring(0, lineWidth - 13) + '...'
        : line.product_name;
      
      content.push(`${line.quantity}x ${itemName}`);
      content.push(
        this.formatLine(
          `  ${line.product_sku}`,
          this.formatCurrency(line.unit_price),
          lineWidth
        )
      );
    });

    // Show "and X more items" if truncated
    const totalItems = holdData.hold.items_count;
    if (totalItems > 6) {
      content.push('');
      content.push(this.centerText(`... and ${totalItems - 6} more items`, lineWidth));
    }

    content.push(dashLine);
    content.push(
      this.formatLine('Total Items:', totalItems.toString(), lineWidth)
    );
    content.push(
      this.formatLine('Hold Total:', this.formatCurrency(holdData.hold.net), lineWidth)
    );

    const footer = [
      dashLine,
      '',
      this.centerText('HOLD INFORMATION', lineWidth),
      this.centerText('This is a hold slip for reference only.', lineWidth),
      this.centerText('Items are reserved but not sold.', lineWidth),
      this.centerText('Present this slip to resume the sale.', lineWidth),
      '',
      ...(holdData.hold.expires_at ? [
        this.centerText('Hold expires:', lineWidth),
        this.centerText(this.formatDateTime(holdData.hold.expires_at), lineWidth),
        ''
      ] : []),
      `Printed: ${this.formatDateTime(new Date().toISOString())}`,
      '',
      line
    ];

    return { header, content, footer };
  }

  /**
   * Send print job to printer
   */
  private async print(template: HoldSlipTemplate, options: HoldSlipOptions): Promise<void> {
    try {
      // Combine all template parts
      const printContent = [
        ...template.header,
        ...template.content,
        ...template.footer
      ].join('\n');

      // In a real implementation, this would send to actual printer
      console.log('🖨️ Printing hold slip:');
      console.log(printContent);

      // Open print dialog for browser printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Hold Slip</title>
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
      hour12: true
    });
  }

  /**
   * Test printer connection
   */
  async testPrinter(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🖨️ Testing hold slip printer connection...');
      
      const testTemplate: HoldSlipTemplate = {
        header: ['HOLD SLIP PRINTER TEST'],
        content: ['This is a test print for hold slips', 'Date: ' + new Date().toLocaleString()],
        footer: ['Test completed']
      };

      await this.print(testTemplate, { ...this.defaultOptions, copies: 1 });
      
      return {
        success: true,
        message: 'Hold slip printer test completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Hold slip printer test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const holdSlipAdapter = new HoldSlipAdapter();


