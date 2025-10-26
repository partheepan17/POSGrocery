/**
 * Customer Service
 * Handles customer management operations
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';

export interface Customer {
  id: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  address?: string;
  city?: string;
  customer_type: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  credit_limit?: number;
  default_price_tier?: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerFilters {
  search?: string;
  customer_type?: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  active?: boolean;
}

export class CustomerService {
  private db = getDatabase();
  private logger = createContextLogger({ operation: 'customer_service' });

  constructor() {
    // Ensure database is initialized
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  async getCustomers(filters: CustomerFilters = {}): Promise<Customer[]> {
    try {
      const { search, customer_type, active } = filters;

      let query = 'SELECT * FROM customers WHERE 1=1';
      const params: any[] = [];

      // Apply filters
      if (search) {
        query += ' AND (customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (customer_type) {
        query += ' AND customer_type = ?';
        params.push(customer_type);
      }

      if (active !== undefined) {
        query += ' AND active = ?';
        params.push(active ? 1 : 0);
      }

      query += ' ORDER BY customer_name';

      const customers = this.db.prepare(query).all(...params) as Customer[];

      this.logger.info({ 
        filters, 
        returned: customers.length 
      }, 'Customers retrieved');

      return customers;
    } catch (error) {
      this.logger.error({ filters, error }, 'Failed to get customers');
      throw createStandardError('Failed to retrieve customers', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    try {
      const query = 'SELECT * FROM customers WHERE id = ?';
      const customer = this.db.prepare(query).get(id) as Customer | undefined;
      
      if (!customer) {
        return null;
      }

      this.logger.info({ id }, 'Customer retrieved by ID');
      return customer;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to get customer by ID');
      throw createStandardError('Failed to retrieve customer', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async createCustomer(customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    try {
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO customers (
          customer_name, customer_phone, customer_email, address, city,
          customer_type, credit_limit, default_price_tier, notes, active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = this.db.prepare(query).run(
        customerData.customer_name,
        customerData.customer_phone || null,
        customerData.customer_email || null,
        customerData.address || null,
        customerData.city || null,
        customerData.customer_type,
        customerData.credit_limit || null,
        customerData.default_price_tier || null,
        customerData.notes || null,
        customerData.active ? 1 : 0,
        now,
        now
      );

      const newCustomer = await this.getCustomerById(result.lastInsertRowid as number);
      if (!newCustomer) {
        throw new Error('Failed to retrieve created customer');
      }

      this.logger.info({ id: newCustomer.id, name: newCustomer.customer_name }, 'Customer created');
      return newCustomer;
    } catch (error) {
      this.logger.error({ customerData, error }, 'Failed to create customer');
      throw createStandardError('Failed to create customer', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | null> {
    try {
      const existingCustomer = await this.getCustomerById(id);
      if (!existingCustomer) {
        return null;
      }

      const now = new Date().toISOString();
      const updatedCustomer = { ...existingCustomer, ...updates, updated_at: now };

      const query = `
        UPDATE customers SET
          customer_name = ?, customer_phone = ?, customer_email = ?, address = ?,
          city = ?, customer_type = ?, credit_limit = ?, default_price_tier = ?,
          notes = ?, active = ?, updated_at = ?
        WHERE id = ?
      `;

      this.db.prepare(query).run(
        updatedCustomer.customer_name,
        updatedCustomer.customer_phone || null,
        updatedCustomer.customer_email || null,
        updatedCustomer.address || null,
        updatedCustomer.city || null,
        updatedCustomer.customer_type,
        updatedCustomer.credit_limit || null,
        updatedCustomer.default_price_tier || null,
        updatedCustomer.notes || null,
        updatedCustomer.active ? 1 : 0,
        now,
        id
      );

      const result = await this.getCustomerById(id);
      this.logger.info({ id }, 'Customer updated');
      return result;
    } catch (error) {
      this.logger.error({ id, updates, error }, 'Failed to update customer');
      throw createStandardError('Failed to update customer', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async deactivateCustomer(id: number): Promise<boolean> {
    try {
      const existingCustomer = await this.getCustomerById(id);
      if (!existingCustomer) {
        return false;
      }

      const query = 'UPDATE customers SET active = 0, updated_at = ? WHERE id = ?';
      const result = this.db.prepare(query).run(new Date().toISOString(), id);

      this.logger.info({ id }, 'Customer deactivated');
      return result.changes > 0;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to deactivate customer');
      throw createStandardError('Failed to deactivate customer', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async searchCustomers(query: string, limit: number = 10): Promise<Customer[]> {
    try {
      const searchQuery = `
        SELECT * FROM customers 
        WHERE active = 1 
        AND (customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ?)
        ORDER BY customer_name
        LIMIT ?
      `;

      const searchTerm = `%${query}%`;
      const customers = this.db.prepare(searchQuery).all(searchTerm, searchTerm, searchTerm, limit) as Customer[];

      this.logger.info({ query, limit, found: customers.length }, 'Customers searched');
      return customers;
    } catch (error) {
      this.logger.error({ query, limit, error }, 'Failed to search customers');
      throw createStandardError('Failed to search customers', ERROR_CODES.DATABASE_ERROR);
    }
  }
}
