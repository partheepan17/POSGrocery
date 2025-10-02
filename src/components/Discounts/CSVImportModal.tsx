import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, DiscountRule, Product, Category } from '@/services/dataService';
import { csvService } from '@/services/csvService';

interface CSVImportModalProps {
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onImport: () => void;
}

interface ImportRow {
  name: string;
  applies_to_type: string;
  applies_to_value: string;
  type: string;
  value: string;
  max_qty_or_weight: string;
  active_from: string;
  active_to: string;
  priority: string;
  reason_required: string;
  active: string;
}

interface ValidationResult {
  row: number;
  data: ImportRow;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
}

interface ImportSummary {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  newRules: number;
  updatedRules: number;
}

export function CSVImportModal({ products, categories, onClose, onImport }: CSVImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [summary, setSummary] = useState<ImportSummary>({ total: 0, valid: 0, warnings: 0, errors: 0, newRules: 0, updatedRules: 0 });
  const [importing, setImporting] = useState(false);
  const [autoCreateCategories, setAutoCreateCategories] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setStep('preview');

    try {
      const data = await csvService.parseFile(selectedFile);
      setParsedData(data);
      validateData(data);
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      toast.error('Failed to parse CSV file. Please check the format.');
      setStep('upload');
    }
  };

  const validateData = (data: ImportRow[]): void => {
    const results: ValidationResult[] = [];
    const summary: ImportSummary = { total: data.length, valid: 0, warnings: 0, errors: 0, newRules: 0, updatedRules: 0 };

    data.forEach((row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let status: 'valid' | 'warning' | 'error' = 'valid';

      // Required field validation
      if (!row.name?.trim()) errors.push('Name is required');
      if (!row.applies_to_type?.trim()) errors.push('Applies to type is required');
      if (!row.applies_to_value?.trim()) errors.push('Applies to value is required');
      if (!row.type?.trim()) errors.push('Type is required');
      if (!row.value?.trim()) errors.push('Value is required');
      if (!row.priority?.trim()) errors.push('Priority is required');

      // Applies to type validation
      if (row.applies_to_type && !['product', 'category'].includes(row.applies_to_type.toLowerCase())) {
        errors.push('Applies to type must be "product" or "category"');
      }

      // Type validation
      if (row.type && !['percent', 'amount'].includes(row.type.toLowerCase())) {
        errors.push('Type must be "percent" or "amount"');
      }

      // Value validation
      const valueNum = parseFloat(row.value);
      if (row.value && (isNaN(valueNum) || valueNum < 0)) {
        errors.push('Value must be a positive number');
      }
      if (row.type?.toLowerCase() === 'percent' && valueNum > 100) {
        errors.push('Percentage cannot exceed 100%');
      }

      // Priority validation
      const priorityNum = parseInt(row.priority);
      if (row.priority && (isNaN(priorityNum) || priorityNum < 1)) {
        errors.push('Priority must be a positive integer');
      }

      // Max qty/weight validation
      if (row.max_qty_or_weight) {
        const maxNum = parseFloat(row.max_qty_or_weight);
        if (isNaN(maxNum) || maxNum <= 0) {
          errors.push('Max qty/weight must be a positive number');
        }
      }

      // Date validation
      if (row.active_from && row.active_to) {
        const fromDate = new Date(row.active_from);
        const toDate = new Date(row.active_to);
        if (fromDate >= toDate) {
          errors.push('Active To date must be after Active From date');
        }
      }

      // Target validation
      if (row.applies_to_type?.toLowerCase() === 'product' && row.applies_to_value) {
        const product = products.find(p => p.sku.toLowerCase() === row.applies_to_value.toLowerCase());
        if (!product) {
          errors.push(`Product with SKU "${row.applies_to_value}" not found`);
        }
      }

      if (row.applies_to_type?.toLowerCase() === 'category' && row.applies_to_value) {
        const category = categories.find(c => c.name.toLowerCase() === row.applies_to_value.toLowerCase());
        if (!category) {
          if (autoCreateCategories) {
            warnings.push(`Category "${row.applies_to_value}" will be created automatically`);
          } else {
            errors.push(`Category "${row.applies_to_value}" not found`);
          }
        }
      }

      // Boolean field validation
      if (row.reason_required && !['true', 'false', '1', '0', 'yes', 'no'].includes(row.reason_required.toLowerCase())) {
        warnings.push('Reason required should be true/false, will default to false');
      }

      if (row.active && !['true', 'false', '1', '0', 'yes', 'no'].includes(row.active.toLowerCase())) {
        warnings.push('Active should be true/false, will default to true');
      }

      // Determine status
      if (errors.length > 0) {
        status = 'error';
        summary.errors++;
      } else if (warnings.length > 0) {
        status = 'warning';
        summary.warnings++;
      } else {
        summary.valid++;
      }

      results.push({
        row: index + 1,
        data: row,
        status,
        errors,
        warnings
      });
    });

    setValidationResults(results);
    setSummary(summary);
  };

  const handleImport = async () => {
    setStep('importing');
    setImporting(true);

    try {
      let createdCategories = 0;
      let createdRules = 0;
      let updatedRules = 0;

      // Process valid rows
      for (const result of validationResults) {
        if (result.status === 'error') continue;

        const row = result.data;

        // Create category if needed
        let targetId: number;
        if (row.applies_to_type.toLowerCase() === 'product') {
          const product = products.find(p => p.sku.toLowerCase() === row.applies_to_value.toLowerCase());
          targetId = product!.id;
        } else {
          let category = categories.find(c => c.name.toLowerCase() === row.applies_to_value.toLowerCase());
          if (!category) {
            // Create new category
            const newCategory = await dataService.createCategory({ name: row.applies_to_value });
            targetId = newCategory.id;
            createdCategories++;
          } else {
            targetId = category.id;
          }
        }

        // Prepare rule data
        const ruleData = {
          name: row.name.trim(),
          applies_to: row.applies_to_type.toUpperCase() as 'PRODUCT' | 'CATEGORY',
          target_id: targetId,
          type: row.type.toUpperCase() as 'PERCENT' | 'AMOUNT',
          value: parseFloat(row.value),
          max_qty_or_weight: row.max_qty_or_weight ? parseFloat(row.max_qty_or_weight) : undefined,
          active_from: row.active_from ? new Date(row.active_from) : new Date(),
          active_to: row.active_to ? new Date(row.active_to) : new Date('2099-12-31'),
          priority: parseInt(row.priority),
          reason_required: ['true', '1', 'yes'].includes(row.reason_required?.toLowerCase() || 'false'),
          active: ['true', '1', 'yes'].includes(row.active?.toLowerCase() || 'true')
        };

        // Check if rule exists (by name and target)
        const existingRules = await dataService.getDiscountRules(false);
        const existingRule = existingRules.find(r => 
          r.name === ruleData.name && r.target_id === targetId
        );

        if (existingRule) {
          await dataService.updateDiscountRule(existingRule.id, ruleData);
          updatedRules++;
        } else {
          await dataService.createDiscountRule(ruleData);
          createdRules++;
        }
      }

      setSummary(prev => ({
        ...prev,
        newRules: createdRules,
        updatedRules: updatedRules
      }));

      toast.success(`Import completed! ${createdRules} new rules, ${updatedRules} updated, ${createdCategories} categories created`);
      setStep('complete');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(`Import failed: ${(error as Error).message}`);
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: 'Sugar Bulk Discount',
        applies_to_type: 'product',
        applies_to_value: 'SUGAR1',
        type: 'amount',
        value: '10.00',
        max_qty_or_weight: '3.000',
        active_from: '2024-01-01',
        active_to: '2024-12-31',
        priority: '1',
        reason_required: 'false',
        active: 'true'
      },
      {
        name: 'Produce 5% Off',
        applies_to_type: 'category',
        applies_to_value: 'Produce',
        type: 'percent',
        value: '5.00',
        max_qty_or_weight: '',
        active_from: '',
        active_to: '',
        priority: '2',
        reason_required: 'false',
        active: 'true'
      }
    ];

    csvService.exportData(template, 'discount_rules_template.csv');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import Discount Rules</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="p-6">
            <div className="text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h3>
              <p className="text-gray-600 mb-6">
                Select a CSV file containing discount rules to import.
              </p>

              <div className="mb-6">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 mx-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Select CSV File
              </button>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">CSV Format Requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Headers: name, applies_to_type, applies_to_value, type, value, max_qty_or_weight, active_from, active_to, priority, reason_required, active</li>
                <li>• applies_to_type: "product" or "category"</li>
                <li>• applies_to_value: SKU for products, category name for categories</li>
                <li>• type: "percent" or "amount"</li>
                <li>• value: numeric value (percent: 0-100, amount: any positive number)</li>
                <li>• priority: integer (lower = higher priority)</li>
                <li>• reason_required, active: "true" or "false"</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Preview Import</h3>
              <div className="flex items-center space-x-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={autoCreateCategories}
                    onChange={(e) => setAutoCreateCategories(e.target.checked)}
                    className="mr-2"
                  />
                  Auto-create missing categories
                </label>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                <div className="text-sm text-blue-600">Total Rows</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.valid}</div>
                <div className="text-sm text-green-600">Valid</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{summary.warnings}</div>
                <div className="text-sm text-yellow-600">Warnings</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                <div className="text-sm text-red-600">Errors</div>
              </div>
            </div>

            {/* Validation Results */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {validationResults.map((result) => (
                    <tr key={result.row} className={`${getStatusColor(result.status)}`}>
                      <td className="px-4 py-3 text-sm text-gray-900">{result.row}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getStatusIcon(result.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{result.data.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {result.data.applies_to_type} - {result.data.applies_to_value}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{result.data.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{result.data.value}</td>
                      <td className="px-4 py-3 text-sm">
                        {result.errors.length > 0 && (
                          <div className="text-red-600">
                            {result.errors.map((error, idx) => (
                              <div key={idx} className="text-xs">{error}</div>
                            ))}
                          </div>
                        )}
                        {result.warnings.length > 0 && (
                          <div className="text-yellow-600">
                            {result.warnings.map((warning, idx) => (
                              <div key={idx} className="text-xs">{warning}</div>
                            ))}
                          </div>
                        )}
                        {result.errors.length === 0 && result.warnings.length === 0 && (
                          <span className="text-green-600 text-xs">✓ Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={summary.errors > 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {summary.valid + summary.warnings} Valid Rules
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="p-6 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Rules...</h3>
            <p className="text-gray-600">Please wait while we process your discount rules.</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete!</h3>
            <div className="text-gray-600 mb-6">
              <p>{summary.newRules} new rules created</p>
              <p>{summary.updatedRules} rules updated</p>
            </div>
            <button
              onClick={() => {
                onImport();
                onClose();
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
