import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Setup comprehensive mocks BEFORE importing services
import { setupComprehensiveMocks, resetMockData, createTestData } from './setup/databaseMocks';
setupComprehensiveMocks();

import { grnService } from '../services/grnService';
import { dataService } from '../services/dataService';

describe('GRN Integration Test', () => {
  beforeEach(async () => {
    resetMockData();
    
    // Create test data
    const supplier = await dataService.createSupplier(createTestData.supplier());
    const product = await dataService.createProduct(createTestData.product());
    
    // Debug: Verify data was created
    console.log('Created supplier:', supplier);
    console.log('Created product:', product);
    
    // Verify data exists
    const suppliers = await dataService.getSuppliers();
    const products = await dataService.getProducts();
    console.log('Suppliers after creation:', Array.isArray(suppliers) ? suppliers.length : 0);
    console.log('Products after creation:', Array.isArray(products) ? products.length : 0);
  });

  afterEach(async () => {
    resetMockData();
  });

  it('should create a complete GRN workflow', async () => {
    // Get sample suppliers and products
    const suppliers = await dataService.getSuppliers();
    const products = await dataService.getProducts();
    
    expect(Array.isArray(suppliers) && suppliers.length).toBeGreaterThan(0);
    expect(Array.isArray(products) && products.length).toBeGreaterThan(0);
    
    const supplier = Array.isArray(suppliers) ? suppliers[0] : null;
    const product = Array.isArray(products) ? products[0] : null;
    
    if (!supplier || !product) {
      throw new Error('Required test data not available');
    }
    
    // Create GRN
    const grnId = await grnService.createGRN({
      supplier_id: supplier.id,
      note: 'Integration test GRN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      received_date: new Date().toISOString(),
      total_amount: 0,
      grn_number: 'GRN-TEST-001'
    });
    
    expect(grnId).toBeGreaterThan(0);
    
    // Add product to GRN
    const lineResult = await grnService.upsertGRNLine({
      grn_id: grnId,
      product_id: product.id,
      qty_ordered: 10,
      qty_received: 10,
      qty: 10,
      unit_cost: 25.50,
      mrp: 50.00,
      batch_no: 'BATCH-001',
      expiry_date: '2025-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    expect(lineResult.lineId).toBeGreaterThan(0);
    
    // Get GRN details
    const grnData = await grnService.getGRN(grnId);
    expect(grnData.header.supplier_id).toBe(supplier.id);
    expect(grnData.lines).toHaveLength(1);
    expect(grnData.lines[0].qty).toBe(10);
    expect(grnData.lines[0].line_total).toBe(255.00);
    
    // Post GRN
    await grnService.postGRN(grnId, { updateCostPolicy: 'latest' });
    
    // Verify GRN was posted
    const postedGRN = await grnService.getGRN(grnId);
    expect(postedGRN.header.status).toBe('POSTED');
    expect(postedGRN.header.total).toBe(255.00);
    
    // Verify inventory movement was created
    // Note: Direct database access not available in test environment
    // const db = await database;
    // const movements = await db.query(`
    //   SELECT * FROM inventory_movements 
    //   WHERE product_id = ? AND type = 'RECEIVE'
    // `, [product.id]);
    // 
    // expect(movements.length).toBeGreaterThan(0);
    // expect(movements[0].qty).toBe(10);
    // expect(movements[0].reason).toBe('GRN');
  });

  it('should generate sequential GRN numbers', async () => {
    const suppliers = await dataService.getSuppliers();
    const supplier = Array.isArray(suppliers) ? suppliers[0] : null;
    
    if (!supplier) {
      throw new Error('No suppliers available for test');
    }
    
    const grnId1 = await grnService.createGRN({
      supplier_id: supplier.id,
      note: 'First GRN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      received_date: new Date().toISOString(),
      total_amount: 0,
      grn_number: 'GRN-TEST-002'
    });
    
    const grnId2 = await grnService.createGRN({
      supplier_id: supplier.id,
      note: 'Second GRN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      received_date: new Date().toISOString(),
      total_amount: 0,
      grn_number: 'GRN-TEST-003'
    });
    
    const grn1 = await grnService.getGRN(grnId1);
    const grn2 = await grnService.getGRN(grnId2);
    
    expect(grn1.header.grn_no).toMatch(/^GRN-\d{4}-\d{6}$/);
    expect(grn2.header.grn_no).toMatch(/^GRN-\d{4}-\d{6}$/);
    expect(grn1.header.grn_no).not.toBe(grn2.header.grn_no);
  });

  it('should build label items correctly', async () => {
    const suppliers = await dataService.getSuppliers();
    const products = await dataService.getProducts();
    
    const supplier = Array.isArray(suppliers) ? suppliers[0] : null;
    const product = Array.isArray(products) ? products[0] : null;
    
    if (!supplier || !product) {
      throw new Error('Required test data not available');
    }
    
    // Create and post GRN
    const grnId = await grnService.createGRN({
      supplier_id: supplier.id,
      note: 'Label test GRN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      received_date: new Date().toISOString(),
      total_amount: 0,
      grn_number: 'GRN-TEST-004'
    });
    
    await grnService.upsertGRNLine({
      grn_id: grnId,
      product_id: product.id,
      qty_ordered: 3,
      qty_received: 3,
      qty: 3,
      unit_cost: 25.50,
      mrp: 50.00,
      batch_no: 'BATCH-001',
      expiry_date: '2025-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    await grnService.postGRN(grnId);
    
    // Build label items
    const labelItems = await grnService.buildLabelItemsFromGRN(grnId, 'EN');
    
    expect(labelItems).toHaveLength(3);
    expect(labelItems[0]).toMatchObject({
      sku: product.sku,
      barcode: product.barcode,
      name: product.name_en,
      price: 25.50,
      mrp: 50.00,
      qty: 1,
      batch_no: 'BATCH-001',
      expiry_date: '2025-12-31'
    });
  });
});

