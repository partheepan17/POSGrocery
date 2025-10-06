import { LabelPreset, LabelItem, LabelBatch } from '@/types';
import { barcodeService } from '@/services/barcodeService';
import { useAppStore } from '@/store/appStore';

export interface LabelRenderOptions {
  dpi?: 203 | 300;
  scale?: number;
  showBorders?: boolean; // For debugging
}

export interface RenderedLabel {
  html: string;
  width: number;
  height: number;
}

export interface RenderedPage {
  html: string;
  labels: RenderedLabel[];
  pageNumber: number;
  totalPages: number;
}

export class LabelPrintAdapter {
  private static instance: LabelPrintAdapter;

  static getInstance(): LabelPrintAdapter {
    if (!LabelPrintAdapter.instance) {
      LabelPrintAdapter.instance = new LabelPrintAdapter();
    }
    return LabelPrintAdapter.instance;
  }

  /**
   * Render labels for thermal/continuous printer
   */
  async renderThermal(batch: LabelBatch, options: LabelRenderOptions = {}): Promise<RenderedLabel[]> {
    const { preset, items } = batch;
    const { dpi = 203, scale = 1.0, showBorders = false } = options;
    
    if (preset.paper !== 'THERMAL') {
      throw new Error('Thermal renderer only supports THERMAL paper type');
    }

    const renderedLabels: RenderedLabel[] = [];
    
    // Expand items based on quantity
    const expandedItems = this.expandItemsByQuantity(items);
    
    for (const item of expandedItems) {
      const rendered = await this.renderSingleLabel(preset, item, { dpi, scale, showBorders });
      renderedLabels.push(rendered);
    }
    
    return renderedLabels;
  }

  /**
   * Render labels for A4 sheet layout
   */
  async renderA4(batch: LabelBatch, options: LabelRenderOptions = {}): Promise<RenderedPage[]> {
    const { preset, items } = batch;
    const { dpi = 203, scale = 1.0, showBorders = false } = options;
    
    if (preset.paper !== 'A4' || !preset.a4) {
      throw new Error('A4 renderer only supports A4 paper type with grid configuration');
    }

    const pages: RenderedPage[] = [];
    const expandedItems = this.expandItemsByQuantity(items);
    const labelsPerPage = preset.a4.rows * preset.a4.cols;
    
    // Split items into pages
    for (let pageIndex = 0; pageIndex < Math.ceil(expandedItems.length / labelsPerPage); pageIndex++) {
      const pageItems = expandedItems.slice(
        pageIndex * labelsPerPage,
        (pageIndex + 1) * labelsPerPage
      );
      
      const pageLabels: RenderedLabel[] = [];
      
      // Render each label for this page
      for (const item of pageItems) {
        const rendered = await this.renderSingleLabel(preset, item, { dpi, scale, showBorders });
        pageLabels.push(rendered);
      }
      
      // Fill remaining slots with empty labels if needed
      while (pageLabels.length < labelsPerPage) {
        pageLabels.push(this.renderEmptyLabel(preset, { dpi, scale, showBorders }));
      }
      
      // Generate page HTML
      const pageHtml = this.generateA4PageHtml(preset, pageLabels, { showBorders });
      
      pages.push({
        html: pageHtml,
        labels: pageLabels,
        pageNumber: pageIndex + 1,
        totalPages: Math.ceil(expandedItems.length / labelsPerPage)
      });
    }
    
    return pages;
  }

