/**
 * Supplier Service
 * Handles supplier management operations
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';

export interface Supplier {
  id: number;
  supplier_name: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  tax_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupplierService {
  private db = getDatabase();
  private logger = createContextLogger({ operation: 'supplier_service' });

  constructor() {
    // Ensure database is initialized
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  async getSuppliers(): Promise<Supplier[]> {
    try {
      const query = 'SELECT * FROM suppliers WHERE active = 1 ORDER BY supplier_name';
      const suppliers = this.db.prepare(query).all() as Supplier[];

      this.logger.info({ returned: suppliers.length }, 'Suppliers retrieved');
      return suppliers;
    } catch (error) {
      this.logger.error({ error }, 'Failed to get suppliers');
      throw createStandardError('Failed to retrieve suppliers', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async getSupplierById(id: number): Promise<Supplier | null> {
    try {
      const query = 'SELECT * FROM suppliers WHERE id = ?';
      const supplier = this.db.prepare(query).get(id) as Supplier | undefined;
      
      if (!supplier) {
        return null;
      }

      this.logger.info({ id }, 'Supplier retrieved by ID');
      return supplier;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to get supplier by ID');
      throw createStandardError('Failed to retrieve supplier', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async createSupplier(supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> {
    try {
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO suppliers (
          supplier_name, contact_phone, contact_email, address, tax_id, active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = this.db.prepare(query).run(
        supplierData.supplier_name,
        supplierData.contact_phone || null,
        supplierData.contact_email || null,
        supplierData.address || null,
        supplierData.tax_id || null,
        supplierData.active ? 1 : 0,
        now,
        now
      );

      const newSupplier = await this.getSupplierById(result.lastInsertRowid as number);
      if (!newSupplier) {
        throw new Error('Failed to retrieve created supplier');
      }

      this.logger.info({ id: newSupplier.id, name: newSupplier.supplier_name }, 'Supplier created');
      return newSupplier;
    } catch (error) {
      this.logger.error({ supplierData, error }, 'Failed to create supplier');
      throw createStandardError('Failed to create supplier', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async updateSupplier(id: number, updates: Partial<Supplier>): Promise<Supplier | null> {
    try {
      const existingSupplier = await this.getSupplierById(id);
      if (!existingSupplier) {
        return null;
      }

      const now = new Date().toISOString();
      const updatedSupplier = { ...existingSupplier, ...updates, updated_at: now };

      const query = `
        UPDATE suppliers SET
          supplier_name = ?, contact_phone = ?, contact_email = ?, address = ?,
          tax_id = ?, active = ?, updated_at = ?
        WHERE id = ?
      `;

      this.db.prepare(query).run(
        updatedSupplier.supplier_name,
        updatedSupplier.contact_phone || null,
        updatedSupplier.contact_email || null,
        updatedSupplier.address || null,
        updatedSupplier.tax_id || null,
        updatedSupplier.active ? 1 : 0,
        now,
        id
      );

      const result = await this.getSupplierById(id);
      this.logger.info({ id }, 'Supplier updated');
      return result;
    } catch (error) {
      this.logger.error({ id, updates, error }, 'Failed to update supplier');
      throw createStandardError('Failed to update supplier', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async deactivateSupplier(id: number): Promise<boolean> {
    try {
      const existingSupplier = await this.getSupplierById(id);
      if (!existingSupplier) {
        return false;
      }

      const query = 'UPDATE suppliers SET active = 0, updated_at = ? WHERE id = ?';
      const result = this.db.prepare(query).run(new Date().toISOString(), id);

      this.logger.info({ id }, 'Supplier deactivated');
      return result.changes > 0;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to deactivate supplier');
      throw createStandardError('Failed to deactivate supplier', ERROR_CODES.DATABASE_ERROR);
    }
  }
}
