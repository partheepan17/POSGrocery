import React, { useEffect, useState } from 'react';
import { dataService } from '@/services/dataService';

export default function SpecialPricingProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selected, setSelected] = useState<any|null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const list = await dataService.getSpecialPricingProfiles();
    setProfiles(list as any);
    setLoading(false);
  }

  async function openProfile(p: any) {
    setSelected(p);
    const full = await dataService.getSpecialPricingProfileById(p.id);
    setEntries((full as any)?.entries || []);
  }

  async function exportCSV() {
    if (!selected) return;
    await dataService.exportSpecialProfileCSV(selected.id);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Special Pricing Profiles</h1>
        <div className="space-x-2">
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => load()}>Refresh</button>
          <button className="px-3 py-1 bg-purple-600 text-white rounded" onClick={exportCSV} disabled={!selected}>Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded border">
          <div className="p-2 font-semibold border-b">Profiles</div>
          {loading ? (
            <div className="p-3 text-sm">Loading...</div>
          ) : profiles.length === 0 ? (
            <div className="p-3 text-sm">No profiles</div>
          ) : (
            <ul>
              {profiles.map(p => (
                <li key={p.id} className={`px-3 py-2 border-b cursor-pointer ${selected?.id===p.id?'bg-blue-50':''}`} onClick={() => openProfile(p)}>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.active ? 'Active' : 'Inactive'}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="col-span-2 bg-white rounded border">
          <div className="p-2 font-semibold border-b">Entries {selected ? `for ${selected.name}` : ''}</div>
          {!selected ? (
            <div className="p-3 text-sm text-gray-500">Select a profile to view entries</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Level</th>
                    <th className="text-left px-3 py-2">Target</th>
                    <th className="text-left px-3 py-2">Rule</th>
                    <th className="text-right px-3 py-2">Value</th>
                    <th className="text-left px-3 py-2">Channel</th>
                    <th className="text-left px-3 py-2">Stack</th>
                    <th className="text-left px-3 py-2">Qty-Rule</th>
                    <th className="text-left px-3 py-2">Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-3 text-sm text-gray-500">No entries</td></tr>
                  ) : entries.map((e: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{e.level}</td>
                      <td className="px-3 py-2">{e.target_id}</td>
                      <td className="px-3 py-2">{e.rule_type.replace('_',' ')}</td>
                      <td className="px-3 py-2 text-right">{e.rule_type==='PERCENT_DISCOUNT'? `${e.value}%` : `LKR ${Number(e.value||0).toLocaleString()}`}</td>
                      <td className="px-3 py-2">{e.channel||'BOTH'}</td>
                      <td className="px-3 py-2">{e.stack_mode||'EXCLUSIVE'}</td>
                      <td className="px-3 py-2">{e.apply_quantity_rule===false?'Off':'On'}</td>
                      <td className="px-3 py-2 text-xs">{e.active_from || ''} {e.active_to?`→ ${e.active_to}`:''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}










