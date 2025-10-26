/**
 * GRN Line Form Component with Expiry Date Support
 * Form for adding/editing GRN line items with expiry date handling
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Calendar } from '@/components/ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface GRNLineItem {
  id?: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

interface GRNLineFormProps {
  lineItem?: GRNLineItem;
  onSave: (lineItem: GRNLineItem) => void;
  onCancel: () => void;
  products: Array<{
    id: number;
    name_en: string;
    sku: string;
    unit: string;
    has_expiry: boolean;
  }>;
  isEditing?: boolean;
}

export const GRNLineForm: React.FC<GRNLineFormProps> = ({
  lineItem,
  onSave,
  onCancel,
  products,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<GRNLineItem>({
    product_id: lineItem?.product_id || 0,
    product_name: lineItem?.product_name || '',
    sku: lineItem?.sku || '',
    quantity_received: lineItem?.quantity_received || 0,
    unit_cost: lineItem?.unit_cost || 0,
    total_cost: lineItem?.total_cost || 0,
    batch_number: lineItem?.batch_number || '',
    expiry_date: lineItem?.expiry_date || '',
    notes: lineItem?.notes || ''
  });

  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    formData.expiry_date ? new Date(formData.expiry_date) : undefined
  );

  const [showExpiryCalendar, setShowExpiryCalendar] = useState(false);

  const selectedProduct = products.find(p => p.id === formData.product_id);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      setFormData(prev => ({
        ...prev,
        product_id: product.id,
        product_name: product.name_en,
        sku: product.sku,
        // Clear expiry date when changing product
        expiry_date: product.has_expiry ? prev.expiry_date : undefined
      }));
      setExpiryDate(undefined);
    }
  };

  const handleQuantityChange = (value: string) => {
    const quantity = parseFloat(value) || 0;
    const totalCost = quantity * formData.unit_cost;
    setFormData(prev => ({
      ...prev,
      quantity_received: quantity,
      total_cost: totalCost
    }));
  };

  const handleUnitCostChange = (value: string) => {
    const unitCost = parseFloat(value) || 0;
    const totalCost = formData.quantity_received * unitCost;
    setFormData(prev => ({
      ...prev,
      unit_cost: unitCost,
      total_cost: totalCost
    }));
  };

  const handleExpiryDateChange = (date: Date | Date[] | undefined) => {
    const singleDate = Array.isArray(date) ? date[0] : date;
    setExpiryDate(singleDate);
    setFormData(prev => ({
      ...prev,
      expiry_date: singleDate ? singleDate.toISOString().split('T')[0] : undefined
    }));
    setShowExpiryCalendar(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || formData.quantity_received <= 0 || formData.unit_cost <= 0) {
      return;
    }

    onSave(formData);
  };

  const isExpiryRequired = selectedProduct?.has_expiry || false;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Product Selection */}
        <div className="space-y-2">
          <Label htmlFor="product">Product *</Label>
          <Select
            value={formData.product_id.toString()}
            onValueChange={handleProductChange}
            disabled={isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span>{product.name_en}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {product.sku}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* SKU Display */}
        <div className="space-y-2">
          <Label>SKU</Label>
          <Input
            value={formData.sku}
            disabled
            className="bg-muted"
          />
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="quantity"
              type="number"
              step="0.001"
              min="0"
              value={formData.quantity_received}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="0.000"
              required
            />
            <span className="text-sm text-muted-foreground">
              {selectedProduct?.unit || 'pcs'}
            </span>
          </div>
        </div>

        {/* Unit Cost */}
        <div className="space-y-2">
          <Label htmlFor="unitCost">Unit Cost (LKR) *</Label>
          <Input
            id="unitCost"
            type="number"
            step="0.01"
            min="0"
            value={formData.unit_cost}
            onChange={(e) => handleUnitCostChange(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {/* Batch Number */}
        <div className="space-y-2">
          <Label htmlFor="batchNumber">Batch Number</Label>
          <Input
            id="batchNumber"
            value={formData.batch_number}
            onChange={(e) => setFormData(prev => ({ ...prev, batch_number: e.target.value }))}
            placeholder="Enter batch number"
          />
        </div>

        {/* Expiry Date */}
        <div className="space-y-2">
          <Label htmlFor="expiryDate">
            Expiry Date
            {isExpiryRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Popover open={showExpiryCalendar} onOpenChange={setShowExpiryCalendar}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !expiryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiryDate ? format(expiryDate, "PPP") : "Select expiry date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expiryDate}
                onSelect={handleExpiryDateChange}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {expiryDate && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Selected: {format(expiryDate, "PPP")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleExpiryDateChange(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Total Cost Display */}
        <div className="space-y-2">
          <Label>Total Cost (LKR)</Label>
          <Input
            value={formData.total_cost.toFixed(2)}
            disabled
            className="bg-muted font-medium"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes (optional)"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={
            !formData.product_id || 
            formData.quantity_received <= 0 || 
            formData.unit_cost <= 0 ||
            (isExpiryRequired && !formData.expiry_date)
          }
        >
          {isEditing ? 'Update' : 'Add'} Line Item
        </Button>
      </div>

      {/* Expiry Warning */}
      {isExpiryRequired && !formData.expiry_date && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
          ⚠️ This product requires an expiry date to be set.
        </div>
      )}
    </form>
  );
};
