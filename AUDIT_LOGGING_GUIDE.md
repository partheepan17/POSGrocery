# Audit Logging Guide

## Overview

This document describes the comprehensive audit logging system implemented for sensitive actions in the POS Grocery application. The system ensures compliance with regulatory requirements and enables post-incident analysis by tracking all critical operations.

## Features

- **Comprehensive Event Tracking**: Covers all sensitive operations
- **Request ID Correlation**: Links audit logs to specific requests
- **Data Sanitization**: Removes sensitive information (PINs, passwords)
- **Structured Logging**: JSON format for easy analysis
- **Compliance Ready**: Meets audit trail requirements
- **Performance Optimized**: Minimal impact on business operations

## Database Schema

### audit_logs Table

```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    request_id TEXT NOT NULL,
    actor_id TEXT, -- User ID or system identifier
    actor_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'system', 'api', 'admin'
    action TEXT NOT NULL, -- Event type
    entity_type TEXT, -- Type of entity affected
    entity_id TEXT, -- ID of the affected entity
    data_summary TEXT, -- JSON summary of non-sensitive data
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

- `idx_audit_logs_timestamp` - Time-based queries
- `idx_audit_logs_request_id` - Request correlation
- `idx_audit_logs_actor` - Actor-based queries
- `idx_audit_logs_action` - Action-based queries
- `idx_audit_logs_entity` - Entity-based queries

## Audit Event Types

### Discount Operations
- `DISCOUNT_OVERRIDE` - Manager discount override
- `DISCOUNT_APPLIED` - Standard discount application
- `DISCOUNT_REMOVED` - Discount removal

### Refund Operations
- `REFUND_CREATED` - New refund request
- `REFUND_APPROVED` - Refund approval
- `REFUND_REJECTED` - Refund rejection
- `REFUND_PROCESSED` - Refund completion

### Cash Operations
- `CASH_MOVEMENT` - Cash drawer movements
- `CASH_DRAWER_OPEN` - Drawer opening
- `CASH_DRAWER_CLOSE` - Drawer closing
- `CASH_COUNT` - Cash counting
- `CASH_DEPOSIT` - Cash deposits
- `CASH_WITHDRAWAL` - Cash withdrawals

### Shift Operations
- `SHIFT_OPEN` - Shift start
- `SHIFT_CLOSE` - Shift end
- `SHIFT_SUSPEND` - Shift suspension
- `SHIFT_RESUME` - Shift resumption

### Authentication Operations
- `PIN_VERIFY_SUCCESS` - Successful PIN verification
- `PIN_VERIFY_FAIL` - Failed PIN verification
- `LOGIN_SUCCESS` - Successful login
- `LOGIN_FAIL` - Failed login
- `LOGOUT` - User logout

### Product Operations
- `PRODUCT_PRICE_CHANGE` - Price modifications
- `PRODUCT_QUANTITY_ADJUST` - Inventory adjustments
- `PRODUCT_ADD` - New product creation
- `PRODUCT_EDIT` - Product modifications
- `PRODUCT_DELETE` - Product deletion

### Order Operations
- `ORDER_CREATE` - New order creation
- `ORDER_UPDATE` - Order modifications
- `ORDER_CANCEL` - Order cancellation
- `ORDER_VOID` - Order voiding

### System Operations
- `SYSTEM_CONFIG_CHANGE` - Configuration changes
- `DATABASE_BACKUP` - Database backup
- `DATABASE_RESTORE` - Database restore
- `SYSTEM_SHUTDOWN` - System shutdown
- `SYSTEM_STARTUP` - System startup

## Implementation

### Audit Writer Utility

```typescript
import { writeAuditLog, createAuditContext } from '../utils/audit';
import { AuditAction, EntityType } from '../types/audit';

// Create audit context from request
const auditContext = createAuditContext(req);

