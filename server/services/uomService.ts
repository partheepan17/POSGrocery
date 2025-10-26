/**
 * UOM (Unit of Measure) Service
 * Handles unit conversions and normalization
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { quantity as roundQuantity, unitCost } from '../utils/number';

export interface UOMConversion {
  id: number;
  productId: number;
  baseUnit: string;
  altUnit: string;
  multiplier: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UOMConversionWithDetails extends UOMConversion {
  productName: string;
  sku: string;
}

export interface ConversionResult {
  baseQuantity: number;
  conversionUsed: UOMConversion | null;
  originalQuantity: number;
  originalUnit: string;
}

export class UOMService {
  private logger = createContextLogger({ context: 'UOMService' });

  private get db() {
    return getDatabase();
  }

  /**
   * Get all UOM conversions for a product
   */
  getConversionsForProduct(productId: number): UOMConversion[] {
    const conversions = this.db.prepare(`
      SELECT 
        id,
        product_id as productId,
        base_unit as baseUnit,
        alt_unit as altUnit,
        multiplier,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt
      FROM product_uom 
      WHERE product_id = ? AND is_active = 1
      ORDER BY alt_unit
    `).all(productId) as UOMConversion[];

    this.logger.debug({ productId, count: conversions.length }, 'Retrieved UOM conversions for product');
    return conversions;
  }

  /**
   * Get all UOM conversions with product details
   */
  getAllConversionsWithDetails(): UOMConversionWithDetails[] {
    const conversions = this.db.prepare(`
      SELECT 
        pu.id,
        pu.product_id as productId,
        p.name_en as productName,
        p.sku,
        pu.base_unit as baseUnit,
        pu.alt_unit as altUnit,
        pu.multiplier,
        pu.is_active as isActive,
        pu.created_at as createdAt,
        pu.updated_at as updatedAt
      FROM product_uom pu
      JOIN products p ON pu.product_id = p.id
      WHERE pu.is_active = 1
      ORDER BY p.name_en, pu.alt_unit
    `).all() as UOMConversionWithDetails[];

    this.logger.debug({ count: conversions.length }, 'Retrieved all UOM conversions with details');
    return conversions;
  }

  /**
   * Convert quantity from alternative unit to base unit
   */
  convertToBase(productId: number, quantity: number, fromUnit: string): ConversionResult {
    // If already in base unit, return as-is
    const baseUnit = this.getBaseUnit(productId);
    if (fromUnit === baseUnit) {
      return {
        baseQuantity: roundQuantity(quantity),
        conversionUsed: null,
        originalQuantity: roundQuantity(quantity),
        originalUnit: fromUnit
      };
    }

    // Find conversion
    const conversion = this.db.prepare(`
      SELECT 
        id,
        product_id as productId,
        base_unit as baseUnit,
        alt_unit as altUnit,
        multiplier,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt
      FROM product_uom 
      WHERE product_id = ? AND alt_unit = ? AND is_active = 1
    `).get(productId, fromUnit) as UOMConversion | undefined;

    if (!conversion) {
      this.logger.warn({ productId, fromUnit }, 'No UOM conversion found, using original quantity');
      return {
        baseQuantity: roundQuantity(quantity),
        conversionUsed: null,
        originalQuantity: roundQuantity(quantity),
        originalUnit: fromUnit
      };
    }

    const baseQuantity = roundQuantity(quantity * conversion.multiplier);
    
    this.logger.debug({ 
      productId, 
      fromUnit, 
      toUnit: conversion.baseUnit, 
      originalQuantity: quantity, 
      baseQuantity, 
      multiplier: conversion.multiplier 
    }, 'Converted quantity to base unit');

    return {
      baseQuantity,
      conversionUsed: conversion,
      originalQuantity: roundQuantity(quantity),
      originalUnit: fromUnit
    };
  }

  /**
   * Get base unit for a product
   */
  getBaseUnit(productId: number): string {
    const product = this.db.prepare(`
      SELECT unit FROM products WHERE id = ?
    `).get(productId) as { unit: string } | undefined;

    return product?.unit || 'pc';
  }

  /**
   * Get available alternative units for a product
   */
  getAlternativeUnits(productId: number): string[] {
    const conversions = this.getConversionsForProduct(productId);
    return conversions.map(c => c.altUnit);
  }

  /**
   * Create a new UOM conversion
   */
  createConversion(
    productId: number, 
    baseUnit: string, 
    altUnit: string, 
    multiplier: number
  ): UOMConversion {
    const insertConversion = this.db.prepare(`
      INSERT INTO product_uom (
        product_id, base_unit, alt_unit, multiplier, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `);

    const result = insertConversion.run(productId, baseUnit, altUnit, multiplier);
    const conversionId = result.lastInsertRowid;

    this.logger.info({ 
      conversionId, 
      productId, 
      baseUnit, 
      altUnit, 
      multiplier 
    }, 'Created UOM conversion');

    return {
      id: Number(conversionId),
      productId,
      baseUnit,
      altUnit,
      multiplier,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Update an existing UOM conversion
   */
  updateConversion(
    conversionId: number, 
    baseUnit: string, 
    altUnit: string, 
    multiplier: number
  ): boolean {
    const updateConversion = this.db.prepare(`
      UPDATE product_uom 
      SET base_unit = ?, alt_unit = ?, multiplier = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = updateConversion.run(baseUnit, altUnit, multiplier, conversionId);
    
    if (result.changes > 0) {
      this.logger.info({ 
        conversionId, 
        baseUnit, 
        altUnit, 
        multiplier 
      }, 'Updated UOM conversion');
      return true;
    }

    return false;
  }

  /**
   * Deactivate a UOM conversion
   */
  deactivateConversion(conversionId: number): boolean {
    const deactivateConversion = this.db.prepare(`
      UPDATE product_uom 
      SET is_active = 0, updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = deactivateConversion.run(conversionId);
    
    if (result.changes > 0) {
      this.logger.info({ conversionId }, 'Deactivated UOM conversion');
      return true;
    }

    return false;
  }

  /**
   * Validate UOM conversion data
   */
  validateConversion(
    productId: number, 
    baseUnit: string, 
    altUnit: string, 
    multiplier: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if product exists
    const product = this.db.prepare('SELECT id, unit FROM products WHERE id = ?').get(productId) as { id: number; unit: string } | undefined;
    if (!product) {
      errors.push('Product not found');
    }

    // Check if base unit matches product unit
    if (product && product.unit !== baseUnit) {
      errors.push(`Base unit must match product unit (${product.unit})`);
    }

    // Check if units are different
    if (baseUnit === altUnit) {
      errors.push('Base unit and alternative unit must be different');
    }

    // Check multiplier
    if (multiplier <= 0) {
      errors.push('Multiplier must be greater than 0');
    }

    // Check for duplicate conversion
    const existing = this.db.prepare(`
      SELECT id FROM product_uom 
      WHERE product_id = ? AND base_unit = ? AND alt_unit = ? AND is_active = 1
    `).get(productId, baseUnit, altUnit);

    if (existing) {
      errors.push('Conversion already exists for this product and units');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get conversion suggestions based on common patterns
   */
  getConversionSuggestions(productId: number): Array<{ altUnit: string; multiplier: number; description: string }> {
    const baseUnit = this.getBaseUnit(productId);
    const suggestions: Array<{ altUnit: string; multiplier: number; description: string }> = [];

    // Common conversion patterns
    const patterns = [
      { base: 'pc', alt: 'carton', mult: 12, desc: '1 carton = 12 pieces' },
      { base: 'pc', alt: 'box', mult: 24, desc: '1 box = 24 pieces' },
      { base: 'pc', alt: 'dozen', mult: 12, desc: '1 dozen = 12 pieces' },
      { base: 'pc', alt: 'gross', mult: 144, desc: '1 gross = 144 pieces' },
      { base: 'kg', alt: 'g', mult: 1000, desc: '1 kg = 1000 grams' },
      { base: 'kg', alt: 'lb', mult: 2.20462, desc: '1 kg = 2.20462 pounds' },
      { base: 'g', alt: 'kg', mult: 0.001, desc: '1 gram = 0.001 kg' },
      { base: 'l', alt: 'ml', mult: 1000, desc: '1 liter = 1000 ml' },
      { base: 'm', alt: 'cm', mult: 100, desc: '1 meter = 100 cm' }
    ];

    // Find matching patterns for the product's base unit
    patterns.forEach(pattern => {
      if (pattern.base === baseUnit) {
        suggestions.push({
          altUnit: pattern.alt,
          multiplier: pattern.mult,
          description: pattern.desc
        });
      }
    });

    return suggestions;
  }
}

export const uomService = new UOMService();
