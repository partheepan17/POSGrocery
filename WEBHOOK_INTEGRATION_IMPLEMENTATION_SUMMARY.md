# Webhook Integration Implementation Summary

## Overview
Implemented a comprehensive webhook system with retry logic, dead letter queue (DLQ), and integration points for sales and GRN events. The system automatically sends webhook notifications when sales are committed or GRNs are created, with robust error handling and retry mechanisms.

## Key Features

### 1. Webhook Integration Service (`server/integrations/webhooks.ts`)
- **Event Types**: Supports `sale_committed` and `grn_created` events
- **Retry Logic**: Exponential backoff with configurable retry attempts
- **Dead Letter Queue**: Failed webhooks are moved to DLQ after max retries
- **Database Management**: SQLite tables for webhook payloads and delivery logs
- **Configuration**: Environment-based configuration for webhook URLs and settings

### 2. Sales Webhook Integration
- **Trigger**: Automatically sent when a sale is committed
- **Payload**: Includes sale ID, timestamp, lines, total, tax, customer info
- **Location**: Added to `server/routes/sales.ts` after successful sale creation
- **Error Handling**: Webhook failures don't affect sale completion

### 3. GRN Webhook Integration
- **Trigger**: Automatically sent when a GRN is created
- **Payload**: Includes GRN ID, supplier info, lines, total cost
- **Location**: Added to `server/routes/purchasing.ts` after successful GRN creation
- **Error Handling**: Webhook failures don't affect GRN creation

### 4. Webhook Management API (`server/routes/webhooks.ts`)
- **Statistics**: Get webhook delivery statistics
- **Logs**: View delivery logs for specific webhooks
- **Processing**: Manually trigger webhook processing
- **Retry**: Retry failed webhooks
- **Cleanup**: Clean up old DLQ entries
- **Testing**: Test webhook configuration

### 5. Scheduled Processing
- **Webhook Processing**: Every 2 minutes (`*/2 * * * *`)
- **DLQ Cleanup**: Daily at 3 AM (`0 3 * * *`)
- **Integration**: Added to `server/scheduler/index.ts`

## Technical Implementation

### Database Schema

