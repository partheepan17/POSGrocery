/**
 * Centralized keyboard shortcuts management
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export class KeyboardManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isEnabled = true;

  constructor() {
    this.bindGlobalHandler();
  }

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    const key = this.getKeyString(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string, ctrl = false, alt = false, shift = false): void {
    const keyString = this.getKeyString({ key, ctrl, alt, shift });
    this.shortcuts.delete(keyString);
  }

  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get key string for mapping
   */
  private getKeyString(shortcut: Omit<KeyboardShortcut, 'action' | 'description'>): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.shift) parts.push('shift');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const keyString = this.getKeyString({
      key: event.key,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey
    });

    const shortcut = this.shortcuts.get(keyString);
    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  };

  /**
   * Bind global keyboard handler
   */
  private bindGlobalHandler(): void {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
  }
}

// Global keyboard manager instance
export const keyboardManager = new KeyboardManager();

// Predefined shortcuts for POS system
export const POS_SHORTCUTS = {
  // Navigation
  SALES: { key: '1', ctrl: true, description: 'Go to Sales' },
  PRODUCTS: { key: '2', ctrl: true, description: 'Go to Products' },
  PRICE_MANAGEMENT: { key: '3', ctrl: true, description: 'Go to Price Management' },
  SUPPLIERS: { key: '4', ctrl: true, description: 'Go to Suppliers' },
  CUSTOMERS: { key: '5', ctrl: true, description: 'Go to Customers' },
  DISCOUNTS: { key: '6', ctrl: true, description: 'Go to Discounts' },
  SHIFTS: { key: 'S', ctrl: true, shift: true, description: 'Go to Shifts' },

  // Sales operations
  HELD_SALES: { key: 'F2', description: 'Open Held Sales' },
  HOLD_SALE: { key: 'F5', description: 'Hold Current Sale' },
  RESUME_HOLD: { key: 'F6', description: 'Resume Held Sale' },
  CASH_PAYMENT: { key: 'F7', description: 'Cash Payment' },
  CARD_PAYMENT: { key: 'F8', description: 'Card Payment' },
  RETURNS: { key: 'F9', description: 'Go to Returns' },
  CREDIT_PAYMENT: { key: 'F10', description: 'Credit Payment' },
  START_RETURN: { key: 'F11', description: 'Start Return' },
  SHIFT_REPORTS: { key: 'F12', description: 'Shift Reports' },

  // Quick tender
  EXACT_AMOUNT: { key: '1', alt: true, description: 'Exact Amount' },
  TENDER_500: { key: '2', alt: true, description: 'Tender 500' },
  TENDER_1000: { key: '3', alt: true, description: 'Tender 1000' },

  // Other
  PRINT_RECEIPT: { key: 'P', ctrl: true, description: 'Print Receipt' },
  LOGOUT: { key: 'L', ctrl: true, description: 'Logout' }
} as const;

