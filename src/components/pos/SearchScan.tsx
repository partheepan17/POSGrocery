/**
 * Search and Scan Component
 * Handles product search and barcode scanning
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Barcode, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { dataService } from '@/services/dataService';
import { Product } from '@/types';

interface SearchScanProps {
  onProductSelect: (product: Product) => void;
  onError: (error: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchScan({ onProductSelect, onError, placeholder, className }: SearchScanProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const products = await dataService.getProducts({ search: searchQuery, pageSize: 10 });
        setSearchResults(products || []);
      } catch (error) {
        onError('Failed to search products');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, onError]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (searchResults.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            handleProductSelect(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          setSearchResults([]);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchResults, selectedIndex]);

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
  };

  const handleBarcodeSubmit = async (barcode: string) => {
    if (!barcode.trim()) return;

    setIsSearching(true);
    try {
      const product = await dataService.getProductBySku(barcode);
      if (product) {
        onProductSelect(product);
        setBarcodeInput('');
        barcodeInputRef.current?.focus();
      } else {
        onError('Product not found');
      }
    } catch (error) {
      onError('Failed to find product');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder || t('pos.searchProducts')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          rightIcon={
            searchQuery && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSearch}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )
          }
          className="text-lg"
        />
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((product, index) => (
              <div
                key={product.id}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleProductSelect(product)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{product.name_en}</div>
                    <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      LKR {product.price_retail.toLocaleString()}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {product.unit}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barcode Input */}
      <div className="relative">
        <Input
          ref={barcodeInputRef}
          type="text"
          placeholder={t('pos.scanBarcode')}
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleBarcodeSubmit(barcodeInput);
            } else if (e.key === 'Escape') {
              setBarcodeInput('');
              barcodeInputRef.current?.focus();
            }
          }}
          leftIcon={<Barcode className="w-4 h-4" />}
          rightIcon={
            barcodeInput && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setBarcodeInput('');
                  barcodeInputRef.current?.focus();
                }}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )
          }
          className="text-lg"
          disabled={isSearching}
        />
      </div>

      {/* Loading indicator */}
      {isSearching && (
        <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
          {searchQuery ? 'Searching products...' : 'Looking up product...'}
        </div>
      )}
    </div>
  );
}