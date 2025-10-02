export interface ScaleReading {
  weight: number;
  unit: string;
  stable: boolean;
  timestamp: Date;
}

export interface ScaleConfig {
  enabled: boolean;
  port?: string;
  baudRate?: number;
  timeout: number;
  unit: 'kg' | 'g' | 'lb' | 'oz';
  precision: number;
}

export abstract class ScaleAdapter {
  protected config: ScaleConfig;
  protected listeners: Set<(reading: ScaleReading) => void> = new Set();
  protected isConnected = false;

  constructor(config: ScaleConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isAvailable(): Promise<boolean>;
  abstract getReading(): Promise<ScaleReading | null>;
  abstract startContinuousReading(): Promise<void>;
  abstract stopContinuousReading(): Promise<void>;

  onReading(callback: (reading: ScaleReading) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  protected emitReading(reading: ScaleReading): void {
    this.listeners.forEach(callback => callback(reading));
  }

  updateConfig(config: Partial<ScaleConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export class WebScaleAdapter extends ScaleAdapter {
  private continuousInterval?: NodeJS.Timeout;

  async connect(): Promise<void> {
    if (!this.config.enabled) return;
    
    // In a real implementation, this would connect to a serial port or USB scale
    // For now, we'll simulate the connection
    this.isConnected = true;
    console.log('Scale connected (simulated)');
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.continuousInterval) {
      clearInterval(this.continuousInterval);
      this.continuousInterval = undefined;
    }
    console.log('Scale disconnected');
  }

  async isAvailable(): Promise<boolean> {
    // Check if Web Serial API is available
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  async getReading(): Promise<ScaleReading | null> {
    if (!this.isConnected) return null;

    // Simulate scale reading
    const weight = Math.random() * 5 + 0.1; // Random weight between 0.1 and 5.1
    const stable = Math.random() > 0.1; // 90% chance of stable reading

    return {
      weight: parseFloat(weight.toFixed(this.config.precision)),
      unit: this.config.unit,
      stable,
      timestamp: new Date(),
    };
  }

  async startContinuousReading(): Promise<void> {
    if (!this.isConnected) return;

    this.continuousInterval = setInterval(async () => {
      const reading = await this.getReading();
      if (reading) {
        this.emitReading(reading);
      }
    }, 1000); // Read every second
  }

  async stopContinuousReading(): Promise<void> {
    if (this.continuousInterval) {
      clearInterval(this.continuousInterval);
      this.continuousInterval = undefined;
    }
  }
}

export class SerialScaleAdapter extends ScaleAdapter {
  private port?: any; // SerialPort type not available in browser
  private reader?: ReadableStreamDefaultReader;
  private continuousInterval?: NodeJS.Timeout;

  async connect(): Promise<void> {
    if (!this.config.enabled) return;
    
    try {
      // Request access to serial port
      this.port = await (navigator as any).serial.requestPort({
        filters: [
          { usbVendorId: 0x1234 }, // Example vendor ID
          { usbProductId: 0x5678 }, // Example product ID
        ],
      });

      // Open the port
      await this.port.open({
        baudRate: this.config.baudRate || 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });

      this.isConnected = true;
      console.log('Serial scale connected');
    } catch (error) {
      console.error('Failed to connect to scale:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.reader) {
      await this.reader.cancel();
      this.reader = undefined;
    }

    if (this.port) {
      await this.port.close();
      this.port = undefined;
    }

    if (this.continuousInterval) {
      clearInterval(this.continuousInterval);
      this.continuousInterval = undefined;
    }

    this.isConnected = false;
    console.log('Serial scale disconnected');
  }

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  async getReading(): Promise<ScaleReading | null> {
    if (!this.isConnected || !this.port) return null;

    try {
      const writer = this.port.writable?.getWriter();
      if (!writer) return null;

      // Send command to get weight (example command)
      const command = new TextEncoder().encode('W\r\n');
      await writer.write(command);
      writer.releaseLock();

      // Read response
      const reader = this.port.readable?.getReader();
      if (!reader) return null;

      const { value, done } = await reader.read();
      reader.releaseLock();

      if (done || !value) return null;

      const response = new TextDecoder().decode(value);
      const match = response.match(/(\d+\.?\d*)/);
      
      if (match) {
        const weight = parseFloat(match[1]);
        return {
          weight: parseFloat(weight.toFixed(this.config.precision)),
          unit: this.config.unit,
          stable: true,
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error reading from scale:', error);
      return null;
    }
  }

  async startContinuousReading(): Promise<void> {
    if (!this.isConnected) return;

    this.continuousInterval = setInterval(async () => {
      const reading = await this.getReading();
      if (reading) {
        this.emitReading(reading);
      }
    }, 2000); // Read every 2 seconds
  }

  async stopContinuousReading(): Promise<void> {
    if (this.continuousInterval) {
      clearInterval(this.continuousInterval);
      this.continuousInterval = undefined;
    }
  }
}

export class ElectronScaleAdapter extends ScaleAdapter {
  async connect(): Promise<void> {
    if (!this.config.enabled) return;
    
    // Implementation for Electron app with native serial communication
    console.log('Electron scale connected');
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('Electron scale disconnected');
  }

  async isAvailable(): Promise<boolean> {
    return false; // Not available in browser
  }

  async getReading(): Promise<ScaleReading | null> {
    // Implementation would use native serial communication in Electron
    return null;
  }

  async startContinuousReading(): Promise<void> {
    // Implementation for Electron
  }

  async stopContinuousReading(): Promise<void> {
    // Implementation for Electron
  }
}

// Factory function to get the appropriate adapter
export function createScaleAdapter(config: ScaleConfig): ScaleAdapter {
  if (typeof window !== 'undefined') {
    // Check for Web Serial API first
    if ('serial' in navigator) {
      return new SerialScaleAdapter(config);
    }
    
    // Fallback to simulated adapter
    return new WebScaleAdapter(config);
  }
  
  return new ElectronScaleAdapter(config);
}
