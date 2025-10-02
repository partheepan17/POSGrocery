import React, { useState, useEffect } from 'react';
import { ReceiptPayload } from '@/types/receipt';
import { Thermal58Adapter } from '@/adapters/receipt/Thermal58Adapter';
import { Thermal80Adapter } from '@/adapters/receipt/Thermal80Adapter';
import { A4PreviewAdapter } from '@/adapters/receipt/A4PreviewAdapter';

// Mock data for testing
const mockSales = [
  {
    id: 'INV001',
    datetime: new Date().toISOString(),
    language: 'EN' as const,
    priceTier: 'Retail' as const,
    items: [
      {
        sku: 'RICE5',
        name_en: 'Rice 5kg',
        name_si: 'හාල් 5kg',
        name_ta: 'அரிசி 5kg',
        unit: 'pc' as const,
        qty: 1,
        unitPrice: 1450,
        lineDiscount: 0,
        tax: 217.5,
        total: 1667.5
      },
      {
        sku: 'SUGAR1',
        name_en: 'Sugar 1kg',
        name_si: 'සීනි 1kg',
        name_ta: 'சர்க்கரை 1kg',
        unit: 'kg' as const,
        qty: 2.5,
        unitPrice: 210,
        lineDiscount: 25,
        tax: 61.25,
        total: 496.25
      },
      {
        sku: 'APPLE',
        name_en: 'Apple',
        name_si: 'ඇපල්',
        name_ta: 'ஆப்பிள்',
        unit: 'kg' as const,
        qty: 1.25,
        unitPrice: 950,
        lineDiscount: 0,
        tax: 142.5,
        total: 1230
      }
    ],
    totals: {
      gross: 3725,
      discount: 25,
      tax: 421.25,
      net: 4121.25
    },
    payments: {
      cash: 5000,
      card: 0,
      wallet: 0,
      change: 878.75
    }
  },
  {
    id: 'INV002',
    datetime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    language: 'SI' as const,
    priceTier: 'Wholesale' as const,
    items: [
      {
        sku: 'FLOUR1',
        name_en: 'Flour 1kg',
        name_si: 'පිටි 1kg',
        name_ta: 'மாவு 1kg',
        unit: 'pc' as const,
        qty: 3,
        unitPrice: 250,
        lineDiscount: 15,
        tax: 105,
        total: 735
      }
    ],
    totals: {
      gross: 750,
      discount: 15,
      tax: 105,
      net: 840
    },
    payments: {
      cash: 0,
      card: 840,
      wallet: 0,
      change: 0
    }
  }
];

