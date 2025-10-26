/**
 * Print Preview Modal Component
 * Shows receipt preview before printing
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  onDownload?: () => void;
  receiptData: any;
  className?: string;
}

export function PrintPreviewModal({ 
  isOpen, 
  onClose, 
  onPrint, 
  onDownload,
  receiptData,
  className 
}: PrintPreviewModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return `LKR ${price.toLocaleString()}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Printer className="w-5 h-5" />
              <span>{t('pos.printPreview')}</span>
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
        
        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Receipt Preview */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 font-mono text-sm">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-lg font-bold">{receiptData.storeName || 'POS Store'}</div>
              <div className="text-sm text-gray-600">{receiptData.storeAddress || 'Store Address'}</div>
              <div className="text-sm text-gray-600">{receiptData.storePhone || 'Phone: +94 XX XXX XXXX'}</div>
            </div>

            <div className="border-t border-gray-300 pt-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Receipt #: {receiptData.receiptNo}</span>
                <span>{formatDate(receiptData.datetime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cashier: {receiptData.cashierName}</span>
                <span>Terminal: {receiptData.terminalName}</span>
              </div>
            </div>

            {/* Customer Info */}
            {receiptData.customerName && (
              <div className="mb-4">
                <div className="text-sm font-medium">Customer: {receiptData.customerName}</div>
                {receiptData.customerPhone && (
                  <div className="text-sm">Phone: {receiptData.customerPhone}</div>
                )}
              </div>
            )}

            {/* Items */}
            <div className="border-t border-gray-300 pt-2 mb-4">
              <div className="text-sm font-medium mb-2">Items:</div>
              {receiptData.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm mb-1">
                  <div className="flex-1">
                    <div>{item.name}</div>
                    <div className="text-gray-600">
                      {item.qty} {item.unit} × {formatPrice(item.unit_price)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{formatPrice(item.total)}</div>
                    {item.discount > 0 && (
                      <div className="text-orange-600">-{formatPrice(item.discount)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-300 pt-2 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal:</span>
                <span>{formatPrice(receiptData.subtotal)}</span>
              </div>
              {receiptData.discount > 0 && (
                <div className="flex justify-between text-sm mb-1 text-orange-600">
                  <span>Discount:</span>
                  <span>-{formatPrice(receiptData.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mb-1">
                <span>Tax:</span>
                <span>{formatPrice(receiptData.tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-1">
                <span>Total:</span>
                <span>{formatPrice(receiptData.total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="border-t border-gray-300 pt-2 mb-4">
              <div className="text-sm font-medium mb-2">Payment:</div>
              {receiptData.payments?.map((payment: any, index: number) => (
                <div key={index} className="flex justify-between text-sm mb-1">
                  <span>{payment.method}:</span>
                  <span>{formatPrice(payment.amount)}</span>
                </div>
              ))}
              {receiptData.change > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Change:</span>
                  <span>{formatPrice(receiptData.change)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-300 pt-2 text-center text-xs text-gray-600">
              <div>Thank you for your business!</div>
              <div>Visit us again soon</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t('pos.cancel')}
            </Button>
            
            {onDownload && (
              <Button
                variant="outline"
                onClick={onDownload}
                leftIcon={<Download className="w-4 h-4" />}
                className="flex-1"
              >
                {t('pos.download')}
              </Button>
            )}
            
            <Button
              onClick={onPrint}
              leftIcon={<Printer className="w-4 h-4" />}
              className="flex-1"
            >
              {t('pos.print')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}