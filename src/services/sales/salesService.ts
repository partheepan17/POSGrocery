/**
 * Sales Service
 * Handles all sales-related API operations
 */

import { apiClient, ApiResponse } from '../api/client';
import { Sale, SaleLine, SaleRequest, PaymentData } from '../../types';
import { terminalService } from '../terminalService';

export interface SaleWithIdempotency {
  id: number;
  receipt_no: string;
  invoice: any;
  idempotency_key: string;
}

export interface SaleCreateRequest {
  customerId?: number;
  items: Array<{ 
    productId: number; 
    quantity: number; 
    unitPrice?: number; 
    lineDiscount?: number; 
    unit?: string; 
    nameEn?: string 
  }>;
  payments: Array<{ 
    method: string; 
    amount: number; 
    reference?: string;
  }>;
  cashierId?: number;
  shiftId?: number;
  terminalId?: number;
  terminalName?: string;
  idempotencyKey?: string;
}

export class SalesService {
  async createSale(payload: SaleCreateRequest): Promise<ApiResponse<SaleWithIdempotency>> {
    // Validate required fields
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return {
        success: false,
        error: 'Sale must have at least one item',
      };
    }

    if (!payload.payments || !Array.isArray(payload.payments) || payload.payments.length === 0) {
      return {
        success: false,
        error: 'Sale must have at least one payment',
      };
    }

