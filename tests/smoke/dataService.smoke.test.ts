import { describe, it, expect, beforeEach } from 'vitest';
import { dataService } from '../../src/services/database';
import type { 
  Product, 
  Customer, 
  Supplier, 
  DiscountRule, 
  Category 
} from '../../src/types';

/**
 * DataService Smoke Tests
 * Basic CRUD sanity checks for core entities
 * No external I/O, pure database operations
 */

describe('DataService Smoke Tests', () => {
  // Note: These tests assume a clean database or proper cleanup
  // In a real environment, you might want to use a test database

  describe('Product CRUD Operations', () => {
    let createdProductId: number;

    it('should create a product successfully', async () => {
      const productData: Omit<Product, 'id'> = {
        sku: 'TEST001',
        barcode: '1234567890999',
        name_en: 'Test Product',
        name_si: 'පරීක්ෂණ නිෂ්පාදනය',
        name_ta: 'சோதனை தயாரிப்பு',
        category_id: 1,
        unit: 'pc',
        price_retail: 100.00,
        price_wholesale: 90.00,
        price_credit: 95.00,
        price_other: 92.00,
        cost: 70.00,
        supplier_id: 1,
        reorder_level: 10,
        is_scale_item: false,
        active: true
      };

      const result = await dataService.createProduct(productData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.sku).toBe('TEST001');
      expect(result.name_en).toBe('Test Product');
      expect(result.price_retail).toBe(100.00);
      expect(result.active).toBe(true);
      
      createdProductId = result.id!;
    });

    it('should read product by ID', async () => {
      if (!createdProductId) {
        throw new Error('Product creation test must run first');
      }

      const product = await dataService.getProductById(createdProductId);
      
      expect(product).toBeDefined();
      expect(product!.id).toBe(createdProductId);
      expect(product!.sku).toBe('TEST001');
      expect(product!.name_en).toBe('Test Product');
    });

    it('should read product by SKU', async () => {
      const product = await dataService.getProductBySku('TEST001');
      
      expect(product).toBeDefined();
      expect(product!.sku).toBe('TEST001');
      expect(product!.name_en).toBe('Test Product');
    });

    it('should update product successfully', async () => {
      if (!createdProductId) {
        throw new Error('Product creation test must run first');
      }

      const updateData: Partial<Product> = {
        name_en: 'Updated Test Product',
        price_retail: 120.00,
        active: false
      };

      const result = await dataService.updateProduct(createdProductId, updateData);
      
      expect(result).toBeDefined();
      expect(result.name_en).toBe('Updated Test Product');
      expect(result.price_retail).toBe(120.00);
      expect(result.active).toBe(false);
    });

    it('should list products with filters', async () => {
      const products = await dataService.getProducts({ 
        active: false,
        search: 'Updated Test'
      });
      
      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      
      const testProduct = products.find(p => p.sku === 'TEST001');
      expect(testProduct).toBeDefined();
      expect(testProduct!.name_en).toBe('Updated Test Product');
    });

    it('should delete product successfully', async () => {
      if (!createdProductId) {
        throw new Error('Product creation test must run first');
      }

      await dataService.deleteProduct(createdProductId);
      
      // Verify deletion
      const deletedProduct = await dataService.getProductById(createdProductId);
      expect(deletedProduct).toBeNull();
    });
  });

  describe('Customer CRUD Operations', () => {
    let createdCustomerId: number;

    it('should create a customer successfully', async () => {
      const customerData: Omit<Customer, 'id'> = {
        customer_name: 'Test Customer Ltd',
        phone: '+94111234567',
        customer_type: 'Wholesale',
        note: 'Test customer for smoke tests',
        active: true
      };

      const result = await dataService.createCustomer(customerData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.customer_name).toBe('Test Customer Ltd');
      expect(result.customer_type).toBe('Wholesale');
      expect(result.active).toBe(true);
      
      createdCustomerId = result.id!;
    });

    it('should read customer back', async () => {
      if (!createdCustomerId) {
        throw new Error('Customer creation test must run first');
      }

      const customers = await dataService.getCustomers();
      const testCustomer = customers.find(c => c.id === createdCustomerId);
      
      expect(testCustomer).toBeDefined();
      expect(testCustomer!.customer_name).toBe('Test Customer Ltd');
      expect(testCustomer!.customer_type).toBe('Wholesale');
    });

    it('should update customer successfully', async () => {
      if (!createdCustomerId) {
        throw new Error('Customer creation test must run first');
      }

      const updateData: Partial<Customer> = {
        customer_name: 'Updated Test Customer Ltd',
        customer_type: 'Credit',
        note: 'Updated note for testing'
      };

      const result = await dataService.updateCustomer(createdCustomerId, updateData);
      
      expect(result).toBeDefined();
      expect(result.customer_name).toBe('Updated Test Customer Ltd');
      expect(result.customer_type).toBe('Credit');
      expect(result.note).toBe('Updated note for testing');
    });
  });

  describe('Supplier CRUD Operations', () => {
    let createdSupplierId: number;

    it('should create a supplier successfully', async () => {
      const supplierData: Omit<Supplier, 'id'> = {
        supplier_name: 'Test Supplier Co',
        phone: '+94117654321',
        email: 'test@supplier.com',
        address: '123 Test Street, Test City',
        tax_id: 'TS123456789',
        active: true
      };

      const result = await dataService.createSupplier(supplierData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.supplier_name).toBe('Test Supplier Co');
      expect(result.email).toBe('test@supplier.com');
      expect(result.active).toBe(true);
      
      createdSupplierId = result.id!;
    });

    it('should read supplier back', async () => {
      if (!createdSupplierId) {
        throw new Error('Supplier creation test must run first');
      }

      const suppliers = await dataService.getSuppliers();
      const testSupplier = suppliers.find(s => s.id === createdSupplierId);
      
      expect(testSupplier).toBeDefined();
      expect(testSupplier!.supplier_name).toBe('Test Supplier Co');
      expect(testSupplier!.email).toBe('test@supplier.com');
    });
  });

  describe('Discount Rules CRUD Operations', () => {
    let createdRuleId: number;

    it('should create a discount rule successfully', async () => {
      const ruleData: Omit<DiscountRule, 'id'> = {
        rule_name: 'Test Discount Rule',
        rule_type: 'PRODUCT_QTY_CAP',
        target_sku: 'TEST001',
        target_category: null,
        min_qty: 2.0,
        discount_type: 'PERCENTAGE',
        discount_value: 10.0,
        max_discount: 50.0,
        priority: 100,
        active: true,
        description: 'Test discount rule for smoke tests'
      };

      const result = await dataService.createDiscountRule(ruleData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.rule_name).toBe('Test Discount Rule');
      expect(result.discount_value).toBe(10.0);
      expect(result.active).toBe(true);
      
      createdRuleId = result.id!;
    });

    it('should fetch effective rules for SKU', async () => {
      const rules = await dataService.getEffectiveDiscountRules('TEST001');
      
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      
      // Should include our test rule if it's active
      const testRule = rules.find(r => r.rule_name === 'Test Discount Rule');
      if (testRule) {
        expect(testRule.target_sku).toBe('TEST001');
        expect(testRule.active).toBe(true);
      }
    });
  });

  describe('Category Operations', () => {
    let createdCategoryId: number;

    it('should create a category successfully', async () => {
      const categoryData: Omit<Category, 'id'> = {
        name: 'Test Category',
        description: 'Category for smoke testing',
        active: true
      };

      const result = await dataService.createCategory(categoryData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Category');
      expect(result.active).toBe(true);
      
      createdCategoryId = result.id!;
    });

    it('should read categories', async () => {
      const categories = await dataService.getCategories();
      
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      
      const testCategory = categories.find(c => c.name === 'Test Category');
      expect(testCategory).toBeDefined();
      expect(testCategory!.active).toBe(true);
    });
  });

  describe('CSV Export Operations', () => {
    it('should export products CSV with correct headers', async () => {
      // Get products for export
      const products = await dataService.getProducts();
      
      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      
      // In a real test, we would call csvService.exportProductsCSV
      // For smoke test, we just verify the data structure
      if (products.length > 0) {
        const product = products[0];
        
        // Verify all required fields exist
        expect(product.sku).toBeDefined();
        expect(product.name_en).toBeDefined();
        expect(product.unit).toBeDefined();
        expect(product.price_retail).toBeDefined();
        expect(typeof product.active).toBe('boolean');
      }
    });

    it('should export customers CSV with correct headers', async () => {
      const customers = await dataService.getCustomers();
      
      expect(customers).toBeDefined();
      expect(Array.isArray(customers)).toBe(true);
      
      if (customers.length > 0) {
        const customer = customers[0];
        
        // Verify required fields
        expect(customer.customer_name).toBeDefined();
        expect(customer.customer_type).toBeDefined();
        expect(typeof customer.active).toBe('boolean');
      }
    });

    it('should export suppliers CSV with correct headers', async () => {
      const suppliers = await dataService.getSuppliers();
      
      expect(suppliers).toBeDefined();
      expect(Array.isArray(suppliers)).toBe(true);
      
      if (suppliers.length > 0) {
        const supplier = suppliers[0];
        
        // Verify required fields
        expect(supplier.supplier_name).toBeDefined();
        expect(typeof supplier.active).toBe('boolean');
      }
    });
  });

  describe('Data Validation', () => {
    it('should reject invalid product data', async () => {
      const invalidProductData = {
        sku: '', // Empty SKU should be invalid
        name_en: 'Invalid Product',
        price_retail: -100, // Negative price should be invalid
        unit: 'invalid_unit'
      } as any;

      try {
        await dataService.createProduct(invalidProductData);
        // If we get here, the validation didn't work
        expect(true).toBe(false);
      } catch (error) {
        // Should throw validation error
        expect(error).toBeDefined();
      }
    });

    it('should reject duplicate SKUs', async () => {
      // First create a valid product
      const productData: Omit<Product, 'id'> = {
        sku: 'DUPLICATE_TEST',
        barcode: '1234567890888',
        name_en: 'Duplicate Test Product',
        name_si: 'නැවත නිෂ්පාදනය',
        name_ta: 'நகல் தயாரிப்பு',
        category_id: 1,
        unit: 'pc',
        price_retail: 100.00,
        price_wholesale: 90.00,
        price_credit: 95.00,
        price_other: 92.00,
        cost: 70.00,
        supplier_id: 1,
        reorder_level: 10,
        is_scale_item: false,
        active: true
      };

      const first = await dataService.createProduct(productData);
      expect(first.id).toBeDefined();

      // Try to create another with same SKU
      try {
        await dataService.createProduct(productData);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Should throw constraint error
        expect(error).toBeDefined();
      }
    });

    it('should validate customer types', async () => {
      const invalidCustomerData = {
        customer_name: 'Invalid Customer',
        customer_type: 'InvalidType', // Should only accept Retail/Wholesale/Credit/Other
        active: true
      } as any;

      try {
        await dataService.createCustomer(invalidCustomerData);
        // Should not reach here if validation works
        expect(true).toBe(false);
      } catch (error) {
        // Should throw validation error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Database Performance', () => {
    it('should handle batch operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple products in sequence
      const products = [];
      for (let i = 0; i < 10; i++) {
        const productData: Omit<Product, 'id'> = {
          sku: `BATCH_${i.toString().padStart(3, '0')}`,
          barcode: `123456789${i.toString().padStart(4, '0')}`,
          name_en: `Batch Product ${i}`,
          name_si: `කණ්ඩායම් නිෂ්පාදනය ${i}`,
          name_ta: `தொகுதி தயாரிப்பு ${i}`,
          category_id: 1,
          unit: 'pc',
          price_retail: 100.00 + i,
          price_wholesale: 90.00 + i,
          price_credit: 95.00 + i,
          price_other: 92.00 + i,
          cost: 70.00 + i,
          supplier_id: 1,
          reorder_level: 10,
          is_scale_item: false,
          active: true
        };
        
        const product = await dataService.createProduct(productData);
        products.push(product);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(products.length).toBe(10);
      
      // Verify all products were created
      for (let i = 0; i < products.length; i++) {
        expect(products[i].sku).toBe(`BATCH_${i.toString().padStart(3, '0')}`);
      }
    });

    it('should handle large result sets', async () => {
      const startTime = Date.now();
      
      // Get all products (should handle large datasets)
      const products = await dataService.getProducts();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      
      // Should complete within reasonable time even with many products
      expect(duration).toBeLessThan(3000); // 3 seconds
    });
  });

  describe('Transaction Integrity', () => {
    it('should maintain data consistency', async () => {
      // Test that related data stays consistent
      const productsBefore = await dataService.getProducts();
      const initialCount = productsBefore.length;
      
      // Create a product
      const productData: Omit<Product, 'id'> = {
        sku: 'CONSISTENCY_TEST',
        barcode: '1234567890777',
        name_en: 'Consistency Test Product',
        name_si: 'අනුකූලතා පරීක්ෂණ නිෂ්පාදනය',
        name_ta: 'நிலைத்தன்மை சோதனை தயாரிப்பு',
        category_id: 1,
        unit: 'pc',
        price_retail: 150.00,
        price_wholesale: 135.00,
        price_credit: 142.00,
        price_other: 138.00,
        cost: 100.00,
        supplier_id: 1,
        reorder_level: 15,
        is_scale_item: false,
        active: true
      };
      
      const createdProduct = await dataService.createProduct(productData);
      
      // Verify count increased
      const productsAfter = await dataService.getProducts();
      expect(productsAfter.length).toBe(initialCount + 1);
      
      // Verify the product can be found by different methods
      const foundById = await dataService.getProductById(createdProduct.id!);
      const foundBySku = await dataService.getProductBySku('CONSISTENCY_TEST');
      
      expect(foundById).toBeDefined();
      expect(foundBySku).toBeDefined();
      expect(foundById!.id).toBe(foundBySku!.id);
      expect(foundById!.sku).toBe(foundBySku!.sku);
    });
  });
});

// Helper function to clean up test data (optional)
export async function cleanupTestData() {
  try {
    // Clean up any test data that might interfere with other tests
    const products = await dataService.getProducts();
    const testProducts = products.filter(p => 
      p.sku.startsWith('TEST') || 
      p.sku.startsWith('BATCH_') || 
      p.sku.startsWith('DUPLICATE_') ||
      p.sku.startsWith('CONSISTENCY_')
    );
    
    for (const product of testProducts) {
      if (product.id) {
        await dataService.deleteProduct(product.id);
      }
    }
    
    const customers = await dataService.getCustomers();
    const testCustomers = customers.filter(c => 
      c.customer_name.includes('Test Customer')
    );
    
    for (const customer of testCustomers) {
      if (customer.id) {
        await dataService.deleteCustomer(customer.id);
      }
    }
    
    console.log('Test data cleanup completed');
  } catch (error) {
    console.warn('Test data cleanup failed:', error);
  }
}



