import React, { useState } from 'react';

interface ScalePanelProps {
  parsedWeightKg?: number | null;
  onUseWeight?: (weightKg: number) => void;
}

export default function ScalePanel({ parsedWeightKg = null, onUseWeight }: ScalePanelProps) {
  const [locked, setLocked] = useState(false);
  const [tare, setTare] = useState(0);
  const [manualWeight, setManualWeight] = useState<string>(parsedWeightKg?.toFixed(3) || '');

  const effectiveWeight = () => {
    const raw = (parsedWeightKg ?? (parseFloat(manualWeight) || 0));
    const net = Math.max(0, raw - tare);
    return Number(net.toFixed(3));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Scale</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
          <span>Lock</span>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Tare (kg)</label>
          <input type="number" step="0.001" min="0" value={tare}
            onChange={(e) => setTare(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Weight (kg)</label>
          <input type="number" step="0.001" min="0" value={manualWeight}
            onChange={(e) => setManualWeight(e.target.value)}
            disabled={locked}
            className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 disabled:opacity-60" />
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-600 mb-1">Net</div>
          <div className="text-lg font-semibold">{effectiveWeight().toFixed(3)} kg</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => setTare(0)} className="px-3 py-1 text-sm border rounded">Tare</button>
        <button type="button" onClick={() => onUseWeight?.(effectiveWeight())} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Use Weight</button>
      </div>
    </div>
  );
}


