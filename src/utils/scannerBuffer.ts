/**
 * HID barcode scanner buffer with debounce to capture full scan bursts.
 * - Accumulates key events that look like a fast scan
 * - Emits the captured code after quiet period
 * - Ignores modifier/navigation keys
 */

export type ScanListener = (code: string) => void;

export interface ScannerBufferOptions {
  debounceMs?: number; // quiet time to consider scan complete
  minLength?: number; // minimal length to consider as scan
  maxLength?: number; // optional guard
}

const DEFAULTS: Required<ScannerBufferOptions> = {
  debounceMs: 30,
  minLength: 6,
  maxLength: 128,
};

export class ScannerBuffer {
  private buffer: string = '';
  private timer: any = null;
  private readonly opts: Required<ScannerBufferOptions>;
  private listener: ScanListener | null = null;

  constructor(options?: ScannerBufferOptions) {
    this.opts = { ...DEFAULTS, ...(options || {}) };
  }

  onScan(listener: ScanListener) {
    this.listener = listener;
  }

  clear() {
    this.buffer = '';
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  handleKeyEvent(e: KeyboardEvent) {
    // Ignore modifier/navigation keys
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Shift' || e.key === 'Tab') return;

    // End of scan on Enter
    if (e.key === 'Enter') {
      const code = this.buffer;
      this.clear();
      if (code.length >= this.opts.minLength && code.length <= this.opts.maxLength) {
        this.listener && this.listener(code);
      }
      return;
    }

    // Only process single visible characters
    if (e.key.length === 1) {
      this.buffer += e.key;
      if (this.buffer.length > this.opts.maxLength) {
        // Guard against runaway input
        this.buffer = this.buffer.slice(-this.opts.maxLength);
      }
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        const code = this.buffer;
        this.clear();
        if (code.length >= this.opts.minLength) {
          this.listener && this.listener(code);
        }
      }, this.opts.debounceMs);
    }
  }
}

// Weighted barcode parsing (EAN-13 with price/weight pattern, configurable if needed)
export interface WeightedParse {
  isWeighted: boolean;
  sku?: string;
  weightKg?: number;
}

/**
 * Simple parser for weighted EAN-13 like 20/21 prefix:
 *  - 2 digits prefix (20-29) indicate variable measure
 *  - 5 digits item code
 *  - 5 digits weight (in grams) or price depending on scheme
 *  - 1 digit checksum (ignored here)
 */
export function parseWeightedBarcode(code: string): WeightedParse {
  if (!/^\d{13}$/.test(code)) return { isWeighted: false };
  const prefix = code.slice(0, 2);
  const variablePrefixes = new Set(['20', '21', '22', '23', '24', '25', '26', '27', '28', '29']);
  if (!variablePrefixes.has(prefix)) return { isWeighted: false };
  const sku = code.slice(2, 7);
  const weightPart = code.slice(7, 12); // grams
  const grams = parseInt(weightPart, 10);
  if (Number.isNaN(grams)) return { isWeighted: false };
  const weightKg = grams / 1000;
  return { isWeighted: true, sku, weightKg };
}






