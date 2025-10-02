import { KeyboardShortcut } from '@/types';

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { key: '1', ctrlKey: true, action: 'navigate', description: 'Go to Sales' },
  { key: '2', ctrlKey: true, action: 'navigate', description: 'Go to Products' },
  { key: '3', ctrlKey: true, action: 'navigate', description: 'Go to Price Management' },
  { key: '4', ctrlKey: true, action: 'navigate', description: 'Go to Suppliers' },
  { key: '5', ctrlKey: true, action: 'navigate', description: 'Go to Customers' },
  { key: '6', ctrlKey: true, action: 'navigate', description: 'Go to Discounts' },
  { key: '7', ctrlKey: true, action: 'navigate', description: 'Go to Inventory' },
  { key: '8', ctrlKey: true, action: 'navigate', description: 'Go to Reports' },
  { key: '9', ctrlKey: true, action: 'navigate', description: 'Go to Settings' },
  { key: '0', ctrlKey: true, action: 'navigate', description: 'Go to Backups' },
  
  // Sales shortcuts
  { key: 'F1', action: 'new-sale', description: 'New Sale' },
  { key: 'F2', action: 'add-product', description: 'Add Product to Sale' },
  { key: 'F3', action: 'apply-discount', description: 'Apply Discount' },
  { key: 'F4', action: 'process-payment', description: 'Process Payment' },
  { key: 'F5', action: 'print-receipt', description: 'Print Receipt' },
  { key: 'F6', action: 'void-sale', description: 'Void Sale' },
  { key: 'F7', action: 'hold-sale', description: 'Hold Sale' },
  { key: 'F8', action: 'recall-sale', description: 'Recall Sale' },
  
  // General shortcuts
  { key: 'Escape', action: 'cancel', description: 'Cancel/Close' },
  { key: 'Enter', action: 'confirm', description: 'Confirm/Submit' },
  { key: 'F9', action: 'toggle-theme', description: 'Toggle Theme' },
  { key: 'F10', action: 'toggle-fullscreen', description: 'Toggle Fullscreen' },
  { key: 'F11', action: 'focus-search', description: 'Focus Search' },
  { key: 'F12', action: 'open-dev-tools', description: 'Open Dev Tools' },
  
  // Quick actions
  { key: 'n', ctrlKey: true, action: 'new-item', description: 'New Item' },
  { key: 's', ctrlKey: true, action: 'save', description: 'Save' },
  { key: 'z', ctrlKey: true, action: 'undo', description: 'Undo' },
  { key: 'y', ctrlKey: true, action: 'redo', description: 'Redo' },
  { key: 'f', ctrlKey: true, action: 'search', description: 'Search' },
  { key: 'r', ctrlKey: true, action: 'refresh', description: 'Refresh' },
  { key: 'p', ctrlKey: true, action: 'print', description: 'Print' },
  { key: 'e', ctrlKey: true, action: 'export', description: 'Export' },
  { key: 'i', ctrlKey: true, action: 'import', description: 'Import' },
];

export class KeyboardHandler {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private listeners: Map<string, (event: KeyboardEvent) => void> = new Map();

  constructor(shortcuts: KeyboardShortcut[] = DEFAULT_SHORTCUTS) {
    this.loadShortcuts(shortcuts);
    this.setupGlobalListener();
  }

  private loadShortcuts(shortcuts: KeyboardShortcut[]): void {
    this.shortcuts.clear();
    shortcuts.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    });
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.altKey) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  private setupGlobalListener(): void {
    document.addEventListener('keydown', (event) => {
      const key = this.getShortcutKey({
        key: event.key,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        action: '',
        description: ''
      });

      const shortcut = this.shortcuts.get(key);
      if (shortcut) {
        event.preventDefault();
        this.triggerAction(shortcut.action, event);
      }
    });
  }

  private triggerAction(action: string, event: KeyboardEvent): void {
    const listener = this.listeners.get(action);
    if (listener) {
      listener(event);
    }
  }

  public addShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  public removeShortcut(action: string): void {
    const shortcut = Array.from(this.shortcuts.values()).find(s => s.action === action);
    if (shortcut) {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.delete(key);
    }
  }

  public onAction(action: string, callback: (event: KeyboardEvent) => void): () => void {
    this.listeners.set(action, callback);
    return () => this.listeners.delete(action);
  }

  public getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  public getShortcutByAction(action: string): KeyboardShortcut | undefined {
    return Array.from(this.shortcuts.values()).find(s => s.action === action);
  }
}

export const keyboardHandler = new KeyboardHandler();

