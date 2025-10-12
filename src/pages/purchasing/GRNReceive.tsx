import React, { useState } from 'react';
import { dataService } from '@/services/dataService';
import { toast } from 'react-hot-toast';

export default function GRNReceive() {
  const [poId, setPoId] = useState<number | undefined>(undefined);
  const [supplierId, setSupplierId] = useState<number | undefined>(undefined);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [lines, setLines] = useState<Array<{ product_id: number; quantity_received: number; unit_cost: number }>>([]);
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [createdGrnId, setCreatedGrnId] = useState<number | null>(null);
  const [freight, setFreight] = useState<number>(0);
  const [duty, setDuty] = useState<number>(0);
  const [misc, setMisc] = useState<number>(0);
  const [mode, setMode] = useState<'qty'|'value'>('qty');

  // Load suppliers on mount
  React.useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const data = await dataService.getSuppliers();
        setSuppliers(data);
      } catch (error) {
        console.error('Failed to load suppliers:', error);
      }
    };
    loadSuppliers();
  }, []);

  const addLine = () => {
    if (!sku || qty <= 0 || unitCost <= 0) return;
    const product_id = Number(Date.now());
    setLines([...lines, { product_id, quantity_received: qty, unit_cost: unitCost }]);
    setSku(''); setQty(1); setUnitCost(0);
  };

  const submit = async () => {
    try {
      if (!supplierId) {
        toast.error('Please select a supplier');
        return;
      }
      
      if (lines.length === 0) {
        toast.error('Please add at least one line item');
        return;
      }
      
      // Validate lines
      for (const line of lines) {
        if (!line.product_id || line.product_id <= 0) {
          toast.error('Please enter valid product IDs');
          return;
        }
        if (!line.quantity_received || line.quantity_received <= 0) {
          toast.error('Please enter valid quantities');
          return;
        }
        if (!line.unit_cost || line.unit_cost < 0) {
          toast.error('Please enter valid unit costs');
          return;
        }
      }
      
      // Generate idempotency key
      const idempotencyKey = `grn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const res = await dataService.createGRN({ 
        po_id: poId, 
        supplier_id: supplierId,
        lines: lines.map(line => ({
          product_id: line.product_id,
          quantity_received: line.quantity_received,
          unit_cost: line.unit_cost
        })),
        freight_cost: freight,
        duty_cost: duty,
        misc_cost: misc,
        idempotency_key: idempotencyKey
      });
      
      if (res.duplicate) {
        toast.success(`GRN #${res.grn_number} already exists (duplicate prevented)`);
      } else {
        toast.success(`GRN #${res.grn_number} created successfully`);
      }
      setCreatedGrnId(res.id);
      setLines([]);
    } catch (e: any) {
      console.error('GRN creation error:', e);
      
      // Enhanced error handling
      if (e?.message?.includes('Supplier not found')) {
        toast.error('Selected supplier is not found or inactive');
      } else if (e?.message?.includes('Product not found')) {
        toast.error('One or more products are not found or inactive');
      } else if (e?.message?.includes('Quantity received must be greater than 0')) {
        toast.error('All quantities must be greater than 0');
      } else if (e?.message?.includes('Unit cost cannot be negative')) {
        toast.error('Unit costs cannot be negative');
      } else {
        toast.error(e?.message || 'Failed to create GRN');
      }
    }
  };

  const finalize = async () => {
    try {
      if (!createdGrnId) {
        toast.error('Create a GRN first');
        return;
      }
      const res = await dataService.finalizeGRN(createdGrnId, {
        extra_costs: { freight, duty, misc },
        mode
      });
      toast.success(`GRN finalized (${res.mode}) with Rs ${res.totalExtra.toFixed(2)}`);
    } catch (e: any) {
      toast.error(e?.message || 'Finalize failed');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Receive GRN</h1>
      
      {/* Supplier Selection */}
      <div className="flex items-center gap-2">
        <label className="w-20">Supplier *</label>
        <select 
          className="border rounded p-2 w-64" 
          value={supplierId || ''} 
          onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Select Supplier</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.supplier_name}
            </option>
          ))}
        </select>
      </div>
      
      {/* PO ID */}
      <div className="flex items-center gap-2">
        <label className="w-20">PO ID (optional)</label>
        <input className="border rounded p-2 w-32" value={poId || ''} onChange={(e) => setPoId(e.target.value ? Number(e.target.value) : undefined)} />
      </div>
      <div className="flex items-center gap-2">
        <input placeholder="SKU" className="border rounded p-2" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input type="number" placeholder="Qty" className="border rounded p-2 w-24" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        <input type="number" placeholder="Unit Cost" className="border rounded p-2 w-32" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
        <button onClick={addLine} className="px-3 py-2 rounded bg-blue-600 text-white">Add</button>
      </div>
      <div className="space-y-1">
        {lines.map((l, idx) => (
          <div key={idx} className="flex justify-between text-sm border-b py-1">
            <span>Product #{l.product_id}</span>
            <span>Qty {l.quantity_received}</span>
            <span>Cost {l.unit_cost}</span>
          </div>
        ))}
      </div>
      <div>
        <button onClick={submit} className="px-3 py-2 rounded bg-emerald-600 text-white">Create GRN</button>
      </div>

      <div className="mt-6 space-y-3 bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold">Finalize (Landed Cost Allocation)</div>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Freight" className="border rounded p-2 w-32" value={freight} onChange={(e) => setFreight(Number(e.target.value))} />
          <input type="number" placeholder="Duty" className="border rounded p-2 w-32" value={duty} onChange={(e) => setDuty(Number(e.target.value))} />
          <input type="number" placeholder="Misc" className="border rounded p-2 w-32" value={misc} onChange={(e) => setMisc(Number(e.target.value))} />
          <select className="border rounded p-2" value={mode} onChange={(e) => setMode(e.target.value as 'qty'|'value')}>
            <option value="qty">By Quantity</option>
            <option value="value">By Value</option>
          </select>
          <button onClick={finalize} className="px-3 py-2 rounded bg-indigo-600 text-white" disabled={!createdGrnId}>Finalize</button>
        </div>
        {!createdGrnId && (
          <div className="text-xs text-gray-500">Create a GRN first to enable finalize.</div>
        )}
      </div>
    </div>
  );
}


