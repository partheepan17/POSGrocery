/**
 * Input Sanitization Utilities
 * Provides protection against XSS and injection attacks
 */

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize HTML content (more aggressive)
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize SQL input (basic protection)
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/['"]/g, '') // Remove quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, '') // Remove SQL keywords
    .trim();
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any): number | null {
  if (typeof input === 'number' && !isNaN(input) && isFinite(input)) {
    return input;
  }
  
  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  
  return null;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: any): number | null {
  const num = sanitizeNumber(input);
  if (num !== null && Number.isInteger(num)) {
    return num;
  }
  return null;
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = sanitizeString(input).toLowerCase();
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize phone number input
 */
export function sanitizePhone(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove all non-digit characters except + at the beginning
  return input.replace(/[^\d+]/g, '').replace(/^\+?/, '+');
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  const sanitized = sanitizeString(input);
  
  try {
    const url = new URL(sanitized);
    // Only allow http and https protocols
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    // Invalid URL
  }
  
  return '';
}

/**
 * Sanitize object properties recursively
 */
export function sanitizeObject(obj: any, options: {
  sanitizeStrings?: boolean;
  sanitizeNumbers?: boolean;
  allowedKeys?: string[];
  maxDepth?: number;
} = {}): any {
  const {
    sanitizeStrings = true,
    sanitizeNumbers = true,
    allowedKeys,
    maxDepth = 10
  } = options;

  if (maxDepth <= 0) {
    return null;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeStrings ? sanitizeString(obj) : obj;
  }

  if (typeof obj === 'number') {
    return sanitizeNumbers ? sanitizeNumber(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, { ...options, maxDepth: maxDepth - 1 }));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip if key is not in allowed keys (if specified)
      if (allowedKeys && !allowedKeys.includes(key)) {
        continue;
      }
      
      // Sanitize the key itself
      const sanitizedKey = sanitizeStrings ? sanitizeString(key) : key;
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeObject(value, { ...options, maxDepth: maxDepth - 1 });
      }
    }
    
    return sanitized;
  }

  return obj;
}

/**
 * Validate and sanitize product data
 */
export function sanitizeProductData(product: any): any {
  const allowedKeys = [
    'sku', 'name_en', 'name_si', 'name_ta', 'barcode', 'description',
    'price_retail', 'price_wholesale', 'price_credit', 'price_other',
    'cost', 'stock', 'reorder_level', 'category_id', 'supplier_id',
    'unit', 'is_active', 'active', 'is_scale_item'
  ];

  return sanitizeObject(product, {
    sanitizeStrings: true,
    sanitizeNumbers: true,
    allowedKeys,
    maxDepth: 3
  });
}

/**
 * Validate and sanitize customer data
 */
export function sanitizeCustomerData(customer: any): any {
  const allowedKeys = [
    'customer_name', 'customer_type', 'phone', 'email', 'address', 'city', 'postal_code',
    'is_active', 'active', 'credit_limit', 'discount_percentage'
  ];

  return sanitizeObject(customer, {
    sanitizeStrings: true,
    sanitizeNumbers: true,
    allowedKeys,
    maxDepth: 3
  });
}

/**
 * Validate and sanitize user input
 */
export function sanitizeUserInput(input: any): any {
  return sanitizeObject(input, {
    sanitizeStrings: true,
    sanitizeNumbers: true,
    maxDepth: 5
  });
}
