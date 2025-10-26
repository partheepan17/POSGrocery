/**
 * Customer Select Component
 * Handles customer selection and search
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { dataService } from '@/services/dataService';
import { Customer } from '@/types';

interface CustomerSelectProps {
  selectedCustomer?: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  onAddCustomer?: () => void;
  className?: string;
}

export function CustomerSelect({ 
  selectedCustomer, 
  onCustomerSelect, 
  onAddCustomer,
  className 
}: CustomerSelectProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
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
        const customers = await dataService.getCustomers({ search: searchQuery });
        setSearchResults(customers || []);
      } catch (error) {
        console.error('Failed to search customers:', error);
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
  }, [searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || searchResults.length === 0) return;

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
            handleCustomerSelect(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchResults([]);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(-1);
    setIsOpen(false);
  };

  const clearCustomer = () => {
    onCustomerSelect(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(-1);
    setIsOpen(false);
  };

  const openSearch = () => {
    setIsOpen(true);
    searchInputRef.current?.focus();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Selected Customer Display */}
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium text-blue-900">{selectedCustomer.customer_name}</div>
              <div className="text-sm text-blue-700">
                {selectedCustomer.customer_phone && `Phone: ${selectedCustomer.customer_phone}`}
                {selectedCustomer.customer_type && ` • ${selectedCustomer.customer_type}`}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {selectedCustomer.customer_type}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearCustomer}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={openSearch}
            className="w-full justify-start text-gray-500"
            leftIcon={<User className="w-4 h-4" />}
          >
            {t('pos.selectCustomer')}
          </Button>
          
          {onAddCustomer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddCustomer}
              className="w-full"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t('pos.addCustomer')}
            </Button>
          )}
        </div>
      )}

      {/* Search Input */}
      {isOpen && (
        <div className="relative">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder={t('pos.searchCustomers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            }
            className="text-sm"
          />
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((customer, index) => (
                <div
                  key={customer.id}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{customer.customer_name}</div>
                      <div className="text-sm text-gray-500">
                        {customer.customer_phone && `Phone: ${customer.customer_phone}`}
                        {customer.customer_email && ` • ${customer.customer_email}`}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {customer.customer_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {isSearching && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
              Searching customers...
            </div>
          )}
        </div>
      )}
    </div>
  );
}