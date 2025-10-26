/**
 * Shadow Recount Job
 * Detects inventory drift by comparing computed on-hand quantities with cached values
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { lowStockAlertService } from '../alerts/lowStock';

export interface RecountResult {
  product_id: number;
  sku: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: string;
  category_name?: string;
  cached_quantity: number;
  computed_quantity: number;
  difference: number;
  tolerance_exceeded: boolean;
  last_movement_date?: string;
  movement_count: number;
  suggested_adjustment: {
    quantity: number;
    reason: string;
    notes: string;
  };
}

export interface RecountReport {
  summary: {
    total_products: number;
    products_with_drift: number;
    total_drift_value: number;
    tolerance_threshold: number;
    recount_date: string;
    processing_time_ms: number;
  };
  drifts: RecountResult[];
  adjustments: {
    total_adjustments: number;
    total_quantity_adjustment: number;
    products_requiring_review: number;
  };
  alerts: {
    high_drift_products: RecountResult[];
    zero_stock_products: RecountResult[];
    negative_stock_products: RecountResult[];
  };
}

export interface RecountConfig {
  tolerance_threshold: number;
  enable_alerts: boolean;
  alert_threshold: number;
  include_inactive_products: boolean;
  max_products_per_batch: number;
}

export class ShadowRecountService {
  private logger = createContextLogger({ operation: 'shadow_recount' });

  /**
   * Get recount configuration from environment variables
   */
  private getRecountConfig(): RecountConfig {
    return {
      tolerance_threshold: parseInt(process.env.RECOUNT_TOLERANCE_THRESHOLD || '1'),
      enable_alerts: process.env.RECOUNT_ENABLE_ALERTS === 'true',
      alert_threshold: parseInt(process.env.RECOUNT_ALERT_THRESHOLD || '5'),
      include_inactive_products: process.env.RECOUNT_INCLUDE_INACTIVE === 'true',
      max_products_per_batch: parseInt(process.env.RECOUNT_BATCH_SIZE || '1000')
    };
  }

  /**
   * Compute on-hand quantity from stock movements
   */
  private async computeOnHandQuantity(productId: number): Promise<{
    quantity: number;
    movementCount: number;
    lastMovementDate?: string;
  }> {
    const db = getDatabase();
    
    try {
      // Query stock movements for the product
      const movements = db.prepare(`
        SELECT 
          quantity,
          movement_type,
          created_at,
          reference_type,
          reference_id
        FROM stock_movements 
        WHERE product_id = ?
        ORDER BY created_at ASC
      `).all(productId) as Array<{
        quantity: number;
        movement_type: string;
        created_at: string;
        reference_type: string;
        reference_id: number;
      }>;

      // Calculate running balance
      let runningBalance = 0;
      let lastMovementDate: string | undefined;
      let movementCount = movements.length;

      for (const movement of movements) {
        // Determine if this is an incoming or outgoing movement
        let quantityChange = 0;
        
        switch (movement.movement_type) {
          case 'purchase':
          case 'grn':
          case 'return':
          case 'adjustment_in':
            quantityChange = Math.abs(movement.quantity);
            break;
          case 'sale':
          case 'adjustment_out':
          case 'waste':
          case 'transfer_out':
            quantityChange = -Math.abs(movement.quantity);
            break;
          case 'adjustment':
            // For generic adjustments, use the quantity as-is (can be positive or negative)
            quantityChange = movement.quantity;
            break;
          default:
            // Default to treating as outgoing if unknown
            quantityChange = -Math.abs(movement.quantity);
        }

        runningBalance += quantityChange;
        lastMovementDate = movement.created_at;
      }

      return {
        quantity: runningBalance,
        movementCount,
        lastMovementDate
      };

    } catch (error) {
      this.logger.error('Failed to compute on-hand quantity', { 
        productId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get cached stock quantity from product_stock table
   */
  private async getCachedQuantity(productId: number): Promise<number> {
    const db = getDatabase();
    
    try {
      const result = db.prepare(`
        SELECT current_quantity 
        FROM product_stock 
        WHERE product_id = ?
      `).get(productId) as { current_quantity: number } | undefined;

      return result?.current_quantity || 0;
    } catch (error) {
      this.logger.error('Failed to get cached quantity', { 
        productId, 
        error: error.message 
      });
      return 0;
    }
  }

  /**
   * Generate suggested adjustment for drift
   */
  private generateSuggestedAdjustment(
    cachedQuantity: number,
    computedQuantity: number,
    product: any
  ): { quantity: number; reason: string; notes: string } {
    const difference = computedQuantity - cachedQuantity;
    
    let reason = 'Inventory Drift Correction';
    let notes = `Shadow recount detected drift: cached=${cachedQuantity}, computed=${computedQuantity}`;

    if (difference > 0) {
      reason = 'Stock Found - Positive Adjustment';
      notes = `Found additional stock during recount. Cached: ${cachedQuantity}, Computed: ${computedQuantity}`;
    } else if (difference < 0) {
      reason = 'Stock Missing - Negative Adjustment';
      notes = `Missing stock detected during recount. Cached: ${cachedQuantity}, Computed: ${computedQuantity}`;
    }

    return {
      quantity: difference,
      reason,
      notes: `${notes}. Product: ${product.name_en} (${product.sku})`
    };
  }

  /**
   * Perform shadow recount for a single product
   */
  private async recountProduct(product: any, config: RecountConfig): Promise<RecountResult | null> {
    try {
      const { product_id, sku, name_en, name_si, name_ta, unit, category_name } = product;
      
      // Get cached and computed quantities
      const [cachedQuantity, computedData] = await Promise.all([
        this.getCachedQuantity(product_id),
        this.computeOnHandQuantity(product_id)
      ]);

      const computedQuantity = computedData.quantity;
      const difference = computedQuantity - cachedQuantity;
      const toleranceExceeded = Math.abs(difference) > config.tolerance_threshold;

      // Only return result if tolerance is exceeded
      if (!toleranceExceeded) {
        return null;
      }

      const suggestedAdjustment = this.generateSuggestedAdjustment(
        cachedQuantity,
        computedQuantity,
        product
      );

      return {
        product_id,
        sku,
        name_en,
        name_si,
        name_ta,
        unit,
        category_name,
        cached_quantity: cachedQuantity,
        computed_quantity: computedQuantity,
        difference,
        tolerance_exceeded: toleranceExceeded,
        last_movement_date: computedData.lastMovementDate,
        movement_count: computedData.movementCount,
        suggested_adjustment: suggestedAdjustment
      };

    } catch (error) {
      this.logger.error('Failed to recount product', { 
        productId: product.product_id, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Perform shadow recount for all products
   */
  async performRecount(config?: Partial<RecountConfig>): Promise<RecountReport> {
    const startTime = Date.now();
    const fullConfig = { ...this.getRecountConfig(), ...config };
    
    this.logger.info({ 
      config: fullConfig 
    }, 'Starting shadow recount');

    const db = getDatabase();
    const drifts: RecountResult[] = [];
    let totalProducts = 0;

    try {
      // Get all active products
      const productsQuery = `
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          p.name_si,
          p.name_ta,
          p.unit,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1 OR ? = 1
        ORDER BY p.id
      `;

      const products = db.prepare(productsQuery).all(
        fullConfig.include_inactive_products ? 1 : 0
      ) as Array<{
        product_id: number;
        sku: string;
        name_en: string;
        name_si?: string;
        name_ta?: string;
        unit: string;
        category_name?: string;
      }>;

      totalProducts = products.length;
      this.logger.info({ totalProducts }, 'Processing products for recount');

      // Process products in batches
      const batchSize = fullConfig.max_products_per_batch;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        this.logger.info({ 
          batch: Math.floor(i / batchSize) + 1,
          totalBatches: Math.ceil(products.length / batchSize),
          batchSize: batch.length
        }, 'Processing batch');

        // Process batch concurrently
        const batchPromises = batch.map(product => 
          this.recountProduct(product, fullConfig)
        );
        
        const batchResults = await Promise.all(batchPromises);
        const batchDrifts = batchResults.filter(result => result !== null) as RecountResult[];
        
        drifts.push(...batchDrifts);
      }

      const processingTime = Date.now() - startTime;

      // Generate report
      const report = this.generateReport(drifts, totalProducts, processingTime, fullConfig);

      // Send alerts if enabled
      if (fullConfig.enable_alerts && drifts.length > 0) {
        await this.sendDriftAlerts(report, fullConfig);
      }

      this.logger.info({ 
        totalProducts,
        driftsFound: drifts.length,
        processingTime
      }, 'Shadow recount completed');

      return report;

    } catch (error) {
      this.logger.error('Shadow recount failed', { 
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Generate recount report
   */
  private generateReport(
    drifts: RecountResult[],
    totalProducts: number,
    processingTime: number,
    config: RecountConfig
  ): RecountReport {
    const totalDriftValue = drifts.reduce((sum, drift) => 
      sum + Math.abs(drift.difference), 0
    );

    const highDriftProducts = drifts.filter(drift => 
      Math.abs(drift.difference) >= config.alert_threshold
    );

    const zeroStockProducts = drifts.filter(drift => 
      drift.computed_quantity === 0 && drift.cached_quantity > 0
    );

    const negativeStockProducts = drifts.filter(drift => 
      drift.computed_quantity < 0
    );

    const totalQuantityAdjustment = drifts.reduce((sum, drift) => 
      sum + drift.difference, 0
    );

    return {
      summary: {
        total_products: totalProducts,
        products_with_drift: drifts.length,
        total_drift_value: totalDriftValue,
        tolerance_threshold: config.tolerance_threshold,
        recount_date: new Date().toISOString(),
        processing_time_ms: processingTime
      },
      drifts,
      adjustments: {
        total_adjustments: drifts.length,
        total_quantity_adjustment: totalQuantityAdjustment,
        products_requiring_review: highDriftProducts.length
      },
      alerts: {
        high_drift_products: highDriftProducts,
        zero_stock_products: zeroStockProducts,
        negative_stock_products: negativeStockProducts
      }
    };
  }

  /**
   * Send drift alerts
   */
  private async sendDriftAlerts(report: RecountReport, config: RecountConfig): Promise<void> {
    try {
      const { drifts, alerts } = report;
      
      if (drifts.length === 0) {
        return;
      }

      // Create alert message
      const alertMessage = this.formatDriftAlertMessage(report);
      
      // Send through low stock alert service (reuse existing infrastructure)
      await lowStockAlertService.sendAlerts([{
        product_id: 0, // Special ID for drift alerts
        sku: 'DRIFT-ALERT',
        name_en: 'Inventory Drift Detected',
        unit: 'items',
        current_stock: drifts.length,
        reorder_level: config.alert_threshold,
        threshold: config.tolerance_threshold,
        category_name: 'System Alert',
        last_movement_date: new Date().toISOString(),
        stock_value: report.summary.total_drift_value,
        unit_cost: 0
      }], {
        low_stock_threshold: config.alert_threshold,
        channels: {
          slack: {
            enabled: process.env.ALERTS_SLACK_ENABLED === 'true',
            webhook_url: process.env.ALERTS_SLACK_WEBHOOK_URL
          },
          telegram: {
            enabled: process.env.ALERTS_TELEGRAM_ENABLED === 'true',
            bot_token: process.env.ALERTS_TELEGRAM_BOT_TOKEN,
            chat_id: process.env.ALERTS_TELEGRAM_CHAT_ID
          },
          email: {
            enabled: process.env.ALERTS_EMAIL_ENABLED === 'true',
            smtp_host: process.env.ALERTS_EMAIL_SMTP_HOST,
            smtp_port: parseInt(process.env.ALERTS_EMAIL_SMTP_PORT || '587'),
            smtp_user: process.env.ALERTS_EMAIL_SMTP_USER,
            smtp_pass: process.env.ALERTS_EMAIL_SMTP_PASS,
            from_email: process.env.ALERTS_EMAIL_FROM,
            to_emails: process.env.ALERTS_EMAIL_TO?.split(',').map(email => email.trim()) || []
          }
        }
      });

      this.logger.info('Drift alerts sent successfully');

    } catch (error) {
      this.logger.error('Failed to send drift alerts', { error: error.message });
    }
  }

  /**
   * Format drift alert message
   */
  private formatDriftAlertMessage(report: RecountReport): string {
    const { summary, drifts, alerts } = report;
    const timestamp = new Date().toLocaleString();
    
    let message = `🔍 *INVENTORY DRIFT ALERT* - ${timestamp}\n\n`;
    message += `Shadow recount detected ${drifts.length} products with inventory drift:\n\n`;

    // Show top 10 drifts
    const topDrifts = drifts
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 10);

    topDrifts.forEach((drift, index) => {
      const status = drift.difference > 0 ? '📈' : '📉';
      message += `${index + 1}. ${status} *${drift.name_en}* (${drift.sku})\n`;
      message += `   Cached: ${drift.cached_quantity} ${drift.unit}\n`;
      message += `   Computed: ${drift.computed_quantity} ${drift.unit}\n`;
      message += `   Difference: ${drift.difference > 0 ? '+' : ''}${drift.difference} ${drift.unit}\n\n`;
    });

    message += `📊 *Summary:*\n`;
    message += `• Total Products: ${summary.total_products}\n`;
    message += `• Products with Drift: ${summary.products_with_drift}\n`;
    message += `• High Drift (≥${summary.tolerance_threshold}): ${alerts.high_drift_products.length}\n`;
    message += `• Zero Stock: ${alerts.zero_stock_products.length}\n`;
    message += `• Negative Stock: ${alerts.negative_stock_products.length}\n`;
    message += `• Processing Time: ${summary.processing_time_ms}ms\n`;

    return message;
  }

  /**
   * Get recount history
   */
  async getRecountHistory(limit: number = 10): Promise<any[]> {
    const db = getDatabase();
    
    try {
      // This would require a recount_history table to be created
      // For now, return empty array
      return [];
    } catch (error) {
      this.logger.error('Failed to get recount history', { error: error.message });
      return [];
    }
  }
}

// Export singleton instance
export const shadowRecountService = new ShadowRecountService();










