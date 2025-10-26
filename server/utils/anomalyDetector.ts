/**
 * Anomaly Detection Engine
 * Detects unusual patterns in sales data
 */

import { getDatabase } from '../db';
import { createContextLogger } from './logger';

export interface AnomalyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  window_days: number;
  category: 'sales_volume' | 'margin' | 'voids' | 'discounts' | 'timing';
}

export interface AnomalyDetection {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: string;
  description: string;
  detected_at: string;
  value: number;
  threshold: number;
  deviation: number;
  context: {
    invoice_id?: number;
    receipt_no?: string;
    cashier_id?: number;
    cashier_name?: string;
    product_id?: number;
    product_name?: string;
    terminal_name?: string;
    customer_id?: number;
    customer_name?: string;
  };
  metadata: Record<string, any>;
}

export interface AnomalySummary {
  total_anomalies: number;
  by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_category: {
    sales_volume: number;
    margin: number;
    voids: number;
    discounts: number;
    timing: number;
  };
  by_rule: Record<string, number>;
  time_range: {
    start: string;
    end: string;
  };
}

export class AnomalyDetector {
  private logger = createContextLogger({ operation: 'anomaly_detector' });
  private rules: Map<string, AnomalyRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default anomaly detection rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AnomalyRule[] = [
      {
        id: 'sales_spike',
        name: 'Sales Volume Spike',
        description: 'Detects sudden spikes in sales volume (>3x rolling 7-day average)',
        enabled: true,
        severity: 'high',
        threshold: 3.0,
        window_days: 7,
        category: 'sales_volume'
      },
      {
        id: 'zero_margin',
        name: 'Zero/Negative Margin Sale',
        description: 'Detects sales with zero or negative profit margins',
        enabled: true,
        severity: 'critical',
        threshold: 0.0,
        window_days: 1,
        category: 'margin'
      },
      {
        id: 'frequent_voids',
        name: 'Frequent Voids',
        description: 'Detects cashiers with unusually high void frequency (>20% of transactions)',
        enabled: true,
        severity: 'medium',
        threshold: 0.2,
        window_days: 7,
        category: 'voids'
      },
      {
        id: 'excessive_discounts',
        name: 'Excessive Discounts',
        description: 'Detects transactions with unusually high discount percentages (>50%)',
        enabled: true,
        severity: 'medium',
        threshold: 0.5,
        window_days: 1,
        category: 'discounts'
      },
      {
        id: 'off_hours_sales',
        name: 'Off-Hours Sales',
        description: 'Detects sales outside normal business hours (before 6 AM or after 10 PM)',
        enabled: true,
        severity: 'low',
        threshold: 0,
        window_days: 1,
        category: 'timing'
      },
      {
        id: 'large_transaction',
        name: 'Large Transaction',
        description: 'Detects unusually large transactions (>LKR 50,000)',
        enabled: true,
        severity: 'medium',
        threshold: 50000,
        window_days: 1,
        category: 'sales_volume'
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    this.logger.info({ rulesCount: this.rules.size }, 'Initialized anomaly detection rules');
  }

  /**
   * Detect anomalies for a given date range
   */
  async detectAnomalies(startDate: string, endDate: string): Promise<AnomalyDetection[]> {
    const db = getDatabase();
    const anomalies: AnomalyDetection[] = [];

    this.logger.info({ startDate, endDate }, 'Starting anomaly detection');

    try {
      // Run all enabled rules
      for (const [ruleId, rule] of this.rules) {
        if (!rule.enabled) continue;

        this.logger.debug({ ruleId, ruleName: rule.name }, 'Running anomaly rule');

        try {
          const ruleAnomalies = await this.runRule(rule, startDate, endDate);
          anomalies.push(...ruleAnomalies);
        } catch (error) {
          this.logger.error('Failed to run anomaly rule', { 
            ruleId, 
            error: error.message 
          });
        }
      }

      // Sort by severity and detection time
      anomalies.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
        const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;
        
        if (aSeverity !== bSeverity) {
          return aSeverity - bSeverity;
        }
        
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      });

      this.logger.info({ 
        totalAnomalies: anomalies.length,
        startDate,
        endDate
      }, 'Anomaly detection completed');

      return anomalies;

    } catch (error) {
      this.logger.error('Anomaly detection failed', { 
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Run a specific anomaly rule
   */
  private async runRule(rule: AnomalyRule, startDate: string, endDate: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    switch (rule.id) {
      case 'sales_spike':
        anomalies.push(...await this.detectSalesSpike(rule, startDate, endDate));
        break;
      case 'zero_margin':
        anomalies.push(...await this.detectZeroMargin(rule, startDate, endDate));
        break;
      case 'frequent_voids':
        anomalies.push(...await this.detectFrequentVoids(rule, startDate, endDate));
        break;
      case 'excessive_discounts':
        anomalies.push(...await this.detectExcessiveDiscounts(rule, startDate, endDate));
        break;
      case 'off_hours_sales':
        anomalies.push(...await this.detectOffHoursSales(rule, startDate, endDate));
        break;
      case 'large_transaction':
        anomalies.push(...await this.detectLargeTransactions(rule, startDate, endDate));
        break;
    }

    return anomalies;
  }

  /**
   * Detect sales volume spikes
   */
  private async detectSalesSpike(rule: AnomalyRule, startDate: string, endDate: string): Promise<AnomalyDetection[]> {
    const db = getDatabase();
    const anomalies: AnomalyDetection[] = [];

    // Get daily sales for the period
    const dailySales = db.prepare(`
      SELECT 
        DATE(created_at) as sale_date,
        SUM(net) as daily_total,
        COUNT(*) as transaction_count
      FROM invoices
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY DATE(created_at)
      ORDER BY sale_date
    `).all(startDate, endDate) as Array<{
      sale_date: string;
      daily_total: number;
      transaction_count: number;
    }>;

    // Calculate rolling average for each day
    for (let i = rule.window_days; i < dailySales.length; i++) {
      const currentDay = dailySales[i];
      const previousDays = dailySales.slice(i - rule.window_days, i);
      const rollingAverage = previousDays.reduce((sum, day) => sum + day.daily_total, 0) / rule.window_days;
      
      const spikeRatio = currentDay.daily_total / rollingAverage;
      
      if (spikeRatio >= rule.threshold) {
        anomalies.push({
          id: `sales_spike_${currentDay.sale_date}`,
          rule_id: rule.id,
          rule_name: rule.name,
          severity: rule.severity,
          description: `Sales spike detected: ${spikeRatio.toFixed(2)}x normal volume`,
          detected_at: currentDay.sale_date,
          value: currentDay.daily_total,
          threshold: rollingAverage * rule.threshold,
          deviation: spikeRatio,
          context: {},
          metadata: {
            rolling_average: rollingAverage,
            transaction_count: currentDay.transaction_count,
            previous_days: previousDays.length
          }
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect zero/negative margin sales
   */
  private async detectZeroMargin(rule: AnomalyRule, startDate: string, endDate: string): Promise<AnomalyDetection[]> {
    const db = getDatabase();
    const anomalies: AnomalyDetection[] = [];

    // Get sales with margin calculations
    const salesWithMargin = db.prepare(`
      SELECT 
        i.id as invoice_id,
        i.receipt_no,
        i.created_at,
        i.cashier_id,
        u.name as cashier_name,
        i.terminal_name,
        i.customer_id,
        c.customer_name,
        SUM(il.total) as total_sales,
        SUM(il.qty * COALESCE(p.cost, 0)) as total_cost,
        SUM(il.total) - SUM(il.qty * COALESCE(p.cost, 0)) as margin
      FROM invoices i
      JOIN invoice_lines il ON i.id = il.invoice_id
      JOIN products p ON il.product_id = p.id
      LEFT JOIN users u ON i.cashier_id = u.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.created_at >= ? AND i.created_at <= ?
      GROUP BY i.id, i.receipt_no, i.created_at, i.cashier_id, u.name, i.terminal_name, i.customer_id, c.customer_name
      HAVING margin <= ?
    `).all(startDate, endDate, rule.threshold) as Array<{
      invoice_id: number;
      receipt_no: string;
      created_at: string;
      cashier_id: number;
      cashier_name: string;
      terminal_name: string;
      customer_id: number;
      customer_name: string;
      total_sales: number;
      total_cost: number;
      margin: number;
    }>;

    salesWithMargin.forEach(sale => {
      anomalies.push({
        id: `zero_margin_${sale.invoice_id}`,
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        description: `Zero/negative margin sale detected: LKR ${sale.margin.toFixed(2)}`,
        detected_at: sale.created_at,
        value: sale.margin,
        threshold: rule.threshold,
        deviation: sale.margin - rule.threshold,
        context: {
          invoice_id: sale.invoice_id,
          receipt_no: sale.receipt_no,
          cashier_id: sale.cashier_id,
          cashier_name: sale.cashier_name,
          terminal_name: sale.terminal_name,
          customer_id: sale.customer_id,
          customer_name: sale.customer_name
        },
        metadata: {
          total_sales: sale.total_sales,
          total_cost: sale.total_cost,
          margin_percentage: sale.total_sales > 0 ? (sale.margin / sale.total_sales) * 100 : 0
        }
      });
    });

    return anomalies;
  }

  /**
   * Detect frequent voids
   */
  private async detectFrequentVoids(rule: AnomalyRule, startDate: string, endDate: string): Promise<AnomalyDetection[]> {
    const db = getDatabase();
    const anomalies: AnomalyDetection[] = [];

    // Get void statistics by cashier
    const voidStats = db.prepare(`
      SELECT 
        i.cashier_id,
        u.name as cashier_name,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN i.net < 0 THEN 1 ELSE 0 END) as void_count,
        CAST(SUM(CASE WHEN i.net < 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as void_ratio
      FROM invoices i
      LEFT JOIN users u ON i.cashier_id = u.id
      WHERE i.created_at >= ? AND i.created_at <= ?
      GROUP BY i.cashier_id, u.name
      HAVING void_ratio >= ?
    `).all(startDate, endDate, rule.threshold) as Array<{
      cashier_id: number;
      cashier_name: string;
      total_transactions: number;
      void_count: number;
      void_ratio: number;
    }>;

    voidStats.forEach(stat => {
      anomalies.push({
        id: `frequent_voids_${stat.cashier_id}`,
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        description: `High void frequency: ${(stat.void_ratio * 100).toFixed(1)}% of transactions`,
        detected_at: new Date().toISOString(),
        value: stat.void_ratio,
        threshold: rule.threshold,
        deviation: stat.void_ratio - rule.threshold,
        context: {
          cashier_id: stat.cashier_id,
          cashier_name: stat.cashier_name
        },
        metadata: {
          total_transactions: stat.total_transactions,
          void_count: stat.void_count,
          void_percentage: stat.void_ratio * 100
        }
      });
    });

    return anomalies;
  }

  /**
   * Detect excessive discounts
   */
  private async detectExcessiveDiscounts(rule: AnomalyRule, startDate: string, endDate: string): Promise<AnomalyDetection[]> {
    const db = getDatabase();
    const anomalies: AnomalyDetection[] = [];

    // Get transactions with high discount percentages
    const highDiscountSales = db.prepare(`
      SELECT 
        i.id as invoice_id,
        i.receipt_no,
        i.created_at,
        i.cashier_id,
        u.name as cashier_name,
        i.terminal_name,
        i.customer_id,
        c.customer_name,
        i.gross,
        i.discount,
        i.net,
        CASE 
          WHEN i.gross > 0 THEN i.discount / i.gross 
          ELSE 0 
        END as discount_ratio
      FROM invoices i
      LEFT JOIN users u ON i.cashier_id = u.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.created_at >= ? AND i.created_at <= ?
        AND i.gross > 0
        AND i.discount / i.gross >= ?
    `).all(startDate, endDate, rule.threshold) as Array<{
      invoice_id: number;
      receipt_no: string;
      created_at: string;
      cashier_id: number;
      cashier_name: string;
      terminal_name: string;
      customer_id: number;
      customer_name: string;
      gross: number;
      discount: number;
      net: number;
      discount_ratio: number;
    }>;

    highDiscountSales.forEach(sale => {
      anomalies.push({
        id: `excessive_discounts_${sale.invoice_id}`,
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        description: `Excessive discount: ${(sale.discount_ratio * 100).toFixed(1)}% off`,
        detected_at: sale.created_at,
        value: sale.discount_ratio,
        threshold: rule.threshold,
        deviation: sale.discount_ratio - rule.threshold,
        context: {
          invoice_id: sale.invoice_id,
          receipt_no: sale.receipt_no,
          cashier_id: sale.cashier_id,
          cashier_name: sale.cashier_name,
          terminal_name: sale.terminal_name,
          customer_id: sale.customer_id,
          customer_name: sale.customer_name
        },
        metadata: {
          gross_amount: sale.gross,
          discount_amount: sale.discount,
          net_amount: sale.net,
          discount_percentage: sale.discount_ratio * 100
        }
      });
    });

    return anomalies;
  }

  /**
   * Detect off-hours sales
   */
  private async detectOffHoursSales(rule: AnomalyRule, startDate: string, endDate: string): Promise<AnomalyDetection[]> {
    const db = getDatabase();
    const anomalies: AnomalyDetection[] = [];

    // Get sales outside normal business hours (6 AM - 10 PM)
    const offHoursSales = db.prepare(`
      SELECT 
        i.id as invoice_id,
        i.receipt_no,
        i.created_at,
        i.cashier_id,
        u.name as cashier_name,
        i.terminal_name,
        i.customer_id,
        c.customer_name,
        i.net,
        CAST(strftime('%H', i.created_at) AS INTEGER) as hour
      FROM invoices i
      LEFT JOIN users u ON i.cashier_id = u.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.created_at >= ? AND i.created_at <= ?
        AND (CAST(strftime('%H', i.created_at) AS INTEGER) < 6 
             OR CAST(strftime('%H', i.created_at) AS INTEGER) > 22)
    `).all(startDate, endDate) as Array<{
      invoice_id: number;
      receipt_no: string;
      created_at: string;
      cashier_id: number;
      cashier_name: string;
      terminal_name: string;
      customer_id: number;
      customer_name: string;
      net: number;
      hour: number;
    }>;

    offHoursSales.forEach(sale => {
      anomalies.push({
        id: `off_hours_${sale.invoice_id}`,
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        description: `Off-hours sale at ${sale.hour}:00 - LKR ${sale.net.toFixed(2)}`,
        detected_at: sale.created_at,
        value: sale.hour,
        threshold: rule.threshold,
        deviation: Math.min(Math.abs(sale.hour - 6), Math.abs(sale.hour - 22)),
        context: {
          invoice_id: sale.invoice_id,
          receipt_no: sale.receipt_no,
          cashier_id: sale.cashier_id,
          cashier_name: sale.cashier_name,
          terminal_name: sale.terminal_name,
          customer_id: sale.customer_id,
          customer_name: sale.customer_name
        },
        metadata: {
          sale_amount: sale.net,
          hour: sale.hour,
          is_early_morning: sale.hour < 6,
          is_late_night: sale.hour > 22
        }
      });
    });

    return anomalies;
  }

  /**
   * Detect large transactions
   */
  private async detectLargeTransactions(rule: AnomalyRule, startDate: string, endDate: string): Promise<AnomalyDetection[]> {
    const db = getDatabase();
    const anomalies: AnomalyDetection[] = [];

    // Get transactions above the threshold
    const largeTransactions = db.prepare(`
      SELECT 
        i.id as invoice_id,
        i.receipt_no,
        i.created_at,
        i.cashier_id,
        u.name as cashier_name,
        i.terminal_name,
        i.customer_id,
        c.customer_name,
        i.net
      FROM invoices i
      LEFT JOIN users u ON i.cashier_id = u.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.created_at >= ? AND i.created_at <= ?
        AND i.net >= ?
      ORDER BY i.net DESC
    `).all(startDate, endDate, rule.threshold) as Array<{
      invoice_id: number;
      receipt_no: string;
      created_at: string;
      cashier_id: number;
      cashier_name: string;
      terminal_name: string;
      customer_id: number;
      customer_name: string;
      net: number;
    }>;

    largeTransactions.forEach(sale => {
      anomalies.push({
        id: `large_transaction_${sale.invoice_id}`,
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        description: `Large transaction: LKR ${sale.net.toFixed(2)}`,
        detected_at: sale.created_at,
        value: sale.net,
        threshold: rule.threshold,
        deviation: sale.net - rule.threshold,
        context: {
          invoice_id: sale.invoice_id,
          receipt_no: sale.receipt_no,
          cashier_id: sale.cashier_id,
          cashier_name: sale.cashier_name,
          terminal_name: sale.terminal_name,
          customer_id: sale.customer_id,
          customer_name: sale.customer_name
        },
        metadata: {
          transaction_amount: sale.net,
          threshold_amount: rule.threshold,
          excess_amount: sale.net - rule.threshold
        }
      });
    });

    return anomalies;
  }

  /**
   * Get anomaly summary
   */
  async getAnomalySummary(anomalies: AnomalyDetection[]): Promise<AnomalySummary> {
    const summary: AnomalySummary = {
      total_anomalies: anomalies.length,
      by_severity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      by_category: {
        sales_volume: 0,
        margin: 0,
        voids: 0,
        discounts: 0,
        timing: 0
      },
      by_rule: {},
      time_range: {
        start: anomalies.length > 0 ? anomalies[anomalies.length - 1].detected_at : '',
        end: anomalies.length > 0 ? anomalies[0].detected_at : ''
      }
    };

    anomalies.forEach(anomaly => {
      // Count by severity
      summary.by_severity[anomaly.severity as keyof typeof summary.by_severity]++;

      // Count by rule
      summary.by_rule[anomaly.rule_id] = (summary.by_rule[anomaly.rule_id] || 0) + 1;

      // Count by category
      const rule = this.rules.get(anomaly.rule_id);
      if (rule) {
        summary.by_category[rule.category]++;
      }
    });

    return summary;
  }

  /**
   * Get all rules
   */
  getRules(): AnomalyRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Update rule configuration
   */
  updateRule(ruleId: string, updates: Partial<AnomalyRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    
    this.logger.info({ ruleId, updates }, 'Updated anomaly rule');
    return true;
  }
}

// Export singleton instance
export const anomalyDetector = new AnomalyDetector();










