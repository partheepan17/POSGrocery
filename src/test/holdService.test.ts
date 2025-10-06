import { describe, it, expect, beforeEach } from 'vitest';
import { holdService } from '../services/holdService';
import { dataService } from '../services/dataService';

describe('Hold Service', () => {
  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();
    await dataService.initialize();
  });

  it('should create and retrieve holds', async () => {
    // Create a test hold
    const holdInput = {
      hold_name: 'Test Hold',
      customer_id: null,
      cashier_id: 1,
      terminal_name: 'POS-001',
      price_tier: 'Retail' as const,
      lines: [
        {
          product_id: 1,
          quantity: 2,
          unit_price: 100,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 200
        }
      ],
      note: 'Test hold note'
    };

    // Create the hold
    const createdHold = await holdService.createHold(holdInput);
    expect(createdHold).toBeDefined();
    expect(createdHold.hold_name).toBe('Test Hold');
    expect(createdHold.status).toBe('HELD');

    // Retrieve holds
    const holds = await holdService.listHolds();
    expect(holds.length).toBeGreaterThan(0);
    
    const testHold = holds.find(h => h.hold_name === 'Test Hold');
    expect(testHold).toBeDefined();
    expect(testHold?.status).toBe('HELD');
  });

  it('should filter holds by terminal', async () => {
    // Create holds for different terminals
    const holdInput1 = {
      hold_name: 'Terminal 1 Hold',
      customer_id: null,
      cashier_id: 1,
      terminal_name: 'POS-001',
      price_tier: 'Retail' as const,
      lines: [
        {
          product_id: 1,
          quantity: 1,
          unit_price: 50,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 50
        }
      ]
    };

    const holdInput2 = {
      hold_name: 'Terminal 2 Hold',
      customer_id: null,
      cashier_id: 1,
      terminal_name: 'POS-002',
      price_tier: 'Retail' as const,
      lines: [
        {
          product_id: 1,
          quantity: 1,
          unit_price: 50,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 50
        }
      ]
    };

    await holdService.createHold(holdInput1);
    await holdService.createHold(holdInput2);

    // Filter by terminal
    const terminal1Holds = await holdService.listHolds({ terminal: 'POS-001' });
    expect(terminal1Holds.length).toBe(1);
    expect(terminal1Holds[0].terminal_name).toBe('POS-001');

    const terminal2Holds = await holdService.listHolds({ terminal: 'POS-002' });
    expect(terminal2Holds.length).toBe(1);
    expect(terminal2Holds[0].terminal_name).toBe('POS-002');
  });

  it('should get hold by ID with line items', async () => {
    // Create a hold
    const holdInput = {
      hold_name: 'Detailed Hold',
      customer_id: null,
      cashier_id: 1,
      terminal_name: 'POS-001',
      price_tier: 'Retail' as const,
      lines: [
        {
          product_id: 1,
          quantity: 3,
          unit_price: 25,
          discount_amount: 5,
          tax_amount: 2,
          total_amount: 72
        }
      ]
    };

    const createdHold = await holdService.createHold(holdInput);
    
    // Get hold by ID
    const retrievedHold = await holdService.getHoldById(createdHold.id);
    expect(retrievedHold).toBeDefined();
    expect(retrievedHold?.hold_name).toBe('Detailed Hold');
    expect(retrievedHold?.lines).toBeDefined();
    expect(retrievedHold?.lines.length).toBe(1);
    expect(retrievedHold?.lines[0].quantity).toBe(3);
    expect(retrievedHold?.lines[0].unit_price).toBe(25);
  });
});

