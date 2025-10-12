import { dataService, Product, Supplier, Customer, DiscountRule } from './dataService';
import { HealthReport } from './healthService';
// import { XReport, ZReport, Session } from './shiftService';
// import { RefundSummary } from './refundService'; // Not available yet
import { HoldSale } from './holdService';
import { StocktakeSession, StocktakeCount } from './stocktakeService';
// import { GrnHeader } from './grnService'; // Not available yet
import { AuditLog } from './auditService';
import { UserWithStatus, UserCSVExportRow } from './userService';
import { LabelItem, LabelJob, GRNLine } from '@/types';

export interface CSVExportOptions {
  delimiter: string;
  includeHeaders: boolean;
  encoding: string;
}

export interface CSVImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

export class CSVService {
  private defaultOptions: CSVExportOptions = {
    delimiter: ',',
    includeHeaders: true,
    encoding: 'utf-8'
  };

  // Generic export function
  async exportData(data: any[], filename: string, options: CSVExportOptions = this.defaultOptions): Promise<void> {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    let csvContent = '';

    if (options.includeHeaders) {
      csvContent += headers.join(options.delimiter) + '\n';
    }

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape values that contain delimiter or quotes
        if (typeof value === 'string' && (value.includes(options.delimiter) || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvContent += values.join(options.delimiter) + '\n';
    });

    // Check if we're in a test environment
    if (typeof window === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
      console.log('CSV Export (test environment):', filename);
      console.log('Content:', csvContent);
      return;
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Parse CSV file
  async parseFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('CSV file must have at least a header and one data row');
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const data: any[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            
            data.push(row);
          }

          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  // Export functions
  async exportProducts(options: CSVExportOptions = this.defaultOptions): Promise<string> {
    const products = await dataService.getProducts();
    const headers = [
      'SKU',
      'Barcode',
      'Name (English)',
      'Name (Sinhala)',
      'Name (Tamil)',
      'Unit',
      'Category ID',
      'Is Scale Item',
      'Tax Code',
      'Price Retail',
      'Price Wholesale',
      'Price Credit',
      'Price Other',
      'Cost',
      'Reorder Level',
      'Preferred Supplier ID',
      'Is Active'
    ];

    const rows = products.map(product => [
      product.sku,
      product.barcode || '',
      product.name_en,
      product.name_si || '',
      product.name_ta || '',
      product.unit,
      product.category_id.toString(),
      product.is_scale_item ? 'TRUE' : 'FALSE',
      product.tax_code || '',
      product.price_retail.toString(),
      product.price_wholesale.toString(),
      product.price_credit.toString(),
      product.price_other.toString(),
      product.cost?.toString() || '',
      product.reorder_level?.toString() || '',
      product.preferred_supplier_id?.toString() || '',
      product.is_active ? 'TRUE' : 'FALSE'
    ]);

    return this.generateCSV(headers, rows, options);
  }

  async exportSuppliers(options: CSVExportOptions = this.defaultOptions): Promise<string> {
    const suppliers = await dataService.getSuppliers(false); // Get all suppliers (active and inactive)

    // Use exact headers as specified
    const headers = [
      'supplier_name',
      'phone',
      'email', 
      'address',
      'tax_id',
      'active'
    ];

    const rows = suppliers.map(supplier => [
      supplier.supplier_name,
      supplier.contact_phone || '',
      supplier.contact_email || '',
      supplier.address || '',
      supplier.tax_id || '',
      supplier.active ? 'true' : 'false'
    ]);

    return this.generateCSV(headers, rows, options);
  }

  async exportCustomers(options: CSVExportOptions = this.defaultOptions): Promise<string> {
    const customers = await dataService.getCustomers(false); // Get all customers (active and inactive)

    // Use exact headers as specified
    const headers = [
      'customer_name',
      'phone',
      'customer_type',
      'note',
      'active'
    ];

    const rows = customers.map(customer => [
      customer.customer_name,
      customer.phone || '',
      customer.customer_type,
      customer.note || '',
      customer.active ? 'true' : 'false'
    ]);

    return this.generateCSV(headers, rows, options);
  }

  async exportDiscounts(options: CSVExportOptions = this.defaultOptions): Promise<string> {
    const discounts = await dataService.getDiscountRules();
    const products = await dataService.getProducts();
    const categories = await dataService.getCategories();

    // Use exact headers as specified
    const headers = [
      'name',
      'applies_to_type',
      'applies_to_value',
      'type',
      'value',
      'max_qty_or_weight',
      'active_from',
      'active_to',
      'priority',
      'reason_required',
      'active'
    ];

    const rows = discounts.map(discount => {
      let applies_to_value = '';
      
      if (discount.applies_to === 'PRODUCT') {
        const product = products.find(p => p.id === discount.target_id);
        applies_to_value = product ? product.sku : `UNKNOWN_PRODUCT_${discount.target_id}`;
      } else if (discount.applies_to === 'CATEGORY') {
        const category = categories.find(c => c.id === discount.target_id);
        applies_to_value = category ? category.name : `UNKNOWN_CATEGORY_${discount.target_id}`;
      }

      return [
        discount.name,
        discount.applies_to.toLowerCase(), // product or category
        applies_to_value,
        discount.type.toLowerCase(), // percent or amount
        discount.value.toString(),
        discount.max_qty_or_weight?.toString() || '',
        discount.active_from.toISOString().split('T')[0],
        discount.active_to.toISOString().split('T')[0],
        discount.priority.toString(),
        discount.reason_required ? 'true' : 'false',
        discount.active ? 'true' : 'false'
      ];
    });

    return this.generateCSV(headers, rows, options);
  }

  // Import functions
  async importProducts(csvData: string): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: true,
      imported: 0,
      errors: [],
      warnings: []
    };

    try {
      const rows = this.parseCSV(csvData);
      const headers = rows[0];
      
      // Validate headers
      const expectedHeaders = ['SKU', 'Barcode', 'Name (English)', 'Unit', 'Price Retail'];
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
        result.success = false;
        return result;
      }

      // Process each row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        try {
          const product: Omit<Product, 'id' | 'created_at'> = {
            sku: row[headers.indexOf('SKU')],
            barcode: row[headers.indexOf('Barcode')] || undefined,
            name_en: row[headers.indexOf('Name (English)')],
            name_si: row[headers.indexOf('Name (Sinhala)')] || undefined,
            name_ta: row[headers.indexOf('Name (Tamil)')] || undefined,
            unit: row[headers.indexOf('Unit')] as 'pc' | 'kg',
            category_id: parseInt(row[headers.indexOf('Category ID')]) || 1,
            is_scale_item: row[headers.indexOf('Is Scale Item')]?.toLowerCase() === 'true',
            tax_code: row[headers.indexOf('Tax Code')] || undefined,
            price_retail: parseFloat(row[headers.indexOf('Price Retail')]),
            price_wholesale: parseFloat(row[headers.indexOf('Price Wholesale')]) || parseFloat(row[headers.indexOf('Price Retail')]),
            price_credit: parseFloat(row[headers.indexOf('Price Credit')]) || parseFloat(row[headers.indexOf('Price Retail')]),
            price_other: parseFloat(row[headers.indexOf('Price Other')]) || parseFloat(row[headers.indexOf('Price Retail')]),
            cost: row[headers.indexOf('Cost')] ? parseFloat(row[headers.indexOf('Cost')]) : undefined,
            reorder_level: row[headers.indexOf('Reorder Level')] ? parseInt(row[headers.indexOf('Reorder Level')]) : undefined,
            preferred_supplier_id: row[headers.indexOf('Preferred Supplier ID')] ? parseInt(row[headers.indexOf('Preferred Supplier ID')]) : undefined,
            is_active: row[headers.indexOf('Is Active')]?.toLowerCase() !== 'false'
          };

          // Check if product exists (upsert)
          const existingProduct = await dataService.getProductBySku(product.sku);
          if (existingProduct) {
            await dataService.updateProduct(existingProduct.id, product);
            result.warnings.push(`Updated existing product: ${product.sku}`);
          } else {
            await dataService.createProduct(product);
            result.imported++;
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  async importSuppliers(csvData: string): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: true,
      imported: 0,
      errors: [],
      warnings: []
    };

    try {
      const rows = this.parseCSV(csvData);
      if (rows.length === 0) {
        result.errors.push('CSV file is empty');
        result.success = false;
        return result;
      }

      const headers = rows[0];
      
      // Validate required headers
      const requiredHeaders = ['supplier_name'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
        result.success = false;
        return result;
      }

      // Email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Process each row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;
        
        try {
          // Extract values
          const supplier_name = row[headers.indexOf('supplier_name')]?.trim();
          const phone = row[headers.indexOf('phone')]?.trim() || undefined;
          const email = row[headers.indexOf('email')]?.trim() || undefined;
          const address = row[headers.indexOf('address')]?.trim() || undefined;
          const tax_id = row[headers.indexOf('tax_id')]?.trim() || undefined;
          const active = row[headers.indexOf('active')]?.toLowerCase() !== 'false';

          // Validation
          if (!supplier_name) {
            result.errors.push(`Row ${rowNum}: supplier_name is required`);
            continue;
          }

          // Email format validation
          if (email && !emailRegex.test(email)) {
            result.errors.push(`Row ${rowNum}: Invalid email format`);
            continue;
          }

          // Check for existing supplier (upsert by supplier_name)
          const existingSupplier = await dataService.getSupplierByName(supplier_name);

          const supplierData: Omit<Supplier, 'id' | 'created_at'> = {
            supplier_name,
            contact_phone: phone,
            contact_email: email,
            address,
            tax_id,
            active
          };

          if (existingSupplier) {
            // Update existing supplier
            await dataService.updateSupplier(existingSupplier.id, supplierData);
            result.warnings.push(`Row ${rowNum}: Updated existing supplier '${supplier_name}'`);
          } else {
            // Create new supplier
            await dataService.createSupplier(supplierData);
            result.imported++;
          }

        } catch (error) {
          result.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (result.errors.length === 0) {
        result.success = true;
      } else if (result.imported > 0) {
        // Partial success
        result.success = true;
        result.warnings.push(`${result.errors.length} rows had errors but ${result.imported} suppliers were successfully imported`);
      } else {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error parsing CSV');
    }

    return result;
  }

  async importCustomers(csvData: string): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: true,
      imported: 0,
      errors: [],
      warnings: []
    };

    try {
      const rows = this.parseCSV(csvData);
      if (rows.length === 0) {
        result.errors.push('CSV file is empty');
        result.success = false;
        return result;
      }

      const headers = rows[0];
      
      // Validate required headers
      const requiredHeaders = ['customer_name'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
        result.success = false;
        return result;
      }

      // Valid customer types
      const validTypes = ['Retail', 'Wholesale', 'Credit', 'Other'];

      // Process each row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;
        
        try {
          // Extract values
          const customer_name = row[headers.indexOf('customer_name')]?.trim();
          const phone = row[headers.indexOf('phone')]?.trim() || undefined;
          const customer_type = row[headers.indexOf('customer_type')]?.trim() || 'Retail';
          const note = row[headers.indexOf('note')]?.trim() || undefined;
          const active = row[headers.indexOf('active')]?.toLowerCase() !== 'false';

          // Validation
          if (!customer_name) {
            result.errors.push(`Row ${rowNum}: customer_name is required`);
            continue;
          }

          // Customer type validation
          if (!validTypes.includes(customer_type)) {
            result.errors.push(`Row ${rowNum}: customer_type must be one of: ${validTypes.join(', ')}`);
            continue;
          }

          // Check for existing customer (upsert by customer_name)
          const existingCustomer = await dataService.getCustomerByName(customer_name);

          const customerData: Omit<Customer, 'id' | 'created_at'> = {
            customer_name,
            phone,
            customer_type: customer_type as 'Retail' | 'Wholesale' | 'Credit' | 'Other',
            note,
            active
          };

          if (existingCustomer) {
            // Update existing customer
            await dataService.updateCustomer(existingCustomer.id, customerData);
            result.warnings.push(`Row ${rowNum}: Updated existing customer '${customer_name}'`);
          } else {
            // Create new customer
            await dataService.createCustomer(customerData);
            result.imported++;
          }

        } catch (error) {
          result.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (result.errors.length === 0) {
        result.success = true;
      } else if (result.imported > 0) {
        // Partial success
        result.success = true;
        result.warnings.push(`${result.errors.length} rows had errors but ${result.imported} customers were successfully imported`);
      } else {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error parsing CSV');
    }

    return result;
  }

  async importDiscounts(csvData: string, options: { autoCreateCategories?: boolean } = {}): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: true,
      imported: 0,
      errors: [],
      warnings: []
    };

    try {
      const rows = this.parseCSV(csvData);
      if (rows.length === 0) {
        result.errors.push('CSV file is empty');
        result.success = false;
        return result;
      }

      const headers = rows[0];
      
      // Validate required headers
      const requiredHeaders = ['name', 'applies_to_type', 'applies_to_value', 'type', 'value'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
        result.success = false;
        return result;
      }

      // Get existing data for validation
      const products = await dataService.getProducts();
      const categories = await dataService.getCategories();

      // Process each row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;
        
        try {
          // Extract values
          const name = row[headers.indexOf('name')]?.trim();
          const applies_to_type = row[headers.indexOf('applies_to_type')]?.trim().toUpperCase();
          const applies_to_value = row[headers.indexOf('applies_to_value')]?.trim();
          const type = row[headers.indexOf('type')]?.trim().toUpperCase();
          const value = parseFloat(row[headers.indexOf('value')] || '0');
          const max_qty_or_weight = row[headers.indexOf('max_qty_or_weight')] ? parseFloat(row[headers.indexOf('max_qty_or_weight')]) : undefined;
          const active_from = row[headers.indexOf('active_from')] ? new Date(row[headers.indexOf('active_from')]) : new Date();
          const active_to = row[headers.indexOf('active_to')] ? new Date(row[headers.indexOf('active_to')]) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
          const priority = parseInt(row[headers.indexOf('priority')] || '10');
          const reason_required = row[headers.indexOf('reason_required')]?.toLowerCase() === 'true';
          const active = row[headers.indexOf('active')]?.toLowerCase() !== 'false';

          // Validation
          if (!name) {
            result.errors.push(`Row ${rowNum}: Name is required`);
            continue;
          }

          if (!['PRODUCT', 'CATEGORY'].includes(applies_to_type)) {
            result.errors.push(`Row ${rowNum}: applies_to_type must be 'product' or 'category'`);
            continue;
          }

          if (!applies_to_value) {
            result.errors.push(`Row ${rowNum}: applies_to_value is required`);
            continue;
          }

          if (!['PERCENT', 'AMOUNT'].includes(type)) {
            result.errors.push(`Row ${rowNum}: type must be 'percent' or 'amount'`);
            continue;
          }

          if (isNaN(value) || value < 0) {
            result.errors.push(`Row ${rowNum}: value must be a non-negative number`);
            continue;
          }

          if (type === 'PERCENT' && value > 100) {
            result.errors.push(`Row ${rowNum}: percent value cannot exceed 100`);
            continue;
          }

          if (isNaN(active_from.getTime())) {
            result.errors.push(`Row ${rowNum}: invalid active_from date`);
            continue;
          }

          if (isNaN(active_to.getTime())) {
            result.errors.push(`Row ${rowNum}: invalid active_to date`);
            continue;
          }

          if (active_from >= active_to) {
            result.errors.push(`Row ${rowNum}: active_from must be before active_to`);
            continue;
          }

          // Find target ID
          let target_id: number | null = null;

          if (applies_to_type === 'PRODUCT') {
            const product = products.find(p => p.sku === applies_to_value);
            if (!product) {
              result.errors.push(`Row ${rowNum}: Product with SKU '${applies_to_value}' not found`);
              continue;
            }
            target_id = product.id;
          } else if (applies_to_type === 'CATEGORY') {
            let category = categories.find(c => c.name === applies_to_value);
            if (!category && options.autoCreateCategories) {
              // Auto-create category
              category = await dataService.createCategory({ name: applies_to_value });
              categories.push(category);
              result.warnings.push(`Row ${rowNum}: Created new category '${applies_to_value}'`);
            }
            if (!category) {
              result.errors.push(`Row ${rowNum}: Category '${applies_to_value}' not found. Enable auto-create categories to create it automatically.`);
              continue;
            }
            target_id = category.id;
          }

          if (target_id === null) {
            result.errors.push(`Row ${rowNum}: Could not determine target_id`);
            continue;
          }

          // Check for existing rule (upsert based on name, applies_to_type, applies_to_value)
          const existingRules = await dataService.getDiscountRules(false);
          const existingRule = existingRules.find(r => 
            r.name === name && 
            r.applies_to === applies_to_type && 
            r.target_id === target_id
          );

          const discountRule: Omit<DiscountRule, 'id'> = {
            name,
            applies_to: applies_to_type as 'PRODUCT' | 'CATEGORY',
            target_id,
            type: type as 'PERCENT' | 'AMOUNT',
            value,
            max_qty_or_weight,
            active_from,
            active_to,
            priority,
            reason_required,
            active
          };

          if (existingRule) {
            // Update existing rule
            await dataService.updateDiscountRule(existingRule.id, discountRule);
            result.warnings.push(`Row ${rowNum}: Updated existing rule '${name}'`);
          } else {
            // Create new rule
            await dataService.createDiscountRule(discountRule);
            result.imported++;
          }

        } catch (error) {
          result.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (result.errors.length === 0) {
        result.success = true;
      } else if (result.imported > 0) {
        // Partial success
        result.success = true;
        result.warnings.push(`${result.errors.length} rows had errors but ${result.imported} rules were successfully imported`);
      } else {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error parsing CSV');
    }

    return result;
  }

  // Utility methods
  private generateCSV(headers: string[], rows: string[][], options: CSVExportOptions): string {
    const csvRows: string[] = [];
    
    if (options.includeHeaders) {
      csvRows.push(this.escapeCSVRow(headers, options.delimiter));
    }
    
    rows.forEach(row => {
      csvRows.push(this.escapeCSVRow(row, options.delimiter));
    });
    
    return csvRows.join('\n');
  }

  private escapeCSVRow(row: string[], delimiter: string): string {
    return row.map(field => {
      const str = String(field || '');
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(delimiter);
  }

  private parseCSV(csvData: string): string[][] {
    const rows: string[][] = [];
    const lines = csvData.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        const row = this.parseCSVLine(line);
        rows.push(row);
      }
    }
    
    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  // Download helpers
  downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  // Report export functions
  exportSalesSummaryCSV(rows: any[], filters: any): void {
    const metadata = [
      ['Sales Summary Report'],
      ['Date Range:', `${filters.from.toDateString()} - ${filters.to.toDateString()}`],
      ['Price Tier:', filters.tier || 'All'],
      ['Terminal:', filters.terminal || 'All'],
      ['Cashier:', filters.cashier || 'All'],
      ['Generated:', new Date().toLocaleString()],
      [''] // Empty row separator
    ];

    const headers = [
      'date',
      'invoices',
      'gross',
      'discount',
      'tax',
      'net',
      'pay_cash',
      'pay_card',
      'pay_wallet',
      'avg_per_invoice'
    ];

    const metadataRows = metadata.map(row => row.join(','));
    const headerRow = headers.join(',');
    const dataRows = rows.map(row => headers.map(h => row[h] || 0).join(','));
    
    const csvContent = [...metadataRows, headerRow, ...dataRows].join('\n');
    this.downloadCSV(csvContent, 'sales_summary.csv');
  }

  exportSalesByTierCSV(rows: any[], filters: any): void {
    const metadata = [
      ['Sales by Price Tier Report'],
      ['Date Range:', `${filters.from.toDateString()} - ${filters.to.toDateString()}`],
      ['Terminal:', filters.terminal || 'All'],
      ['Cashier:', filters.cashier || 'All'],
      ['Generated:', new Date().toLocaleString()],
      [''] // Empty row separator
    ];

    const headers = [
      'price_tier',
      'invoices',
      'gross',
      'discount',
      'net',
      'avg_per_invoice'
    ];

    const metadataRows = metadata.map(row => row.join(','));
    const headerRow = headers.join(',');
    const dataRows = rows.map(row => [
      row.tier,
      row.invoices,
      row.gross,
      row.discount,
      row.net,
      row.avg_per_invoice
    ].join(','));
    
    const csvContent = [...metadataRows, headerRow, ...dataRows].join('\n');
    this.downloadCSV(csvContent, 'sales_by_tier.csv');
  }

  exportTopProductsCSV(rows: any[], filters: any): void {
    const metadata = [
      ['Top Products Report'],
      ['Date Range:', `${filters.from.toDateString()} - ${filters.to.toDateString()}`],
      ['Price Tier:', filters.tier || 'All'],
      ['Terminal:', filters.terminal || 'All'],
      ['Cashier:', filters.cashier || 'All'],
      ['Generated:', new Date().toLocaleString()],
      [''] // Empty row separator
    ];

    const headers = [
      'sku',
      'name_en',
      'qty',
      'net',
      'invoices'
    ];

    const metadataRows = metadata.map(row => row.join(','));
    const headerRow = headers.join(',');
    const dataRows = rows.map(row => [
      row.sku,
      row.name_en,
      row.qty,
      row.net,
      row.invoices
    ].join(','));
    
    const csvContent = [...metadataRows, headerRow, ...dataRows].join('\n');
    this.downloadCSV(csvContent, 'top_products.csv');
  }

  exportTopCategoriesCSV(rows: any[], filters: any): void {
    const metadata = [
      ['Top Categories Report'],
      ['Date Range:', `${filters.from.toDateString()} - ${filters.to.toDateString()}`],
      ['Price Tier:', filters.tier || 'All'],
      ['Terminal:', filters.terminal || 'All'],
      ['Cashier:', filters.cashier || 'All'],
      ['Generated:', new Date().toLocaleString()],
      [''] // Empty row separator
    ];

    const headers = [
      'category',
      'qty',
      'net',
      'invoices'
    ];

    const metadataRows = metadata.map(row => row.join(','));
    const headerRow = headers.join(',');
    const dataRows = rows.map(row => [
      row.category_name,
      row.qty,
      row.net,
      row.invoices
    ].join(','));
    
    const csvContent = [...metadataRows, headerRow, ...dataRows].join('\n');
    this.downloadCSV(csvContent, 'top_categories.csv');
  }

  exportDiscountAuditCSV(rows: any[], filters: any): void {
    const metadata = [
      ['Discount Audit Report'],
      ['Date Range:', `${filters.from.toDateString()} - ${filters.to.toDateString()}`],
      ['Price Tier:', filters.tier || 'All'],
      ['Terminal:', filters.terminal || 'All'],
      ['Cashier:', filters.cashier || 'All'],
      ['Generated:', new Date().toLocaleString()],
      [''] // Empty row separator
    ];

    const headers = [
      'rule_name',
      'times_applied',
      'discounted_amount',
      'avg_per_invoice',
      'affected_invoices'
    ];

    const metadataRows = metadata.map(row => row.join(','));
    const headerRow = headers.join(',');
    const dataRows = rows.map(row => [
      row.rule_name,
      row.times_applied,
      row.discounted_amount,
      row.avg_per_invoice,
      row.affected_invoices
    ].join(','));
    
    const csvContent = [...metadataRows, headerRow, ...dataRows].join('\n');
    this.downloadCSV(csvContent, 'discount_audit.csv');
  }

  // Inventory export functions
  exportStockCSV(rows: any[], filters?: any): void {
    const metadata = [
      ['Stock Export'],
      ['Generated:', new Date().toLocaleString()],
      ['Filters Applied:', filters ? Object.entries(filters).filter(([k, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ') : 'None'],
      [''] // Empty row separator
    ];

    const headers = [
      'sku',
      'name_en',
      'unit',
      'current_stock',
      'reorder_level',
      'preferred_supplier'
    ];

    const metadataRows = metadata.map(row => row.join(','));
    const headerRow = headers.join(',');
    const dataRows = rows.map(row => [
      row.sku,
      row.name_en,
      row.unit,
      row.current_stock,
      row.reorder_level || '',
      row.preferred_supplier || ''
    ].join(','));
    
    const csvContent = [...metadataRows, headerRow, ...dataRows].join('\n');
    this.downloadCSV(csvContent, 'stock_export.csv');
  }

  exportStocktakeTemplateCSV(rows: any[]): void {
    const metadata = [
      ['Stocktake Template'],
      ['Generated:', new Date().toLocaleString()],
      ['Instructions: Fill in counted_qty column and save as stocktake_counts.csv'],
      [''] // Empty row separator
    ];

    const headers = [
      'sku',
      'name_en',
      'unit',
      'current_stock',
      'reorder_level'
    ];

    const metadataRows = metadata.map(row => row.join(','));
    const headerRow = headers.join(',');
    const dataRows = rows.map(row => [
      row.sku,
      row.name_en,
      row.unit,
      row.current_stock,
      row.reorder_level || ''
    ].join(','));
    
    const csvContent = [...metadataRows, headerRow, ...dataRows].join('\n');
    this.downloadCSV(csvContent, 'stocktake_template.csv');
  }

  async importStocktakeCounts(csvData: string): Promise<{
    okRows: { sku: string; counted_qty: number; note?: string }[];
    errorRows: { row: number; error: string; data: any }[];
    totals: { total: number; valid: number; errors: number };
  }> {
    const result = {
      okRows: [] as { sku: string; counted_qty: number; note?: string }[],
      errorRows: [] as { row: number; error: string; data: any }[],
      totals: { total: 0, valid: 0, errors: 0 }
    };

    try {
      const rows = this.parseCSV(csvData);
      
      if (rows.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Validate headers
      const expectedHeaders = ['sku', 'counted_qty', 'note'];
      const headers = rows[0].map(h => h.toLowerCase().trim());
      
      const requiredHeaders = ['sku', 'counted_qty'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Process each row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;
        result.totals.total++;
        
        try {
          // Extract values
          const sku = row[headers.indexOf('sku')]?.trim();
          const countedQtyStr = row[headers.indexOf('counted_qty')]?.trim();
          const note = row[headers.indexOf('note')]?.trim() || undefined;

          // Validate required fields
          if (!sku) {
            result.errorRows.push({
              row: rowNum,
              error: 'SKU is required',
              data: row
            });
            continue;
          }

          if (!countedQtyStr) {
            result.errorRows.push({
              row: rowNum,
              error: 'counted_qty is required',
              data: row
            });
            continue;
          }

          // Parse and validate counted_qty
          const countedQty = parseFloat(countedQtyStr);
          if (isNaN(countedQty) || countedQty < 0) {
            result.errorRows.push({
              row: rowNum,
              error: 'counted_qty must be a non-negative number',
              data: row
            });
            continue;
          }

          // Add to valid rows
          result.okRows.push({
            sku,
            counted_qty: countedQty,
            note
          });
          result.totals.valid++;

        } catch (error) {
          result.errorRows.push({
            row: rowNum,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: row
          });
        }
      }

      result.totals.errors = result.errorRows.length;
      return result;

    } catch (error) {
      throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  exportInventoryLogsCSV(rows: any[], filters?: any): void {
    const metadata = [
      ['Inventory Movement Logs'],
      ['Generated:', new Date().toLocaleString()],
      ['Date Range:', filters?.fromDate && filters?.toDate ? 
        `${filters.fromDate.toDateString()} - ${filters.toDate.toDateString()}` : 'All'],
      ['Type Filter:', filters?.type || 'All'],
      ['SKU Filter:', filters?.sku || 'All'],
      [''] // Empty row separator
    ];

    const headers = [
      'datetime',
      'type',
      'sku',
      'name_en',
      'qty',
      'reason',
      'note',
      'terminal',
      'cashier'
    ];

    const metadataRows = metadata.map(row => row.join(','));
    const headerRow = headers.join(',');
    const dataRows = rows.map(row => [
      row.datetime instanceof Date ? row.datetime.toISOString() : row.datetime,
      row.type,
      row.sku,
      row.name_en,
      row.qty,
      row.reason || '',
      row.note || '',
      row.terminal || '',
      row.cashier || ''
    ].join(','));
    
    const csvContent = [...metadataRows, headerRow, ...dataRows].join('\n');
    this.downloadCSV(csvContent, 'inventory_logs.csv');
  }

  // Backup logs export function
  exportBackupLogsCSV(rows: any[], filters?: any): void {
    const metadata = [
      ['Backup Logs Export'],
      ['Generated:', new Date().toLocaleString()],
      ['Date Range:', filters?.fromDate && filters?.toDate ? 
        `${filters.fromDate.toDateString()} - ${filters.toDate.toDateString()}` : 'All'],
      ['Type Filter:', filters?.type || 'All'],
      ['Result Filter:', filters?.result || 'All'],
      ['Provider Filter:', filters?.provider || 'All'],
      [''] // Empty row separator
    ];

    const headers = [
      'datetime',
      'type',
      'provider',
      'location_url',
      'filename',
      'bytes',
      'checksum',
      'result',
      'by_user',
      'note'
    ];

    const metadataRows = metadata.map(row => row.join(','));
    const headerRow = headers.join(',');
    const dataRows = rows.map(row => [
      row.datetime instanceof Date ? row.datetime.toISOString() : row.datetime,
      row.type,
      row.provider || '',
      row.location_url || '',
      row.filename || '',
      row.bytes || '',
      row.checksum || '',
      row.result,
      row.by_user || '',
      this.escapeCSVField(row.note || '')
    ].join(','));
    
    const csvContent = [...metadataRows, headerRow, ...dataRows].join('\n');
    this.downloadCSV(csvContent, 'backup_logs.csv');
  }

  // Helper method to escape CSV fields containing commas, quotes, or newlines
  private escapeCSVField(field: string): string {
    if (typeof field !== 'string') {
      return String(field);
    }
    
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    
    return field;
  }

  /**
   * Export health report to CSV
   */
  async exportHealthCSV(report: HealthReport): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `health-report-${timestamp}.csv`;

      // Prepare CSV data with exact headers as specified
      const csvData: any[] = [];

      // First row: metadata row with overall information
      csvData.push({
        ran_at: report.ranAt,
        duration_ms: report.durationMs,
        overall: report.overall,
        key: '',
        label: '',
        status: '',
        details: '',
        suggestion: '',
        metrics_json: ''
      });

      // Add each health check item as a row
      report.items.forEach(item => {
        csvData.push({
          ran_at: report.ranAt,
          duration_ms: report.durationMs,
          overall: report.overall,
          key: item.key,
          label: item.label,
          status: item.status,
          details: item.details || '',
          suggestion: item.suggestion || '',
          metrics_json: item.metrics ? JSON.stringify(item.metrics) : ''
        });
      });

      // Export with custom headers
      await this.exportData(csvData, filename, {
        delimiter: ',',
        includeHeaders: true,
        encoding: 'utf-8'
      });

      console.log(`✅ Health report exported to ${filename}`);

    } catch (error) {
      console.error('❌ Health report export failed:', error);
      throw new Error(`Failed to export health report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export X Report to CSV
   */
  async exportXReportCSV(xReport: any): Promise<void> {
    try {
      const timestamp = new Date(xReport.generated_at).toISOString().replace(/[:.]/g, '-');
      const filename = `x-report-${xReport.session.id}-${timestamp}.csv`;

      const csvData = [{
        session_id: xReport.session.id,
        cashier: xReport.session.cashier_name || '',
        terminal: xReport.session.terminal,
        started_at: xReport.session.started_at,
        generated_at: xReport.generated_at,
        invoices: xReport.totals.invoices,
        gross: xReport.totals.gross,
        discount: xReport.totals.discount,
        tax: xReport.totals.tax,
        net: xReport.totals.net,
        cash: xReport.totals.cash,
        card: xReport.totals.card,
        wallet: xReport.totals.wallet,
        cash_in: xReport.totals.cash_in,
        cash_out: xReport.totals.cash_out,
        expected_cash: xReport.totals.expected_cash
      }];

      await this.exportData(csvData, filename);
      console.log(`✅ X Report exported to ${filename}`);

    } catch (error) {
      console.error('❌ X Report export failed:', error);
      throw new Error(`Failed to export X Report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export Z Report to CSV
   */
  async exportZReportCSV(zReport: any): Promise<void> {
    try {
      const timestamp = new Date(zReport.ended_at).toISOString().replace(/[:.]/g, '-');
      const filename = `z-report-${zReport.session.id}-${timestamp}.csv`;

      const csvData = [{
        session_id: zReport.session.id,
        cashier: zReport.session.cashier_name || '',
        terminal: zReport.session.terminal,
        started_at: zReport.session.started_at,
        ended_at: zReport.ended_at,
        invoices: zReport.totals.invoices,
        gross: zReport.totals.gross,
        discount: zReport.totals.discount,
        tax: zReport.totals.tax,
        net: zReport.totals.net,
        cash: zReport.totals.cash,
        card: zReport.totals.card,
        wallet: zReport.totals.wallet,
        cash_in: zReport.totals.cash_in,
        cash_out: zReport.totals.cash_out,
        expected_cash: zReport.totals.expected_cash,
        counted_cash: zReport.counted_cash,
        variance: zReport.variance
      }];

      await this.exportData(csvData, filename);
      console.log(`✅ Z Report exported to ${filename}`);

    } catch (error) {
      console.error('❌ Z Report export failed:', error);
      throw new Error(`Failed to export Z Report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export Shift History to CSV
   */
  async exportShiftHistoryCSV(sessions: any[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `shift-history-${timestamp}.csv`;

      const csvData = sessions.map(session => ({
        session_id: session.id,
        status: session.status,
        cashier: session.cashier_name || '',
        terminal: session.terminal,
        started_at: session.started_at,
        ended_at: session.ended_at || '',
        invoices: 0, // Would need to be calculated from sales data
        net: 0, // Would need to be calculated from sales data
        expected_cash: session.opening_float || 0, // Simplified for now
        variance: session.closing_cash !== null && session.opening_float !== null ? 
                  (session.closing_cash - session.opening_float) : 0
      }));

      await this.exportData(csvData, filename);
      console.log(`✅ Shift History exported to ${filename}`);

    } catch (error) {
      console.error('❌ Shift History export failed:', error);
      throw new Error(`Failed to export Shift History: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export Refunds to CSV
   */
  async exportRefundsCSV(refunds: any[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `refunds-${timestamp}.csv`;

      const csvData = refunds.map(refund => ({
        refund_id: `REF-${refund.id}`,
        refund_datetime: refund.refund_datetime,
        original_invoice: refund.original_invoice,
        customer: refund.customer_name || 'Walk-in',
        cashier: refund.cashier_name || '',
        terminal: refund.terminal,
        method: refund.method,
        restock_count: refund.restock_count,
        refund_net: Math.abs(refund.refund_net), // Show as positive amount
        reason: refund.reason || 'Customer return'
      }));

      await this.exportData(csvData, filename);
      console.log(`✅ Refunds exported to ${filename}`);

    } catch (error) {
      console.error('❌ Refunds export failed:', error);
      throw new Error(`Failed to export Refunds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export Holds to CSV
   */
  async exportHoldsCSV(holds: HoldSale[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `holds-${timestamp}.csv`;

      const csvData = holds.map(hold => ({
        hold_id: `HOLD-${hold.id}`,
        created_at: hold.created_at,
        expires_at: hold.expires_at || '',
        status: hold.status,
        terminal: hold.terminal_name,
        cashier: hold.cashier_name || '',
        customer: hold.customer_name || '',
        hold_name: hold.hold_name,
        items_count: hold.items_count,
        subtotal: hold.subtotal,
        discount: hold.discount,
        net: hold.net
      }));

      await this.exportData(csvData, filename);
      console.log(`✅ Holds exported to ${filename}`);

    } catch (error) {
      console.error('❌ Holds export failed:', error);
      throw new Error(`Failed to export Holds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export Stocktake Counts to CSV
   */
  async exportStocktakeCountsCSV(session: StocktakeSession, counts: StocktakeCount[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `stocktake-counts-${session.id}-${timestamp}.csv`;

      const csvData = counts.map(count => ({
        session_id: session.id,
        sku: count.product_sku,
        barcode: count.product_barcode || '',
        name: count.product_name,
        unit: count.product_unit,
        count_qty: count.qty,
        last_stock: count.last_known_stock || 0,
        delta: count.delta || 0,
        source: count.source
      }));

      await this.exportData(csvData, filename);
      console.log(`✅ Stocktake counts exported to ${filename}`);

    } catch (error) {
      console.error('❌ Stocktake counts export failed:', error);
      throw new Error(`Failed to export Stocktake counts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export Stocktake Variance to CSV
   */
  async exportStocktakeVarianceCSV(session: StocktakeSession, variances: any[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `stocktake-variance-${session.id}-${timestamp}.csv`;

      const csvData = variances
        .filter(v => v.delta !== 0)
        .map(variance => ({
          session_id: session.id,
          sku: variance.product_sku,
          name: variance.product_name,
          delta_type: variance.delta_type,
          delta_qty: Math.abs(variance.delta)
        }));

      await this.exportData(csvData, filename);
      console.log(`✅ Stocktake variance exported to ${filename}`);

    } catch (error) {
      console.error('❌ Stocktake variance export failed:', error);
      throw new Error(`Failed to export Stocktake variance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export GRN to CSV
   */
  async exportGrnCSV(grn: any, lines: any[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `grn-${grn.id}-${timestamp}.csv`;

      const csvData = lines.map(line => ({
        grn_id: grn.id,
        grn_date: grn.grn_date,
        supplier: grn.supplier_name || '',
        ref_no: grn.ref_no,
        note: grn.note || '',
        sku: line.product_sku,
        barcode: line.product_barcode || '',
        name: line.product_name,
        qty: line.qty,
        cost: line.cost,
        line_total: line.line_total
      }));

      await this.exportData(csvData, filename);
      console.log(`✅ GRN exported to ${filename}`);

    } catch (error) {
      console.error('❌ GRN export failed:', error);
      throw new Error(`Failed to export GRN: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export GRN List to CSV
   */
  async exportGrnListCSV(grns: any[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `grn-list-${timestamp}.csv`;

      const csvData = grns.map(grn => ({
        grn_id: grn.id,
        grn_date: grn.grn_date,
        supplier: grn.supplier_name || '',
        ref_no: grn.ref_no,
        note: grn.note || '',
        status: grn.status,
        line_count: grn.line_count || 0,
        total_qty: grn.total_qty || 0,
        total_cost: grn.total_cost || 0,
        created_by: grn.by_user_name || '',
        posted_by: grn.approval_user_name || ''
      }));

      await this.exportData(csvData, filename);
      console.log(`✅ GRN list exported to ${filename}`);

    } catch (error) {
      console.error('❌ GRN list export failed:', error);
      throw new Error(`Failed to export GRN list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export Audit Logs to CSV
   */
  async exportAuditCSV(logs: AuditLog[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `audit-logs-${timestamp}.csv`;

      const csvData = logs.map(log => ({
        at: log.at,
        user: log.user_name,
        role: '', // Would need to join with users table for role
        terminal: log.terminal || '',
        action: log.action,
        entity: log.entity || '',
        entity_id: log.entity_id || '',
        payload_json: log.payload_json || ''
      }));

      await this.exportData(csvData, filename);
      console.log(`✅ Audit logs exported to ${filename}`);

    } catch (error) {
      console.error('❌ Audit logs export failed:', error);
      throw new Error(`Failed to export Audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export Users to CSV
   */
  async exportUsersCSV(users: UserWithStatus[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `users-${timestamp}.csv`;

      const csvData: UserCSVExportRow[] = users.map(user => ({
        name: user.name,
        role: user.role,
        active: user.active,
        locked_until: user.lockout_expires || ''
      }));

      await this.exportData(csvData, filename);
      console.log(`✅ Users exported to ${filename}`);

    } catch (error) {
      console.error('❌ Users export failed:', error);
      throw new Error(`Failed to export Users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse CSV file for user import
   */
  async parseUsersCSV(file: File): Promise<{
    data: any[];
    errors: Array<{ row: number; error: string }>;
  }> {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const expectedHeaders = ['name', 'role', 'active', 'pin'];
      
      // Validate required headers
      const requiredHeaders = ['name', 'role'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      const data: any[] = [];
      const errors: Array<{ row: number; error: string }> = [];

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};

          headers.forEach((header, index) => {
            const value = values[index] || '';
            
            switch (header) {
              case 'name':
                row.name = value;
                break;
              case 'role':
                row.role = value.toUpperCase();
                break;
              case 'active':
                row.active = value;
                break;
              case 'pin':
                row.pin = value || undefined;
                break;
            }
          });

          data.push(row);

        } catch (error) {
          errors.push({
            row: i + 1,
            error: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      return { data, errors };

    } catch (error) {
      console.error('❌ Users CSV parsing failed:', error);
      throw error;
    }
  }

  /**
   * Export label items to CSV
   */
  exportLabelsCSVToString(items: LabelItem[]): string {
    const headers = [
      'sku', 'barcode', 'name_en', 'name_si', 'name_ta', 'category', 'unit',
      'price_retail', 'price_wholesale', 'price_credit', 'price_other',
      'qty', 'price_tier', 'language', 'packed_date', 'expiry_date', 'mrp', 'batch_no'
    ];

    const csvRows = [headers.join(',')];

    items.forEach(item => {
      const row = [
        item.sku,
        item.barcode || '',
        item.name_en,
        item.name_si || '',
        item.name_ta || '',
        item.category || '',
        item.unit,
        item.price_retail.toString(),
        item.price_wholesale.toString(),
        item.price_credit.toString(),
        item.price_other.toString(),
        item.qty.toString(),
        item.price_tier,
        item.language || 'EN',
        item.packedDate || '',
        item.expiryDate || '',
        item.mrp?.toString() || '',
        item.batchNo || ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  exportLabelsCSV(items: LabelItem[], filename?: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFilename = filename || `labels-${timestamp}.csv`;

    const headers = [
      'preset',
      'name', 
      'sku',
      'barcode',
      'price',
      'price_tier',
      'language',
      'label_type',
      'qty',
      'packed_date',
      'expiry_date',
      'mrp',
      'batch_no'
    ];

    const csvData = items.map(item => ({
      preset: '', // Will be filled by caller
      name: item.name_en,
      sku: item.sku,
      barcode: item.barcode || '',
      price: this.formatPrice(item, item.price_tier),
      price_tier: item.price_tier,
      language: item.language || '',
      label_type: '', // Will be filled by caller  
      qty: item.qty.toString(),
      packed_date: item.packedDate || '',
      expiry_date: item.expiryDate || '',
      mrp: item.mrp ? item.mrp.toString() : '',
      batch_no: item.batchNo || ''
    }));

    this.exportData(csvData, exportFilename);
  }

  /**
   * Parse labels CSV content
   */
  private parseLabelsCSV(lines: string[], headers: string[]): {
    items: LabelItem[];
    errors: Array<{ row: number; error: string; data: any }>;
    warnings: string[];
  } {
    const items: LabelItem[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];
    const warnings: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        errors.push({
          row: i + 1,
          error: `Column count mismatch. Expected ${headers.length}, got ${values.length}`,
          data: values
        });
        continue;
      }

      try {
        const item: LabelItem = {
          id: `item-${i}`,
          sku: values[headers.indexOf('sku')] || '',
          barcode: values[headers.indexOf('barcode')] || undefined,
          name_en: values[headers.indexOf('name_en')] || '',
          name_si: values[headers.indexOf('name_si')] || undefined,
          name_ta: values[headers.indexOf('name_ta')] || undefined,
          category: values[headers.indexOf('category')] || undefined,
          unit: 'pcs', // Default unit
          price_retail: parseFloat(values[headers.indexOf('price_retail')] || '0'),
          price_wholesale: parseFloat(values[headers.indexOf('price_wholesale')] || '0'),
          price_credit: parseFloat(values[headers.indexOf('price_credit')] || '0'),
          price_other: parseFloat(values[headers.indexOf('price_other')] || '0'),
          qty: parseInt(values[headers.indexOf('qty')] || '1'),
          price_tier: (values[headers.indexOf('price_tier')] as 'retail' | 'wholesale' | 'credit' | 'other') || 'retail',
          language: (values[headers.indexOf('language')] as 'EN' | 'SI' | 'TA') || 'EN',
          custom_line1: values[headers.indexOf('custom_line1')] || undefined,
          custom_line2: values[headers.indexOf('custom_line2')] || undefined,
          packedDate: values[headers.indexOf('packed_date')] || undefined,
          expiryDate: values[headers.indexOf('expiry_date')] || undefined,
          mrp: values[headers.indexOf('mrp')] ? parseFloat(values[headers.indexOf('mrp')]) : null,
          batchNo: values[headers.indexOf('batch_no')] || undefined
        };

        items.push(item);
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: values
        });
      }
    }

    return { items, errors, warnings };
  }

  /**
   * Import labels from CSV string (for testing)
   */
  async importLabelsCSVFromString(csvContent: string): Promise<{
    items: LabelItem[];
    errors: Array<{ row: number; error: string; data: any }>;
    warnings: string[];
    success: boolean;
  }> {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return {
          items: [],
          errors: [{ row: 0, error: 'CSV content is empty', data: {} }],
          warnings: [],
          success: false
        };
      }

      // Parse headers - accept any of the expected headers
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const result = this.parseLabelsCSV(lines, headers);
      return {
        ...result,
        success: result.errors.length === 0
      };
    } catch (error) {
      console.error('Error importing labels from CSV string:', error);
      return {
        items: [],
        errors: [{ row: 0, error: error instanceof Error ? error.message : 'Unknown error', data: {} }],
        warnings: [],
        success: false
      };
    }
  }

  /**
   * Import labels from CSV
   */
  async importLabelsCSV(file: File): Promise<{
    items: LabelItem[];
    errors: Array<{ row: number; error: string; data: any }>;
    warnings: string[];
  }> {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse headers - accept any of the expected headers
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const acceptedHeaders = [
        'barcode', 'sku', 'qty', 'price_tier', 'language', 
        'custom_line1', 'custom_line2', 'packed_date', 'expiry_date', 'mrp', 'batch_no'
      ];

      // Validate at least one identifier is present
      if (!headers.includes('barcode') && !headers.includes('sku')) {
        throw new Error('CSV must contain either "barcode" or "sku" column');
      }

      const items: LabelItem[] = [];
      const errors: Array<{ row: number; error: string; data: any }> = [];
      const warnings: string[] = [];

      // Get products for validation
      const products = await dataService.getProducts();
      const categories = await dataService.getCategories();

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const row: any = {};

        try {
          // Map values to headers
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          // Extract key fields
          const barcode = row.barcode || undefined;
          const sku = row.sku || undefined;
          const qty = parseInt(row.qty) || 1;
          const priceTier = row.price_tier || 'retail';
          const language = row.language || 'EN';
          const customLine1 = row.custom_line1 || undefined;
          const customLine2 = row.custom_line2 || undefined;
          const packedDate = row.packed_date || null;
          const expiryDate = row.expiry_date || null;
          const mrp = row.mrp ? parseFloat(row.mrp) : null;
          const batchNo = row.batch_no || null;

          // Validate price tier
          if (!['retail', 'wholesale', 'credit', 'other'].includes(priceTier)) {
            errors.push({
              row: i + 1,
              error: `Invalid price_tier: ${priceTier}. Must be one of: retail, wholesale, credit, other`,
              data: row
            });
            continue;
          }

          // Validate language
          if (!['EN', 'SI', 'TA'].includes(language)) {
            errors.push({
              row: i + 1,
              error: `Invalid language: ${language}. Must be one of: EN, SI, TA`,
              data: row
            });
            continue;
          }

          // Validate MRP
          if (mrp !== null && (isNaN(mrp) || mrp < 0)) {
            errors.push({
              row: i + 1,
              error: `Invalid MRP: ${row.mrp}. Must be a number >= 0`,
              data: row
            });
            continue;
          }

          // Validate dates
          const validateDate = (dateStr: string, fieldName: string): boolean => {
            if (!dateStr) return true; // null/empty is valid
            
            // Try ISO format first (YYYY-MM-DD)
            const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
            if (isoMatch) {
              const date = new Date(dateStr);
              return !isNaN(date.getTime());
            }
            
            // Try other formats
            const ddmmMatch = dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/);
            const mmddMatch = dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/);
            
            if (ddmmMatch || mmddMatch) {
              warnings.push(`Row ${i + 1}: ${fieldName} format should be YYYY-MM-DD (found: ${dateStr})`);
              return true; // Accept but warn
            }
            
            return false;
          };

          if (packedDate && !validateDate(packedDate, 'packed_date')) {
            errors.push({
              row: i + 1,
              error: `Invalid packed_date format: ${packedDate}. Use YYYY-MM-DD`,
              data: row
            });
            continue;
          }

          if (expiryDate && !validateDate(expiryDate, 'expiry_date')) {
            errors.push({
              row: i + 1,
              error: `Invalid expiry_date format: ${expiryDate}. Use YYYY-MM-DD`,
              data: row
            });
            continue;
          }

          // Validate date relationship
          if (packedDate && expiryDate) {
            const packed = new Date(packedDate);
            const expiry = new Date(expiryDate);
            if (!isNaN(packed.getTime()) && !isNaN(expiry.getTime()) && expiry < packed) {
              errors.push({
                row: i + 1,
                error: 'Expiry date must be after packed date',
                data: row
              });
              continue;
            }
          }

          // Find product by barcode first, then by SKU
          let product: Product | undefined;
          if (barcode) {
            product = products.find(p => p.barcode === barcode);
          }
          if (!product && sku) {
            product = products.find(p => p.sku === sku);
          }

          if (!product) {
            errors.push({
              row: i + 1,
              error: `Product not found: ${barcode ? `barcode=${barcode}` : ''}${sku ? ` sku=${sku}` : ''}`,
              data: row
            });
            continue;
          }

          // Find category
          const category = categories.find(c => c.id === product.category_id);

          // Create label item
          const labelItem: LabelItem = {
            id: `csv-${product.id}-${Date.now()}-${i}`,
            sku: product.sku,
            barcode: product.barcode,
            name_en: product.name_en,
            name_si: product.name_si,
            name_ta: product.name_ta,
            category: category?.name,
            unit: product.unit,
            price_retail: product.price_retail,
            price_wholesale: product.price_wholesale,
            price_credit: product.price_credit,
            price_other: product.price_other,
            qty,
            price_tier: priceTier as 'retail' | 'wholesale' | 'credit' | 'other',
            language: language as 'EN' | 'SI' | 'TA',
            custom_line1: customLine1,
            custom_line2: customLine2,
            // New fields from CSV
            packedDate,
            expiryDate,
            mrp,
            batchNo
          };

          items.push(labelItem);

        } catch (error) {
          errors.push({
            row: i + 1,
            error: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: row
          });
        }
      }

      return { items, errors, warnings };

    } catch (error) {
      console.error('❌ Labels CSV import failed:', error);
      throw error;
    }
  }

  /**
   * Export label jobs history to CSV
   */
  exportLabelJobsCSV(jobs: LabelJob[]): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `label-jobs-${timestamp}.csv`;

    const csvData = jobs.map(job => ({
      timestamp: job.timestamp instanceof Date ? job.timestamp.toISOString() : job.timestamp,
      preset_name: job.preset_name,
      source: job.source,
      items_count: job.items_count,
      printed_by: job.printed_by || '',
      terminal: job.terminal || ''
    }));

    this.exportData(csvData, filename);
  }

  /**
   * Format price for label export
   */
  private formatPrice(item: LabelItem, tier: 'retail' | 'wholesale' | 'credit' | 'other'): string {
    let price = 0;
    switch (tier) {
      case 'retail':
        price = item.price_retail;
        break;
      case 'wholesale':
        price = item.price_wholesale;
        break;
      case 'credit':
        price = item.price_credit;
        break;
      case 'other':
        price = item.price_other;
        break;
    }

    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(price);
  }

  // GRN CSV Methods
  async exportGRNLines(grnId: number): Promise<string> {
    try {
      const { grnService } = await import('./grnService');
      const grnData = await grnService.getGRN(grnId);
      
      const csvData = grnData.lines.map(line => ({
        sku: line.product?.sku || '',
        barcode: line.product?.barcode || '',
        name_en: line.product?.name || '',
        name_si: line.product?.nameSinhala || '',
        name_ta: line.product?.nameTamil || '',
        qty: line.qty,
        unit_cost: line.unit_cost,
        mrp: line.mrp || '',
        batch_no: line.batch_no || '',
        expiry_date: line.expiry_date || ''
      }));
      
      const headers = [
        'sku', 'barcode', 'name_en', 'name_si', 'name_ta', 
        'qty', 'unit_cost', 'mrp', 'batch_no', 'expiry_date'
      ];
      
      let csvContent = headers.join(',') + '\n';
      
      csvData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header as keyof typeof row];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += values.join(',') + '\n';
      });
      
      return csvContent;
    } catch (error) {
      console.error('Error exporting GRN lines:', error);
      throw new Error('Failed to export GRN lines');
    }
  }

  async importGRNLines(
    grnId: number, 
    file: File, 
    options: { matchBy: 'sku' | 'barcode' }
  ): Promise<CSVImportResult> {
    try {
      const { grnService } = await import('./grnService');
      
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return {
          success: false,
          imported: 0,
          errors: ['CSV file must contain headers and at least one data row'],
          warnings: []
        };
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataLines = lines.slice(1);
      
      const requiredHeaders = ['sku', 'name_en', 'qty', 'unit_cost'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      
      if (missingHeaders.length > 0) {
        return {
          success: false,
          imported: 0,
          errors: [`Missing required headers: ${missingHeaders.join(', ')}`],
          warnings: []
        };
      }
      
      const errors: string[] = [];
      const warnings: string[] = [];
      let imported = 0;
      
      for (let i = 0; i < dataLines.length; i++) {
        const row = dataLines[i];
        const values = this.parseCSVRow(row);
        
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 2}: Column count mismatch`);
          continue;
        }
        
        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });
        
        // Validate required fields
        if (!rowData.sku || !rowData.name_en || !rowData.qty || !rowData.unit_cost) {
          errors.push(`Row ${i + 2}: Missing required fields`);
          continue;
        }
        
        // Find product by SKU or barcode
        let product: Product | null = null;
        if (options.matchBy === 'sku') {
          const products = await dataService.getProducts({ search: rowData.sku });
          product = products.find(p => p.sku === rowData.sku) || null;
        } else {
          const products = await dataService.getProducts({ search: rowData.barcode });
          product = products.find(p => p.barcode === rowData.barcode) || null;
        }
        
        if (!product) {
          errors.push(`Row ${i + 2}: Product not found (${options.matchBy}: ${rowData[options.matchBy]})`);
          continue;
        }
        
        // Validate numeric fields
        const qty = parseFloat(rowData.qty);
        const unitCost = parseFloat(rowData.unit_cost);
        
        if (isNaN(qty) || qty <= 0) {
          errors.push(`Row ${i + 2}: Invalid quantity`);
          continue;
        }
        
        if (isNaN(unitCost) || unitCost < 0) {
          errors.push(`Row ${i + 2}: Invalid unit cost`);
          continue;
        }
        
        // Create GRN line
        const grnLine: Omit<GRNLine, 'id' | 'line_total'> = {
          grn_id: grnId,
          product_id: product.id,
          qty: qty,
          unit_cost: unitCost,
          mrp: rowData.mrp ? parseFloat(rowData.mrp) : null,
          batch_no: rowData.batch_no || null,
          expiry_date: rowData.expiry_date || null
        };
        
        try {
          await grnService.upsertGRNLine(grnLine);
          imported++;
        } catch (error) {
          errors.push(`Row ${i + 2}: Failed to save line - ${error}`);
        }
      }
      
      return {
        success: errors.length === 0,
        imported,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error importing GRN lines:', error);
      return {
        success: false,
        imported: 0,
        errors: ['Failed to import GRN lines'],
        warnings: []
      };
    }
  }

  private parseCSVRow(row: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }
}

// Singleton instance
export const csvService = new CSVService();
