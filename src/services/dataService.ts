/**
 * Data Service
 * Main service facade that provides access to all domain services
 * This replaces the monolithic 2214-line service with a clean architecture
 */

import { productService } from './products/productService';
import { customerService } from './customers/customerService';
import { salesService } from './sales/salesService';
import { apiClient } from './api/client';
import { 
  createValidationError,
  type StandardApiResponse 
} from './errorUtils';
import { dataServiceLogger } from './logger';
import { sanitizeProductData, sanitizeCustomerData } from './sanitization';

// Re-export types for backward compatibility
export type {
  Product,
  ProductWithRelations,
  ProductFilters,
  Customer,
  CustomerFilters,
  Category,
  Supplier,
  Sale,
  SaleLine,
  SaleRequest,
  SaleLineRequest,
  PaymentSplit,
  PaymentData,
  PaymentMethod,
  User,
  CartItem,
  CartTotals,
  CartState,
  UIState,
  AppState,
  DiscountRule,
} from '../types';

// Re-export services for backward compatibility
export { productService, customerService, salesService, apiClient };

/**
 * Main DataService class
 * Provides a unified interface to all domain services
 */
export class DataService {
  // Input validation helpers
  private validateId(id: any, entityName: string): number {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
      throw new Error(`Invalid ${entityName} ID: must be a number or string`);
    }
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error(`Invalid ${entityName} ID: must be a positive integer`);
    }
    return numericId;
  }

  private validateString(value: any, fieldName: string, minLength: number = 1): string {
    if (!value || typeof value !== 'string') {
      throw new Error(`Invalid ${fieldName}: must be a non-empty string`);
    }
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      throw new Error(`Invalid ${fieldName}: must be at least ${minLength} characters long`);
    }
    return trimmed;
  }

  private validateObject(obj: any, entityName: string): void {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new Error(`Invalid ${entityName}: must be a valid object`);
    }
  }

  // Enhanced validation methods that return standardized error responses
  private validateIdWithError(id: any, entityName: string, requestId?: string): { success: true; data: number } | StandardApiResponse {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
      return createValidationError(`${entityName}Id`, 'must be a number or string', id, requestId);
    }
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return createValidationError(`${entityName}Id`, 'must be a positive integer', id, requestId);
    }
    return { success: true, data: numericId };
  }

  private validateStringWithError(value: any, fieldName: string, minLength: number = 1, requestId?: string): { success: true; data: string } | StandardApiResponse {
    if (!value || typeof value !== 'string') {
      return createValidationError(fieldName, 'must be a non-empty string', value, requestId);
    }
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      return createValidationError(fieldName, `must be at least ${minLength} characters long`, value, requestId);
    }
    return { success: true, data: trimmed };
  }

  // Product operations
  async getProductById(id: number) {
    const validatedId = this.validateId(id, 'product');
    const response = await productService.getProductById(validatedId);
    return response.success ? response.data : null;
  }

  async getProductBySku(sku: string) {
    const validatedSku = this.validateString(sku, 'SKU', 1);
    const response = await productService.getProductBySku(validatedSku);
    return response.success ? response.data : null;
  }

  async getProducts(filters: any = {}) {
    const response = await productService.getProducts(filters);
    if (!response.success) {
      return [];
    }
    // Return the items array from the paginated response
    return response.data?.data || [];
  }

  async createProduct(product: any) {
    const endTimer = dataServiceLogger.timeStart('createProduct');
    
    try {
      dataServiceLogger.info('Creating new product', 'createProduct', { sku: product?.sku });
      
      this.validateObject(product, 'product');
      if (!product.sku || !product.name_en) {
        throw new Error('Product must have SKU and English name');
      }
      
      // Sanitize product data
      const sanitizedProduct = sanitizeProductData(product);
      
      const response = await productService.createProduct(sanitizedProduct);
      if (!response.success) {
        dataServiceLogger.error('Failed to create product', undefined, 'createProduct', { error: response.error });
        throw new Error(response.error || 'Failed to create product');
      }
      
      dataServiceLogger.info('Product created successfully', 'createProduct', { productId: response.data?.id });
      return response.data;
    } catch (error) {
      dataServiceLogger.error('Error creating product', error as Error, 'createProduct');
      throw error;
    } finally {
      endTimer();
    }
  }

  async updateProduct(id: number, updates: any) {
    const validatedId = this.validateId(id, 'product');
    this.validateObject(updates, 'product updates');
    const response = await productService.updateProduct(validatedId, updates);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update product');
    }
    return response.data;
  }

  async deleteProduct(id: number) {
    const validatedId = this.validateId(id, 'product');
    const response = await productService.deleteProduct(validatedId);
    return response.success ? null : null; // Always return null for consistency
  }

  // Customer operations
  async getCustomerById(id: number) {
    const validatedId = this.validateId(id, 'customer');
    const response = await customerService.getCustomerById(validatedId);
    return response.success ? response.data : null;
  }

  async getCustomerByName(name: string) {
    const validatedName = this.validateString(name, 'customer name', 2);
    const response = await customerService.getCustomerByName(validatedName);
    return response.success ? response.data : null;
  }

  async getCustomers(filters: any = {}) {
    const response = await customerService.getCustomers(filters);
    return response.success ? response.data : [];
  }

  async createCustomer(customer: any) {
    const endTimer = dataServiceLogger.timeStart('createCustomer');
    
    try {
      dataServiceLogger.info('Creating new customer', 'createCustomer', { name: customer?.customer_name });
      
      this.validateObject(customer, 'customer');
      if (!customer.customer_name) {
        throw new Error('Customer must have a name');
      }
      
      // Sanitize customer data
      const sanitizedCustomer = sanitizeCustomerData(customer);
      
      const response = await customerService.createCustomer(sanitizedCustomer);
      if (!response.success) {
        dataServiceLogger.error('Failed to create customer', undefined, 'createCustomer', { error: response.error });
        throw new Error(response.error || 'Failed to create customer');
      }
      
      dataServiceLogger.info('Customer created successfully', 'createCustomer', { customerId: response.data?.id });
      return response.data;
    } catch (error) {
      dataServiceLogger.error('Error creating customer', error as Error, 'createCustomer');
      throw error;
    } finally {
      endTimer();
    }
  }

  async updateCustomer(id: number, updates: any) {
    const validatedId = this.validateId(id, 'customer');
    this.validateObject(updates, 'customer updates');
    const response = await customerService.updateCustomer(validatedId, updates);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update customer');
    }
    return response.data;
  }

  async deleteCustomer(id: number) {
    const validatedId = this.validateId(id, 'customer');
    const response = await customerService.deleteCustomer(validatedId);
    return response.success;
  }

  // Sales operations
  async createSaleWithIdempotency(payload: any) {
    this.validateObject(payload, 'sale payload');
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Sale must have at least one item');
    }
    if (!payload.payments || !Array.isArray(payload.payments) || payload.payments.length === 0) {
      throw new Error('Sale must have at least one payment method');
    }
    const response = await salesService.createSale(payload);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create sale');
    }
    return response.data;
  }

  async printReceipt(saleId: number, printerConfig?: any) {
    const validatedId = this.validateId(saleId, 'sale');
    const response = await salesService.printReceipt(validatedId, printerConfig);
    if (!response.success) {
      throw new Error(response.error || 'Failed to print receipt');
    }
    return response.data;
  }

  async reprintReceipt(saleId: number, printerConfig?: any) {
    const validatedId = this.validateId(saleId, 'sale');
    const response = await salesService.reprintReceipt(validatedId, printerConfig);
    if (!response.success) {
      throw new Error(response.error || 'Failed to reprint receipt');
    }
    return response.data;
  }

  // Legacy methods for backward compatibility
  async query<T = any>(_sql: string, _params: any[] = []): Promise<T[]> {
    console.warn('Legacy query method called - use specific service methods instead');
    return [] as T[];
  }

  async execute(_sql: string, _params: any[] = []): Promise<{ lastInsertRowid?: number; lastID?: number }> {
    console.warn('Legacy execute method called - use specific service methods instead');
    return { lastInsertRowid: Date.now() };
  }

  existsReceiptNo = (receipt: string): boolean => {
    console.warn('Legacy existsReceiptNo method called - implement proper receipt validation');
    return false;
  };

  // Quick sales operations
  async openQuickSales(_payload: any) {
    const response = await apiClient.post('/api/quick-sales/open', _payload);
    if (!response.success) {
      throw new Error(response.error || 'Failed to open quick sales');
    }
    return response.data;
  }

  async closeQuickSales(payload: any) {
    const response = await apiClient.post('/api/quick-sales/close', payload);
    if (!response.success) {
      throw new Error(response.error || 'Failed to close quick sales');
    }
    return response.data;
  }

  // Admin operations
  async purgeDemoData() {
    const response = await apiClient.post('/api/admin/purge-demo-data');
    if (!response.success) {
      throw new Error(response.error || 'Failed to purge demo data');
    }
    return response.data;
  }

  // User operations
  async getUserByUsername(username: string) {
    const validatedUsername = this.validateString(username, 'username', 2);
    const response = await apiClient.get(`/api/users/search?username=${encodeURIComponent(validatedUsername)}`);
    return response.success ? (response.data as any)?.user || null : null;
  }

  async createUser(userData: any) {
    this.validateObject(userData, 'user data');
    if (!userData.name || !userData.role) {
      throw new Error('User must have name and role');
    }
    const response = await apiClient.post('/api/users', userData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create user');
    }
    return (response.data as any)?.user;
  }

  async updateUser(userId: number, userData: any) {
    const validatedId = this.validateId(userId, 'user');
    this.validateObject(userData, 'user updates');
    const response = await apiClient.put(`/api/users/${validatedId}`, userData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update user');
    }
    return (response.data as any)?.user;
  }

  // Discount operations
  async getDiscountRules(activeOnly: boolean = true) {
    const response = await apiClient.get(`/api/discount-rules?active=${activeOnly}`);
    return response.success ? (Array.isArray(response.data) ? response.data : []) : [];
  }

  async getDiscountRulesForSKUs(skus: string[]) {
    const response = await apiClient.post('/api/discount-rules/effective', { skus });
    return response.success ? (Array.isArray(response.data) ? response.data : []) : [];
  }


  async createDiscountRule(ruleData: any) {
    const response = await apiClient.post('/api/discount-rules', ruleData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create discount rule');
    }
    return response.data;
  }

  async updateDiscountRule(id: number, ruleData: any) {
    const response = await apiClient.put(`/api/discount-rules/${id}`, ruleData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update discount rule');
    }
    return response.data;
  }

  async deleteDiscountRule(id: number) {
    const response = await apiClient.delete(`/api/discount-rules/${id}`);
    return response.success;
  }

  getGlobalQuantityRuleEnabled(): boolean {
    // This should be a configuration setting
    // For now, return true as default
    return true;
  }

  // Category operations
  async getCategories() {
    const response = await apiClient.get('/api/categories');
    return response.success ? response.data : [];
  }

  async createCategory(categoryData: any) {
    const response = await apiClient.post('/api/categories', categoryData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create category');
    }
    return response.data;
  }

  async updateCategory(id: number, categoryData: any) {
    const response = await apiClient.put(`/api/categories/${id}`, categoryData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update category');
    }
    return response.data;
  }

  async deleteCategory(id: number) {
    const response = await apiClient.delete(`/api/categories/${id}`);
    return response.success;
  }

  // Supplier operations
  async getSuppliers() {
    const response = await apiClient.get('/api/suppliers');
    return response.success ? response.data : [];
  }

  async createSupplier(supplierData: any) {
    const response = await apiClient.post('/api/suppliers', supplierData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create supplier');
    }
    return response.data;
  }

  async updateSupplier(id: number, supplierData: any) {
    const response = await apiClient.put(`/api/suppliers/${id}`, supplierData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update supplier');
    }
    return response.data;
  }

  async deleteSupplier(id: number) {
    const response = await apiClient.delete(`/api/suppliers/${id}`);
    return response.success;
  }

  // Sales operations (additional methods)
  async getSales(filters: any = {}) {
    const response = await salesService.getSales(filters);
    return response.success ? response.data : { sales: [], total: 0 };
  }

  async getSaleById(id: number) {
    const response = await salesService.getSaleById(id);
    return response.success ? response.data : null;
  }

  // Additional missing methods for backward compatibility
  async listInvoices(filters: any = {}) {
    const response = await salesService.getSales(filters);
    return response.success ? response.data : { sales: [], total: 0 };
  }

  async startSale(request: any) {
    const response = await salesService.createSale(request);
    return response.success ? response.data : null;
  }

  async holdSale(saleId: number) {
    const response = await apiClient.post(`/api/sales/${saleId}/hold`);
    return response.success;
  }

  async resumeSale(saleId: number) {
    const response = await apiClient.post(`/api/sales/${saleId}/resume`);
    return response.success ? response.data : null;
  }

  async getSaleLines(saleId: number) {
    const response = await apiClient.get(`/api/sales/${saleId}/lines`);
    return response.success ? response.data : [];
  }

  async finalizeSale(saleId: number, paymentData: any) {
    const response = await apiClient.post(`/api/sales/${saleId}/finalize`, paymentData);
    return response.success ? response.data : null;
  }

  async getEffectiveDiscountRules(skuOrFilters: string | { productIds: number[]; groupIds: number[]; supplierIds: number[]; channel: string }) {
    if (typeof skuOrFilters === 'string') {
      const response = await apiClient.get(`/api/discount-rules/effective/${skuOrFilters}`);
      return response.success ? response.data : [];
    } else {
      const response = await apiClient.post('/api/discount-rules/effective', skuOrFilters);
      return response.success ? response.data : [];
    }
  }

  async getSpecialPricingProfileById(profileId: number) {
    const response = await apiClient.get(`/api/pricing-profiles/${profileId}`);
    return response.success ? response.data : null;
  }

  async getSpecialPricingProfiles() {
    const response = await apiClient.get('/api/special-pricing-profiles');
    return response.success ? response.data : [];
  }

  async exportSpecialProfileCSV(profileId: number) {
    const response = await apiClient.get(`/api/special-pricing-profiles/${profileId}/export`);
    return response.success ? response.data : null;
  }

  async createGRN(data: any) {
    const response = await apiClient.post('/api/grn', data);
    return response.success ? response.data : null;
  }

  async finalizeGRN(grnId: number, data: any) {
    const response = await apiClient.post(`/api/grn/${grnId}/finalize`, data);
    return response.success ? response.data : null;
  }

  async print(data: any) {
    const response = await apiClient.post('/api/print', data);
    return response.success ? response.data : null;
  }

  async createPO(data: any) {
    const response = await apiClient.post('/api/purchase-orders', data);
    return response.success ? response.data : null;
  }

  async createSupplierReturn(data: any) {
    const response = await apiClient.post('/api/supplier-returns', data);
    return response.success ? response.data : null;
  }

  async getMovers(params: any) {
    const response = await apiClient.get('/api/reports/movers', { params });
    return response.success ? response.data : [];
  }

  async getProfitReport(params: any) {
    const response = await apiClient.get('/api/reports/profit', { params });
    return response.success ? response.data : [];
  }

  async getCustomersWithFilters(filters: any) {
    return this.getCustomers(filters);
  }

  async getCustomerStats() {
    const response = await apiClient.get('/api/customers/stats');
    return response.success ? response.data : { total: 0, active: 0 };
  }

  async getSalesCountByCustomer(customerId: number) {
    const response = await apiClient.get(`/api/customers/${customerId}/sales-count`);
    return response.success ? response.data : 0;
  }

  async getSuppliersWithFilters(_filters: any) {
    return this.getSuppliers();
  }

  async getProductCountBySupplier(supplierId: number) {
    const response = await apiClient.get(`/api/suppliers/${supplierId}/products-count`);
    return response.success ? response.data : 0;
  }

  // Missing methods that components expect
  async addCashMovement(movement: any) {
    const response = await apiClient.post('/api/shifts/movements', movement);
    return response;
  }

  async getXZReport(shiftId: number) {
    const response = await apiClient.get(`/api/shifts/${shiftId}/xz-report`);
    return response;
  }

  async getCustomerByPhone(phone: string) {
    const response = await apiClient.get(`/api/customers/phone/${phone}`);
    return response;
  }

  async checkDiscountRuleConflicts(rule: any) {
    const response = await apiClient.post('/api/discount-rules/check-conflicts', rule);
    return response;
  }

  async getSupplierByName(name: string) {
    const response = await apiClient.get(`/api/suppliers/name/${name}`);
    return response;
  }

  async getProductByBarcode(barcode: string) {
    const response = await apiClient.get(`/api/products/barcode/${barcode}`);
    return response;
  }

  async addLineToSale(saleId: number, lineData: any) {
    const response = await apiClient.post(`/api/sales/${saleId}/lines`, lineData);
    return response;
  }
}

// Singleton instance for backward compatibility
export const dataService = new DataService();