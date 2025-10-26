import React, { useEffect, useState } from 'react';
import { getCustomerPriceExceptions, getProfileCoverage } from '@/services/profileReportService';

export default function SpecialPricingReportsPage() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<{covered:number; total:number; percent:number}>({covered:0,total:0,percent:0});
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<number|undefined>(undefined);

  useEffect(() => { load(); }, [profileId]);
  async function load() {
    setLoading(true);
    const [ex, cov] = await Promise.all([
      getCustomerPriceExceptions({ profileId }),
      getProfileCoverage(profileId || 0)
    ]);
    setExceptions(ex);
    setCoverage(cov);
    setLoading(false);
  }

  async function exportExceptionsCSV() {
    const { csvService } = await import('@/services/csvService');
    await csvService.exportData(exceptions, 'customer_price_exceptions.csv');
    try {
      const auditModule = await import('@/services/auditService');
      await auditModule.auditService.log({ action: 'discounts.report_exported', entity: 'special_reports', entityId: 'exceptions', payload: { reportType: 'exceptions', rowCount: exceptions.length, ts: new Date().toISOString() } } as any);
    } catch {}
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Special Pricing Reports</h1>
        <div className="space-x-2">
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={load}>Refresh</button>
          <button className="px-3 py-1 bg-purple-600 text-white rounded" onClick={exportExceptionsCSV}>Export Exceptions CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">Profile Coverage</div>
          {loading ? 'Loading...' : (
            <div className="text-sm">
              <div>Covered lines: {coverage.covered} / {coverage.total}</div>
              <div>Coverage: {coverage.percent.toFixed(1)}%</div>
            </div>
          )}
        </div>

        <div className="col-span-2 bg-white rounded border">
          <div className="p-2 font-semibold border-b">Customer Price Exceptions</div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Bill</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">SKU</th>
                  <th className="text-right px-3 py-2">Base Price</th>
                  <th className="text-right px-3 py-2">Special Price</th>
                  <th className="text-right px-3 py-2">Discount</th>
                  <th className="text-right px-3 py-2">Advantage</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-3 py-3 text-sm text-gray-500">Loading...</td></tr>
                ) : exceptions.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-3 text-sm text-gray-500">No exceptions</td></tr>
                ) : exceptions.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{r.bill_no}</td>
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2 text-right">{Number(r.base_price).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.special_price!=null?Number(r.special_price).toLocaleString():''}</td>
                    <td className="px-3 py-2 text-right">{Number(r.discount_applied||0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(r.advantage).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}










