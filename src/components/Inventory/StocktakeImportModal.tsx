import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { inventoryService, StocktakeDiff } from '@/services/inventoryService';
import { csvService } from '@/services/csvService';
import { useAppStore } from '@/store/appStore';

interface StocktakeImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'applying';

export function StocktakeImportModal({ onClose, onSuccess }: StocktakeImportModalProps) {
  const { settings } = useAppStore();
  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<{
    okRows: { sku: string; counted_qty: number; note?: string }[];
    errorRows: { row: number; error: string; data: any }[];
    totals: { total: number; valid: number; errors: number };
  } | null>(null);
  const [differences, setDifferences] = useState<StocktakeDiff[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFileName(file.name);
    setLoading(true);

    try {
      const text = await file.text();
      setCsvData(text);
      
      // Parse CSV
      const result = await csvService.importStocktakeCounts(text);
      setParseResult(result);
      
      if (result.okRows.length > 0) {
        // Calculate differences
        const diffs = await inventoryService.calculateStocktakeDifferences(result.okRows);
        setDifferences(diffs);
        setStep('preview');
      } else {
        alert('No valid rows found in the CSV file');
      }
      
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      alert(error instanceof Error ? error.message : 'Failed to parse CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChanges = async () => {
    const validDiffs = differences.filter(diff => diff.delta !== 0);
    
    if (validDiffs.length === 0) {
      alert('No changes to apply - all counted quantities match current stock');
      return;
    }

    setStep('applying');
    setLoading(true);

    try {
      await inventoryService.applyStocktakeDifferences(validDiffs, {
        terminal: 'WEB-STOCKTAKE',
        cashier: 'SYSTEM' // In real app, would use current user
      });

      // Show success message
      console.log(`✅ Stocktake applied: ${validDiffs.length} adjustments made`);
      onSuccess();
      
    } catch (error) {
      console.error('Failed to apply stocktake:', error);
      alert(error instanceof Error ? error.message : 'Failed to apply stocktake changes');
      setStep('preview'); // Go back to preview on error
    } finally {
      setLoading(false);
    }
  };

  const formatQuantity = (qty: number, unit: string): string => {
    if (unit === 'pc') {
      return Math.floor(qty).toString();
    } else {
      const decimals = settings?.languageFormatting?.kgDecimals || 3;
      return qty.toFixed(decimals);
    }
  };

  const getSummaryStats = () => {
    const increases = differences.filter(d => d.delta > 0);
    const decreases = differences.filter(d => d.delta < 0);
    const noChanges = differences.filter(d => d.delta === 0);
    
    return {
      total: differences.length,
      increases: increases.length,
      decreases: decreases.length,
      noChanges: noChanges.length,
      totalIncrease: increases.reduce((sum, d) => sum + d.delta, 0),
      totalDecrease: Math.abs(decreases.reduce((sum, d) => sum + d.delta, 0))
    };
  };

  const renderUploadStep = () => (
    <div className="p-6 text-center">
      <div className="mb-6">
        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Import Stocktake Counts</h3>
        <p className="text-sm text-gray-600">
          Upload a CSV file with your counted inventory quantities
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
        <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Required columns: <code>sku</code>, <code>counted_qty</code></li>
          <li>• Optional column: <code>note</code></li>
          <li>• First row must be headers</li>
          <li>• SKUs must match existing products</li>
          <li>• Quantities must be non-negative numbers</li>
        </ul>
      </div>

      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload className="w-5 h-5 mr-2" />
          {loading ? 'Processing...' : 'Choose CSV File'}
        </button>

        {fileName && (
          <p className="text-sm text-gray-600">
            Selected: {fileName}
          </p>
        )}
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    const stats = getSummaryStats();
    
    return (
      <div className="flex flex-col h-full">
        {/* Summary */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Stocktake Preview</h3>
          
          {parseResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Valid Rows</p>
                    <p className="text-lg font-bold text-green-600">{parseResult.totals.valid}</p>
                  </div>
                </div>
              </div>
              
              {parseResult.totals.errors > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Errors</p>
                      <p className="text-lg font-bold text-red-600">{parseResult.totals.errors}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Changes</p>
                    <p className="text-lg font-bold text-blue-600">
                      {stats.increases + stats.decreases}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-500">No Change</p>
              <p className="font-medium">{stats.noChanges}</p>
            </div>
            <div className="text-center text-green-600">
              <p>Increases</p>
              <p className="font-medium">{stats.increases}</p>
            </div>
            <div className="text-center text-red-600">
              <p>Decreases</p>
              <p className="font-medium">{stats.decreases}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Total Items</p>
              <p className="font-medium">{stats.total}</p>
            </div>
          </div>
        </div>

        {/* Errors */}
        {parseResult && parseResult.errorRows.length > 0 && (
          <div className="px-6 py-4 bg-red-50 border-b border-gray-200">
            <h4 className="font-medium text-red-900 mb-2">Errors Found:</h4>
            <div className="max-h-24 overflow-y-auto">
              {parseResult.errorRows.map((error, index) => (
                <p key={index} className="text-sm text-red-800">
                  Row {error.row}: {error.error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Differences Table */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Counted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {differences.map((diff, index) => (
                <tr key={index} className={`hover:bg-gray-50 ${diff.delta === 0 ? 'text-gray-500' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {diff.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {diff.name_en}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {diff.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatQuantity(diff.current_stock, diff.unit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatQuantity(diff.counted_qty, diff.unit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {diff.delta === 0 ? (
                      <span className="text-gray-500">No change</span>
                    ) : (
                      <div className={`flex items-center ${diff.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff.delta > 0 ? (
                          <TrendingUp className="w-4 h-4 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 mr-1" />
                        )}
                        <span>
                          {diff.delta > 0 ? '+' : ''}{formatQuantity(diff.delta, diff.unit)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {diff.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {differences.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">No differences found</h3>
              <p className="text-sm">All counted quantities match current stock</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderApplyingStep = () => (
    <div className="p-6 text-center">
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Applying Stocktake Changes</h3>
        <p className="text-sm text-gray-600">
          Please wait while we update your inventory...
        </p>
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'upload': return 'Upload CSV File';
      case 'preview': return 'Review Changes';
      case 'applying': return 'Applying Changes';
      default: return 'Import Stocktake';
    }
  };

  const stats = differences.length > 0 ? getSummaryStats() : null;
  const hasChanges = stats && (stats.increases + stats.decreases) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
              <p className="text-sm text-gray-600">
                {step === 'upload' && 'Import counted quantities from CSV'}
                {step === 'preview' && 'Review and confirm inventory adjustments'}
                {step === 'applying' && 'Processing inventory updates'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={step === 'applying'}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4 text-sm">
            <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                step === 'upload' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                1
              </div>
              Upload
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className={`flex items-center ${
              step === 'preview' ? 'text-blue-600' : 
              step === 'applying' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                step === 'preview' ? 'bg-blue-100 text-blue-600' : 
                step === 'applying' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                2
              </div>
              Review
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className={`flex items-center ${step === 'applying' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                step === 'applying' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                3
              </div>
              Apply
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'applying' && renderApplyingStep()}
        </div>

        {/* Footer */}
        {step !== 'applying' && (
          <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {step === 'upload' && (
                <p>Upload a CSV file with SKU and counted_qty columns</p>
              )}
              {step === 'preview' && stats && (
                <p>
                  {hasChanges 
                    ? `Ready to apply ${stats.increases + stats.decreases} changes (${stats.increases} increases, ${stats.decreases} decreases)`
                    : 'No changes needed - all counts match current stock'
                  }
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              {step === 'preview' && (
                <>
                  <button
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleApplyChanges}
                    disabled={!hasChanges || loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {hasChanges ? `Apply ${stats!.increases + stats!.decreases} Changes` : 'No Changes to Apply'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








