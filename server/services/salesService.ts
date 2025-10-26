/**
 * Sales Service - Handles COGS calculation and stock movements
 * Integrates with valuation engine for accurate cost tracking
 */

import { getDatabase } from '../db';
import { valuationEngine, ValuationResult, StockValidationResult } from './valuationEngine';
import { createContextLogger } from '../utils/logger';
import { money, unitCost, calculateLineTotal, calculateCOGSTotal, calculateGrossMargin, calculateGrossMarginPercentage, moneyToCents, centsToMoney } from '../utils/number';

export interface SaleLineItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxInclusive?: boolean;
}

export interface COGSCalculationResult {
  unitCostCents: number;
  cogsCents: number;
  grossMarginCents: number;
  lotsUsed: Array<{
    lotId: number;
    quantityUsed: number;
    unitCostCents: number;
    version: number;
  }>;
}

export interface SaleProcessingResult {
  invoiceId: number;
  receiptNo: string;
  cogsCalculations: COGSCalculationResult[];
  stockMovements: Array<{
    productId: number;
    quantity: number;
    unitCostCents: number;
    movementId: number;
  }>;
}

export class SalesService {
  private get db() {
    return getDatabase();
  }
  private logger = createContextLogger({ service: 'sales' });

  /**
   * Check if COGS calculation is enabled
   */
  private async isCOGSEnabled(): Promise<boolean> {
    const enabled = await valuationEngine.getSystemConfig('enable_cogs_calculation', 'true');
    return enabled.toLowerCase() === 'true';
  }

  /**
   * Check if stock movements are enabled
   */
  private async isStockMovementsEnabled(): Promise<boolean> {
    const enabled = await valuationEngine.getSystemConfig('enable_stock_movements', 'true');
    return enabled.toLowerCase() === 'true';
  }

  /**
   * Calculate COGS for a single line item
   */
  calculateLineCOGS(
    productId: number, 
    quantity: number, 
    unitPrice: number, 
    discountAmount: number = 0
  ): COGSCalculationResult {
    try {
      this.logger.debug({ productId, quantity }, 'Calculating COGS for line item');

      // Get valuation result from engine
      const valuationResult = valuationEngine.calculateCOGS(productId, quantity);
      
      // Calculate gross margin with proper rounding
      const lineTotal = calculateLineTotal(quantity, unitPrice, discountAmount);
      const lineTotalCents = moneyToCents(lineTotal);
      const grossMarginCents = moneyToCents(calculateGrossMargin(lineTotal, centsToMoney(valuationResult.totalCostCents)));

      return {
        unitCostCents: valuationResult.unitCostCents,
        cogsCents: valuationResult.totalCostCents,
        grossMarginCents: Math.max(0, grossMarginCents), // Ensure non-negative margin
        lotsUsed: valuationResult.lotsUsed
      };
    } catch (error) {
      this.logger.error({ productId, quantity, error }, 'Error calculating COGS');
      
      // Fallback to product cost with proper rounding
      const product = this.db.prepare('SELECT cost FROM products WHERE id = ?').get(productId) as { cost: number } | undefined;
      const fallbackCost = product ? moneyToCents(unitCost(product.cost)) : 0;
      const lineTotal = calculateLineTotal(quantity, unitPrice, discountAmount);
      const cogsTotal = calculateCOGSTotal(quantity, centsToMoney(fallbackCost));
      const grossMargin = calculateGrossMargin(lineTotal, cogsTotal);
      
      return {
        unitCostCents: fallbackCost,
        cogsCents: moneyToCents(cogsTotal),
        grossMarginCents: Math.max(0, moneyToCents(grossMargin)),
        lotsUsed: [{
          lotId: -1,
          quantityUsed: quantity,
          unitCostCents: fallbackCost,
          version: 0
        }]
      };
    }
  }

