/**
 * Category Service
 * Handles category management operations
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';

export interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class CategoryService {
  private db = getDatabase();
  private logger = createContextLogger({ operation: 'category_service' });

  constructor() {
    // Ensure database is initialized
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const query = 'SELECT * FROM categories WHERE is_active = 1 ORDER BY name';
      const categories = this.db.prepare(query).all() as Category[];

      this.logger.info({ returned: categories.length }, 'Categories retrieved');
      return categories;
    } catch (error) {
      this.logger.error({ error }, 'Failed to get categories');
      throw createStandardError('Failed to retrieve categories', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async getCategoryById(id: number): Promise<Category | null> {
    try {
      const query = 'SELECT * FROM categories WHERE id = ?';
      const category = this.db.prepare(query).get(id) as Category | undefined;
      
      if (!category) {
        return null;
      }

      this.logger.info({ id }, 'Category retrieved by ID');
      return category;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to get category by ID');
      throw createStandardError('Failed to retrieve category', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async createCategory(categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    try {
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO categories (name, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `;

      const result = this.db.prepare(query).run(
        categoryData.name,
        categoryData.description || null,
        categoryData.is_active ? 1 : 0,
        now,
        now
      );

      const newCategory = await this.getCategoryById(result.lastInsertRowid as number);
      if (!newCategory) {
        throw new Error('Failed to retrieve created category');
      }

      this.logger.info({ id: newCategory.id, name: newCategory.name }, 'Category created');
      return newCategory;
    } catch (error) {
      this.logger.error({ categoryData, error }, 'Failed to create category');
      throw createStandardError('Failed to create category', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async updateCategory(id: number, updates: Partial<Category>): Promise<Category | null> {
    try {
      const existingCategory = await this.getCategoryById(id);
      if (!existingCategory) {
        return null;
      }

      const now = new Date().toISOString();
      const updatedCategory = { ...existingCategory, ...updates, updated_at: now };

      const query = `
        UPDATE categories SET
          name = ?, description = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `;

      this.db.prepare(query).run(
        updatedCategory.name,
        updatedCategory.description || null,
        updatedCategory.is_active ? 1 : 0,
        now,
        id
      );

      const result = await this.getCategoryById(id);
      this.logger.info({ id }, 'Category updated');
      return result;
    } catch (error) {
      this.logger.error({ id, updates, error }, 'Failed to update category');
      throw createStandardError('Failed to update category', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async deactivateCategory(id: number): Promise<boolean> {
    try {
      const existingCategory = await this.getCategoryById(id);
      if (!existingCategory) {
        return false;
      }

      const query = 'UPDATE categories SET is_active = 0, updated_at = ? WHERE id = ?';
      const result = this.db.prepare(query).run(new Date().toISOString(), id);

      this.logger.info({ id }, 'Category deactivated');
      return result.changes > 0;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to deactivate category');
      throw createStandardError('Failed to deactivate category', ERROR_CODES.DATABASE_ERROR);
    }
  }
}
