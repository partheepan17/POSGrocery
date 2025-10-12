export type ScaleState = {
  isSupported: boolean;
  isConnected: boolean;
  stableWeight: number;
};

let port: any = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

export async function connect(): Promise<boolean> {
  try {
    // Web Serial API (Chromium-based browsers)
    if (typeof navigator !== 'undefined' && (navigator as any) && ('serial' in (navigator as any))) {
      const navSerial: any = (navigator as any).serial;
      port = await navSerial.requestPort();
      await port.open({ baudRate: Number((import.meta as any).env?.VITE_SCALE_BAUD || 9600) });
      reader = port.readable?.getReader?.() || null;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function disconnect() {
  try {
    if (reader) {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
      reader = null;
    }
    if (port) {
      await port.close().catch(() => {});
      port = null;
    }
  } catch {}
}

// Parse a typical ASCII weight line, e.g., "  1.234 kg" or "0.750"
function parseWeightFromChunk(chunk: string): number | null {
  const m = chunk.replace(/[^0-9.\-]/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  return parseFloat(m[0]);
}

export async function readStableWeight(timeoutMs = 1200): Promise<number> {
  // Web Serial path
  if (reader) {
    const endAt = Date.now() + timeoutMs;
    const window: number[] = [];
    const maxSamples = 6;
    const tolerance = 0.003; // 3g stability
    while (Date.now() < endAt) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const text = new TextDecoder().decode(value);
        const w = parseWeightFromChunk(text);
        if (w != null) {
          window.push(w);
          if (window.length > maxSamples) window.shift();
          if (window.length >= Math.min(3, maxSamples)) {
            const min = Math.min(...window);
            const max = Math.max(...window);
            if (Math.abs(max - min) <= tolerance) {
              const avg = window.reduce((s, n) => s + n, 0) / window.length;
              return Number(avg.toFixed(3));
            }
          }
        }
      }
    }
  }
  // Fallback bridge endpoint
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';
  const res = await fetch(`${apiBaseUrl}/api/hardware/scale/read`);
  const data = await res.json();
  return Number((data?.weight ?? 0).toFixed(3));
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as any) && (navigator as any).serial);
}

export async function tare(): Promise<void> {
  // Most scales require a specific command; sending generic might not work.
  // Left as no-op here; implement vendor-specific command in bridge if needed.
}

export function lockWeight(w: number): number {
  return Number(w.toFixed(3));
}