#### Webhook Payloads Table
```sql
CREATE TABLE webhook_payloads (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('sale_committed', 'grn_created')),
  timestamp TEXT NOT NULL,
  data TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'dead_letter')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### Webhook Delivery Logs Table
```sql
CREATE TABLE webhook_delivery_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (webhook_id) REFERENCES webhook_payloads(id) ON DELETE CASCADE
);
```

### Webhook Payloads

#### Sale Committed Webhook
```typescript
interface SaleWebhookData {
  id: number;
  ts: string;
  lines: Array<{
    product_id: number;
    sku: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  total: number;
  tax: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  receipt_no: string;
  cashier_id?: number;
  terminal_name?: string;
}
```

#### GRN Created Webhook
```typescript
interface GRNWebhookData {
  id: number;
  supplier: {
    id: number;
    name: string;
    contact?: string;
  };
  lines: Array<{
    product_id: number;
    sku: string;
    name: string;
    quantity: number;
    unit_cost: number;
    line_total: number;
    batch_no?: string;
    expiry_date?: string;
  }>;
  total_cost: number;
  grn_no: string;
  received_by?: number;
  received_at: string;
}
```

### Retry Logic

#### Exponential Backoff
```typescript
const delayMs = Math.min(
  this.config.retry_delay_ms * Math.pow(this.config.retry_backoff_multiplier, newRetryCount - 1),
  this.config.max_retry_delay_ms
);
```

#### Retry States
1. **Pending**: Initial state, waiting for delivery
2. **Delivered**: Successfully delivered
3. **Failed**: Temporary failure, will retry
4. **Dead Letter**: Permanent failure after max retries

### Configuration

#### Environment Variables
```bash
# Webhook Configuration
WEBHOOK_SALE_URL=https://your-webhook-endpoint.com/webhooks/sales
WEBHOOK_GRN_URL=https://your-webhook-endpoint.com/webhooks/grn
WEBHOOK_TIMEOUT_MS=10000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY_MS=1000
WEBHOOK_RETRY_BACKOFF_MULTIPLIER=2
WEBHOOK_MAX_RETRY_DELAY_MS=300000
WEBHOOK_DLQ_RETENTION_DAYS=30
```

#### Configuration Interface
```typescript
interface WebhookConfig {
  sale_webhook_url?: string;
  grn_webhook_url?: string;
  timeout_ms: number;
  max_retries: number;
  retry_delay_ms: number;
  retry_backoff_multiplier: number;
  max_retry_delay_ms: number;
  dead_letter_retention_days: number;
}
```

## API Endpoints

### Webhook Management
- **GET /api/webhooks/stats**: Get webhook statistics
- **GET /api/webhooks/logs/:webhookId**: Get delivery logs for specific webhook
- **POST /api/webhooks/process**: Manually process pending webhooks
- **POST /api/webhooks/retry**: Retry failed webhooks
- **POST /api/webhooks/cleanup**: Clean up old DLQ entries
- **POST /api/webhooks/test**: Test webhook configuration

### Example API Usage

#### Get Webhook Statistics
```bash
curl -X GET http://localhost:8250/api/webhooks/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "ok": true,
  "stats": {
    "total": 150,
    "pending": 5,
    "delivered": 140,
    "failed": 3,
    "dead_letter": 2,
    "by_event_type": {
      "sale_committed": 100,
      "grn_created": 50
    }
  }
}
```

#### Test Webhook Configuration
```bash
curl -X POST http://localhost:8250/api/webhooks/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "sale_committed"}'
```

Response:
```json
{
  "ok": true,
  "success": true,
  "message": "Webhook test successful"
}
```

## Sample Webhook Payloads

### Sale Committed Webhook
```json
{
  "id": 12345,
  "ts": "2024-01-15T14:30:00.000Z",
  "lines": [
    {
      "product_id": 101,
      "sku": "MILK-001",
      "name": "Fresh Milk 1L",
      "quantity": 2,
      "unit_price": 90.00,
      "line_total": 180.00
    },
    {
      "product_id": 102,
      "sku": "BREAD-001",
      "name": "White Bread Loaf",
      "quantity": 1,
      "unit_price": 120.00,
      "line_total": 120.00
    }
  ],
  "total": 300.00,
  "tax": 0.00,
  "customer": {
    "id": 201,
    "name": "John Doe",
    "phone": "+94771234567"
  },
  "receipt_no": "RCP-2024-001234",
  "cashier_id": 301,
  "terminal_name": "Terminal-01"
}
```

### GRN Created Webhook
```json
{
  "id": 54321,
  "supplier": {
    "id": 401,
    "name": "ABC Suppliers Ltd",
    "contact": "Jane Smith"
  },
  "lines": [
    {
      "product_id": 101,
      "sku": "MILK-001",
      "name": "Fresh Milk 1L",
      "quantity": 100,
      "unit_cost": 75.00,
      "line_total": 7500.00,
      "batch_no": "BATCH-001",
      "expiry_date": "2024-02-15"
    },
    {
      "product_id": 102,
      "sku": "BREAD-001",
      "name": "White Bread Loaf",
      "quantity": 50,
      "unit_cost": 90.00,
      "line_total": 4500.00,
      "batch_no": "BATCH-002",
      "expiry_date": "2024-01-25"
    }
  ],
  "total_cost": 12000.00,
  "grn_no": "GRN20240115001",
  "received_by": 301,
  "received_at": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

### Webhook Delivery Failures
1. **Timeout**: Request timeout after configured duration
2. **HTTP Errors**: Non-2xx status codes
3. **Network Errors**: Connection failures, DNS issues
4. **Invalid Response**: Malformed response from webhook endpoint

### Retry Strategy
1. **Immediate Retry**: First failure retries immediately
2. **Exponential Backoff**: Subsequent retries with increasing delays
3. **Max Retries**: After 3 attempts, move to dead letter queue
4. **Dead Letter Queue**: Failed webhooks stored for manual review

### Error Logging
```typescript
// Log successful delivery
this.logger.info({ 
  webhookId: webhook.id,
  eventType: webhook.event_type,
  attempt: webhook.retry_count + 1
}, 'Webhook delivered successfully');

// Log failed delivery
this.logger.warn({ 
  webhookId: webhook.id,
  eventType: webhook.event_type,
  retryCount: newRetryCount,
  nextRetryAt,
  delayMs
}, 'Webhook delivery failed, scheduled retry');
```

## Monitoring and Observability

### Webhook Statistics
- **Total Webhooks**: Count of all webhook attempts
- **Pending**: Webhooks waiting for delivery
- **Delivered**: Successfully delivered webhooks
- **Failed**: Temporarily failed webhooks
- **Dead Letter**: Permanently failed webhooks
- **By Event Type**: Breakdown by sale_committed and grn_created

### Delivery Logs
- **Attempt Number**: Sequential attempt number
- **Status Code**: HTTP response status
- **Response Body**: Webhook endpoint response
- **Error Message**: Detailed error information
- **Delivery Time**: Timestamp of delivery attempt

### Health Monitoring
- **Webhook Processing**: Every 2 minutes
- **DLQ Cleanup**: Daily cleanup of old entries
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Delivery success rates

## Security Considerations

### Authentication
- **JWT Tokens**: All management endpoints require authentication
- **Role-Based Access**: Admin/Manager roles for webhook management
- **API Keys**: Webhook endpoints should use API keys for authentication

### Data Protection
- **Sensitive Data**: Customer information included in webhook payloads
- **Encryption**: HTTPS required for webhook endpoints
- **Retention**: Configurable retention period for DLQ entries

### Rate Limiting
- **Webhook Endpoints**: Should implement rate limiting
- **Retry Throttling**: Exponential backoff prevents overwhelming endpoints
- **Queue Management**: Limited concurrent webhook processing

## Performance Considerations

### Database Optimization
- **Indexes**: Optimized indexes for webhook queries
- **Batch Processing**: Process multiple webhooks in batches
- **Connection Pooling**: Efficient database connection management

### Network Optimization
- **Timeout Configuration**: Configurable request timeouts
- **Connection Reuse**: HTTP connection pooling
- **Retry Logic**: Prevents unnecessary network load

### Scalability
- **Horizontal Scaling**: Multiple instances can process webhooks
- **Queue Management**: Distributed webhook processing
- **Load Balancing**: Webhook endpoints should be load balanced

## Benefits

1. **Real-Time Integration**: Immediate notification of business events
2. **Reliability**: Robust retry logic and error handling
3. **Observability**: Comprehensive monitoring and logging
4. **Flexibility**: Configurable webhook endpoints and settings
5. **Scalability**: Designed for high-volume webhook processing
6. **Maintainability**: Clean separation of concerns and modular design
7. **Error Recovery**: Dead letter queue for manual intervention
8. **Performance**: Efficient processing with minimal impact on core operations

## Future Enhancements

1. **Additional Events**: Support for more business events
2. **Webhook Signatures**: Cryptographic signatures for webhook authenticity
3. **Event Filtering**: Configurable event filtering and transformation
4. **Webhook Templates**: Customizable webhook payload templates
5. **Real-Time Dashboard**: Web-based webhook monitoring dashboard
6. **Webhook Analytics**: Advanced analytics and reporting
7. **Multi-Tenant Support**: Support for multiple webhook endpoints
8. **Event Sourcing**: Complete event history and replay capabilities

The webhook integration system provides a robust, scalable solution for real-time business event notifications with comprehensive error handling, monitoring, and management capabilities.










