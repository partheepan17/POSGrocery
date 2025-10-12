import React, { useState, useRef, useEffect } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { validateBarcode, validateSearchQuery } from '@/lib/validation';
import { toast } from 'react-hot-toast';
import { getApiBaseUrl } from '@/utils/api';
import { ScannerBuffer, parseWeightedBarcode } from '@/utils/scannerBuffer';

interface SearchScanProps {
  onProductFound?: (product: any) => void;
  onProductNotFound?: () => void;
}

export function SearchScan({ onProductFound, onProductNotFound }: SearchScanProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout>();
  const addItem = useCartStore(state => state.addItem);
  const [flashId, setFlashId] = useState<string | null>(null);
  const apiBaseUrl = getApiBaseUrl();
  const scannerRef = useRef<ScannerBuffer | null>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle barcode scanning (fast typing + Enter)
  useEffect(() => {
    const scanner = new ScannerBuffer({ debounceMs: 25, minLength: 6 });
    scannerRef.current = scanner;
    const onScan = async (code: string) => {
      // Weighted parsing first
      const weighted = parseWeightedBarcode(code);
      if (weighted.isWeighted && weighted.sku) {
        // try by SKU
        const resp = await fetch(`${apiBaseUrl}/api/products/search?q=${encodeURIComponent(weighted.sku)}&limit=5`);
        const data = await resp.json();
        const product = Array.isArray(data.products) ? data.products.find((p: any) => p.sku === weighted.sku) : null;
        if (product) {
          addItem(product, Math.max(0.001, Number(weighted.weightKg?.toFixed(3) || 0)));
          toast.success(`Added ${product.name_en} (${weighted.weightKg?.toFixed(3)} kg)`);
          inputRef.current?.focus();
          setQuery('');
          setSuggestions([]);
          setSelectedIndex(-1);
          return;
        }
      }
      // Else treat as barcode/SKU flow
      await handleBarcodeScan(code);
      inputRef.current?.focus();
    };
    scanner.onScan(onScan);
    const handler = (e: KeyboardEvent) => {
      // Keep manual typing intact: if input focused and user types slowly, let it flow.
      scanner.handleKeyEvent(e);
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => {
      window.removeEventListener('keydown', handler, { capture: true } as any);
      scannerRef.current = null;
    };
  }, [apiBaseUrl, addItem]);

  // Search products
  const searchProducts = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await response.json();
      
      if (response.ok) {
        setSuggestions(data.products || []);
      } else {
        console.error('Search failed:', data.error);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    setShowError(false);
    setErrorMessage('');
    
    // Check if this looks like a barcode scan (fast typing)
    if (value.length > 5 && !isScanning) {
      setIsScanning(true);
    }
    
    // Clear existing timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    // Debounced search for products (200ms)
    scanTimeoutRef.current = setTimeout(() => {
      if (value.length >= 2) {
        searchProducts(value);
      } else {
        setSuggestions([]);
      }
    }, 200);

    // Fallback auto-add: if a scanner isn't captured by global buffer,
    // debounce briefly and treat the whole input as a scanned code.
    if (value.length >= 6) {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current as any);
      scanTimeoutRef.current = setTimeout(() => {
        // Only trigger if the field still contains the same value
        if (inputRef.current && inputRef.current.value === value) {
          handleBarcodeScan(value);
          // Clear input and suggestions after attempt
          setQuery('');
          setSuggestions([]);
          setSelectedIndex(-1);
        }
      }, 120);
    }
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Clear any pending debounced search
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        // Select from suggestions
        handleProductSelect(suggestions[selectedIndex]);
      } else if (query.trim()) {
        // Try to add by barcode/SKU immediately (no debounce)
        handleBarcodeScan(query.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  // Handle barcode scan using centralized service
  const handleBarcodeScan = async (codeOrSku: string) => {
    setIsLoading(true);
    setShowError(false);
    setErrorMessage('');
    
    try {
      const { barcodeService } = await import('@/services/barcodeService');
      const result = await barcodeService.searchBarcode(codeOrSku, {
        debounceMs: 0, // No debounce for direct calls
        retryAttempts: 2,
        timeout: 5000
      });

      if (result.found && result.product) {
        handleProductSelect(result.product);
        setQuery(''); // Clear input on success
        return;
      }

      // Show inline error message instead of toast
      if (result.lookupType === 'none') {
        setErrorMessage('Product not found');
        setShowError(true);
        playErrorSound();
        onProductNotFound?.();
      } else {
        setErrorMessage('Invalid barcode format');
        setShowError(true);
        playErrorSound();
      }
      
      // Keep focus in input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Barcode/SKU lookup error:', error);
      setErrorMessage('Failed to lookup product');
      setShowError(true);
      playErrorSound();
      
      // Keep focus in input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle product selection
  const handleProductSelect = (product: any) => {
    // Check stock availability
    if (product.stock_tracking && product.stock_qty <= 0) {
      toast.error('Product out of stock');
      return;
    }

    // Add to cart
    addItem(product, 1);
    try {
      const audio = new Audio('/assets/sounds/beep.mp3');
      audio.play().catch(() => {});
    } catch (_) {}
    setFlashId(String(product.id));
    setTimeout(() => setFlashId(null), 400);
    
    // Clear input and suggestions
    setQuery('');
    setSuggestions([]);
    setSelectedIndex(-1);
    
    // Focus input for next scan
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Notify parent
    onProductFound?.(product);
    
    // Show success message
    toast.success(`Added ${product.name_en} to cart`);
  };

  // Play error sound
  const playErrorSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.play();
    } catch (error) {
      // Fallback: use system beep
      console.log('\u0007');
    }
  };

  // Clear suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setSuggestions([]);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="🔍 Search Products: Scan barcode or type product name/SKU..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-lg"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Inline Error Display */}
      {showError && errorMessage && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="alert" aria-live="polite">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2">
              <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hint Text */}
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        • Product Search: Use barcode scanner or type product name/SKU to add items to cart
      </p>

      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((product, index) => (
            <div
              key={product.id}
              onClick={() => handleProductSelect(product)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : (flashId === String(product.id) ? 'bg-green-100 dark:bg-green-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700')
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {product.name_en}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    SKU: {product.sku} • {product.unit}
                  </div>
                  {product.stock_tracking && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Stock: {product.stock_qty}
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="font-medium text-gray-900 dark:text-white">
                    රු {(product.price_retail || 0).toLocaleString()}
                  </div>
                  {product.stock_tracking && product.stock_qty <= 0 && (
                    <div className="text-xs text-red-500 flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Out of Stock
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