// Write audit log
await writeAuditLog(
  AuditAction.DISCOUNT_OVERRIDE,
  {
    productId: '123',
    productName: 'Apple',
    originalPrice: 10.00,
    discountedPrice: 8.00,
    discountAmount: 2.00,
    reason: 'Customer complaint',
    managerId: 'manager123'
  },
  auditContext,
  EntityType.PRODUCT,
  '123'
);
```

### Route Implementation Example

```typescript
// POST /api/discounts/override
discountRouter.post('/api/discounts/override', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  const auditContext = createAuditContext(req);
  
  try {
    const { productId, discountAmount, reason, managerPin } = req.body;
    
    // Verify manager PIN
    const isPinValid = await verifyManagerPin(managerPin, auditContext.actorId);
    if (!isPinValid) {
      // Log failed PIN verification
      await writeAuditLog(
        AuditAction.PIN_VERIFY_FAIL,
        {
          userId: auditContext.actorId || 'unknown',
          userName: 'Manager',
          verificationResult: false,
          attemptCount: 1,
          lockoutTriggered: false
        },
        auditContext
      );
      
      throw createError.unauthorized('Invalid manager PIN');
    }
    
    // Log successful PIN verification
    await writeAuditLog(
      AuditAction.PIN_VERIFY_SUCCESS,
      {
        userId: auditContext.actorId || 'unknown',
        userName: 'Manager',
        verificationResult: true
      },
      auditContext
    );
    
    // Process discount override...
    
    // Log discount override
    await writeAuditLog(
      AuditAction.DISCOUNT_OVERRIDE,
      discountData,
      auditContext,
      EntityType.PRODUCT,
      productId
    );
    
    res.json({ success: true, ... });
    
  } catch (error) {
    // Error handling...
  }
}));
```

## Data Sanitization

### Sensitive Field Removal

The audit system automatically removes or redacts sensitive information:

```typescript
// Sensitive fields that are automatically redacted
const sensitiveFields = [
  'pin',
  'password',
  'ssn',
  'creditCard',
  'cvv',
  'token',
  'secret',
  'key',
  'authToken',
  'sessionToken'
];

// Example transformation
{
  "userId": "user123",
  "pin": "[REDACTED]", // Original PIN value removed
  "password": "[REDACTED]",
  "reason": "Customer complaint" // Non-sensitive data preserved
}
```

### PIN Verification Logging

PIN verification events never store the actual PIN:

```typescript
// PIN verification success
{
  "userId": "manager123",
  "userName": "John Manager",
  "verificationResult": true,
  "timestamp": "2025-10-09T16:00:00.000Z"
}

// PIN verification failure
{
  "userId": "manager123",
  "userName": "John Manager",
  "verificationResult": false,
  "attemptCount": 3,
  "lockoutTriggered": true
}
```

## Audit Log Examples

### Discount Override

```json
{
  "id": 1,
  "timestamp": "2025-10-09T16:00:00.000Z",
  "request_id": "audit-test-123",
  "actor_id": "manager123",
  "actor_type": "admin",
  "action": "DISCOUNT_OVERRIDE",
  "entity_type": "product",
  "entity_id": "1",
  "data_summary": "{\"productId\":\"1\",\"productName\":\"Apple\",\"originalPrice\":10.00,\"discountedPrice\":8.00,\"discountAmount\":2.00,\"reason\":\"Customer complaint\",\"managerId\":\"manager123\"}",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "session_id": "sess_abc123"
}
```

### Refund Creation

```json
{
  "id": 2,
  "timestamp": "2025-10-09T16:05:00.000Z",
  "request_id": "refund-test-456",
  "actor_id": "manager123",
  "actor_type": "admin",
  "action": "REFUND_CREATED",
  "entity_type": "refund",
  "entity_id": "REF-123456789",
  "data_summary": "{\"orderId\":\"ORD-123\",\"refundAmount\":25.50,\"refundReason\":\"Defective product\",\"items\":[{\"productId\":\"1\",\"productName\":\"Apple\",\"quantity\":5,\"refundAmount\":25.50}],\"paymentMethod\":\"cash\"}",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "session_id": "sess_abc123"
}
```

### Cash Movement

```json
{
  "id": 3,
  "timestamp": "2025-10-09T16:10:00.000Z",
  "request_id": "cash-test-789",
  "actor_id": "manager123",
  "actor_type": "admin",
  "action": "CASH_MOVEMENT",
  "entity_type": "cash_drawer",
  "entity_id": "main",
  "data_summary": "{\"movementType\":\"withdrawal\",\"amount\":100.00,\"previousBalance\":1000.00,\"newBalance\":900.00,\"reason\":\"Bank deposit\",\"reference\":\"DEP-001\"}",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "session_id": "sess_abc123"
}
```

## Querying Audit Logs

### By Request ID

```sql
SELECT * FROM audit_logs 
WHERE request_id = 'audit-test-123' 
ORDER BY timestamp DESC;
```

### By Actor

```sql
SELECT * FROM audit_logs 
WHERE actor_id = 'manager123' 
ORDER BY timestamp DESC 
LIMIT 100;
```

### By Action Type

```sql
SELECT * FROM audit_logs 
WHERE action = 'DISCOUNT_OVERRIDE' 
ORDER BY timestamp DESC 
LIMIT 100;
```

### By Time Range

```sql
SELECT * FROM audit_logs 
WHERE timestamp BETWEEN '2025-10-09 00:00:00' AND '2025-10-09 23:59:59' 
ORDER BY timestamp DESC;
```

### Complex Queries

```sql
-- All discount overrides by a specific manager in the last 24 hours
SELECT * FROM audit_logs 
WHERE action = 'DISCOUNT_OVERRIDE' 
  AND actor_id = 'manager123' 
  AND timestamp >= datetime('now', '-1 day')
