import React, { useEffect, useState } from 'react';
import { healthCheckService } from '@/services/healthCheckService';
import { getApiBaseUrl } from '@/utils/api';
import { pingDevices, type HealthResult } from '@/utils/ping';

function HeaderStatus() {
  const base = getApiBaseUrl();
  const [api, setApi] = useState<HealthResult | null>(null);
  const [dev, setDev] = useState<HealthResult | null>(null);

  async function pollDevices() {
    const d = await pingDevices(base);
    setDev(d);
  }

  useEffect(() => {
    // Subscribe to centralized health check service
    const unsubscribe = healthCheckService.subscribe((result) => {
      setApi({
        ok: result.isOnline,
        at: result.lastChecked.toISOString(),
        urlTried: [base + '/api/health'],
        winner: result.isOnline ? base + '/api/health' : undefined
      });
    });

    // Poll devices less frequently (every 5 minutes)
    pollDevices();
    const deviceInterval = setInterval(pollDevices, 300000); // 5 minutes

    return () => {
      unsubscribe();
      clearInterval(deviceInterval);
    };
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







