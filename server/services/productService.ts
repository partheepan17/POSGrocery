/**
 * Product Service
 * Handles product management operations
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';

export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: 'pc' | 'kg';
  category_id?: number;
  is_scale_item: boolean;
  tax_code?: string;
  price_retail: number;
  price_wholesale?: number;
  price_credit?: number;
  price_other?: number;
  cost: number;
  reorder_level?: number;
  preferred_supplier_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFilters {
  search?: string;
  category_id?: number;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductWithRelations extends Product {
  category_name?: string;
  supplier_name?: string;
}

export class ProductService {
  private db = getDatabase();
  private logger = createContextLogger({ operation: 'product_service' });

  constructor() {
    // Ensure database is initialized
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  async getProducts(filters: ProductFilters = {}): Promise<{ products: ProductWithRelations[]; total: number }> {
    try {
      const {
        search,
        category_id,
        status = 'all',
        page = 1,
        pageSize = 20,
        sortBy = 'name_en',
        sortOrder = 'asc'
      } = filters;

      let query = `
        SELECT 
          p.*,
          c.name as category_name,
          s.supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Apply filters
      if (search) {
        query += ' AND (p.name_en LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (category_id) {
        query += ' AND p.category_id = ?';
        params.push(category_id);
      }

      if (status !== 'all') {
        query += ' AND p.is_active = ?';
        params.push(status === 'active');
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = this.db.prepare(countQuery).get(...params) as { total: number };
      const total = countResult.total;

      // Apply sorting and pagination
      query += ` ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}`;
      query += ' LIMIT ? OFFSET ?';
      params.push(pageSize, (page - 1) * pageSize);

      const products = this.db.prepare(query).all(...params) as ProductWithRelations[];

      this.logger.info({ 
        filters, 
        total, 
        returned: products.length 
      }, 'Products retrieved');

      return { products, total };
    } catch (error) {
      this.logger.error({ filters, error }, 'Failed to get products');
      throw createStandardError('Failed to retrieve products', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async getProductById(id: number): Promise<ProductWithRelations | null> {
    try {
      const query = `
        SELECT 
          p.*,
          c.name as category_name,
          s.supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
        WHERE p.id = ?
      `;

      const product = this.db.prepare(query).get(id) as ProductWithRelations | undefined;
      
      if (!product) {
        return null;
      }

      this.logger.info({ id }, 'Product retrieved by ID');
      return product;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to get product by ID');
      throw createStandardError('Failed to retrieve product', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    try {
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO products (
          sku, barcode, name_en, name_si, name_ta, unit, category_id,
          is_scale_item, tax_code, price_retail, price_wholesale, 
          price_credit, price_other, cost, reorder_level, 
          preferred_supplier_id, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = this.db.prepare(query).run(
        productData.sku,
        productData.barcode || null,
        productData.name_en,
        productData.name_si || null,
        productData.name_ta || null,
        productData.unit,
        productData.category_id || null,
        productData.is_scale_item ? 1 : 0,
        productData.tax_code || null,
        productData.price_retail,
        productData.price_wholesale || null,
        productData.price_credit || null,
        productData.price_other || null,
        productData.cost,
        productData.reorder_level || null,
        productData.preferred_supplier_id || null,
        productData.is_active ? 1 : 0,
        now,
        now
      );

      const newProduct = await this.getProductById(result.lastInsertRowid as number);
      if (!newProduct) {
        throw new Error('Failed to retrieve created product');
      }

      this.logger.info({ id: newProduct.id, sku: newProduct.sku }, 'Product created');
      return newProduct;
    } catch (error) {
      this.logger.error({ productData, error }, 'Failed to create product');
      throw createStandardError('Failed to create product', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | null> {
    try {
      const existingProduct = await this.getProductById(id);
      if (!existingProduct) {
        return null;
      }

      const now = new Date().toISOString();
      const updatedProduct = { ...existingProduct, ...updates, updated_at: now };

      const query = `
        UPDATE products SET
          sku = ?, barcode = ?, name_en = ?, name_si = ?, name_ta = ?,
          unit = ?, category_id = ?, is_scale_item = ?, tax_code = ?,
          price_retail = ?, price_wholesale = ?, price_credit = ?, price_other = ?,
          cost = ?, reorder_level = ?, preferred_supplier_id = ?,
          is_active = ?, updated_at = ?
        WHERE id = ?
      `;

      this.db.prepare(query).run(
        updatedProduct.sku,
        updatedProduct.barcode || null,
        updatedProduct.name_en,
        updatedProduct.name_si || null,
        updatedProduct.name_ta || null,
        updatedProduct.unit,
        updatedProduct.category_id || null,
        updatedProduct.is_scale_item ? 1 : 0,
        updatedProduct.tax_code || null,
        updatedProduct.price_retail,
        updatedProduct.price_wholesale || null,
        updatedProduct.price_credit || null,
        updatedProduct.price_other || null,
        updatedProduct.cost,
        updatedProduct.reorder_level || null,
        updatedProduct.preferred_supplier_id || null,
        updatedProduct.is_active ? 1 : 0,
        now,
        id
      );

      const result = await this.getProductById(id);
      this.logger.info({ id }, 'Product updated');
      return result;
    } catch (error) {
      this.logger.error({ id, updates, error }, 'Failed to update product');
      throw createStandardError('Failed to update product', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async deactivateProduct(id: number): Promise<boolean> {
    try {
      const existingProduct = await this.getProductById(id);
      if (!existingProduct) {
        return false;
      }

      const query = 'UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?';
      const result = this.db.prepare(query).run(new Date().toISOString(), id);

      this.logger.info({ id }, 'Product deactivated');
      return result.changes > 0;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to deactivate product');
      throw createStandardError('Failed to deactivate product', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async searchProducts(query: string, limit: number = 10): Promise<ProductWithRelations[]> {
    try {
      const searchQuery = `
        SELECT 
          p.*,
          c.name as category_name,
          s.supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
        WHERE p.is_active = 1 
        AND (p.name_en LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
        ORDER BY p.name_en
        LIMIT ?
      `;

      const searchTerm = `%${query}%`;
      const products = this.db.prepare(searchQuery).all(searchTerm, searchTerm, searchTerm, limit) as ProductWithRelations[];

      this.logger.info({ query, limit, found: products.length }, 'Products searched');
      return products;
    } catch (error) {
      this.logger.error({ query, limit, error }, 'Failed to search products');
      throw createStandardError('Failed to search products', ERROR_CODES.DATABASE_ERROR);
    }
  }
}
