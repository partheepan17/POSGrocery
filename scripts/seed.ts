#!/usr/bin/env tsx

/**
 * Database Seed Script
 * Populates the database with sample data for development and testing
 */

import { getDatabase } from '../server/db';
import { createContextLogger } from '../server/utils/logger';

const logger = createContextLogger({ operation: 'database_seed' });

interface SeedData {
  categories: Array<{ name: string; description?: string }>;
  suppliers: Array<{ supplier_name: string; contact_phone?: string; contact_email?: string; address?: string }>;
  products: Array<{
  sku: string;
    barcode?: string;
  name_en: string;
    name_si?: string;
    name_ta?: string;
    unit: 'pc' | 'kg' | 'g' | 'l' | 'ml';
    category_id: number;
    is_scale_item: boolean;
  price_retail: number;
    price_wholesale: number;
    price_credit: number;
  cost: number;
    reorder_level: number;
    preferred_supplier_id: number;
  }>;
  users: Array<{
  username: string;
    name: string;
    email: string;
  role: 'admin' | 'manager' | 'cashier';
    pin?: string;
  }>;
  customers: Array<{
    customer_name: string;
    phone?: string;
    customer_type: 'Retail' | 'Wholesale' | 'Credit';
    note?: string;
  }>;
}

class DatabaseSeeder {
  private db: any;

  constructor() {
    this.db = getDatabase();
  }

  async seed(): Promise<void> {
    logger.info('Starting database seeding...');
    
    try {
      // Clear existing data (in reverse dependency order)
      await this.clearData();
      
      // Seed data
      await this.seedCategories();
      await this.seedSuppliers();
      await this.seedUsers();
      await this.seedCustomers();
      await this.seedProducts();
      await this.seedStockMovements();
      
      logger.info('Database seeding completed successfully');
      
    } catch (error) {
      logger.error('Database seeding failed', { error });
      throw error;
    }
  }

  private async clearData(): Promise<void> {
    logger.info('Clearing existing data...');
    
    const tables = [
      'stock_movements', 'invoice_lines', 'invoice_payments', 'invoices',
      'return_lines', 'returns', 'products', 'customers', 'users', 
      'suppliers', 'categories'
    ];
    
    for (const table of tables) {
      try {
        this.db.prepare(`DELETE FROM ${table}`).run();
        logger.debug(`Cleared table: ${table}`);
      } catch (error) {
        logger.warn(`Failed to clear table ${table}:`, error);
      }
    }
  }

  private async seedCategories(): Promise<void> {
    logger.info('Seeding categories...');
    
    const categories = [
      { name: 'Fruits & Vegetables', description: 'Fresh produce' },
      { name: 'Dairy & Eggs', description: 'Milk, cheese, eggs' },
      { name: 'Meat & Seafood', description: 'Fresh meat and fish' },
      { name: 'Bakery', description: 'Bread, pastries, cakes' },
      { name: 'Beverages', description: 'Drinks and liquids' },
      { name: 'Snacks', description: 'Chips, cookies, candy' },
      { name: 'Household', description: 'Cleaning supplies' },
      { name: 'Personal Care', description: 'Health and beauty' },
      { name: 'Frozen Foods', description: 'Frozen items' },
      { name: 'Canned Goods', description: 'Preserved foods' }
    ];
    
    const insertCategory = this.db.prepare(`
      INSERT INTO categories (name, description) VALUES (?, ?)
      `);
      
      for (const category of categories) {
      insertCategory.run(category.name, category.description);
    }
    
    logger.info(`Seeded ${categories.length} categories`);
  }