  /**
   * Render a single label
   */
  private async renderSingleLabel(
    preset: LabelPreset, 
    item: LabelItem, 
    options: LabelRenderOptions = {}
  ): Promise<RenderedLabel> {
    const { dpi = 203, scale = 1.0, showBorders = false } = options;
    
    // Convert mm to pixels
    const mmToPx = (mm: number) => Math.round((mm * dpi / 25.4) * scale);
    const width = mmToPx(preset.size.width_mm);
    const height = mmToPx(preset.size.height_mm);
    
    // Get field values
    const fieldValues = this.extractFieldValues(item, preset);
    
    // Generate barcode if needed
    let barcodeHtml = '';
    if (preset.barcode) {
      try {
        const barcodeData = preset.barcode.source === 'barcode' ? item.barcode : item.sku;
        if (barcodeData) {
          const barcode = preset.barcode.symbology === 'EAN13' 
            ? barcodeService.encodeEAN13(barcodeData)
            : barcodeService.encodeCode128(barcodeData);
          
          const barcodeWidth = Math.min(width * 0.8, 120);
          const barcodeHeight = preset.size.height_mm > 25 ? 25 : 15;
          
          barcodeHtml = `
            <div class="barcode" style="
              width: ${barcodeWidth}px; 
              height: ${barcodeHeight}px; 
              margin: 2px auto;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 100%; 
                height: 100%; 
                background-image: url('${barcodeService.svgToDataUrl(barcode.data)}');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
              "></div>
            </div>
          `;
        }
      } catch (error) {
        console.warn('Failed to generate barcode:', error);
        barcodeHtml = `<div class="barcode-error" style="font-size: 8px; color: red; text-align: center;">Invalid barcode</div>`;
      }
    }
    
    // Generate HTML
    const html = `
      <div class="label" style="
        width: ${width}px;
        height: ${height}px;
        border: ${showBorders ? '1px solid #ccc' : 'none'};
        box-sizing: border-box;
        padding: 2px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-family: Arial, sans-serif;
        font-size: ${Math.round(10 * preset.style.font_scale)}px;
        text-align: ${preset.style.align};
        background: white;
        color: black;
        overflow: hidden;
        page-break-inside: avoid;
      ">
        ${preset.style.show_store_logo ? this.renderStoreLogo() : ''}
        
        <div class="content" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
          ${this.renderSections(fieldValues, preset, barcodeHtml)}
        </div>
      </div>
    `;
    
    return { html, width, height };
  }

  /**
   * Render sections according to preset order
   */
  private renderSections(
    fieldValues: any, 
    preset: LabelPreset, 
    barcodeHtml: string
  ): string {
    const sectionOrder = preset.style.sectionOrder || [
      'store', 'name_en', 'name_si', 'name_ta', 'barcode', 'price', 'mrp', 'batch', 'dates', 'desc'
    ];
    let html = '';
    
    for (const section of sectionOrder) {
      switch (section) {
        case 'store':
          if (fieldValues.storeName) {
            html += `<div class="store-name" style="
              font-weight: bold;
              font-size: ${Math.round(9 * preset.style.font_scale)}px;
              margin-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${this.escapeHtml(fieldValues.storeName)}</div>`;
          }
          break;
        case 'name_en':
          if (fieldValues.name_en) {
            html += `<div class="name-en" style="
              font-weight: ${preset.style.bold_name ? 'bold' : 'normal'};
              font-size: ${Math.round(11 * preset.style.font_scale)}px;
              margin-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${this.escapeHtml(fieldValues.name_en)}</div>`;
          }
          break;
        case 'name_si':
          if (fieldValues.name_si) {
            html += `<div class="name-si" style="
              font-size: ${Math.round(9 * preset.style.font_scale)}px;
              margin-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${this.escapeHtml(fieldValues.name_si)}</div>`;
          }
          break;
        case 'name_ta':
          if (fieldValues.name_ta) {
            html += `<div class="name-ta" style="
              font-size: ${Math.round(9 * preset.style.font_scale)}px;
              margin-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${this.escapeHtml(fieldValues.name_ta)}</div>`;
          }
          break;
          
        case 'barcode':
          html += barcodeHtml;
          break;
          
        case 'price':
          if (fieldValues.price) {
            html += `<div class="price" style="
              font-weight: bold;
              font-size: ${Math.round(12 * preset.style.font_scale)}px;
              margin-top: 1px;
            ">${fieldValues.price}</div>`;
          }
          break;
          
        case 'mrp':
          if (fieldValues.mrp) {
            html += `<div class="mrp" style="
              font-size: ${Math.round(9 * preset.style.font_scale)}px;
              margin-top: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${this.escapeHtml(fieldValues.mrp)}</div>`;
          }
          break;
          
        case 'batch':
          if (fieldValues.batch) {
            html += `<div class="batch" style="
              font-size: ${Math.round(8 * preset.style.font_scale)}px;
              margin-top: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${this.escapeHtml(fieldValues.batch)}</div>`;
          }
          break;
          
        case 'dates':
          if (fieldValues.packedDate) {
            html += `<div class="packed-date" style="
              font-size: ${Math.round(7 * preset.style.font_scale)}px;
              margin-top: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${this.escapeHtml(fieldValues.packedDate)}</div>`;
          }
          if (fieldValues.expiryDate) {
            html += `<div class="expiry-date" style="
              font-size: ${Math.round(7 * preset.style.font_scale)}px;
              margin-top: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${this.escapeHtml(fieldValues.expiryDate)}</div>`;
          }
          break;
        case 'desc':
          if (fieldValues.description) {
            html += `<div class="desc" style="
              font-size: ${Math.round(7 * preset.style.font_scale)}px;
              margin-top: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${this.escapeHtml(fieldValues.description)}</div>`;
          }
          break;
        // Backward compatibility for older presets using 'name' and 'line2'
        case 'name':
          if (fieldValues.line1) {
            html += `<div class=\"line1\" style=\"
              font-weight: ${preset.style.bold_name ? 'bold' : 'normal'};
              font-size: ${Math.round(11 * preset.style.font_scale)}px;
              margin-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            \">${this.escapeHtml(fieldValues.line1)}</div>`;
          }
          if (fieldValues.line2) {
            html += `<div class=\"line2\" style=\"
              font-size: ${Math.round(8 * preset.style.font_scale)}px;
              margin-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            \">${this.escapeHtml(fieldValues.line2)}</div>`;
          }
          break;
      }
    }
    
    return html;
  }

