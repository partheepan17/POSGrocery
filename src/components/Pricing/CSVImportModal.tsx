import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertTriangle, Check, FileText, Eye } from 'lucide-react';
import { Product } from '@/services/dataService';
import { csvService } from '@/services/csvService';
import { useAppStore } from '@/store/appStore';
import { downloadTemplate, getTemplateConfig } from '@/utils/templateDownloader';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (results: ImportResults) => void;
}

interface ImportRow {
  sku: string;
  price_retail: number;
  price_wholesale: number;
  price_credit: number;
  price_other: number;
  errors?: string[];
  warnings?: string[];
}

interface ImportResults {
  success: boolean;
  imported: number;
  updated: number;
  rejected: number;
  errors: string[];
  warnings: string[];
}

export function CSVImportModal({ isOpen, onClose, onImportComplete }: CSVImportModalProps) {
  const { settings } = useAppStore();
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep('upload');
      setFile(null);
      setParsedData([]);
      setImportResults(null);
    }
  }, [isOpen]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleFileUpload(selectedFile);
    }
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setIsUploading(true);
    
    try {
      // Parse the CSV file
      const data = await csvService.parseFile(uploadedFile);
      
      // Validate and transform the data
      const validatedData = validateAndTransformData(data);
      setParsedData(validatedData);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      alert('Failed to parse CSV file. Please check the format.');
    } finally {
      setIsUploading(false);
    }
  };

  const validateAndTransformData = (rawData: any[]): ImportRow[] => {
    const requiredHeaders = ['sku', 'price_retail', 'price_wholesale', 'price_credit', 'price_other'];
    
    return rawData.map((row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Validate SKU
      if (!row.sku || row.sku.trim() === '') {
        errors.push('SKU is required');
      }
      
      // Validate and transform prices
      const prices: Record<string, number> = {};
      const priceFields = ['price_retail', 'price_wholesale', 'price_credit', 'price_other'];
      const policy = settings.pricingSettings.missingPricePolicy;
      const requiredTiers = settings.pricingSettings.requiredTiers;
      
      priceFields.forEach(field => {
        const value = row[field];
        if (value === undefined || value === null || value === '') {
          prices[field] = 0;
          
          // Check if this tier is required based on settings
          const tierName = field.replace('price_', '') as 'retail' | 'wholesale' | 'credit' | 'other';
          if (requiredTiers.includes(tierName)) {
            if (policy === 'block') {
              errors.push(`Missing ${tierName} price is required`);
            } else {
              warnings.push(`Missing ${tierName} price (warning)`);
            }
          }
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push(`${field} must be a valid number`);
            prices[field] = 0;
          } else if (numValue < 0) {
            errors.push(`${field} cannot be negative`);
            prices[field] = 0;
          } else {
            prices[field] = numValue;
          }
        }
      });
      
      return {
        sku: row.sku?.trim() || '',
        price_retail: prices.price_retail,
        price_wholesale: prices.price_wholesale,
        price_credit: prices.price_credit,
        price_other: prices.price_other,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    });
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      let imported = 0;
      let updated = 0;
      let rejected = 0;
      const allErrors: string[] = [];
      const allWarnings: string[] = [];
      
      // Process each row
      for (const row of parsedData) {
        if (row.errors && row.errors.length > 0) {
          rejected++;
          allErrors.push(`SKU ${row.sku}: ${row.errors.join(', ')}`);
          continue;
        }
        
        if (row.warnings) {
          allWarnings.push(...row.warnings.map(w => `SKU ${row.sku}: ${w}`));
        }
        
        try {
          // Check if product exists (mock implementation)
          const existingProduct = await findProductBySKU(row.sku);
          
          if (existingProduct) {
            // Update existing product
            await updateProductPrices(existingProduct.id, {
              price_retail: row.price_retail,
              price_wholesale: row.price_wholesale,
              price_credit: row.price_credit,
              price_other: row.price_other
            });
            updated++;
          } else {
            rejected++;
            allErrors.push(`SKU ${row.sku}: Product not found`);
          }
        } catch (error) {
          rejected++;
          allErrors.push(`SKU ${row.sku}: Failed to update - ${error}`);
        }
      }
      
      const results: ImportResults = {
        success: rejected === 0,
        imported,
        updated,
        rejected,
        errors: allErrors,
        warnings: allWarnings
      };
      
      setImportResults(results);
      setCurrentStep('results');
      
      // Call the completion callback
      onImportComplete(results);
      
    } catch (error) {
      console.error('Import failed:', error);
      const errorResults: ImportResults = {
        success: false,
        imported: 0,
        updated: 0,
        rejected: parsedData.length,
        errors: ['Import failed: ' + (error as Error).message],
        warnings: []
      };
      setImportResults(errorResults);
      setCurrentStep('results');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock functions - in real implementation, these would call the actual data service
  const findProductBySKU = async (sku: string): Promise<Product | null> => {
    // Mock implementation - always return a product for demo
    return {
      id: Math.random(),
      sku,
      name_en: 'Mock Product',
      price_retail: 0,
      price_wholesale: 0,
      price_credit: 0,
      price_other: 0,
      unit: 'pc',
      category_id: 1,
      is_scale_item: false,
      is_active: true,
      created_at: new Date()
    } as Product;
  };

  const updateProductPrices = async (productId: number, prices: Record<string, number>) => {
    // Mock implementation - simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`Updating product ${productId} with prices:`, prices);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        sku: 'EXAMPLE001',
        price_retail: 100.00,
        price_wholesale: 90.00,
        price_credit: 105.00,
        price_other: 95.00
      }
    ];
    
    csvService.exportData(templateData, 'pricing_import_template.csv');
  };

  const getValidationSummary = () => {
    const valid = parsedData.filter(row => !row.errors || row.errors.length === 0);
    const invalid = parsedData.filter(row => row.errors && row.errors.length > 0);
    const withWarnings = parsedData.filter(row => row.warnings && row.warnings.length > 0);
    
    return { valid: valid.length, invalid: invalid.length, warnings: withWarnings.length };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Pricing Data</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a CSV file to update product prices in bulk
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload CSV File</h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? 'Processing...' : 'Choose File'}
                </button>
              </div>

              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-blue-900">Need a template?</h4>
                      <p className="text-sm text-blue-700">Download our CSV template with the correct format</p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadTemplate(getTemplateConfig('pricing'))}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </button>
                </div>
              </div>

              {/* Format Requirements */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">CSV Format Requirements:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Required Headers:</h5>
                    <ul className="space-y-1">
                      <li>• sku - Product SKU (required)</li>
                      <li>• price_retail - Retail price</li>
                      <li>• price_wholesale - Wholesale price</li>
                      <li>• price_credit - Credit price</li>
                      <li>• price_other - Other price</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Validation Rules:</h5>
                    <ul className="space-y-1">
                      <li>• All prices must be numbers ≥ 0</li>
                      <li>• Empty prices will be set to 0</li>
                      <li>• SKU must exist in the system</li>
                      <li>• Missing {settings.pricingSettings.requiredTiers.join(', ')} price(s) will be {settings.pricingSettings.missingPricePolicy === 'block' ? 'blocked' : 'warned'}</li>
                      {settings.pricingSettings.autoCreateCategories && <li>• Unknown categories will be auto-created</li>}
                      {settings.pricingSettings.autoCreateSuppliers && <li>• Unknown suppliers will be auto-created</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Preview Import</h3>
                  <p className="text-sm text-gray-600">
                    Review the data before importing. {parsedData.length} rows found.
                  </p>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  {(() => {
                    const summary = getValidationSummary();
                    return (
                      <>
                        <span className="flex items-center text-green-600">
                          <Check className="w-4 h-4 mr-1" />
                          {summary.valid} valid
                        </span>
                        {summary.warnings > 0 && (
                          <span className="flex items-center text-yellow-600">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            {summary.warnings} warnings
                          </span>
                        )}
                        {summary.invalid > 0 && (
                          <span className="flex items-center text-red-600">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            {summary.invalid} errors
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retail</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Other</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.slice(0, 50).map((row, index) => (
                        <tr key={index} className={row.errors ? 'bg-red-50' : row.warnings ? 'bg-yellow-50' : ''}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.sku}</td>
                          <td className="px-4 py-3 text-sm">රු {row.price_retail.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">රු {row.price_wholesale.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">රු {row.price_credit.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">රු {row.price_other.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">
                            {row.errors ? (
                              <span className="flex items-center text-red-600">
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Error
                              </span>
                            ) : row.warnings ? (
                              <span className="flex items-center text-yellow-600">
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Warning
                              </span>
                            ) : (
                              <span className="flex items-center text-green-600">
                                <Check className="w-4 h-4 mr-1" />
                                Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 50 && (
                  <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 text-center">
                    ... and {parsedData.length - 50} more rows
                  </div>
                )}
              </div>

              {/* Error/Warning Details */}
              {parsedData.some(row => row.errors || row.warnings) && (
                <div className="space-y-4">
                  {parsedData.filter(row => row.errors).length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                      <div className="space-y-1 text-sm text-red-700">
                        {parsedData.filter(row => row.errors).slice(0, 5).map((row, index) => (
                          <div key={index}>
                            <strong>SKU {row.sku}:</strong> {row.errors?.join(', ')}
                          </div>
                        ))}
                        {parsedData.filter(row => row.errors).length > 5 && (
                          <div>... and {parsedData.filter(row => row.errors).length - 5} more errors</div>
                        )}
                      </div>
                    </div>
                  )}

                  {parsedData.filter(row => row.warnings).length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2">Warnings:</h4>
                      <div className="space-y-1 text-sm text-yellow-700">
                        {parsedData.filter(row => row.warnings).slice(0, 5).map((row, index) => (
                          <div key={index}>
                            <strong>SKU {row.sku}:</strong> {row.warnings?.join(', ')}
                          </div>
                        ))}
                        {parsedData.filter(row => row.warnings).length > 5 && (
                          <div>... and {parsedData.filter(row => row.warnings).length - 5} more warnings</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 'results' && importResults && (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg ${importResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center">
                  {importResults.success ? (
                    <Check className="w-8 h-8 text-green-600 mr-3" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
                  )}
                  <div>
                    <h3 className={`text-lg font-semibold ${importResults.success ? 'text-green-900' : 'text-red-900'}`}>
                      {importResults.success ? 'Import Completed Successfully!' : 'Import Completed with Issues'}
                    </h3>
                    <p className={`text-sm ${importResults.success ? 'text-green-700' : 'text-red-700'}`}>
                      {importResults.success 
                        ? 'All pricing data has been updated successfully.'
                        : 'Some items could not be imported. Please review the errors below.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-900">{importResults.imported}</div>
                  <div className="text-sm text-blue-700">New Products</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-900">{importResults.updated}</div>
                  <div className="text-sm text-green-700">Updated Products</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-900">{importResults.rejected}</div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
              </div>

              {/* Error Details */}
              {importResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-3">Errors:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importResults.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700">{error}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Details */}
              {importResults.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-3">Warnings:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importResults.warnings.map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-700">{warning}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {currentStep === 'preview' && (
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
            )}
            {currentStep === 'results' && (
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Import More
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {currentStep === 'results' ? 'Close' : 'Cancel'}
            </button>
            
            {currentStep === 'preview' && (
              <button
                onClick={handleImport}
                disabled={isProcessing || parsedData.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Import {parsedData.length} Products</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
