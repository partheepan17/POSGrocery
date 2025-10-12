import React, { useEffect, useState } from 'react';

interface Batch {
  id: number;
  batch_code?: string;
  expiry?: string;
  qty_on_hand: number;
  cost?: number;
}

export default function BatchPicker({ productId, onSelect }: { productId: number; onSelect: (b: Batch|null) => void }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
        const res = await fetch(`${apiBaseUrl}/api/stock/fefo/${productId}`);
        const data = await res.json();
        setBatches(data.batches || []);
      } catch {}
      setLoading(false);
    };
    if (productId) run();
  }, [productId]);

  if (loading) return <div className="text-xs text-gray-500">Loading batches...</div>;

  return (
    <div className="space-y-1 text-sm">
      {batches.length === 0 ? (
        <div className="text-xs text-gray-500">No valid batches</div>
      ) : (
        batches.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b)}
            className="w-full flex justify-between bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded"
          >
            <span>{b.batch_code || `Batch#${b.id}`}</span>
            <span>Exp: {b.expiry || '-'}</span>
            <span>Qty: {b.qty_on_hand}</span>
          </button>
        ))
      )}
    </div>
  );
}



