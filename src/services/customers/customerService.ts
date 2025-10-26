/**
 * Customer Service
 * Handles all customer-related API operations
 */

import { apiClient, ApiResponse } from '../api/client';
import { Customer, CustomerFilters } from '../../types';

export class CustomerService {
  async getCustomers(filters: CustomerFilters = {}): Promise<ApiResponse<Customer[]>> {
    return apiClient.get<Customer[]>('/api/customers', filters);
  }

  async getCustomerById(id: number): Promise<ApiResponse<Customer>> {
    if (!id || !Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: 'Invalid customer ID',
      };
    }

    return apiClient.get<Customer>(`/api/customers/${id}`);
  }

  async getCustomerByName(name: string): Promise<ApiResponse<Customer>> {
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return {
        success: false,
        error: 'Invalid customer name',
      };
    }

    const response = await this.getCustomers({ search: name.trim() });
    if (response.success && response.data) {
      const match = response.data.find(c => c.customer_name.toLowerCase() === name.trim().toLowerCase());
      return {
        success: true,
        data: match || undefined,
      };
    }
    return {
      success: false,
      error: 'Customer not found',
    };
  }

  async getCustomerByPhone(phone: string): Promise<ApiResponse<Customer>> {
    if (!phone || typeof phone !== 'string') {
      return {
        success: false,
        error: 'Invalid phone number',
      };
    }

    // Basic phone validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      return {
        success: false,
        error: 'Invalid phone number format',
      };
    }

    return apiClient.get<Customer>(`/api/customers/search?phone=${encodeURIComponent(phone.trim())}`);
  }

  async searchCustomers(query: string, limit: number = 10): Promise<ApiResponse<Customer[]>> {
    return apiClient.get<Customer[]>(`/api/customers/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Customer>> {
    // Validate required fields
    if (!customer.customer_name || customer.customer_name.trim().length < 2) {
      return {
        success: false,
        error: 'Customer name is required and must be at least 2 characters',
      };
    }

    if (customer.customer_name.trim().length > 255) {
      return {
        success: false,
        error: 'Customer name must be less than 255 characters',
      };
    }

    // Validate email if provided
    if (customer.customer_email && customer.customer_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.customer_email.trim())) {
        return {
          success: false,
          error: 'Invalid email format',
        };
      }
    }

    // Validate phone if provided
    if (customer.customer_phone && customer.customer_phone.trim()) {
      const cleanPhone = customer.customer_phone.replace(/\D/g, '');
      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }
    }

    // Validate credit limit if provided
    if (customer.credit_limit !== undefined && customer.credit_limit !== null) {
      if (customer.credit_limit < 0) {
        return {
          success: false,
          error: 'Credit limit cannot be negative',
        };
      }
    }

    // Normalize customer data
    const normalizedCustomer = {
      ...customer,
      customer_name: customer.customer_name.trim(),
      customer_phone: customer.customer_phone?.trim() || null,
      customer_email: customer.customer_email?.trim() || null,
      address: customer.address?.trim() || null,
      city: customer.city?.trim() || null,
      notes: customer.notes?.trim() || null,
      credit_limit: customer.credit_limit || null,
      active: Boolean(customer.active),
    };

    return apiClient.post<Customer>('/api/customers', normalizedCustomer);
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<ApiResponse<Customer>> {
    // Validate ID
    if (!Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: 'Invalid customer ID',
      };
    }

    // Validate customer name if provided
    if (updates.customer_name !== undefined) {
      if (!updates.customer_name || updates.customer_name.trim().length < 2) {
        return {
          success: false,
          error: 'Customer name must be at least 2 characters',
        };
      }

      if (updates.customer_name.trim().length > 255) {
        return {
          success: false,
          error: 'Customer name must be less than 255 characters',
        };
      }
    }

    // Validate email if provided
    if (updates.customer_email !== undefined && updates.customer_email && updates.customer_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.customer_email.trim())) {
        return {
          success: false,
          error: 'Invalid email format',
        };
      }
    }

    // Validate phone if provided
    if (updates.customer_phone !== undefined && updates.customer_phone && updates.customer_phone.trim()) {
      const cleanPhone = updates.customer_phone.replace(/\D/g, '');
      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }
    }

    // Validate credit limit if provided
    if (updates.credit_limit !== undefined && updates.credit_limit !== null) {
      if (updates.credit_limit < 0) {
        return {
          success: false,
          error: 'Credit limit cannot be negative',
        };
      }
    }

    // Normalize updates
    const normalizedUpdates: Partial<Customer> = {};
    if (updates.customer_name !== undefined) {
      normalizedUpdates.customer_name = updates.customer_name.trim();
    }
    if (updates.customer_phone !== undefined) {
      normalizedUpdates.customer_phone = updates.customer_phone?.trim() || undefined;
    }
    if (updates.customer_email !== undefined) {
      normalizedUpdates.customer_email = updates.customer_email?.trim() || undefined;
    }
    if (updates.address !== undefined) {
      normalizedUpdates.address = updates.address?.trim() || undefined;
    }
    if (updates.city !== undefined) {
      normalizedUpdates.city = updates.city?.trim() || undefined;
    }
    if (updates.notes !== undefined) {
      normalizedUpdates.notes = updates.notes?.trim() || undefined;
    }
    if (updates.credit_limit !== undefined) {
      normalizedUpdates.credit_limit = updates.credit_limit || undefined;
    }
    if (updates.active !== undefined) {
      normalizedUpdates.active = Boolean(updates.active);
    }

    return apiClient.put<Customer>(`/api/customers/${id}`, normalizedUpdates);
  }

  async deleteCustomer(id: number): Promise<ApiResponse<void>> {
    // Validate ID
    if (!Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: 'Invalid customer ID',
      };
    }

    return apiClient.delete<void>(`/api/customers/${id}`);
  }

  async deactivateCustomer(id: number): Promise<ApiResponse<void>> {
    // Validate ID
    if (!Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: 'Invalid customer ID',
      };
    }

    return apiClient.put<void>(`/api/customers/${id}`, { active: false });
  }
}

// Singleton instance
export const customerService = new CustomerService();
