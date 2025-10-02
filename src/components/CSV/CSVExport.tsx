import React, { useState } from 'react';
import { Download, FileText, Settings, Calendar } from 'lucide-react';

export interface CSVExportProps<T = any> {
  data: T[];
  filename?: string;
  columns?: Array<{
    key: keyof T;
    label: string;
    formatter?: (value: any) => string;
  }>;
  onExport?: (csvContent: string) => void;
}

export function CSVExport<T = any>({
  data,
  filename = 'export.csv',
  columns,
  onExport,
}: CSVExportProps<T>) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeHeaders: true,
    dateFormat: 'YYYY-MM-DD',
    delimiter: ',',
    quoteStrings: true,
  });

  const formatValue = (value: any, formatter?: (value: any) => string): string => {
    if (formatter) {
      return formatter(value);
    }
    
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  const escapeValue = (value: string): string => {
    if (!exportOptions.quoteStrings) {
      return value;
    }
    
    // Escape quotes and wrap in quotes if contains delimiter, newline, or quote
    if (value.includes(exportOptions.delimiter) || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  };

  const generateCSV = (): string => {
    if (data.length === 0) return '';
    
    // Determine columns to export
    const exportColumns = columns || Object.keys(data[0] || {}).map(key => ({
      key,
      label: String(key),
    }));
    
    const rows: string[] = [];
    
    // Add headers if requested
    if (exportOptions.includeHeaders) {
      const headers = exportColumns.map(col => escapeValue(col.label));
      rows.push(headers.join(exportOptions.delimiter));
    }
    
    // Add data rows
    data.forEach(item => {
      const row = exportColumns.map(col => {
        const value = item[col.key as keyof T];
        const formattedValue = formatValue(value, (col as any).formatter);
        return escapeValue(formattedValue);
      });
      rows.push(row.join(exportOptions.delimiter));
    });
    
    return rows.join('\n');
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const csvContent = generateCSV();
      
      if (onExport) {
        onExport(csvContent);
      } else {
        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Options */}
      <div className="pos-card">
        <div className="pos-card-header">
          <h3 className="pos-card-title flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Export Options
          </h3>
        </div>
        <div className="pos-card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filename
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setExportOptions(prev => ({ ...prev, filename: e.target.value }))}
                className="pos-input w-full"
                placeholder="export.csv"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delimiter
              </label>
              <select
                value={exportOptions.delimiter}
                onChange={(e) => setExportOptions(prev => ({ ...prev, delimiter: e.target.value }))}
                className="pos-input w-full"
              >
                <option value=",">Comma (,)</option>
                <option value=";">Semicolon (;)</option>
                <option value="\t">Tab</option>
                <option value="|">Pipe (|)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Format
              </label>
              <select
                value={exportOptions.dateFormat}
                onChange={(e) => setExportOptions(prev => ({ ...prev, dateFormat: e.target.value }))}
                className="pos-input w-full"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeHeaders}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Include Headers
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.quoteStrings}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, quoteStrings: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Quote Strings
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Export Summary */}
      <div className="pos-card">
        <div className="pos-card-header">
          <h3 className="pos-card-title flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Summary
          </h3>
        </div>
        <div className="pos-card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {data.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total Rows
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {columns?.length || (data[0] ? Object.keys(data[0]).length : 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Columns
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Export Date
              </div>
            </div>
          </div>
          
          <button
            onClick={handleExport}
            disabled={data.length === 0 || isExporting}
            className="pos-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
