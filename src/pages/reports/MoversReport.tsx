import React, { useEffect, useState } from 'react';
import { dataService } from '@/services/dataService';

export default function MoversReport() {
  const [windowDays, setWindowDays] = useState<30|60|90>(30);
  const [type, setType] = useState<'Top'|'Slow'>('Top');
  const [rows, setRows] = useState<Array<{ product: string; qty: number; sales: number; avg_price: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await dataService.getMovers({ window: windowDays, type });
      setRows(data);
    } catch (e: any) { setError(e?.message || 'Failed'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [windowDays, type]);

  const fmt = (n: number) => `රු ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  const csv = () => {
    const header = ['Product','Qty','Sales','AvgPrice'];
    const body = rows.map(r => [r.product, r.qty, r.sales, r.avg_price.toFixed(2)]);
    const blob = new Blob([[header.join(','), ...body.map(r => r.join(','))].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `movers_${type}_${windowDays}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm mb-1">Window</label>
          <select value={windowDays} onChange={e => setWindowDays(Number(e.target.value) as any)} className="px-2 py-1 border rounded">
            <option value={30}>30</option>
            <option value={60}>60</option>
            <option value={90}>90</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as any)} className="px-2 py-1 border rounded">
            <option value="Top">Top</option>
            <option value="Slow">Slow</option>
          </select>
        </div>
        <button onClick={load} className="px-3 py-2 bg-blue-600 text-white rounded">Run</button>
        <button onClick={csv} className="px-3 py-2 bg-green-600 text-white rounded">Export CSV</button>
      </div>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded border p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-2 py-1">Product</th>
                <th className="px-2 py-1 text-right">Qty</th>
                <th className="px-2 py-1 text-right">Sales</th>
                <th className="px-2 py-1 text-right">Avg Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1">{r.product}</td>
                  <td className="px-2 py-1 text-right">{r.qty.toLocaleString()}</td>
                  <td className="px-2 py-1 text-right">{fmt(r.sales)}</td>
                  <td className="px-2 py-1 text-right">{fmt(r.avg_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}