ORDER BY timestamp DESC;

-- All failed PIN verifications
SELECT * FROM audit_logs 
WHERE action = 'PIN_VERIFY_FAIL' 
ORDER BY timestamp DESC;

-- Cash movements over $100
SELECT * FROM audit_logs 
WHERE action = 'CASH_MOVEMENT' 
  AND json_extract(data_summary, '$.amount') > 100
ORDER BY timestamp DESC;
```

## Compliance Features

### Data Retention

- **Retention Period**: Configurable (default: 7 years)
- **Archival**: Automatic archival of old records
- **Deletion**: Secure deletion after retention period

### Security

- **Immutable Logs**: Audit logs cannot be modified
- **Encryption**: Sensitive data encrypted at rest
- **Access Control**: Role-based access to audit logs
- **Audit Trail**: Access to audit logs is itself audited

### Reporting

- **Standard Reports**: Pre-built compliance reports
- **Custom Queries**: SQL-based custom reporting
- **Export Formats**: CSV, JSON, PDF export
- **Scheduled Reports**: Automated report generation

## Performance Considerations

### Optimization

- **Indexed Queries**: All common query patterns indexed
- **Batch Processing**: Bulk audit log writes
- **Async Logging**: Non-blocking audit writes
- **Connection Pooling**: Efficient database connections

### Monitoring

- **Log Volume**: Track audit log generation rate
- **Query Performance**: Monitor query execution times
- **Storage Usage**: Monitor database growth
- **Error Rates**: Track audit logging failures

## Integration

### External Systems

```typescript
// Send audit logs to external SIEM
const sendToSIEM = async (auditLog: AuditLogEntry) => {
  await fetch('https://siem.company.com/api/audit-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auditLog)
  });
};

// Integration with external audit systems
const sendToAuditSystem = async (auditLog: AuditLogEntry) => {
  // Custom integration logic
};
```

### Alerting

```typescript
// Alert on suspicious activities
const checkForSuspiciousActivity = (auditLog: AuditLogEntry) => {
  if (auditLog.action === 'PIN_VERIFY_FAIL' && 
      getRecentFailedAttempts(auditLog.actor_id) > 5) {
    sendSecurityAlert(auditLog);
  }
};
```

## Testing

### Unit Tests

```typescript
describe('Audit Logging', () => {
  it('should log discount override', async () => {
    const auditContext = createAuditContext(mockRequest);
    
    await writeAuditLog(
      AuditAction.DISCOUNT_OVERRIDE,
      mockDiscountData,
      auditContext,
      EntityType.PRODUCT,
      '123'
    );
    
    const logs = auditWriter.getAuditLogsByAction(AuditAction.DISCOUNT_OVERRIDE);
    expect(logs).toHaveLength(1);
    expect(logs[0].data_summary).toContain('productId');
  });
});
```

### Integration Tests

```typescript
describe('Discount Override API', () => {
  it('should create audit log on successful override', async () => {
    const response = await request(app)
      .post('/api/discounts/override')
      .send({
        productId: '1',
        discountAmount: 5,
        reason: 'Test',
        managerPin: '1234'
      })
      .set('x-request-id', 'test-123');
    
    expect(response.status).toBe(200);
    
    const auditLogs = auditWriter.getAuditLogsByRequestId('test-123');
    expect(auditLogs).toHaveLength(2); // PIN_VERIFY_SUCCESS + DISCOUNT_OVERRIDE
  });
});
```

## Best Practices

1. **Always Audit Sensitive Actions** - Every sensitive operation must be logged
2. **Include Request Context** - Always include request ID for correlation
3. **Sanitize Data** - Never log sensitive information
4. **Use Structured Data** - JSON format for easy analysis
5. **Monitor Performance** - Ensure audit logging doesn't impact operations
6. **Regular Backups** - Backup audit logs regularly
7. **Access Control** - Restrict access to audit logs
8. **Documentation** - Document all audit events and their meanings

This comprehensive audit logging system ensures full compliance with regulatory requirements while providing powerful tools for post-incident analysis and security monitoring.




