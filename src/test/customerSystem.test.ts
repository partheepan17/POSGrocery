import { describe, it, expect, beforeEach } from 'vitest';
import { mockDataService, mockCSVService, createTestData, resetMockData } from './utils/databaseMock';

describe('Customer System', () => {
  beforeEach(() => {
    resetMockData();
  });

  it('should create customer manually', async () => {
    const testCustomer = createTestData.customer({
      customer_name: 'ABC Test Customer',
      phone: '+94 77 123 4567',
      customer_type: 'Wholesale',
      note: 'Test customer for wholesale orders'
    });

    const createdCustomer = await mockDataService.createCustomer(testCustomer);
    
    expect(createdCustomer).toBeDefined();
    expect(createdCustomer.id).toBeDefined();
    expect(createdCustomer.customer_name).toBe('ABC Test Customer');
    expect(createdCustomer.customer_type).toBe('Wholesale');
    expect(createdCustomer.active).toBe(true);
  });

  it('should handle CSV import with mixed customer types', async () => {
    const testCSV = `customer_name,phone,customer_type,note,active
John Doe,+94 77 123 4567,Retail,"Regular customer",true
ABC Company Ltd,+94 11 234 5678,Wholesale,"Bulk orders monthly",true
XYZ Restaurant,+94 81 567 8901,Credit,"30-day payment terms",true`;

    const importResult = await mockCSVService.parseCSV(testCSV);
    
    expect(importResult).toBeDefined();
    expect(importResult.length).toBe(3);
    expect(importResult[0].customer_name).toBe('John Doe');
    expect(importResult[1].customer_type).toBe('Wholesale');
  });

  it('should filter and search customers', async () => {
    // Create test customers
    await mockDataService.createCustomer(createTestData.customer({ customer_name: 'ABC Company', customer_type: 'Wholesale' }));
    await mockDataService.createCustomer(createTestData.customer({ customer_name: 'XYZ Corp', customer_type: 'Wholesale', active: false }));
    await mockDataService.createCustomer(createTestData.customer({ customer_name: 'Test Retail', customer_type: 'Retail' }));

    const allCustomers = await mockDataService.getCustomers();
    const activeCustomers = await mockDataService.getCustomers({ active: true });
    const searchResults = await mockDataService.getCustomers({ search: 'ABC' });
    const retailCustomers = await mockDataService.getCustomers({ customer_type: 'Retail' });
    
    expect(allCustomers.customers.length).toBe(3);
    expect(activeCustomers.customers.length).toBe(2);
    expect(searchResults.customers.length).toBe(1);
    expect(retailCustomers.customers.length).toBe(1);
  });

  it('should update customer', async () => {
    const customer = await mockDataService.createCustomer(createTestData.customer());
    
    const updatedCustomer = await mockDataService.updateCustomer(customer.id!, { active: false });
    
    expect(updatedCustomer).toBeDefined();
    expect(updatedCustomer?.active).toBe(false);
  });

  it('should get customer stats', async () => {
    await mockDataService.createCustomer(createTestData.customer({ active: true }));
    await mockDataService.createCustomer(createTestData.customer({ active: false }));
    
    const stats = await mockDataService.getCustomerStats();
    
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
  });

  it('should get sales count by customer', async () => {
    const customer = await mockDataService.createCustomer(createTestData.customer());
    
    const salesCount = await mockDataService.getSalesCountByCustomer(customer.id!);
    
    expect(salesCount).toBe(0); // No sales created yet
  });
});