export function ReceiptTest() {
  const [selectedSale, setSelectedSale] = useState(mockSales[0]);
  const [language, setLanguage] = useState<'EN' | 'SI' | 'TA'>('EN');
  const [paper, setPaper] = useState<'58mm' | '80mm' | 'A4'>('58mm');
  const [isReprint, setIsReprint] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');

  const adapters = {
    '58mm': new Thermal58Adapter(),
    '80mm': new Thermal80Adapter(),
    'A4': new A4PreviewAdapter()
  };

  const generateReceiptPayload = (): ReceiptPayload => {
    return {
      store: {
        name: 'Grocery POS Store',
        address: '123 Main Street, Colombo 01',
        taxId: '123456789V',
        logoUrl: undefined
      },
      terminalName: 'Counter-1',
      invoice: {
        id: selectedSale.id,
        datetime: selectedSale.datetime,
        language: language,
        priceTier: selectedSale.priceTier,
        isReprint: isReprint,
        items: selectedSale.items,
        totals: selectedSale.totals,
        payments: selectedSale.payments
      },
      options: {
        paper: paper,
        showQRCode: showQR,
        showBarcode: showBarcode,
        openCashDrawerOnCash: false, // Test mode
        roundingMode: 'NEAREST_1',
        footerText: {
          EN: 'Warranty: 7 days | Hotline: 011-1234567',
          SI: 'වගකීම: දින 7 | දුරකථන: 011-1234567',
          TA: 'உத்தரவாதம்: 7 நாட்கள் | தொலைபேசி: 011-1234567'
        }
      }
    };
  };

  const updatePreview = async () => {
    try {
      const payload = generateReceiptPayload();
      const adapter = adapters[paper];
      const html = await adapter.preview(payload);
      setPreviewHtml(html);
    } catch (error) {
      console.error('Error generating preview:', error);
      setPreviewHtml('<div style="padding: 20px; color: red;">Error generating preview</div>');
    }
  };

  const handlePrint = async () => {
    try {
      const payload = generateReceiptPayload();
      const adapter = adapters[paper];
      await adapter.print(payload);
    } catch (error) {
      console.error('Error printing:', error);
      alert('Error printing receipt: ' + (error as Error).message);
    }
  };

  useEffect(() => {
    console.log('ReceiptTest mounted, mockSales:', mockSales);
    console.log('mockSales length:', mockSales.length);
    console.log('selectedSale:', selectedSale);
    updatePreview();
  }, [selectedSale, language, paper, isReprint, showQR, showBarcode]);

  return (
    <div className="container mx-auto p-6">
      <style>{`
        .receipt-preview-container {
          font-family: 'Courier New', monospace;
          line-height: 1.2;
        }
        
        .receipt-preview-container * {
          max-width: 100% !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          white-space: pre-wrap !important;
        }
        
        .receipt-preview-container .receipt {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 10px !important;
          box-sizing: border-box !important;
        }
        
        .receipt-preview-container .receipt-header,
        .receipt-preview-container .receipt-items,
        .receipt-preview-container .receipt-totals,
        .receipt-preview-container .receipt-footer {
          width: 100% !important;
          max-width: 100% !important;
          word-wrap: break-word !important;
        }
        
        .receipt-preview-container .item-line {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          width: 100% !important;
          margin-bottom: 2px !important;
          word-wrap: break-word !important;
        }
        
        .receipt-preview-container .item-name {
          flex: 1 !important;
          word-wrap: break-word !important;
          margin-right: 5px !important;
        }
        
        .receipt-preview-container .item-price {
          flex-shrink: 0 !important;
          text-align: right !important;
          white-space: nowrap !important;
        }
        
        /* For thermal receipt styles */
        .receipt-preview-container .thermal-receipt {
          width: 100% !important;
          max-width: 100% !important;
          font-size: 12px !important;
          line-height: 1.1 !important;
        }
        
        /* For A4 receipt styles */
        .receipt-preview-container .a4-receipt {
          width: 100% !important;
          max-width: 100% !important;
          font-size: 14px !important;
          line-height: 1.3 !important;
        }
      `}</style>
      <h1 className="text-3xl font-bold mb-6">Receipt Test Harness</h1>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Controls Panel */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          
          {/* Sale Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Sale:</label>
            
            {/* Primary selection method - Button-based selector */}
            <div className="space-y-2">
              {mockSales.map(sale => (
                <button
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all duration-200 ${
                    selectedSale.id === sale.id
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{sale.id}</div>
                      <div className="text-sm text-gray-500">
                        {sale.language} • {sale.priceTier} • {sale.items.length} items
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">රු {sale.totals.net.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(sale.datetime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
              <strong>Debug:</strong> {mockSales.length} sales loaded | Selected: {selectedSale.id}
            </div>
          </div>

          {/* Language Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Language:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['EN', 'SI', 'TA'] as const).map(lang => (
                <button
                  key={lang}
                  className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                    language === lang
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setLanguage(lang)}
                >
                  <div className="font-semibold">{lang}</div>
                  <div className="text-xs opacity-75">
                    {lang === 'EN' ? 'English' : lang === 'SI' ? 'සිංහල' : 'தமிழ்'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Paper Size */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Paper Size:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['58mm', '80mm', 'A4'] as const).map(size => (
                <button
                  key={size}
                  className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                    paper === size
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setPaper(size)}
                >
                  <div className="font-semibold">{size}</div>
                  <div className="text-xs opacity-75">
                    {size === '58mm' ? 'Thermal Small' : size === '80mm' ? 'Thermal Large' : 'A4 Invoice'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Print Options:</label>
            <div className="space-y-3">
              <label className="flex items-center p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={isReprint}
                  onChange={(e) => setIsReprint(e.target.checked)}
                  className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium">Reprint Watermark</div>
                  <div className="text-xs text-gray-500">Add "REPRINT" watermark to receipt</div>
                </div>
              </label>
              <label className="flex items-center p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={showQR}
                  onChange={(e) => setShowQR(e.target.checked)}
                  className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium">Show QR Code</div>
                  <div className="text-xs text-gray-500">Include QR code for invoice verification</div>
                </div>
              </label>
              <label className="flex items-center p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={showBarcode}
                  onChange={(e) => setShowBarcode(e.target.checked)}
                  className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium">Show Barcode</div>
                  <div className="text-xs text-gray-500">Include barcode with invoice number</div>
                </div>
              </label>
            </div>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors duration-200 font-semibold flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Test Receipt</span>
          </button>

          {/* Sale Details */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-bold mb-2">Sale Details:</h3>
            <div className="text-sm space-y-1">
              <div><strong>ID:</strong> {selectedSale.id}</div>
              <div><strong>Date:</strong> {new Date(selectedSale.datetime).toLocaleString()}</div>
              <div><strong>Language:</strong> {selectedSale.language}</div>
              <div><strong>Price Tier:</strong> {selectedSale.priceTier}</div>
              <div><strong>Items:</strong> {selectedSale.items.length}</div>
              <div><strong>Net Total:</strong> රු {selectedSale.totals.net.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Receipt Preview</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded">{paper}</span>
              <span className="px-2 py-1 bg-gray-100 rounded">{language}</span>
            </div>
          </div>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white">
            <div 
              className="receipt-preview-container"
              style={{ 
                height: '600px', 
                overflow: 'auto',
                backgroundColor: 'white',
                width: '100%',
                maxWidth: '100%'
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
          
          {/* Preview Controls */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={updatePreview}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors duration-200 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Preview</span>
            </button>
            <button
              onClick={() => {
                const previewWindow = window.open('', '_blank');
                if (previewWindow) {
                  previewWindow.document.write(previewHtml);
                  previewWindow.document.close();
                }
              }}
              className="bg-gray-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Open in New Window</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedSale.id);
                alert('Sale ID copied to clipboard!');
              }}
              className="bg-purple-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-purple-600 transition-colors duration-200 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Sale ID</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Instructions */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Test Instructions</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Select different sales to test various scenarios</li>
          <li>Switch languages to verify multilingual support (EN/SI/TA)</li>
          <li>Test different paper sizes (58mm thermal, 80mm thermal, A4)</li>
          <li>Toggle reprint watermark to see reprint indication</li>
          <li>Enable/disable QR codes and barcodes</li>
          <li>Use "Print Test Receipt" to test actual printing</li>
          <li>Verify correct product names are shown in selected language</li>
          <li>Check that scale items (kg) show proper decimal places</li>
          <li>Confirm totals and payments are formatted correctly</li>
        </ul>
      </div>
    </div>
  );
}
