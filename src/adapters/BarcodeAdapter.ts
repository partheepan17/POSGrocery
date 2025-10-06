export interface BarcodeData {
  code: string;
  format: string;
  timestamp: Date;
}

export interface BarcodeScannerConfig {
  enabled: boolean;
  continuousScan: boolean;
  timeout: number;
  formats: string[];
}

export abstract class BarcodeAdapter {
  protected config: BarcodeScannerConfig;
  protected listeners: Set<(data: BarcodeData) => void> = new Set();

  constructor(config: BarcodeScannerConfig) {
    this.config = config;
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract isAvailable(): Promise<boolean>;
  abstract scan(): Promise<BarcodeData | null>;

  onScan(callback: (data: BarcodeData) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  protected emitScan(data: BarcodeData): void {
    this.listeners.forEach(callback => callback(data));
  }

  updateConfig(config: Partial<BarcodeScannerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export class WebBarcodeAdapter extends BarcodeAdapter {
  private isScanning = false;

  async start(): Promise<void> {
    if (!this.config.enabled) return;
    
    // In a real implementation, this would use the Web Barcode Detection API
    // or a library like QuaggaJS or ZXing
    this.isScanning = true;
    console.log('Barcode scanner started (simulated)');
  }

  async stop(): Promise<void> {
    this.isScanning = false;
    console.log('Barcode scanner stopped');
  }

  async isAvailable(): Promise<boolean> {
    // Check if Web Barcode Detection API is available
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
  }

  async scan(): Promise<BarcodeData | null> {
    if (!this.isScanning) return null;

    // Simulate barcode scanning
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockBarcodes = [
          { code: '1234567890123', format: 'EAN_13' },
          { code: '123456789012', format: 'UPC_A' },
          { code: '12345678901', format: 'CODE_128' },
        ];
        
        const randomBarcode = mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)];
        resolve({
          code: randomBarcode.code,
          format: randomBarcode.format,
          timestamp: new Date(),
        });
      }, 1000);
    });
  }
}

export class QuaggaBarcodeAdapter extends BarcodeAdapter {
  private isScanning = false;

  async start(): Promise<void> {
    if (!this.config.enabled) return;
    
    // Implementation using QuaggaJS library
    this.isScanning = true;
    console.log('QuaggaJS barcode scanner started');
  }

  async stop(): Promise<void> {
    this.isScanning = false;
    console.log('QuaggaJS barcode scanner stopped');
  }

  async isAvailable(): Promise<boolean> {
    // Check if QuaggaJS is loaded
    return typeof window !== 'undefined' && 'Quagga' in window;
  }

  async scan(): Promise<BarcodeData | null> {
    if (!this.isScanning) return null;

    // Implementation would use QuaggaJS to scan barcodes
    return null;
  }
}

export class ElectronBarcodeAdapter extends BarcodeAdapter {
  async start(): Promise<void> {
    if (!this.config.enabled) return;
    
    // Implementation for Electron app with native barcode scanning
    console.log('Electron barcode scanner started');
  }

  async stop(): Promise<void> {
    console.log('Electron barcode scanner stopped');
  }

  async isAvailable(): Promise<boolean> {
    return false; // Not available in browser
  }

  async scan(): Promise<BarcodeData | null> {
    // Implementation would use native barcode scanning in Electron
    return null;
  }
}

// Factory function to get the appropriate adapter
export function createBarcodeAdapter(config: BarcodeScannerConfig): BarcodeAdapter {
  if (typeof window !== 'undefined') {
    // Check for QuaggaJS first
    if ('Quagga' in window) {
      return new QuaggaBarcodeAdapter(config);
    }
    
    // Fallback to Web Barcode Detection API
    return new WebBarcodeAdapter(config);
  }
  
  return new ElectronBarcodeAdapter(config);
}









