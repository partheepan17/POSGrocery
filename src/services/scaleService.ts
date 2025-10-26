/**
 * Scale Service
 * Service for reading weight from digital scales
 */

export interface ScaleReading {
  weight: number;
  unit: string;
  timestamp: number;
  stable: boolean;
}

export interface ScaleConfig {
  port?: string;
  baudRate?: number;
  timeout?: number;
  retries?: number;
}

class ScaleService {
  private isConnected: boolean = false;
  private config: ScaleConfig;
  private mockWeight: number = 0;

  constructor(config: ScaleConfig = {}) {
    this.config = {
      port: config.port || 'COM3',
      baudRate: config.baudRate || 9600,
      timeout: config.timeout || 5000,
      retries: config.retries || 3,
      ...config
    };
  }

  /**
   * Initialize connection to scale
   */
  async connect(): Promise<boolean> {
    try {
      // In a real implementation, this would connect to the actual scale
      // For now, we'll simulate a connection
      console.log('🔗 Connecting to scale...', this.config);
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isConnected = true;
      console.log('✅ Scale connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to scale:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from scale
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 Scale disconnected');
  }

  /**
   * Read weight from scale
   */
  async readWeight(): Promise<ScaleReading | null> {
    if (!this.isConnected) {
      throw new Error('Scale not connected');
    }

    try {
      // Simulate reading from scale
      // In a real implementation, this would read from the actual scale hardware
      const weight = this.generateMockWeight();
      const stable = Math.random() > 0.1; // 90% chance of stable reading
      
      const reading: ScaleReading = {
        weight: parseFloat(weight.toFixed(3)),
        unit: 'kg',
        timestamp: Date.now(),
        stable
      };

      console.log('⚖️ Scale reading:', reading);
      return reading;
    } catch (error) {
      console.error('❌ Failed to read from scale:', error);
      throw error;
    }
  }

  /**
   * Get stable weight reading (waits for stable reading)
   */
  async getStableWeight(): Promise<number | null> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const reading = await this.readWeight();
        if (reading && reading.stable) {
          return reading.weight;
        }
        
        // Wait a bit before next attempt
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      } catch (error) {
        console.error('Error reading stable weight:', error);
        return null;
      }
    }

    console.warn('⚠️ Could not get stable weight reading');
    return null;
  }

  /**
   * Check if scale is connected
   */
  isScaleConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get scale configuration
   */
  getConfig(): ScaleConfig {
    return { ...this.config };
  }

  /**
   * Update scale configuration
   */
  updateConfig(newConfig: Partial<ScaleConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Generate mock weight for testing
   */
  private generateMockWeight(): number {
    // Generate realistic weight values (0.100 to 5.000 kg)
    const baseWeight = 0.1 + Math.random() * 4.9;
    const variation = (Math.random() - 0.5) * 0.02; // ±0.01 kg variation
    return Math.max(0.001, baseWeight + variation);
  }

  /**
   * Set mock weight for testing (development only)
   */
  setMockWeight(weight: number): void {
    this.mockWeight = weight;
  }

  /**
   * Test scale connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      const reading = await this.readWeight();
      return reading !== null;
    } catch (error) {
      console.error('Scale connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const scaleService = new ScaleService();

// Development helper functions
if (import.meta.env.DEV) {
  // Expose scale service to window for debugging
  (window as any).scaleService = scaleService;
  
  // Add some test weights
  (window as any).setTestWeight = (weight: number) => {
    scaleService.setMockWeight(weight);
  };
}











