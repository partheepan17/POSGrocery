import React, { useState } from 'react';
import { dataService } from '@/services/dataService';
import { formatGrnForPrint } from '@/printing/grn';

export default function GRNPage() {
  const [poId, setPoId] = useState<number | undefined>(undefined);
  const [lines, setLines] = useState<{ product_id: number; uom?: string; quantity_received: number; unit_cost: number; batch_id?: number }[]>([]);
  const [grnId, setGrnId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [extraCosts, setExtraCosts] = useState<{ freight?: number; duty?: number; misc?: number }>({ freight: 0, duty: 0, misc: 0 });
  const [mode, setMode] = useState<'qty' | 'value'>('qty');
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState<string | null>(null);
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  const addLine = () => setLines((prev) => [...prev, { product_id: 0, uom: 'pc', quantity_received: 1, unit_cost: 0 }]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const submitGRN = async () => {
    setBusy(true);
    setError(null);
    try {
      const clean = lines.filter(l => Number(l.product_id) > 0 && Number(l.quantity_received) > 0);
      if (clean.length === 0) throw new Error('Add at least one valid line');
      const res = await dataService.createGRN({ po_id: poId, lines: clean });
      setGrnId(res.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (!grnId) return;
    setFinalizing(true);
    setFinalized(null);
    setError(null);
    try {
      const res = await dataService.finalizeGRN(grnId, { extra_costs: extraCosts, mode });
      setFinalized(`Allocated ${res.totalExtra} by ${res.mode}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">GRN Receipt</h1>
      <div className="bg-white dark:bg-gray-800 rounded border p-4 space-y-3">
        <div className="flex gap-3 items-center">
          <label className="text-sm">PO ID (optional)</label>
          <input type="number" value={poId || ''} onChange={(e) => setPoId(e.target.value ? Number(e.target.value) : undefined)} className="px-2 py-1 border rounded w-40" />
          <button onClick={addLine} className="px-3 py-1 border rounded">Add Line</button>
        </div>
        <div className="space-y-2">
          {lines.map((ln, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2 items-center">
              <input type="number" placeholder="Product ID" value={ln.product_id} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, product_id: Number(e.target.value || 0) } : l))} className="px-2 py-1 border rounded" />
              <input type="text" placeholder="UOM" value={ln.uom} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, uom: e.target.value } : l))} className="px-2 py-1 border rounded" />
              <input type="number" placeholder="Qty Received" value={ln.quantity_received} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, quantity_received: Number(e.target.value || 0) } : l))} className="px-2 py-1 border rounded" />
              <input type="number" placeholder="Unit Cost" value={ln.unit_cost} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, unit_cost: Number(e.target.value || 0) } : l))} className="px-2 py-1 border rounded" />
              <input type="number" placeholder="Batch ID (opt)" value={ln.batch_id || ''} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, batch_id: e.target.value ? Number(e.target.value) : undefined } : l))} className="px-2 py-1 border rounded" />
              <button onClick={() => removeLine(idx)} className="px-2 py-1 border rounded">Remove</button>
            </div>
          ))}
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex items-center justify-end gap-2">
          <button disabled={busy} onClick={submitGRN} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{busy ? 'Saving...' : 'Save GRN'}</button>
        </div>
        {grnId && (
          <div className="space-y-3 border-t pt-3 mt-3">
            <div className="flex gap-2 items-center">
              <label className="text-sm">Freight</label>
              <input type="number" value={extraCosts.freight || 0} onChange={(e) => setExtraCosts((p) => ({ ...p, freight: Number(e.target.value || 0) }))} className="px-2 py-1 border rounded w-32" />
              <label className="text-sm">Duty</label>
              <input type="number" value={extraCosts.duty || 0} onChange={(e) => setExtraCosts((p) => ({ ...p, duty: Number(e.target.value || 0) }))} className="px-2 py-1 border rounded w-32" />
              <label className="text-sm">Misc</label>
              <input type="number" value={extraCosts.misc || 0} onChange={(e) => setExtraCosts((p) => ({ ...p, misc: Number(e.target.value || 0) }))} className="px-2 py-1 border rounded w-32" />
              <select value={mode} onChange={(e) => setMode(e.target.value as 'qty'|'value')} className="px-2 py-1 border rounded">
                <option value="qty">Allocate by Qty</option>
                <option value="value">Allocate by Value</option>
              </select>
              <button disabled={finalizing} onClick={finalize} className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50">{finalizing ? 'Finalizing...' : 'Finalize GRN'}</button>
              <button onClick={async () => {
                const payload = {
                  grn_id: grnId!,
                  po_id: poId,
                  lines: lines.map(l => ({ product_id: l.product_id, quantity_received: l.quantity_received, unit_cost: l.unit_cost })),
                  totals: {
                    qty: lines.reduce((s, l) => s + Number(l.quantity_received || 0), 0),
                    value: lines.reduce((s, l) => s + Number(l.quantity_received || 0) * Number(l.unit_cost || 0), 0)
                  }
                };
                const text = formatGrnForPrint(payload);
                await dataService.print({ type: 'grn', content: text });
              }} className="px-3 py-1 border rounded">Print GRN</button>
            </div>
            {finalized && <div className="text-green-700 text-sm">{finalized}</div>}
          </div>
        )}
      </div>
    </div>
  );
}


