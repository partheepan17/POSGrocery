import React from 'react';
import { useTranslation } from 'react-i18next';

interface QuickSalesPrintSummaryProps {
  session: {
    id: number;
    session_date: string;
    opened_at: string;
    closed_at: string;
    notes?: string;
  };
  invoice: {
    id: number;
    receipt_no: string;
    gross: number;
    tax: number;
    net: number;
  };
  topItems: Array<{
    sku: string;
    name: string;
    qty: number;
    unit: string;
    line_total: number;
  }>;
  totalLines: number;
  onPrint?: () => void;
  onClose?: () => void;
}

export default function QuickSalesPrintSummary({
  session,
  invoice,
  topItems,
  totalLines,
  onPrint,
  onClose
}: QuickSalesPrintSummaryProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('quickSales.printSummary.title')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Print Preview */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4 font-mono text-xs">
          <div className="text-center border-b border-gray-300 pb-2 mb-2">
            <div className="font-bold text-sm">QUICK SALES</div>
            <div className="text-xs">{formatDate(session.session_date)}</div>
          </div>

          <div className="space-y-1 mb-2">
            <div className="flex justify-between">
              <span>Session:</span>
              <span>#{session.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Opened:</span>
              <span>{formatTime(session.opened_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Closed:</span>
              <span>{formatTime(session.closed_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Items:</span>
              <span>{totalLines}</span>
            </div>
          </div>

          <div className="border-t border-gray-300 pt-2 mb-2">
            <div className="font-semibold text-xs mb-1">TOP ITEMS:</div>
            {topItems.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="truncate flex-1 mr-2">
                  {item.sku} {item.name.substring(0, 15)}
                </span>
                <span className="text-right">
                  {item.qty} {item.unit}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-300 pt-2 mb-2">
            <div className="flex justify-between font-semibold">
              <span>TOTAL:</span>
              <span>{formatCurrency(invoice.net)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-600">
            See full invoice #{invoice.receipt_no}
          </div>
        </div>

        {/* Print Options */}
        <div className="space-y-3">
          <button
            onClick={() => {
              // Print thermal receipt
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                const printContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Quick Sales Summary</title>
                    <style>
                      @media print {
                        @page { size: 58mm 80mm; margin: 0; }
                        body { font-family: monospace; font-size: 10px; margin: 0; padding: 4px; }
                      }
                      body { font-family: monospace; font-size: 10px; margin: 0; padding: 4px; }
                      .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 4px; }
                      .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
                      .total { border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; font-weight: bold; }
                      .footer { text-align: center; margin-top: 4px; font-size: 8px; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div style="font-weight: bold; font-size: 12px;">QUICK SALES</div>
                      <div>${formatDate(session.session_date)}</div>
                    </div>
                    
                    <div style="margin-bottom: 4px;">
                      <div class="item"><span>Session:</span><span>#${session.id}</span></div>
                      <div class="item"><span>Opened:</span><span>${formatTime(session.opened_at)}</span></div>
                      <div class="item"><span>Closed:</span><span>${formatTime(session.closed_at)}</span></div>
                      <div class="item"><span>Total Items:</span><span>${totalLines}</span></div>
                    </div>

                    <div style="border-top: 1px solid #000; padding-top: 4px; margin-bottom: 4px;">
                      <div style="font-weight: bold; margin-bottom: 2px;">TOP ITEMS:</div>
                      ${topItems.slice(0, 5).map(item => `
                        <div class="item">
                          <span>${item.sku} ${item.name.substring(0, 15)}</span>
                          <span>${item.qty} ${item.unit}</span>
                        </div>
                      `).join('')}
                    </div>

                    <div class="total">
                      <div class="item">
                        <span>TOTAL:</span>
                        <span>${formatCurrency(invoice.net)}</span>
                      </div>
                    </div>

                    <div class="footer">
                      See full invoice #${invoice.receipt_no}
                    </div>
                  </body>
                  </html>
                `;
                printWindow.document.write(printContent);
                printWindow.document.close();
                printWindow.print();
                printWindow.close();
              }
              onPrint?.();
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('quickSales.printSummary.printThermal')}
          </button>

          <button
            onClick={() => {
              // Print full A4 invoice
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                const printContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Quick Sales Invoice - ${invoice.receipt_no}</title>
                    <style>
                      @media print {
                        @page { size: A4; margin: 20mm; }
                        body { font-family: Arial, sans-serif; font-size: 12px; }
                      }
                      body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 20px; }
                      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
                      .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
                      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                      .items-table th, .items-table td { border: 1px solid #000; padding: 8px; text-align: left; }
                      .items-table th { background-color: #f0f0f0; font-weight: bold; }
                      .totals { text-align: right; margin-top: 20px; }
                      .total-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
                      .total-line.final { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 10px; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h1>QUICK SALES INVOICE</h1>
                      <h2>${formatDate(session.session_date)}</h2>
                    </div>
                    
                    <div class="invoice-details">
                      <div>
                        <strong>Invoice #:</strong> ${invoice.receipt_no}<br>
                        <strong>Session #:</strong> ${session.id}<br>
                        <strong>Opened:</strong> ${formatTime(session.opened_at)}<br>
                        <strong>Closed:</strong> ${formatTime(session.closed_at)}
                      </div>
                      <div>
                        <strong>Total Items:</strong> ${totalLines}<br>
                        <strong>Session Date:</strong> ${formatDate(session.session_date)}
                      </div>
                    </div>

                    <table class="items-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product Name</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${topItems.map(item => `
                          <tr>
                            <td>${item.sku}</td>
                            <td>${item.name}</td>
                            <td>${item.qty}</td>
                            <td>${item.unit}</td>
                            <td>${formatCurrency(item.line_total / item.qty)}</td>
                            <td>${formatCurrency(item.line_total)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>

                    <div class="totals">
                      <div class="total-line">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(invoice.gross)}</span>
                      </div>
                      <div class="total-line">
                        <span>Tax (15%):</span>
                        <span>${formatCurrency(invoice.tax)}</span>
                      </div>
                      <div class="total-line final">
                        <span>TOTAL:</span>
                        <span>${formatCurrency(invoice.net)}</span>
                      </div>
                    </div>

                    ${session.notes ? `
                      <div style="margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #007bff;">
                        <strong>Notes:</strong> ${session.notes}
                      </div>
                    ` : ''}
                  </body>
                  </html>
                `;
                printWindow.document.write(printContent);
                printWindow.document.close();
                printWindow.print();
                printWindow.close();
              }
              onPrint?.();
            }}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
          >
            {t('quickSales.printSummary.printFull')}
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}


