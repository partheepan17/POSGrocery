import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, User, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

interface Customer {
  id: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  default_price_tier?: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  credit_limit?: number;
}

interface CustomerSelectProps {
  onCustomerChange?: (customer: Customer | null) => void;
}

export function CustomerSelect({ onCustomerChange }: CustomerSelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { customerId, customerName, setCustomer, priceTier, setPriceTier } = useCartStore();

  // Load customers on mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Load customers
  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const response = await fetch(`${apiBaseUrl}/api/customers?active=true`);
      const data = await response.json();
      
      if (response.ok) {
        setCustomers(data.customers || []);
      } else {
        console.error('Failed to load customers:', data.error);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setCustomer(customer?.id || null, customer?.customer_name || 'Walk-in Customer (Retail)');
    
    // Switch price tier if customer has default tier
    if (customer?.default_price_tier && customer.default_price_tier !== priceTier) {
      setPriceTier(customer.default_price_tier);
    }
    
    setIsOpen(false);
    setSearchQuery('');
    onCustomerChange?.(customer);
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.customer_phone?.includes(searchQuery) ||
    customer.customer_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get display name
  const getDisplayName = () => {
    if (selectedCustomer) {
      return selectedCustomer.customer_name;
    }
    return customerName;
  };

  // Check if current tier is non-retail
  const isNonRetailTier = priceTier !== 'Retail';

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('sales.customerSelection')}
      </label>
      
      {/* Customer Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
        >
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <span className="block truncate text-gray-900 dark:text-white">
              {getDisplayName()}
            </span>
          </div>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </span>
        </button>

        {/* Non-retail tier warning */}
        {isNonRetailTier && (
          <div className="mt-2 flex items-center text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span>{t('sales.discountRulesDisabled')}</span>
          </div>
        )}

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('sales.searchCustomers')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Customer List */}
            <div className="max-h-48 overflow-y-auto">
              {/* Walk-in Customer Option */}
              <div
                onClick={() => handleCustomerSelect(null)}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('sales.walkInCustomer')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('sales.defaultCustomerDescription')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Options */}
              {isLoading ? (
                <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                  {t('sales.loadingCustomers')}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery ? t('sales.noCustomersFound') : t('sales.noCustomersAvailable')}
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {customer.customer_name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {customer.customer_phone && `Phone: ${customer.customer_phone}`}
                            {customer.customer_phone && customer.customer_email && ' • '}
                            {customer.customer_email && `Email: ${customer.customer_email}`}
                          </div>
                        </div>
                      </div>
                      {customer.default_price_tier && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {customer.default_price_tier}
                        </div>
                      )}
                    </div>
                    {customer.credit_limit && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Credit Limit: රු {customer.credit_limit.toLocaleString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customer Info */}
      {selectedCustomer && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-white">
              {selectedCustomer.customer_name}
            </div>
            {selectedCustomer.customer_phone && (
              <div className="text-gray-600 dark:text-gray-400">
                Phone: {selectedCustomer.customer_phone}
              </div>
            )}
            {selectedCustomer.customer_email && (
              <div className="text-gray-600 dark:text-gray-400">
                Email: {selectedCustomer.customer_email}
              </div>
            )}
            {selectedCustomer.credit_limit && (
              <div className="text-gray-600 dark:text-gray-400">
                Credit Limit: රු {selectedCustomer.credit_limit.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