  private async seedSuppliers(): Promise<void> {
    logger.info('Seeding suppliers...');
    
    const suppliers = [
      { supplier_name: 'Fresh Farm Co.', contact_phone: '+94-11-234-5678', contact_email: 'orders@freshfarm.lk', address: 'Colombo 05' },
      { supplier_name: 'Dairy Delights', contact_phone: '+94-11-345-6789', contact_email: 'supply@dairydelights.lk', address: 'Kandy' },
      { supplier_name: 'Meat Masters', contact_phone: '+94-11-456-7890', contact_email: 'info@meatmasters.lk', address: 'Negombo' },
      { supplier_name: 'Bakery Bliss', contact_phone: '+94-11-567-8901', contact_email: 'orders@bakerybliss.lk', address: 'Galle' },
      { supplier_name: 'Beverage Bros', contact_phone: '+94-11-678-9012', contact_email: 'sales@beveragebros.lk', address: 'Colombo 07' },
      { supplier_name: 'Snack Solutions', contact_phone: '+94-11-789-0123', contact_email: 'orders@snacksolutions.lk', address: 'Colombo 03' },
      { supplier_name: 'Household Heroes', contact_phone: '+94-11-890-1234', contact_email: 'supply@householdheroes.lk', address: 'Colombo 06' },
      { supplier_name: 'Beauty Basics', contact_phone: '+94-11-901-2345', contact_email: 'orders@beautybasics.lk', address: 'Colombo 04' }
    ];
    
    const insertSupplier = this.db.prepare(`
      INSERT INTO suppliers (supplier_name, contact_phone, contact_email, address) 
      VALUES (?, ?, ?, ?)
      `);
      
      for (const supplier of suppliers) {
      insertSupplier.run(
        supplier.supplier_name, 
        supplier.contact_phone, 
        supplier.contact_email, 
        supplier.address
      );
    }
    
    logger.info(`Seeded ${suppliers.length} suppliers`);
  }

