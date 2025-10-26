/**
 * GRN (Goods Received Note) Form
 * Minimal form for receiving goods and updating stock
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { toast } from 'react-hot-toast';
import { dataService } from '@/services/dataService';

interface Supplier {
  id: number;
  supplier_name: string;
  contact_phone?: string;
  email?: string;
}

interface Product {
  id: number;
  name_en: string;
  sku: string;
  unit: string;
  current_stock?: number;
}

interface GRNLine {
  id: string;
  product_id: number;
  product: Product;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface GRNFormData {
  supplier_id: number;
  invoice_number: string;
  grn_date: string;
  notes: string;
  lines: GRNLine[];
}

export default function GRN() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<GRNFormData>({
    supplier_id: 0,
    invoice_number: '',
    grn_date: new Date().toISOString().split('T')[0],
    notes: '',
    lines: []
  });

  // Load suppliers and products
  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  const loadSuppliers = async () => {
    try {
      const result = await dataService.getSuppliers();
      setSuppliers(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const loadProducts = async () => {
    try {
      const result = await dataService.getProducts({ page: 1, pageSize: 1000 });
      setProducts(result as any);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
  };

  const addLine = () => {
    const newLine: GRNLine = {
      id: Date.now().toString(),
      product_id: 0,
      product: { id: 0, name_en: '', sku: '', unit: 'pc' },
      quantity: 0,
      unit_cost: 0,
      total_cost: 0
    };
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, newLine]
    }));
  };

  const removeLine = (lineId: string) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter(line => line.id !== lineId)
    }));
  };

  const updateLine = (lineId: string, field: keyof GRNLine, value: any) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map(line => {
        if (line.id === lineId) {
          const updatedLine = { ...line, [field]: value };
          
          // If product_id changed, update product details
          if (field === 'product_id') {
            const product = products.find(p => p.id === value);
            if (product) {
              updatedLine.product = product;
            }
          }
          
          // Recalculate total cost
          if (field === 'quantity' || field === 'unit_cost') {
            updatedLine.total_cost = updatedLine.quantity * updatedLine.unit_cost;
          }
          
          return updatedLine;
        }
        return line;
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    if (!formData.invoice_number.trim()) {
      toast.error('Please enter invoice number');
      return;
    }

    if (formData.lines.length === 0) {
      toast.error('Please add at least one product line');
      return;
    }

    // Validate lines
    for (const line of formData.lines) {
      if (!line.product_id) {
        toast.error('Please select a product for all lines');
        return;
      }
      if (line.quantity <= 0) {
        toast.error('Please enter valid quantity for all lines');
        return;
      }
      if (line.unit_cost <= 0) {
        toast.error('Please enter valid unit cost for all lines');
        return;
      }
    }

    setSaving(true);
    try {
      // Create GRN data
      const grnData = {
        supplier_id: formData.supplier_id,
        invoice_number: formData.invoice_number.trim(),
        grn_date: formData.grn_date,
        notes: formData.notes.trim(),
        lines: formData.lines.map(line => ({
          product_id: line.product_id,
          quantity: line.quantity,
          unit_cost: line.unit_cost,
          total_cost: line.total_cost
        }))
      };

      // Submit to API
      const response = await fetch('/api/grn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(grnData)
      });

      if (!response.ok) {
        throw new Error('Failed to create GRN');
      }

      const result = await response.json();
      
      toast.success(`GRN ${result.grn_number} created successfully`);
      
      // Reset form
      setFormData({
        supplier_id: 0,
        invoice_number: '',
        grn_date: new Date().toISOString().split('T')[0],
        notes: '',
        lines: []
      });
      
      navigate('/grn/list');
    } catch (error) {
      console.error('Failed to create GRN:', error);
      toast.error('Failed to create GRN');
    } finally {
      setSaving(false);
    }
  };

  const totalValue = formData.lines.reduce((sum, line) => sum + line.total_cost, 0);

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
                <Package className="w-6 h-6 mr-2" />
                Goods Received Note
          </h1>
              <p className="text-gray-600">Receive goods and update stock levels</p>
        </div>
      </div>
    </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GRN Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Truck className="w-5 h-5 mr-2" />
              GRN Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier *</Label>
                <Select
                  id="supplier"
                  value={formData.supplier_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: Number(value) }))}
                >
                  <option value={0}>Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplier_name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="invoice">Invoice Number *</Label>
                <Input
                  id="invoice"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="Enter invoice number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="date">GRN Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.grn_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, grn_date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </Card>

          {/* Product Lines */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Product Lines</h2>
              <Button
                type="button"
                onClick={addLine}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            {formData.lines.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No products added yet. Click "Add Product" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.lines.map((line, index) => (
                  <div key={line.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg bg-gray-50">
                    <div className="md:col-span-2">
                      <Label>Product *</Label>
                      <Select
                        value={line.product_id}
                        onValueChange={(value) => updateLine(line.id, 'product_id', Number(value))}
                      >
                        <option value={0}>Select Product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name_en} ({product.sku})
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label>Unit Cost *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_cost}
                        onChange={(e) => updateLine(line.id, 'unit_cost', Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label>Total Cost</Label>
                      <Input
                        type="number"
                        value={line.total_cost.toFixed(2)}
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeLine(line.id)}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Summary */}
          {formData.lines.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600">Total Lines: {formData.lines.length}</p>
                  <p className="text-gray-600">Total Quantity: {formData.lines.reduce((sum, line) => sum + line.quantity, 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    Total Value: ${totalValue.toFixed(2)}
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
              disabled={saving || formData.lines.length === 0}
              className="flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Creating GRN...' : 'Create GRN'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
