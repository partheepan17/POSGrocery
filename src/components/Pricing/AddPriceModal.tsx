import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, Product } from '@/services/dataService';

interface AddPriceModalProps {
  onClose: () => void;
  onAdded: (updated: Product) => void;
}

export function AddPriceModal({ onClose, onAdded }: AddPriceModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<number | null>(null);
  const [retail, setRetail] = useState<number>(0);
  const [wholesale, setWholesale] = useState<number>(0);
  const [credit, setCredit] = useState<number>(0);
  const [other, setOther] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const list = await dataService.getProducts({ active_filter: 'active' });
      setProducts(list);
      if (list.length > 0) setProductId(list[0].id as any);
    };
    load();
  }, []);

  const handleProductChange = (idStr: string) => {
    const id = parseInt(idStr);
    setProductId(id);
    const selected = products.find(p => (p.id as any) === id);
    if (selected) {
      setRetail(selected.price_retail || 0);
      setWholesale(selected.price_wholesale || 0);
      setCredit(selected.price_credit || 0);
      setOther(selected.price_other || 0);
    }
  };

  const handleAdd = async () => {
    if (!productId) {
      toast.error('Select a product');
      return;
    }
    try {
      setSaving(true);
      const updated = await dataService.updateProduct(productId as any, {
        price_retail: Number(retail) || 0,
        price_wholesale: Number(wholesale) || 0,
        price_credit: Number(credit) || 0,
        price_other: Number(other) || 0
      });
      toast.success('Price added');
      onAdded((updated as Product) as any);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to add price');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add Price</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select value={productId ?? ''} onChange={(e) => handleProductChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white">
              {products.map(p => (
                <option key={p.id as any} value={p.id as any}>{p.sku} — {p.name_en}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retail (රු)</label>
              <input type="number" step="0.01" value={retail} onChange={(e) => setRetail(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale (රු)</label>
              <input type="number" step="0.01" value={wholesale} onChange={(e) => setWholesale(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit (රු)</label>
              <input type="number" step="0.01" value={credit} onChange={(e) => setCredit(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other (රු)</label>
              <input type="number" step="0.01" value={other} onChange={(e) => setOther(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg">Cancel</button>
          <button onClick={handleAdd} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Adding...' : 'Add Price'}</button>
        </div>
      </div>
    </div>
  );
}


