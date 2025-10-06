import { LabelPreset, LabelItem, LabelJob, LabelBatch, LabelSource } from '@/types';
import { dataService, Product } from '@/services/dataService';
import { grnService } from '@/services/grnService';
import { useAppStore } from '@/store/appStore';

export interface GenerateLabelOptions {
  source: LabelSource;
  productIds?: string[];
  grnId?: string;
  csvData?: LabelItem[];
  preset: LabelPreset;
  overrides?: {
    qty?: number;
    priceTier?: 'retail' | 'wholesale' | 'credit' | 'other';
    language?: 'EN' | 'SI' | 'TA';
  };
}

/**
 * Validate label item dates
 */
export function validateLabelItemDates(
  item: LabelItem, 
  fmt: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Helper to parse date based on format
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    let parsedDate: Date | null = null;
    
    switch (fmt) {
      case 'YYYY-MM-DD':
        // ISO format - preferred
        parsedDate = new Date(dateStr);
        break;
      case 'DD/MM/YYYY':
        const [day, month, year] = dateStr.split('/');
        if (day && month && year) {
          parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        }
        break;
      case 'MM/DD/YYYY':
        const [monthUS, dayUS, yearUS] = dateStr.split('/');
        if (monthUS && dayUS && yearUS) {
          parsedDate = new Date(`${yearUS}-${monthUS.padStart(2, '0')}-${dayUS.padStart(2, '0')}`);
        }
        break;
    }
    
    return parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null;
  };
  
  // Validate packed date
  if (item.packedDate) {
    const packedDate = parseDate(item.packedDate);
    if (!packedDate) {
      errors.push(`Invalid packed date format. Expected ${fmt}: ${item.packedDate}`);
    }
  }
  
  // Validate expiry date
  if (item.expiryDate) {
    const expiryDate = parseDate(item.expiryDate);
    if (!expiryDate) {
      errors.push(`Invalid expiry date format. Expected ${fmt}: ${item.expiryDate}`);
    }
  }
  
  // Validate date relationship
  if (item.packedDate && item.expiryDate) {
    const packedDate = parseDate(item.packedDate);
    const expiryDate = parseDate(item.expiryDate);
    
    if (packedDate && expiryDate && expiryDate < packedDate) {
      errors.push('Expiry date cannot be before packed date');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export class LabelService {
  private static instance: LabelService;

  static getInstance(): LabelService {
    if (!LabelService.instance) {
      LabelService.instance = new LabelService();
    }
    return LabelService.instance;
  }

  /**
   * Get all label presets
   */
  async listPresets(): Promise<LabelPreset[]> {
    try {
      const presetsJson = localStorage.getItem('label_presets');
      if (!presetsJson) {
        return this.getDefaultPresets();
      }
      const presets = JSON.parse(presetsJson) as LabelPreset[];
      return presets.length > 0 ? presets : this.getDefaultPresets();
    } catch (error) {
      console.error('Failed to load label presets:', error);
      return this.getDefaultPresets();
    }
  }

  /**
   * Get a specific preset by ID
   */
  async getPreset(id: string): Promise<LabelPreset | null> {
    const presets = await this.listPresets();
    return presets.find(p => p.id === id) || null;
  }

  /**
   * Save a label preset
   */
  async savePreset(preset: LabelPreset): Promise<void> {
    try {
      const presets = await this.listPresets();
      const existingIndex = presets.findIndex(p => p.id === preset.id);
      
      if (existingIndex >= 0) {
        presets[existingIndex] = preset;
      } else {
        presets.push(preset);
      }
      
      localStorage.setItem('label_presets', JSON.stringify(presets));
      console.log('✅ Label preset saved:', preset.name);
    } catch (error) {
      console.error('❌ Failed to save label preset:', error);
      throw new Error('Failed to save label preset');
    }
  }

  /**
   * Delete a label preset
   */
  async deletePreset(id: string): Promise<void> {
    try {
      const presets = await this.listPresets();
      const filteredPresets = presets.filter(p => p.id !== id);
      localStorage.setItem('label_presets', JSON.stringify(filteredPresets));
      console.log('✅ Label preset deleted:', id);
    } catch (error) {
      console.error('❌ Failed to delete label preset:', error);
      throw new Error('Failed to delete label preset');
    }
  }

  /**
   * Generate label items from various sources
   */
  async generateLabelItems(options: GenerateLabelOptions): Promise<LabelItem[]> {
    const { source, preset, overrides = {} } = options;
    
    try {
      switch (source) {
        case 'products':
          return await this.generateFromProducts(options.productIds || [], preset, overrides);
        
        case 'grn':
          return await this.generateFromGRN(options.grnId || '', preset, overrides);
        
        case 'csv':
          return this.generateFromCSV(options.csvData || [], preset, overrides);
        
        default:
          throw new Error(`Unsupported label source: ${source}`);
      }
    } catch (error) {
      console.error('❌ Failed to generate label items:', error);
      throw error;
    }
  }

  /**
   * Generate labels from selected products
   */
  private async generateFromProducts(
    productIds: string[], 
    preset: LabelPreset, 
    overrides: GenerateLabelOptions['overrides'] = {}
  ): Promise<LabelItem[]> {
    const products = await dataService.getProducts();
    const categories = await dataService.getCategories();
    
    const selectedProducts = products.filter(p => productIds.includes(p.id.toString()));
    
    return selectedProducts.map(product => {
      const category = categories.find(c => c.id === product.category_id);
      
      return {
        id: `${product.id}-${Date.now()}`,
        sku: product.sku,
        barcode: product.barcode,
        name_en: product.name_en,
        name_si: product.name_si,
        name_ta: product.name_ta,
        category: category?.name,
        unit: product.unit,
        price_retail: product.price_retail,
        price_wholesale: product.price_wholesale,
        price_credit: product.price_credit,
        price_other: product.price_other,
        qty: overrides.qty || preset.defaults.qty,
        price_tier: overrides.priceTier || preset.fields.price.source,
        language: overrides.language || preset.defaults.language,
        // New fields - initially null, can be set by user
        packedDate: null,
        expiryDate: null,
        mrp: null,
        batchNo: null,
      };
    });
  }

  /**
   * Generate labels from GRN lines
   */
  private async generateFromGRN(
    grnId: string, 
    preset: LabelPreset, 
    overrides: GenerateLabelOptions['overrides'] = {}
  ): Promise<LabelItem[]> {
    try {
      // Get GRN details and lines from GRN service
      const grnData = await grnService.getGRN(parseInt(grnId));
      const grn = grnData.header;
      const lines = grnData.lines;
      
      if (!grn || !lines) {
        throw new Error('GRN not found');
      }

      const categories = await dataService.getCategories();
      
      return lines.map((line: any) => {
        const category = categories.find(c => c.id === line.product_category_id);
        
        return {
          id: `grn-${grnId}-${line.product_id}-${Date.now()}`,
          sku: line.product_sku,
          barcode: line.product_barcode,
          name_en: line.product_name,
          name_si: line.product_name_si,
          name_ta: line.product_name_ta,
          category: category?.name,
          unit: line.product_unit,
          price_retail: line.product_price_retail || 0,
          price_wholesale: line.product_price_wholesale || 0,
          price_credit: line.product_price_credit || 0,
          price_other: line.product_price_other || 0,
          qty: overrides.qty !== undefined ? overrides.qty : line.qty, // Default to received qty
          price_tier: overrides.priceTier || preset.fields.price.source,
          language: overrides.language || preset.defaults.language,
          // New fields from GRN data if available
          packedDate: line.packed_date || null,
          expiryDate: line.expiry_date || null,
          mrp: line.mrp || null,
          batchNo: line.batch_no || null,
        };
      });
    } catch (error) {
      console.error('❌ Failed to generate labels from GRN:', error);
      throw new Error('Failed to generate labels from GRN');
    }
  }

  /**
   * Generate labels from CSV data
   */
  private generateFromCSV(
    csvData: LabelItem[], 
    preset: LabelPreset, 
    overrides: GenerateLabelOptions['overrides'] = {}
  ): LabelItem[] {
    return csvData.map(item => ({
      ...item,
      id: `csv-${item.sku}-${Date.now()}`,
      qty: overrides.qty !== undefined ? overrides.qty : (item.qty || preset.defaults.qty),
      price_tier: overrides.priceTier || item.price_tier || preset.fields.price.source,
      language: overrides.language || item.language || preset.defaults.language,
      // Normalize description length to 50 chars if provided
      description: item.description ? (item.description.length > 50 ? item.description.slice(0, 49) + '…' : item.description) : item.description,
    }));
  }

  /**
   * Record a print job in history
   */
  async recordJob(
    preset: LabelPreset, 
    items: LabelItem[], 
    source: LabelSource,
    printedBy?: string,
    terminal?: string
  ): Promise<LabelJob> {
    try {
      const job: LabelJob = {
        id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        preset_name: preset.name,
        source,
        items_count: items.reduce((sum, item) => sum + item.qty, 0),
        printed_by: printedBy,
        terminal,
        items: items.slice(0, 10) // Store first 10 items for preview
      };

      // Get existing jobs
      const jobsJson = localStorage.getItem('label_jobs');
      const jobs: LabelJob[] = jobsJson ? JSON.parse(jobsJson) : [];
      
      // Add new job at the beginning
      jobs.unshift(job);
      
      // Keep only last 200 jobs
      const trimmedJobs = jobs.slice(0, 200);
      
      localStorage.setItem('label_jobs', JSON.stringify(trimmedJobs));
      
      console.log('✅ Label job recorded:', job.id);
      return job;
    } catch (error) {
      console.error('❌ Failed to record label job:', error);
      throw new Error('Failed to record label job');
    }
  }

  /**
   * List print job history
   */
  async listJobs(filters?: {
    fromDate?: Date;
    toDate?: Date;
    source?: LabelSource;
    preset?: string;
    limit?: number;
  }): Promise<LabelJob[]> {
    try {
      const jobsJson = localStorage.getItem('label_jobs');
      if (!jobsJson) return [];
      
      let jobs: LabelJob[] = JSON.parse(jobsJson);
      
      // Convert timestamp strings back to Date objects
      jobs = jobs.map(job => ({
        ...job,
        timestamp: new Date(job.timestamp)
      }));
      
      // Apply filters
      if (filters) {
        if (filters.fromDate) {
          jobs = jobs.filter(job => job.timestamp >= filters.fromDate!);
        }
        if (filters.toDate) {
          jobs = jobs.filter(job => job.timestamp <= filters.toDate!);
        }
        if (filters.source) {
          jobs = jobs.filter(job => job.source === filters.source);
        }
        if (filters.preset) {
          jobs = jobs.filter(job => job.preset_name.toLowerCase().includes(filters.preset!.toLowerCase()));
        }
        if (filters.limit) {
          jobs = jobs.slice(0, filters.limit);
        }
      }
      
      return jobs;
    } catch (error) {
      console.error('❌ Failed to load label jobs:', error);
      return [];
    }
  }

  /**
   * Get default label presets
   */
  private getDefaultPresets(): LabelPreset[] {
    return [
      {
        id: 'product-50x30',
        name: '50x30 Product Label',
        type: 'product',
        paper: 'THERMAL',
        size: { width_mm: 50, height_mm: 30 },
        barcode: {
          symbology: 'EAN13',
          source: 'barcode',
          show_text: true
        },
        fields: {
          line1: 'name_en',
          line2: 'sku',
          price: {
            enabled: true,
            source: 'retail',
            currency: 'LKR',
            show_label: true
          },
          // New fields for extended functionality
          languageMode: 'preset',
          showPackedDate: true,
          showExpiryDate: true,
          showMRP: false,
          showBatch: false,
          dateFormat: 'DD/MM/YYYY',
          mrpLabel: 'MRP',
          batchLabel: 'Batch',
          packedLabel: 'Packed',
          expiryLabel: 'Expiry'
        },
        style: {
          font_scale: 1.0,
          bold_name: true,
          align: 'center',
          show_store_logo: false,
          sectionOrder: ['store', 'barcode', 'name_en', 'name_si', 'name_ta', 'price', 'dates', 'desc']
        },
        defaults: {
          qty: 1,
          language: 'EN'
        }
      },
      {
        id: 'shelf-70x38',
        name: '70x38 Shelf Label',
        type: 'shelf',
        paper: 'THERMAL',
        size: { width_mm: 70, height_mm: 38 },
        barcode: {
          symbology: 'CODE128',
          source: 'sku',
          show_text: true
        },
        fields: {
          line1: 'name_en',
          line2: 'category',
          price: {
            enabled: true,
            source: 'retail',
            currency: 'LKR',
            show_label: true
          },
          weight_hint: true,
          // New fields for extended functionality
          languageMode: 'preset',
          showPackedDate: true,
          showExpiryDate: true,
          showMRP: false,
          showBatch: false,
          dateFormat: 'DD/MM/YYYY',
          mrpLabel: 'MRP',
          batchLabel: 'Batch',
          packedLabel: 'Packed',
          expiryLabel: 'Expiry'
        },
        style: {
          font_scale: 1.2,
          bold_name: true,
          align: 'left',
          show_store_logo: true,
          sectionOrder: ['store', 'barcode', 'name_en', 'name_si', 'name_ta', 'price', 'dates', 'desc']
        },
        defaults: {
          qty: 1,
          language: 'EN'
        }
      },
      {
        id: 'a4-product-grid',
        name: 'A4 Product Grid (3x7)',
        type: 'product',
        paper: 'A4',
        size: { width_mm: 70, height_mm: 37 },
        a4: {
          rows: 7,
          cols: 3,
          page_width_mm: 210,
          page_height_mm: 297,
          margin_mm: 5,
          gutter_mm: 2
        },
        barcode: {
          symbology: 'EAN13',
          source: 'barcode',
          show_text: true
        },
        fields: {
          line1: 'name_en',
          price: {
            enabled: true,
            source: 'retail',
            currency: 'LKR',
            show_label: false
          },
          // New fields for extended functionality
          languageMode: 'preset',
          showPackedDate: true,
          showExpiryDate: true,
          showMRP: false,
          showBatch: false,
          dateFormat: 'DD/MM/YYYY',
          mrpLabel: 'MRP',
          batchLabel: 'Batch',
          packedLabel: 'Packed',
          expiryLabel: 'Expiry'
        },
        style: {
          font_scale: 0.9,
          bold_name: true,
          align: 'center',
          show_store_logo: false,
          sectionOrder: ['store', 'barcode', 'name_en', 'name_si', 'name_ta', 'price', 'dates', 'desc']
        },
        defaults: {
          qty: 1,
          language: 'EN'
        }
      },
      {
        id: 'a4-shelf-grid',
        name: 'A4 Shelf Grid (5x13)',
        type: 'shelf',
        paper: 'A4',
        size: { width_mm: 38, height_mm: 21 },
        a4: {
          rows: 13,
          cols: 5,
          page_width_mm: 210,
          page_height_mm: 297,
          margin_mm: 8,
          gutter_mm: 1
        },
        barcode: {
          symbology: 'CODE128',
          source: 'sku',
          show_text: false
        },
        fields: {
          line1: 'name_en',
          price: {
            enabled: true,
            source: 'retail',
            currency: 'LKR',
            show_label: true
          }
        },
        style: {
          font_scale: 0.8,
          bold_name: false,
          align: 'center',
          show_store_logo: false
        },
        defaults: {
          qty: 1,
          language: 'EN'
        }
      }
    ];
  }

  /**
   * Validate label items against products database
   */
  async validateLabelItems(items: LabelItem[]): Promise<{
    valid: LabelItem[];
    invalid: { item: LabelItem; error: string }[];
  }> {
    const products = await dataService.getProducts();
    const valid: LabelItem[] = [];
    const invalid: { item: LabelItem; error: string }[] = [];

    for (const item of items) {
      // Check if product exists by SKU or barcode
      const product = products.find(p => 
        p.sku === item.sku || 
        (item.barcode && p.barcode === item.barcode)
      );

      if (!product) {
        invalid.push({
          item,
          error: `Product not found: SKU ${item.sku}${item.barcode ? `, Barcode ${item.barcode}` : ''}`
        });
      } else {
        valid.push(item);
      }
    }

    return { valid, invalid };
  }

  /**
   * Get default label settings
   */
  getDefaultLabelSettings() {
    return {
      defaultPresetId: 'product-50x30',
      defaultDPI: 203 as const,
      thermalPrinterName: '',
      a4Default: {
        rows: 7,
        cols: 3,
        margin_mm: 5,
        gutter_mm: 2
      }
    };
  }
}

// Export singleton instance
export const labelService = LabelService.getInstance();
