import React, { useEffect, useMemo, useState } from 'react';
import { dataService } from '@/services/dataService';

export default function ProfitReport() {
  const [from, setFrom] = useState<string>(() => new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0,10));
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [groupBy, setGroupBy] = useState<'day'|'product'|'category'>('day');
  const [rows, setRows] = useState<Array<{ key: string; sales: number; cost: number; profit: number; margin: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await dataService.getProfitReport({ from, to, groupBy });
      setRows(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => rows.reduce((s, r) => ({ sales: s.sales + r.sales, cost: s.cost + r.cost, profit: s.profit + r.profit }), { sales: 0, cost: 0, profit: 0 }), [rows]);
  const fmt = (n: number) => `රු ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  const csv = () => {
    const header = ['Key','Sales','Cost','Profit','Margin%'];
    const body = rows.map(r => [r.key, r.sales, r.cost, r.profit, r.margin.toFixed(2)]);
    const blob = new Blob([[header.join(','), ...body.map(r => r.join(','))].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `profit_${from}_${to}_${groupBy}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-2 py-1 border rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-2 py-1 border rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Group By</label>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="px-2 py-1 border rounded">
            <option value="day">Day</option>
            <option value="product">Product</option>
            <option value="category">Category</option>
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
                <th className="px-2 py-1">{groupBy}</th>
                <th className="px-2 py-1 text-right">Sales</th>
                <th className="px-2 py-1 text-right">Cost</th>
                <th className="px-2 py-1 text-right">Profit</th>
                <th className="px-2 py-1 text-right">Margin%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="px-2 py-1">{r.key}</td>
                  <td className="px-2 py-1 text-right">{fmt(r.sales)}</td>
                  <td className="px-2 py-1 text-right">{fmt(r.cost)}</td>
                  <td className="px-2 py-1 text-right">{fmt(r.profit)}</td>
                  <td className="px-2 py-1 text-right">{r.margin.toFixed(2)}%</td>
                </tr>
              ))}
              <tr className="border-t font-semibold">
                <td className="px-2 py-1">Total</td>
                <td className="px-2 py-1 text-right">{fmt(totals.sales)}</td>
                <td className="px-2 py-1 text-right">{fmt(totals.cost)}</td>
                <td className="px-2 py-1 text-right">{fmt(totals.profit)}</td>
                <td className="px-2 py-1 text-right">{(totals.profit/Math.max(1, totals.sales)*100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}









