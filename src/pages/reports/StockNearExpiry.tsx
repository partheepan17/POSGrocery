import React, { useEffect, useState } from 'react';

export default function StockNearExpiryPage() {
  const [days, setDays] = useState<number>(30);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${apiBaseUrl}/api/reports/stock/near-expiry`);
      url.searchParams.set('days', String(days));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Near Expiry Stock</h1>
        <div className="flex items-center gap-2">
          <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value || 0))} className="px-2 py-1 border rounded w-24" />
          <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded">Refresh</button>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded border p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-2 py-1">Product</th>
                <th className="px-2 py-1">Batch</th>
                <th className="px-2 py-1">Expiry</th>
                <th className="px-2 py-1 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-t">
                  <td className="px-2 py-1">{it.name_en}</td>
                  <td className="px-2 py-1">{it.batch_code || `#${it.id}`}</td>
                  <td className="px-2 py-1">{it.expiry}</td>
                  <td className="px-2 py-1 text-right">{Number(it.qty_on_hand).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}










