# Error Handling Guide

## Overview

This document describes the standardized error handling system implemented across the POS Grocery application. All error responses follow a consistent JSON format with stable error codes for reliable client-side handling.

## Error Response Format

All non-2xx responses return a standardized JSON structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional context or validation details
  },
  "timestamp": "2025-10-09T15:50:02.118Z",
  "requestId": "abc123def456" // Optional, for tracking
}
```

## Standardized Error Codes

### Client Errors (4xx)

| Code | HTTP Status | Description | Usage |
|------|-------------|-------------|-------|
| `INVALID_INPUT` | 400 | Invalid or malformed input data | Validation failures, bad parameters |
| `NOT_FOUND` | 404 | Resource not found | Missing products, users, etc. |
| `CONFLICT` | 409 | Resource already exists | Duplicate entries, constraint violations |
| `PAYMENT_MISMATCH` | 400 | Payment amount mismatch | POS payment validation |
| `PIN_REQUIRED` | 401 | PIN authentication required | Security operations |
| `UNAUTHORIZED` | 401 | Authentication required | Login required |
| `FORBIDDEN` | 403 | Access denied | Insufficient permissions |
| `PAYLOAD_TOO_LARGE` | 413 | Request body too large | File upload limits |
| `RATE_LIMITED` | 429 | Too many requests | Rate limiting |

### Server Errors (5xx)

| Code | HTTP Status | Description | Usage |
|------|-------------|-------------|-------|
| `INTERNAL` | 500 | Internal server error | Unexpected errors |
| `DATABASE_ERROR` | 500 | Database operation failed | DB connection/query issues |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service unavailable | Third-party API failures |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down | Maintenance mode |

## Implementation

### Error Helper Functions

```typescript
import { createError, ErrorContext } from '../types/errors';

// Create specific error types
throw createError.invalidInput('Invalid email format', { field: 'email' });
throw createError.notFound('Product', { barcode: '12345' });
throw createError.conflict('User already exists', { email: 'user@example.com' });
throw createError.paymentMismatch('Amount mismatch', { expected: 100, received: 95 });
throw createError.pinRequired('PIN required for refund');
throw createError.unauthorized('Invalid credentials');
throw createError.forbidden('Admin access required');
throw createError.databaseError('Failed to save product', error);
```

### Error Context

Provide context for better debugging and logging:

```typescript
const context: ErrorContext = {
  operation: 'CREATE_PRODUCT',
  resource: '/api/products',
  userId: 'user123',
  requestId: 'req456',
  metadata: {
    productId: 'prod789',
    category: 'electronics'
  }
};

throw createError.databaseError('Failed to create product', error, context);
```

### Route Implementation

```typescript
// GET /api/products/barcode/:code
catalogRouter.get('/api/products/barcode/:code', asyncHandler(async (req, res) => {
  try {
    const code = req.params.code;
    
    // Validate input
    if (!code || code.trim().length === 0) {
      throw createError.invalidInput('Barcode code is required', {
        provided: code
      });
    }
    
    // Database operation
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(code);
    
    if (!product) {
      const context: ErrorContext = {
        operation: 'GET_PRODUCT_BY_BARCODE',
        resource: '/api/products/barcode',
        metadata: { barcode: code }
      };
      throw createError.notFound('Product', context);
    }
    
    res.json({ product });
  } catch (error) {
    // Re-throw AppError instances without wrapping
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle unexpected errors
    const context: ErrorContext = {
      operation: 'GET_PRODUCT_BY_BARCODE',
      resource: '/api/products/barcode',
      metadata: { barcode: req.params.code }
    };
    
    throw createError.databaseError('Failed to fetch product by barcode', error, context);
  }
}));
```

## Error Mapping

### Zod Validation Errors

Zod validation errors are automatically mapped to `INVALID_INPUT`:

```typescript
// Input validation
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().positive('Price must be positive')
});

try {
  const data = schema.parse(req.body);
} catch (error) {
  // Automatically mapped to INVALID_INPUT with field details
  throw mapValidationError(error, context);
}
```

### Database Errors

Database constraint violations are mapped to appropriate error codes:

```typescript
// UNIQUE constraint -> CONFLICT
// FOREIGN KEY constraint -> INVALID_INPUT  
// NOT NULL constraint -> INVALID_INPUT
// Other DB errors -> DATABASE_ERROR
```

## Client-Side Handling

### Frontend Error Handling

```typescript
// Error response interface
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// Handle API errors
const handleApiError = (error: ErrorResponse) => {
  switch (error.code) {
    case 'INVALID_INPUT':
      showValidationErrors(error.details);
      break;
    case 'NOT_FOUND':
      showNotFoundMessage(error.error);
      break;
    case 'CONFLICT':
      showConflictMessage(error.error);
      break;
    case 'RATE_LIMITED':
      showRateLimitMessage(error.details.retryAfter);
      break;
    case 'UNAUTHORIZED':
      redirectToLogin();
      break;
    case 'FORBIDDEN':
      showAccessDeniedMessage();
      break;
    default:
      showGenericErrorMessage(error.error);
  }
};
```

### Error Logging

All errors are logged with structured context:

```json
{
  "message": "Product not found",
  "code": "NOT_FOUND",
  "status": 404,
  "context": {
    "requestId": "req123",
    "operation": "GET_PRODUCT_BY_BARCODE",
    "resource": "/api/products/barcode",
    "metadata": {
      "barcode": "12345",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  },
  "timestamp": "2025-10-09T15:50:02.118Z"
}
```

## Testing Error Responses

### Test Examples

```bash
# Test NOT_FOUND
curl http://localhost:8250/api/products/barcode/nonexistent
# Response: {"error":"Product not found","code":"NOT_FOUND","timestamp":"..."}

# Test INVALID_INPUT
curl "http://localhost:8250/api/products/search?limit=2000"
# Response: {"error":"Limit must be between 1 and 1000","code":"INVALID_INPUT","details":{"provided":"2000","min":1,"max":1000},"timestamp":"..."}

# Test RATE_LIMITED
# Make 80+ requests quickly
# Response: {"error":"Too many requests","code":"RATE_LIMITED","details":{"limit":60,"burst":10,"retryAfter":60},"timestamp":"..."}
```

## Best Practices

1. **Always use error codes** - Never rely on error messages for logic
2. **Provide context** - Include operation, resource, and metadata
3. **Map errors appropriately** - Use the right error code for the situation
4. **Log structured data** - Include request IDs and context for debugging
5. **Handle gracefully** - Re-throw AppError instances without wrapping
6. **Validate early** - Check inputs before expensive operations
7. **Be specific** - Use detailed error messages for debugging

## Migration Guide

### From Legacy Error Handling

```typescript
// Old way
if (!product) {
  throw new HttpError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
}

// New way
if (!product) {
  const context: ErrorContext = {
    operation: 'GET_PRODUCT',
    resource: '/api/products',
    metadata: { barcode: code }
  };
  throw createError.notFound('Product', context);
}
```

### Error Response Changes

```json
// Old format
{
  "status": 404,
  "error": "Product not found",
  "code": "PRODUCT_NOT_FOUND"
}

// New format
{
  "error": "Product not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-10-09T15:50:02.118Z",
  "requestId": "req123"
}
```

This standardized error handling system ensures consistent client behavior, better debugging capabilities, and improved user experience across the entire application.




