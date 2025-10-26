/**
 * Product Service
 * Handles all product-related API operations
 */

import { apiClient, ApiResponse } from '../api/client';
import { Product, ProductWithRelations, ProductFilters, PaginatedResponse } from '../../types';

export class ProductService {
  async getProducts(filters: ProductFilters = {}): Promise<ApiResponse<PaginatedResponse<ProductWithRelations>>> {
    return apiClient.get<PaginatedResponse<ProductWithRelations>>('/api/products', filters);
  }

  async getProductById(id: number): Promise<ApiResponse<ProductWithRelations>> {
    return apiClient.get<ProductWithRelations>(`/api/products/${id}`);
  }

  async getProductBySku(sku: string): Promise<ApiResponse<ProductWithRelations>> {
    if (!sku || typeof sku !== 'string') {
      return {
        success: false,
        error: 'Invalid SKU provided',
      };
    }

    const response = await apiClient.get<{ products: ProductWithRelations[] }>(`/api/products/search?q=${encodeURIComponent(sku.trim())}&limit=10`);
    
    if (response.success && response.data?.products) {
      const match = response.data.products.find(p => p.sku === sku.trim());
      return {
        success: true,
        data: match || undefined,
      };
    }
    
    return {
      success: false,
      error: response.error || 'Product not found',
    };
  }

  async searchProducts(query: string, limit: number = 10): Promise<ApiResponse<ProductWithRelations[]>> {
    return apiClient.get<ProductWithRelations[]>(`/api/products/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Product>> {
    // Validate required fields
    if (!product.sku || !product.name_en) {
      return {
        success: false,
        error: 'SKU and product name are required',
      };
    }

    if (product.sku.length < 3 || product.sku.length > 50) {
      return {
        success: false,
        error: 'SKU must be between 3 and 50 characters',
      };
    }

    if (product.name_en.length < 2 || product.name_en.length > 255) {
      return {
        success: false,
        error: 'Product name must be between 2 and 255 characters',
      };
    }

    // Normalize payload before sending
    const normalizedProduct = {
      ...product,
      sku: product.sku.trim().toUpperCase(),
      name_en: product.name_en.trim(),
      name_si: product.name_si?.trim() || null,
      name_ta: product.name_ta?.trim() || null,
      price_retail: Math.max(0, Number(product.price_retail) || 0),
      price_wholesale: Math.max(0, Number(product.price_wholesale) || 0),
      price_credit: Math.max(0, Number(product.price_credit) || 0),
      price_other: Math.max(0, Number(product.price_other) || 0),
      cost: Math.max(0, Number(product.cost) || 0),
      reorder_level: Number.isFinite(Number(product.reorder_level)) && Number(product.reorder_level) >= 0 ? Number(product.reorder_level) : null,
      is_active: Boolean(product.is_active),
      is_scale_item: Boolean(product.is_scale_item),
    };

    return apiClient.post<Product>('/api/products', normalizedProduct);
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<ApiResponse<Product>> {
    if (!id || !Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: 'Invalid product ID',
      };
    }

    // Validate updates if provided
    if (updates.sku && (updates.sku.length < 3 || updates.sku.length > 50)) {
      return {
        success: false,
        error: 'SKU must be between 3 and 50 characters',
      };
    }

    if (updates.name_en && (updates.name_en.length < 2 || updates.name_en.length > 255)) {
      return {
        success: false,
        error: 'Product name must be between 2 and 255 characters',
      };
    }

    // Normalize updates
    const normalizedUpdates = { ...updates };
    if (updates.sku) normalizedUpdates.sku = updates.sku.trim().toUpperCase();
    if (updates.name_en) normalizedUpdates.name_en = updates.name_en.trim();
    if (updates.name_si) normalizedUpdates.name_si = updates.name_si.trim();
    if (updates.name_ta) normalizedUpdates.name_ta = updates.name_ta.trim();
    
    // Ensure numeric values are positive
    if (updates.price_retail !== undefined) normalizedUpdates.price_retail = Math.max(0, Number(updates.price_retail) || 0);
    if (updates.price_wholesale !== undefined) normalizedUpdates.price_wholesale = Math.max(0, Number(updates.price_wholesale) || 0);
    if (updates.price_credit !== undefined) normalizedUpdates.price_credit = Math.max(0, Number(updates.price_credit) || 0);
    if (updates.price_other !== undefined) normalizedUpdates.price_other = Math.max(0, Number(updates.price_other) || 0);
    if (updates.cost !== undefined) normalizedUpdates.cost = Math.max(0, Number(updates.cost) || 0);
    
    if (updates.reorder_level !== undefined) {
      normalizedUpdates.reorder_level = Number.isFinite(Number(updates.reorder_level)) && Number(updates.reorder_level) >= 0 
        ? Number(updates.reorder_level) 
        : undefined;
    }

    return apiClient.put<Product>(`/api/products/${id}`, normalizedUpdates);
  }

  async deleteProduct(id: number): Promise<ApiResponse<void>> {
    if (!id || !Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: 'Invalid product ID',
      };
    }

    return apiClient.delete<void>(`/api/products/${id}`);
  }

  async deactivateProduct(id: number): Promise<ApiResponse<void>> {
    if (!id || !Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: 'Invalid product ID',
      };
    }

    return apiClient.put<void>(`/api/products/${id}`, { is_active: false });
  }
}

// Singleton instance
export const productService = new ProductService();