  private async seedUsers(): Promise<void> {
    logger.info('Seeding users...');
    
    const users = [
      { username: 'admin', name: 'System Administrator', email: 'admin@pos.lk', role: 'admin', pin: '1234' },
      { username: 'manager1', name: 'Store Manager', email: 'manager@pos.lk', role: 'manager', pin: '5678' },
      { username: 'cashier1', name: 'John Cashier', email: 'john@pos.lk', role: 'cashier', pin: '1111' },
      { username: 'cashier2', name: 'Jane Cashier', email: 'jane@pos.lk', role: 'cashier', pin: '2222' },
      { username: 'cashier3', name: 'Bob Cashier', email: 'bob@pos.lk', role: 'cashier', pin: '3333' }
    ];
    
    const insertUser = this.db.prepare(`
      INSERT INTO users (username, name, email, role, pin, password_hash) 
      VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const user of users) {
      // Simple password hash (in production, use proper hashing)
      const passwordHash = Buffer.from(user.username + '123').toString('base64');
      insertUser.run(
        user.username, 
        user.name, 
        user.email, 
        user.role, 
        user.pin, 
        passwordHash
      );
    }
    
    logger.info(`Seeded ${users.length} users`);
  }

  private async seedCustomers(): Promise<void> {
    logger.info('Seeding customers...');
    
    const customers = [
      { customer_name: 'Walk-in Customer', customer_type: 'Retail' },
      { customer_name: 'ABC Restaurant', phone: '+94-11-111-1111', customer_type: 'Wholesale', note: 'Regular wholesale customer' },
      { customer_name: 'XYZ Hotel', phone: '+94-11-222-2222', customer_type: 'Credit', note: 'Monthly credit account' },
      { customer_name: 'Local Family', phone: '+94-11-333-3333', customer_type: 'Retail', note: 'Frequent customer' },
      { customer_name: 'Office Canteen', phone: '+94-11-444-4444', customer_type: 'Wholesale', note: 'Daily delivery' }
    ];
    
    const insertCustomer = this.db.prepare(`
      INSERT INTO customers (customer_name, phone, customer_type, note) 
      VALUES (?, ?, ?, ?)
    `);
    
    for (const customer of customers) {
      insertCustomer.run(
        customer.customer_name, 
        customer.phone, 
        customer.customer_type, 
        customer.note
      );
    }
    
    logger.info(`Seeded ${customers.length} customers`);
  }

  private async seedProducts(): Promise<void> {
    logger.info('Seeding products...');
    
    // Get category and supplier IDs
    const categories = this.db.prepare('SELECT id, name FROM categories').all();
    const suppliers = this.db.prepare('SELECT id, supplier_name FROM suppliers').all();
    
    const products = [
      // Fruits & Vegetables
      { sku: 'APPLE001', barcode: '1234567890123', name_en: 'Red Apples', name_si: 'රතු ඇපල්', unit: 'kg', category: 'Fruits & Vegetables', is_scale_item: true, price_retail: 250, price_wholesale: 200, price_credit: 220, cost: 180, reorder_level: 50, supplier: 'Fresh Farm Co.' },
      { sku: 'BANANA001', barcode: '1234567890124', name_en: 'Bananas', name_si: 'කෙසෙල්', unit: 'kg', category: 'Fruits & Vegetables', is_scale_item: true, price_retail: 120, price_wholesale: 100, price_credit: 110, cost: 80, reorder_level: 30, supplier: 'Fresh Farm Co.' },
      { sku: 'CARROT001', barcode: '1234567890125', name_en: 'Carrots', name_si: 'කැරට්', unit: 'kg', category: 'Fruits & Vegetables', is_scale_item: true, price_retail: 80, price_wholesale: 70, price_credit: 75, cost: 60, reorder_level: 25, supplier: 'Fresh Farm Co.' },
      
      // Dairy & Eggs
      { sku: 'MILK001', barcode: '1234567890126', name_en: 'Fresh Milk 1L', name_si: 'අලුත් කිරි 1L', unit: 'pc', category: 'Dairy & Eggs', is_scale_item: false, price_retail: 180, price_wholesale: 160, price_credit: 170, cost: 140, reorder_level: 100, supplier: 'Dairy Delights' },
      { sku: 'EGGS001', barcode: '1234567890127', name_en: 'Chicken Eggs (12)', name_si: 'කුකුල් බිත්තර (12)', unit: 'pc', category: 'Dairy & Eggs', is_scale_item: false, price_retail: 300, price_wholesale: 280, price_credit: 290, cost: 250, reorder_level: 50, supplier: 'Dairy Delights' },
      
      // Meat & Seafood
      { sku: 'CHICKEN001', barcode: '1234567890128', name_en: 'Chicken Breast', name_si: 'කුකුල් මස්', unit: 'kg', category: 'Meat & Seafood', is_scale_item: true, price_retail: 1200, price_wholesale: 1100, price_credit: 1150, cost: 1000, reorder_level: 20, supplier: 'Meat Masters' },
      { sku: 'FISH001', barcode: '1234567890129', name_en: 'Fresh Fish', name_si: 'අලුත් මාළු', unit: 'kg', category: 'Meat & Seafood', is_scale_item: true, price_retail: 800, price_wholesale: 750, price_credit: 775, cost: 650, reorder_level: 15, supplier: 'Meat Masters' },
      
      // Bakery
      { sku: 'BREAD001', barcode: '1234567890130', name_en: 'White Bread Loaf', name_si: 'සුදු පාන්', unit: 'pc', category: 'Bakery', is_scale_item: false, price_retail: 120, price_wholesale: 100, price_credit: 110, cost: 80, reorder_level: 30, supplier: 'Bakery Bliss' },
      { sku: 'CAKE001', barcode: '1234567890131', name_en: 'Chocolate Cake', name_si: 'චොකලට් කේක්', unit: 'pc', category: 'Bakery', is_scale_item: false, price_retail: 800, price_wholesale: 700, price_credit: 750, cost: 600, reorder_level: 10, supplier: 'Bakery Bliss' },
      
      // Beverages
      { sku: 'COKE001', barcode: '1234567890132', name_en: 'Coca Cola 500ml', name_si: 'කොකා කෝලා 500ml', unit: 'pc', category: 'Beverages', is_scale_item: false, price_retail: 150, price_wholesale: 130, price_credit: 140, cost: 110, reorder_level: 200, supplier: 'Beverage Bros' },
      { sku: 'WATER001', barcode: '1234567890133', name_en: 'Bottled Water 1L', name_si: 'බෝතල් ජලය 1L', unit: 'pc', category: 'Beverages', is_scale_item: false, price_retail: 80, price_wholesale: 70, price_credit: 75, cost: 60, reorder_level: 150, supplier: 'Beverage Bros' },
      
      // Snacks
      { sku: 'CHIPS001', barcode: '1234567890134', name_en: 'Potato Chips', name_si: 'අර්තාපල් චිප්ස්', unit: 'pc', category: 'Snacks', is_scale_item: false, price_retail: 200, price_wholesale: 180, price_credit: 190, cost: 150, reorder_level: 100, supplier: 'Snack Solutions' },
      { sku: 'COOKIE001', barcode: '1234567890135', name_en: 'Chocolate Cookies', name_si: 'චොකලට් බිස්කට්', unit: 'pc', category: 'Snacks', is_scale_item: false, price_retail: 300, price_wholesale: 270, price_credit: 285, cost: 220, reorder_level: 80, supplier: 'Snack Solutions' },
      
      // Household
      { sku: 'SOAP001', barcode: '1234567890136', name_en: 'Dish Soap', name_si: 'බඩු සබන්', unit: 'pc', category: 'Household', is_scale_item: false, price_retail: 250, price_wholesale: 220, price_credit: 235, cost: 180, reorder_level: 50, supplier: 'Household Heroes' },
      { sku: 'TISSUE001', barcode: '1234567890137', name_en: 'Toilet Paper (4 pack)', name_si: 'වැසිකිළි කඩදාසි (4)', unit: 'pc', category: 'Household', is_scale_item: false, price_retail: 400, price_wholesale: 360, price_credit: 380, cost: 300, reorder_level: 30, supplier: 'Household Heroes' },
      
      // Personal Care
      { sku: 'SHAMPOO001', barcode: '1234567890138', name_en: 'Shampoo 400ml', name_si: 'ෂැම්පු 400ml', unit: 'pc', category: 'Personal Care', is_scale_item: false, price_retail: 600, price_wholesale: 540, price_credit: 570, cost: 450, reorder_level: 40, supplier: 'Beauty Basics' },
      { sku: 'TOOTHBRUSH001', barcode: '1234567890139', name_en: 'Toothbrush', name_si: 'දත් බුරුසුව', unit: 'pc', category: 'Personal Care', is_scale_item: false, price_retail: 150, price_wholesale: 130, price_credit: 140, cost: 100, reorder_level: 60, supplier: 'Beauty Basics' }
    ];
    
    const insertProduct = this.db.prepare(`
      INSERT INTO products (
        sku, barcode, name_en, name_si, unit, category_id, is_scale_item,
        price_retail, price_wholesale, price_credit, price_other, cost, 
        reorder_level, preferred_supplier_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const product of products) {
      const category = categories.find(c => c.name === product.category);
      const supplier = suppliers.find(s => s.supplier_name === product.supplier);
      
      if (!category || !supplier) {
        logger.warn(`Skipping product ${product.sku} - category or supplier not found`);
        continue;
      }
      
      insertProduct.run(
        product.sku,
        product.barcode,
        product.name_en,
        product.name_si,
        product.unit,
        category.id,
        product.is_scale_item ? 1 : 0,
        product.price_retail,
        product.price_wholesale,
        product.price_credit,
        product.price_retail * 1.1, // price_other
        product.cost,
        product.reorder_level,
        supplier.id,
        1 // is_active
      );
    }
    
    logger.info(`Seeded ${products.length} products`);
  }

  private async seedStockMovements(): Promise<void> {
    logger.info('Seeding stock movements...');
    
    const products = this.db.prepare('SELECT id, sku, name_en FROM products').all();
    const users = this.db.prepare('SELECT id, username FROM users WHERE role = "admin"').all();
    const adminUser = users[0];
    
    if (!adminUser) {
      logger.warn('No admin user found for stock movements');
      return;
    }
    
    const insertMovement = this.db.prepare(`
      INSERT INTO stock_movements (
        product_id, qty, type, reason, note, terminal, cashier, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const product of products) {
      // Initial stock - random quantity between 50-200
      const initialStock = Math.floor(Math.random() * 150) + 50;
      
      insertMovement.run(
        product.id,
        initialStock,
        'IN',
        'OPENING_STOCK',
        'Initial stock for new product',
        'TERMINAL-001',
        adminUser.id,
        new Date().toISOString()
      );
    }
    
    logger.info(`Seeded stock movements for ${products.length} products`);
  }
}

async function main() {
  try {
    const seeder = new DatabaseSeeder();
    await seeder.seed();
    
    console.log('✅ Database seeding completed successfully');
    console.log('\nSample data created:');
    console.log('- 10 categories');
    console.log('- 8 suppliers');
    console.log('- 5 users (1 admin, 1 manager, 3 cashiers)');
    console.log('- 5 customers');
    console.log('- 20+ products with realistic pricing');
    console.log('- Initial stock movements');

  } catch (error) {
    logger.error('Database seeding failed', { error });
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DatabaseSeeder };