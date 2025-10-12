import React, { useState } from 'react';
import { dataService } from '@/services/dataService';

export default function SupplierReturnPage() {
  const [supplierId, setSupplierId] = useState<number>(1);
  const [lines, setLines] = useState<{ product_id: number; uom?: string; qty: number; unit_cost: number; reason?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [srId, setSrId] = useState<number | null>(null);

  const addLine = () => setLines((prev) => [...prev, { product_id: 0, uom: 'pc', qty: 1, unit_cost: 0, reason: '' }]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const clean = lines.filter(l => Number(l.product_id) > 0 && Number(l.qty) > 0);
      if (clean.length === 0) throw new Error('Add at least one valid line');
      const res = await dataService.createSupplierReturn({ supplier_id: supplierId, lines: clean });
      setSrId(res.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Supplier Return</h1>
      <div className="bg-white dark:bg-gray-800 rounded border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm">Supplier ID</label>
          <input type="number" value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value || 0))} className="px-2 py-1 border rounded w-40" />
          <button onClick={addLine} className="px-3 py-1 border rounded">Add Line</button>
        </div>
        <div className="space-y-2">
          {lines.map((ln, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2 items-center">
              <input type="number" placeholder="Product ID" value={ln.product_id} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, product_id: Number(e.target.value || 0) } : l))} className="px-2 py-1 border rounded" />
              <input type="text" placeholder="UOM" value={ln.uom} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, uom: e.target.value } : l))} className="px-2 py-1 border rounded" />
              <input type="number" placeholder="Qty" value={ln.qty} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, qty: Number(e.target.value || 0) } : l))} className="px-2 py-1 border rounded" />
              <input type="number" placeholder="Unit Cost" value={ln.unit_cost} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, unit_cost: Number(e.target.value || 0) } : l))} className="px-2 py-1 border rounded" />
              <input type="text" placeholder="Reason" value={ln.reason || ''} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, reason: e.target.value } : l))} className="px-2 py-1 border rounded" />
              <button onClick={() => removeLine(idx)} className="px-2 py-1 border rounded">Remove</button>
            </div>
          ))}
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex items-center justify-end gap-2">
          <button disabled={busy} onClick={submit} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{busy ? 'Saving...' : 'Save Supplier Return'}</button>
        </div>
        {srId && <div className="text-green-700">Supplier Return created: #{srId}</div>}
      </div>
    </div>
  );
}



