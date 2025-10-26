import { Product } from '@/types';

export interface BarcodeSearchResult {
  product: Product | null;
  found: boolean;
  lookupType: 'barcode' | 'sku' | 'none';
  duration: number;
  cacheHit: boolean;
  success?: boolean;
  error?: string;
}

export interface BarcodeSearchOptions {
  debounceMs?: number;
  retryAttempts?: number;
  timeout?: number;
}

class BarcodeService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
  private cache = new Map<string, BarcodeSearchResult>();
  private pendingRequests = new Map<string, Promise<BarcodeSearchResult>>();
  private debounceTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Search for a product by barcode or SKU
   */
  async searchBarcode(
    code: string, 
    options: BarcodeSearchOptions = {}
  ): Promise<BarcodeSearchResult> {
    const {
      debounceMs = 200,
      retryAttempts = 2,
      timeout = 5000
    } = options;

    const trimmedCode = code.trim();

    // Client-side validation
    if (!this.validateBarcode(trimmedCode)) {
      return {
        product: null,
        found: false,
        lookupType: 'none',
        duration: 0,
        cacheHit: false
      };
    }

    // Check cache first
    const cached = this.cache.get(trimmedCode);
    if (cached) {
      return { ...cached, cacheHit: true };
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(trimmedCode);
    if (pending) {
      return pending;
    }

    // Create new request
    const request = this.performSearch(trimmedCode, retryAttempts, timeout, true);
    this.pendingRequests.set(trimmedCode, request);

    try {
      const result = await request;
      this.cache.set(trimmedCode, result);
      return result;
    } finally {
      this.pendingRequests.delete(trimmedCode);
    }
  }

  /**
   * Debounced barcode search
   */
  searchBarcodeDebounced(
    code: string,
    callback: (result: BarcodeSearchResult) => void,
    options: BarcodeSearchOptions = {}
  ): void {
    const trimmedCode = code.trim();
    const { debounceMs = 200 } = options;

    // Clear existing timeout
    const existingTimeout = this.debounceTimeouts.get(trimmedCode);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      const result = await this.searchBarcode(trimmedCode, options);
      callback(result);
    }, debounceMs);

    this.debounceTimeouts.set(trimmedCode, timeout);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific barcode from cache
   */
  clearBarcodeFromCache(code: string): void {
    this.cache.delete(code.trim());
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Encode EAN13 barcode
   */
  encodeEAN13(data: string): string {
    // Simple EAN13 encoding - in a real implementation, you'd use a proper barcode library
    return `EAN13:${data}`;
  }

  /**
   * Encode Code128 barcode
   */
  encodeCode128(data: string): string {
    // Simple Code128 encoding - in a real implementation, you'd use a proper barcode library
    return `CODE128:${data}`;
  }

  /**
   * Convert SVG to data URL
   */
  svgToDataUrl(svg: string): string {
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  }

  private validateBarcode(code: string): boolean {
    if (!code || code.length < 3 || code.length > 50) {
      return false;
    }

    // Allow alphanumeric, hyphens, underscores, and periods
    if (!/^[a-zA-Z0-9\-_\.]+$/.test(code)) {
      return false;
    }

    return true;
  }

  private async performSearch(
    code: string,
    retryAttempts: number,
    timeout: number,
    fallbackToSku: boolean = true
  ): Promise<BarcodeSearchResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const result = await this.makeApiRequest(code, timeout, fallbackToSku);
        const duration = Date.now() - startTime;
        
        // If we got a successful result (even if product not found), return it
        if (result.success !== false) {
          return {
            ...result,
            duration
          };
        }
        
        // If product not found, don't retry
        if (result.error === 'Product not found') {
          return {
            ...result,
            duration
          };
        }
        
        // For other errors, continue to retry
        lastError = new Error(result.error || 'Unknown error');
        
        // Wait before retry (exponential backoff)
        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Wait before retry (exponential backoff)
        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      product: null,
      found: false,
      lookupType: 'none',
      duration,
      cacheHit: false,
      success: false,
      error: lastError?.message || 'Scan failed'
    };
  }

  private async makeApiRequest(code: string, timeout: number, fallbackToSku: boolean = true): Promise<BarcodeSearchResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = fallbackToSku 
        ? `${this.baseUrl}/api/products/barcode/${encodeURIComponent(code)}?fallback=sku`
        : `${this.baseUrl}/api/products/barcode/${encodeURIComponent(code)}`;
        
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          product: data.product ? this.transformProduct(data.product) : null,
          found: !!data.product,
          lookupType: data.product ? (data.product.barcode === code ? 'barcode' : 'sku') : 'none',
          duration: 0, // Will be set by caller
          cacheHit: false,
          success: true
        };
      } else if (response.status === 404) {
        return {
          product: null,
          found: false,
          lookupType: 'none',
          duration: 0,
          cacheHit: false,
          success: false,
          error: 'Product not found'
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          product: null,
          found: false,
          lookupType: 'none',
          duration: 0,
          cacheHit: false,
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle network errors and timeouts
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            product: null,
            found: false,
            lookupType: 'none',
            duration: 0,
            cacheHit: false,
            success: false,
            error: 'Scan failed - Request timeout'
          };
        }
        
        return {
          product: null,
          found: false,
          lookupType: 'none',
          duration: 0,
          cacheHit: false,
          success: false,
          error: 'Scan failed - Network error'
        };
      }
      
      return {
        product: null,
        found: false,
        lookupType: 'none',
        duration: 0,
        cacheHit: false,
        success: false,
        error: 'Scan failed'
      };
    }
  }

  private transformProduct(apiProduct: any): Product {
    return {
      id: apiProduct.id,
      sku: apiProduct.sku,
      barcode: apiProduct.barcode,
      name_en: apiProduct.name_en,
      name_si: apiProduct.name_si,
      name_ta: apiProduct.name_ta,
      unit: apiProduct.unit,
      category_id: apiProduct.category_id || 1,
      is_scale_item: apiProduct.is_scale_item || false,
      tax_code: apiProduct.tax_code,
      price_retail: apiProduct.price_retail,
      price_wholesale: apiProduct.price_wholesale,
      price_credit: apiProduct.price_credit,
      price_other: apiProduct.price_other,
      cost: apiProduct.cost,
      reorder_level: apiProduct.reorder_level,
      preferred_supplier_id: apiProduct.preferred_supplier_id,
      is_active: apiProduct.is_active,
      created_at: new Date(apiProduct.created_at || Date.now()).toISOString(),
      updated_at: apiProduct.updated_at ? new Date(apiProduct.updated_at).toISOString() : new Date().toISOString()
    };
  }
}

// Export singleton instance
export const barcodeService = new BarcodeService();
export default barcodeService;