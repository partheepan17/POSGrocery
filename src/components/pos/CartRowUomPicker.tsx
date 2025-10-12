import React, { useEffect, useState } from 'react';
import { deriveUnitPrice, convertToBase, Uom } from '@/core/uom';

interface Props {
  productId: number;
  baseUnitPrice: number;
  quantity: number;
  onChange: (uom: Uom, derivedUnitPrice: number, qtyInBase: number) => void;
}

export default function CartRowUomPicker({ productId, baseUnitPrice, quantity, onChange }: Props) {
  const [uoms, setUoms] = useState<Uom[]>([]);
  const [selected, setSelected] = useState<Uom | null>(null);
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${apiBaseUrl}/api/products/${productId}/uom`);
      const data = await res.json();
      const rows: Uom[] = (data.uoms || []).map((r: any) => ({ code: r.code, name: r.name, conv_to_base: Number(r.conv_to_base), price_override: r.price_override != null ? Number(r.price_override) : null }));
      setUoms(rows);
      if (rows.length) {
        const first = rows[0];
        setSelected(first);
        const price = deriveUnitPrice(baseUnitPrice, first);
        const baseQty = convertToBase(quantity, first);
        onChange(first, price, baseQty);
      }
    };
    if (productId) load();
  }, [productId]);

  const select = (code: string) => {
    const uom = uoms.find(u => u.code === code) || null;
    setSelected(uom);
    if (uom) {
      const price = deriveUnitPrice(baseUnitPrice, uom);
      const baseQty = convertToBase(quantity, uom);
      onChange(uom, price, baseQty);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select value={selected?.code || ''} onChange={(e) => select(e.target.value)} className="px-2 py-1 border rounded">
        {uoms.map((u) => (
          <option key={u.code} value={u.code}>{u.name}</option>
        ))}
      </select>
      {selected && (
        <div className="text-xs text-gray-600">x{selected.conv_to_base} of base</div>
      )}
    </div>
  );
}










