import React, { useEffect, useState } from 'react';
import { getDiscountUsage, getDiscountExceptions } from '@/services/discountReportService';
import { csvService } from '@/services/csvService';

export default function DiscountsReportPage() {
  const [usage, setUsage] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'USAGE'|'EXCEPTIONS'>('USAGE');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [u, e] = await Promise.all([
      getDiscountUsage({}),
      getDiscountExceptions({})
    ]);
    setUsage(u);
    setExceptions(e);
    setLoading(false);
  }

  const exportUsage = async () => {
    await csvService.exportData(usage, 'discount_usage.csv');
    try {
      const auditModule = await import('@/services/auditService');
      await auditModule.auditService.log({
        action: 'discounts.report_exported',
        entity: 'discounts_report',
        entityId: 'usage',
        payload: { reportType: 'usage', filters: {}, rowCount: usage.length, ts: new Date().toISOString() }
      } as any);
    } catch {}
  };
  const exportExceptions = async () => {
    await csvService.exportData(exceptions, 'discount_exceptions.csv');
    try {
      const auditModule = await import('@/services/auditService');
      await auditModule.auditService.log({
        action: 'discounts.report_exported',
        entity: 'discounts_report',
        entityId: 'exception',
        payload: { reportType: 'exception', filters: {}, rowCount: exceptions.length, ts: new Date().toISOString() }
      } as any);
    } catch {}
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Discount Reports</h1>
        <div className="space-x-2">
          <button onClick={() => setTab('USAGE')} className={`px-3 py-1 rounded ${tab==='USAGE'?'bg-blue-600 text-white':'bg-gray-200'}`}>Usage</button>
          <button onClick={() => setTab('EXCEPTIONS')} className={`px-3 py-1 rounded ${tab==='EXCEPTIONS'?'bg-blue-600 text-white':'bg-gray-200'}`}>Exceptions</button>
        </div>
      </div>

      {tab === 'USAGE' ? (
        <div className="bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-semibold">Usage by Rule</div>
            <button onClick={exportUsage} className="px-3 py-1 bg-purple-600 text-white rounded">Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Rule</th>
                  <th className="text-left px-3 py-2">Level</th>
                  <th className="text-right px-3 py-2">Total Discount</th>
                  <th className="text-right px-3 py-2">Bills</th>
                  <th className="text-right px-3 py-2">Lines</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6 text-center" colSpan={5}>Loading...</td></tr>
                ) : usage.length === 0 ? (
                  <tr><td className="px-3 py-6 text-center" colSpan={5}>No data</td></tr>
                ) : usage.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{row.rule_name}</td>
                    <td className="px-3 py-2">{row.level}</td>
                    <td className="px-3 py-2 text-right">{Number(row.total_discount).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{row.bills_affected}</td>
                    <td className="px-3 py-2 text-right">{row.lines_affected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-semibold">Exceptions</div>
            <button onClick={exportExceptions} className="px-3 py-1 bg-purple-600 text-white rounded">Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Bill</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">SKU</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">Subtotal</th>
                  <th className="text-right px-3 py-2">Applied</th>
                  <th className="text-left px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6 text-center" colSpan={7}>Loading...</td></tr>
                ) : exceptions.length === 0 ? (
                  <tr><td className="px-3 py-6 text-center" colSpan={7}>No data</td></tr>
                ) : exceptions.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{row.bill_no}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.sku}</td>
                    <td className="px-3 py-2 text-right">{row.qty}</td>
                    <td className="px-3 py-2 text-right">{Number(row.subtotal).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(row.applied).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


