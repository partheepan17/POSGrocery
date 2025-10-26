/**
 * Daily Business Summary Service
 * Sends daily business summaries at 7:30 PM local time
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { EmailChannel } from './channels/email';
import { WhatsAppChannel } from './channels/whatsapp';

export interface DailySummaryData {
  date: string;
  totals: {
    gross_sales: number;
    net_sales: number;
    total_discount: number;
    total_tax: number;
    transaction_count: number;
    average_basket: number;
  };
  margin: {
    total_cost: number;
    total_margin: number;
    margin_percentage: number;
  };
  top_skus: Array<{
    product_id: number;
    sku: string;
    name_en: string;
    quantity_sold: number;
    revenue: number;
    margin: number;
  }>;
  low_stock: {
    count: number;
    products: Array<{
      product_id: number;
      sku: string;
      name_en: string;
      current_quantity: number;
      reorder_level: number;
    }>;
  };
  performance: {
    cashier_performance: Array<{
      cashier_id: number;
      cashier_name: string;
      transaction_count: number;
      total_sales: number;
    }>;
    terminal_performance: Array<{
      terminal_name: string;
      transaction_count: number;
      total_sales: number;
    }>;
  };
}

export interface DailySummaryConfig {
  enabled: boolean;
  send_time: string; // HH:MM format
  timezone: string;
  channels: {
    email: {
      enabled: boolean;
      smtp_config?: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
        to: string[];
      };
    };
    whatsapp: {
      enabled: boolean;
      twilio_config?: {
        account_sid: string;
        auth_token: string;
        from_number: string;
        to_numbers: string[];
      };
    };
  };
}

export class DailySummaryService {
  private logger = createContextLogger({ operation: 'daily_summary' });
  private emailChannel: EmailChannel;
  private whatsappChannel: WhatsAppChannel;

  constructor() {
    this.emailChannel = new EmailChannel();
    this.whatsappChannel = new WhatsAppChannel();
  }

  /**
   * Get daily summary configuration from environment variables
   */
  private getConfig(): DailySummaryConfig {
    return {
      enabled: process.env.DAILY_SUMMARY_ENABLED === 'true',
      send_time: process.env.DAILY_SUMMARY_SEND_TIME || '19:30',
      timezone: process.env.TZ || 'Asia/Colombo',
      channels: {
        email: {
          enabled: process.env.DAILY_SUMMARY_EMAIL_ENABLED === 'true',
          smtp_config: {
            host: process.env.DAILY_SUMMARY_EMAIL_SMTP_HOST || '',
            port: parseInt(process.env.DAILY_SUMMARY_EMAIL_SMTP_PORT || '587'),
            user: process.env.DAILY_SUMMARY_EMAIL_SMTP_USER || '',
            pass: process.env.DAILY_SUMMARY_EMAIL_SMTP_PASS || '',
            from: process.env.DAILY_SUMMARY_EMAIL_FROM || '',
            to: process.env.DAILY_SUMMARY_EMAIL_TO?.split(',').map(email => email.trim()) || []
          }
        },
        whatsapp: {
          enabled: process.env.DAILY_SUMMARY_WHATSAPP_ENABLED === 'true',
          twilio_config: {
            account_sid: process.env.TWILIO_ACCOUNT_SID || '',
            auth_token: process.env.TWILIO_AUTH_TOKEN || '',
            from_number: process.env.TWILIO_WHATSAPP_FROM || '',
            to_numbers: process.env.TWILIO_WHATSAPP_TO?.split(',').map(num => num.trim()) || []
          }
        }
      }
    };
  }

  /**
   * Generate daily summary data
   */
  async generateDailySummary(date: string): Promise<DailySummaryData> {
    const db = getDatabase();
    
    this.logger.info({ date }, 'Generating daily summary data');

    try {
      // Get totals for the day
      const totalsResult = db.prepare(`
        SELECT 
          COALESCE(SUM(gross), 0) as gross_sales,
          COALESCE(SUM(net), 0) as net_sales,
          COALESCE(SUM(discount), 0) as total_discount,
          COALESCE(SUM(tax), 0) as total_tax,
          COUNT(*) as transaction_count,
          CASE 
            WHEN COUNT(*) > 0 THEN COALESCE(SUM(net), 0) / COUNT(*) 
            ELSE 0 
          END as average_basket
        FROM invoices
        WHERE DATE(created_at) = ?
      `).get(date) as {
        gross_sales: number;
        net_sales: number;
        total_discount: number;
        total_tax: number;
        transaction_count: number;
        average_basket: number;
      };

      // Get margin data
      const marginResult = db.prepare(`
        SELECT 
          COALESCE(SUM(il.qty * COALESCE(p.cost, 0)), 0) as total_cost,
          COALESCE(SUM(il.total), 0) - COALESCE(SUM(il.qty * COALESCE(p.cost, 0)), 0) as total_margin
        FROM invoices i
        JOIN invoice_lines il ON i.id = il.invoice_id
        JOIN products p ON il.product_id = p.id
        WHERE DATE(i.created_at) = ?
      `).get(date) as {
        total_cost: number;
        total_margin: number;
      };

      const margin_percentage = marginResult.total_cost > 0 
        ? (marginResult.total_margin / (marginResult.total_cost + marginResult.total_margin)) * 100 
        : 0;

      // Get top 5 SKUs
      const topSkus = db.prepare(`
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          SUM(il.qty) as quantity_sold,
          SUM(il.total) as revenue,
          SUM(il.total) - SUM(il.qty * COALESCE(p.cost, 0)) as margin
        FROM invoices i
        JOIN invoice_lines il ON i.id = il.invoice_id
        JOIN products p ON il.product_id = p.id
        WHERE DATE(i.created_at) = ?
        GROUP BY p.id, p.sku, p.name_en
        ORDER BY revenue DESC
        LIMIT 5
      `).all(date) as Array<{
        product_id: number;
        sku: string;
        name_en: string;
        quantity_sold: number;
        revenue: number;
        margin: number;
      }>;

      // Get low stock products
      const lowStockProducts = db.prepare(`
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          COALESCE(ps.current_quantity, 0) as current_quantity,
          COALESCE(p.reorder_level, 0) as reorder_level
        FROM products p
        LEFT JOIN product_stock ps ON p.id = ps.product_id
        WHERE p.is_active = 1
          AND (COALESCE(ps.current_quantity, 0) <= COALESCE(p.reorder_level, 0)
               OR COALESCE(ps.current_quantity, 0) = 0)
        ORDER BY COALESCE(ps.current_quantity, 0) ASC
        LIMIT 10
      `).all() as Array<{
        product_id: number;
        sku: string;
        name_en: string;
        current_quantity: number;
        reorder_level: number;
      }>;

      // Get cashier performance
      const cashierPerformance = db.prepare(`
        SELECT 
          i.cashier_id,
          u.name as cashier_name,
          COUNT(*) as transaction_count,
          SUM(i.net) as total_sales
        FROM invoices i
        LEFT JOIN users u ON i.cashier_id = u.id
        WHERE DATE(i.created_at) = ?
        GROUP BY i.cashier_id, u.name
        ORDER BY total_sales DESC
        LIMIT 5
      `).all(date) as Array<{
        cashier_id: number;
        cashier_name: string;
        transaction_count: number;
        total_sales: number;
      }>;

      // Get terminal performance
      const terminalPerformance = db.prepare(`
        SELECT 
          i.terminal_name,
          COUNT(*) as transaction_count,
          SUM(i.net) as total_sales
        FROM invoices i
        WHERE DATE(i.created_at) = ? AND i.terminal_name IS NOT NULL
        GROUP BY i.terminal_name
        ORDER BY total_sales DESC
        LIMIT 5
      `).all(date) as Array<{
        terminal_name: string;
        transaction_count: number;
        total_sales: number;
      }>;

      const summary: DailySummaryData = {
        date,
        totals: {
          gross_sales: totalsResult.gross_sales,
          net_sales: totalsResult.net_sales,
          total_discount: totalsResult.total_discount,
          total_tax: totalsResult.total_tax,
          transaction_count: totalsResult.transaction_count,
          average_basket: totalsResult.average_basket
        },
        margin: {
          total_cost: marginResult.total_cost,
          total_margin: marginResult.total_margin,
          margin_percentage
        },
        top_skus: topSkus,
        low_stock: {
          count: lowStockProducts.length,
          products: lowStockProducts
        },
        performance: {
          cashier_performance: cashierPerformance,
          terminal_performance: terminalPerformance
        }
      };

      this.logger.info({ 
        date,
        transactionCount: summary.totals.transaction_count,
        netSales: summary.totals.net_sales,
        lowStockCount: summary.low_stock.count
      }, 'Daily summary data generated');

      return summary;

    } catch (error) {
      this.logger.error('Failed to generate daily summary', { 
        error: error.message,
        date
      });
      throw error;
    }
  }

  /**
   * Format daily summary for email
   */
  private formatEmailSummary(summary: DailySummaryData): string {
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-LK', { 
        style: 'currency', 
        currency: 'LKR',
        minimumFractionDigits: 2 
      }).format(amount);

    const formatDate = (dateStr: string) => 
      new Date(dateStr).toLocaleDateString('en-LK', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 24px; font-weight: bold; color: #27ae60; }
        .metric-label { font-size: 14px; color: #7f8c8d; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th, .table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background-color: #f8f9fa; font-weight: bold; }
        .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Daily Business Summary</h1>
        <p>${formatDate(summary.date)}</p>
    </div>
    
    <div class="content">
        <!-- Totals Section -->
        <div class="section">
            <h2>💰 Daily Totals</h2>
            <div class="metric">
                <div class="metric-value">${formatCurrency(summary.totals.net_sales)}</div>
                <div class="metric-label">Net Sales</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.totals.transaction_count}</div>
                <div class="metric-label">Transactions</div>
            </div>
            <div class="metric">
                <div class="metric-value">${formatCurrency(summary.totals.average_basket)}</div>
                <div class="metric-label">Avg Basket</div>
            </div>
            <div class="metric">
                <div class="metric-value">${formatCurrency(summary.totals.total_discount)}</div>
                <div class="metric-label">Discounts</div>
            </div>
        </div>

        <!-- Margin Section -->
        <div class="section">
            <h2>📈 Profit Margin</h2>
            <div class="metric">
                <div class="metric-value">${formatCurrency(summary.margin.total_margin)}</div>
                <div class="metric-label">Total Margin</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.margin.margin_percentage.toFixed(1)}%</div>
                <div class="metric-label">Margin %</div>
            </div>
            <div class="metric">
                <div class="metric-value">${formatCurrency(summary.margin.total_cost)}</div>
                <div class="metric-label">Total Cost</div>
            </div>
        </div>

        <!-- Top SKUs Section -->
        <div class="section">
            <h2>🏆 Top 5 SKUs</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Qty Sold</th>
                        <th>Revenue</th>
                        <th>Margin</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.top_skus.map(sku => `
                        <tr>
                            <td>${sku.sku}</td>
                            <td>${sku.name_en}</td>
                            <td>${sku.quantity_sold}</td>
                            <td>${formatCurrency(sku.revenue)}</td>
                            <td>${formatCurrency(sku.margin)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Low Stock Section -->
        <div class="section">
            <h2>⚠️ Low Stock Alert</h2>
            ${summary.low_stock.count > 0 ? `
                <div class="alert">
                    <strong>${summary.low_stock.count} products need attention!</strong>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Product</th>
                            <th>Current Qty</th>
                            <th>Reorder Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summary.low_stock.products.map(product => `
                            <tr>
                                <td>${product.sku}</td>
                                <td>${product.name_en}</td>
                                <td>${product.current_quantity}</td>
                                <td>${product.reorder_level}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p>✅ All products are well stocked!</p>'}
        </div>

        <!-- Performance Section -->
        <div class="section">
            <h2>👥 Performance</h2>
            <h3>Top Cashiers</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Cashier</th>
                        <th>Transactions</th>
                        <th>Total Sales</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.performance.cashier_performance.map(cashier => `
                        <tr>
                            <td>${cashier.cashier_name || 'Unknown'}</td>
                            <td>${cashier.transaction_count}</td>
                            <td>${formatCurrency(cashier.total_sales)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    
    <div class="footer">
        <p>Generated at ${new Date().toLocaleString('en-LK')} | POS System</p>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format daily summary for WhatsApp
   */
  private formatWhatsAppSummary(summary: DailySummaryData): string {
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-LK', { 
        style: 'currency', 
        currency: 'LKR',
        minimumFractionDigits: 0 
      }).format(amount);

    const formatDate = (dateStr: string) => 
      new Date(dateStr).toLocaleDateString('en-LK', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });

    return `📊 *Daily Business Summary - ${formatDate(summary.date)}*

💰 *TOTALS*
• Net Sales: ${formatCurrency(summary.totals.net_sales)}
• Transactions: ${summary.totals.transaction_count}
• Avg Basket: ${formatCurrency(summary.totals.average_basket)}
• Discounts: ${formatCurrency(summary.totals.total_discount)}

📈 *MARGIN*
• Total Margin: ${formatCurrency(summary.margin.total_margin)}
• Margin %: ${summary.margin.margin_percentage.toFixed(1)}%
• Total Cost: ${formatCurrency(summary.margin.total_cost)}

🏆 *TOP 5 SKUs*
${summary.top_skus.map((sku, index) => 
  `${index + 1}. ${sku.sku} - ${sku.name_en}
   Qty: ${sku.quantity_sold} | Revenue: ${formatCurrency(sku.revenue)}`
).join('\n')}

⚠️ *LOW STOCK*
${summary.low_stock.count > 0 
  ? `${summary.low_stock.count} products need attention!` 
  : '✅ All products well stocked!'}

👥 *TOP CASHIER*
${summary.performance.cashier_performance.length > 0 
  ? `${summary.performance.cashier_performance[0].cashier_name}: ${summary.performance.cashier_performance[0].transaction_count} transactions (${formatCurrency(summary.performance.cashier_performance[0].total_sales)})`
  : 'No data available'}

---
Generated: ${new Date().toLocaleString('en-LK')}`;
  }

  /**
   * Send daily summary through configured channels
   */
  async sendDailySummary(summary: DailySummaryData): Promise<void> {
    const config = this.getConfig();
    
    if (!config.enabled) {
      this.logger.info('Daily summary is disabled');
      return;
    }

    this.logger.info({ 
      date: summary.date,
      channels: Object.keys(config.channels).filter(key => config.channels[key as keyof typeof config.channels].enabled)
    }, 'Sending daily summary');

    const promises: Promise<void>[] = [];

    // Send email summary
    if (config.channels.email.enabled && config.channels.email.smtp_config) {
      const emailContent = this.formatEmailSummary(summary);
      const subject = `Daily Business Summary - ${summary.date}`;
      
      promises.push(
        this.emailChannel.sendStyledAlert(
          subject,
          emailContent,
          config.channels.email.smtp_config
        ).catch(error => {
          this.logger.error('Failed to send email summary', { error: error.message });
        })
      );
    }

    // Send WhatsApp summary
    if (config.channels.whatsapp.enabled && config.channels.whatsapp.twilio_config) {
      const whatsappContent = this.formatWhatsAppSummary(summary);
      
      promises.push(
        this.whatsappChannel.sendAlert(
          whatsappContent,
          config.channels.whatsapp.twilio_config
        ).catch(error => {
          this.logger.error('Failed to send WhatsApp summary', { error: error.message });
        })
      );
    }

    // Wait for all channels to complete
    await Promise.allSettled(promises);
    
    this.logger.info({ 
      date: summary.date,
      channelsSent: promises.length
    }, 'Daily summary sent successfully');
  }

  /**
   * Generate and send daily summary for a specific date
   */
  async generateAndSendSummary(date: string): Promise<void> {
    try {
      const summary = await this.generateDailySummary(date);
      await this.sendDailySummary(summary);
    } catch (error) {
      this.logger.error('Failed to generate and send daily summary', { 
        error: error.message,
        date
      });
      throw error;
    }
  }

  /**
   * Generate and send today's summary
   */
  async generateAndSendTodaysSummary(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.generateAndSendSummary(today);
  }

  /**
   * Test daily summary configuration
   */
  async testSummary(): Promise<void> {
    const config = this.getConfig();
    
    if (!config.enabled) {
      throw new Error('Daily summary is disabled');
    }

    // Generate test summary with sample data
    const testSummary: DailySummaryData = {
      date: new Date().toISOString().split('T')[0],
      totals: {
        gross_sales: 50000,
        net_sales: 45000,
        total_discount: 2000,
        total_tax: 3000,
        transaction_count: 25,
        average_basket: 1800
      },
      margin: {
        total_cost: 30000,
        total_margin: 15000,
        margin_percentage: 33.3
      },
      top_skus: [
        {
          product_id: 1,
          sku: 'TEST-001',
          name_en: 'Test Product 1',
          quantity_sold: 10,
          revenue: 5000,
          margin: 1500
        }
      ],
      low_stock: {
        count: 2,
        products: [
          {
            product_id: 2,
            sku: 'LOW-001',
            name_en: 'Low Stock Product',
            current_quantity: 5,
            reorder_level: 10
          }
        ]
      },
      performance: {
        cashier_performance: [
          {
            cashier_id: 1,
            cashier_name: 'Test Cashier',
            transaction_count: 15,
            total_sales: 30000
          }
        ],
        terminal_performance: [
          {
            terminal_name: 'Terminal-01',
            transaction_count: 20,
            total_sales: 40000
          }
        ]
      }
    };

    await this.sendDailySummary(testSummary);
    this.logger.info('Test daily summary sent');
  }
}

// Export singleton instance
export const dailySummaryService = new DailySummaryService();










