import React, { useState, useCallback } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CSVColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  description?: string;
}

export interface CSVImportProps {
  columns: CSVColumn[];
  onImport: (data: any[]) => Promise<void>;
  onCancel?: () => void;
  templateFileName?: string;
  maxRows?: number;
}

interface ParsedRow {
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
}

export function CSVImport({
  columns,
  onImport,
  onCancel,
  templateFileName = 'template.csv',
  maxRows = 1000,
}: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  const downloadTemplate = useCallback(() => {
    const headers = columns.map(col => col.name).join(',');
    const sampleData = columns.map(col => {
      switch (col.type) {
        case 'string': return col.name === 'email' ? 'example@email.com' : 'Sample Text';
        case 'number': return '123.45';
        case 'date': return '2024-01-01';
        case 'boolean': return 'true';
        default: return '';
      }
    }).join(',');
    
    const csvContent = `${headers}\n${sampleData}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [columns, templateFileName]);

  const parseCSV = useCallback(async (csvText: string): Promise<ParsedRow[]> => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length && i <= maxRows + 1; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const rowData: Record<string, any> = {};
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      headers.forEach((header, index) => {
        const column = columns.find(col => col.name === header);
        const value = values[index] || '';

        if (column) {
          // Type conversion and validation
          try {
            switch (column.type) {
              case 'string':
                rowData[header] = value;
                break;
              case 'number':
                const numValue = parseFloat(value);
                if (isNaN(numValue) && value !== '') {
                  rowErrors.push(`${header}: Invalid number "${value}"`);
                } else {
                  rowData[header] = numValue;
                }
                break;
              case 'date':
                const dateValue = new Date(value);
                if (isNaN(dateValue.getTime()) && value !== '') {
                  rowErrors.push(`${header}: Invalid date "${value}"`);
                } else {
                  rowData[header] = dateValue;
                }
                break;
              case 'boolean':
                rowData[header] = value.toLowerCase() === 'true' || value === '1';
                break;
            }

            // Required field validation
            if (column.required && (!value || value.trim() === '')) {
              rowErrors.push(`${header}: Required field is empty`);
            }
          } catch (error) {
            rowErrors.push(`${header}: Parsing error`);
          }
        }
      });

      rows.push({
        data: rowData,
        errors: rowErrors,
        warnings: rowWarnings,
      });
    }

    return rows;
  }, [columns, maxRows]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setErrors(['Please select a CSV file']);
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setErrors([]);

    try {
      const text = await selectedFile.text();
      const parsed = await parseCSV(text);
      setParsedData(parsed);
      setPreviewMode(true);
    } catch (error) {
      setErrors(['Failed to parse CSV file. Please check the format.']);
    } finally {
      setIsParsing(false);
    }
  }, [parseCSV]);

  const handleImport = useCallback(async () => {
    if (parsedData.length === 0) return;

    const validRows = parsedData.filter(row => row.errors.length === 0);
    if (validRows.length === 0) {
      setErrors(['No valid rows to import']);
      return;
    }

    setIsImporting(true);
    try {
      await onImport(validRows.map(row => row.data));
      setPreviewMode(false);
      setFile(null);
      setParsedData([]);
    } catch (error) {
      setErrors(['Import failed. Please try again.']);
    } finally {
      setIsImporting(false);
    }
  }, [parsedData, onImport]);

  const totalErrors = parsedData.reduce((sum, row) => sum + row.errors.length, 0);
  const validRows = parsedData.filter(row => row.errors.length === 0).length;

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <div className="pos-card">
        <div className="pos-card-header">
          <h3 className="pos-card-title flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Template
          </h3>
          <p className="pos-card-description">
            Download a CSV template with the correct format
          </p>
        </div>
        <div className="pos-card-content">
          <button
            onClick={downloadTemplate}
            className="pos-button-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="pos-card">
        <div className="pos-card-header">
          <h3 className="pos-card-title flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload CSV File
          </h3>
          <p className="pos-card-description">
            Select a CSV file to import data
          </p>
        </div>
        <div className="pos-card-content">
          <div className="space-y-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="pos-input"
              disabled={isParsing}
            />
            
            {isParsing && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Parsing CSV file...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="pos-card border-red-200 dark:border-red-800">
          <div className="pos-card-content">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Import Errors</span>
            </div>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewMode && parsedData.length > 0 && (
        <div className="pos-card">
          <div className="pos-card-header">
            <h3 className="pos-card-title flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Import Preview
            </h3>
            <p className="pos-card-description">
              {validRows} valid rows, {totalErrors} errors found
            </p>
          </div>
          <div className="pos-card-content">
            <div className="overflow-x-auto">
              <table className="pos-table">
                <thead className="pos-table-header">
                  <tr className="pos-table-row">
                    <th className="pos-table-head">Row</th>
                    {columns.map((col) => (
                      <th key={col.name} className="pos-table-head">
                        {col.name}
                        {col.required && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                    <th className="pos-table-head">Status</th>
                  </tr>
                </thead>
                <tbody className="pos-table-body">
                  {parsedData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="pos-table-row">
                      <td className="pos-table-cell font-mono text-sm">
                        {index + 1}
                      </td>
                      {columns.map((col) => (
                        <td key={col.name} className="pos-table-cell">
                          {row.data[col.name] !== undefined ? (
                            <span className="text-sm">
                              {typeof row.data[col.name] === 'boolean' 
                                ? row.data[col.name] ? 'Yes' : 'No'
                                : String(row.data[col.name])
                              }
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      ))}
                      <td className="pos-table-cell">
                        {row.errors.length > 0 ? (
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">{row.errors.length} errors</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs">Valid</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {parsedData.length > 10 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Showing first 10 rows. Total: {parsedData.length} rows.
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleImport}
                disabled={validRows === 0 || isImporting}
                className="pos-button-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Import {validRows} Valid Rows
              </button>
              <button
                onClick={() => {
                  setPreviewMode(false);
                  setFile(null);
                  setParsedData([]);
                  setErrors([]);
                }}
                className="pos-button-secondary flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




