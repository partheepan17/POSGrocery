/**
 * Template Downloader Utility
 * Provides functionality to download CSV/Excel templates for imports
 */

import * as XLSX from 'xlsx';

export interface TemplateColumn {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
  example?: string;
}

export interface TemplateConfig {
  filename: string;
  columns: TemplateColumn[];
  sampleData?: Record<string, any>[];
  sheetName?: string;
}

/**
 * Download a CSV template
 */
export function downloadCSVTemplate(config: TemplateConfig): void {
  const { filename, columns, sampleData } = config;
  
  // Create CSV header row
  const headers = columns.map(col => col.label);
  
  // Create sample data rows
  const sampleRows = sampleData || [
    columns.reduce((acc, col) => {
      acc[col.label] = col.example || (col.required ? `[${col.label}]` : '');
      return acc;
    }, {} as Record<string, string>)
  ];
  
  // Convert to CSV
  const csvContent = [
    headers.join(','),
    ...sampleRows.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escape CSV values
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download an Excel template
 */
export function downloadExcelTemplate(config: TemplateConfig): void {
  const { filename, columns, sampleData, sheetName = 'Template' } = config;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create header row
  const headers = columns.map(col => col.label);
  
  // Create sample data rows
  const sampleRows = sampleData || [
    columns.reduce((acc, col) => {
      acc[col.label] = col.example || (col.required ? `[${col.label}]` : '');
      return acc;
    }, {} as Record<string, string>)
  ];
  
  // Create worksheet data
  const worksheetData = [
    headers,
    ...sampleRows.map(row => headers.map(header => row[header] || ''))
  ];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Add column descriptions as comments (if supported)
  if (columns.some(col => col.description)) {
    // Add description row (hidden)
    const descriptionRow = columns.map(col => col.description || '');
    XLSX.utils.sheet_add_aoa(worksheet, [descriptionRow], { origin: -1 });
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate and download file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download template with automatic format detection
 */
export function downloadTemplate(config: TemplateConfig, format: 'csv' | 'excel' = 'csv'): void {
  if (format === 'excel') {
    downloadExcelTemplate(config);
  } else {
    downloadCSVTemplate(config);
  }
}

/**
 * Predefined template configurations
 */
export const TEMPLATE_CONFIGS = {
  products: {
    filename: 'products_template',
    columns: [
      { key: 'name_en', label: 'Product Name (English)', required: true, example: 'Apple Red Delicious' },
      { key: 'name_si', label: 'Product Name (Sinhala)', example: 'රතු ඇපල්' },
      { key: 'name_ta', label: 'Product Name (Tamil)', example: 'சிவப்பு ஆப்பிள்' },
      { key: 'sku', label: 'SKU', required: true, example: 'APPLE001' },
      { key: 'barcode', label: 'Barcode', example: '1234567890123' },
      { key: 'category_id', label: 'Category ID', required: true, example: '1' },
      { key: 'price_retail', label: 'Retail Price', required: true, example: '150.00' },
      { key: 'price_wholesale', label: 'Wholesale Price', example: '120.00' },
      { key: 'price_credit', label: 'Credit Price', example: '160.00' },
      { key: 'price_other', label: 'Other Price', example: '140.00' },
      { key: 'cost', label: 'Cost Price', example: '100.00' },
      { key: 'unit', label: 'Unit', example: 'kg' },
      { key: 'is_scale_item', label: 'Is Scale Item', example: 'false' },
      { key: 'reorder_level', label: 'Reorder Level', example: '10' },
      { key: 'preferred_supplier_id', label: 'Preferred Supplier ID', example: '1' },
      { key: 'is_active', label: 'Is Active', example: 'true' }
    ]
  },
  categories: {
    filename: 'categories_template',
    columns: [
      { key: 'name', label: 'Category Name', required: true, example: 'Fruits & Vegetables' },
      { key: 'description', label: 'Description', example: 'Fresh fruits and vegetables' }
    ]
  },
  suppliers: {
    filename: 'suppliers_template',
    columns: [
      { key: 'name', label: 'Supplier Name', required: true, example: 'Fresh Produce Co.' },
      { key: 'contact_person', label: 'Contact Person', example: 'John Smith' },
      { key: 'email', label: 'Email', example: 'john@freshproduce.com' },
      { key: 'phone', label: 'Phone', example: '+94 11 234 5678' },
      { key: 'address', label: 'Address', example: '123 Main Street, Colombo 01' },
      { key: 'city', label: 'City', example: 'Colombo' },
      { key: 'country', label: 'Country', example: 'Sri Lanka' },
      { key: 'is_active', label: 'Is Active', example: 'true' }
    ]
  },
  customers: {
    filename: 'customers_template',
    columns: [
      { key: 'customer_name', label: 'Customer Name', required: true, example: 'John Doe' },
      { key: 'contact_phone', label: 'Phone', example: '+94 77 123 4567' },
      { key: 'customer_type', label: 'Customer Type', example: 'Retail' },
      { key: 'note', label: 'Notes', example: 'VIP Customer' },
      { key: 'is_active', label: 'Is Active', example: 'true' }
    ]
  },
  users: {
    filename: 'users_template',
    columns: [
      { key: 'username', label: 'Username', required: true, example: 'john.doe' },
      { key: 'full_name', label: 'Full Name', required: true, example: 'John Doe' },
      { key: 'email', label: 'Email', example: 'john@example.com' },
      { key: 'role', label: 'Role', required: true, example: 'CASHIER' },
      { key: 'pin', label: 'PIN', required: true, example: '1234' },
      { key: 'is_active', label: 'Is Active', example: 'true' }
    ]
  },
  pricing: {
    filename: 'pricing_template',
    columns: [
      { key: 'product_id', label: 'Product ID', required: true, example: '1' },
      { key: 'price_retail', label: 'Retail Price', required: true, example: '150.00' },
      { key: 'price_wholesale', label: 'Wholesale Price', example: '120.00' },
      { key: 'price_credit', label: 'Credit Price', example: '160.00' },
      { key: 'price_other', label: 'Other Price', example: '140.00' }
    ]
  }
} as const;

/**
 * Get template configuration by type
 */
export function getTemplateConfig(type: keyof typeof TEMPLATE_CONFIGS): TemplateConfig {
  return TEMPLATE_CONFIGS[type];
}
