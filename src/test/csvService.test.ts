import { describe, it, expect } from 'vitest';
import { csvService } from '@/services/csvService';
import { LabelItem } from '@/types';

describe('csvService - Label Extensions', () => {
  describe('importLabelsCSV', () => {
    it('should parse CSV with new label fields', async () => {
      const csvContent = `barcode,sku,qty,price_tier,language,packed_date,expiry_date,mrp,batch_no
123456789012,ITEM001,2,retail,EN,2024-03-15,2024-09-15,150.00,B001
,ITEM002,1,wholesale,SI,2024-03-15,2024-12-31,75.50,LOT123
987654321098,ITEM003,5,retail,TA,2024-03-15,,299.99,BATCH456`;

      const result = await csvService.importLabelsCSVFromString(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(3);
      
      // Check first item
      const item1 = result.items[0];
      expect(item1.language).toBe('EN');
      expect(item1.packedDate).toBe('2024-03-15');
      expect(item1.expiryDate).toBe('2024-09-15');
      expect(item1.mrp).toBe(150.00);
      expect(item1.batchNo).toBe('B001');
      
      // Check second item
      const item2 = result.items[1];
      expect(item2.language).toBe('SI');
      expect(item2.mrp).toBe(75.50);
      expect(item2.batchNo).toBe('LOT123');
      
      // Check third item (no expiry date)
      const item3 = result.items[2];
      expect(item3.language).toBe('TA');
      expect(item3.expiryDate).toBe(null);
      expect(item3.mrp).toBe(299.99);
      expect(item3.batchNo).toBe('BATCH456');
    });

    it('should validate MRP values', async () => {
      const csvContent = `barcode,sku,qty,mrp
123456789012,ITEM001,1,-50.00
123456789013,ITEM002,1,0
123456789014,ITEM003,1,invalid`;

      const result = await csvService.importLabelsCSVFromString(csvContent);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Row 2: MRP must be >= 0');
      expect(result.errors).toContain('Row 4: Invalid MRP value');
    });

    it('should validate language values', async () => {
      const csvContent = `barcode,sku,qty,language
123456789012,ITEM001,1,EN
123456789013,ITEM002,1,INVALID
123456789014,ITEM003,1,FR`;

      const result = await csvService.importLabelsCSVFromString(csvContent);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Row 3: Invalid language. Must be EN, SI, or TA');
      expect(result.errors).toContain('Row 4: Invalid language. Must be EN, SI, or TA');
    });

    it('should validate date formats and relationships', async () => {
      const csvContent = `barcode,sku,qty,packed_date,expiry_date
123456789012,ITEM001,1,2024-03-15,2024-01-15
123456789013,ITEM002,1,invalid-date,2024-12-31
123456789014,ITEM003,1,15/03/2024,31/12/2024`;

      const result = await csvService.importLabelsCSVFromString(csvContent);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Row 2: Expiry date cannot be before packed date');
      expect(result.errors).toContain('Row 3: Invalid packed_date format. Use YYYY-MM-DD');
      expect(result.errors).toContain('Row 4: Non-ISO date format detected. Consider using YYYY-MM-DD');
    });

    it('should handle empty optional fields', async () => {
      const csvContent = `barcode,sku,qty,packed_date,expiry_date,mrp,batch_no
123456789012,ITEM001,1,,,
123456789013,ITEM002,1,2024-03-15,,,B001`;

      const result = await csvService.importLabelsCSVFromString(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      
      const item1 = result.items[0];
      expect(item1.packedDate).toBe(null);
      expect(item1.expiryDate).toBe(null);
      expect(item1.mrp).toBe(null);
      expect(item1.batchNo).toBe(null);
      
      const item2 = result.items[1];
      expect(item2.packedDate).toBe('2024-03-15');
      expect(item2.expiryDate).toBe(null);
      expect(item2.mrp).toBe(null);
      expect(item2.batchNo).toBe('B001');
    });
  });

  describe('exportLabelsCSV', () => {
    it('should export CSV with new label fields', async () => {
      const items: LabelItem[] = [
        {
          id: 'test-1',
          sku: 'ITEM001',
          name_en: 'Test Product 1',
          name_si: 'Test Product 1 SI',
          name_ta: 'Test Product 1 TA',
          barcode: '123456789012',
          unit: 'pcs',
          price_retail: 100,
          price_wholesale: 90,
          price_credit: 95,
          price_other: 100,
          qty: 2,
          price_tier: 'retail',
          language: 'EN',
          packedDate: '2024-03-15',
          expiryDate: '2024-09-15',
          mrp: 150.00,
          batchNo: 'B001'
        },
        {
          id: 'test-2',
          sku: 'ITEM002',
          name_en: 'Test Product 2',
          name_si: 'Test Product 2 SI',
          name_ta: 'Test Product 2 TA',
          barcode: '123456789013',
          unit: 'pcs',
          price_retail: 75,
          price_wholesale: 70,
          price_credit: 72,
          price_other: 75,
          qty: 1,
          price_tier: 'wholesale',
          language: 'SI',
          packedDate: null,
          expiryDate: null,
          mrp: null,
          batchNo: null
        }
      ];

      const csvContent = await csvService.exportLabelsCSV(items);
      
      expect(csvContent).toContain('packed_date,expiry_date,mrp,batch_no');
      expect(csvContent).toContain('2024-03-15,2024-09-15,150,B001');
      expect(csvContent).toContain(',,');  // Empty fields for second item
    });

    it('should handle items with mixed field population', async () => {
      const items: LabelItem[] = [
        {
          id: 'test-1',
          sku: 'ITEM001',
          name_en: 'Test Product 1',
          name_si: 'Test Product 1 SI',
          name_ta: 'Test Product 1 TA',
          barcode: '123456789012',
          unit: 'pcs',
          price_retail: 100,
          price_wholesale: 90,
          price_credit: 95,
          price_other: 100,
          qty: 1,
          price_tier: 'retail',
          language: 'EN',
          packedDate: '2024-03-15',
          expiryDate: null,
          mrp: 150.00,
          batchNo: null
        }
      ];

      const csvContent = await csvService.exportLabelsCSV(items);
      
      expect(csvContent).toContain('2024-03-15,,150,');
    });
  });

  describe('CSV roundtrip', () => {
    it('should maintain data integrity through import/export cycle', async () => {
      const originalItems: LabelItem[] = [
        {
          id: 'test-1',
          sku: 'ITEM001',
          name_en: 'Test Product',
          name_si: 'Test Product SI',
          name_ta: 'Test Product TA',
          barcode: '123456789012',
          unit: 'pcs',
          price_retail: 100,
          price_wholesale: 90,
          price_credit: 95,
          price_other: 100,
          qty: 2,
          price_tier: 'retail',
          language: 'EN',
          packedDate: '2024-03-15',
          expiryDate: '2024-09-15',
          mrp: 150.00,
          batchNo: 'B001'
        }
      ];

      // Export to CSV
      const csvContent = csvService.exportLabelsCSVToString(originalItems);
      
      // Import back from CSV
      const importResult = await csvService.importLabelsCSVFromString(csvContent);
      
      expect(importResult.success).toBe(true);
      expect(importResult.items).toHaveLength(1);
      
      const importedItem = importResult.items[0];
      expect(importedItem.language).toBe('EN');
      expect(importedItem.packedDate).toBe('2024-03-15');
      expect(importedItem.expiryDate).toBe('2024-09-15');
      expect(importedItem.mrp).toBe(150.00);
      expect(importedItem.batchNo).toBe('B001');
    });
  });
});


