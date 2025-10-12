/**
 * Stock Alerts and Reorder Points Service
 * Manages stock alerts, reorder points, and supplier integration
 */

import { getDatabase } from '../db';
import { createRequestLogger } from '../utils/logger';

const logger = createRequestLogger({} as any);

export interface StockAlert {
  id: number;
  product_id: number;
  sku: string;
  name_en: string;
  unit: string;
  alert_type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'REORDER_POINT' | 'EXPIRY_WARNING';
  current_quantity: number;
  threshold_quantity: number;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  dismissed_at?: string;
  dismissed_by?: string;
}

export interface ReorderPoint {
  id: number;
  product_id: number;
  sku: string;
  name_en: string;
  unit: string;
  category_name?: string;
  supplier_id?: number;
  supplier_name?: string;
  reorder_quantity: number;
  reorder_point: number;
  lead_time_days: number;
  current_quantity: number;
  recommendation_status: 'REORDER_NOW' | 'REORDER_SOON' | 'STOCK_OK';
  created_at: string;
  updated_at: string;
}

export interface AlertRule {
  id: number;
  rule_name: string;
  alert_type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'REORDER_POINT' | 'EXPIRY_WARNING';
  condition_type: 'QUANTITY_LESS_THAN' | 'QUANTITY_EQUALS' | 'DAYS_TO_EXPIRY';
  condition_value: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_active: boolean;
  applies_to_all_products: boolean;
  category_id?: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierPerformance {
  id: number;
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  product_sku: string;
  product_name: string;
  total_orders: number;
  successful_orders: number;
  average_lead_time_days: number;
  average_quality_score?: number;
  on_time_delivery_rate: number;
  last_order_date?: string;
  last_delivery_date?: string;
  created_at: string;
  updated_at: string;
}

export class StockAlertsService {
  private get db() { return getDatabase(); }

  /**
   * Get all active stock alerts
   */
  getActiveAlerts(): StockAlert[] {
    return this.db.prepare(`
      SELECT 
        sa.id, sa.product_id, p.sku, p.name_en, p.unit,
        sa.alert_type, sa.current_quantity, sa.threshold_quantity,
        sa.message, sa.priority, sa.created_at, sa.dismissed_at, sa.dismissed_by
      FROM stock_alerts sa
      JOIN products p ON sa.product_id = p.id
      WHERE sa.is_active = 1
      ORDER BY 
        CASE sa.priority 
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5
        END,
        sa.created_at DESC
    `).all() as StockAlert[];
  }

  /**
   * Get reorder recommendations
   */
  getReorderRecommendations(): ReorderPoint[] {
    return this.db.prepare(`
      SELECT 
        rp.id, rp.product_id, p.sku, p.name_en, p.unit,
        c.name as category_name, s.name as supplier_name,
        rp.supplier_id, rp.reorder_quantity, rp.reorder_point,
        rp.lead_time_days, rp.created_at, rp.updated_at,
        COALESCE(sl.qty_on_hand, 0) as current_quantity,
        CASE 
          WHEN COALESCE(sl.qty_on_hand, 0) <= rp.reorder_point THEN 'REORDER_NOW'
          WHEN COALESCE(sl.qty_on_hand, 0) <= (rp.reorder_point * 1.2) THEN 'REORDER_SOON'
          ELSE 'STOCK_OK'
        END as recommendation_status
      FROM reorder_points rp
      JOIN products p ON rp.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON rp.supplier_id = s.id
      LEFT JOIN (
        SELECT 
          product_id,
          SUM(quantity) as qty_on_hand
        FROM stock_ledger
        GROUP BY product_id
      ) sl ON p.id = sl.product_id
      WHERE rp.is_active = 1
      ORDER BY recommendation_status, p.name_en
    `).all() as ReorderPoint[];
  }

