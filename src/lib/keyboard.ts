/**
 * Keyboard Manager
 * Handles global keyboard shortcuts and navigation
 */

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description?: string;
}

export class KeyboardManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isEnabled: boolean = true;

  register(shortcut: KeyboardShortcut): void {
    const key = this.generateKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  unregister(shortcut: KeyboardShortcut): void {
    const key = this.generateKey(shortcut);
    this.shortcuts.delete(key);
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  private generateKey(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push('ctrl');
    if (shortcut.altKey) modifiers.push('alt');
    if (shortcut.shiftKey) modifiers.push('shift');
    
    return `${modifiers.join('+')}+${shortcut.key}`.toLowerCase();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    // Don't trigger shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }

    const key = this.generateKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      action: () => {},
    });

    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  };

  initialize(): void {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
  }
}

// Singleton instance
export const keyboardManager = new KeyboardManager();

// Initialize on module load
if (typeof window !== 'undefined') {
  keyboardManager.initialize();
}

// POS-specific shortcuts
export const POS_SHORTCUTS = {
  SALES: {
    key: '1',
    ctrlKey: true,
    description: 'Go to Sales',
  },
  PRODUCTS: {
    key: '2',
    ctrlKey: true,
    description: 'Go to Products',
  },
  CUSTOMERS: {
    key: '3',
    ctrlKey: true,
    description: 'Go to Customers',
  },
  SUPPLIERS: {
    key: '4',
    ctrlKey: true,
    description: 'Go to Suppliers',
  },
  PRICE_MANAGEMENT: {
    key: '5',
    ctrlKey: true,
    description: 'Go to Price Management',
  },
  DISCOUNTS: {
    key: '6',
    ctrlKey: true,
    description: 'Go to Discounts',
  },
  INVENTORY: {
    key: '7',
    ctrlKey: true,
    description: 'Go to Inventory',
  },
  REPORTS: {
    key: '8',
    ctrlKey: true,
    description: 'Go to Reports',
  },
  SETTINGS: {
    key: '9',
    ctrlKey: true,
    description: 'Go to Settings',
  },
  HELD_SALES: {
    key: 'h',
    ctrlKey: true,
    description: 'View Held Sales',
  },
  SHIFTS: {
    key: 's',
    ctrlKey: true,
    description: 'Go to Shifts',
  },
  GRN: {
    key: 'g',
    ctrlKey: true,
    description: 'Go to GRN',
  },
  USERS: {
    key: 'u',
    ctrlKey: true,
    description: 'Go to Users',
  },
  AUDIT: {
    key: 'a',
    ctrlKey: true,
    description: 'Go to Audit',
  },
  HEALTH: {
    key: 'h',
    ctrlKey: true,
    description: 'Go to Health Check',
  },
  ABOUT: {
    key: 'i',
    ctrlKey: true,
    description: 'Go to About',
  },
};