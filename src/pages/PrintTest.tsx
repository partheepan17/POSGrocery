// src/pages/PrintTest.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Printer, Download, Eye } from 'lucide-react';

const printAdapters = [
  { id: 'thermal-58mm', name: 'Thermal 58mm', width: 48 },
  { id: 'thermal-80mm', name: 'Thermal 80mm', width: 72 },
  { id: 'laser-a4', name: 'Laser A4', width: 210 },
  { id: 'inkjet-a4', name: 'Inkjet A4', width: 210 },
];

const themes = [
  { id: 'light', name: 'Light Theme' },
  { id: 'dark', name: 'Dark Theme' },
  { id: 'print-light', name: 'Print Light' },
  { id: 'print-dark', name: 'Print Dark' },
];

export const PrintTest: React.FC = () => {
  const { t } = useTranslation();
  const [selectedAdapter, setSelectedAdapter] = useState('thermal-58mm');
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [isPrinting, setIsPrinting] = useState(false);

  const adapter = printAdapters.find(a => a.id === selectedAdapter) || printAdapters[0];

  const sampleReceipt = {
    businessName: 'Grocery Store POS',
    businessAddress: '123 Main Street, Colombo 01',
    businessPhone: '+94 11 234 5678',
    receiptNumber: 'RCP-2024-001234',
    date: new Date(),
    cashier: 'John Doe',
    items: [
      { name: 'Rice 1kg', quantity: 2, price: 150.00, total: 300.00 },
      { name: 'Sugar 500g', quantity: 1, price: 80.00, total: 80.00 },
      { name: 'Milk 1L', quantity: 3, price: 120.00, total: 360.00 },
    ],
    subtotal: 740.00,
    tax: 111.00,
    total: 851.00,
    paymentMethod: 'Cash',
    amountPaid: 1000.00,
    change: 149.00,
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Simulate print delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create print content
      const printContent = generatePrintContent();
      
      // Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    } catch (error) {
      console.error('Print failed:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePreview = () => {
    const printContent = generatePrintContent();
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(printContent);
      previewWindow.document.close();
    }
  };

  const generatePrintContent = () => {
    const isDark = selectedTheme.includes('dark');
    const isPrint = selectedTheme.includes('print');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Print Test - ${adapter.name}</title>
        <style>
          @page {
            size: ${adapter.id.includes('a4') ? 'A4' : 'auto'};
            margin: 0;
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: ${adapter.id.includes('58mm') ? '12px' : '14px'};
            line-height: 1.4;
            margin: 0;
            padding: 10px;
            background: ${isDark ? '#1a1a1a' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#000000'};
            width: ${adapter.width}mm;
            max-width: ${adapter.width}mm;
          }
          
          .receipt {
            width: 100%;
            text-align: center;
          }
          
          .business-name {
            font-size: ${adapter.id.includes('58mm') ? '16px' : '18px'};
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .business-info {
            font-size: ${adapter.id.includes('58mm') ? '10px' : '12px'};
            margin-bottom: 10px;
          }
          
          .receipt-header {
            border-top: 1px solid ${isDark ? '#444' : '#000'};
            border-bottom: 1px solid ${isDark ? '#444' : '#000'};
            padding: 5px 0;
            margin: 10px 0;
          }
          
          .receipt-info {
            display: flex;
            justify-content: space-between;
            font-size: ${adapter.id.includes('58mm') ? '10px' : '12px'};
            margin-bottom: 10px;
          }
          
          .items {
            margin: 10px 0;
          }
          
          .item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: ${adapter.id.includes('58mm') ? '10px' : '12px'};
          }
          
          .item-name {
            flex: 1;
            text-align: left;
          }
          
          .item-qty {
            margin: 0 5px;
            text-align: center;
          }
          
          .item-price {
            text-align: right;
            min-width: 60px;
          }
          
          .totals {
            border-top: 1px solid ${isDark ? '#444' : '#000'};
            margin-top: 10px;
            padding-top: 5px;
          }
          
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: ${adapter.id.includes('58mm') ? '10px' : '12px'};
          }
          
          .total-final {
            font-weight: bold;
            font-size: ${adapter.id.includes('58mm') ? '12px' : '14px'};
            border-top: 1px solid ${isDark ? '#444' : '#000'};
            padding-top: 5px;
            margin-top: 5px;
          }
          
          .payment-info {
            margin-top: 10px;
            font-size: ${adapter.id.includes('58mm') ? '10px' : '12px'};
          }
          
          .footer {
            margin-top: 15px;
            font-size: ${adapter.id.includes('58mm') ? '9px' : '10px'};
            text-align: center;
          }
          
          .dashed-line {
            border-top: 1px dashed ${isDark ? '#666' : '#999'};
            margin: 10px 0;
          }
          
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="business-name">${sampleReceipt.businessName}</div>
          <div class="business-info">
            ${sampleReceipt.businessAddress}<br>
            Tel: ${sampleReceipt.businessPhone}
          </div>
          
          <div class="receipt-header">
            <div>RECEIPT</div>
          </div>
          
          <div class="receipt-info">
            <div>Receipt: ${sampleReceipt.receiptNumber}</div>
            <div>Date: ${sampleReceipt.date.toLocaleDateString()}</div>
          </div>
          
          <div class="receipt-info">
            <div>Cashier: ${sampleReceipt.cashier}</div>
            <div>Time: ${sampleReceipt.date.toLocaleTimeString()}</div>
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="items">
            ${sampleReceipt.items.map(item => `
              <div class="item">
                <div class="item-name">${item.name}</div>
                <div class="item-qty">${item.quantity}</div>
                <div class="item-price">$${item.price.toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="totals">
            <div class="total-line">
              <span>Subtotal:</span>
              <span>$${sampleReceipt.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-line">
              <span>Tax (15%):</span>
              <span>$${sampleReceipt.tax.toFixed(2)}</span>
            </div>
            <div class="total-line total-final">
              <span>TOTAL:</span>
              <span>$${sampleReceipt.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <div class="total-line">
              <span>Payment Method:</span>
              <span>${sampleReceipt.paymentMethod}</span>
            </div>
            <div class="total-line">
              <span>Amount Paid:</span>
              <span>$${sampleReceipt.amountPaid.toFixed(2)}</span>
            </div>
            <div class="total-line">
              <span>Change:</span>
              <span>$${sampleReceipt.change.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="footer">
            Thank you for your business!<br>
            Please keep this receipt for returns<br>
            <br>
            Adapter: ${adapter.name}<br>
            Theme: ${selectedTheme}<br>
            Generated: ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Print Test Page</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test print output across different devices and themes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Print Configuration" />
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Print Adapter</label>
              <Select
                value={selectedAdapter}
                onChange={(e) => setSelectedAdapter(e.target.value)}
                options={printAdapters.map(adapter => ({
                  value: adapter.id,
                  label: `${adapter.name} (${adapter.width}mm)`
                }))}
                placeholder="Select print adapter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <Select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                options={themes.map(theme => ({
                  value: theme.id,
                  label: theme.name
                }))}
                placeholder="Select theme"
              />
            </div>

            <div className="pt-4 space-y-2">
              <Button 
                onClick={handlePrint} 
                disabled={isPrinting}
                className="w-full"
              >
                <Printer className="w-4 h-4 mr-2" />
                {isPrinting ? 'Printing...' : 'Print Test Receipt'}
              </Button>
              
              <Button 
                onClick={handlePreview} 
                variant="outline"
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Receipt
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Sample Receipt Data" />
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Business:</strong> {sampleReceipt.businessName}</div>
              <div><strong>Receipt #:</strong> {sampleReceipt.receiptNumber}</div>
              <div><strong>Date:</strong> {sampleReceipt.date.toLocaleDateString()}</div>
              <div><strong>Time:</strong> {sampleReceipt.date.toLocaleTimeString()}</div>
              <div><strong>Cashier:</strong> {sampleReceipt.cashier}</div>
              <div><strong>Items:</strong> {sampleReceipt.items.length}</div>
              <div><strong>Subtotal:</strong> ${sampleReceipt.subtotal.toFixed(2)}</div>
              <div><strong>Tax:</strong> ${sampleReceipt.tax.toFixed(2)}</div>
              <div><strong>Total:</strong> ${sampleReceipt.total.toFixed(2)}</div>
              <div><strong>Payment:</strong> {sampleReceipt.paymentMethod}</div>
              <div><strong>Change:</strong> ${sampleReceipt.change.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Print Adapter Specifications" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Adapter</th>
                  <th className="text-left p-2">Width</th>
                  <th className="text-left p-2">Font Size</th>
                  <th className="text-left p-2">Use Case</th>
                </tr>
              </thead>
              <tbody>
                {printAdapters.map((adapter) => (
                  <tr key={adapter.id} className="border-b">
                    <td className="p-2 font-medium">{adapter.name}</td>
                    <td className="p-2">{adapter.width}mm</td>
                    <td className="p-2">
                      {adapter.id.includes('58mm') ? '12px' : '14px'}
                    </td>
                    <td className="p-2">
                      {adapter.id.includes('thermal') 
                        ? 'Receipt printers, POS terminals'
                        : 'Office printers, invoices, reports'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