  /**
   * Validate stock availability for all line items
   */
  async validateStockAvailability(lineItems: SaleLineItem[]): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    for (const item of lineItems) {
      const validation = await valuationEngine.validateStockAvailability(item.productId, item.quantity);
      if (!validation.isValid) {
        const product = this.db.prepare('SELECT name_en FROM products WHERE id = ?').get(item.productId) as { name_en: string } | undefined;
        const productName = product?.name_en || `Product ${item.productId}`;
        errors.push(`Insufficient stock for ${productName}: requested ${item.quantity}, available ${validation.availableQuantity}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process sale with COGS calculation and stock movements (transactional)
   */
  async processSaleWithCOGS(
    invoiceId: number,
    receiptNo: string,
    lineItems: SaleLineItem[],
    cashierId?: number
  ): Promise<SaleProcessingResult> {
    const cogsEnabled = await this.isCOGSEnabled();
    const stockMovementsEnabled = await this.isStockMovementsEnabled();
    
    this.logger.info({ 
      invoiceId, 
      receiptNo, 
      cogsEnabled, 
      stockMovementsEnabled,
      lineItemCount: lineItems.length 
    }, 'Processing sale with COGS calculation');

    // First validate stock availability
    const stockValidation = await this.validateStockAvailability(lineItems);
    if (!stockValidation.isValid) {
      throw new Error(`INSUFFICIENT_STOCK: ${stockValidation.errors.join(', ')}`);
    }

    // Process within a transaction using the existing pattern
    const result = this.db.transaction(() => {
      const cogsCalculations: COGSCalculationResult[] = [];
      const stockMovements: Array<{
        productId: number;
        quantity: number;
        unitCostCents: number;
        movementId: number;
      }> = [];

      // Process each line item
      for (const item of lineItems) {
        try {
          // Calculate COGS if enabled
          let cogsResult: COGSCalculationResult | null = null;
          if (cogsEnabled) {
            cogsResult = this.calculateLineCOGS(
              item.productId,
              item.quantity,
              item.unitPrice,
              item.discountAmount || 0
            );
            cogsCalculations.push(cogsResult);

            // Update invoice line with COGS data
            this.updateInvoiceLineWithCOGS(
              invoiceId,
              item.productId,
              cogsResult.unitCostCents,
              cogsResult.cogsCents,
              cogsResult.grossMarginCents
            );
          }

          // Create stock movements if enabled
          if (stockMovementsEnabled) {
            const unitCostCents = cogsResult?.unitCostCents || 0;
            
            // Update stock lots with optimistic locking
            if (cogsResult?.lotsUsed) {
              valuationEngine.updateStockLots(cogsResult.lotsUsed);
            }

            // Create stock movement entry
            valuationEngine.createStockMovement(
              item.productId,
              item.quantity,
              unitCostCents,
              'invoice',
              invoiceId,
              cashierId
            );

            // Get the movement ID for tracking
            const movementId = this.db.prepare(`
              SELECT id FROM stock_ledger 
              WHERE product_id = ? AND ref_id = ? AND reason = 'SALE'
              ORDER BY created_at DESC LIMIT 1
            `).get(item.productId, invoiceId) as { id: number } | undefined;

            stockMovements.push({
              productId: item.productId,
              quantity: item.quantity,
              unitCostCents,
              movementId: movementId?.id || 0
            });
          }

          this.logger.debug({ 
            productId: item.productId, 
            quantity: item.quantity,
            unitCostCents: cogsResult?.unitCostCents || 0,
            cogsCents: cogsResult?.cogsCents || 0
          }, 'Processed line item COGS');

        } catch (error) {
          this.logger.error({ 
            productId: item.productId, 
            quantity: item.quantity, 
            error 
          }, 'Error processing line item COGS');
          
          // Re-throw to trigger transaction rollback
          throw error;
        }
      }

      this.logger.info({ 
        invoiceId, 
        receiptNo,
        cogsCalculationsCount: cogsCalculations.length,
        stockMovementsCount: stockMovements.length
      }, 'Completed sale processing with COGS');

      return {
        invoiceId,
        receiptNo,
        cogsCalculations,
        stockMovements
      };
    })();

    return result;
  }

  /**
   * Update invoice line with COGS data
   */
  private updateInvoiceLineWithCOGS(
    invoiceId: number,
    productId: number,
    unitCostCents: number,
    cogsCents: number,
    grossMarginCents: number
  ): void {
    try {
      const updateLine = this.db.prepare(`
        UPDATE invoice_lines 
        SET 
          unit_cost_cents = ?,
          cogs_cents = ?,
          gross_margin_cents = ?
        WHERE invoice_id = ? AND product_id = ?
      `);

      updateLine.run(unitCostCents, cogsCents, grossMarginCents, invoiceId, productId);
      
      this.logger.debug({ 
        invoiceId, 
        productId, 
        unitCostCents, 
        cogsCents, 
        grossMarginCents 
      }, 'Updated invoice line with COGS data');
    } catch (error) {
      this.logger.error({ 
        invoiceId, 
        productId, 
        error 
      }, 'Error updating invoice line with COGS data');
    }
  }

  /**
   * Get COGS report for a date range
   */
  async getCOGSReport(startDate: string, endDate: string): Promise<{
    totalSales: number;
    totalCOGS: number;
    totalGrossMargin: number;
    marginPercentage: number;
    lineItems: Array<{
      productId: number;
      productName: string;
      sku: string;
      quantitySold: number;
      totalSales: number;
      totalCOGS: number;
      grossMargin: number;
      marginPercentage: number;
    }>;
  }> {
    try {
      const query = `
        SELECT 
          p.id as product_id,
          p.name_en as product_name,
          p.sku,
          SUM(il.qty) as quantity_sold,
          SUM(il.total) as total_sales,
          SUM(il.cogs_cents / 100.0) as total_cogs,
          SUM(il.gross_margin_cents / 100.0) as gross_margin
        FROM invoice_lines il
        JOIN products p ON il.product_id = p.id
        JOIN invoices i ON il.invoice_id = i.id
        WHERE i.created_at >= ? AND i.created_at <= ?
          AND il.cogs_cents > 0
        GROUP BY p.id, p.name_en, p.sku
        ORDER BY gross_margin DESC
      `;

      const lineItems = this.db.prepare(query).all(startDate, endDate) as Array<{
        product_id: number;
        product_name: string;
        sku: string;
        quantity_sold: number;
        total_sales: number;
        total_cogs: number;
        gross_margin: number;
      }>;

      const totals = lineItems.reduce((acc, item) => ({
        totalSales: acc.totalSales + item.total_sales,
        totalCOGS: acc.totalCOGS + item.total_cogs,
        totalGrossMargin: acc.totalGrossMargin + item.gross_margin
      }), { totalSales: 0, totalCOGS: 0, totalGrossMargin: 0 });

      const marginPercentage = totals.totalSales > 0 
        ? (totals.totalGrossMargin / totals.totalSales) * 100 
        : 0;

      return {
        totalSales: totals.totalSales,
        totalCOGS: totals.totalCOGS,
        totalGrossMargin: totals.totalGrossMargin,
        marginPercentage,
        lineItems: lineItems.map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          sku: item.sku,
          quantitySold: item.quantity_sold,
          totalSales: item.total_sales,
          totalCOGS: item.total_cogs,
          grossMargin: item.gross_margin,
          marginPercentage: item.total_sales > 0 ? (item.gross_margin / item.total_sales) * 100 : 0
        }))
      };
    } catch (error) {
      this.logger.error({ startDate, endDate, error }, 'Error generating COGS report');
      throw error;
    }
  }

  /**
   * Get product profitability analysis
   */
  async getProductProfitability(productId: number): Promise<{
    productId: number;
    productName: string;
    sku: string;
    totalQuantitySold: number;
    averageSellingPrice: number;
    averageUnitCost: number;
    totalCOGS: number;
    totalGrossMargin: number;
    averageMarginPercentage: number;
    salesCount: number;
  } | null> {
    try {
      const query = `
        SELECT 
          p.id as product_id,
          p.name_en as product_name,
          p.sku,
          COUNT(il.id) as sales_count,
          SUM(il.qty) as total_quantity_sold,
          AVG(il.unit_price) as average_selling_price,
          AVG(il.unit_cost_cents / 100.0) as average_unit_cost,
          SUM(il.cogs_cents / 100.0) as total_cogs,
          SUM(il.gross_margin_cents / 100.0) as total_gross_margin
        FROM products p
        LEFT JOIN invoice_lines il ON p.id = il.product_id AND il.cogs_cents > 0
        WHERE p.id = ?
        GROUP BY p.id, p.name_en, p.sku
      `;

      const result = this.db.prepare(query).get(productId) as {
        product_id: number;
        product_name: string;
        sku: string;
        sales_count: number;
        total_quantity_sold: number;
        average_selling_price: number;
        average_unit_cost: number;
        total_cogs: number;
        total_gross_margin: number;
      } | undefined;

      if (!result) {
        return null;
      }

      const averageMarginPercentage = result.total_cogs > 0 
        ? (result.total_gross_margin / (result.total_cogs + result.total_gross_margin)) * 100 
        : 0;

      return {
        productId: result.product_id,
        productName: result.product_name,
        sku: result.sku,
        totalQuantitySold: result.total_quantity_sold || 0,
        averageSellingPrice: result.average_selling_price || 0,
        averageUnitCost: result.average_unit_cost || 0,
        totalCOGS: result.total_cogs || 0,
        totalGrossMargin: result.total_gross_margin || 0,
        averageMarginPercentage,
        salesCount: result.sales_count || 0
      };
    } catch (error) {
      this.logger.error({ productId, error }, 'Error getting product profitability');
      throw error;
    }
  }
}

export const salesService = new SalesService();
