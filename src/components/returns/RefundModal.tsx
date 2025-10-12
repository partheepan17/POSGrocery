import React, { useEffect, useMemo, useState } from 'react';
import { X, ShieldCheck, DollarSign } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { toast } from 'react-hot-toast';

type PaymentSplit = { method: 'CASH' | 'CARD' | 'WALLET' | 'OTHER'; amount: number };

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  original_invoice_id: number;
  original_total: number;
  original_payments: PaymentSplit[];
  refund_lines: { item_id: number; refund_amount: number }[];
}

export function RefundModalInternal({ isOpen, onClose, original_invoice_id, original_total, original_payments, refund_lines }: RefundModalProps) {
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [reason, setReason] = useState('');
  const refundTotal = useMemo(() => refund_lines.reduce((s, l) => s + Number(l.refund_amount || 0), 0), [refund_lines]);

  // Default: proportional split from original methods
  useEffect(() => {
    const totalPaid = original_payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (totalPaid > 0) {
      const proportional = original_payments.map((p) => ({
        method: p.method,
        amount: parseFloat((-refundTotal * (p.amount / totalPaid)).toFixed(2))
      })) as PaymentSplit[];
      setSplits(proportional);
    } else {
      // fallback single CASH negative
      setSplits([{ method: 'CASH', amount: -refundTotal }]);
    }
  }, [original_payments, refundTotal]);

  const setSplit = (idx: number, amt: number) => {
    const next = splits.slice();
    next[idx] = { ...next[idx], amount: amt };
    setSplits(next);
  };

  const totalOverride = useMemo(() => splits.reduce((s, p) => s + Number(p.amount || 0), 0), [splits]);

  const submitRefund = async () => {
    try {
      const payload: any = {
        original_invoice_id,
        lines: refund_lines,
        reason,
        operator_id: 1
      };
      if (overrideEnabled) {
        payload.override_methods = splits;
        payload.manager_pin = managerPin;
      }

      const res = await dataService.createRefund(payload);
      toast.success(`Refund created #${res.refund_invoice_id}`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Refund failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Process Refund</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-3">
              <div className="text-sm text-gray-500">Original Invoice</div>
              <div className="text-sm">ID: {original_invoice_id}</div>
              <div className="text-sm">Total: {original_total.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-3">
              <div className="text-sm text-gray-500">Refund</div>
              <div className="text-sm">Lines: {refund_lines.length}</div>
              <div className="text-sm font-semibold">Refund Total: {refundTotal.toFixed(2)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Payment method allocation</div>
              <label className="inline-flex items-center space-x-2 text-sm">
                <input type="checkbox" checked={overrideEnabled} onChange={(e) => setOverrideEnabled(e.target.checked)} />
                <span>Override methods</span>
              </label>
            </div>

            <div className="space-y-2">
              {splits.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/30 p-2 rounded">
                  <div className="text-sm w-24">{s.method}</div>
                  <input
                    type="number"
                    className="w-36 text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-1"
                    value={s.amount}
                    disabled={!overrideEnabled}
                    onChange={(e) => setSplit(idx, Number(e.target.value))}
                    step={0.01}
                  />
                </div>
              ))}
            </div>

            {overrideEnabled && (
              <div className="text-xs text-gray-500">Override total: {totalOverride.toFixed(2)} (must equal negative refund total: {(-refundTotal).toFixed(2)})</div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Reason (optional)</label>
            <input className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          {overrideEnabled && (
            <div className="space-y-2">
              <label className="block text-sm font-medium flex items-center space-x-2"><ShieldCheck className="w-4 h-4" /><span>Manager PIN</span></label>
              <input type="password" className="w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2" value={managerPin} onChange={(e) => setManagerPin(e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 p-3">
          <button onClick={onClose} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">Cancel</button>
          <button
            onClick={submitRefund}
            disabled={overrideEnabled && (managerPin.length < 4 || Math.abs(totalOverride - -refundTotal) > 0.01)}
            className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Confirm Refund
          </button>
        </div>
      </div>
    </div>
  );
}

export default RefundModalInternal;



