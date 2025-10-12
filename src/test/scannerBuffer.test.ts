import { describe, it, expect } from 'vitest';
import { ScannerBuffer, parseWeightedBarcode } from '@/utils/scannerBuffer';

function key(char: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: char });
}

describe('ScannerBuffer', () => {
  it('debounces and emits full code once', async () => {
    const buf = new ScannerBuffer({ debounceMs: 5, minLength: 3 });
    let result: string | null = null;
    buf.onScan(code => (result = code));
    buf.handleKeyEvent(key('1'));
    buf.handleKeyEvent(key('2'));
    buf.handleKeyEvent(key('3'));
    await new Promise(r => setTimeout(r, 15));
    expect(result).toBe('123');
  });

  it('emits on Enter immediately', async () => {
    const buf = new ScannerBuffer({ debounceMs: 100, minLength: 2 });
    let result: string | null = null;
    buf.onScan(code => (result = code));
    buf.handleKeyEvent(key('9'));
    buf.handleKeyEvent(key('9'));
    buf.handleKeyEvent(key('Enter'));
    expect(result).toBe('99');
  });
});

describe('parseWeightedBarcode', () => {
  it('detects weighted EAN with kg', () => {
    // prefix 21, sku 12345, grams 00150 -> 0.15kg
    const code = '2112345001507';
    const res = parseWeightedBarcode(code);
    expect(res.isWeighted).toBe(true);
    expect(res.sku).toBe('12345');
    expect(res.weightKg).toBeCloseTo(0.15, 3);
  });

  it('ignores non-weighted code', () => {
    const res = parseWeightedBarcode('1234567890123');
    expect(res.isWeighted).toBe(false);
  });
});
















