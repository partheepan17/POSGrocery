import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/utils/api';
import { pingApi, pingDevices, type HealthResult } from '@/utils/ping';

function HeaderStatus() {
  const base = getApiBaseUrl();
  const [api, setApi] = useState<HealthResult | null>(null);
  const [dev, setDev] = useState<HealthResult | null>(null);

  async function poll() {
    const [a, d] = await Promise.allSettled([pingApi(base), pingDevices(base)]);
    if (a.status === 'fulfilled') setApi(a.value);
    if (d.status === 'fulfilled') setDev(d.value);
  }

  useEffect(() => {
    poll();
    const id = setInterval(poll, 20000);
    return () => clearInterval(id);
  }, [base]);

  const badge = (title: string, res: HealthResult | null) => {
    const state = res ? (res.ok ? 'Online' : 'Offline') : 'Checking…';
    const tt = res
      ? `${title}: ${state}\nLast: ${res.at}\nTried: ${res.urlTried.join(', ')}${res.winner ? `\nOK: ${res.winner}` : ''}`
      : `${title}: Checking…`;
    const color = !res ? 'bg-gray-600' : res.ok ? 'bg-green-600' : 'bg-red-600';
    return (
      <span title={tt} className={`text-xs px-2 py-1 rounded ${color}`}>
        {title}: {state}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {badge('API', api)}
      {badge('Devices', dev)}
    </div>
  );
}

export { HeaderStatus };
export default HeaderStatus;







