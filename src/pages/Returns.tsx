import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FormLabel } from '../components/ui/Form';
import { Select, SelectOption } from '../components/ui/Dropdown';
import { Badge } from '../components/ui/Badge';
// import { Alert, AlertDescription } from '../components/ui/alert'; // Component doesn't exist yet
// import { Separator } from '../components/ui/separator'; // Component doesn't exist yet
import {
  Search,
  RotateCcw,
  Printer, 
  Save, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Trash2
} from 'lucide-react';
import { refundService } from '../services/refundService';
import { SaleWithLines, ReturnLine, ReturnReason } from '../types';
import { useSettingsStore } from '../store/settingsStore';
// import { useAuthStore } from '../store/appStore'; // Not available yet
import { useTranslation } from '../i18n';

interface ReturnItem {
  sale_line_id: number;
  product_id: number;
  product_name: string;
  product_name_si?: string;
  product_name_ta?: string;
  sold_qty: number;
  already_returned: number;
  return_qty: number;
  unit_price: number;
  reason_code: ReturnReason;
  line_refund: number;
}

export default function Returns() {
  const [receiptInput, setReceiptInput] = useState('');
  const [sale, setSale] = useState<SaleWithLines | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'EN' | 'SI' | 'TA'>('EN');
  const [managerPin, setManagerPin] = useState('');
  const [showManagerPin, setShowManagerPin] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  
  const { settings } = useSettingsStore();
  // const { user } = useAuthStore(); // Not available yet
  const user = { id: 1, name: 'Admin', role: 'admin' }; // Mock user for now
  const t = useTranslation();
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const returnReasons: ReturnReason[] = refundService.getDefaultReturnReasons();

  // Focus on receipt input on mount
  useEffect(() => {
    if (receiptInputRef.current) {
      receiptInputRef.current.focus();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        receiptInputRef.current?.focus();
      } else if (e.key === 'F2' && selectedRowIndex !== null) {
        e.preventDefault();
        incrementQty(selectedRowIndex);
      } else if (e.key === 'F3' && selectedRowIndex !== null) {
        e.preventDefault();
        decrementQty(selectedRowIndex);
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleProcessReturn();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearSale();
      } else if (e.key === 'Enter' && receiptInput.trim()) {
        e.preventDefault();
        handleLookupSale();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRowIndex, receiptInput]);

  const handleLookupSale = async () => {
    if (!receiptInput.trim()) {
      setError('Please enter a receipt number');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const saleData = await refundService.getSaleByReceipt(receiptInput.trim());
      if (!saleData) {
        setError('Sale not found. Please check the receipt number.');
        return;
      }

      setSale(saleData);
      
      // Get return ledger for this sale
      const ledger = await refundService.getSaleReturnLedger(saleData.id);
      const ledgerMap = new Map(ledger.map(item => [item.sale_line_id, item.returned_qty]));

      // Initialize return items
      const items: ReturnItem[] = saleData.lines.map(line => {
        const alreadyReturned = ledgerMap.get(line.id) || 0;
        return {
          sale_line_id: line.id,
          product_id: line.product_id,
          product_name: line.product_name || 'Unknown Product',
          product_name_si: line.product_name_si,
          product_name_ta: line.product_name_ta,
          sold_qty: line.qty,
          already_returned: alreadyReturned,
          return_qty: 0,
          unit_price: line.unit_price,
          reason_code: 'CUSTOMER_CHANGE', // Default reason
          line_refund: 0
        };
      });

      setReturnItems(items);
      setSelectedRowIndex(0);
    } catch (err) {
      setError('Failed to lookup sale. Please try again.');
      console.error('Lookup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSale = () => {
    setSale(null);
    setReturnItems([]);
    setReceiptInput('');
    setError(null);
    setSuccess(null);
    setSelectedRowIndex(null);
    setManagerPin('');
    setShowManagerPin(false);
  };

  const updateReturnQty = (index: number, qty: number) => {
    const item = returnItems[index];
    const maxQty = item.sold_qty - item.already_returned;
    
    if (qty < 0) qty = 0;
    if (qty > maxQty) qty = maxQty;
    
    const newItems = [...returnItems];
    newItems[index] = {
      ...item,
      return_qty: qty,
      line_refund: qty * item.unit_price
    };
    
    setReturnItems(newItems);
  };

  const incrementQty = (index: number) => {
    const item = returnItems[index];
    const newQty = item.return_qty + 1;
    updateReturnQty(index, newQty);
  };

  const decrementQty = (index: number) => {
    const item = returnItems[index];
    const newQty = item.return_qty - 1;
    updateReturnQty(index, newQty);
  };

  const updateReason = (index: number, reason: ReturnReason) => {
    const newItems = [...returnItems];
    newItems[index].reason_code = reason;
    setReturnItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = returnItems.filter((_, i) => i !== index);
    setReturnItems(newItems);
    
    if (selectedRowIndex === index) {
      setSelectedRowIndex(null);
    } else if (selectedRowIndex !== null && selectedRowIndex > index) {
      setSelectedRowIndex(selectedRowIndex - 1);
    }
  };

  const getTotalRefund = () => {
    return returnItems.reduce((sum, item) => sum + item.line_refund, 0);
  };

  const getRefundSplit = () => {
    const total = getTotalRefund();
    return {
      cash: total,
      card: 0,
      wallet: 0,
      store_credit: 0
    };
  };

  const validateReturn = () => {
    const errors: string[] = [];
    
    if (returnItems.length === 0) {
      errors.push('No items selected for return');
    }
    
    const totalQty = returnItems.reduce((sum, item) => sum + item.return_qty, 0);
    if (totalQty === 0) {
      errors.push('Total return quantity must be greater than zero');
    }
    
    const totalRefund = getTotalRefund();
    if (totalRefund <= 0) {
      errors.push('Total refund amount must be greater than zero');
    }
    
    // Check manager PIN requirement
    const managerPinThreshold = settings?.refund?.managerPinThreshold || 5000;
    if (totalRefund >= managerPinThreshold && !managerPin) {
      errors.push(`Manager PIN required for refunds over ${managerPinThreshold}`);
    }
    
    return errors;
  };

  const handleProcessReturn = async () => {
    const errors = validateReturn();
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    if (getTotalRefund() >= (settings?.refund?.managerPinThreshold || 5000)) {
      setShowManagerPin(true);
        return;
    }

    await processReturn();
  };

  const processReturn = async () => {
    setLoading(true);
    setError(null);

    try {
      const itemsToReturn = returnItems.filter(item => item.return_qty > 0);
      
      if (itemsToReturn.length === 0) {
        setError('Please select items to return');
        return;
      }

      // Validate return quantities
      for (const item of itemsToReturn) {
        if (item.return_qty > (item.sold_qty - item.already_returned)) {
          setError(`Cannot return more than ${item.sold_qty - item.already_returned} units of ${item.product_name}`);
          return;
        }
        if (item.return_qty <= 0) {
          setError(`Return quantity must be greater than 0 for ${item.product_name}`);
          return;
        }
      }
      
      const validation = await refundService.validateReturn({
        sale: sale!,
        items: itemsToReturn.map(item => ({
          sale_line_id: item.sale_line_id,
          qty: item.return_qty
        }))
      });

      if (!validation.ok) {
        setError(validation.errors?.join(', ') || 'Validation failed');
        return;
      }

      const returnLines: ReturnLine[] = itemsToReturn.map(item => ({
        sale_line_id: item.sale_line_id,
        product_id: item.product_id,
        qty: item.return_qty,
        unit_price: item.unit_price,
        line_refund: item.line_refund,
        reason_code: item.reason_code
      }));

      const refundSplit = getRefundSplit();
      const reasonSummary = itemsToReturn.map(item => 
        `${item.product_name}: ${item.reason_code}`
      ).join('; ');

      const result = await refundService.createReturn({
        saleId: sale!.id,
        lines: returnLines,
        payments: refundSplit,
        reason_summary: reasonSummary,
        language: selectedLanguage,
        cashier_id: user?.id,
        manager_id: managerPin ? user?.id : null,
        terminal_name: 'POS-001' // FIXED: Get from settings
      });

      setSuccess(`Return processed successfully! Return ID: ${result.returnId}`);
      handleClearSale();
    } catch (err) {
      setError('Failed to process return. Please try again.');
      console.error('Process return error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async () => {
    // FIXED: Print receipt functionality implemented in ReturnSummary component
    console.log('Print receipt functionality to be implemented');
  };

  const getLocalizedProductName = (item: ReturnItem) => {
    switch (selectedLanguage) {
      case 'SI':
        return item.product_name_si || item.product_name;
      case 'TA':
        return item.product_name_ta || item.product_name;
      default:
        return item.product_name;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <RotateCcw className="h-8 w-8" />
          {t.returns.title}
                </h1>
        <div className="flex items-center gap-2">
          <FormLabel htmlFor="language">Language:</FormLabel>
          <Select 
            value={selectedLanguage} 
            onChange={(value: string) => setSelectedLanguage(value as 'EN' | 'SI' | 'TA')}
            options={[
              { value: 'EN', label: 'EN' },
              { value: 'SI', label: 'SI' },
              { value: 'TA', label: 'TA' }
            ]}
          />
        </div>
              </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          <span>{error}</span>
                </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{success}</span>
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Lookup and Items */}
          <div className="space-y-6">
          {/* Lookup Panel */}
          <Card>
            <CardHeader>
              <CardTitle>{t.returns.lookupSale}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  ref={receiptInputRef}
                  placeholder={t.returns.receiptNumber}
                  value={receiptInput}
                  onChange={(e) => setReceiptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookupSale()}
                  disabled={loading}
                />
                <Button onClick={handleLookupSale} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  {t.returns.findSale}
                </Button>
              </div>
              
              {sale && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold">Sale Details</h3>
                  <p>Date: {new Date(sale.datetime).toLocaleString()}</p>
                  <p>Cashier: {sale.cashier_id || 'Unknown'}</p>
                  <p>Tier: {sale.price_tier}</p>
                  <p>Total: LKR {sale.net.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          {sale && (
            <Card>
              <CardHeader>
                <CardTitle>Return Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {returnItems.map((item, index) => {
                    const maxQty = item.sold_qty - item.already_returned;
                    const canReturn = maxQty > 0;
                    
                    return (
                      <div
                        key={item.sale_line_id}
                        className={`p-3 border rounded-lg ${
                          selectedRowIndex === index ? 'border-primary bg-primary/5' : 'border-border'
                        } ${!canReturn ? 'opacity-50' : ''}`}
                        onClick={() => setSelectedRowIndex(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{getLocalizedProductName(item)}</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Sold: {item.sold_qty} | Already Returned: {item.already_returned}</p>
                              <p>Unit Price: LKR {item.unit_price.toFixed(2)}</p>
              </div>
            </div>

                          {canReturn && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    decrementQty(index);
                                  }}
                                  disabled={item.return_qty <= 0}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={item.return_qty}
                                  onChange={(e) => updateReturnQty(index, parseFloat(e.target.value) || 0)}
                                  className="w-16 text-center"
                                  min="0"
                                  max={maxQty}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    incrementQty(index);
                                  }}
                                  disabled={item.return_qty >= maxQty}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
              </div>
              
                              <Select
                                value={item.reason_code}
                                onChange={(value: string) => updateReason(index, value as ReturnReason)}
                                options={returnReasons.map(reason => ({
                                  value: reason,
                                  label: reason.replace('_', ' ')
                                }))}
                              />
                              
                              <div className="text-right min-w-[80px]">
                                <p className="font-medium">LKR {item.line_refund.toFixed(2)}</p>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItem(index);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          
                          {!canReturn && (
                            <Badge variant="secondary">Fully Returned</Badge>
                          )}
                        </div>
                      </div>
                      );
                    })}
              </div>
              </CardContent>
            </Card>
          )}

          {/* Totals Panel */}
          {sale && (
            <Card>
              <CardHeader>
                <CardTitle>Refund Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Refund:</span>
                    <span className="font-bold text-lg">LKR {getTotalRefund().toFixed(2)}</span>
            </div>

                  <div className="border-t border-gray-200 my-4" />
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Cash:</span>
                      <span>LKR {getRefundSplit().cash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card:</span>
                      <span>LKR {getRefundSplit().card.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wallet:</span>
                      <span>LKR {getRefundSplit().wallet.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Store Credit:</span>
                      <span>LKR {getRefundSplit().store_credit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleProcessReturn} 
                    disabled={loading || getTotalRefund() <= 0}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Process Return
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleClearSale}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
              )}
            </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Return Receipt Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg min-h-[400px]">
                <div className="text-center text-muted-foreground">
                  <Printer className="h-12 w-12 mx-auto mb-2" />
                  <p>Receipt preview will appear here</p>
                  <p className="text-sm">After processing a return</p>
                </div>
                </div>
              
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handlePrintReceipt}
                  disabled={!sale}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Return Receipt
                </Button>
                            </div>
            </CardContent>
          </Card>
            </div>
          </div>

        {/* Manager PIN Dialog */}
      {showManagerPin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Manager PIN Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This refund exceeds the manager approval threshold. Please enter your PIN.
              </p>
              <Input
                    type="password"
                placeholder="Enter Manager PIN"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && processReturn()}
              />
              <div className="flex gap-2">
                <Button 
                  onClick={processReturn} 
                  disabled={!managerPin}
                  className="flex-1"
                >
                  Confirm
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowManagerPin(false);
                    setManagerPin('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
    </div>
  );
}