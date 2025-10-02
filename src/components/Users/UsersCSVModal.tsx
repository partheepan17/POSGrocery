/**
 * Users CSV Import Modal
 * Import users from CSV with validation and preview
 */

import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { csvService } from '@/services/csvService';
import { userService, UserCSVImportRow } from '@/services/userService';
import { auditService } from '@/services/auditService';
import { Role } from '@/security/permissions';

interface UsersCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportPreviewRow {
  index: number;
  data: UserCSVImportRow;
  status: 'new' | 'update' | 'error';
  errors: string[];
  existing?: boolean;
}

const UsersCSVModal: React.FC<UsersCSVModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{
    created: number;
    updated: number;
    errors: number;
  }>({ created: 0, updated: 0, errors: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setFile(null);
      setPreviewData([]);
      setResults({ created: 0, updated: 0, errors: 0 });
    }
  }, [isOpen]);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const parseAndPreview = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const { data, errors: parseErrors } = await csvService.parseUsersCSV(file);
      
      // Get existing users to check for updates
      const existingUsers = await userService.listUsers();
      const existingUserNames = new Set(existingUsers.map(u => u.name.toLowerCase()));

      const preview: ImportPreviewRow[] = [];

      // Process each row
      data.forEach((row, index) => {
        const validation = userService.validateCSVRow(row, index);
        const isExisting = existingUserNames.has(row.name?.toLowerCase());
        
        preview.push({
          index: index + 1,
          data: row,
          status: validation.valid ? (isExisting ? 'update' : 'new') : 'error',
          errors: validation.errors,
          existing: isExisting
        });
      });

      // Add parse errors
      parseErrors.forEach(error => {
        preview.push({
          index: error.row,
          data: { name: '', role: '', active: '' },
          status: 'error',
          errors: [error.error],
          existing: false
        });
      });

      setPreviewData(preview);
      setStep('preview');

    } catch (error) {
      console.error('Failed to parse CSV:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setProcessing(false);
    }
  };

  const processImport = async () => {
    setProcessing(true);
    const results = { created: 0, updated: 0, errors: 0 };

    try {
      const validRows = previewData.filter(row => row.status !== 'error');

      for (const row of validRows) {
        try {
          const userData = {
            name: row.data.name.trim(),
            role: row.data.role as Role,
            active: parseActive(row.data.active),
            pin: row.data.pin || undefined
          };

          if (row.existing) {
            // Find existing user and update
            const existingUsers = await userService.listUsers({ search: userData.name });
            const existingUser = existingUsers.find(u => 
              u.name.toLowerCase() === userData.name.toLowerCase()
            );

            if (existingUser) {
              await userService.updateUser(existingUser.id, {
                role: userData.role,
                active: userData.active
              });

              // Set PIN if provided
              if (userData.pin) {
                await userService.setPin(existingUser.id, userData.pin);
              }

              results.updated++;
            }
          } else {
            // Create new user
            await userService.createUser(userData);
            results.created++;
          }

        } catch (error) {
          console.error(`Failed to process row ${row.index}:`, error);
          results.errors++;
        }
      }

      // Log import action
      await auditService.log({
        action: 'USERS_CSV_IMPORT',
        payload: {
          file_name: file?.name,
          total_rows: previewData.length,
          created: results.created,
          updated: results.updated,
          errors: results.errors
        }
      });

      setResults(results);
      setStep('processing');

      if (results.created > 0 || results.updated > 0) {
        toast.success(`Import completed: ${results.created} created, ${results.updated} updated`);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }

    } catch (error) {
      console.error('Failed to process import:', error);
      toast.error('Failed to process import');
    } finally {
      setProcessing(false);
    }
  };

  const parseActive = (value: string | boolean): boolean => {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase();
    return str === 'true' || str === '1';
  };

  const downloadTemplate = () => {
    const template = 'name,role,active,pin\nJohn Doe,CASHIER,true,1234\nJane Smith,MANAGER,true,5678';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const validRows = previewData.filter(row => row.status !== 'error').length;
  const errorRows = previewData.filter(row => row.status === 'error').length;
  const newRows = previewData.filter(row => row.status === 'new').length;
  const updateRows = previewData.filter(row => row.status === 'update').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl mx-4 border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Import Users from CSV
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {step === 'upload' && 'Upload a CSV file to import users'}
                {step === 'preview' && 'Review and confirm the import'}
                {step === 'processing' && 'Import completed'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                      CSV Format Requirements
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                      Your CSV file must have these exact headers: <code>name,role,active,pin</code>
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Drop your CSV file here
                </p>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  or click to browse
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Select File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {file && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={parseAndPreview}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      {processing ? 'Processing...' : 'Preview Import'}
                    </button>
                  </div>
                </div>
              )}

              {/* Format Guidelines */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Format Guidelines:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <strong>name:</strong> Required. User's full name</li>
                  <li>• <strong>role:</strong> Required. Must be CASHIER, MANAGER, ADMIN, or AUDITOR</li>
                  <li>• <strong>active:</strong> Optional. true/false or 1/0 (default: true)</li>
                  <li>• <strong>pin:</strong> Optional. 4-6 digits for login</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Total Rows</p>
                      <p className="text-xl font-bold text-blue-900 dark:text-blue-300">{previewData.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400">New Users</p>
                      <p className="text-xl font-bold text-green-900 dark:text-green-300">{newRows}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm text-amber-600 dark:text-amber-400">Updates</p>
                      <p className="text-xl font-bold text-amber-900 dark:text-amber-300">{updateRows}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm text-red-600 dark:text-red-400">Errors</p>
                      <p className="text-xl font-bold text-red-900 dark:text-red-300">{errorRows}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Row</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Active</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">PIN</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {previewData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.index}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.data.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.data.role}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {String(row.data.active)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {row.data.pin ? '••••' : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {row.status === 'new' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                                <CheckCircle className="w-3 h-3" />
                                New
                              </span>
                            )}
                            {row.status === 'update' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
                                <AlertTriangle className="w-3 h-3" />
                                Update
                              </span>
                            )}
                            {row.status === 'error' && (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                                  <XCircle className="w-3 h-3" />
                                  Error
                                </span>
                                {row.errors.length > 0 && (
                                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                                    {row.errors.join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Import Completed!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your users have been successfully imported.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{results.created}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{results.updated}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Updated</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{results.errors}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            {step === 'preview' && errorRows > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {errorRows} rows have errors and will be skipped
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            {step !== 'processing' && (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
            
            {step === 'upload' && file && (
              <button
                onClick={parseAndPreview}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {processing ? 'Processing...' : 'Preview Import'}
              </button>
            )}
            
            {step === 'preview' && (
              <button
                onClick={processImport}
                disabled={processing || validRows === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {processing ? 'Importing...' : `Import ${validRows} Users`}
              </button>
            )}
            
            {step === 'processing' && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersCSVModal;


