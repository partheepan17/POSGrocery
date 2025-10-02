#!/usr/bin/env tsx
/**
 * QA Seed Script
 * Populates the database with comprehensive test data for QA/UAT testing
 * 
 * Usage: npm run qa:prep
 */

import { dataService } from '../src/services/database';
import type { 
  Category, 
  Supplier, 
  Customer, 
  Product, 
  DiscountRule, 
  Sale, 
  SaleLine,
  InventoryMovement 
} from '../src/types';

interface SeedCounts {
  categories: number;
  suppliers: number;
  customers: number;
  products: number;
  discountRules: number;
  sales: number;
  saleLines: number;
  inventoryMovements: number;
}

class QASeedService {
  private counts: SeedCounts = {
    categories: 0,
    suppliers: 0,
    customers: 0,
    products: 0,
    discountRules: 0,
    sales: 0,
    saleLines: 0,
    inventoryMovements: 0
  };

  async seedAll(): Promise<SeedCounts> {
    console.log('🌱 Starting QA seed process...\n');

    try {
      // Seed in dependency order
      await this.seedCategories();
      await this.seedSuppliers();
      await this.seedCustomers();
      await this.seedProducts();
      await this.seedDiscountRules();
      await this.seedInventoryMovements();
      await this.seedSales();

      console.log('\n✅ QA seed completed successfully!');
      this.printSummary();
      
      return this.counts;
    } catch (error) {
      console.error('❌ QA seed failed:', error);
      throw error;
    }
  }

  private async seedCategories(): Promise<void> {
    console.log('📁 Seeding categories...');
    
    const categories: Omit<Category, 'id'>[] = [
      {
        name: 'Grocery',
        description: 'General grocery items',
        active: true
      },
      {
        name: 'Produce',
        description: 'Fresh fruits and vegetables',
        active: true
      },
      {
        name: 'Bakery',
        description: 'Fresh baked goods',
        active: true
      },
      {
        name: 'Dairy',
        description: 'Milk, cheese, yogurt products',
        active: true
      },
      {
        name: 'Beverages',
        description: 'Drinks and beverages',
        active: true
      },
      {
        name: 'Snacks',
        description: 'Chips, crackers, and snacks',
        active: true
      },
      {
        name: 'Frozen',
        description: 'Frozen foods',
        active: false // One inactive for testing
      }
    ];

    for (const category of categories) {
      await dataService.createCategory(category);
      this.counts.categories++;
    }

    console.log(`   ✓ Created ${this.counts.categories} categories`);
  }

  private async seedSuppliers(): Promise<void> {
    console.log('🏢 Seeding suppliers...');

    const suppliers: Omit<Supplier, 'id'>[] = [
      {
        supplier_name: 'Lanka Foods Ltd',
        phone: '+94112345678',
        email: 'orders@lankafoods.lk',
        address: '123 Colombo Road, Colombo 03',
        tax_id: 'LF123456789',
        active: true
      },
      {
        supplier_name: 'Fresh Produce Co',
        phone: '+94117654321',
        email: 'sales@freshproduce.lk',
        address: '456 Kandy Road, Peradeniya',
        tax_id: 'FP987654321',
        active: true
      },
      {
        supplier_name: 'Golden Bakery Supplies',
        phone: '+94115555555',
        email: 'info@goldenbakery.lk',
        address: '789 Galle Road, Mount Lavinia',
        tax_id: 'GB555555555',
        active: true
      },
      {
        supplier_name: 'Dairy Fresh Ltd',
        phone: '+94118888888',
        email: 'contact@dairyfresh.lk',
        address: '321 Negombo Road, Wattala',
        tax_id: 'DF888888888',
        active: true
      },
      {
        supplier_name: 'Inactive Supplier Co',
        phone: '+94119999999',
        email: 'old@inactive.lk',
        address: '999 Old Road, Somewhere',
        tax_id: 'IN999999999',
        active: false // Inactive for testing
      }
    ];

    for (const supplier of suppliers) {
      await dataService.createSupplier(supplier);
      this.counts.suppliers++;
    }

    console.log(`   ✓ Created ${this.counts.suppliers} suppliers`);
  }

