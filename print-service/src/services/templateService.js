/**
 * Template Service
 * Handles receipt template rendering and formatting
 */

import Handlebars from 'handlebars';

export class TemplateService {
  constructor() {
    this.templates = new Map();
    this.registerHelpers();
  }

  registerHelpers() {
    // Currency formatting helper
    Handlebars.registerHelper('currency', (amount, currency = 'LKR') => {
      if (typeof amount !== 'number') return '0.00';
      return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(amount);
    });

    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date, format = 'short') => {
      if (!date) return '';
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString('en-LK');
      } else if (format === 'long') {
        return d.toLocaleString('en-LK');
      }
      return d.toISOString();
    });

    // Time formatting helper
    Handlebars.registerHelper('formatTime', (date) => {
      if (!date) return '';
      return new Date(date).toLocaleTimeString('en-LK');
    });

    // Center alignment helper
    Handlebars.registerHelper('center', (text, options) => {
      return new Handlebars.SafeString(`<div style="text-align: center;">${text}</div>`);
    });

    // Right alignment helper
    Handlebars.registerHelper('right', (text, options) => {
      return new Handlebars.SafeString(`<div style="text-align: right;">${text}</div>`);
    });

    // Bold text helper
    Handlebars.registerHelper('bold', (text, options) => {
      return new Handlebars.SafeString(`<strong>${text}</strong>`);
    });

    // Line separator helper
    Handlebars.registerHelper('separator', (char = '-', length = 32) => {
      return char.repeat(length);
    });
  }

  compileTemplate(templateName, templateHtml) {
    try {
      const template = Handlebars.compile(templateHtml);
      this.templates.set(templateName, template);
      return template;
    } catch (error) {
      console.error(`Failed to compile template ${templateName}:`, error);
      throw error;
    }
  }

  renderTemplate(templateName, data) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    try {
      return template(data);
    } catch (error) {
      console.error(`Failed to render template ${templateName}:`, error);
      throw error;
    }
  }

  renderReceipt(data) {
    const {
      templateHtml,
      lines,
      options = {}
    } = data;

    // If templateHtml is provided, use it
    if (templateHtml) {
      try {
        const template = Handlebars.compile(templateHtml);
        return template(data);
      } catch (error) {
        console.error('Failed to render template HTML:', error);
        throw error;
      }
    }

    // Otherwise, render from lines array
    if (!lines || !Array.isArray(lines)) {
      throw new Error('Lines array is required when templateHtml is not provided');
    }

    return this.renderFromLines(lines, options);
  }

  renderFromLines(lines, options = {}) {
    const {
      width = 32,
      centerText = true,
      showTimestamp = true,
      showBorder = true
    } = options;

    let output = '';

    // Add header border if enabled
    if (showBorder) {
      output += '='.repeat(width) + '\n';
    }

    // Add timestamp if enabled
    if (showTimestamp) {
      const now = new Date();
      const timestamp = now.toLocaleString('en-LK');
      output += this.centerText(timestamp, width) + '\n';
      output += '-'.repeat(width) + '\n';
    }

    // Process each line
    for (const line of lines) {
      if (typeof line === 'string') {
        output += this.formatLine(line, width, centerText) + '\n';
      } else if (typeof line === 'object') {
        output += this.formatLineObject(line, width) + '\n';
      }
    }

    // Add footer border if enabled
    if (showBorder) {
      output += '='.repeat(width) + '\n';
    }

    return output;
  }

  formatLine(text, width, center = false) {
    if (!text) return '';
    
    const cleanText = text.toString().trim();
    
    if (center) {
      return this.centerText(cleanText, width);
    }
    
    return cleanText;
  }

  formatLineObject(line, width) {
    const {
      text = '',
      align = 'left',
      bold = false,
      size = 'normal',
      separator = false
    } = line;

    let output = '';

    if (separator) {
      const char = text || '-';
      const length = Math.min(width, 32);
      output = char.repeat(length);
    } else {
      let formattedText = text.toString().trim();
      
      if (bold) {
        // For thermal printers, bold is usually handled by the printer
        formattedText = `**${formattedText}**`;
      }
      
      switch (align) {
        case 'center':
          output = this.centerText(formattedText, width);
          break;
        case 'right':
          output = this.rightAlignText(formattedText, width);
          break;
        case 'left':
        default:
          output = formattedText;
          break;
      }
    }

    return output;
  }

  centerText(text, width) {
    if (text.length >= width) return text;
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  rightAlignText(text, width) {
    if (text.length >= width) return text;
    const padding = width - text.length;
    return ' '.repeat(padding) + text;
  }

  // Predefined receipt templates
  getDefaultReceiptTemplate() {
    return `
{{#if showHeader}}
{{center "{{storeName}}"}}
{{center "{{storeAddress}}"}}
{{center "Tel: {{storePhone}}"}}
{{separator}}
{{/if}}

{{#if showTimestamp}}
Date: {{formatDate date}}
Time: {{formatTime date}}
{{separator}}
{{/if}}

{{#if customer}}
Customer: {{customer.name}}
{{#if customer.phone}}Phone: {{customer.phone}}{{/if}}
{{separator}}
{{/if}}

{{#each items}}
{{this.name}} x{{this.quantity}}
{{right (currency this.price)}} {{right (currency this.total)}}
{{/each}}

{{separator}}
Subtotal: {{right (currency subtotal)}}
{{#if discount}}Discount: {{right (currency discount)}}{{/if}}
{{#if tax}}Tax: {{right (currency tax)}}{{/if}}
{{separator}}
{{bold "TOTAL: "}}{{right (currency total)}}

{{#if paymentMethod}}
Payment: {{paymentMethod}}
{{/if}}

{{#if showFooter}}
{{separator}}
Thank you for your business!
{{center "Visit us again soon!"}}
{{/if}}
`;
  }

  getSimpleReceiptTemplate() {
    return `
{{center "RECEIPT"}}
{{separator}}
{{#each lines}}
{{this.text}}
{{/each}}
{{separator}}
{{center "Thank you!"}}
`;
  }
}

export const templateService = new TemplateService();











