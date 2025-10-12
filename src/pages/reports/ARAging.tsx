import React, { useEffect, useState } from 'react';

export default function ARAgingPage() {
  const [customerId, setCustomerId] = useState<number>(1);
  const [aging, setAging] = useState<{ b0_7: number; b8_14: number; b15_30: number; b30p: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/ar/aging/${customerId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load aging');
      setAging(data.aging || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => `රු ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">AR Aging</h1>
        <input type="number" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value || 0))} className="px-2 py-1 border rounded w-40 ml-auto" />
        <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded">Refresh</button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {aging && (
        <div className="bg-white dark:bg-gray-800 rounded border p-4">
          <table className="text-sm min-w-full">
            <thead>
              <tr className="text-left">
                <th className="px-2 py-1">Bucket</th>
                <th className="px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t"><td className="px-2 py-1">0–7</td><td className="px-2 py-1 text-right">{fmt(aging.b0_7)}</td></tr>
              <tr className="border-t"><td className="px-2 py-1">8–14</td><td className="px-2 py-1 text-right">{fmt(aging.b8_14)}</td></tr>
              <tr className="border-t"><td className="px-2 py-1">15–30</td><td className="px-2 py-1 text-right">{fmt(aging.b15_30)}</td></tr>
              <tr className="border-t"><td className="px-2 py-1">30+</td><td className="px-2 py-1 text-right">{fmt(aging.b30p)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}










