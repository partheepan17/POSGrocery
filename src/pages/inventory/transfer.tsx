import React, { useEffect, useState } from 'react';

export default function TransferPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [fromStore, setFromStore] = useState<number>(1);
  const [toStore, setToStore] = useState<number>(2);
  const [lines, setLines] = useState<{ product_id: number; qty: number }[]>([]);
  const [transferId, setTransferId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  const loadStores = async () => {
    const res = await fetch(`${apiBaseUrl}/api/stores`);
    const data = await res.json();
    setStores(data.stores || []);
  };
  useEffect(() => { loadStores(); }, []);

  const addLine = () => setLines((prev) => [...prev, { product_id: 0, qty: 1 }]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const create = async () => {
    const body = { from_store: fromStore, to_store: toStore, lines: lines.filter(l => l.product_id && l.qty) };
    const res = await fetch(`${apiBaseUrl}/api/transfers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setTransferId(data.id); setStatus('requested'); }
  };

  const ship = async () => {
    if (!transferId) return;
    const res = await fetch(`${apiBaseUrl}/api/transfers/${transferId}/ship`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) setStatus(data.status);
  };

  const receive = async () => {
    if (!transferId) return;
    const res = await fetch(`${apiBaseUrl}/api/transfers/${transferId}/receive`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) setStatus(data.status);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Inter-store Transfer</h1>
      <div className="bg-white dark:bg-gray-800 rounded border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">From Store</label>
            <select value={fromStore} onChange={(e) => setFromStore(Number(e.target.value))} className="px-2 py-1 border rounded w-full">
              {stores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">To Store</label>
            <select value={toStore} onChange={(e) => setToStore(Number(e.target.value))} className="px-2 py-1 border rounded w-full">
              {stores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
        </div>
        <button onClick={addLine} className="px-3 py-1 border rounded">Add Line</button>
        <div className="space-y-2">
          {lines.map((ln, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2 items-center">
              <input type="number" placeholder="Product ID" value={ln.product_id} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, product_id: Number(e.target.value || 0) } : l))} className="px-2 py-1 border rounded" />
              <input type="number" placeholder="Qty" value={ln.qty} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, qty: Number(e.target.value || 0) } : l))} className="px-2 py-1 border rounded" />
              <button onClick={() => removeLine(idx)} className="px-2 py-1 border rounded">Remove</button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={create} className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
          <button onClick={ship} disabled={!transferId || status !== 'requested'} className="px-3 py-1 border rounded disabled:opacity-50">Mark In Transit</button>
          <button onClick={receive} disabled={!transferId || status !== 'in_transit'} className="px-3 py-1 border rounded disabled:opacity-50">Mark Received</button>
          {transferId && <span className="ml-auto text-sm">Transfer #{transferId} • {status}</span>}
        </div>
      </div>
    </div>
  );
}










