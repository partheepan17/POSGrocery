import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { csvService, CSVImportResult } from '@/services/csvService';
import { dataService, Product, Category } from '@/services/dataService';
import { useSettingsStore } from '@/store/settingsStore';

interface DiscountCSVModalProps {
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onImport: () => void;
}

interface PreviewRow {
  rowNumber: number;
  data: any;
  status: 'new' | 'update' | 'error';
  error?: string;
  warnings?: string[];
}

export function DiscountCSVModal({ products, categories, onClose, onImport }: DiscountCSVModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      readFile(selectedFile);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
      generatePreview(content);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const generatePreview = async (csvContent: string) => {
    setLoading(true);
    try {
      const data = await csvService.parseFile(new Blob([csvContent], { type: 'text/csv' }) as File);
      if (data.length === 0) {
        toast.error('CSV file is empty');
        return;
      }

      const headers = Object.keys(data[0]);
      const requiredHeaders = ['name', 'applies_to_type', 'applies_to_value', 'type', 'value'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        toast.error(`Missing required headers: ${missingHeaders.join(', ')}`);
        return;
      }

      // Get existing rules for comparison
      const existingRules = await dataService.getDiscountRules(false);

      const preview: PreviewRow[] = [];

      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];

        const previewRow: PreviewRow = {
          rowNumber: i + 1,
          data: rowData,
          status: 'new',
          warnings: []
        };

        // Validate the row
        try {
          const name = rowData.name?.trim();
          const applies_to_type = rowData.applies_to_type?.trim().toUpperCase();
          const applies_to_value = rowData.applies_to_value?.trim();
          const type = rowData.type?.trim().toUpperCase();
          const value = parseFloat(rowData.value || '0');

          // Basic validation
          if (!name) {
            previewRow.status = 'error';
            previewRow.error = 'Name is required';
          } else if (!['PRODUCT', 'CATEGORY'].includes(applies_to_type)) {
            previewRow.status = 'error';
            previewRow.error = 'applies_to_type must be "product" or "category"';
          } else if (!applies_to_value) {
            previewRow.status = 'error';
            previewRow.error = 'applies_to_value is required';
          } else if (!['PERCENT', 'AMOUNT'].includes(type)) {
            previewRow.status = 'error';
            previewRow.error = 'type must be "percent" or "amount"';
          } else if (isNaN(value) || value < 0) {
            previewRow.status = 'error';
            previewRow.error = 'value must be a non-negative number';
          } else if (type === 'PERCENT' && value > 100) {
            previewRow.status = 'error';
            previewRow.error = 'percent value cannot exceed 100';
          } else {
            // Check if target exists
            let targetExists = false;
            if (applies_to_type === 'PRODUCT') {
              targetExists = products.some(p => p.sku === applies_to_value);
              if (!targetExists) {
                previewRow.status = 'error';
                previewRow.error = `Product with SKU '${applies_to_value}' not found`;
              }
            } else if (applies_to_type === 'CATEGORY') {
              targetExists = categories.some(c => c.name === applies_to_value);
              if (!targetExists) {
                const settings = useSettingsStore.getState().settings;
                if (settings.pricingPolicies?.autoCreateCategories) {
                  previewRow.warnings?.push(`Category '${applies_to_value}' will be created`);
                } else {
                  previewRow.status = 'error';
                  previewRow.error = `Category '${applies_to_value}' not found`;
                }
              }
            }

            if (previewRow.status !== 'error') {
              // Check if rule already exists (for upsert logic)
              const targetId = applies_to_type === 'PRODUCT' 
                ? products.find(p => p.sku === applies_to_value)?.id
                : categories.find(c => c.name === applies_to_value)?.id;

              if (targetId) {
                const existingRule = existingRules.find(r => 
                  r.name === name && 
                  r.applies_to === applies_to_type && 
                  r.target_id === targetId
                );

                if (existingRule) {
                  previewRow.status = 'update';
                  previewRow.warnings?.push('Will update existing rule');
                }
              }
            }
          }

          // Date validation
          const active_from = rowData.active_from ? new Date(rowData.active_from) : null;
          const active_to = rowData.active_to ? new Date(rowData.active_to) : null;

          if (active_from && active_to && active_from >= active_to) {
            if (previewRow.status !== 'error') {
              previewRow.status = 'error';
              previewRow.error = 'active_from must be before active_to';
            }
          }

        } catch (error) {
          previewRow.status = 'error';
          previewRow.error = 'Invalid row data';
        }

        preview.push(previewRow);
      }

      setPreviewRows(preview);
      setStep('preview');
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!csvData) {
      toast.error('No CSV data to import');
      return;
    }

    setLoading(true);
    try {
      const settings = useSettingsStore.getState().settings;
      const result = await csvService.importDiscounts(csvData, {
        autoCreateCategories: settings.pricingPolicies?.autoCreateCategories || false
      });

      setImportResult(result);
      setStep('result');

      if (result.success) {
        toast.success(`Successfully imported ${result.imported} discount rules`);
      } else {
        toast.error('Import completed with errors');
      }
    } catch (error) {
      console.error('Error importing discounts:', error);
      toast.error('Failed to import discount rules');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        name: 'Sugar Discount 10/kg',
        applies_to_type: 'product',
        applies_to_value: 'SUGAR001',
        type: 'amount',
        value: '10',
        max_qty_or_weight: '3',
        active_from: '2024-01-01',
        active_to: '2024-12-31',
        priority: '10',
        reason_required: 'false',
        active: 'true'
      },
      {
        name: 'Produce 5% Off',
        applies_to_type: 'category',
        applies_to_value: 'Produce',
        type: 'percent',
        value: '5',
        max_qty_or_weight: '',
        active_from: '2024-01-01',
        active_to: '2024-12-31',
        priority: '20',
        reason_required: 'false',
        active: 'true'
      }
    ];

    csvService.exportData(templateData, 'discount_rules_template.csv');
    toast.success('Template downloaded');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'update':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-green-50 text-green-800';
      case 'update':
        return 'bg-yellow-50 text-yellow-800';
      case 'error':
        return 'bg-red-50 text-red-800';
      default:
        return 'bg-gray-50 text-gray-800';
    }
  };

  const validRowsCount = previewRows.filter(r => r.status !== 'error').length;
  const newRowsCount = previewRows.filter(r => r.status === 'new').length;
  const updateRowsCount = previewRows.filter(r => r.status === 'update').length;
  const errorRowsCount = previewRows.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Import Discount Rules</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="p-6">
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Upload CSV File
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Upload a CSV file with discount rules. The file must include the required headers.
                </p>

                <div className="mb-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Select CSV File
                  </button>
                </div>

                <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Required Headers:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li><code className="bg-white px-1 rounded">name</code> - Rule name</li>
                    <li><code className="bg-white px-1 rounded">applies_to_type</code> - "product" or "category"</li>
                    <li><code className="bg-white px-1 rounded">applies_to_value</code> - SKU for product or Category name</li>
                    <li><code className="bg-white px-1 rounded">type</code> - "percent" or "amount"</li>
                    <li><code className="bg-white px-1 rounded">value</code> - Discount value</li>
                  </ul>
                  
                  <h4 className="font-medium text-gray-900 mb-2 mt-4">Optional Headers:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li><code className="bg-white px-1 rounded">max_qty_or_weight</code> - Maximum quantity/weight cap</li>
                    <li><code className="bg-white px-1 rounded">active_from</code> - Start date (YYYY-MM-DD)</li>
                    <li><code className="bg-white px-1 rounded">active_to</code> - End date (YYYY-MM-DD)</li>
                    <li><code className="bg-white px-1 rounded">priority</code> - Priority (default: 10)</li>
                    <li><code className="bg-white px-1 rounded">reason_required</code> - "true" or "false"</li>
                    <li><code className="bg-white px-1 rounded">active</code> - "true" or "false"</li>
                  </ul>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mx-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Import Preview</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                    Total: {previewRows.length}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
                    New: {newRowsCount}
                  </span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                    Updates: {updateRowsCount}
                  </span>
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full">
                    Errors: {errorRowsCount}
                  </span>
                </div>
              </div>

              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewRows.map((row) => (
                        <tr key={row.rowNumber} className={row.status === 'error' ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.rowNumber}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              {getStatusIcon(row.status)}
                              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(row.status)}`}>
                                {row.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.data.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.data.applies_to_type} - {row.data.type}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.data.applies_to_value}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.data.value}{row.data.type === 'percent' ? '%' : ' රු'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {row.error && (
                              <span className="text-red-600">{row.error}</span>
                            )}
                            {row.warnings && row.warnings.length > 0 && (
                              <div className="text-yellow-600">
                                {row.warnings.map((warning, i) => (
                                  <div key={i}>{warning}</div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || validRowsCount === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Importing...' : `Import ${validRowsCount} Rules`}
                </button>
              </div>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="p-6">
              <div className="text-center mb-6">
                {importResult.success ? (
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                )}
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {importResult.success ? 'Import Completed' : 'Import Failed'}
                </h3>
                <p className="text-sm text-gray-600">
                  {importResult.success 
                    ? `Successfully imported ${importResult.imported} discount rules`
                    : 'The import encountered errors and could not be completed'
                  }
                </p>
              </div>

              {importResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {importResult.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {importResult.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    onImport();
                    onClose();
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