  private async seedCustomers(): Promise<void> {
    console.log('👥 Seeding customers...');

    const customers: Omit<Customer, 'id'>[] = [
      {
        customer_name: 'Walk-in Customer',
        phone: '',
        customer_type: 'Retail',
        note: 'Default retail customer',
        active: true
      },
      {
        customer_name: 'ABC Restaurant',
        phone: '+94112223333',
        customer_type: 'Wholesale',
        note: 'Bulk buyer - restaurant chain',
        active: true
      },
      {
        customer_name: 'XYZ Hotel Group',
        phone: '+94114445555',
        customer_type: 'Wholesale',
        note: 'Hotel chain - large orders',
        active: true
      },
      {
        customer_name: 'Corner Shop Pvt Ltd',
        phone: '+94116667777',
        customer_type: 'Credit',
        note: 'Credit terms: Net 30',
        active: true
      },
      {
        customer_name: 'Catering Services',
        phone: '+94118889999',
        customer_type: 'Other',
        note: 'Event catering company',
        active: true
      },
      {
        customer_name: 'Closed Restaurant',
        phone: '+94110000000',
        customer_type: 'Wholesale',
        note: 'Business closed - keep for historical records',
        active: false // Inactive for testing
      }
    ];

    for (const customer of customers) {
      await dataService.createCustomer(customer);
      this.counts.customers++;
    }

    console.log(`   ✓ Created ${this.counts.customers} customers`);
  }

  private async seedProducts(): Promise<void> {
    console.log('📦 Seeding products...');

    // Get categories and suppliers for references
    const categories = await dataService.getCategories();
    const suppliers = await dataService.getSuppliers();

    const groceryCategory = categories.find(c => c.name === 'Grocery');
    const produceCategory = categories.find(c => c.name === 'Produce');
    const bakeryCategory = categories.find(c => c.name === 'Bakery');
    const dairyCategory = categories.find(c => c.name === 'Dairy');

    const lankaFoods = suppliers.find(s => s.supplier_name === 'Lanka Foods Ltd');
    const freshProduce = suppliers.find(s => s.supplier_name === 'Fresh Produce Co');

    const products: Omit<Product, 'id'>[] = [
      // Regular items (piece-based)
      {
        sku: 'RICE001',
        barcode: '1234567890123',
        name_en: 'Basmati Rice 5kg',
        name_si: 'බාස්මති සහල් 5kg',
        name_ta: 'பாஸ்மதி அரிசி 5kg',
        category_id: groceryCategory?.id || 1,
        unit: 'pc',
        price_retail: 1250.00,
        price_wholesale: 1100.00,
        price_credit: 1200.00,
        price_other: 1150.00,
        cost: 950.00,
        supplier_id: lankaFoods?.id || 1,
        reorder_level: 10,
        is_scale_item: false,
        active: true
      },
      {
        sku: 'SUGAR1',
        barcode: '1234567890124',
        name_en: 'White Sugar 1kg',
        name_si: 'සුදු සීනි 1kg',
        name_ta: 'வெள்ளை சர்க்கரை 1kg',
        category_id: groceryCategory?.id || 1,
        unit: 'pc',
        price_retail: 180.00,
        price_wholesale: 160.00,
        price_credit: 170.00,
        price_other: 165.00,
        cost: 140.00,
        supplier_id: lankaFoods?.id || 1,
        reorder_level: 20,
        is_scale_item: false,
        active: true
      },
      {
        sku: 'BREAD1',
        barcode: '1234567890125',
        name_en: 'White Bread Loaf',
        name_si: 'සුදු පාන් ගෙඩිය',
        name_ta: 'வெள்ளை ரொட்டி',
        category_id: bakeryCategory?.id || 3,
        unit: 'pc',
        price_retail: 85.00,
        price_wholesale: 75.00,
        price_credit: 80.00,
        price_other: 78.00,
        cost: 60.00,
        supplier_id: lankaFoods?.id || 1,
        reorder_level: 15,
        is_scale_item: false,
        active: true
      },
      // Scale items (kg-based)
      {
        sku: 'BANANA1',
        barcode: '2000000000001',
        name_en: 'Bananas',
        name_si: 'කෙසෙල්',
        name_ta: 'வாழைப்பழம்',
        category_id: produceCategory?.id || 2,
        unit: 'kg',
        price_retail: 250.00,
        price_wholesale: 220.00,
        price_credit: 240.00,
        price_other: 230.00,
        cost: 180.00,
        supplier_id: freshProduce?.id || 2,
        reorder_level: 5,
        is_scale_item: true,
        active: true
      },
      {
        sku: 'APPLE1',
        barcode: '2000000000002',
        name_en: 'Red Apples',
        name_si: 'රතු ඇපල්',
        name_ta: 'சிவப்பு ஆப்பிள்கள்',
        category_id: produceCategory?.id || 2,
        unit: 'kg',
        price_retail: 450.00,
        price_wholesale: 400.00,
        price_credit: 430.00,
        price_other: 420.00,
        cost: 320.00,
        supplier_id: freshProduce?.id || 2,
        reorder_level: 3,
        is_scale_item: true,
        active: true
      },
      {
        sku: 'POTATO1',
        barcode: '2000000000003',
        name_en: 'Potatoes',
        name_si: 'අල',
        name_ta: 'உருளைக்கிழங்கு',
        category_id: produceCategory?.id || 2,
        unit: 'kg',
        price_retail: 120.00,
        price_wholesale: 100.00,
        price_credit: 115.00,
        price_other: 110.00,
        cost: 80.00,
        supplier_id: freshProduce?.id || 2,
        reorder_level: 10,
        is_scale_item: true,
        active: true
      },
      // Additional products for testing
      {
        sku: 'MILK1',
        barcode: '1234567890126',
        name_en: 'Fresh Milk 1L',
        name_si: 'නැවුම් කිරි 1L',
        name_ta: 'புதிய பால் 1L',
        category_id: dairyCategory?.id || 4,
        unit: 'pc',
        price_retail: 220.00,
        price_wholesale: 200.00,
        price_credit: 210.00,
        price_other: 205.00,
        cost: 180.00,
        supplier_id: lankaFoods?.id || 1,
        reorder_level: 25,
        is_scale_item: false,
        active: true
      },
      {
        sku: 'CHEESE1',
        barcode: '1234567890127',
        name_en: 'Cheddar Cheese 200g',
        name_si: 'චෙඩර් චීස් 200g',
        name_ta: 'செடார் சீஸ் 200g',
        category_id: dairyCategory?.id || 4,
        unit: 'pc',
        price_retail: 380.00,
        price_wholesale: 350.00,
        price_credit: 370.00,
        price_other: 360.00,
        cost: 290.00,
        supplier_id: lankaFoods?.id || 1,
        reorder_level: 5,
        is_scale_item: false,
        active: true
      },
      // Low stock item for testing
      {
        sku: 'LOWSTOCK1',
        barcode: '1234567890128',
        name_en: 'Low Stock Item',
        name_si: 'අඩු තොග අයිතමය',
        name_ta: 'குறைந்த பங்கு பொருள்',
        category_id: groceryCategory?.id || 1,
        unit: 'pc',
        price_retail: 100.00,
        price_wholesale: 90.00,
        price_credit: 95.00,
        price_other: 92.00,
        cost: 70.00,
        supplier_id: lankaFoods?.id || 1,
        reorder_level: 50, // High reorder level for testing low stock alerts
        is_scale_item: false,
        active: true
      },
      // Inactive product for testing
      {
        sku: 'INACTIVE1',
        barcode: '1234567890129',
        name_en: 'Discontinued Item',
        name_si: 'නවතා දැමූ අයිතමය',
        name_ta: 'நிறுத்தப்பட்ட பொருள்',
        category_id: groceryCategory?.id || 1,
        unit: 'pc',
        price_retail: 50.00,
        price_wholesale: 45.00,
        price_credit: 48.00,
        price_other: 46.00,
        cost: 35.00,
        supplier_id: lankaFoods?.id || 1,
        reorder_level: 0,
        is_scale_item: false,
        active: false
      }
    ];

    for (const product of products) {
      await dataService.createProduct(product);
      this.counts.products++;
    }

    console.log(`   ✓ Created ${this.counts.products} products`);
  }

