import { createPrintAdapter, PrintAdapter, ReceiptData } from '@/adapters/PrintAdapter';

export interface CashBalanceData {
  terminal: string;
  shiftId: number;
  openedAt?: string;
  cashierId: number;
  cashBalance: {
    opening: number;
    cashSales: number;
    refunds: number;
    movements: {
      cashIn: number;
      cashOut: number;
      drops: number;
      pickups: number;
      petty: number;
    };
    expectedCash: number;
  };
}

class PrintService {
  private adapter: PrintAdapter;

  constructor() {
    this.adapter = createPrintAdapter();
  }

  /**
   * Print cash balance report
   */
  async printCashBalance(data: CashBalanceData): Promise<void> {
    const receiptData: ReceiptData = {
      header: {
        title: 'CASH BALANCE REPORT',
        subtitle: 'Day-End Summary',
        address: 'POS Terminal System',
      },
      items: [], // No items for cash balance
      totals: {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: data.cashBalance.expectedCash,
      },
      footer: {
        thankYou: 'Please count cash and verify balance',
        website: 'POS System',
      },
      metadata: {
        receiptNumber: `CASH-${data.shiftId}`,
        date: new Date(),
        cashier: `Cashier #${data.cashierId}`,
      },
    };

    const settings = {
      paperSize: '80mm' as const,
      copies: 1,
      orientation: 'portrait' as const,
      margins: {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5,
      },
      fontSize: 10,
      fontFamily: 'monospace',
    };

    // Create custom HTML for cash balance
    const html = await this.generateCashBalanceHTML(data);
    await this.printHTML(html);
  }

  /**
   * Generate HTML for cash balance report
   */
  private async generateCashBalanceHTML(data: CashBalanceData): Promise<string> {
    const formatCurrency = (amount: number) => `රු ${amount.toFixed(2)}`;
    const formatDate = (dateString?: string) => 
      dateString ? new Date(dateString).toLocaleString() : 'N/A';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Cash Balance Report</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 5mm;
              }
            }
            
            body {
              font-family: monospace;
              font-size: 10px;
              line-height: 1.2;
              margin: 0;
              padding: 0;
              color: #000;
              background: #fff;
              width: 80mm;
              max-width: 80mm;
            }
            
            .receipt {
              width: 100%;
              max-width: 80mm;
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
              font-size: 14px;
              font-weight: bold;
            }
            
            .header h2 {
              margin: 5px 0 0 0;
              font-size: 12px;
              font-weight: normal;
            }
            
            .header p {
              margin: 2px 0;
              font-size: 10px;
            }
            
            .section {
              margin: 10px 0;
            }
            
            .section-title {
              font-weight: bold;
              font-size: 11px;
              margin-bottom: 5px;
              border-bottom: 1px solid #000;
              padding-bottom: 2px;
            }
            
            .balance-line {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
              font-size: 10px;
            }
            
            .balance-line.total {
              border-top: 1px solid #000;
              padding-top: 5px;
              font-weight: bold;
              font-size: 12px;
            }
            
            .balance-line.positive {
              color: #006400;
            }
            
            .balance-line.negative {
              color: #8B0000;
            }
            
            .metadata {
              margin: 10px 0;
              font-size: 9px;
              color: #666;
            }
            
            .metadata div {
              margin: 1px 0;
            }
            
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 9px;
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
            <div class="header">
              <h1>CASH BALANCE REPORT</h1>
              <h2>Day-End Summary</h2>
              <p>POS Terminal System</p>
            </div>
            
            <div class="metadata">
              <div><strong>Terminal:</strong> ${data.terminal}</div>
              <div><strong>Shift ID:</strong> #${data.shiftId}</div>
              <div><strong>Opened:</strong> ${formatDate(data.openedAt)}</div>
              <div><strong>Cashier:</strong> #${data.cashierId}</div>
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            </div>
            
            <div class="section">
              <div class="section-title">CASH BALANCE CALCULATION</div>
              
              <div class="balance-line">
                <span>Opening Cash:</span>
                <span>${formatCurrency(data.cashBalance.opening)}</span>
              </div>
              
              <div class="balance-line positive">
                <span>+ Cash Sales:</span>
                <span>${formatCurrency(data.cashBalance.cashSales)}</span>
              </div>
              
              <div class="balance-line negative">
                <span>- Refunds:</span>
                <span>${formatCurrency(data.cashBalance.refunds)}</span>
              </div>
              
              <div class="balance-line positive">
                <span>+ Cash In:</span>
                <span>${formatCurrency(data.cashBalance.movements.cashIn)}</span>
              </div>
              
              <div class="balance-line negative">
                <span>- Cash Out:</span>
                <span>${formatCurrency(data.cashBalance.movements.cashOut)}</span>
              </div>
              
              <div class="balance-line negative">
                <span>- Safe Drops:</span>
                <span>${formatCurrency(data.cashBalance.movements.drops)}</span>
              </div>
              
              <div class="balance-line negative">
                <span>- Petty Cash:</span>
                <span>${formatCurrency(data.cashBalance.movements.petty)}</span>
              </div>
              
              <div class="balance-line total">
                <span>EXPECTED CASH:</span>
                <span>${formatCurrency(data.cashBalance.expectedCash)}</span>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">CASH MOVEMENTS</div>
              
              <div class="balance-line">
                <span>Cash In:</span>
                <span>${formatCurrency(data.cashBalance.movements.cashIn)}</span>
              </div>
              
              <div class="balance-line">
                <span>Cash Out:</span>
                <span>${formatCurrency(data.cashBalance.movements.cashOut)}</span>
              </div>
              
              <div class="balance-line">
                <span>Safe Drops:</span>
                <span>${formatCurrency(data.cashBalance.movements.drops)}</span>
              </div>
              
              <div class="balance-line">
                <span>Pickups:</span>
                <span>${formatCurrency(data.cashBalance.movements.pickups)}</span>
              </div>
              
              <div class="balance-line">
                <span>Petty Cash:</span>
                <span>${formatCurrency(data.cashBalance.movements.petty)}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Please count cash and verify balance</p>
              <p>POS System</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Print HTML content
   */
  private async printHTML(html: string): Promise<void> {
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

  /**
   * Print Z Report
   */
  async printZReport(shiftId: number): Promise<void> {
    // This would integrate with existing Z report functionality
    // For now, we'll just show a message
    console.log(`Printing Z Report for shift ${shiftId}`);
    // TODO: Implement Z report printing
  }
}

export const printService = new PrintService();

