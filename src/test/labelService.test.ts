import { describe, it, expect } from 'vitest';
import { validateLabelItemDates } from '@/services/labelService';
import { LabelItem } from '@/types';

describe('labelService', () => {
  describe('validateLabelItemDates', () => {
    const createTestItem = (packedDate?: string | null, expiryDate?: string | null): LabelItem => ({
      id: 'test-1',
      sku: 'TEST001',
      name_en: 'Test Product',
      name_si: 'Test Product SI',
      name_ta: 'Test Product TA',
      barcode: '1234567890123',
      unit: 'pcs',
      price_retail: 100,
      price_wholesale: 90,
      price_credit: 95,
      price_other: 100,
      qty: 1,
      price_tier: 'retail',
      language: 'EN',
      packedDate,
      expiryDate,
      mrp: null,
      batchNo: null
    });

    describe('YYYY-MM-DD format', () => {
      it('should validate correct date format', () => {
        const item = createTestItem('2024-03-15', '2024-09-15');
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid date format', () => {
        const item = createTestItem('15/03/2024', '15/09/2024');
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid packed date format. Expected YYYY-MM-DD');
      });

      it('should reject expiry before packed date', () => {
        const item = createTestItem('2024-09-15', '2024-03-15');
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Expiry date cannot be before packed date');
      });

      it('should allow same packed and expiry date', () => {
        const item = createTestItem('2024-03-15', '2024-03-15');
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate when only packed date is provided', () => {
        const item = createTestItem('2024-03-15', null);
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate when only expiry date is provided', () => {
        const item = createTestItem(null, '2024-09-15');
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate when no dates are provided', () => {
        const item = createTestItem(null, null);
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('DD/MM/YYYY format', () => {
      it('should validate correct date format', () => {
        const item = createTestItem('15/03/2024', '15/09/2024');
        const result = validateLabelItemDates(item, 'DD/MM/YYYY');
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject YYYY-MM-DD format when DD/MM/YYYY expected', () => {
        const item = createTestItem('2024-03-15', '2024-09-15');
        const result = validateLabelItemDates(item, 'DD/MM/YYYY');
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid packed date format. Expected DD/MM/YYYY');
      });

      it('should reject expiry before packed date', () => {
        const item = createTestItem('15/09/2024', '15/03/2024');
        const result = validateLabelItemDates(item, 'DD/MM/YYYY');
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Expiry date cannot be before packed date');
      });
    });

    describe('MM/DD/YYYY format', () => {
      it('should validate correct date format', () => {
        const item = createTestItem('03/15/2024', '09/15/2024');
        const result = validateLabelItemDates(item, 'MM/DD/YYYY');
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject expiry before packed date', () => {
        const item = createTestItem('09/15/2024', '03/15/2024');
        const result = validateLabelItemDates(item, 'MM/DD/YYYY');
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Expiry date cannot be before packed date');
      });
    });

    describe('edge cases', () => {
      it('should handle invalid date strings gracefully', () => {
        const item = createTestItem('invalid-date', '2024-09-15');
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid packed date format. Expected YYYY-MM-DD');
      });

      it('should handle leap year dates correctly', () => {
        const item = createTestItem('2024-02-29', '2024-12-31');
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-leap year February 29th', () => {
        const item = createTestItem('2023-02-29', '2023-12-31');
        const result = validateLabelItemDates(item, 'YYYY-MM-DD');
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid packed date format. Expected YYYY-MM-DD');
      });
    });
  });
});


