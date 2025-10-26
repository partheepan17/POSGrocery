/**
 * Reprint Modal Component
 * Handles receipt reprinting functionality
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Printer, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { dataService } from '@/services/dataService';

interface ReprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReprint: (saleId: number) => void;
  className?: string;
}

interface Sale {
  id: number;
  receipt_no: string;
  datetime: string;
  cashier_name: string;
  total: number;
  customer_name?: string;
}

export function ReprintModal({ isOpen, onClose, onReprint, className }: ReprintModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Sale[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError('');
      setSelectedSale(null);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError(t('pos.enterReceiptNumber'));
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      // Search by receipt number or sale ID
      const response = await dataService.getSales({ 
        search: searchQuery,
        pageSize: 10 
      });
      
      if (response?.sales && response.sales.length > 0) {
        setSearchResults(response.sales as any);
      } else {
        setError(t('pos.noSalesFound'));
        setSearchResults([]);
      }
    } catch (error) {
      setError(t('pos.searchFailed'));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReprint = (sale: Sale) => {
    setSelectedSale(sale);
    onReprint(sale.id);
    onClose();
  };

  const formatPrice = (price: number) => {
    return `LKR ${price.toLocaleString()}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Printer className="w-5 h-5" />
              <span>{t('pos.reprintReceipt')}</span>
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {t('pos.searchByReceiptNumber')}
            </label>
            <div className="flex space-x-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('pos.enterReceiptNumber')}
                leftIcon={<Search className="w-4 h-4" />}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                loading={isSearching}
              >
                {t('pos.search')}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">
                {t('pos.searchResults')} ({searchResults.length})
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">#{sale.receipt_no}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatPrice(sale.total)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(sale.datetime)} • {sale.cashier_name}
                      </div>
                      {sale.customer_name && (
                        <div className="text-sm text-gray-500">
                          Customer: {sale.customer_name}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleReprint(sale)}
                      leftIcon={<Printer className="w-4 h-4" />}
                    >
                      {t('pos.reprint')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchResults.length === 0 && !isSearching && searchQuery && (
            <div className="text-center py-8 text-gray-500">
              <Printer className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <div className="text-lg font-medium mb-1">{t('pos.noSalesFound')}</div>
              <div className="text-sm">{t('pos.tryDifferentSearch')}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t('pos.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}