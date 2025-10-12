import React, { useState } from 'react';

interface Props {
  customerId: number;
  invoiceId: number;
  channel?: 'email' | 'sms';
}

export default function RemindButton({ customerId, invoiceId, channel = 'email' }: Props) {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  const send = async () => {
    setBusy(true);
    setOk(null);
    setErr(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/notifications/reminders/enqueue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, invoice_id: invoiceId, channel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enqueue reminder');
      setOk('Reminder queued');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={send} disabled={busy} className="px-3 py-1 bg-purple-600 text-white rounded disabled:opacity-50">{busy ? 'Sending...' : 'Send Reminder'}</button>
      {ok && <span className="text-green-700 text-sm">{ok}</span>}
      {err && <span className="text-red-600 text-sm">{err}</span>}
    </div>
  );
}










