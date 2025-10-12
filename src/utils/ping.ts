export type HealthResult = {
  ok: boolean;
  urlTried: string[];
  winner?: string;
  at: string;
};

export async function pingApi(base: string): Promise<HealthResult> {
  const paths = ['/api/health', '/health'];
  const tried: string[] = [];
  for (const p of paths) {
    const url = new URL(p, base).toString();
    tried.push(url);
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) {
        return { ok: true, urlTried: tried, winner: url, at: new Date().toISOString() };
      }
    } catch {}
  }
  return { ok: false, urlTried: tried, at: new Date().toISOString() };
}

export async function pingDevices(base: string): Promise<HealthResult> {
  // For now, use the main health endpoint since print health doesn't exist
  // In a real implementation, this would check printer/scanner devices
  const url = new URL('/api/health', base).toString();
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok) return { ok: true, urlTried: [url], winner: url, at: new Date().toISOString() };
  } catch {}
  return { ok: false, urlTried: [url], at: new Date().toISOString() };
}







