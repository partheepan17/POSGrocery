/**
 * CSV Export Utility
 * Simple utility for exporting data to CSV format
 */

export interface CSVExportOptions {
  filename?: string;
  headers?: string[];
  delimiter?: string;
}

export class CSVExporter {
  private static readonly DEFAULT_DELIMITER = ',';
  private static readonly DEFAULT_FILENAME = 'export.csv';

  /**
   * Convert array of objects to CSV string
   */
  static toCSV<T extends Record<string, any>>(
    data: T[],
    options: CSVExportOptions = {}
  ): string {
    if (data.length === 0) {
      return '';
    }

    const delimiter = options.delimiter || this.DEFAULT_DELIMITER;
    const headers = options.headers || Object.keys(data[0]);

    // Create CSV header row
    const headerRow = headers.map(header => this.escapeCSVField(header)).join(delimiter);

    // Create CSV data rows
    const dataRows = data.map(row => 
      headers.map(header => this.escapeCSVField(this.getNestedValue(row, header))).join(delimiter)
    );

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Download CSV data as a file
   */
  static downloadCSV<T extends Record<string, any>>(
    data: T[],
    options: CSVExportOptions = {}
  ): void {
    const csvContent = this.toCSV(data, options);
    const filename = options.filename || this.DEFAULT_FILENAME;
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Escape CSV field value
   */
  private static escapeCSVField(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);
    
    // If the value contains delimiter, newline, or quote, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Format date for CSV export
   */
  static formatDateForCSV(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Format currency for CSV export
   */
  static formatCurrencyForCSV(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Format percentage for CSV export
   */
  static formatPercentageForCSV(value: number, decimals: number = 2): string {
    return (value * 100).toFixed(decimals);
  }
}

// Convenience functions for common export patterns
export const exportToCSV = CSVExporter.downloadCSV;
export const convertToCSV = CSVExporter.toCSV;

// Pre-configured exporters for specific data types
export const exportSalesData = (data: any[], filename?: string) => {
  CSVExporter.downloadCSV(data, {
    filename: filename || `sales-report-${new Date().toISOString().split('T')[0]}.csv`,
    headers: [
      'Date',
      'Total Sales',
      'Total Revenue',
      'Total Gross',
      'Total Discounts',
      'Total Tax',
      'Average Sale Amount'
    ]
  });
};

export const exportTopSKUsData = (data: any[], filename?: string) => {
  CSVExporter.downloadCSV(data, {
    filename: filename || `top-skus-${new Date().toISOString().split('T')[0]}.csv`,
    headers: [
      'SKU',
      'Product Name',
      'Product Name (SI)',
      'Unit',
      'Quantity Sold',
      'Total Revenue',
      'Average Price',
      'Sales Count',
      'Total COGS',
      'Gross Margin'
    ]
  });
};

export const exportLowStockData = (data: any[], filename?: string) => {
  CSVExporter.downloadCSV(data, {
    filename: filename || `low-stock-${new Date().toISOString().split('T')[0]}.csv`,
    headers: [
      'SKU',
      'Product Name',
      'Product Name (SI)',
      'Unit',
      'Reorder Level',
      'Current Stock',
      'Stock Value',
      'Unit Cost',
      'Stock Status',
      'Last Movement Date'
    ]
  });
};










