import { GRN, GRNLine, Supplier } from '../../types';

export interface GRNPrintData {
  header: GRN;
  lines: Array<GRNLine & { product?: { name: string; sku: string; barcode?: string } }>;
  supplier: Supplier;
  totals: {
    subtotal: number;
    tax: number;
    other: number;
    total: number;
  };
}

export class GRNPrintAdapter {
  /**
   * Render GRN as A4 HTML for printing
   */
  renderA4(data: GRNPrintData): string {
    const { header, lines, supplier, totals } = data;
    
    const formatCurrency = (amount: number) => 
      `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    
    const formatDate = (dateString: string) => 
      new Date(dateString).toLocaleDateString('en-LK');
    
    const formatDateTime = (dateString: string) => 
      new Date(dateString).toLocaleString('en-LK');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>GRN - ${header.grn_no}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 0;
        }
        
        .grn-container {
            max-width: 100%;
            margin: 0 auto;
        }
        
        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .company-info {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .company-address {
            font-size: 14px;
            color: #666;
        }
        
        .grn-title {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            text-transform: uppercase;
        }
        
        .grn-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .grn-info, .supplier-info {
            flex: 1;
        }
        
        .grn-info h3, .supplier-info h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            font-weight: bold;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 5px;
        }
        
        .info-label {
            font-weight: bold;
            width: 120px;
        }
        
        .info-value {
            flex: 1;
        }
        
        .lines-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .lines-table th,
        .lines-table td {
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
        }
        
        .lines-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
        }
        
        .lines-table .text-right {
            text-align: right;
        }
        
        .lines-table .text-center {
            text-align: center;
        }
        
        .totals-section {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
        }
        
        .totals-table {
            width: 300px;
            border-collapse: collapse;
        }
        
        .totals-table td {
            padding: 5px 10px;
            border: 1px solid #333;
        }
        
        .totals-table .label {
            font-weight: bold;
            background-color: #f5f5f5;
        }
        
        .totals-table .total-row {
            font-weight: bold;
            font-size: 14px;
            background-color: #e0e0e0;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        
        .notes {
            margin-top: 20px;
            padding: 10px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
        }
        
        .notes h4 {
            margin: 0 0 10px 0;
            font-size: 12px;
            font-weight: bold;
        }
        
        .notes p {
            margin: 0;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="grn-container">
        <div class="header">
            <div class="company-info">
                <div class="company-name">Grocery Store</div>
                <div class="company-address">123 Main Street, Colombo 01, Sri Lanka</div>
            </div>
            
            <div class="grn-title">GOODS RECEIVED NOTE</div>
            
            <div class="grn-details">
                <div class="grn-info">
                    <h3>GRN Details</h3>
                    <div class="info-row">
                        <div class="info-label">GRN No:</div>
                        <div class="info-value">${header.grn_no}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Date:</div>
                        <div class="info-value">${formatDate(header.datetime!)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Time:</div>
                        <div class="info-value">${formatDateTime(header.datetime!)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Status:</div>
                        <div class="info-value">${header.status}</div>
                    </div>
                </div>
                
                <div class="supplier-info">
                    <h3>Supplier Details</h3>
                    <div class="info-row">
                        <div class="info-label">Name:</div>
                        <div class="info-value">${supplier.supplier_name}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Phone:</div>
                        <div class="info-value">${supplier.contact_phone || 'N/A'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Email:</div>
                        <div class="info-value">${supplier.contact_email || 'N/A'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Address:</div>
                        <div class="info-value">${supplier.address || 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <table class="lines-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 15%;">SKU</th>
                    <th style="width: 25%;">Product Name</th>
                    <th style="width: 8%;">Qty</th>
                    <th style="width: 10%;">Unit Cost</th>
                    <th style="width: 10%;">MRP</th>
                    <th style="width: 12%;">Batch No</th>
                    <th style="width: 10%;">Expiry</th>
                    <th style="width: 10%;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${lines.map((line, index) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${line.product?.sku || 'N/A'}</td>
                        <td>${line.product?.name || 'Unknown Product'}</td>
                        <td class="text-right">${line.qty}</td>
                        <td class="text-right">${formatCurrency(line.unit_cost)}</td>
                        <td class="text-right">${line.mrp ? formatCurrency(line.mrp) : 'N/A'}</td>
                        <td class="text-center">${line.batch_no || 'N/A'}</td>
                        <td class="text-center">${line.expiry_date ? formatDate(line.expiry_date) : 'N/A'}</td>
                        <td class="text-right">${formatCurrency(line.line_total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="text-right">${formatCurrency(totals.subtotal)}</td>
                </tr>
                <tr>
                    <td class="label">Tax:</td>
                    <td class="text-right">${formatCurrency(totals.tax)}</td>
                </tr>
                <tr>
                    <td class="label">Other:</td>
                    <td class="text-right">${formatCurrency(totals.other)}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">Total:</td>
                    <td class="text-right">${formatCurrency(totals.total)}</td>
                </tr>
            </table>
        </div>
        
        ${header.note ? `
            <div class="notes">
                <h4>Notes:</h4>
                <p>${header.note}</p>
            </div>
        ` : ''}
        
        <div class="footer">
            <p>Generated by Grocery POS System</p>
            <p>Printed on: ${formatDateTime(new Date().toISOString())}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Print GRN to printer
   */
  async print(data: GRNPrintData): Promise<void> {
    const html = this.renderA4(data);
    
    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 100);
  }

  /**
   * Generate preview HTML
   */
  preview(data: GRNPrintData): string {
    return this.renderA4(data);
  }
}

// Export singleton instance
export const grnPrintAdapter = new GRNPrintAdapter();
