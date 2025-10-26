/**
 * Terminal Service
 * Handles terminal-specific operations and data
 */

export interface TerminalData {
  terminalId: string;
  terminalName: string;
  location?: string;
  isActive: boolean;
}

export class TerminalService {
  private terminalData: TerminalData;

  constructor() {
    // Initialize with default terminal data
    this.terminalData = {
      terminalId: 'POS-001',
      terminalName: 'Main Terminal',
      location: 'Store Front',
      isActive: true,
    };

    // Load from localStorage if available
    this.loadFromStorage();
  }

  getTerminalData(): TerminalData {
    return { ...this.terminalData };
  }

  setTerminalData(data: Partial<TerminalData>): void {
    this.terminalData = { ...this.terminalData, ...data };
    this.saveToStorage();
  }

  getTerminalId(): string {
    return this.terminalData.terminalId;
  }

  getTerminalName(): string {
    return this.terminalData.terminalName;
  }

  isTerminalActive(): boolean {
    return this.terminalData.isActive;
  }

  activateTerminal(): void {
    this.terminalData.isActive = true;
    this.saveToStorage();
  }

  deactivateTerminal(): void {
    this.terminalData.isActive = false;
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('terminal-data');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.terminalData = { ...this.terminalData, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load terminal data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('terminal-data', JSON.stringify(this.terminalData));
    } catch (error) {
      console.warn('Failed to save terminal data to storage:', error);
    }
  }
}

// Singleton instance
export const terminalService = new TerminalService();