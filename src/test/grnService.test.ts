import { describe, it, expect, beforeEach } from 'vitest';
import { mockGRNService, mockDataService, createTestData, resetMockData } from './utils/databaseMock';

describe('GRNService', () => {
  let testSupplierId: number;
  let testProductId: number;

  beforeEach(async () => {
    resetMockData();
    
    // Create test supplier
    const supplier = await mockDataService.createSupplier(createTestData.supplier());
    testSupplierId = supplier.id!;

    // Create test product
    const product = await mockDataService.createProduct(createTestData.product());
    testProductId = product.id!;
  });


  describe('createGRN', () => {
    it('should create a new GRN', async () => {
      const result = await mockGRNService.createGRN({
        supplier_id: testSupplierId,
        received_by: 1,
        note: 'Test GRN'
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.supplier_id).toBe(testSupplierId);
    });
  });

  describe('upsertGRNLine', () => {
    it('should create a new GRN line', async () => {
      const grn = await mockDataService.createGRN({
        supplier_id: testSupplierId,
        received_by: 1
      });
      
      const result = await mockGRNService.upsertGRNLine({
        grn_id: grn.id,
        product_id: testProductId,
        qty: 10,
        unit_cost: 50,
        mrp: 100,
        batch_no: 'BATCH001',
        expiry_date: '2025-12-31'
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.product_id).toBe(testProductId);
    });
  });
});

