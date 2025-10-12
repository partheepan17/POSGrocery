/**
 * Template Downloader Tests
 */

import { downloadTemplate, getTemplateConfig, TEMPLATE_CONFIGS } from '../templateDownloader';

// Mock DOM methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
const mockSetAttribute = jest.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'mock-url');
const mockRevokeObjectURL = jest.fn();

// Mock Blob
const mockBlob = jest.fn();

beforeAll(() => {
  // Mock DOM
  global.document.createElement = mockCreateElement;
  global.document.body = {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild
  } as any;

  // Mock URL
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;

  // Mock Blob
  global.Blob = mockBlob as any;

  // Mock element
  const mockElement = {
    setAttribute: mockSetAttribute,
    click: mockClick,
    style: {}
  };
  mockCreateElement.mockReturnValue(mockElement);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Template Downloader', () => {
  describe('getTemplateConfig', () => {
    it('should return correct config for products', () => {
      const config = getTemplateConfig('products');
      expect(config.filename).toBe('products_template');
      expect(config.columns).toHaveLength(16);
      expect(config.columns[0].key).toBe('name_en');
      expect(config.columns[0].required).toBe(true);
    });

    it('should return correct config for categories', () => {
      const config = getTemplateConfig('categories');
      expect(config.filename).toBe('categories_template');
      expect(config.columns).toHaveLength(2);
      expect(config.columns[0].key).toBe('name');
      expect(config.columns[0].required).toBe(true);
    });

    it('should return correct config for suppliers', () => {
      const config = getTemplateConfig('suppliers');
      expect(config.filename).toBe('suppliers_template');
      expect(config.columns).toHaveLength(8);
      expect(config.columns[0].key).toBe('name');
      expect(config.columns[0].required).toBe(true);
    });

    it('should return correct config for customers', () => {
      const config = getTemplateConfig('customers');
      expect(config.filename).toBe('customers_template');
      expect(config.columns).toHaveLength(5);
      expect(config.columns[0].key).toBe('customer_name');
      expect(config.columns[0].required).toBe(true);
    });

    it('should return correct config for users', () => {
      const config = getTemplateConfig('users');
      expect(config.filename).toBe('users_template');
      expect(config.columns).toHaveLength(6);
      expect(config.columns[0].key).toBe('username');
      expect(config.columns[0].required).toBe(true);
    });

    it('should return correct config for pricing', () => {
      const config = getTemplateConfig('pricing');
      expect(config.filename).toBe('pricing_template');
      expect(config.columns).toHaveLength(5);
      expect(config.columns[0].key).toBe('product_id');
      expect(config.columns[0].required).toBe(true);
    });
  });

  describe('downloadTemplate', () => {
    it('should create and download CSV file', () => {
      const config = getTemplateConfig('products');
      
      downloadTemplate(config);

      // Verify element creation
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      
      // Verify blob creation
      expect(mockBlob).toHaveBeenCalledWith(
        expect.any(Array),
        { type: 'text/csv;charset=utf-8;' }
      );
      
      // Verify URL creation
      expect(mockCreateObjectURL).toHaveBeenCalled();
      
      // Verify element setup
      expect(mockSetAttribute).toHaveBeenCalledWith('href', 'mock-url');
      expect(mockSetAttribute).toHaveBeenCalledWith('download', 'products_template.csv');
      
      // Verify click and cleanup
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('should handle filename with .csv extension', () => {
      const config = { ...getTemplateConfig('products'), filename: 'test.csv' };
      
      downloadTemplate(config);
      
      expect(mockSetAttribute).toHaveBeenCalledWith('download', 'test.csv');
    });

    it('should generate correct CSV content', () => {
      const config = {
        filename: 'test',
        columns: [
          { key: 'name', label: 'Name', required: true, example: 'Test' },
          { key: 'value', label: 'Value', example: '123' }
        ]
      };
      
      downloadTemplate(config);
      
      const blobCall = mockBlob.mock.calls[0];
      const csvContent = blobCall[0][0];
      
      expect(csvContent).toContain('Name,Value');
      expect(csvContent).toContain('Test,123');
    });
  });

  describe('TEMPLATE_CONFIGS', () => {
    it('should have all required template types', () => {
      expect(TEMPLATE_CONFIGS).toHaveProperty('products');
      expect(TEMPLATE_CONFIGS).toHaveProperty('categories');
      expect(TEMPLATE_CONFIGS).toHaveProperty('suppliers');
      expect(TEMPLATE_CONFIGS).toHaveProperty('customers');
      expect(TEMPLATE_CONFIGS).toHaveProperty('users');
      expect(TEMPLATE_CONFIGS).toHaveProperty('pricing');
    });

    it('should have valid column configurations', () => {
      Object.values(TEMPLATE_CONFIGS).forEach(config => {
        expect(config.filename).toBeTruthy();
        expect(Array.isArray(config.columns)).toBe(true);
        expect(config.columns.length).toBeGreaterThan(0);
        
        config.columns.forEach(column => {
          expect(column.key).toBeTruthy();
          expect(column.label).toBeTruthy();
        });
      });
    });
  });
});
