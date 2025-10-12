import React, { useState } from 'react';
import { dataService } from '@/services/dataService';
import { toast } from 'react-hot-toast';

export default function POCreate() {
  const [supplierId, setSupplierId] = useState<number>(1);
  const [lines, setLines] = useState<Array<{ product_id: number; qty: number; unit_cost: number }>>([]);
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);

  const addLine = () => {
    if (!sku || qty <= 0 || unitCost <= 0) return;
    // In a real flow, lookup product_id by SKU
    const product_id = Number(Date.now());
    setLines([...lines, { product_id, qty, unit_cost: unitCost }]);
    setSku(''); setQty(1); setUnitCost(0);
  };

  const submit = async () => {
    try {
      const res = await dataService.createPO({ supplier_id: supplierId, lines });
      toast.success(`PO #${res.id} created`);
      setLines([]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create PO');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Create Purchase Order</h1>
      <div className="flex items-center gap-2">
        <label>Supplier ID</label>
        <input className="border rounded p-2 w-32" value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))} />
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
            <span>Qty {l.qty}</span>
            <span>Cost {l.unit_cost}</span>
          </div>
        ))}
      </div>
      <div>
        <button onClick={submit} className="px-3 py-2 rounded bg-emerald-600 text-white">Create PO</button>
      </div>
    </div>
  );
}