  /**
   * Render empty label for A4 grid
   */
  private renderEmptyLabel(preset: LabelPreset, options: LabelRenderOptions = {}): RenderedLabel {
    const { dpi = 203, scale = 1.0, showBorders = false } = options;
    
    const mmToPx = (mm: number) => Math.round((mm * dpi / 25.4) * scale);
    const width = mmToPx(preset.size.width_mm);
    const height = mmToPx(preset.size.height_mm);
    
    const html = `
      <div class="label empty" style="
        width: ${width}px;
        height: ${height}px;
        border: ${showBorders ? '1px dashed #ddd' : 'none'};
        box-sizing: border-box;
        background: white;
      "></div>
    `;
    
    return { html, width, height };
  }

  /**
   * Generate A4 page HTML with grid layout
   */
  private generateA4PageHtml(
    preset: LabelPreset, 
    labels: RenderedLabel[], 
    options: { showBorders?: boolean } = {}
  ): string {
    if (!preset.a4) {
      throw new Error('A4 configuration required');
    }
    
    const { rows, cols, page_width_mm, page_height_mm, margin_mm, gutter_mm } = preset.a4;
    const { showBorders = false } = options;
    
    // Convert to pixels (using 96 DPI for web display)
    const webDpi = 96;
    const mmToPx = (mm: number) => Math.round(mm * webDpi / 25.4);
    
    const pageWidth = mmToPx(page_width_mm);
    const pageHeight = mmToPx(page_height_mm);
    const margin = mmToPx(margin_mm);
    const gutter = mmToPx(gutter_mm);
    
    const labelWidth = mmToPx(preset.size.width_mm);
    const labelHeight = mmToPx(preset.size.height_mm);
    
    let labelsHtml = '';
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const labelIndex = row * cols + col;
        const label = labels[labelIndex];
        
        if (label) {
          const x = margin + col * (labelWidth + gutter);
          const y = margin + row * (labelHeight + gutter);
          
          labelsHtml += `
            <div style="
              position: absolute;
              left: ${x}px;
              top: ${y}px;
              width: ${labelWidth}px;
              height: ${labelHeight}px;
            ">
              ${label.html}
            </div>
          `;
        }
      }
    }
    
    return `
      <div class="a4-page" style="
        position: relative;
        width: ${pageWidth}px;
        height: ${pageHeight}px;
        margin: 0 auto;
        background: white;
        border: ${showBorders ? '1px solid #000' : 'none'};
        box-sizing: border-box;
        page-break-after: always;
      ">
        ${labelsHtml}
      </div>
    `;
  }

  /**
   * Extract field values from label item based on preset configuration
   */
  private extractFieldValues(item: LabelItem, preset: LabelPreset): {
    // New explicit fields
    storeName?: string;
    name_en?: string;
    name_si?: string;
    name_ta?: string;
    description?: string;
    // Back-compat fields
    line1?: string;
    line2?: string;
    price?: string;
    mrp?: string;
    batch?: string;
    packedDate?: string;
    expiryDate?: string;
  } {
    const values: {
      storeName?: string;
      name_en?: string;
      name_si?: string;
      name_ta?: string;
      description?: string;
      line1?: string;
      line2?: string;
      price?: string;
      mrp?: string;
      batch?: string;
      packedDate?: string;
      expiryDate?: string;
    } = {};
    
    // Determine language for product name
    let productLanguage: 'EN' | 'SI' | 'TA' = 'EN';
    if (preset.fields.languageMode === 'per_item' && item.language) {
      productLanguage = item.language;
    } else {
      // Use preset default language based on line1 setting
      switch (preset.fields.line1) {
        case 'name_si':
          productLanguage = 'SI';
          break;
        case 'name_ta':
          productLanguage = 'TA';
          break;
        default:
          productLanguage = 'EN';
      }
    }
    
    // Store/Outlet name
    try {
      const settings = useAppStore.getState().settings;
      values.storeName = settings?.storeInfo?.name || '';
    } catch {}

    // Line 1 - use determined language (legacy)
    if (productLanguage === 'SI') {
      values.line1 = item.name_si || item.name_en;
    } else if (productLanguage === 'TA') {
      values.line1 = item.name_ta || item.name_en;
    } else {
      values.line1 = item.name_en;
    }
    
    // Override with custom if specified
    if (preset.fields.line1 === 'custom') {
      values.line1 = item.custom_line1;
    }
    
    // Explicit names for multilingual rendering
    values.name_en = item.name_en;
    values.name_si = item.name_si || '';
    values.name_ta = item.name_ta || '';

    // Line 2
    if (preset.fields.line2) {
      switch (preset.fields.line2) {
        case 'sku':
          values.line2 = item.sku;
          break;
        case 'category':
          values.line2 = item.category;
          break;
        case 'custom':
          values.line2 = item.custom_line2;
          break;
      }
    }
    
    // Price
    if (preset.fields.price.enabled) {
      let price = 0;
      switch (preset.fields.price.source) {
        case 'retail':
          price = item.price_retail;
          break;
        case 'wholesale':
          price = item.price_wholesale;
          break;
        case 'credit':
          price = item.price_credit;
          break;
        case 'other':
          price = item.price_other;
          break;
      }
      
      const formattedPrice = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2
      }).format(price);
      
      let priceText = formattedPrice;
      if (preset.fields.price.show_label) {
        priceText = `Price: ${formattedPrice}`;
      }
      
      // Add weight hint for kg items
      if (preset.fields.weight_hint && item.unit === 'kg') {
        priceText += '/kg';
      }
      
      values.price = priceText;
    }
    
    // MRP
    if (preset.fields.showMRP && item.mrp !== null && item.mrp !== undefined) {
      const mrpLabel = preset.fields.mrpLabel || 'MRP';
      const formattedMRP = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2
      }).format(item.mrp);
      values.mrp = `${mrpLabel}: ${formattedMRP}`;
    }
    
    // Batch Number
    if (preset.fields.showBatch && item.batchNo) {
      const batchLabel = preset.fields.batchLabel || 'Batch';
      values.batch = `${batchLabel}: ${item.batchNo}`;
    }
    
    // Dates
    const dateFormat = preset.fields.dateFormat || useAppStore.getState().labelSettings.defaultDateFormat;
    
    if (preset.fields.showPackedDate && item.packedDate) {
      const packedLabel = preset.fields.packedLabel || 'Packed';
      values.packedDate = `${packedLabel}: ${this.formatDate(item.packedDate, dateFormat)}`;
    }
    
    if (preset.fields.showExpiryDate && item.expiryDate) {
      const expiryLabel = preset.fields.expiryLabel || 'Expiry';
      values.expiryDate = `${expiryLabel}: ${this.formatDate(item.expiryDate, dateFormat)}`;
    }
    
    // Description (truncate to 50 characters)
    if (item.description || item.custom_line2 || item.category) {
      const descSource = (item.description || item.custom_line2 || item.category || '').toString();
      values.description = this.truncateText(descSource, 50);
    }

    return values;
  }

  /**
   * Format date according to specified format
   */
  private formatDate(dateStr: string, format: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return original if invalid
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Truncate text to a maximum length with ellipsis
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 1)).trimEnd() + '…';
  }

  /**
   * Expand items based on their quantity
   */
  private expandItemsByQuantity(items: LabelItem[]): LabelItem[] {
    const expanded: LabelItem[] = [];
    
    for (const item of items) {
      for (let i = 0; i < item.qty; i++) {
        expanded.push(item);
      }
    }
    
    return expanded;
  }

  /**
   * Render store logo if configured
   */
  private renderStoreLogo(): string {
    // Get logo from app settings
    const settings = useAppStore.getState().settings;
    const logoUrl = settings?.storeInfo?.logoUrl;
    
    if (!logoUrl) {
      return '';
    }
    
    return `
      <div class="logo" style="
        text-align: center;
        margin-bottom: 2px;
      ">
        <img src="${logoUrl}" alt="Store Logo" style="
          max-width: 30px;
          max-height: 15px;
          object-fit: contain;
        " />
      </div>
    `;
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Print thermal labels
   */
  async printThermal(batch: LabelBatch, options: LabelRenderOptions = {}): Promise<void> {
    try {
      const labels = await this.renderThermal(batch, options);
      
      // Combine all labels into a single document
      const combinedHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Label Print - ${batch.preset.name}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .label { page-break-after: always; }
                .label:last-child { page-break-after: avoid; }
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 0; 
              }
            </style>
          </head>
          <body>
            ${labels.map(label => label.html).join('\n')}
          </body>
        </html>
      `;
      
      this.openPrintWindow(combinedHtml, 'Thermal Labels');
    } catch (error) {
      console.error('❌ Failed to print thermal labels:', error);
      throw error;
    }
  }

  /**
   * Print A4 labels
   */
  async printA4(batch: LabelBatch, options: LabelRenderOptions = {}): Promise<void> {
    try {
      const pages = await this.renderA4(batch, options);
      
      const combinedHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Label Print - ${batch.preset.name}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .a4-page { page-break-after: always; }
                .a4-page:last-child { page-break-after: avoid; }
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: #f0f0f0;
              }
            </style>
          </head>
          <body>
            ${pages.map(page => page.html).join('\n')}
          </body>
        </html>
      `;
      
      this.openPrintWindow(combinedHtml, 'A4 Labels');
    } catch (error) {
      console.error('❌ Failed to print A4 labels:', error);
      throw error;
    }
  }

  /**
   * Open print window
   */
  private openPrintWindow(html: string, title: string): void {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Auto-print after a short delay
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      throw new Error('Failed to open print window. Pop-up blocker may be enabled.');
    }
  }
}

// Export singleton instance
export const labelPrintAdapter = LabelPrintAdapter.getInstance();
