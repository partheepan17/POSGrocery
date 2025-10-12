import React, { useEffect, useState } from 'react';

export default function MoversReportPage() {
  const [days, setDays] = useState(30);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  const load = async () => {
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/reports/movers?days=${days}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const exportCsv = () => {
    const header = 'product_id,name,qty,revenue\n';
    const body = items.map((it) => `${it.product_id},${(it.name_en||'').replaceAll(',', ' ')},${it.qty||0},${it.revenue||0}`).join('\n');
    const csv = header + body;
    const url = new URL(`${apiBaseUrl}/api/export/csv`);
    url.searchParams.set('name', 'movers');
    url.searchParams.set('data', csv);
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Top/Slow Movers</h1>
        <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value||0))} className="px-2 py-1 border rounded w-24 ml-auto" />
        <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded">Refresh</button>
        <button onClick={exportCsv} className="px-3 py-1 border rounded">Export CSV</button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <div className="bg-white dark:bg-gray-800 rounded border p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-2 py-1">Product</th>
              <th className="px-2 py-1 text-right">Qty</th>
              <th className="px-2 py-1 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.product_id} className="border-t">
                <td className="px-2 py-1">{it.name_en}</td>
                <td className="px-2 py-1 text-right">{Number(it.qty||0).toLocaleString()}</td>
                <td className="px-2 py-1 text-right">{Number(it.revenue||0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}










