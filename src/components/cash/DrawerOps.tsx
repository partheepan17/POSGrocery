import React, { useMemo, useState } from 'react';
import { dataService } from '@/services/dataService';
import { toast } from 'react-hot-toast';
import { DollarSign, ArrowDownCircle, ArrowUpCircle, ShieldCheck, Calculator } from 'lucide-react';

type Denoms = {
  '5000': number; '2000': number; '1000': number; '500': number; '100': number;
  '50': number; '20': number; '10': number; '5': number; '2': number; '1': number;
};

interface DrawerOpsProps {
  shiftId: number;
}

export default function DrawerOps({ shiftId }: DrawerOpsProps) {
  const [denoms, setDenoms] = useState<Denoms>({
    '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0,
    '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0
  });
  const [note, setNote] = useState('');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [reportType, setReportType] = useState<'X'|'Z'>('X');
  const [report, setReport] = useState<{ payments: any[]; cash: any[] } | null>(null);

  const denomTotal = useMemo(() => {
    const entries: Array<[keyof Denoms, number]> = Object.entries(denoms) as any;
    return entries.reduce((sum, [k, qty]) => sum + (Number(k) * Number(qty || 0)), 0);
  }, [denoms]);

  const setQty = (key: keyof Denoms, value: number) => setDenoms(prev => ({ ...prev, [key]: value }));

  const postMovement = async (type: 'cash_in'|'cash_out'|'safe_drop'|'opening_float'|'closing_float', amount: number) => {
    try {
      if (!Number.isFinite(amount) || amount === 0) {
        toast.error('Enter a valid amount');
        return;
      }
      await dataService.addCashMovement({ shift_id: shiftId, type, amount, note });
      toast.success('Movement recorded');
      setNote('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record movement');
    }
  };

  const loadReport = async () => {
    try {
      const res = await dataService.getXZReport(reportDate, reportType);
      setReport({ payments: res.payments || [], cash: res.cash || [] });
    } catch (e: any) {
      toast.error(e?.message || 'Report failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-5 h-5 text-blue-600" />
          <div className="font-semibold">Denomination Sheet</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.keys(denoms).map((k) => (
            <div key={k} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/30 p-2 rounded">
              <div className="text-sm">Rs {k}</div>
              <input
                type="number"
                className="w-20 text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-1"
                value={(denoms as any)[k]}
                onChange={(e) => setQty(k as keyof Denoms, Number(e.target.value))}
                min={0}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 text-right text-sm font-semibold">Total: Rs {denomTotal.toFixed(2)}</div>
        <div className="mt-3 flex items-center gap-2">
          <input
            placeholder="Note (optional)"
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button onClick={() => postMovement('opening_float', denomTotal)} className="px-3 py-2 rounded bg-emerald-600 text-white">Opening Float</button>
          <button onClick={() => postMovement('closing_float', denomTotal)} className="px-3 py-2 rounded bg-indigo-600 text-white">Closing Float</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-green-600" />
          <div className="font-semibold">Quick Cash Movements</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Amount"
            className="w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2"
            value={customAmount}
            onChange={(e) => setCustomAmount(Number(e.target.value))}
          />
          <button onClick={() => postMovement('cash_in', customAmount)} className="px-3 py-2 rounded bg-green-600 text-white inline-flex items-center gap-1"><ArrowDownCircle className="w-4 h-4"/>Cash In</button>
          <button onClick={() => postMovement('cash_out', -Math.abs(customAmount))} className="px-3 py-2 rounded bg-rose-600 text-white inline-flex items-center gap-1"><ArrowUpCircle className="w-4 h-4"/>Cash Out</button>
          <button onClick={() => postMovement('safe_drop', -Math.abs(customAmount))} className="px-3 py-2 rounded bg-yellow-600 text-white">Safe Drop</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <div className="font-semibold">X/Z Report</div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input type="date" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          <select className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2" value={reportType} onChange={(e) => setReportType(e.target.value as 'X'|'Z')}>
            <option value="X">X</option>
            <option value="Z">Z</option>
          </select>
          <button onClick={loadReport} className="px-3 py-2 rounded bg-blue-600 text-white">Load</button>
        </div>
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-1">Payments</div>
              <div className="space-y-1">
                {report.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between"><span>{p.method}</span><span>{Number(p.total).toFixed(2)}</span></div>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1">Cash Movements</div>
              <div className="space-y-1">
                {report.cash.map((c, idx) => (
                  <div key={idx} className="flex justify-between"><span>{c.type}</span><span>{Number(c.total).toFixed(2)}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



