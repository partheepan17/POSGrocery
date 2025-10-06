import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { grnService } from '../services/grnService';
import { database } from '../services/database';
import { dataService } from '../services/dataService';

describe('GRNService', () => {
  let testSupplierId: number;
  let testProductId: number;

  beforeEach(async () => {
    // Create test supplier
    const supplier = await dataService.createSupplier({
      supplier_name: 'Test Supplier',
      contact_phone: '1234567890',
      contact_email: 'test@supplier.com',
      address: 'Test Address',
      active: true
    });
    testSupplierId = supplier.id!;

    // Create test product
    const product = await dataService.createProduct({
      sku: 'TEST-001',
      name_en: 'Test Product',
      barcode: '1234567890123',
      category_id: 1,
      price_retail: 100,
      price_wholesale: 90,
      price_credit: 95,
      price_other: 100,
      cost: 50,
      unit: 'pc',
      is_scale_item: false,
      is_active: true
    });
    testProductId = product.id!;
  });

  afterEach(async () => {
    // Clean up test data
    const db = await database;
    await db.run('DELETE FROM grn_lines WHERE product_id = ?', [testProductId]);
    await db.run('DELETE FROM grn WHERE supplier_id = ?', [testSupplierId]);
    await db.run('DELETE FROM products WHERE id = ?', [testProductId]);
    await db.run('DELETE FROM suppliers WHERE id = ?', [testSupplierId]);
  });

  describe('getNextGRNNo', () => {
    it('should generate sequential GRN numbers', async () => {
      const grnNo1 = await grnService.getNextGRNNo();
      const grnNo2 = await grnService.getNextGRNNo();
      
      expect(grnNo1).toMatch(/^GRN-\d{4}-\d{6}$/);
      expect(grnNo2).toMatch(/^GRN-\d{4}-\d{6}$/);
      expect(grnNo1).not.toBe(grnNo2);
    });
  });

  describe('createGRN', () => {
    it('should create a new GRN with generated number', async () => {
      const grnId = await grnService.createGRN({
        supplier_id: testSupplierId,
        received_by: null,
        note: 'Test GRN'
      });

      expect(grnId).toBeGreaterThan(0);

      const grn = await grnService.getGRN(grnId);
      expect(grn.header.supplier_id).toBe(testSupplierId);
      expect(grn.header.note).toBe('Test GRN');
      expect(grn.header.status).toBe('OPEN');
      expect(grn.header.grn_no).toMatch(/^GRN-\d{4}-\d{6}$/);
    });
  });

  describe('upsertGRNLine', () => {
    it('should create a new GRN line', async () => {
      const grnId = await grnService.createGRN({
        supplier_id: testSupplierId,
        received_by: null,
        note: 'Test GRN'
      });

      const lineResult = await grnService.upsertGRNLine({
        grn_id: grnId,
        product_id: testProductId,
        qty: 10,
        unit_cost: 50,
        mrp: 100,
        batch_no: 'BATCH001',
        expiry_date: '2025-12-31'
      });

      expect(lineResult.lineId).toBeGreaterThan(0);

      const grn = await grnService.getGRN(grnId);
      expect(grn.lines).toHaveLength(1);
      expect(grn.lines[0].qty).toBe(10);
      expect(grn.lines[0].unit_cost).toBe(50);
      expect(grn.lines[0].line_total).toBe(500);
      expect(grn.lines[0].batch_no).toBe('BATCH001');
      expect(grn.lines[0].expiry_date).toBe('2025-12-31');
    });

    it('should update an existing GRN line', async () => {
      const grnId = await grnService.createGRN({
        supplier_id: testSupplierId,
        received_by: null,
        note: 'Test GRN'
      });

      const lineResult = await grnService.upsertGRNLine({
        grn_id: grnId,
        product_id: testProductId,
        qty: 10,
        unit_cost: 50,
        mrp: 100,
        batch_no: 'BATCH001',
        expiry_date: '2025-12-31'
      });

      // Update the line
      await grnService.upsertGRNLine({
        grn_id: grnId,
        product_id: testProductId,
        qty: 15,
        unit_cost: 60,
        mrp: 120,
        batch_no: 'BATCH002',
        expiry_date: '2025-12-31'
      });

      const grn = await grnService.getGRN(grnId);
      expect(grn.lines).toHaveLength(1);
      expect(grn.lines[0].qty).toBe(15);
      expect(grn.lines[0].unit_cost).toBe(60);
      expect(grn.lines[0].line_total).toBe(900);
      expect(grn.lines[0].batch_no).toBe('BATCH002');
    });
  });

  describe('postGRN', () => {
    it('should post GRN and update inventory', async () => {
      const grnId = await grnService.createGRN({
        supplier_id: testSupplierId,
        received_by: null,
        note: 'Test GRN'
      });

      await grnService.upsertGRNLine({
        grn_id: grnId,
        product_id: testProductId,
        qty: 10,
        unit_cost: 50,
        mrp: 100,
        batch_no: 'BATCH001',
        expiry_date: '2025-12-31'
      });

      // Post the GRN
      await grnService.postGRN(grnId, { updateCostPolicy: 'latest' });

      const grn = await grnService.getGRN(grnId);
      expect(grn.header.status).toBe('POSTED');
      expect(grn.header.total).toBe(500);

      // Check inventory movement was created
      const db = await database;
      const movement = await db.get(`
        SELECT * FROM inventory_movements 
        WHERE product_id = ? AND type = 'RECEIVE' AND reason = 'GRN'
      `, [testProductId]);

      expect(movement).toBeTruthy();
      expect(movement.qty).toBe(10);

      // Check product cost was updated
      const product = await dataService.getProductById(testProductId);
      expect(product).toBeTruthy();
      expect(product?.cost).toBe(50); // Should be updated to latest cost
    });

    it('should not allow posting non-OPEN GRN', async () => {
      const grnId = await grnService.createGRN({
        supplier_id: testSupplierId,
        received_by: null,
        note: 'Test GRN'
      });

      await grnService.upsertGRNLine({
        grn_id: grnId,
        product_id: testProductId,
        qty: 10,
        unit_cost: 50,
        mrp: 100,
        batch_no: 'BATCH001',
        expiry_date: '2025-12-31'
      });

      // Post the GRN first time
      await grnService.postGRN(grnId);

      // Try to post again
      await expect(grnService.postGRN(grnId)).rejects.toThrow('Only OPEN GRNs can be posted');
    });
  });

  describe('buildLabelItemsFromGRN', () => {
    it('should build label items for printing', async () => {
      const grnId = await grnService.createGRN({
        supplier_id: testSupplierId,
        received_by: null,
        note: 'Test GRN'
      });

      await grnService.upsertGRNLine({
        grn_id: grnId,
        product_id: testProductId,
        qty: 3,
        unit_cost: 50,
        mrp: 100,
        batch_no: 'BATCH001',
        expiry_date: '2025-12-31'
      });

      await grnService.postGRN(grnId);

      const labelItems = await grnService.buildLabelItemsFromGRN(grnId, 'EN');

      expect(labelItems).toHaveLength(3); // One item per quantity
      expect(labelItems[0]).toMatchObject({
        sku: 'TEST-001',
        barcode: '1234567890123',
        name: 'Test Product',
        price: 50,
        mrp: 100,
        qty: 1,
        batch_no: 'BATCH001',
        expiry_date: '2025-12-31'
      });
    });
  });

  describe('voidGRN', () => {
    it('should void an OPEN GRN', async () => {
      const grnId = await grnService.createGRN({
        supplier_id: testSupplierId,
        received_by: null,
        note: 'Test GRN'
      });

      await grnService.voidGRN(grnId, 'Test void reason');

      const grn = await grnService.getGRN(grnId);
      expect(grn.header.status).toBe('VOID');
      expect(grn.header.note).toContain('VOIDED: Test void reason');
    });

    it('should not allow voiding POSTED GRN', async () => {
      const grnId = await grnService.createGRN({
        supplier_id: testSupplierId,
        received_by: null,
        note: 'Test GRN'
      });

      await grnService.upsertGRNLine({
        grn_id: grnId,
        product_id: testProductId,
        qty: 10,
        unit_cost: 50,
        mrp: 100,
        batch_no: 'BATCH001',
        expiry_date: '2025-12-31'
      });

      await grnService.postGRN(grnId);

      await expect(grnService.voidGRN(grnId, 'Test void reason')).rejects.toThrow('Only OPEN GRNs can be voided');
    });
  });
});

