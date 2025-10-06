import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { grnService } from '../services/grnService';
import { dataService } from '../services/dataService';
import { database } from '../services/database';

describe('GRN Integration Test', () => {
  beforeEach(async () => {
    // Initialize database
    await database.initialize();
    await database.runMigrations();
  });

  afterEach(async () => {
    // Clean up
    const db = await database;
    db.tables.clear();
    db.saveToStorage();
  });

  it('should create a complete GRN workflow', async () => {
    // Get sample suppliers and products
    const suppliers = await dataService.getSuppliers();
    const products = await dataService.getProducts();
    
    expect(suppliers.length).toBeGreaterThan(0);
    expect(products.length).toBeGreaterThan(0);
    
    const supplier = suppliers[0];
    const product = products[0];
    
    // Create GRN
    const grnId = await grnService.createGRN({
      supplier_id: supplier.id,
      received_by: null,
      note: 'Integration test GRN'
    });
    
    expect(grnId).toBeGreaterThan(0);
    
    // Add product to GRN
    const lineResult = await grnService.upsertGRNLine({
      grn_id: grnId,
      product_id: product.id,
      qty: 10,
      unit_cost: 25.50,
      mrp: 50.00,
      batch_no: 'BATCH-001',
      expiry_date: '2025-12-31'
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
    const db = await database;
    const movements = await db.query(`
      SELECT * FROM inventory_movements 
      WHERE product_id = ? AND type = 'RECEIVE'
    `, [product.id]);
    
    expect(movements.length).toBeGreaterThan(0);
    expect(movements[0].qty).toBe(10);
    expect(movements[0].reason).toBe('GRN');
  });

  it('should generate sequential GRN numbers', async () => {
    const suppliers = await dataService.getSuppliers();
    const supplier = suppliers[0];
    
    const grnId1 = await grnService.createGRN({
      supplier_id: supplier.id,
      received_by: null,
      note: 'First GRN'
    });
    
    const grnId2 = await grnService.createGRN({
      supplier_id: supplier.id,
      received_by: null,
      note: 'Second GRN'
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
    
    const supplier = suppliers[0];
    const product = products[0];
    
    // Create and post GRN
    const grnId = await grnService.createGRN({
      supplier_id: supplier.id,
      received_by: null,
      note: 'Label test GRN'
    });
    
    await grnService.upsertGRNLine({
      grn_id: grnId,
      product_id: product.id,
      qty: 3,
      unit_cost: 25.50,
      mrp: 50.00,
      batch_no: 'BATCH-001',
      expiry_date: '2025-12-31'
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