    // Validate items
    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      
      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        return {
          success: false,
          error: `Item ${i + 1}: Invalid product ID`,
        };
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return {
          success: false,
          error: `Item ${i + 1}: Quantity must be a positive number`,
        };
      }

      if (item.unitPrice !== undefined && (!Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
        return {
          success: false,
          error: `Item ${i + 1}: Unit price must be a non-negative number`,
        };
      }

      if (item.lineDiscount !== undefined && (!Number.isFinite(item.lineDiscount) || item.lineDiscount < 0)) {
        return {
          success: false,
          error: `Item ${i + 1}: Line discount must be a non-negative number`,
        };
      }
    }

    // Validate payments
    let totalPaymentAmount = 0;
    for (let i = 0; i < payload.payments.length; i++) {
      const payment = payload.payments[i];
      
      if (!payment.method || payment.method.trim().length === 0) {
        return {
          success: false,
          error: `Payment ${i + 1}: Payment method is required`,
        };
      }

      if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
        return {
          success: false,
          error: `Payment ${i + 1}: Amount must be a positive number`,
        };
      }

      totalPaymentAmount += payment.amount;
    }

    // Validate customer ID if provided
    if (payload.customerId !== undefined && (!Number.isInteger(payload.customerId) || payload.customerId <= 0)) {
      return {
        success: false,
        error: 'Invalid customer ID',
      };
    }

    // Validate cashier ID if provided
    if (payload.cashierId !== undefined && (!Number.isInteger(payload.cashierId) || payload.cashierId <= 0)) {
      return {
        success: false,
        error: 'Invalid cashier ID',
      };
    }

    // Validate shift ID if provided
    if (payload.shiftId !== undefined && (!Number.isInteger(payload.shiftId) || payload.shiftId <= 0)) {
      return {
        success: false,
        error: 'Invalid shift ID',
      };
    }

    // Validate terminal ID if provided
    if (payload.terminalId !== undefined && (!Number.isInteger(payload.terminalId) || payload.terminalId <= 0)) {
      return {
        success: false,
        error: 'Invalid terminal ID',
      };
    }

    // Normalize payload
    const normalizedPayload: SaleCreateRequest = {
      ...payload,
      items: payload.items.map(item => ({
        ...item,
        unit: item.unit?.trim(),
        nameEn: item.nameEn?.trim(),
      })),
      payments: payload.payments.map(payment => ({
        ...payment,
        method: payment.method.trim(),
        reference: payment.reference?.trim(),
      })),
    };

    // Generate idempotency key if not provided
    const idempotencyKey = payload.idempotencyKey || this.generateIdempotencyKey();
    
    // Get terminal information
    const terminalData = terminalService.getTerminalData();
    
    const response = await apiClient.post<SaleWithIdempotency>('/api/sales', {
      ...normalizedPayload,
      terminalId: payload.terminalId || terminalData.terminalId,
      terminalName: payload.terminalName || terminalData.terminalName,
      idempotency_key: idempotencyKey,
    });

    if (response.success) {
      return {
        ...response,
        data: {
          ...response.data!,
          idempotency_key: idempotencyKey,
        },
      };
    }

    return response;
  }

  async getSaleById(id: number): Promise<ApiResponse<Sale>> {
    // Validate ID
    if (!Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: 'Invalid sale ID',
      };
    }

    return apiClient.get<Sale>(`/api/sales/${id}`);
  }

  async getSales(filters: {
    fromDate?: string;
    toDate?: string;
    cashierId?: number;
    customerId?: number;
    page?: number;
    pageSize?: number;
  } = {}): Promise<ApiResponse<{ sales: Sale[]; total: number }>> {
    // Validate date filters
    if (filters.fromDate && !this.isValidDate(filters.fromDate)) {
      return {
        success: false,
        error: 'Invalid fromDate format. Use YYYY-MM-DD',
      };
    }

    if (filters.toDate && !this.isValidDate(filters.toDate)) {
      return {
        success: false,
        error: 'Invalid toDate format. Use YYYY-MM-DD',
      };
    }

    // Validate date range
    if (filters.fromDate && filters.toDate) {
      const fromDate = new Date(filters.fromDate);
      const toDate = new Date(filters.toDate);
      if (fromDate > toDate) {
        return {
          success: false,
          error: 'fromDate cannot be after toDate',
        };
      }
    }

    // Validate cashier ID if provided
    if (filters.cashierId !== undefined && (!Number.isInteger(filters.cashierId) || filters.cashierId <= 0)) {
      return {
        success: false,
        error: 'Invalid cashier ID',
      };
    }

    // Validate customer ID if provided
    if (filters.customerId !== undefined && (!Number.isInteger(filters.customerId) || filters.customerId <= 0)) {
      return {
        success: false,
        error: 'Invalid customer ID',
      };
    }

    // Validate pagination
    if (filters.page !== undefined && (!Number.isInteger(filters.page) || filters.page < 1)) {
      return {
        success: false,
        error: 'Page must be a positive integer',
      };
    }

    if (filters.pageSize !== undefined && (!Number.isInteger(filters.pageSize) || filters.pageSize < 1 || filters.pageSize > 100)) {
      return {
        success: false,
        error: 'Page size must be between 1 and 100',
      };
    }

    return apiClient.get<{ sales: Sale[]; total: number }>('/api/sales', filters);
  }

  async printReceipt(saleId: number, printerConfig?: any): Promise<ApiResponse<{ success: boolean; message: string; receipt_data: any }>> {
    // Validate sale ID
    if (!Number.isInteger(saleId) || saleId <= 0) {
      return {
        success: false,
        error: 'Invalid sale ID',
      };
    }

    return apiClient.post<{ success: boolean; message: string; receipt_data: any }>(`/api/sales/${saleId}/print`, {
      printer_config: printerConfig,
    });
  }

  async reprintReceipt(saleId: number, printerConfig?: any): Promise<ApiResponse<{ success: boolean; message: string; receipt_data: any }>> {
    // Validate sale ID
    if (!Number.isInteger(saleId) || saleId <= 0) {
      return {
        success: false,
        error: 'Invalid sale ID',
      };
    }

    const params = new URLSearchParams();
    if (printerConfig) {
      params.append('printer_config', JSON.stringify(printerConfig));
    }
    
    return apiClient.get<{ success: boolean; message: string; receipt_data: any }>(`/api/sales/${saleId}/reprint?${params.toString()}`);
  }

  private generateIdempotencyKey(): string {
    // Use crypto.randomUUID() if available (modern browsers), fallback to custom implementation
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback to custom UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  }
}

// Singleton instance
export const salesService = new SalesService();