  private async seedDiscountRules(): Promise<void> {
    console.log('🎯 Seeding discount rules...');

    const discountRules: Omit<DiscountRule, 'id'>[] = [
      {
        rule_name: 'Sugar 3kg Cap Discount',
        rule_type: 'PRODUCT_QTY_CAP',
        target_sku: 'SUGAR1',
        target_category: null,
        min_qty: 3.0,
        discount_type: 'FIXED_PRICE',
        discount_value: 10.0, // Rs.10 per kg when buying 3kg or more
        max_discount: 30.0, // Cap at 3kg worth
        priority: 10,
        active: true,
        description: 'Sugar discount: Rs.10/kg for 3kg+, capped at 3kg discount'
      },
      {
        rule_name: 'Produce 5% Discount',
        rule_type: 'CATEGORY_PERCENTAGE',
        target_sku: null,
        target_category: 'Produce',
        min_qty: 0,
        discount_type: 'PERCENTAGE',
        discount_value: 5.0, // 5% off
        max_discount: 100.0, // Max Rs.100 discount
        priority: 20,
        active: true,
        description: 'All produce items: 5% off, max Rs.100'
      },
      {
        rule_name: 'Bulk Grocery 10% (Wholesale)',
        rule_type: 'CATEGORY_PERCENTAGE',
        target_sku: null,
        target_category: 'Grocery',
        min_qty: 0,
        discount_type: 'PERCENTAGE',
        discount_value: 10.0,
        max_discount: 500.0,
        priority: 15,
        active: true,
        description: 'Grocery items: 10% off for wholesale customers, max Rs.500'
      },
      {
        rule_name: 'Bread Buy 2 Get 1 Free',
        rule_type: 'PRODUCT_QTY_CAP',
        target_sku: 'BREAD1',
        target_category: null,
        min_qty: 3.0,
        discount_type: 'FIXED_AMOUNT',
        discount_value: 85.0, // Price of one bread
        max_discount: 85.0,
        priority: 5,
        active: true,
        description: 'Buy 2 bread loaves, get 1 free'
      },
      {
        rule_name: 'Inactive Discount Rule',
        rule_type: 'PRODUCT_QTY_CAP',
        target_sku: 'MILK1',
        target_category: null,
        min_qty: 2.0,
        discount_type: 'PERCENTAGE',
        discount_value: 15.0,
        max_discount: 50.0,
        priority: 25,
        active: false, // Inactive for testing
        description: 'Inactive milk discount for testing'
      }
    ];

    for (const rule of discountRules) {
      await dataService.createDiscountRule(rule);
      this.counts.discountRules++;
    }

    console.log(`   ✓ Created ${this.counts.discountRules} discount rules`);
  }

