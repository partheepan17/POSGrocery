# Request ID & Correlated Logging Guide

## Overview

This document describes the request ID tracking and correlated logging system implemented across the POS Grocery application. Every request is assigned a unique identifier that enables tracing requests across logs, services, and error responses.

## Features

- **Automatic Request ID Generation**: UUID v4 for new requests
- **Custom Request ID Support**: Reuse existing `x-request-id` headers
- **Correlated Logging**: All log entries include request context
- **Response Headers**: `x-request-id` added to all responses
- **Error Tracking**: Request ID included in error responses
- **Structured Logging**: JSON format with request context

## Request ID Middleware

### Implementation

```typescript
// server/middleware/requestId.ts
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract or generate request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('x-request-id', requestId);
  
  next();
}
```

### Usage

```typescript
// Must be first middleware
app.use(requestIdMiddleware);
```

## Correlated Logging

### Request Logger

```typescript
// server/utils/logger.ts
export function createRequestLogger(req: Request) {
  return baseLogger.child({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
}
```

### Usage in Routes

```typescript
// GET /api/products/barcode/:code
catalogRouter.get('/api/products/barcode/:code', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    requestLogger.debug({ barcode: code }, 'Looking up product by barcode');
    
    // ... business logic ...
    
    requestLogger.info({ 
      productId: product.id,
      productName: product.name_en,
      barcode: code
    }, 'Product found by barcode');
    
    res.json({ product });
  } catch (error) {
    requestLogger.error({ error: error.message }, 'Failed to fetch product');
    throw error;
  }
}));
```

## Log Format

### Structured Logging

All logs follow a consistent JSON structure:

```json
{
  "level": "INFO",
  "time": "2025-10-09T15:54:15.283Z",
  "service": "pos-grocery",
  "version": "1.0.0",
  "environment": "development",
  "requestId": "f39fa37d-2f11-4e9b-8d93-620b54e95734",
  "method": "GET",
  "url": "/api/categories",
  "userAgent": "Mozilla/5.0...",
  "ip": "::1",
  "msg": "Categories fetched successfully",
  "categoryCount": 1
}
```

### Error Logging

Error logs include additional context:

```json
{
  "level": "ERROR",
  "time": "2025-10-09T15:54:15.283Z",
  "service": "pos-grocery",
  "version": "1.0.0",
  "environment": "development",
  "requestId": "error-test-456",
  "method": "GET",
  "url": "/api/products/barcode/nonexistent",
  "userAgent": "Mozilla/5.0...",
  "ip": "::1",
  "msg": "Product not found",
  "code": "NOT_FOUND",
  "status": 404
}
```

## Request ID Flow

### 1. Request Arrives

```
Client Request
├── x-request-id: custom-id-123 (optional)
└── GET /api/products/barcode/12345
```

### 2. Middleware Processing

```typescript
// Extract or generate request ID
const requestId = req.headers['x-request-id'] || uuidv4();
req.requestId = requestId;
res.setHeader('x-request-id', requestId);
```

### 3. Route Processing

```typescript
const requestLogger = createRequestLogger(req);
requestLogger.debug({ barcode: '12345' }, 'Looking up product');
// Log: { requestId: 'custom-id-123', barcode: '12345', msg: 'Looking up product' }
```

### 4. Response

```
HTTP/1.1 200 OK
x-request-id: custom-id-123
Content-Type: application/json

{"product": {...}}
```

## Error Response Format

Error responses include the request ID:

```json
{
  "error": "Product not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-10-09T15:54:15.283Z",
  "requestId": "error-test-456"
}
```

## Logging Levels

### Debug Level
- Request details
- Parameter values
- Internal state changes

```typescript
requestLogger.debug({ 
  query: 'apple',
  limit: 50 
}, 'Searching products');
```

### Info Level
- Successful operations
- Business logic completion
- Performance metrics

