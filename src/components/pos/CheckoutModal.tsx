import React, { useMemo, useState } from 'react';
import { dataService } from '@/services/dataService';

type PaymentRow = { method: string; amount: number };

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  header: { customer_id?: number; price_tier: 'Retail'|'Wholesale'|'Credit'|'Other'; cashier_id: number; terminal_name?: string; language?: 'EN'|'SI'|'TA' };
  lines: Array<{ product_id: number; qty: number; unit_price?: number; line_discount?: number; unit?: string; name_en?: string }>;
  onSuccess?: (result: { id: number; receipt_no: string }) => void;
}

export default function CheckoutModal({ isOpen, onClose, total, header, lines, onSuccess }: CheckoutModalProps) {
  const [rows, setRows] = useState<PaymentRow[]>([{ method: 'CASH', amount: total }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sum = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
  const remaining = useMemo(() => Number((total - sum).toFixed(2)), [total, sum]);

  const addRow = () => setRows(prev => [...prev, { method: 'CARD', amount: 0 }]);
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));
  const setRow = (idx: number, r: Partial<PaymentRow>) => setRows(prev => prev.map((row, i) => i === idx ? { ...row, ...r } : row));

  const confirm = async () => {
    if (remaining !== 0) { setError('Payments must equal total'); return; }
    setBusy(true); setError(null);
    try {
      const res = await dataService.createInvoice({ 
        customerId: header.customer_id,
        items: lines.map(line => ({
          productId: line.product_id,
          quantity: line.qty,
          unitPrice: line.unit_price,
          lineDiscount: line.line_discount,
          unit: line.unit,
          nameEn: line.name_en
        })),
        payments: rows.map(row => ({
          method: row.method,
          amount: row.amount,
          reference: row.reference || ''
        })),
        cashierId: header.cashier_id,
        shiftId: header.shift_id
      });
      onSuccess?.(res);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create invoice');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Checkout</h2>
          <button onClick={onClose} className="px-2 py-1">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>Total</div>
            <div className="font-semibold">{total.toFixed(2)}</div>
          </div>
          <div className="space-y-2">
            {rows.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={r.method} onChange={(e) => setRow(idx, { method: e.target.value.toUpperCase() })} className="px-2 py-1 border rounded w-36">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="WALLET">Wallet</option>
                </select>
                <input type="number" value={r.amount} onChange={(e) => setRow(idx, { amount: Number(e.target.value || 0) })} className="px-2 py-1 border rounded w-40 text-right" />
                <button onClick={() => removeRow(idx)} className="px-2 py-1 border rounded">Remove</button>
              </div>
            ))}
            <button onClick={addRow} className="px-2 py-1 border rounded">+ Add payment</button>
          </div>
          <div className="flex items-center justify-between">
            <div>Remaining</div>
            <div className={remaining === 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{remaining.toFixed(2)}</div>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button disabled={busy || remaining !== 0} onClick={confirm} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{busy ? 'Processing…' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}