  private async seedInventoryMovements(): Promise<void> {
    console.log('📊 Seeding inventory movements...');

    const products = await dataService.getProducts();
    
    // Create initial stock for all products
    const movements: Omit<InventoryMovement, 'id'>[] = [];

    for (const product of products.slice(0, 8)) { // First 8 products get stock
      if (product.active) {
        // Initial receive
        movements.push({
          product_id: product.id!,
          qty: product.unit === 'kg' ? 25.0 : 100,
          type: 'RECEIVE',
          reason: 'Initial Stock',
          note: 'QA seed initial inventory',
          terminal: 'SEED-SCRIPT',
          cashier: 'system',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        });

        // Some adjustments
        if (product.sku === 'LOWSTOCK1') {
          // Adjust down to create low stock scenario
          movements.push({
            product_id: product.id!,
            qty: -95,
            type: 'ADJUST',
            reason: 'Stocktake',
            note: 'Stocktake adjustment - low stock for testing',
            terminal: 'SEED-SCRIPT',
            cashier: 'system',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
          });
        }

        if (product.unit === 'kg') {
          // Some waste for scale items
          movements.push({
            product_id: product.id!,
            qty: -2.5,
            type: 'WASTE',
            reason: 'Expired',
            note: 'Expired produce items',
            terminal: 'SEED-SCRIPT',
            cashier: 'system',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
          });
        }
      }
    }

    for (const movement of movements) {
      await dataService.createInventoryMovement(movement);
      this.counts.inventoryMovements++;
    }

    console.log(`   ✓ Created ${this.counts.inventoryMovements} inventory movements`);
  }

