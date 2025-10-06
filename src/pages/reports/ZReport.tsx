import React, { useEffect, useState } from 'react';

export default function ZReportPage() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalsByMethod, setTotalsByMethod] = useState<Record<string, number>>({});
  const [net, setNet] = useState(0);

  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8100';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/reports/z?date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setTotalsByMethod(data.totalsByMethod || {});
      setNet(data.net || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatCurrency = (n: number) => `රු ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Z Report</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 py-1 border rounded" />
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
                <th className="px-2 py-1">Method</th>
                <th className="px-2 py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(totalsByMethod).map(([method, amount]) => (
                <tr key={method} className="border-t">
                  <td className="px-2 py-1">{method}</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(Number(amount))}</td>
                </tr>
              ))}
              <tr className="border-t font-medium">
                <td className="px-2 py-1">Net</td>
                <td className="px-2 py-1 text-right">{formatCurrency(Number(net))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}





