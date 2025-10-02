import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, CheckCircle, FileText, Download } from 'lucide-react';
import { LabelItem } from '@/types';
import { csvService } from '@/services/csvService';
import { cn } from '@/utils/cn';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: LabelItem[]) => void;
}

export function CSVImportModal({ isOpen, onClose, onImport }: CSVImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    items: LabelItem[];
    errors: Array<{ row: number; error: string; data: any }>;
    warnings: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    processFile(selectedFile);
  };

  const processFile = async (file: File) => {
    try {
      setImporting(true);
      const result = await csvService.importLabelsCSV(file);
      setImportResult(result);
      setStep('preview');
    } catch (error) {
      console.error('Failed to process CSV:', error);
      alert(error instanceof Error ? error.message : 'Failed to process CSV file');
    } finally {
      setImporting(false);
    }
  };

  const handleImport = () => {
    if (importResult && importResult.items.length > 0) {
      onImport(importResult.items);
      setStep('complete');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setImportResult(null);
    onClose();
  };

  const downloadTemplate = () => {
    const templateData = `barcode,sku,qty,price_tier,language,custom_line1,custom_line2
123456789012,ITEM001,2,retail,EN,,
,ITEM002,1,wholesale,SI,,
987654321098,ITEM003,5,retail,TA,"Custom Name","Size: Large"`;
    
    const blob = new Blob([templateData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'label_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Import Labels from CSV
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === 'upload' && (
            <UploadStep
              file={file}
              importing={importing}
              onFileSelect={handleFileSelect}
              onDownloadTemplate={downloadTemplate}
              fileInputRef={fileInputRef}
            />
          )}

          {step === 'preview' && importResult && (
            <PreviewStep
              result={importResult}
              onImport={handleImport}
              onBack={() => setStep('upload')}
            />
          )}

          {step === 'complete' && importResult && (
            <CompleteStep
              result={importResult}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface UploadStepProps {
  file: File | null;
  importing: boolean;
  onFileSelect: (file: File) => void;
  onDownloadTemplate: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

function UploadStep({ file, importing, onFileSelect, onDownloadTemplate, fileInputRef }: UploadStepProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      onFileSelect(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Must contain either <code className="bg-blue-100 px-1 rounded">barcode</code> or <code className="bg-blue-100 px-1 rounded">sku</code> column</li>
          <li>• Optional columns: <code className="bg-blue-100 px-1 rounded">qty</code>, <code className="bg-blue-100 px-1 rounded">price_tier</code>, <code className="bg-blue-100 px-1 rounded">language</code>, <code className="bg-blue-100 px-1 rounded">custom_line1</code>, <code className="bg-blue-100 px-1 rounded">custom_line2</code></li>
          <li>• Products must exist in your database to be imported</li>
          <li>• Price tier: retail, wholesale, credit, other (default: retail)</li>
          <li>• Language: EN, SI, TA (default: EN)</li>
        </ul>
      </div>

      {/* Template Download */}
      <div className="flex justify-center">
        <button
          onClick={onDownloadTemplate}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </button>
      </div>

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          importing 
            ? "border-blue-300 bg-blue-50" 
            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {importing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-blue-700 font-medium">Processing file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-lg font-medium text-gray-900 mb-1">
              {file ? file.name : 'Drop CSV file here or click to browse'}
            </p>
            <p className="text-sm text-gray-500">
              Supports CSV files up to 10MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface PreviewStepProps {
  result: {
    items: LabelItem[];
    errors: Array<{ row: number; error: string; data: any }>;
    warnings: string[];
  };
  onImport: () => void;
  onBack: () => void;
}

function PreviewStep({ result, onImport, onBack }: PreviewStepProps) {
  const { items, errors, warnings } = result;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{items.length}</div>
          <div className="text-sm text-green-600">Valid Items</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{errors.length}</div>
          <div className="text-sm text-red-600">Errors</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-700">{warnings.length}</div>
          <div className="text-sm text-yellow-600">Warnings</div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="flex items-center font-medium text-red-900 mb-3">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Errors ({errors.length})
          </h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {errors.slice(0, 10).map((error, index) => (
              <div key={index} className="text-sm text-red-800">
                Row {error.row}: {error.error}
              </div>
            ))}
            {errors.length > 10 && (
              <div className="text-sm text-red-600 italic">
                ...and {errors.length - 10} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="flex items-center font-medium text-yellow-900 mb-3">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Warnings ({warnings.length})
          </h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {warnings.map((warning, index) => (
              <div key={index} className="text-sm text-yellow-800">
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valid Items Preview */}
      {items.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="flex items-center font-medium text-green-900 mb-3">
            <CheckCircle className="w-5 h-5 mr-2" />
            Valid Items Preview ({items.length})
          </h4>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-green-100">
                <tr>
                  <th className="text-left p-2 font-medium text-green-900">SKU</th>
                  <th className="text-left p-2 font-medium text-green-900">Name</th>
                  <th className="text-left p-2 font-medium text-green-900">Qty</th>
                  <th className="text-left p-2 font-medium text-green-900">Price Tier</th>
                  <th className="text-left p-2 font-medium text-green-900">Language</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 10).map((item, index) => (
                  <tr key={index} className="border-t border-green-200">
                    <td className="p-2 text-green-800 font-mono">{item.sku}</td>
                    <td className="p-2 text-green-800">{item.name_en}</td>
                    <td className="p-2 text-green-800">{item.qty}</td>
                    <td className="p-2 text-green-800">{item.price_tier}</td>
                    <td className="p-2 text-green-800">{item.language}</td>
                  </tr>
                ))}
                {items.length > 10 && (
                  <tr>
                    <td colSpan={5} className="p-2 text-green-600 italic text-center">
                      ...and {items.length - 10} more items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        
        <button
          onClick={onImport}
          disabled={items.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Import {items.length} Item{items.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

interface CompleteStepProps {
  result: {
    items: LabelItem[];
    errors: Array<{ row: number; error: string; data: any }>;
    warnings: string[];
  };
  onClose: () => void;
}

function CompleteStep({ result, onClose }: CompleteStepProps) {
  const { items } = result;

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <CheckCircle className="w-16 h-16 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Import Successful!
        </h3>
        <p className="text-gray-600">
          {items.length} label item{items.length !== 1 ? 's have' : ' has'} been added to your batch.
        </p>
      </div>

      <button
        onClick={onClose}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
