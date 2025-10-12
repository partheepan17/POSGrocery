import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { csvService } from '@/services/csvService';
import { dataService, Category, Supplier } from '@/services/dataService';
import { downloadTemplate, getTemplateConfig } from '@/utils/templateDownloader';

interface CSVImportModalProps {
  categories: Category[];
  suppliers: Supplier[];
  onClose: () => void;
  onImport: () => void;
}

interface ImportRow {
  row: number;
  data: any;
  status: 'new' | 'updated' | 'error' | 'skipped';
  errors: string[];
  existingProduct?: any;
}

interface ImportPreview {
  rows: ImportRow[];
  summary: {
    total: number;
    new: number;
    updated: number;
    errors: number;
    skipped: number;
  };
}

const CSV_HEADERS = [
  'sku',
  'barcode',
  'alias_barcodes',
  'name_en',
  'name_si',
  'name_ta',
  'unit',
  'category',
  'price_retail',
  'price_wholesale',
  'price_credit',
  'price_other',
  'tax_code',
  'shelf_location',
  'reorder_level',
  'preferred_supplier',
  'is_scale_item',
  'is_active'
];

export function CSVImportModal({ categories, suppliers, onClose, onImport }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [autoCreateMissing, setAutoCreateMissing] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setPreview(null);

    try {
      const csvData = await csvService.parseFile(selectedFile);
      const previewData = await generateImportPreview(csvData);
      setPreview(previewData);
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      toast.error(`Failed to parse CSV: ${(error as Error).message}`);
    }
  };

  const generateImportPreview = async (csvData: any[]): Promise<ImportPreview> => {
    const rows: ImportRow[] = [];
    let newCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < csvData.length; i++) {
      const rowData = csvData[i];
      const row: ImportRow = {
        row: i + 2, // +2 because CSV is 1-indexed and we skip header
        data: rowData,
        status: 'error',
        errors: []
      };

      // Validate required fields
      if (!rowData.sku) {
        row.errors.push('SKU is required');
      }
      if (!rowData.name_en) {
        row.errors.push('English name is required');
      }
      if (!rowData.unit || !['pc', 'kg'].includes(rowData.unit)) {
        row.errors.push('Unit must be pc or kg');
      }
      if (!rowData.category) {
        row.errors.push('Category is required');
      }

      // Validate numeric fields
      const numericFields = ['price_retail', 'price_wholesale', 'price_credit', 'price_other', 'reorder_level'];
      for (const field of numericFields) {
        if (rowData[field] && isNaN(parseFloat(rowData[field]))) {
          row.errors.push(`${field} must be a valid number`);
        }
      }

      // Validate boolean fields
      const booleanFields = ['is_scale_item', 'is_active'];
      for (const field of booleanFields) {
        if (rowData[field] && !['true', 'false', '1', '0'].includes(rowData[field].toLowerCase())) {
          row.errors.push(`${field} must be true/false or 1/0`);
        }
      }

      // Check if category exists
      if (rowData.category && !categories.find(c => c.name.toLowerCase() === rowData.category.toLowerCase())) {
        if (autoCreateMissing) {
          // Will create category during import
        } else {
          row.errors.push(`Category "${rowData.category}" not found`);
        }
      }

      // Check if supplier exists
      if (rowData.preferred_supplier && !suppliers.find(s => s.supplier_name.toLowerCase() === rowData.preferred_supplier.toLowerCase())) {
        if (autoCreateMissing) {
          // Will create supplier during import
        } else {
          row.errors.push(`Supplier "${rowData.preferred_supplier}" not found`);
        }
      }

      if (row.errors.length > 0) {
        row.status = 'error';
        errorCount++;
      } else {
        // Check if product exists
        try {
          const existingProduct = await dataService.getProductBySku(rowData.sku);
          if (existingProduct) {
            row.status = 'updated';
            row.existingProduct = existingProduct;
            updatedCount++;
          } else {
            row.status = 'new';
            newCount++;
          }
        } catch (error) {
          // Product doesn't exist, so it's new
          row.status = 'new';
          newCount++;
        }
      }

      rows.push(row);
    }

    return {
      rows,
      summary: {
        total: csvData.length,
        new: newCount,
        updated: updatedCount,
        errors: errorCount,
        skipped: skippedCount
      }
    };
  };

  const handleImport = async () => {
    if (!preview) return;

    setImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const row of preview.rows) {
        if (row.status === 'error') {
          errorCount++;
          continue;
        }

        try {
          const productData = {
            sku: row.data.sku,
            barcode: row.data.barcode || '',
            name_en: row.data.name_en,
            name_si: row.data.name_si || '',
            name_ta: row.data.name_ta || '',
            unit: row.data.unit,
            category_id: parseInt(await resolveCategoryId(row.data.category)),
            price_retail: parseFloat(row.data.price_retail) || 0,
            price_wholesale: parseFloat(row.data.price_wholesale) || 0,
            price_credit: parseFloat(row.data.price_credit) || 0,
            price_other: parseFloat(row.data.price_other) || 0,
            tax_code: row.data.tax_code || '',
            reorder_level: parseInt(row.data.reorder_level) || 0,
            preferred_supplier_id: row.data.preferred_supplier ? parseInt(await resolveSupplierId(row.data.preferred_supplier)) : undefined,
            is_scale_item: ['true', '1'].includes(row.data.is_scale_item?.toLowerCase() || 'false'),
            is_active: ['true', '1'].includes(row.data.is_active?.toLowerCase() || 'true')
          };

          if (row.status === 'new') {
            await dataService.createProduct(productData);
          } else {
            await dataService.updateProduct(row.existingProduct!.id, productData);
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to import row ${row.row}:`, error);
          errorCount++;
        }
      }

      toast.success(`Import completed: ${successCount} products imported, ${errorCount} errors`);
      onImport();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(`Import failed: ${(error as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  const resolveCategoryId = async (categoryName: string): Promise<string> => {
    let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    
    if (!category && autoCreateMissing) {
      // Create new category
      category = await dataService.createCategory({ name: categoryName });
    }

    if (!category) {
      throw new Error(`Category "${categoryName}" not found`);
    }

    return category.id.toString();
  };

  const resolveSupplierId = async (supplierName: string): Promise<string> => {
    let supplier = suppliers.find(s => s.supplier_name.toLowerCase() === supplierName.toLowerCase());
    
    if (!supplier && autoCreateMissing) {
      // Create new supplier
      supplier = await dataService.createSupplier({
        supplier_name: supplierName,
        contact_phone: '',
        contact_email: '',
        address: '',
        tax_id: '',
        active: true
      });
    }

    if (!supplier) {
      throw new Error(`Supplier "${supplierName}" not found`);
    }

    return supplier.id.toString();
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        sku: 'PROD001',
        barcode: '1234567890123',
        alias_barcodes: '1234567890124,1234567890125',
        name_en: 'Sample Product 1',
        name_si: 'නියමුනු නිෂ්පාදන 1',
        name_ta: 'மாதிரி தயாரிப்பு 1',
        unit: 'pc',
        category: 'Electronics',
        price_retail: '100.00',
        price_wholesale: '85.00',
        price_credit: '95.00',
        price_other: '90.00',
        tax_code: 'VAT',
        shelf_location: 'A1-B2',
        reorder_level: '10',
        preferred_supplier: 'ABC Suppliers Ltd',
        is_scale_item: 'false',
        is_active: 'true'
      },
      {
        sku: 'PROD002',
        barcode: '1234567890126',
        alias_barcodes: '',
        name_en: 'Sample Product 2',
        name_si: 'නියමුනු නිෂ්පාදන 2',
        name_ta: 'மாதிரி தயாரிப்பு 2',
        unit: 'kg',
        category: 'Food & Beverages',
        price_retail: '50.00',
        price_wholesale: '42.50',
        price_credit: '47.50',
        price_other: '45.00',
        tax_code: 'VAT',
        shelf_location: 'B1-C3',
        reorder_level: '25',
        preferred_supplier: 'XYZ Trading Co',
        is_scale_item: 'true',
        is_active: 'true'
      }
    ];

    csvService.exportData(templateData, 'products_template.csv');
    toast.success('Template downloaded');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'updated':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import Products from CSV</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!file ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Upload CSV File</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a CSV file with product data to import
                </p>
              </div>

              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    Browse files
                  </button>
                  <p className="text-xs text-gray-500">
                    CSV files only
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Required CSV Headers:</h4>
                <div className="text-sm text-blue-800">
                  <p className="mb-2">Your CSV must include these exact column headers:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {CSV_HEADERS.map(header => (
                      <code key={header} className="bg-blue-100 px-2 py-1 rounded text-xs">
                        {header}
                      </code>
                    ))}
                  </div>
                  <button
                    onClick={() => downloadTemplate(getTemplateConfig('products'))}
                    className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template (.csv)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Change File
                </button>
              </div>

              {preview && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{preview.summary.new}</div>
                      <div className="text-sm text-green-800">New Products</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{preview.summary.updated}</div>
                      <div className="text-sm text-blue-800">Updated Products</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{preview.summary.errors}</div>
                      <div className="text-sm text-red-800">Errors</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{preview.summary.total}</div>
                      <div className="text-sm text-gray-800">Total Rows</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoCreateMissing"
                      checked={autoCreateMissing}
                      onChange={(e) => setAutoCreateMissing(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="autoCreateMissing" className="text-sm text-gray-700">
                      Auto-create missing categories and suppliers
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900">Import Preview</h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {preview.rows.slice(0, 50).map((row) => (
                        <div key={row.row} className="flex items-center space-x-3 px-4 py-2 border-b border-gray-100">
                          <div className="flex-shrink-0">
                            {getStatusIcon(row.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                Row {row.row}: {row.data.sku || 'No SKU'}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(row.status)}`}>
                                {row.status}
                              </span>
                            </div>
                            {row.errors.length > 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                {row.errors.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {preview.rows.length > 50 && (
                        <div className="px-4 py-2 text-sm text-gray-500 text-center">
                          ... and {preview.rows.length - 50} more rows
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {preview && (
          <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || preview.summary.errors > 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${preview.summary.new + preview.summary.updated} Products`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