```typescript
requestLogger.info({ 
  productCount: 25,
  searchQuery: 'apple',
  duration: 45
}, 'Products search completed');
```

### Warn Level
- Non-critical issues
- Rate limiting
- Validation warnings

```typescript
requestLogger.warn({ 
  barcode: '12345' 
}, 'Product not found');
```

### Error Level
- Exceptions
- System failures
- Critical issues

```typescript
requestLogger.error({ 
  error: error.message,
  stack: error.stack,
  code: 'DATABASE_ERROR'
}, 'Database operation failed');
```

## Request Tracing

### Finding All Logs for a Request

Search logs by request ID:

```bash
# Using grep
grep "f39fa37d-2f11-4e9b-8d93-620b54e95734" logs/app.log

# Using jq for JSON logs
jq 'select(.requestId == "f39fa37d-2f11-4e9b-8d93-620b54e95734")' logs/app.log
```

### Log Analysis

```bash
# Count requests by endpoint
jq -r '.url' logs/app.log | sort | uniq -c

# Find slow requests
jq 'select(.duration > 1000)' logs/app.log

# Error analysis
jq 'select(.level == "ERROR")' logs/app.log
```

## Testing Request ID

### Test Custom Request ID

```bash
curl -H "x-request-id: test-123" http://localhost:8250/api/categories
# Response includes: x-request-id: test-123
```

### Test Generated Request ID

```bash
curl http://localhost:8250/api/categories
# Response includes: x-request-id: <generated-uuid>
```

### Test Error Correlation

```bash
curl -H "x-request-id: error-test" http://localhost:8250/api/products/barcode/nonexistent
# Error response includes: "requestId": "error-test"
```

## Production Considerations

### Log Aggregation

For production, consider using log aggregation tools:

- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Fluentd**: Log collection and forwarding
- **Splunk**: Enterprise log analysis
- **CloudWatch**: AWS logging service

### Performance Impact

- **Minimal overhead**: UUID generation is fast
- **Memory efficient**: Request ID stored once per request
- **Structured logging**: JSON parsing is optimized

### Security

- **No sensitive data**: Request IDs are not sensitive
- **UUID format**: Cryptographically secure random generation
- **Header exposure**: `x-request-id` is safe to expose

## Monitoring and Alerting

### Request Tracing

```typescript
// Track request duration
const startTime = Date.now();
// ... process request ...
const duration = Date.now() - startTime;
requestLogger.info({ duration }, 'Request completed');
```

### Error Tracking

```typescript
// Track error rates
requestLogger.error({ 
  errorType: 'VALIDATION_ERROR',
  endpoint: '/api/products',
  userId: req.user?.id
}, 'Validation failed');
```

### Performance Monitoring

```typescript
// Track slow requests
if (duration > 1000) {
  requestLogger.warn({ 
    duration,
    url: req.url,
    method: req.method
  }, 'Slow request detected');
}
```

## Best Practices

1. **Always use request logger** - Never use the base logger in routes
2. **Include context** - Add relevant data to log entries
3. **Use appropriate levels** - Debug for development, Info for operations
4. **Log errors with context** - Include request details in error logs
5. **Monitor performance** - Track request duration and slow queries
6. **Correlate across services** - Pass request ID to external services
7. **Use structured data** - Include objects, not just strings

## Integration with External Services

### Passing Request ID

```typescript
// When calling external APIs
const response = await fetch('https://api.external.com/data', {
  headers: {
    'x-request-id': req.requestId,
    'Content-Type': 'application/json'
  }
});
```

### Database Logging

```typescript
// Include request ID in database queries
const query = `
  INSERT INTO audit_log (request_id, action, user_id, timestamp)
  VALUES (?, ?, ?, ?)
`;
db.prepare(query).run(req.requestId, 'PRODUCT_VIEW', userId, new Date());
```

This request ID and correlated logging system provides comprehensive tracing capabilities, making debugging and monitoring much more effective across the entire application.




