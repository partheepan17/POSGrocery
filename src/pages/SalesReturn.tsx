/**
 * Sales Return Form
 * Minimal form for processing sales returns and updating stock
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { toast } from 'react-hot-toast';

interface SaleLine {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  unit_cost?: number;
}

interface Sale {
  id: number;
  receipt_number: string;
  sale_date: string;
  customer_name?: string;
  total_amount: number;
  lines: SaleLine[];
}

interface ReturnLine {
  id: string;
  sale_line_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  max_quantity: number;
  return_quantity: number;
  unit_price: number;
  unit_cost: number;
  total_amount: number;
  reason: string;
}

interface ReturnFormData {
  original_receipt: string;
  sale: Sale | null;
  customer_id?: number;
  notes: string;
  lines: ReturnLine[];
}

export function SalesReturn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const [formData, setFormData] = useState<ReturnFormData>({
    original_receipt: '',
    sale: null,
    customer_id: undefined,
    notes: '',
    lines: []
  });

  const searchSale = async () => {
    if (!formData.original_receipt.trim()) {
      toast.error('Please enter receipt number');
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/sales/receipt/${formData.original_receipt.trim()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Receipt not found');
          return;
        }
        throw new Error('Failed to search sale');
      }

      const sale = await response.json();
      
      if (!sale.success || !sale.sale) {
        toast.error('Receipt not found');
        return;
      }

      // Convert sale lines to return lines
      const returnLines: ReturnLine[] = sale.sale.lines.map((line: SaleLine) => ({
        id: `return_${line.id}`,
        sale_line_id: line.id,
        product_id: line.product_id,
        product_name: line.product_name,
        product_sku: line.product_sku,
        max_quantity: line.quantity,
        return_quantity: 0,
        unit_price: line.unit_price,
        unit_cost: line.unit_cost || 0,
        total_amount: 0,
        reason: ''
      }));

      setFormData(prev => ({
        ...prev,
        sale: sale.sale,
        customer_id: sale.sale.customer_id,
        lines: returnLines
      }));

      toast.success('Sale found successfully');
    } catch (error) {
      console.error('Failed to search sale:', error);
      toast.error('Failed to search sale');
    } finally {
      setSearching(false);
    }
  };

  const updateReturnLine = (lineId: string, field: keyof ReturnLine, value: any) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map(line => {
        if (line.id === lineId) {
          const updatedLine = { ...line, [field]: value };
          
          // Recalculate total amount
          if (field === 'return_quantity') {
            updatedLine.total_amount = updatedLine.return_quantity * updatedLine.unit_price;
          }
          
          return updatedLine;
        }
        return line;
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sale) {
      toast.error('Please search for a sale first');
      return;
    }

    const returnLines = formData.lines.filter(line => line.return_quantity > 0);
    
    if (returnLines.length === 0) {
      toast.error('Please select items to return');
      return;
    }

    // Validate return quantities
    for (const line of returnLines) {
      if (line.return_quantity > line.max_quantity) {
        toast.error(`Return quantity for ${line.product_name} cannot exceed ${line.max_quantity}`);
        return;
      }
      if (line.return_quantity <= 0) {
        toast.error('Return quantity must be greater than 0');
        return;
      }
      if (!line.reason.trim()) {
        toast.error('Please provide reason for all return items');
        return;
      }
    }

    setSaving(true);
    try {
      // Create return data
      const returnData = {
        original_receipt_no: formData.original_receipt,
        customer_id: formData.customer_id,
        notes: formData.notes.trim(),
        lines: returnLines.map(line => ({
          sale_line_id: line.sale_line_id,
          product_id: line.product_id,
          quantity: line.return_quantity,
          unit_cost: line.unit_cost,
          reason: line.reason.trim()
        }))
      };

      // Submit to API
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(returnData)
      });

      if (!response.ok) {
        throw new Error('Failed to process return');
      }

      const result = await response.json();
      
      toast.success(`Return ${result.return_receipt_no} processed successfully`);
      
      // Reset form
      setFormData({
        original_receipt: '',
        sale: null,
        customer_id: undefined,
        notes: '',
        lines: []
      });
      
      navigate('/returns');
    } catch (error) {
      console.error('Failed to process return:', error);
      toast.error('Failed to process return');
    } finally {
      setSaving(false);
    }
  };

  const totalReturnValue = formData.lines.reduce((sum, line) => sum + line.total_amount, 0);
  const hasReturnItems = formData.lines.some(line => line.return_quantity > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <RotateCcw className="w-6 h-6 mr-2" />
                Sales Return
              </h1>
              <p className="text-gray-600">Process sales returns and update stock levels</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt Search */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Find Original Sale</h2>
            
            <div className="flex space-x-4">
              <div className="flex-1">
                <Label htmlFor="receipt">Receipt Number *</Label>
                <Input
                  id="receipt"
                  value={formData.original_receipt}
                  onChange={(e) => setFormData(prev => ({ ...prev, original_receipt: e.target.value }))}
                  placeholder="Enter receipt number"
                  disabled={!!formData.sale}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={searchSale}
                  disabled={searching || !formData.original_receipt.trim() || !!formData.sale}
                  className="flex items-center"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {formData.sale && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-800">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Sale Found</span>
                </div>
                <div className="mt-2 text-sm text-green-700">
                  <p>Receipt: {formData.sale.receipt_number}</p>
                  <p>Date: {new Date(formData.sale.sale_date).toLocaleDateString()}</p>
                  <p>Customer: {formData.sale.customer_name || 'Walk-in'}</p>
                  <p>Total: ${formData.sale.total_amount.toFixed(2)}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Return Items */}
          {formData.sale && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Select Items to Return</h2>
              
              {formData.lines.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items found in this sale.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.lines.map((line) => (
                    <div key={line.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg bg-gray-50">
                      <div className="md:col-span-2">
                        <Label>Product</Label>
                        <div className="p-2 bg-white border rounded text-sm">
                          <div className="font-medium">{line.product_name}</div>
                          <div className="text-gray-500">SKU: {line.product_sku}</div>
                          <div className="text-gray-500">Max: {line.max_quantity} units</div>
                        </div>
                      </div>

                      <div>
                        <Label>Return Qty *</Label>
                        <Input
                          type="number"
                          min="0"
                          max={line.max_quantity}
                          value={line.return_quantity}
                          onChange={(e) => updateReturnLine(line.id, 'return_quantity', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          value={line.unit_price.toFixed(2)}
                          readOnly
                          className="bg-gray-100"
                        />
                      </div>

                      <div>
                        <Label>Total Amount</Label>
                        <Input
                          type="number"
                          value={line.total_amount.toFixed(2)}
                          readOnly
                          className="bg-gray-100"
                        />
                      </div>

                      <div>
                        <Label>Reason *</Label>
                        <Input
                          value={line.reason}
                          onChange={(e) => updateReturnLine(line.id, 'reason', e.target.value)}
                          placeholder="Return reason"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Return Notes */}
          {formData.sale && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Return Details</h2>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes about the return"
                />
              </div>
            </Card>
          )}

          {/* Summary */}
          {hasReturnItems && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Return Summary</h2>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600">
                    Items to Return: {formData.lines.filter(line => line.return_quantity > 0).length}
                  </p>
                  <p className="text-gray-600">
                    Total Quantity: {formData.lines.reduce((sum, line) => sum + line.return_quantity, 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">
                    Return Value: ${totalReturnValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !hasReturnItems}
              className="flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {saving ? 'Processing Return...' : 'Process Return'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SalesReturn;

