import React, { useEffect, useMemo, useState } from 'react';

export default function ZReportPage() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<{ method: string; total: number }[]>([]);
  const [cash, setCash] = useState<{ type: string; total: number }[]>([]);
  const [reportType, setReportType] = useState<'X' | 'Z'>('Z');

  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${apiBaseUrl}/api/reports/xz`);
      url.searchParams.set('date', date);
      url.searchParams.set('type', reportType);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setPayments((data.payments || []).map((p: any) => ({ method: p.method, total: Number(p.total) })));
      setCash((data.cash || []).map((c: any) => ({ type: c.type, total: Number(c.total) })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatCurrency = (n: number) => `රු ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  const netPayments = useMemo(() => payments.reduce((s, p) => s + Number(p.total || 0), 0), [payments]);
  const refundRows = useMemo(() => payments.filter(p => Number(p.total) < 0), [payments]);
  const salesRows = useMemo(() => payments.filter(p => Number(p.total) > 0), [payments]);
  const cashInOut = useMemo(() => {
    const by = (t: string) => Number((cash.find(c => c.type === t)?.total) || 0);
    return {
      cash_in: by('cash_in'),
      cash_out: by('cash_out'),
      safe_drop: by('safe_drop'),
      opening_float: by('opening_float'),
      closing_float: by('closing_float')
    };
  }, [cash]);
  const cashMethodTotal = useMemo(() => Number((payments.find(p => p.method?.toUpperCase?.() === 'CASH')?.total) || 0), [payments]);
  const reconciledNetCash = useMemo(() => {
    // cash at drawer = cash sales + movements (cash_in adds, cash_out subtracts, safe_drop subtracts) + opening/closing floats
    return cashMethodTotal + cashInOut.cash_in - Math.abs(cashInOut.cash_out) - Math.abs(cashInOut.safe_drop) + cashInOut.opening_float + cashInOut.closing_float;
  }, [cashMethodTotal, cashInOut]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">{reportType} Report</h1>
        <div className="flex items-center gap-2">
          <select value={reportType} onChange={(e) => setReportType(e.target.value as 'X'|'Z')} className="px-2 py-1 border rounded">
            <option value="X">X</option>
            <option value="Z">Z</option>
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 py-1 border rounded" />
          <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded">Refresh</button>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded border p-4">
            <h2 className="font-medium mb-2">Payments by Method</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1">Method</th>
                  <th className="px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => (
                  <tr key={row.method} className="border-t">
                    <td className="px-2 py-1">{row.method}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(row.total)}</td>
                  </tr>
                ))}
                <tr className="border-t font-medium">
                  <td className="px-2 py-1">Net</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(netPayments)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded border p-4">
            <h2 className="font-medium mb-2">Cash Movements</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {cash.map((row) => (
                  <tr key={row.type} className="border-t">
                    <td className="px-2 py-1">{row.type}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded border p-4 md:col-span-2">
            <h2 className="font-medium mb-2">Refunds (Negatives)</h2>
            {refundRows.length === 0 ? (
              <div className="text-sm text-gray-500">No refunds</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-1">Method</th>
                    <th className="px-2 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {refundRows.map((r) => (
                    <tr key={r.method} className="border-t">
                      <td className="px-2 py-1">{r.method}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded border p-4 md:col-span-2">
            <h2 className="font-medium mb-2">Reconciliation</h2>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span>Cash (payments)</span><span>{formatCurrency(cashMethodTotal)}</span></div>
              <div className="flex justify-between"><span>Cash In</span><span>{formatCurrency(cashInOut.cash_in)}</span></div>
              <div className="flex justify-between"><span>Cash Out</span><span>{formatCurrency(cashInOut.cash_out)}</span></div>
              <div className="flex justify-between"><span>Safe Drop</span><span>{formatCurrency(cashInOut.safe_drop)}</span></div>
              <div className="flex justify-between"><span>Opening Float</span><span>{formatCurrency(cashInOut.opening_float)}</span></div>
              <div className="flex justify-between"><span>Closing Float</span><span>{formatCurrency(cashInOut.closing_float)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-2"><span>Reconciled Net Cash</span><span>{formatCurrency(reconciledNetCash)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