  private async seedSales(): Promise<void> {
    console.log('💰 Seeding sales data...');

    const products = await dataService.getProducts();
    const customers = await dataService.getCustomers();

    const retailCustomer = customers.find(c => c.customer_name === 'Walk-in Customer');
    const wholesaleCustomer = customers.find(c => c.customer_name === 'ABC Restaurant');

    // Create sales over the last 7 days
    const salesData: Array<{
      sale: Omit<Sale, 'id'>;
      lines: Omit<SaleLine, 'id' | 'sale_id'>[];
    }> = [];

    // Today's sales
    salesData.push({
      sale: {
        invoice_number: 'INV-2025-001',
        customer_id: retailCustomer?.id || null,
        customer_name: retailCustomer?.customer_name || 'Walk-in Customer',
        price_tier: 'Retail',
        subtotal: 515.00,
        discount_total: 12.50,
        tax_total: 50.25,
        total: 552.75,
        payment_cash: 552.75,
        payment_card: 0,
        payment_wallet: 0,
        terminal: 'Counter-1',
        cashier: 'cashier01',
        receipt_language: 'en',
        created_at: new Date()
      },
      lines: [
        {
          product_id: products.find(p => p.sku === 'RICE001')?.id || 1,
          sku: 'RICE001',
          name: 'Basmati Rice 5kg',
          qty: 1,
          unit_price: 250.00,
          discount: 0,
          total: 250.00
        },
        {
          product_id: products.find(p => p.sku === 'BANANA1')?.id || 4,
          sku: 'BANANA1',
          name: 'Bananas',
          qty: 1.5,
          unit_price: 250.00,
          discount: 12.50,
          total: 362.50
        }
      ]
    });

    // Yesterday's sales
    salesData.push({
      sale: {
        invoice_number: 'INV-2025-002',
        customer_id: wholesaleCustomer?.id || null,
        customer_name: wholesaleCustomer?.customer_name || 'ABC Restaurant',
        price_tier: 'Wholesale',
        subtotal: 2200.00,
        discount_total: 220.00,
        tax_total: 198.00,
        total: 2178.00,
        payment_cash: 1000.00,
        payment_card: 1178.00,
        payment_wallet: 0,
        terminal: 'Counter-1',
        cashier: 'manager01',
        receipt_language: 'si',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      },
      lines: [
        {
          product_id: products.find(p => p.sku === 'RICE001')?.id || 1,
          sku: 'RICE001',
          name: 'Basmati Rice 5kg',
          qty: 2,
          unit_price: 1100.00,
          discount: 220.00,
          total: 1980.00
        }
      ]
    });

    // Additional sales for the past week
    for (let i = 2; i <= 7; i++) {
      const saleDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      salesData.push({
        sale: {
          invoice_number: `INV-2025-${String(i + 1).padStart(3, '0')}`,
          customer_id: i % 2 === 0 ? retailCustomer?.id || null : null,
          customer_name: i % 2 === 0 ? retailCustomer?.customer_name || 'Walk-in Customer' : 'Walk-in Customer',
          price_tier: i % 3 === 0 ? 'Wholesale' : 'Retail',
          subtotal: 150.00 + (i * 50),
          discount_total: i * 5,
          tax_total: (150.00 + (i * 50)) * 0.1,
          total: (150.00 + (i * 50)) * 1.1 - (i * 5),
          payment_cash: (150.00 + (i * 50)) * 1.1 - (i * 5),
          payment_card: 0,
          payment_wallet: 0,
          terminal: 'Counter-1',
          cashier: i % 2 === 0 ? 'cashier01' : 'manager01',
          receipt_language: 'en',
          created_at: saleDate
        },
        lines: [
          {
            product_id: products.find(p => p.sku === 'BREAD1')?.id || 3,
            sku: 'BREAD1',
            name: 'White Bread Loaf',
            qty: i,
            unit_price: i % 3 === 0 ? 75.00 : 85.00,
            discount: i * 5,
            total: (i % 3 === 0 ? 75.00 : 85.00) * i - (i * 5)
          }
        ]
      });
    }

    // Create sales and sale lines
    for (const saleData of salesData) {
      const sale = await dataService.createSale(saleData.sale);
      this.counts.sales++;

      for (const line of saleData.lines) {
        await dataService.createSaleLine({
          ...line,
          sale_id: sale.id!
        });
        this.counts.saleLines++;
      }
    }

    console.log(`   ✓ Created ${this.counts.sales} sales with ${this.counts.saleLines} sale lines`);
  }

  private printSummary(): void {
    console.log('\n📊 QA SEED SUMMARY');
    console.log('==================');
    console.log(`Categories:         ${this.counts.categories}`);
    console.log(`Suppliers:          ${this.counts.suppliers}`);
    console.log(`Customers:          ${this.counts.customers}`);
    console.log(`Products:           ${this.counts.products}`);
    console.log(`Discount Rules:     ${this.counts.discountRules}`);
    console.log(`Inventory Movements: ${this.counts.inventoryMovements}`);
    console.log(`Sales:              ${this.counts.sales}`);
    console.log(`Sale Lines:         ${this.counts.saleLines}`);
    console.log('==================');
    console.log(`Total Records:      ${Object.values(this.counts).reduce((a, b) => a + b, 0)}`);
    
    console.log('\n🎯 Test Scenarios Ready:');
    console.log('• Scale items: BANANA1, APPLE1, POTATO1');
    console.log('• Discount rules: Sugar cap, Produce 5%, Bulk grocery');
    console.log('• Low stock item: LOWSTOCK1 (below reorder level)');
    console.log('• Inactive items: Discontinued product, inactive supplier/customer');
    console.log('• Multi-language: Products have EN/SI/TA names');
    console.log('• Sales data: 7 days of transactions for reporting');
    console.log('• Customer types: Retail, Wholesale, Credit, Other');
    console.log('• Inventory movements: Receive, Adjust, Waste records');
  }
}

// Main execution
async function main() {
  try {
    const seedService = new QASeedService();
    const counts = await seedService.seedAll();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ QA seed failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { QASeedService, type SeedCounts };



