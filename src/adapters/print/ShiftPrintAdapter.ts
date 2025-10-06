import { ShiftSummary } from '../../types';

export interface ShiftPrintData {
  summary: ShiftSummary;
  reportType: 'X' | 'Z';
  storeInfo: {
    name: string;
    address: string;
    phone?: string;
  };
}

export class ShiftPrintAdapter {
  /**
   * Render X Report (mid-shift snapshot)
   */
  renderX(data: ShiftPrintData): string {
    const { summary, storeInfo } = data;
    const { shift, sales, payments, cashDrawer } = summary;
    
    const currentTime = new Date().toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>X Report - ${shift.terminal_name}</title>
          <style>
            ${this.getStyles()}
          </style>
        </head>
        <body>
          <div class="receipt">
            ${this.renderHeader(storeInfo, 'X REPORT', shift.terminal_name, currentTime)}
            ${this.renderShiftInfo(shift, 'X')}
            ${this.renderSalesSection(sales)}
            ${this.renderPaymentsSection(payments)}
            ${this.renderCashDrawerSection(cashDrawer, 'X')}
            ${this.renderFooter(storeInfo, 'X')}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Render Z Report (end-of-shift)
   */
  renderZ(data: ShiftPrintData): string {
    const { summary, storeInfo } = data;
    const { shift, sales, payments, cashDrawer } = summary;
    
    const closeTime = shift.closed_at ? new Date(shift.closed_at).toLocaleString() : new Date().toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Z Report - ${shift.terminal_name}</title>
          <style>
            ${this.getStyles()}
          </style>
        </head>
        <body>
          <div class="receipt">
            ${this.renderHeader(storeInfo, 'Z REPORT', shift.terminal_name, closeTime)}
            ${this.renderShiftInfo(shift, 'Z')}
            ${this.renderSalesSection(sales)}
            ${this.renderPaymentsSection(payments)}
            ${this.renderCashDrawerSection(cashDrawer, 'Z')}
            ${this.renderFooter(storeInfo, 'Z')}
          </div>
        </body>
      </html>
    `;
  }

  private renderHeader(storeInfo: { name: string; address: string; phone?: string }, reportType: string, terminal: string, timestamp: string): string {
    return `
      <div class="header">
        <div class="store-name">${storeInfo.name}</div>
        <div class="store-address">${storeInfo.address}</div>
        ${storeInfo.phone ? `<div class="store-phone">${storeInfo.phone}</div>` : ''}
        <div class="report-title">${reportType} REPORT</div>
        <div class="terminal">Terminal: ${terminal}</div>
        <div class="timestamp">${timestamp}</div>
        <div class="divider"></div>
      </div>
    `;
  }

  private renderShiftInfo(shift: import('../../types').Shift, reportType: string): string {
    const openedAt = shift.opened_at ? new Date(shift.opened_at).toLocaleString() : 'N/A';
    const closedAt = shift.closed_at ? new Date(shift.closed_at).toLocaleString() : 'N/A';
    
    return `
      <div class="section">
        <div class="section-title">SHIFT INFORMATION</div>
        <div class="info-row">
          <span>Shift ID:</span>
          <span>${shift.id || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span>Cashier ID:</span>
          <span>${shift.cashier_id}</span>
        </div>
        <div class="info-row">
          <span>Opened:</span>
          <span>${openedAt}</span>
        </div>
        ${reportType === 'Z' ? `
          <div class="info-row">
            <span>Closed:</span>
            <span>${closedAt}</span>
          </div>
        ` : ''}
        <div class="info-row">
          <span>Status:</span>
          <span class="status-${shift.status?.toLowerCase() || 'open'}">${shift.status || 'OPEN'}</span>
        </div>
      </div>
    `;
  }

  private renderSalesSection(sales: { invoices: number; gross: number; discount: number; tax: number; net: number }): string {
    return `
      <div class="section">
        <div class="section-title">SALES SUMMARY</div>
        <div class="info-row">
          <span>Invoices:</span>
          <span>${sales.invoices}</span>
        </div>
        <div class="info-row">
          <span>Gross Sales:</span>
          <span>${this.formatCurrency(sales.gross)}</span>
        </div>
        <div class="info-row">
          <span>Discounts:</span>
          <span>${this.formatCurrency(sales.discount)}</span>
        </div>
        <div class="info-row">
          <span>Tax:</span>
          <span>${this.formatCurrency(sales.tax)}</span>
        </div>
        <div class="info-row total">
          <span>Net Sales:</span>
          <span>${this.formatCurrency(sales.net)}</span>
        </div>
      </div>
    `;
  }

  private renderPaymentsSection(payments: { cash: number; card: number; wallet: number; other?: number }): string {
    return `
      <div class="section">
        <div class="section-title">PAYMENT BREAKDOWN</div>
        <div class="info-row">
          <span>Cash:</span>
          <span>${this.formatCurrency(payments.cash)}</span>
        </div>
        <div class="info-row">
          <span>Card:</span>
          <span>${this.formatCurrency(payments.card)}</span>
        </div>
        <div class="info-row">
          <span>Wallet:</span>
          <span>${this.formatCurrency(payments.wallet)}</span>
        </div>
        ${payments.other && payments.other > 0 ? `
          <div class="info-row">
            <span>Other:</span>
            <span>${this.formatCurrency(payments.other)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderCashDrawerSection(cashDrawer: { opening: number; cashIn: number; cashOut: number; drops: number; pickups?: number; petty: number; expectedCash: number; declaredCash?: number | null; variance?: number | null }, reportType: string): string {
    return `
      <div class="section">
        <div class="section-title">CASH DRAWER</div>
        <div class="info-row">
          <span>Opening Cash:</span>
          <span>${this.formatCurrency(cashDrawer.opening)}</span>
        </div>
        <div class="info-row">
          <span>Cash Sales:</span>
          <span>${this.formatCurrency(cashDrawer.cashIn)}</span>
        </div>
        <div class="info-row">
          <span>Cash In:</span>
          <span>+${this.formatCurrency(cashDrawer.cashIn)}</span>
        </div>
        <div class="info-row">
          <span>Cash Out:</span>
          <span>-${this.formatCurrency(cashDrawer.cashOut)}</span>
        </div>
        <div class="info-row">
          <span>Drops:</span>
          <span>-${this.formatCurrency(cashDrawer.drops)}</span>
        </div>
        <div class="info-row">
          <span>Petty Cash:</span>
          <span>-${this.formatCurrency(cashDrawer.petty)}</span>
        </div>
        <div class="info-row total">
          <span>Expected Cash:</span>
          <span>${this.formatCurrency(cashDrawer.expectedCash)}</span>
        </div>
        ${reportType === 'Z' && cashDrawer.declaredCash !== null && cashDrawer.declaredCash !== undefined ? `
          <div class="info-row">
            <span>Declared Cash:</span>
            <span>${this.formatCurrency(cashDrawer.declaredCash!)}</span>
          </div>
          <div class="info-row ${(cashDrawer.variance || 0) === 0 ? 'variance-zero' : (cashDrawer.variance || 0) > 0 ? 'variance-positive' : 'variance-negative'}">
            <span>Variance:</span>
            <span>${(cashDrawer.variance || 0) >= 0 ? '+' : ''}${this.formatCurrency(cashDrawer.variance || 0)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderFooter(storeInfo: { name: string; address: string; phone?: string }, reportType: string): string {
    const footerText = reportType === 'X' ? 'Thank you' : 'End of Day';
    
    return `
      <div class="footer">
        <div class="divider"></div>
        <div class="footer-text">${footerText}</div>
        <div class="print-time">Printed: ${new Date().toLocaleString()}</div>
      </div>
    `;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  private getStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        color: #000;
        background: #fff;
      }
      
      .receipt {
        max-width: 300px;
        margin: 0 auto;
        padding: 10px;
        background: white;
      }
      
      .header {
        text-align: center;
        margin-bottom: 15px;
      }
      
      .store-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .store-address {
        font-size: 11px;
        margin-bottom: 3px;
      }
      
      .store-phone {
        font-size: 11px;
        margin-bottom: 5px;
      }
      
      .report-title {
        font-size: 14px;
        font-weight: bold;
        margin: 8px 0;
        text-decoration: underline;
      }
      
      .terminal {
        font-size: 11px;
        margin-bottom: 3px;
      }
      
      .timestamp {
        font-size: 11px;
        margin-bottom: 8px;
      }
      
      .divider {
        border-top: 1px dashed #000;
        margin: 8px 0;
      }
      
      .section {
        margin-bottom: 15px;
      }
      
      .section-title {
        font-weight: bold;
        text-align: center;
        margin-bottom: 8px;
        text-decoration: underline;
      }
      
      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
        font-size: 11px;
      }
      
      .info-row.total {
        font-weight: bold;
        border-top: 1px solid #000;
        padding-top: 3px;
        margin-top: 5px;
      }
      
      .status-open {
        color: #f59e0b;
        font-weight: bold;
      }
      
      .status-closed {
        color: #10b981;
        font-weight: bold;
      }
      
      .status-void {
        color: #ef4444;
        font-weight: bold;
      }
      
      .variance-zero {
        color: #10b981;
        font-weight: bold;
      }
      
      .variance-positive {
        color: #3b82f6;
        font-weight: bold;
      }
      
      .variance-negative {
        color: #ef4444;
        font-weight: bold;
      }
      
      .footer {
        margin-top: 20px;
        text-align: center;
      }
      
      .footer-text {
        font-size: 11px;
        margin: 8px 0;
      }
      
      .print-time {
        font-size: 10px;
        color: #666;
      }
      
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        
        .receipt {
          max-width: none;
          margin: 0;
          padding: 5px;
        }
      }
    `;
  }
}

export const shiftPrintAdapter = new ShiftPrintAdapter();
