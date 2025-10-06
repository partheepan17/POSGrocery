/**
 * Hold Service
 * Manages parked sales with search, expiry, and resume functionality
 */

import { dataService } from './dataService';
import { authService } from './authService';

export interface HoldInput {
  hold_name: string;
  customer_id?: number;
  note?: string;
  terminal_name: string;
  cashier_id: number;
  price_tier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  lines: HoldLineInput[];
  expiry_minutes?: number;
}

export interface HoldLineInput {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
}

export interface HoldSale {
  id: number;
  hold_name: string;
  customer_id?: number;
  customer_name?: string;
  cashier_id: number;
  cashier_name?: string;
  terminal_name: string;
  price_tier: string;
  created_at: string;
  expires_at?: string;
  hold_note?: string;
  status: 'HELD' | 'EXPIRED';
  items_count: number;
  subtotal: number;
  discount: number;
  net: number;
  lines?: HoldLine[];
}

export interface HoldLine {
  id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
}

export interface HoldFilters {
  terminal?: string;
  cashier_id?: number;
  customer_id?: number;
  search?: string;
  status?: 'HELD' | 'EXPIRED' | 'ALL';
  only_mine?: boolean;
}

export interface ResumeOptions {
  mode: 'replace' | 'merge' | 'append';
  lock_prices: boolean;
}

export interface HoldSettings {
  enabled: boolean;
  maxHoldsPerTerminal: number;
  expiryMinutes: number;
  purgeOnOpen: boolean;
  lockPricesDefault: boolean;
  requireCustomerForHold: boolean;
  printHoldSlipOnCreate: boolean;
}

class HoldService {
  private defaultSettings: HoldSettings = {
    enabled: true,
    maxHoldsPerTerminal: 10,
    expiryMinutes: 720, // 12 hours
    purgeOnOpen: true,
    lockPricesDefault: false,
    requireCustomerForHold: false,
    printHoldSlipOnCreate: false
  };

  /**
   * Create a new hold
   */
  async createHold(input: HoldInput): Promise<HoldSale> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const settings = this.getHoldSettings();
      if (!settings.enabled) {
        throw new Error('Hold functionality is disabled');
      }

      // Check hold limits
      const existingHolds = await this.listHolds({ 
        terminal: input.terminal_name, 
        status: 'HELD' 
      });
      
      if (existingHolds.length >= settings.maxHoldsPerTerminal) {
        throw new Error(`Maximum ${settings.maxHoldsPerTerminal} holds per terminal reached`);
      }

      // Calculate totals
      const subtotal = input.lines.reduce((sum, line) => sum + (line.unit_price * line.quantity), 0);
      const discount = input.lines.reduce((sum, line) => sum + line.discount_amount, 0);
      const tax = input.lines.reduce((sum, line) => sum + line.tax_amount, 0);
      const net = subtotal - discount + tax;

