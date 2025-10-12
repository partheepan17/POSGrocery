import React, { useEffect, useState } from 'react';

export default function GRNVarianceReportPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  const load = async () => {
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/reports/grn-variance`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const exportCsv = () => {
    const header = 'po_id,grn_id,product_id,po_qty,po_cost,grn_qty,grn_cost\n';
    const body = items.map((it) => `${it.po_id||''},${it.grn_id||''},${it.product_id},${it.po_qty||0},${it.po_cost||0},${it.grn_qty||0},${it.grn_cost||0}`).join('\n');
    const csv = header + body;
    const url = new URL(`${apiBaseUrl}/api/export/csv`);
    url.searchParams.set('name', 'grn_variance');
    url.searchParams.set('data', csv);
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">GRN vs PO Variance</h1>
        <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded ml-auto">Refresh</button>
        <button onClick={exportCsv} className="px-3 py-1 border rounded">Export CSV</button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <div className="bg-white dark:bg-gray-800 rounded border p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-2 py-1">PO</th>
              <th className="px-2 py-1">GRN</th>
              <th className="px-2 py-1">Product</th>
              <th className="px-2 py-1 text-right">PO Qty</th>
              <th className="px-2 py-1 text-right">PO Cost</th>
              <th className="px-2 py-1 text-right">GRN Qty</th>
              <th className="px-2 py-1 text-right">GRN Cost</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={`${it.po_id}-${it.product_id}-${it.grn_id||'none'}`} className="border-t">
                <td className="px-2 py-1">{it.po_id}</td>
                <td className="px-2 py-1">{it.grn_id || '-'}</td>
                <td className="px-2 py-1">{it.product_id}</td>
                <td className="px-2 py-1 text-right">{Number(it.po_qty||0).toLocaleString()}</td>
                <td className="px-2 py-1 text-right">{Number(it.po_cost||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right">{Number(it.grn_qty||0).toLocaleString()}</td>
                <td className="px-2 py-1 text-right">{Number(it.grn_cost||0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}