  /**
   * Create a stock alert
   */
  createAlert(
    productId: number,
    alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'REORDER_POINT' | 'EXPIRY_WARNING',
    currentQuantity: number,
    thresholdQuantity: number,
    message: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): number {
    const result = this.db.prepare(`
      INSERT INTO stock_alerts (
        product_id, alert_type, current_quantity, threshold_quantity,
        message, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId,
      alertType,
      currentQuantity,
      thresholdQuantity,
      message,
      priority,
      new Date().toISOString()
    );

    logger.info({
      alertId: result.lastInsertRowid,
      productId,
      alertType,
      currentQuantity,
      thresholdQuantity,
      priority
    }, 'Stock alert created');

    return result.lastInsertRowid as number;
  }

  /**
   * Dismiss a stock alert
   */
  dismissAlert(alertId: number, dismissedBy: string = 'system'): boolean {
    const result = this.db.prepare(`
      UPDATE stock_alerts 
      SET is_active = 0, dismissed_at = ?, dismissed_by = ?
      WHERE id = ?
    `).run(
      new Date().toISOString(),
      dismissedBy,
      alertId
    );

    if (result.changes > 0) {
      logger.info({ alertId, dismissedBy }, 'Stock alert dismissed');
      return true;
    }

    return false;
  }

  /**
   * Set reorder point for a product
   */
  setReorderPoint(
    productId: number,
    reorderQuantity: number,
    reorderPoint: number,
    leadTimeDays: number = 7,
    supplierId?: number
  ): number {
    const result = this.db.prepare(`
      INSERT OR REPLACE INTO reorder_points (
        product_id, supplier_id, reorder_quantity, reorder_point,
        lead_time_days, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      productId,
      supplierId || null,
      reorderQuantity,
      reorderPoint,
      leadTimeDays,
      new Date().toISOString(),
      new Date().toISOString()
    );

    logger.info({
      reorderPointId: result.lastInsertRowid,
      productId,
      reorderQuantity,
      reorderPoint,
      leadTimeDays,
      supplierId
    }, 'Reorder point set');

    return result.lastInsertRowid as number;
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return this.db.prepare(`
      SELECT 
        id, rule_name, alert_type, condition_type, condition_value,
        priority, is_active, applies_to_all_products, category_id,
        created_at, updated_at
      FROM stock_alert_rules
      ORDER BY priority, rule_name
    `).all() as AlertRule[];
  }

  /**
   * Create alert rule
   */
  createAlertRule(
    ruleName: string,
    alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'REORDER_POINT' | 'EXPIRY_WARNING',
    conditionType: 'QUANTITY_LESS_THAN' | 'QUANTITY_EQUALS' | 'DAYS_TO_EXPIRY',
    conditionValue: number,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    appliesToAllProducts: boolean = true,
    categoryId?: number
  ): number {
    const result = this.db.prepare(`
      INSERT INTO stock_alert_rules (
        rule_name, alert_type, condition_type, condition_value,
        priority, is_active, applies_to_all_products, category_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      ruleName,
      alertType,
      conditionType,
      conditionValue,
      priority,
      appliesToAllProducts ? 1 : 0,
      categoryId || null,
      new Date().toISOString(),
      new Date().toISOString()
    );

    logger.info({
      ruleId: result.lastInsertRowid,
      ruleName,
      alertType,
      conditionType,
      conditionValue,
      priority
    }, 'Alert rule created');

    return result.lastInsertRowid as number;
  }

  /**
   * Check and create alerts based on current stock levels
   */
  checkAndCreateAlerts(): number {
    let alertsCreated = 0;
    
    try {
      // Get all active alert rules
      const rules = this.db.prepare(`
        SELECT * FROM stock_alert_rules WHERE is_active = 1
      `).all() as AlertRule[];

      // Get current stock levels for all products
      const stockLevels = this.db.prepare(`
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          COALESCE(sl.qty_on_hand, 0) as current_quantity
        FROM products p
        LEFT JOIN (
          SELECT 
            product_id,
            SUM(quantity) as qty_on_hand
          FROM stock_ledger
          GROUP BY product_id
        ) sl ON p.id = sl.product_id
        WHERE p.is_active = 1
      `).all() as any[];

      for (const rule of rules) {
        for (const product of stockLevels) {
          // Check if rule applies to this product
          if (!rule.applies_to_all_products) {
            const ruleProducts = this.db.prepare(`
              SELECT product_id FROM stock_alert_rule_products 
              WHERE rule_id = ? AND product_id = ?
            `).get(rule.id, product.product_id);
            
            if (!ruleProducts) continue;
          }

          // Check if category matches (if specified)
          if (rule.category_id) {
            const productCategory = this.db.prepare(`
              SELECT category_id FROM products WHERE id = ?
            `).get(product.product_id) as { category_id: number };
            
            if (productCategory?.category_id !== rule.category_id) continue;
          }

          // Check if condition is met
          let shouldCreateAlert = false;
          let message = '';

          switch (rule.condition_type) {
            case 'QUANTITY_LESS_THAN':
              if (product.current_quantity < rule.condition_value) {
                shouldCreateAlert = true;
                message = `${product.name_en} stock is below threshold (${product.current_quantity} < ${rule.condition_value})`;
              }
              break;
            case 'QUANTITY_EQUALS':
              if (product.current_quantity === rule.condition_value) {
                shouldCreateAlert = true;
                message = `${product.name_en} stock equals threshold (${product.current_quantity})`;
              }
              break;
          }

          if (shouldCreateAlert) {
            // Check if alert already exists for this product and type
            const existingAlert = this.db.prepare(`
              SELECT id FROM stock_alerts 
              WHERE product_id = ? AND alert_type = ? AND is_active = 1
            `).get(product.product_id, rule.alert_type);

            if (!existingAlert) {
              this.createAlert(
                product.product_id,
                rule.alert_type,
                product.current_quantity,
                rule.condition_value,
                message,
                rule.priority
              );
              alertsCreated++;
            }
          }
        }
      }

      logger.info({ alertsCreated }, 'Stock alerts check completed');
      return alertsCreated;

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to check and create alerts');
      return 0;
    }
  }

  /**
   * Get supplier performance data
   */
  getSupplierPerformance(supplierId?: number): SupplierPerformance[] {
    let query = `
      SELECT 
        sp.id, sp.supplier_id, s.name as supplier_name,
        sp.product_id, p.sku as product_sku, p.name_en as product_name,
        sp.total_orders, sp.successful_orders, sp.average_lead_time_days,
        sp.average_quality_score, sp.on_time_delivery_rate,
        sp.last_order_date, sp.last_delivery_date,
        sp.created_at, sp.updated_at
      FROM supplier_performance sp
      JOIN suppliers s ON sp.supplier_id = s.id
      JOIN products p ON sp.product_id = p.id
    `;

    const params: any[] = [];
    if (supplierId) {
      query += ' WHERE sp.supplier_id = ?';
      params.push(supplierId);
    }

    query += ' ORDER BY sp.supplier_id, p.name_en';

    return this.db.prepare(query).all(...params) as SupplierPerformance[];
  }

  /**
   * Update supplier performance after order completion
   */
  updateSupplierPerformance(
    supplierId: number,
    productId: number,
    orderDate: string,
    deliveryDate: string,
    leadTimeDays: number,
    qualityScore?: number,
    onTime: boolean = true
  ): void {
    try {
      // Get existing performance record
      const existing = this.db.prepare(`
        SELECT * FROM supplier_performance 
        WHERE supplier_id = ? AND product_id = ?
      `).get(supplierId, productId) as SupplierPerformance | undefined;

      if (existing) {
        // Update existing record
        const newTotalOrders = existing.total_orders + 1;
        const newSuccessfulOrders = existing.successful_orders + (onTime ? 1 : 0);
        const newAverageLeadTime = (existing.average_lead_time_days * existing.total_orders + leadTimeDays) / newTotalOrders;
        const newOnTimeRate = (newSuccessfulOrders / newTotalOrders) * 100;
        
        let newQualityScore = existing.average_quality_score;
        if (qualityScore) {
          newQualityScore = existing.average_quality_score 
            ? (existing.average_quality_score * existing.total_orders + qualityScore) / newTotalOrders
            : qualityScore;
        }

        this.db.prepare(`
          UPDATE supplier_performance SET
            total_orders = ?,
            successful_orders = ?,
            average_lead_time_days = ?,
            average_quality_score = ?,
            on_time_delivery_rate = ?,
            last_order_date = ?,
            last_delivery_date = ?,
            updated_at = ?
          WHERE supplier_id = ? AND product_id = ?
        `).run(
          newTotalOrders,
          newSuccessfulOrders,
          newAverageLeadTime,
          newQualityScore,
          newOnTimeRate,
          orderDate,
          deliveryDate,
          new Date().toISOString(),
          supplierId,
          productId
        );
      } else {
        // Create new record
        this.db.prepare(`
          INSERT INTO supplier_performance (
            supplier_id, product_id, total_orders, successful_orders,
            average_lead_time_days, average_quality_score, on_time_delivery_rate,
            last_order_date, last_delivery_date, created_at, updated_at
          ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          supplierId,
          productId,
          onTime ? 1 : 0,
          leadTimeDays,
          qualityScore || null,
          onTime ? 100 : 0,
          orderDate,
          deliveryDate,
          new Date().toISOString(),
          new Date().toISOString()
        );
      }

      logger.info({
        supplierId,
        productId,
        orderDate,
        deliveryDate,
        leadTimeDays,
        qualityScore,
        onTime
      }, 'Supplier performance updated');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        supplierId,
        productId
      }, 'Failed to update supplier performance');
    }
  }
}

export const stockAlertsService = new StockAlertsService();