      // Calculate expiry
      let expiresAt: string | null = null;
      if (settings.expiryMinutes > 0) {
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + (input.expiry_minutes || settings.expiryMinutes));
        expiresAt = expiry.toISOString();
      }

      // Create hold sale record
      const holdResult = await dataService.execute(
        `INSERT INTO sales (
          status, hold_name, customer_id, cashier_id, terminal_name, 
          price_tier, total_amount, tax_amount, discount_amount,
          expires_at, hold_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'HELD',
          input.hold_name,
          input.customer_id || null,
          input.cashier_id,
          input.terminal_name,
          input.price_tier,
          net,
          tax,
          discount,
          expiresAt,
          input.note || null,
          new Date().toISOString()
        ]
      );

      const holdId = holdResult.lastInsertRowid || Date.now();

      // Create hold line items
      for (const line of input.lines) {
        await dataService.execute(
          `INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, 
            discount_amount, tax_amount, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            holdId,
            line.product_id,
            line.quantity,
            line.unit_price,
            line.discount_amount,
            line.tax_amount,
            line.total_amount
          ]
        );
      }

      // Get the created hold with details
      const holds = await this.getHoldById(holdId);
      if (!holds) {
        throw new Error('Failed to retrieve created hold');
      }

      console.log(`Hold created: ${input.hold_name} (ID: ${holdId})`);
      return holds;

    } catch (error) {
      console.error('Failed to create hold:', error);
      throw error;
    }
  }

  /**
   * Update hold details
   */
  async updateHold(holdId: number, patch: {
    hold_name?: string;
    note?: string;
    expires_at?: string;
    customer_id?: number;
  }): Promise<void> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (patch.hold_name !== undefined) {
        updates.push('hold_name = ?');
        values.push(patch.hold_name);
      }

      if (patch.note !== undefined) {
        updates.push('hold_note = ?');
        values.push(patch.note);
      }

      if (patch.expires_at !== undefined) {
        updates.push('expires_at = ?');
        values.push(patch.expires_at);
      }

      if (patch.customer_id !== undefined) {
        updates.push('customer_id = ?');
        values.push(patch.customer_id);
      }

      if (updates.length === 0) {
        return;
      }

      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(holdId);

      await dataService.execute(
        `UPDATE sales SET ${updates.join(', ')} WHERE id = ? AND status = 'HELD'`,
        values
      );

    } catch (error) {
      console.error('Failed to update hold:', error);
      throw error;
    }
  }

  /**
   * Resume a hold with specified options
   */
  async resumeHold(holdId: number, options: ResumeOptions): Promise<HoldSale> {
    try {
      const hold = await this.getHoldById(holdId);
      if (!hold) {
        throw new Error('Hold not found');
      }

      // Check if expired and warn
      if (hold.status === 'EXPIRED') {
        console.warn(`Resuming expired hold: ${hold.hold_name}`);
      }

      // Mark hold as resumed (convert to regular sale)
      await dataService.execute(
        'UPDATE sales SET status = ?, updated_at = ? WHERE id = ?',
        ['SALE', new Date().toISOString(), holdId]
      );

      // Return hold data for cart reconstruction
      return hold;

    } catch (error) {
      console.error('Failed to resume hold:', error);
      throw error;
    }
  }

  /**
   * List holds with filters
   */
  async listHolds(filters: HoldFilters = {}): Promise<HoldSale[]> {
    try {
      // Get all sales with status 'HELD'
      const sales = await dataService.query<any>('SELECT * FROM sales WHERE status = ?', ['HELD']);
      
      // Get all customers and users for lookup
      const customers = await dataService.query<any>('SELECT * FROM customers');
      const users = await dataService.query<any>('SELECT * FROM users');
      const saleItems = await dataService.query<any>('SELECT * FROM sale_items');

      // Create lookup maps
      const customerMap = new Map(customers.map(c => [c.id, c]));
      const userMap = new Map(users.map(u => [u.id, u]));
      const saleItemsMap = new Map<number, any[]>();
      
      // Group sale items by sale_id
      saleItems.forEach(item => {
        if (!saleItemsMap.has(item.sale_id)) {
          saleItemsMap.set(item.sale_id, []);
        }
        saleItemsMap.get(item.sale_id)!.push(item);
      });

      // Filter and process holds
      let filteredSales = sales;

      if (filters.terminal) {
        filteredSales = filteredSales.filter(sale => sale.terminal_name === filters.terminal);
      }

      if (filters.cashier_id) {
        filteredSales = filteredSales.filter(sale => sale.cashier_id === filters.cashier_id);
      }

      if (filters.customer_id) {
        filteredSales = filteredSales.filter(sale => sale.customer_id === filters.customer_id);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredSales = filteredSales.filter(sale => {
          const customer = customerMap.get(sale.customer_id);
          const user = userMap.get(sale.cashier_id);
          return (
            sale.hold_name?.toLowerCase().includes(searchTerm) ||
            customer?.customer_name?.toLowerCase().includes(searchTerm) ||
            user?.name?.toLowerCase().includes(searchTerm)
          );
        });
      }

      // Process results and check expiry
      const now = new Date();
      const holds: HoldSale[] = filteredSales.map(sale => {
        const customer = customerMap.get(sale.customer_id);
        const user = userMap.get(sale.cashier_id);
        const items = saleItemsMap.get(sale.id) || [];
        
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const isExpired = sale.expires_at && new Date(sale.expires_at) < now;

        return {
          id: sale.id,
          hold_name: sale.hold_name,
          customer_id: sale.customer_id,
          customer_name: customer?.customer_name,
          cashier_id: sale.cashier_id,
          cashier_name: user?.name,
          terminal_name: sale.terminal_name,
          price_tier: sale.price_tier,
          created_at: sale.created_at,
          expires_at: sale.expires_at,
          hold_note: sale.hold_note,
          status: isExpired ? 'EXPIRED' : 'HELD',
          items_count: items.length,
          subtotal: subtotal,
          discount: sale.discount_amount || 0,
          net: sale.total_amount || 0
        };
      });

      // Sort by created_at DESC
      holds.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return holds;

    } catch (error) {
      console.error('Failed to list holds:', error);
      throw error;
    }
  }

  /**
   * Get hold by ID with line items
   */
  async getHoldById(holdId: number): Promise<HoldSale | null> {
    try {
      // Get the hold sale
      const holds = await dataService.query<any>('SELECT * FROM sales WHERE id = ? AND status = ?', [holdId, 'HELD']);

      if (holds.length === 0) {
        return null;
      }

      const hold = holds[0];

      // Get customer and user info
      const customers = await dataService.query<any>('SELECT * FROM customers WHERE id = ?', [hold.customer_id]);
      const users = await dataService.query<any>('SELECT * FROM users WHERE id = ?', [hold.cashier_id]);
      const customer = customers[0];
      const user = users[0];

      // Get line items
      const saleItems = await dataService.query<any>('SELECT * FROM sale_items WHERE sale_id = ?', [holdId]);
      
      // Get product info for each line item
      const lines = await Promise.all(saleItems.map(async (item: any) => {
        const products = await dataService.query<any>('SELECT * FROM products WHERE id = ?', [item.product_id]);
        const product = products[0];
        
        return {
          id: item.id,
          product_id: item.product_id,
          product_sku: product?.sku || 'Unknown',
          product_name: product?.name_en || 'Unknown Product',
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount || 0,
          tax_amount: item.tax_amount || 0,
          total_amount: item.total_amount
        };
      }));

      // Check if expired
      const now = new Date();
      const isExpired = hold.expires_at && new Date(hold.expires_at) < now;

      return {
        id: hold.id,
        hold_name: hold.hold_name,
        customer_id: hold.customer_id,
        customer_name: customer?.customer_name,
        cashier_id: hold.cashier_id,
        cashier_name: user?.name,
        terminal_name: hold.terminal_name,
        price_tier: hold.price_tier,
        created_at: hold.created_at,
        expires_at: hold.expires_at,
        hold_note: hold.hold_note,
        status: isExpired ? 'EXPIRED' : 'HELD',
        items_count: lines.length,
        subtotal: lines.reduce((sum: number, line: any) => sum + (line.quantity * line.unit_price), 0),
        discount: hold.discount_amount || 0,
        net: hold.total_amount || 0,
        lines: lines
      };

    } catch (error) {
      console.error('Failed to get hold by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a hold
   */
  async deleteHold(holdId: number): Promise<void> {
    try {
      // Delete line items first
      await dataService.execute(
        'DELETE FROM sale_items WHERE sale_id = ?',
        [holdId]
      );

      // Delete hold record
      await dataService.execute(
        'DELETE FROM sales WHERE id = ? AND status = "HELD"',
        [holdId]
      );

      console.log(`Hold ${holdId} deleted`);

    } catch (error) {
      console.error('Failed to delete hold:', error);
      throw error;
    }
  }

  /**
   * Purge expired holds
   */
  async purgeExpired(): Promise<number> {
    try {
      const settings = this.getHoldSettings();
      if (!settings.enabled || settings.expiryMinutes === 0) {
        return 0;
      }

      const now = new Date().toISOString();
      
      // Get expired holds
      const expiredHolds = await dataService.query<any>(
        'SELECT id FROM sales WHERE status = "HELD" AND expires_at < ?',
        [now]
      );

      let purgedCount = 0;

      for (const hold of expiredHolds) {
        await this.deleteHold(hold.id);
        purgedCount++;
      }

      if (purgedCount > 0) {
        console.log(`Purged ${purgedCount} expired holds`);
      }

      return purgedCount;

    } catch (error) {
      console.error('Failed to purge expired holds:', error);
      throw error;
    }
  }

  /**
   * Transfer hold to another terminal
   */
  async transferHold(holdId: number, toTerminal: string): Promise<void> {
    try {
      await dataService.execute(
        'UPDATE sales SET terminal_name = ?, updated_at = ? WHERE id = ? AND status = "HELD"',
        [toTerminal, new Date().toISOString(), holdId]
      );

      console.log(`Hold ${holdId} transferred to terminal ${toTerminal}`);

    } catch (error) {
      console.error('Failed to transfer hold:', error);
      throw error;
    }
  }

  /**
   * Generate suggested hold name
   */
  generateHoldName(customerName?: string, firstItemName?: string): string {
    const time = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (customerName) {
      return `${customerName} - ${time}`;
    }

    if (firstItemName) {
      const shortName = firstItemName.length > 15 
        ? firstItemName.substring(0, 15) + '...' 
        : firstItemName;
      return `${shortName} - ${time}`;
    }

    return `Hold ${time}`;
  }

  /**
   * Get expiry preview text
   */
  getExpiryPreview(minutes?: number): string {
    const settings = this.getHoldSettings();
    const expiryMinutes = minutes || settings.expiryMinutes;

    if (expiryMinutes === 0) {
      return 'No expiry';
    }

    if (expiryMinutes < 60) {
      return `Auto-expires in ${expiryMinutes} minutes`;
    }

    const hours = Math.floor(expiryMinutes / 60);
    const remainingMinutes = expiryMinutes % 60;

    if (remainingMinutes === 0) {
      return `Auto-expires in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    return `Auto-expires in ${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get time until expiry
   */
  getTimeUntilExpiry(expiresAt: string): string {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'EXPIRED';
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m left`;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (minutes === 0) {
      return `${hours}h left`;
    }

    return `${hours}h ${minutes}m left`;
  }

  /**
   * Get hold settings
   */
  getHoldSettings(): HoldSettings {
    // In production, this would load from app settings
    return this.defaultSettings;
  }

  /**
   * Update hold settings
   */
  updateHoldSettings(settings: Partial<HoldSettings>): void {
    // In production, this would save to app settings
    Object.assign(this.defaultSettings, settings);
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  }

  /**
   * Get hold count for terminal
   */
  async getHoldCount(terminal: string): Promise<number> {
    try {
      const holds = await this.listHolds({ terminal, status: 'HELD' });
      return holds.length;
    } catch (error) {
      console.error('Failed to get hold count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const holdService = new HoldService();







